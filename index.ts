/**
 * @file index.ts
 * @input  OpenCode plugin context, auth credentials
 * @output Auth hook, config injection, fetch interceptor
 * @pos    Plugin entry point - orchestrates auth and request routing
 *
 * 📌 On change: Update this header + README.md file index
 */

import type { Plugin, PluginInput, AuthHook, Hooks } from "@opencode-ai/plugin"
import type { Auth, Provider } from "@opencode-ai/sdk"
import { mkdir, readFile, writeFile, access } from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import {
  AUTH_METHOD_LABEL,
  CODEX_BASE_URL,
  PROVIDER_ID,
  AICODEWITH_ANTHROPIC_BASE_URL,
  AICODEWITH_LITE_URL,
} from "./lib/constants"
import {
  transformRequestForCodex,
  sanitizeRequestBody,
  createAicodewithHeaders,
  handleErrorResponse,
  handleSuccessResponse,
} from "./lib/request/fetch-helpers"
import { transformClaudeRequest, transformClaudeResponse } from "./lib/request/claude-tools-transform"
import { createAutoUpdateHook } from "./lib/hooks/auto-update"
import { syncOmoConfig } from "./lib/hooks/omo-config-sync"
import { saveRawResponse, SAVE_RAW_RESPONSE_ENABLED } from "./lib/logger"
import STANDARD_PROVIDER_CONFIG from "./lib/provider-config.json"

const CODEX_MODEL_PREFIXES = ["gpt-", "codex"]
const PACKAGE_NAME = "opencode-aicodewith-auth"
const PLUGIN_ENTRY = import.meta.url
const PROVIDER_EXT = import.meta.url.endsWith(".ts") ? ".ts" : ".js"
const PROVIDER_NPM = new URL(`./provider${PROVIDER_EXT}`, import.meta.url).href

const DEFAULT_OUTPUT_TOKEN_MAX = 32000

const homeDir = process.env.OPENCODE_TEST_HOME || os.homedir()
const configRoot = process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config")
const configDir = path.join(configRoot, "opencode")
const configPathJson = path.join(configDir, "opencode.json")
const configPathJsonc = path.join(configDir, "opencode.jsonc")

let ensureConfigPromise: Promise<void> | undefined

const fileExists = async (filePath: string) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const stripJsonComments = (content: string): string => {
  return content
    .replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? "" : m))
    .replace(/,(\s*[}\]])/g, "$1")
}

const readJsonOrJsonc = async (filePath: string) => {
  try {
    const text = await readFile(filePath, "utf-8")
    const stripped = filePath.endsWith(".jsonc") ? stripJsonComments(text) : text
    return JSON.parse(stripped) as Record<string, unknown>
  } catch {
    return undefined
  }
}

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a !== "object") return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)

  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false
    if (!deepEqual(aObj[key], bObj[key])) return false
  }

  return true
}

const isPackageEntry = (value: string) => value === PACKAGE_NAME || value.startsWith(`${PACKAGE_NAME}@`)

const ensurePluginEntry = (list: unknown) => {
  if (!Array.isArray(list)) return [PLUGIN_ENTRY]
  const hasPlugin = list.some((entry) => typeof entry === "string" && (entry === PLUGIN_ENTRY || isPackageEntry(entry)))
  return hasPlugin ? list : [...list, PLUGIN_ENTRY]
}

const buildStandardProviderConfig = () => ({
  ...STANDARD_PROVIDER_CONFIG,
  npm: PROVIDER_NPM,
})

const applyProviderConfig = (config: Record<string, any>) => {
  let changed = false

  const providerMap = config.provider && typeof config.provider === "object" ? config.provider : {}
  const existingProvider = providerMap[PROVIDER_ID]
  const standardProvider = buildStandardProviderConfig()

  if (!deepEqual(existingProvider, standardProvider)) {
    providerMap[PROVIDER_ID] = standardProvider
    config.provider = providerMap
    changed = true
  }

  const nextPlugins = ensurePluginEntry(config.plugin)
  if (nextPlugins !== config.plugin) {
    config.plugin = nextPlugins
    changed = true
  }

  // Migrate deprecated model in config.model
  if (config.model && MODEL_MIGRATIONS[config.model]) {
    config.model = MODEL_MIGRATIONS[config.model]
    changed = true
  }

  return changed
}

const ensureConfigFile = async () => {
  if (ensureConfigPromise) return ensureConfigPromise
  ensureConfigPromise = (async () => {
    const jsoncExists = await fileExists(configPathJsonc)
    const jsonExists = await fileExists(configPathJson)

    let configPath: string
    let config: Record<string, unknown>

    if (jsoncExists) {
      configPath = configPathJsonc
      config = (await readJsonOrJsonc(configPath)) ?? {}
    } else if (jsonExists) {
      configPath = configPathJson
      config = (await readJsonOrJsonc(configPath)) ?? {}
    } else {
      configPath = configPathJson
      config = { $schema: "https://opencode.ai/config.json" }
    }

    if (!config || typeof config !== "object") return

    const changed = applyProviderConfig(config)
    if (!changed) return

    await mkdir(configDir, { recursive: true })
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8")
  })()
  return ensureConfigPromise
}

const parseRequestBody = (init?: RequestInit) => {
  if (!init?.body || typeof init.body !== "string") {
    return { body: undefined as unknown, model: undefined as string | undefined, isStreaming: false }
  }

  try {
    const body = JSON.parse(init.body as string) as { model?: unknown; stream?: boolean }
    const model = typeof body?.model === "string" ? body.model : undefined
    return { body, model, isStreaming: body?.stream === true }
  } catch {
    return { body: undefined as unknown, model: undefined as string | undefined, isStreaming: false }
  }
}

const isGeminiUrl = (url: string) =>
  url.includes(":generateContent") ||
  url.includes(":streamGenerateContent") ||
  (url.includes("/models/") && url.includes("/v1"))

const isClaudeUrl = (url: string) => url.includes("/v1/messages")

const isThirdPartyModel = (model: string | undefined) =>
  Boolean(model && model.endsWith("-third-party"))

const stripThirdPartySuffix = (model: string) =>
  model.replace(/-third-party$/, "")

const isModel = (model: string | undefined, prefix: string) => Boolean(model && model.startsWith(prefix))

const isCodexModel = (model: string | undefined) =>
  Boolean(model && CODEX_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix)))

const saveResponseIfEnabled = async (
  response: Response,
  provider: string,
  metadata: { url: string; model?: string },
): Promise<Response> => {
  if (!SAVE_RAW_RESPONSE_ENABLED) return response

  const cloned = response.clone()
  const body = await cloned.text()
  saveRawResponse(provider, body, { url: metadata.url, status: response.status, model: metadata.model })
  return response
}

const rewriteUrl = (originalUrl: string, baseUrl: string) => {
  const base = new URL(baseUrl)
  const original = new URL(originalUrl)
  const basePath = base.pathname.replace(/\/$/, "")
  const normalizedBase = `${base.origin}${basePath}`
  const normalizedOriginal = `${original.origin}${original.pathname}`

  if (normalizedOriginal.startsWith(normalizedBase)) {
    return original.toString()
  }

  const rewritten = new URL(original.toString())
  rewritten.protocol = base.protocol
  rewritten.host = base.host

  let targetPath = original.pathname
  if (basePath.endsWith("/v1") && targetPath.startsWith("/v1/")) {
    targetPath = targetPath.slice(3)
  }

  rewritten.pathname = `${basePath}${targetPath}`
  return rewritten.toString()
}

const ensureGeminiSseParam = (url: string) => {
  const parsed = new URL(url)
  const alt = parsed.searchParams.get("alt")
  if (alt === "sse") return url
  parsed.searchParams.set("alt", "sse")
  return parsed.toString()
}

const buildGeminiUrl = (originalUrl: string, streaming: boolean) => {
  const original = new URL(originalUrl)
  let path = original.pathname
  if (!path.includes("/v1beta/") && !path.includes("/v1/")) {
    path = `/v1beta${path.startsWith("/") ? "" : "/"}${path}`
  }

  const base = new URL(AICODEWITH_GEMINI_BASE_URL)
  const basePath = base.pathname.replace(/\/$/, "")
  const target = new URL(base.origin)
  target.pathname = `${basePath}${path}`
  target.search = original.search

  const url = target.toString()
  return streaming ? ensureGeminiSseParam(url) : url
}

const createGeminiHeaders = (init: RequestInit | undefined, apiKey: string) => {
  const headers = new Headers(init?.headers ?? {})

  headers.delete(HEADER_NAMES.AUTHORIZATION)
  headers.delete("x-api-key")

  headers.set(HEADER_NAMES.USER_AGENT, GEMINI_USER_AGENT)
  headers.set(HEADER_NAMES.X_GOOG_API_CLIENT, GEMINI_API_CLIENT)
  headers.set(HEADER_NAMES.X_GOOG_API_KEY, apiKey)
  if (!headers.has(HEADER_NAMES.ACCEPT)) {
    headers.set(HEADER_NAMES.ACCEPT, "*/*")
  }

  if (!headers.has(HEADER_NAMES.CONTENT_TYPE)) {
    headers.set(HEADER_NAMES.CONTENT_TYPE, "application/json")
  }

  const userId = process.env[GEMINI_PRIVILEGED_USER_ID_ENV]
  if (userId && !headers.has(HEADER_NAMES.X_GEMINI_PRIVILEGED_USER_ID)) {
    headers.set(HEADER_NAMES.X_GEMINI_PRIVILEGED_USER_ID, userId)
  }

  return headers
}

const getOutputTokenLimit = (
  input: Parameters<NonNullable<Hooks["chat.params"]>>[0],
  output: Parameters<NonNullable<Hooks["chat.params"]>>[1],
) => {
  const modelLimit = input.model.limit.output
  if (typeof modelLimit === "number" && modelLimit > 0) {
    return modelLimit
  }
  const optionLimit = output.options?.maxTokens
  if (typeof optionLimit === "number" && optionLimit > 0) {
    return optionLimit
  }
  return DEFAULT_OUTPUT_TOKEN_MAX
}

export const AicodewithCodexAuthPlugin: Plugin = async (ctx: PluginInput) => {
  await ensureConfigFile().catch((error) => {
    console.warn(
      `[${PACKAGE_NAME}] Failed to update config: ${error instanceof Error ? error.message : error}`,
    )
  })

  // Run OMO config sync in background without blocking plugin initialization
  syncOmoConfig().catch((error) => {
    console.warn(
      `[${PACKAGE_NAME}] Failed to sync OMO config: ${error instanceof Error ? error.message : error}`,
    )
  })

  const autoUpdateHook = createAutoUpdateHook(ctx, { autoUpdate: true })

  const authHook: AuthHook = {
    provider: PROVIDER_ID,
    loader: async (getAuth: () => Promise<Auth>, _provider: Provider) => {
      const auth = await getAuth()
      if (auth.type !== "api" || !auth.key) {
        return {}
      }

      const apiKey = auth.key.trim()
      if (!apiKey) return {}

      return {
        apiKey,
        fetch: async (input: Request | string | URL, init?: RequestInit) => {
          const originalUrl = extractRequestUrl(input)
          const { model, isStreaming } = parseRequestBody(init)
          const isClaudeRequest = isModel(model, "claude-") || isClaudeUrl(originalUrl)
          const isGeminiRequest = isModel(model, "gemini-") || isGeminiUrl(originalUrl)
          const isGeminiStreaming = isGeminiRequest && (isStreaming || originalUrl.includes("streamGenerateContent"))
          const isCodexRequest = !isClaudeRequest && !isGeminiRequest && isCodexModel(model)

          if (isCodexRequest) {
            const transformation = await transformRequestForCodex(init)
            let requestInit = transformation?.updatedInit ?? init

            if (!transformation && init.body) {
              const sanitized = sanitizeRequestBody(init.body as string)
              requestInit = { ...init, body: sanitized }
            }

            const headers = createAicodewithHeaders(requestInit, apiKey, {
              promptCacheKey: transformation?.body.prompt_cache_key,
            })

            const targetUrl = rewriteUrl(originalUrl, CODEX_BASE_URL)
            const response = await fetch(targetUrl, {
              ...requestInit,
              headers,
            })

            await saveResponseIfEnabled(response.clone(), "codex", { url: targetUrl, model })

            if (!response.ok) {
              return await handleErrorResponse(response)
            }

            return await handleSuccessResponse(response, isStreaming)
          }

          if (isGeminiRequest) {
            const geminiUrl = buildGeminiUrl(originalUrl, isGeminiStreaming)
            const headers = createGeminiHeaders(init, apiKey)
            const requestInit = { ...init, headers }
            const response = await fetch(geminiUrl, requestInit)
            return await saveResponseIfEnabled(response, "gemini", { url: geminiUrl, model })
          }

          if (isClaudeRequest) {
            const isThirdParty = isThirdPartyModel(model)
            const baseUrl = isThirdParty ? AICODEWITH_LITE_URL : AICODEWITH_ANTHROPIC_BASE_URL
            const targetUrl = rewriteUrl(originalUrl, baseUrl)
            
            let transformedInit = transformClaudeRequest(init)
            if (isThirdParty && model && transformedInit?.body && typeof transformedInit.body === "string") {
              try {
                const body = JSON.parse(transformedInit.body) as Record<string, unknown>
                body.model = stripThirdPartySuffix(model)
                transformedInit = { ...transformedInit, body: JSON.stringify(body) }
              } catch {
              }
            }
            
            const response = await fetch(targetUrl, transformedInit)
            const savedResponse = await saveResponseIfEnabled(response, isThirdParty ? "claude-third-party" : "claude", { url: targetUrl, model })
            return transformClaudeResponse(savedResponse)
          }

          return await fetch(originalUrl, init)
        },
      }
    },
    methods: [
      {
        type: "api",
        label: AUTH_METHOD_LABEL,
        prompts: [
          {
            type: "text",
            key: "apiKey",
            message: "AICodewith API key",
            placeholder: "sk-...",
          },
        ],
        authorize: async (inputs?: Record<string, string>) => {
          const key = inputs?.apiKey?.trim()
          if (!key) return { type: "failed" as const }
          return { type: "success" as const, key }
        },
      },
    ],
  }

  return {
    auth: authHook,
    config: async (config) => {
      applyProviderConfig(config as Record<string, any>)
    },
    event: autoUpdateHook.event,
    "chat.params": async (input, output) => {
      if (input.model.providerID !== PROVIDER_ID) return

      // Codex models: inject store: false into providerOptions
      if (isCodexModel(input.model.id)) {
        const next = { ...output.options }
        next.providerOptions = {
          ...next.providerOptions,
          openai: {
            ...next.providerOptions?.openai,
            store: false,
          },
        }
        output.options = next
        return
      }

      // Claude models: remove thinking if budgetTokens >= maxTokens
      if (!input.model.id?.startsWith("claude-")) return
      const thinking = output.options?.thinking
      if (!thinking || typeof thinking !== "object") return
      const budgetTokens = (thinking as { budgetTokens?: unknown }).budgetTokens
      if (typeof budgetTokens !== "number") return
      const maxTokens = getOutputTokenLimit(input, output)
      if (budgetTokens < maxTokens) return
      const next = { ...output.options }
      delete next.thinking
      output.options = next
    },
  }
}

export default AicodewithCodexAuthPlugin

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
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { createAicodewith as createAicodewithProvider, type AicodewithProviderSettings } from "./provider"
import {
  AUTH_METHOD_LABEL,
  CODEX_BASE_URL,
  PROVIDER_ID,
  AICODEWITH_ANTHROPIC_BASE_URL,
  AICODEWITH_GEMINI_BASE_URL,
  GEMINI_API_CLIENT,
  GEMINI_PRIVILEGED_USER_ID_ENV,
  GEMINI_USER_AGENT,
  HEADER_NAMES,
} from "./lib/constants"
import {
  createAicodewithHeaders,
  extractRequestUrl,
  handleErrorResponse,
  handleSuccessResponse,
  transformRequestForCodex,
} from "./lib/request/fetch-helpers"

const CODEX_MODEL_PREFIXES = ["gpt-", "codex"]
const PACKAGE_NAME = "opencode-aicodewith-auth"
const PROVIDER_NAME = "AICodewith"
const PLUGIN_ENTRY = import.meta.url
// Use same extension as current file (*.ts in dev, *.js after build)
const PROVIDER_EXT = import.meta.url.endsWith(".ts") ? ".ts" : ".js"
const PROVIDER_NPM = new URL(`./provider${PROVIDER_EXT}`, import.meta.url).href
const DEFAULT_API = "https://api.openai.com/v1"
const DEFAULT_ENV = ["AICODEWITH_API_KEY"]

const DEFAULT_OUTPUT_TOKEN_MAX = 32000

const IMAGE_MODALITIES = { input: ["text", "image"], output: ["text"] }

const MODEL_CONFIGS: Record<string, { name: string; modalities: { input: string[]; output: string[] } }> = {
  "gpt-5.2-codex": { name: "GPT-5.2 Codex", modalities: IMAGE_MODALITIES },
  "gpt-5.2": { name: "GPT-5.2", modalities: IMAGE_MODALITIES },
  "claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", modalities: IMAGE_MODALITIES },
  "claude-opus-4-5-20251101": { name: "Claude Opus 4.5", modalities: IMAGE_MODALITIES },
  "gemini-3-pro-high": { name: "Gemini 3 Pro", modalities: IMAGE_MODALITIES },
}

const ALLOWED_MODEL_IDS = Object.keys(MODEL_CONFIGS)
const ALLOWED_MODEL_SET = new Set(ALLOWED_MODEL_IDS)

const homeDir = process.env.OPENCODE_TEST_HOME || os.homedir()
const configRoot = process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config")
const configDir = path.join(configRoot, "opencode")
const configPath = path.join(configDir, "opencode.json")

let ensureConfigPromise: Promise<void> | undefined

const toModelMap = (ids: string[], existing: Record<string, unknown> = {}) =>
  ids.reduce<Record<string, unknown>>((acc, id) => {
    const existingConfig = Object.prototype.hasOwnProperty.call(existing, id) ? existing[id] : {}
    const defaultConfig = MODEL_CONFIGS[id] ?? {}
    acc[id] = { ...defaultConfig, ...(typeof existingConfig === 'object' ? existingConfig : {}) }
    return acc
  }, {})

const readJson = async (filePath: string) => {
  try {
    const text = await readFile(filePath, "utf-8")
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return undefined
  }
}

const isPackageEntry = (value: string) =>
  value === PACKAGE_NAME || value.startsWith(`${PACKAGE_NAME}@`)

const ensurePluginEntry = (list: unknown) => {
  if (!Array.isArray(list)) return [PLUGIN_ENTRY]
  const hasPlugin = list.some(
    (entry) =>
      typeof entry === "string" && (entry === PLUGIN_ENTRY || isPackageEntry(entry)),
  )
  return hasPlugin ? list : [...list, PLUGIN_ENTRY]
}

const applyProviderConfig = (config: Record<string, any>) => {
  let changed = false
  const providerMap = config.provider && typeof config.provider === "object" ? config.provider : {}
  const existing = providerMap[PROVIDER_ID] && typeof providerMap[PROVIDER_ID] === "object" ? providerMap[PROVIDER_ID] : {}
  const existingModels = existing.models && typeof existing.models === "object" ? existing.models : {}

  const next = { ...existing }

  if (!next.name) {
    next.name = PROVIDER_NAME
    changed = true
  }

  if (!Array.isArray(next.env)) {
    next.env = DEFAULT_ENV
    changed = true
  }

  if (!next.npm || (typeof next.npm === "string" && isPackageEntry(next.npm))) {
    next.npm = PROVIDER_NPM
    changed = true
  }

  if (!next.api) {
    next.api = DEFAULT_API
    changed = true
  }

  const hasExtraModels = Object.keys(existingModels).some((id) => !ALLOWED_MODEL_SET.has(id))
  const hasMissingModels = ALLOWED_MODEL_IDS.some(
    (id) => !Object.prototype.hasOwnProperty.call(existingModels, id),
  )
  if (!next.models || hasExtraModels || hasMissingModels) {
    next.models = toModelMap(ALLOWED_MODEL_IDS, existingModels)
    changed = true
  }

  providerMap[PROVIDER_ID] = next
  if (config.provider !== providerMap) {
    config.provider = providerMap
    changed = true
  }

  const nextPlugins = ensurePluginEntry(config.plugin)
  if (nextPlugins !== config.plugin) {
    config.plugin = nextPlugins
    changed = true
  }

  return changed
}

const ensureConfigFile = async () => {
  if (ensureConfigPromise) return ensureConfigPromise
  ensureConfigPromise = (async () => {
    const config = (await readJson(configPath)) ?? {}
    if (!config || typeof config !== "object") return
    const changed = applyProviderConfig(config)
    if (!changed) return
    await mkdir(configDir, { recursive: true })
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8")
  })()
  return ensureConfigPromise
}

const isPluginInput = (input: unknown): input is PluginInput => {
  if (!input || typeof input !== "object") return false
  return "client" in input && "project" in input && "directory" in input
}

export function createAicodewith(input: AicodewithProviderSettings | PluginInput) {
  if (isPluginInput(input)) return {} as Hooks
  return createAicodewithProvider(input)
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

const isModel = (model: string | undefined, prefix: string) => Boolean(model && model.startsWith(prefix))

const isCodexModel = (model: string | undefined) =>
  Boolean(model && CODEX_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix)))

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
  rewritten.pathname = `${basePath}${original.pathname}`
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

export const AicodewithCodexAuthPlugin: Plugin = async (_ctx: PluginInput) => {
  await ensureConfigFile().catch((error) => {
    console.warn(
      `[${PACKAGE_NAME}] Failed to update opencode config: ${error instanceof Error ? error.message : error}`,
    )
  })

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
          const isGeminiStreaming =
            isGeminiRequest && (isStreaming || originalUrl.includes("streamGenerateContent"))
          const isCodexRequest =
            !isClaudeRequest && !isGeminiRequest && isCodexModel(model)

          if (isCodexRequest) {
            const transformation = await transformRequestForCodex(init)
            const requestInit = transformation?.updatedInit ?? init

            const headers = createAicodewithHeaders(requestInit, apiKey, {
              promptCacheKey: transformation?.body.prompt_cache_key,
            })

            const targetUrl = rewriteUrl(originalUrl, CODEX_BASE_URL)
            const response = await fetch(targetUrl, {
              ...requestInit,
              headers,
            })

            if (!response.ok) {
              return await handleErrorResponse(response)
            }

            return await handleSuccessResponse(response, isStreaming)
          }

          if (isGeminiRequest) {
            const geminiUrl = buildGeminiUrl(originalUrl, isGeminiStreaming)
            const headers = createGeminiHeaders(init, apiKey)
            const requestInit = { ...init, headers }
            return await fetch(geminiUrl, requestInit)
          }

          if (isClaudeRequest) {
            const targetUrl = rewriteUrl(originalUrl, AICODEWITH_ANTHROPIC_BASE_URL)
            return await fetch(targetUrl, init)
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
    "chat.params": async (input, output) => {
      if (input.model.providerID !== PROVIDER_ID) return
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

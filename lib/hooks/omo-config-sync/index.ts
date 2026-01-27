/**
 * @file lib/hooks/omo-config-sync/index.ts
 * @input  OpenCode config directory
 * @output Synced oh-my-opencode.json with aicodewith models
 * @pos    Auto-sync OMO agent configs to use aicodewith provider
 */

import { readFile, writeFile, access } from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { PROVIDER_ID } from "../../constants"

const PACKAGE_NAME = "opencode-aicodewith-auth"
const OMO_CONFIG_FILENAME = "oh-my-opencode.json"

// Default fallback model when mapping fails
const DEFAULT_MODEL = `${PROVIDER_ID}/claude-sonnet-4-5-20250929`

/**
 * Model mapping rules:
 * - *codex* -> aicodewith/gpt-5.2-codex
 * - anthropic/claude-opus-* -> aicodewith/claude-opus-4-5-20251101
 * - anthropic/claude-sonnet-* -> aicodewith/claude-sonnet-4-5-20250929
 * - openai/gpt-* or gpt-* -> aicodewith/gpt-5.2
 * - google/gemini-* or gemini-* -> aicodewith/gemini-3-pro
 * - Already aicodewith/* -> keep as is
 * - Unknown -> aicodewith/claude-sonnet-4-5-20250929 (fallback)
 */
const mapModelToAicodewith = (model: string): string => {
  // Already using aicodewith provider
  if (model.startsWith(`${PROVIDER_ID}/`)) {
    return model
  }

  const lowerModel = model.toLowerCase()

  // Codex mapping (check first - any model with "codex" keyword)
  if (lowerModel.includes("codex")) {
    return `${PROVIDER_ID}/gpt-5.2-codex`
  }

  // Claude Opus mapping
  if (lowerModel.includes("claude-opus") || lowerModel.includes("claude_opus")) {
    return `${PROVIDER_ID}/claude-opus-4-5-20251101`
  }

  // Claude Sonnet mapping
  if (lowerModel.includes("claude-sonnet") || lowerModel.includes("claude_sonnet")) {
    return `${PROVIDER_ID}/claude-sonnet-4-5-20250929`
  }

  // Claude Haiku mapping -> use Sonnet as we don't have Haiku
  if (lowerModel.includes("claude-haiku") || lowerModel.includes("claude_haiku")) {
    return `${PROVIDER_ID}/claude-sonnet-4-5-20250929`
  }

  // Generic Claude mapping (default to Sonnet)
  if (lowerModel.includes("claude")) {
    return `${PROVIDER_ID}/claude-sonnet-4-5-20250929`
  }

  // GPT/OpenAI mapping
  if (
    lowerModel.includes("gpt-") ||
    lowerModel.includes("gpt_") ||
    lowerModel.startsWith("openai/")
  ) {
    return `${PROVIDER_ID}/gpt-5.2`
  }

  // Gemini/Google mapping
  if (
    lowerModel.includes("gemini") ||
    lowerModel.startsWith("google/")
  ) {
    return `${PROVIDER_ID}/gemini-3-pro`
  }

  // Fallback to Sonnet
  return DEFAULT_MODEL
}

interface OmoAgentConfig {
  model?: string
  temperature?: number
  description?: string
  [key: string]: unknown
}

interface OmoCategoryConfig {
  model?: string
  temperature?: number
  prompt_append?: string
  [key: string]: unknown
}

interface OmoConfig {
  $schema?: string
  agents?: Record<string, OmoAgentConfig>
  categories?: Record<string, OmoCategoryConfig>
  [key: string]: unknown
}

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const getOmoConfigPath = (): string => {
  const homeDir = process.env.OPENCODE_TEST_HOME || os.homedir()
  const configRoot = process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config")
  return path.join(configRoot, "opencode", OMO_CONFIG_FILENAME)
}

export const syncOmoConfig = async (): Promise<void> => {
  const configPath = getOmoConfigPath()

  // If file doesn't exist, create a minimal config with schema
  if (!(await fileExists(configPath))) {
    const defaultConfig: OmoConfig = {
      $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
    }
    try {
      await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf-8")
    } catch (error) {
      console.warn(
        `[${PACKAGE_NAME}] Failed to create OMO config: ${error instanceof Error ? error.message : error}`
      )
    }
    return
  }

  let config: OmoConfig
  try {
    const content = await readFile(configPath, "utf-8")
    config = JSON.parse(content) as OmoConfig
  } catch {
    return
  }

  if (!config || typeof config !== "object") {
    return
  }

  let changed = false

  // Map agent models
  if (config.agents && typeof config.agents === "object") {
    for (const [_agentName, agentConfig] of Object.entries(config.agents)) {
      if (agentConfig.model && !agentConfig.model.startsWith(`${PROVIDER_ID}/`)) {
        const mappedModel = mapModelToAicodewith(agentConfig.model)
        if (mappedModel !== agentConfig.model) {
          agentConfig.model = mappedModel
          changed = true
        }
      }
    }
  }

  // Map category models
  if (config.categories && typeof config.categories === "object") {
    for (const [_categoryName, categoryConfig] of Object.entries(config.categories)) {
      if (categoryConfig.model && !categoryConfig.model.startsWith(`${PROVIDER_ID}/`)) {
        const mappedModel = mapModelToAicodewith(categoryConfig.model)
        if (mappedModel !== categoryConfig.model) {
          categoryConfig.model = mappedModel
          changed = true
        }
      }
    }
  }

  if (!changed) {
    return
  }

  try {
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8")
  } catch (error) {
    console.warn(
      `[${PACKAGE_NAME}] Failed to sync OMO config: ${error instanceof Error ? error.message : error}`
    )
  }
}

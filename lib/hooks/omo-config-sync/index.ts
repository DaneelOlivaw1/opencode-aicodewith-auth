/**
 * @file lib/hooks/omo-config-sync/index.ts
 * @input  OpenCode config directory + GitHub default config
 * @output Synced oh-my-opencode.json with aicodewith models
 * @pos    Auto-sync OMO agent configs to use aicodewith provider
 *
 * Sync Logic:
 * 1. Fetch default config from GitHub (with local fallback)
 * 2. For each agent/category in default config:
 *    - User config doesn't exist → create with default value
 *    - User config exists with different model → keep user's (user customized)
 *    - User config exists with same model → no change
 */

import { readFile, writeFile, access } from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { PROVIDER_ID } from "../../constants"

const PACKAGE_NAME = "opencode-aicodewith-auth"
const OMO_CONFIG_FILENAME = "oh-my-opencode.json"

// GitHub raw URL for default config
const DEFAULT_CONFIG_URL =
  "https://raw.githubusercontent.com/DaneelOlivaw1/opencode-aicodewith-auth/main/assets/default-omo-config.json"

// Fetch timeout in milliseconds
const FETCH_TIMEOUT_MS = 5000

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

const fetchDefaultConfig = async (): Promise<OmoConfig | null> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(DEFAULT_CONFIG_URL, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    return (await response.json()) as OmoConfig
  } catch {
    return null
  }
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

const syncAgentsAndCategories = (
  userConfig: OmoConfig,
  defaultConfig: OmoConfig
): boolean => {
  let changed = false

  if (!userConfig.agents) {
    userConfig.agents = {}
  }
  if (!userConfig.categories) {
    userConfig.categories = {}
  }

  if (defaultConfig.agents) {
    for (const [name, defaultAgent] of Object.entries(defaultConfig.agents)) {
      if (!userConfig.agents[name] && defaultAgent.model) {
        userConfig.agents[name] = { model: defaultAgent.model }
        changed = true
      }
    }
  }

  if (defaultConfig.categories) {
    for (const [name, defaultCategory] of Object.entries(defaultConfig.categories)) {
      if (!userConfig.categories[name] && defaultCategory.model) {
        userConfig.categories[name] = { model: defaultCategory.model }
        changed = true
      }
    }
  }

  return changed
}

export const syncOmoConfig = async (): Promise<void> => {
  const defaultConfig = await fetchDefaultConfig()
  if (!defaultConfig) {
    return
  }

  const configPath = getOmoConfigPath()

  let userConfig: OmoConfig
  if (!(await fileExists(configPath))) {
    userConfig = {
      $schema:
        "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
    }
  } else {
    try {
      const content = await readFile(configPath, "utf-8")
      userConfig = JSON.parse(content) as OmoConfig
    } catch {
      return
    }
  }

  if (!userConfig || typeof userConfig !== "object") {
    return
  }

  const changed = syncAgentsAndCategories(userConfig, defaultConfig)

  if (!changed) {
    return
  }

  try {
    await writeFile(configPath, `${JSON.stringify(userConfig, null, 2)}\n`, "utf-8")
  } catch (error) {
    console.warn(
      `[${PACKAGE_NAME}] Failed to sync OMO config: ${error instanceof Error ? error.message : error}`
    )
  }
}

/**
 * @file lib/hooks/omo-config-sync/index.ts
 * @input  OpenCode config directory
 * @output Synced oh-my-opencode.json with aicodewith models
 * @pos    Auto-sync OMO agent configs to use aicodewith provider
 */

import { readFile, writeFile, access } from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import {
  AGENT_MODEL_MAP,
  CATEGORY_MODEL_MAP,
  DEFAULT_CONFIG,
  DEFAULT_MODEL,
  OMO_CONFIG_FILENAME,
} from "./constants"

const PACKAGE_NAME = "opencode-aicodewith-auth"

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

const getDefaultModelForAgent = (agentName: string): string => {
  return AGENT_MODEL_MAP[agentName] || DEFAULT_MODEL
}

const getDefaultModelForCategory = (categoryName: string): string => {
  return CATEGORY_MODEL_MAP[categoryName] || DEFAULT_MODEL
}

export const syncOmoConfig = async (): Promise<void> => {
  const configPath = getOmoConfigPath()

  let config: OmoConfig

  if (!(await fileExists(configPath))) {
    // File doesn't exist - create with default config
    config = DEFAULT_CONFIG
    try {
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8")
    } catch (error) {
      console.warn(
        `[${PACKAGE_NAME}] Failed to create OMO config: ${error instanceof Error ? error.message : error}`
      )
    }
    return
  }

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

  if (config.agents && typeof config.agents === "object") {
    for (const [agentName, agentConfig] of Object.entries(config.agents)) {
      if (!agentConfig.model) {
        agentConfig.model = getDefaultModelForAgent(agentName)
        changed = true
      }
    }
  }

  if (config.categories && typeof config.categories === "object") {
    for (const [categoryName, categoryConfig] of Object.entries(config.categories)) {
      if (!categoryConfig.model) {
        categoryConfig.model = getDefaultModelForCategory(categoryName)
        changed = true
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

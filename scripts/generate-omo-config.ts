/**
 * @file scripts/generate-omo-config.ts
 * @description Generate default-omo-config.json from oh-my-opencode source
 *
 * This script reads the model-requirements.ts from oh-my-opencode and generates
 * a default config with aicodewith models based on the fallback chain.
 */

import { writeFileSync } from "node:fs"
import path from "node:path"

const OMO_SOURCE_PATH = "/tmp/oh-my-opencode"
const OUTPUT_PATH = path.join(import.meta.dir, "../assets/default-omo-config.json")

const PROVIDER_ID = "aicodewith"

// Model mapping from OMO models to aicodewith models
const MODEL_MAP: Record<string, string> = {
  "claude-opus-4-5": `${PROVIDER_ID}/claude-opus-4-6-20260205`,
  "claude-sonnet-4-5": `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,
  "claude-sonnet-4": `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,
  "claude-haiku-4-5": `${PROVIDER_ID}/claude-sonnet-4-5-20250929`, // No haiku, use sonnet
  "gpt-5.2": `${PROVIDER_ID}/gpt-5.2`,
  "gpt-5.2-codex": `${PROVIDER_ID}/gpt-5.2-codex`,
  "gemini-3-pro": `${PROVIDER_ID}/gemini-3-pro`,
  "gemini-3-flash": `${PROVIDER_ID}/gemini-3-pro`, // No flash, use pro
}

interface FallbackEntry {
  providers: string[]
  model: string
  variant?: string
}

interface ModelRequirement {
  fallbackChain: FallbackEntry[]
  variant?: string
}

// Import directly from OMO source
async function loadModelRequirements(): Promise<{
  agents: Record<string, ModelRequirement>
  categories: Record<string, ModelRequirement>
}> {
  const modulePath = path.join(OMO_SOURCE_PATH, "src/shared/model-requirements.ts")
  const mod = await import(modulePath)
  return {
    agents: mod.AGENT_MODEL_REQUIREMENTS,
    categories: mod.CATEGORY_MODEL_REQUIREMENTS,
  }
}

// Get the best aicodewith model from fallback chain
function resolveModel(fallbackChain: FallbackEntry[]): string {
  for (const entry of fallbackChain) {
    const mapped = MODEL_MAP[entry.model]
    if (mapped) {
      return mapped
    }
  }
  // Default fallback
  return `${PROVIDER_ID}/claude-sonnet-4-5-20250929`
}

// Generate the config
async function generateConfig(): Promise<void> {
  const { agents, categories } = await loadModelRequirements()

  const config: Record<string, unknown> = {
    $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
    agents: {} as Record<string, { model: string }>,
    categories: {} as Record<string, { model: string }>,
  }

  // Process agents
  for (const [name, req] of Object.entries(agents)) {
    (config.agents as Record<string, { model: string }>)[name] = {
      model: resolveModel(req.fallbackChain),
    }
  }

  // Process categories
  for (const [name, req] of Object.entries(categories)) {
    (config.categories as Record<string, { model: string }>)[name] = {
      model: resolveModel(req.fallbackChain),
    }
  }

  // Add extra agents from schema that might not be in model-requirements
  const extraAgents = [
    "build", "plan", "sisyphus-junior", "OpenCode-Builder",
    "general", "frontend-ui-ux-engineer", "document-writer"
  ]

  for (const name of extraAgents) {
    if (!(config.agents as Record<string, unknown>)[name]) {
      // Default mapping based on agent name
      let model = `${PROVIDER_ID}/claude-sonnet-4-5-20250929`
      if (name === "build" || name === "plan" || name === "OpenCode-Builder") {
        model = `${PROVIDER_ID}/claude-opus-4-6-20260205`
      } else if (name === "frontend-ui-ux-engineer" || name === "document-writer") {
        model = `${PROVIDER_ID}/gemini-3-pro`
      }
      (config.agents as Record<string, { model: string }>)[name] = { model }
    }
  }

  // Add extra categories
  const extraCategories = ["visual", "business-logic", "data-analysis"]
  for (const name of extraCategories) {
    if (!(config.categories as Record<string, unknown>)[name]) {
      let model = `${PROVIDER_ID}/claude-sonnet-4-5-20250929`
      if (name === "visual") {
        model = `${PROVIDER_ID}/gemini-3-pro`
      } else if (name === "business-logic") {
        model = `${PROVIDER_ID}/gpt-5.2`
      }
      (config.categories as Record<string, { model: string }>)[name] = { model }
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(config, null, 2) + "\n")
  console.log(`Generated ${OUTPUT_PATH}`)
}

generateConfig()

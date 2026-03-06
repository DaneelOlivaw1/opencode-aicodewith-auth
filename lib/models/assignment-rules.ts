/**
 * @file assignment-rules.ts
 * @input  Model registry (MODELS array)
 * @output Dynamic model selection based on rules
 * @pos    Model assignment logic - decouples OMO config from specific model IDs
 *
 * DESIGN PRINCIPLES:
 * - Rule-based selection (e.g., "latest codex", "highest gpt version")
 * - No hardcoded model IDs in assignments
 * - Automatic adaptation when new models are added
 */

import type { ModelDefinition, ModelFamily } from "./registry"
import { MODELS, PROVIDER_ID } from "./registry"

export type ModelSelector = 
  | { type: "latest"; family: ModelFamily }
  | { type: "specific"; modelId: string }
  | { type: "latest-codex" }
  | { type: "latest-gpt" }
  | { type: "latest-claude"; tier?: "opus" | "sonnet" | "haiku" }
  | { type: "latest-gemini" }

/**
 * Get the latest (highest version) model from a family
 */
function getLatestModel(family: ModelFamily): ModelDefinition | undefined {
  const activeModels = MODELS.filter(m => !m.deprecated && m.family === family)
  
  if (activeModels.length === 0) return undefined
  
  // Sort by version (descending) - parse version numbers
  return activeModels.sort((a, b) => {
    const versionA = parseFloat(a.version)
    const versionB = parseFloat(b.version)
    return versionB - versionA
  })[0]
}

/**
 * Get the latest Codex model (family: "codex")
 */
function getLatestCodex(): ModelDefinition | undefined {
  return getLatestModel("codex")
}

/**
 * Get the latest GPT model (family: "gpt")
 */
function getLatestGPT(): ModelDefinition | undefined {
  return getLatestModel("gpt")
}

/**
 * Get the latest Claude model by tier
 */
function getLatestClaude(tier?: "opus" | "sonnet" | "haiku"): ModelDefinition | undefined {
  const claudeModels = MODELS.filter(m => !m.deprecated && m.family === "claude")
  
  if (tier) {
    const filtered = claudeModels.filter(m => m.id.includes(tier))
    if (filtered.length === 0) return undefined
    
    return filtered.sort((a, b) => {
      const versionA = parseFloat(a.version)
      const versionB = parseFloat(b.version)
      return versionB - versionA
    })[0]
  }
  
  // No tier specified - return highest version overall
  return claudeModels.sort((a, b) => {
    const versionA = parseFloat(a.version)
    const versionB = parseFloat(b.version)
    return versionB - versionA
  })[0]
}

/**
 * Get the latest Gemini model
 */
function getLatestGemini(): ModelDefinition | undefined {
  return getLatestModel("gemini")
}

/**
 * Resolve a model selector to a full model ID
 */
export function resolveModelSelector(selector: ModelSelector): string {
  let model: ModelDefinition | undefined

  switch (selector.type) {
    case "latest":
      model = getLatestModel(selector.family)
      break
    
    case "latest-codex":
      model = getLatestCodex()
      break
    
    case "latest-gpt":
      model = getLatestGPT()
      break
    
    case "latest-claude":
      model = getLatestClaude(selector.tier)
      break
    
    case "latest-gemini":
      model = getLatestGemini()
      break
    
    case "specific":
      model = MODELS.find(m => m.id === selector.modelId && !m.deprecated)
      break
  }

  if (!model) {
    throw new Error(`Failed to resolve model selector: ${JSON.stringify(selector)}`)
  }

  return `${PROVIDER_ID}/${model.id}`
}

/**
 * Shorthand helpers for common selectors
 */
export const ModelSelectors = {
  latestCodex: (): ModelSelector => ({ type: "latest-codex" }),
  latestGPT: (): ModelSelector => ({ type: "latest-gpt" }),
  latestClaudeOpus: (): ModelSelector => ({ type: "latest-claude", tier: "opus" }),
  latestClaudeSonnet: (): ModelSelector => ({ type: "latest-claude", tier: "sonnet" }),
  latestClaudeHaiku: (): ModelSelector => ({ type: "latest-claude", tier: "haiku" }),
  latestGemini: (): ModelSelector => ({ type: "latest-gemini" }),
  specific: (modelId: string): ModelSelector => ({ type: "specific", modelId }),
}

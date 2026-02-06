/**
 * @file lib/models.ts
 * @description Single source of truth for all model definitions
 *
 * To add/update a model:
 * 1. Update the version constants below
 * 2. Add migration entries if replacing an old model
 * 3. Run `bun run generate` to update all config files
 *
 * That's it! All other files are auto-generated from this.
 */

export const PROVIDER_ID = "aicodewith"

// =============================================================================
// MODEL VERSIONS - Update these when new versions are released
// =============================================================================

/**
 * Claude model definitions
 * - generation: e.g., "4-6" for Opus 4.6
 * - version: date suffix, e.g., "20260205"
 */
export const CLAUDE_MODELS = {
  opus: {
    generation: "4-6",
    version: "20260205",
    name: "Claude Opus 4",
    context: 200000,
    output: 64000,
  },
  sonnet: {
    generation: "4-5",
    version: "20250929",
    name: "Claude Sonnet 4.5",
    context: 200000,
    output: 64000,
  },
  haiku: {
    generation: "4-5",
    version: "20251001",
    name: "Claude Haiku 4.5",
    context: 200000,
    output: 8192,
  },
} as const

/**
 * GPT model definitions
 */
export const GPT_MODELS = {
  base: {
    version: "5.2",
    name: "GPT-5.2",
    context: 400000,
    output: 128000,
  },
  codex: {
    version: "5.2",
    name: "GPT-5.2 Codex",
    context: 400000,
    output: 128000,
  },
} as const

/**
 * Gemini model definitions
 */
export const GEMINI_MODELS = {
  pro: {
    version: "3",
    name: "Gemini 3 Pro",
    context: 1048576,
    output: 65536,
  },
} as const

// =============================================================================
// MODEL ID BUILDERS
// =============================================================================

export type ClaudeModelType = keyof typeof CLAUDE_MODELS
export type GptModelType = keyof typeof GPT_MODELS
export type GeminiModelType = keyof typeof GEMINI_MODELS

/**
 * Build Claude model ID
 * @example getClaudeModelId("opus") => "claude-opus-4-6-20260205"
 * @example getClaudeModelId("opus", true) => "claude-opus-4-6-20260205-third-party"
 */
export const getClaudeModelId = (type: ClaudeModelType, thirdParty = false): string => {
  const model = CLAUDE_MODELS[type]
  const suffix = thirdParty ? "-third-party" : ""
  return `claude-${type}-${model.generation}-${model.version}${suffix}`
}

/**
 * Build GPT model ID
 * @example getGptModelId("base") => "gpt-5.2"
 * @example getGptModelId("codex") => "gpt-5.2-codex"
 */
export const getGptModelId = (type: GptModelType): string => {
  const model = GPT_MODELS[type]
  return type === "codex" ? `gpt-${model.version}-codex` : `gpt-${model.version}`
}

/**
 * Build Gemini model ID
 * @example getGeminiModelId("pro") => "gemini-3-pro"
 */
export const getGeminiModelId = (type: GeminiModelType): string => {
  const model = GEMINI_MODELS[type]
  return `gemini-${model.version}-pro`
}

/**
 * Get full model ID with provider prefix
 * @example getFullModelId("opus") => "aicodewith/claude-opus-4-6-20260205"
 */
export const getFullClaudeModelId = (type: ClaudeModelType, thirdParty = false): string => {
  return `${PROVIDER_ID}/${getClaudeModelId(type, thirdParty)}`
}

export const getFullGptModelId = (type: GptModelType): string => {
  return `${PROVIDER_ID}/${getGptModelId(type)}`
}

export const getFullGeminiModelId = (type: GeminiModelType): string => {
  return `${PROVIDER_ID}/${getGeminiModelId(type)}`
}

// =============================================================================
// MODEL MIGRATIONS - Add entries when deprecating old models
// =============================================================================

/**
 * Model migrations: old model ID → new model ID
 * Used to auto-upgrade user configs when models are deprecated
 *
 * Format: both with and without provider prefix
 */
export const MODEL_MIGRATIONS: Record<string, string> = {
  // Opus 4.5 → Opus 4.6 (deprecated 2026-02)
  "claude-opus-4-5-20251101": getClaudeModelId("opus"),
  "claude-opus-4-5-20251101-third-party": getClaudeModelId("opus", true),
  [`${PROVIDER_ID}/claude-opus-4-5-20251101`]: getFullClaudeModelId("opus"),
  [`${PROVIDER_ID}/claude-opus-4-5-20251101-third-party`]: getFullClaudeModelId("opus", true),
}

// =============================================================================
// PROVIDER CONFIG GENERATION
// =============================================================================

const IMAGE_MODALITIES = { input: ["text", "image"] as const, output: ["text"] as const }

interface ModelConfig {
  name: string
  limit: { context: number; output: number }
  modalities: { input: readonly string[]; output: readonly string[] }
}

/**
 * Generate provider-config.json content
 */
export const generateProviderConfig = () => {
  const models: Record<string, ModelConfig> = {}

  // GPT models
  for (const [type, model] of Object.entries(GPT_MODELS)) {
    const id = getGptModelId(type as GptModelType)
    models[id] = {
      name: model.name,
      limit: { context: model.context, output: model.output },
      modalities: IMAGE_MODALITIES,
    }
  }

  // Claude models (both direct and third-party)
  for (const [type, model] of Object.entries(CLAUDE_MODELS)) {
    const id = getClaudeModelId(type as ClaudeModelType)
    const idThirdParty = getClaudeModelId(type as ClaudeModelType, true)

    models[id] = {
      name: model.name,
      limit: { context: model.context, output: model.output },
      modalities: IMAGE_MODALITIES,
    }
    models[idThirdParty] = {
      name: `${model.name} (third party)`,
      limit: { context: model.context, output: model.output },
      modalities: IMAGE_MODALITIES,
    }
  }

  // Gemini models
  for (const [type, model] of Object.entries(GEMINI_MODELS)) {
    const id = getGeminiModelId(type as GeminiModelType)
    models[id] = {
      name: model.name,
      limit: { context: model.context, output: model.output },
      modalities: IMAGE_MODALITIES,
    }
  }

  return {
    name: "AICodewith",
    env: ["AICODEWITH_API_KEY"],
    models,
  }
}

// =============================================================================
// OMO CONFIG GENERATION
// =============================================================================

/**
 * Default model assignments for OMO agents
 * Maps agent name patterns to model types
 */
const OMO_AGENT_DEFAULTS: Record<string, string> = {
  // High-capability agents → Opus
  sisyphus: getFullClaudeModelId("opus"),
  prometheus: getFullClaudeModelId("opus"),
  metis: getFullClaudeModelId("opus"),
  build: getFullClaudeModelId("opus"),
  plan: getFullClaudeModelId("opus"),
  "OpenCode-Builder": getFullClaudeModelId("opus"),

  // Code-focused agents → GPT Codex
  hephaestus: getFullGptModelId("codex"),

  // Strategy/review agents → GPT
  oracle: getFullGptModelId("base"),
  momus: getFullGptModelId("base"),

  // Visual/creative agents → Gemini
  "multimodal-looker": getFullGeminiModelId("pro"),
  "frontend-ui-ux-engineer": getFullGeminiModelId("pro"),
  "document-writer": getFullGeminiModelId("pro"),

  // General agents → Sonnet
  librarian: getFullClaudeModelId("sonnet"),
  explore: getFullClaudeModelId("sonnet"),
  atlas: getFullClaudeModelId("sonnet"),
  "sisyphus-junior": getFullClaudeModelId("sonnet"),
  general: getFullClaudeModelId("sonnet"),
}

/**
 * Default model assignments for OMO categories
 */
const OMO_CATEGORY_DEFAULTS: Record<string, { model: string; variant?: string }> = {
  "visual-engineering": { model: getFullGeminiModelId("pro") },
  ultrabrain: { model: getFullGptModelId("codex"), variant: "xhigh" },
  deep: { model: getFullGptModelId("codex") },
  artistry: { model: getFullGeminiModelId("pro") },
  quick: { model: getFullClaudeModelId("sonnet") },
  "unspecified-low": { model: getFullClaudeModelId("sonnet") },
  "unspecified-high": { model: getFullClaudeModelId("opus") },
  writing: { model: getFullGeminiModelId("pro") },
  visual: { model: getFullGeminiModelId("pro") },
  "business-logic": { model: getFullGptModelId("base") },
  "data-analysis": { model: getFullClaudeModelId("sonnet") },
}

/**
 * Generate default-omo-config.json content
 */
export const generateOmoConfig = () => {
  const agents: Record<string, { model: string }> = {}
  const categories: Record<string, { model: string; variant?: string }> = {}

  for (const [name, model] of Object.entries(OMO_AGENT_DEFAULTS)) {
    agents[name] = { model }
  }

  for (const [name, config] of Object.entries(OMO_CATEGORY_DEFAULTS)) {
    categories[name] = config
  }

  return {
    $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
    agents,
    categories,
  }
}

// =============================================================================
// INSTALL SCRIPT MODEL LIST
// =============================================================================

/**
 * Generate model configs for install script
 */
export const generateInstallScriptModels = () => {
  const models: Record<string, { name: string; modalities: typeof IMAGE_MODALITIES }> = {}

  // GPT models
  for (const [type, model] of Object.entries(GPT_MODELS)) {
    const id = getGptModelId(type as GptModelType)
    models[id] = { name: model.name, modalities: IMAGE_MODALITIES }
  }

  // Claude models
  for (const [type, model] of Object.entries(CLAUDE_MODELS)) {
    const id = getClaudeModelId(type as ClaudeModelType)
    const idThirdParty = getClaudeModelId(type as ClaudeModelType, true)
    models[id] = { name: model.name, modalities: IMAGE_MODALITIES }
    models[idThirdParty] = { name: `${model.name} (third party)`, modalities: IMAGE_MODALITIES }
  }

  // Gemini models
  for (const [type, model] of Object.entries(GEMINI_MODELS)) {
    const id = getGeminiModelId(type as GeminiModelType)
    models[id] = { name: model.name, modalities: IMAGE_MODALITIES }
  }

  return models
}

/**
 * Get default model for new installations
 */
export const getDefaultModel = (): string => {
  return getFullClaudeModelId("opus", true)
}

/**
 * Get all model IDs (for validation)
 */
export const getAllModelIds = (): string[] => {
  const ids: string[] = []

  for (const type of Object.keys(GPT_MODELS)) {
    ids.push(getGptModelId(type as GptModelType))
  }

  for (const type of Object.keys(CLAUDE_MODELS)) {
    ids.push(getClaudeModelId(type as ClaudeModelType))
    ids.push(getClaudeModelId(type as ClaudeModelType, true))
  }

  for (const type of Object.keys(GEMINI_MODELS)) {
    ids.push(getGeminiModelId(type as GeminiModelType))
  }

  return ids
}

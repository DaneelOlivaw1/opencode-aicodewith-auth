/**
 * @file registry.ts
 * @input  -
 * @output Central model definitions - single source of truth
 * @pos    Foundation - all model configs derive from here
 *
 * HOW TO ADD A NEW MODEL:
 * 1. Add entry to MODELS below
 * 2. Run `bun run build` - configs auto-generate
 * 3. Done!
 */

export type ModelFamily = "codex" | "gpt" | "claude" | "gemini"
export type ReasoningSupport = "none" | "basic" | "full" | "xhigh"

export interface ModelDefinition {
  id: string
  family: ModelFamily
  displayName: string
  version: string
  limit: {
    context: number
    output: number
  }
  modalities: {
    input: ("text" | "image")[]
    output: ("text")[]
  }
  reasoning?: ReasoningSupport
  deprecated?: boolean
  replacedBy?: string
  aliases?: string[]
}

export const PROVIDER_ID = "aicodewith"

/**
 * ============================================
 * SINGLE SOURCE OF TRUTH - ALL MODELS DEFINED HERE
 * ============================================
 * 
 * To add a new model:
 * 1. Add entry below
 * 2. Run build
 * 3. All configs auto-update
 */
export const MODELS: ModelDefinition[] = [
  // GPT Models
  {
    id: "gpt-5.3-codex",
    family: "codex",
    displayName: "GPT-5.3 Codex",
    version: "5.3",
    limit: { context: 400000, output: 128000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: "xhigh",
    aliases: ["gpt-5.3-codex", "gpt 5.3 codex", "codex"],
  },
  {
    id: "gpt-5.2",
    family: "gpt",
    displayName: "GPT-5.2",
    version: "5.2",
    limit: { context: 400000, output: 128000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: "xhigh",
    aliases: ["gpt-5.2", "gpt 5.2"],
  },

  // Deprecated GPT Models (for migration)
  {
    id: "gpt-5.2-codex",
    family: "codex",
    displayName: "GPT-5.2 Codex (deprecated)",
    version: "5.2",
    limit: { context: 400000, output: 128000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: "xhigh",
    deprecated: true,
    replacedBy: "gpt-5.3-codex",
  },
  {
    id: "gpt-5.1-codex",
    family: "codex",
    displayName: "GPT-5.1 Codex (deprecated)",
    version: "5.1",
    limit: { context: 400000, output: 128000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: "full",
    deprecated: true,
    replacedBy: "gpt-5.3-codex",
  },
  {
    id: "gpt-5.1-codex-max",
    family: "codex",
    displayName: "GPT-5.1 Codex Max (deprecated)",
    version: "5.1",
    limit: { context: 400000, output: 128000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: "xhigh",
    deprecated: true,
    replacedBy: "gpt-5.3-codex",
  },
  {
    id: "gpt-5.1-codex-mini",
    family: "codex",
    displayName: "GPT-5.1 Codex Mini (deprecated)",
    version: "5.1",
    limit: { context: 200000, output: 64000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: "basic",
    deprecated: true,
    replacedBy: "gpt-5.3-codex",
  },
  {
    id: "gpt-5.1",
    family: "gpt",
    displayName: "GPT-5.1 (deprecated)",
    version: "5.1",
    limit: { context: 400000, output: 128000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    reasoning: "full",
    deprecated: true,
    replacedBy: "gpt-5.2",
  },

  // Claude Models
  {
    id: "claude-opus-4-6-20260205",
    family: "claude",
    displayName: "Claude Opus 4.6",
    version: "4.6",
    limit: { context: 200000, output: 64000 },
    modalities: { input: ["text", "image"], output: ["text"] },
  },
  {
    id: "claude-sonnet-4-6",
    family: "claude",
    displayName: "Claude Sonnet 4.6",
    version: "4.6",
    limit: { context: 200000, output: 64000 },
    modalities: { input: ["text", "image"], output: ["text"] },
  },
  {
    id: "claude-sonnet-4-5-20250929",
    family: "claude",
    displayName: "Claude Sonnet 4.5",
    version: "4.5",
    limit: { context: 200000, output: 64000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    deprecated: true,
    replacedBy: "claude-sonnet-4-6",
  },
  {
    id: "claude-haiku-4-5-20251001",
    family: "claude",
    displayName: "Claude Haiku 4.5",
    version: "4.5",
    limit: { context: 200000, output: 8192 },
    modalities: { input: ["text", "image"], output: ["text"] },
  },

  // Deprecated Claude Models (for migration)
  {
    id: "claude-opus-4-5-20251101",
    family: "claude",
    displayName: "Claude Opus 4.5 (deprecated)",
    version: "4.5",
    limit: { context: 200000, output: 64000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    deprecated: true,
    replacedBy: "claude-opus-4-6-20260205",
  },
  {
    id: "claude-opus-4-6-20260205-third-party",
    family: "claude",
    displayName: "Claude Opus 4.6 third-party (deprecated)",
    version: "4.6",
    limit: { context: 200000, output: 64000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    deprecated: true,
    replacedBy: "claude-opus-4-6-20260205",
  },
  {
    id: "claude-opus-4-5-20251101-third-party",
    family: "claude",
    displayName: "Claude Opus 4.5 third-party (deprecated)",
    version: "4.5",
    limit: { context: 200000, output: 64000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    deprecated: true,
    replacedBy: "claude-opus-4-6-20260205",
  },
  {
    id: "claude-sonnet-4-5-20250929-third-party",
    family: "claude",
    displayName: "Claude Sonnet 4.5 third-party (deprecated)",
    version: "4.5",
    limit: { context: 200000, output: 64000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    deprecated: true,
    replacedBy: "claude-sonnet-4-6",
  },
  {
    id: "claude-haiku-4-5-20251001-third-party",
    family: "claude",
    displayName: "Claude Haiku 4.5 third-party (deprecated)",
    version: "4.5",
    limit: { context: 200000, output: 8192 },
    modalities: { input: ["text", "image"], output: ["text"] },
    deprecated: true,
    replacedBy: "claude-haiku-4-5-20251001",
  },

  // Gemini Models
  {
    id: "gemini-3-pro",
    family: "gemini",
    displayName: "Gemini 3 Pro",
    version: "3",
    limit: { context: 1048576, output: 65536 },
    modalities: { input: ["text", "image"], output: ["text"] },
  },
]

// ============================================
// DERIVED DATA - AUTO-GENERATED FROM MODELS
// ============================================

export const getActiveModels = () => MODELS.filter(m => !m.deprecated)

export const getDeprecatedModels = () => MODELS.filter(m => m.deprecated)

export const getModelById = (id: string) => MODELS.find(m => m.id === id)

export const getModelByAlias = (alias: string): ModelDefinition | undefined => {
  const normalized = alias.toLowerCase().trim()
  return MODELS.find(m => 
    m.id === normalized || 
    m.aliases?.some(a => a.toLowerCase() === normalized)
  )
}

export const getModelsByFamily = (family: ModelFamily) => 
  MODELS.filter(m => m.family === family && !m.deprecated)

export const buildModelMigrations = (): Record<string, string> => {
  const migrations: Record<string, string> = {}
  
  for (const model of getDeprecatedModels()) {
    if (model.replacedBy) {
      migrations[model.id] = model.replacedBy
      migrations[`${PROVIDER_ID}/${model.id}`] = `${PROVIDER_ID}/${model.replacedBy}`
    }
  }
  
  return migrations
}

export const buildProviderConfig = () => {
  const models: Record<string, {
    name: string
    limit: { context: number; output: number }
    modalities: { input: string[]; output: string[] }
  }> = {}

  for (const model of getActiveModels()) {
    models[model.id] = {
      name: model.displayName,
      limit: model.limit,
      modalities: model.modalities,
    }
  }

  return {
    name: "AICodewith",
    env: ["AICODEWITH_API_KEY"],
    models,
  }
}

export const buildAliasMap = (): Record<string, string> => {
  const map: Record<string, string> = {}
  
  for (const model of getActiveModels()) {
    map[model.id] = model.id
    
    if (model.aliases) {
      for (const alias of model.aliases) {
        map[alias.toLowerCase()] = model.id
      }
    }
    
    const effortLevels = ["none", "low", "medium", "high", "xhigh"]
    for (const effort of effortLevels) {
      map[`${model.id}-${effort}`] = model.id
    }
  }
  
  return map
}

export type OmoAgentName = 
  | "sisyphus" | "hephaestus" | "oracle" | "librarian" | "explore"
  | "multimodal-looker" | "prometheus" | "metis" | "momus" | "atlas"
  | "build" | "plan" | "sisyphus-junior" | "OpenCode-Builder" | "general"
  | "frontend-ui-ux-engineer" | "document-writer"

export type OmoCategoryName =
  | "visual-engineering" | "ultrabrain" | "deep" | "artistry" | "quick"
  | "unspecified-low" | "unspecified-high" | "writing" | "visual"
  | "business-logic" | "data-analysis"

export interface OmoModelAssignment {
  agents: Record<OmoAgentName, string>
  categories: Record<OmoCategoryName, string>
}

const getFullModelId = (id: string) => `${PROVIDER_ID}/${id}`

export const OMO_MODEL_ASSIGNMENTS: OmoModelAssignment = {
  agents: {
    "sisyphus": getFullModelId("claude-sonnet-4-6"),
    "hephaestus": getFullModelId("claude-sonnet-4-6"),
    "oracle": getFullModelId("gpt-5.2"),
    "librarian": getFullModelId("claude-sonnet-4-6"),
    "explore": getFullModelId("claude-sonnet-4-6"),
    "multimodal-looker": getFullModelId("gemini-3-pro"),
    "prometheus": getFullModelId("gpt-5.2"),
    "metis": getFullModelId("gpt-5.2"),
    "momus": getFullModelId("gpt-5.2"),
    "atlas": getFullModelId("claude-sonnet-4-6"),
    "build": getFullModelId("claude-opus-4-6-20260205"),
    "plan": getFullModelId("claude-opus-4-6-20260205"),
    "sisyphus-junior": getFullModelId("claude-sonnet-4-6"),
    "OpenCode-Builder": getFullModelId("claude-opus-4-6-20260205"),
    "general": getFullModelId("claude-sonnet-4-6"),
    "frontend-ui-ux-engineer": getFullModelId("gemini-3-pro"),
    "document-writer": getFullModelId("gemini-3-pro"),
  },
  categories: {
    "visual-engineering": getFullModelId("gemini-3-pro"),
    "ultrabrain": getFullModelId("gemini-3-pro"),
    "deep": getFullModelId("gemini-3-pro"),
    "artistry": getFullModelId("gemini-3-pro"),
    "quick": getFullModelId("claude-sonnet-4-6"),
    "unspecified-low": getFullModelId("claude-sonnet-4-6"),
    "unspecified-high": getFullModelId("gpt-5.2"),
    "writing": getFullModelId("gemini-3-pro"),
    "visual": getFullModelId("gemini-3-pro"),
    "business-logic": getFullModelId("gpt-5.2"),
    "data-analysis": getFullModelId("claude-sonnet-4-6"),
  },
}

export const buildOmoConfig = () => {
  const config: Record<string, unknown> = {
    $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
    agents: {} as Record<string, { model: string }>,
    categories: {} as Record<string, { model: string }>,
  }

  for (const [name, model] of Object.entries(OMO_MODEL_ASSIGNMENTS.agents)) {
    (config.agents as Record<string, { model: string }>)[name] = { model }
  }

  for (const [name, model] of Object.entries(OMO_MODEL_ASSIGNMENTS.categories)) {
    (config.categories as Record<string, { model: string }>)[name] = { model }
  }

  return config
}

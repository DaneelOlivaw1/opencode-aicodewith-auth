/**
 * @file lib/hooks/omo-config-sync/constants.ts
 * @input  None
 * @output OMO agent model mapping constants
 * @pos    Configuration constants for OMO config sync
 */

import { PROVIDER_ID } from "../../constants"

/**
 * Default model assignments for OMO agents
 * Based on OMO's AGENT_MODEL_REQUIREMENTS fallbackChain logic
 */
export const AGENT_MODEL_MAP: Record<string, string> = {
  // Heavy reasoning - Claude Opus
  sisyphus: `${PROVIDER_ID}/claude-opus-4-5-20251101`,
  prometheus: `${PROVIDER_ID}/claude-opus-4-5-20251101`,
  metis: `${PROVIDER_ID}/claude-opus-4-5-20251101`,
  "OpenCode-Builder": `${PROVIDER_ID}/claude-opus-4-5-20251101`,
  build: `${PROVIDER_ID}/claude-opus-4-5-20251101`,
  plan: `${PROVIDER_ID}/claude-opus-4-5-20251101`,

  // Logical reasoning - GPT 5.2
  oracle: `${PROVIDER_ID}/gpt-5.2`,
  momus: `${PROVIDER_ID}/gpt-5.2`,

  // Light tasks - Claude Sonnet
  librarian: `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,
  atlas: `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,
  "sisyphus-junior": `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,
  general: `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,

  // Visual/Multimodal - Gemini
  explore: `${PROVIDER_ID}/gemini-3-pro`,
  "multimodal-looker": `${PROVIDER_ID}/gemini-3-pro`,
  "frontend-ui-ux-engineer": `${PROVIDER_ID}/gemini-3-pro`,
  "document-writer": `${PROVIDER_ID}/gemini-3-pro`,
}

/**
 * Default model assignments for OMO categories
 */
export const CATEGORY_MODEL_MAP: Record<string, string> = {
  "visual-engineering": `${PROVIDER_ID}/gemini-3-pro`,
  visual: `${PROVIDER_ID}/gemini-3-pro`,
  ultrabrain: `${PROVIDER_ID}/gpt-5.2`,
  artistry: `${PROVIDER_ID}/gemini-3-pro`,
  quick: `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,
  "unspecified-low": `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,
  "unspecified-high": `${PROVIDER_ID}/claude-opus-4-5-20251101`,
  writing: `${PROVIDER_ID}/gemini-3-pro`,
  "business-logic": `${PROVIDER_ID}/gpt-5.2`,
  "data-analysis": `${PROVIDER_ID}/claude-sonnet-4-5-20250929`,
}

/**
 * Fallback model for unknown agents/categories
 */
export const DEFAULT_MODEL = `${PROVIDER_ID}/claude-sonnet-4-5-20250929`

/**
 * Default OMO config when file doesn't exist
 */
export const DEFAULT_CONFIG = {
  $schema:
    "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  agents: Object.fromEntries(
    Object.entries(AGENT_MODEL_MAP).map(([name, model]) => [name, { model }])
  ),
  categories: Object.fromEntries(
    Object.entries(CATEGORY_MODEL_MAP).map(([name, model]) => [name, { model }])
  ),
}

/**
 * OMO config file name
 */
export const OMO_CONFIG_FILENAME = "oh-my-opencode.json"

/**
 * @file constants.ts
 * @input  -
 * @output Global constants (URLs, header names, provider IDs, model versions)
 * @pos    Foundation - imported by most other modules
 *
 * 📌 On change: Update this header + lib/ARCHITECTURE.md
 */

export const PLUGIN_NAME = "opencode-aicodewith-auth"
export const PROVIDER_ID = "aicodewith"
export const AUTH_METHOD_LABEL = "AICodewith API Key"
export const CODEX_BASE_URL = "https://api.aicodewith.com/chatgpt/v1"
export const AICODEWITH_ANTHROPIC_BASE_URL = "https://api.aicodewith.com/v1"
export const AICODEWITH_LITE_URL = "https://api.aicodewith.com/lite"
export const AICODEWITH_GEMINI_BASE_URL = "https://api.aicodewith.com/gemini_cli"
export const GEMINI_USER_AGENT = "GeminiCLI/v25.2.1 (darwin; arm64)"
export const GEMINI_API_CLIENT = "google-genai-sdk/1.30.0 gl-node/v25.2.1"
export const GEMINI_PRIVILEGED_USER_ID_ENV = "AICODEWITH_GEMINI_USER_ID"
export const USER_AGENT = "codex_cli_rs/0.77.0 (Mac OS 26.2.0; arm64) iTerm.app/3.6.6"
export const ORIGINATOR = "codex_cli_rs"

export const SAVE_RAW_RESPONSE_ENV = "SAVE_RAW_RESPONSE"

/**
 * Claude model versions - update these when new versions are released
 * Format: YYYYMMDD date suffix
 */
export const CLAUDE_VERSIONS = {
  opus: "20260205",      // Claude Opus 4
  sonnet: "20250929",    // Claude Sonnet 4.5
  haiku: "20251001",     // Claude Haiku 4.5
} as const

/**
 * Claude model generation numbers
 */
export const CLAUDE_GENERATIONS = {
  opus: "4-6",           // Opus 4.6 (was 4-5)
  sonnet: "4-5",         // Sonnet 4.5
  haiku: "4-5",          // Haiku 4.5
} as const

/**
 * GPT model versions - update these when new versions are released
 */
export const GPT_VERSIONS = {
  base: "5.2",           // GPT-5.2
  codex: "5.2",          // GPT-5.2 Codex
} as const

/**
 * Build full Claude model ID from type
 * @example getClaudeModelId("opus") => "claude-opus-4-6-20260205"
 */
export const getClaudeModelId = (type: keyof typeof CLAUDE_VERSIONS, thirdParty = false): string => {
  const gen = CLAUDE_GENERATIONS[type]
  const version = CLAUDE_VERSIONS[type]
  const suffix = thirdParty ? "-third-party" : ""
  return `claude-${type}-${gen}-${version}${suffix}`
}

/**
 * Build full GPT model ID from type
 * @example getGptModelId("base") => "gpt-5.2"
 * @example getGptModelId("codex") => "gpt-5.2-codex"
 */
export const getGptModelId = (type: keyof typeof GPT_VERSIONS): string => {
  const version = GPT_VERSIONS[type]
  return type === "codex" ? `gpt-${version}-codex` : `gpt-${version}`
}

/**
 * Model migrations: old model ID → new model ID
 * Used to auto-upgrade user configs when models are deprecated
 *
 * To add a new migration:
 * 1. Update CLAUDE_VERSIONS/CLAUDE_GENERATIONS or GPT_VERSIONS above
 * 2. Add migration entries below mapping old → new
 */
export const MODEL_MIGRATIONS: Record<string, string> = {
  // Opus 4.5 → Opus 4.6
  "claude-opus-4-5-20251101": getClaudeModelId("opus"),
  "claude-opus-4-5-20251101-third-party": getClaudeModelId("opus", true),
  [`${PROVIDER_ID}/claude-opus-4-5-20251101`]: `${PROVIDER_ID}/${getClaudeModelId("opus")}`,
  [`${PROVIDER_ID}/claude-opus-4-5-20251101-third-party`]: `${PROVIDER_ID}/${getClaudeModelId("opus", true)}`,
  // Add future migrations here, e.g.:
  // "gpt-5.2": getGptModelId("base"),  // when GPT-5.3 is released
}

export const HEADER_NAMES = {
  AUTHORIZATION: "authorization",
  ORIGINATOR: "originator",
  SESSION_ID: "session_id",
  CONVERSATION_ID: "conversation_id",
  USER_AGENT: "user-agent",
  ACCEPT: "accept",
  CONTENT_TYPE: "content-type",
  OPENAI_BETA: "openai-beta",
  CHATGPT_ACCOUNT_ID: "chatgpt-account-id",
  X_GOOG_API_KEY: "x-goog-api-key",
  X_GOOG_API_CLIENT: "x-goog-api-client",
  X_GEMINI_PRIVILEGED_USER_ID: "x-gemini-api-privileged-user-id",
} as const

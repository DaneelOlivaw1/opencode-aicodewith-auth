/**
 * @file codex.ts
 * @input  Normalized model name
 * @output Codex system prompt (inlined at build time, no filesystem dependency)
 * @pos    Prompt provider - returns model instructions for Codex API
 *
 * 📌 On change: Update this header + lib/prompts/ARCHITECTURE.md
 */

import { FALLBACK_INSTRUCTIONS } from "./fallback-instructions-inline"

export type ModelFamily =
  | "gpt-5.2-codex"
  | "codex-max"
  | "codex"
  | "gpt-5.2"
  | "gpt-5.1"

export function getModelFamily(normalizedModel: string): ModelFamily {
  if (
    normalizedModel.includes("gpt-5.2-codex") ||
    normalizedModel.includes("gpt 5.2 codex")
  ) {
    return "gpt-5.2-codex"
  }
  if (normalizedModel.includes("codex-max")) {
    return "codex-max"
  }
  if (
    normalizedModel.includes("codex") ||
    normalizedModel.startsWith("codex-")
  ) {
    return "codex"
  }
  if (normalizedModel.includes("gpt-5.2")) {
    return "gpt-5.2"
  }
  return "gpt-5.1"
}

export function getCodexInstructions(
  _normalizedModel = "gpt-5.1-codex",
): string {
  return FALLBACK_INSTRUCTIONS
}

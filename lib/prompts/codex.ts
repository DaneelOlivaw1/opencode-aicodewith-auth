/**
 * @file codex.ts
 * @input  Normalized model name
 * @output Codex system prompt (from local fallback file)
 * @pos    Prompt provider - reads model instructions from bundled fallback file
 *
 * 📌 On change: Update this header + lib/prompts/ARCHITECTURE.md
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const FALLBACK_FILE = join(__dirname, "fallback-instructions.txt")

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

let cachedInstructions: string | null = null

export function getCodexInstructions(
  _normalizedModel = "gpt-5.1-codex",
): string {
  if (cachedInstructions) return cachedInstructions
  cachedInstructions = readFileSync(FALLBACK_FILE, "utf8")
  return cachedInstructions
}

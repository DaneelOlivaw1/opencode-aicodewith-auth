/**
 * @file request-transformer.ts
 * @input  RequestBody from OpenCode
 * @output Transformed RequestBody for Codex API
 * @pos    Core transformation - model normalization, reasoning config, input filtering
 *
 * 📌 On change: Update this header + lib/request/ARCHITECTURE.md
 */

import { logDebug } from "../logger"
import { CODEX_OPENCODE_BRIDGE } from "../prompts/codex-opencode-bridge"
import { getNormalizedModel } from "./helpers/model-map"
import {
  filterOpenCodeSystemPromptsWithCachedPrompt,
  normalizeOrphanedToolOutputs,
} from "./helpers/input-utils"
import type { ConfigOptions, InputItem, ReasoningConfig, RequestBody } from "../types"

export function normalizeModel(model: string | undefined): string {
  if (!model) return "gpt-5.3-codex"

  const modelId = model.includes("/") ? model.split("/").pop()! : model

  const mappedModel = getNormalizedModel(modelId)
  if (mappedModel) {
    return mappedModel
  }

  const normalized = modelId.toLowerCase()

  if (
    normalized.includes("gpt-5.3-codex") ||
    normalized.includes("gpt 5.3 codex")
  ) {
    return "gpt-5.3-codex"
  }

  if (normalized.includes("gpt-5.2") || normalized.includes("gpt 5.2")) {
    return "gpt-5.2"
  }

  if (normalized.includes("codex")) {
    return "gpt-5.3-codex"
  }

  return "gpt-5.3-codex"
}

function resolveReasoningConfig(modelName: string, body: RequestBody): ReasoningConfig {
  const providerOpenAI = body.providerOptions?.openai
  const existingEffort =
    body.reasoning?.effort ?? providerOpenAI?.reasoningEffort
  const existingSummary =
    body.reasoning?.summary ?? providerOpenAI?.reasoningSummary

  const mergedConfig: ConfigOptions = {
    ...(existingEffort ? { reasoningEffort: existingEffort } : {}),
    ...(existingSummary ? { reasoningSummary: existingSummary } : {}),
  }

  return getReasoningConfig(modelName, mergedConfig)
}

function resolveTextVerbosity(body: RequestBody): "low" | "medium" | "high" | undefined {
  const providerOpenAI = body.providerOptions?.openai
  return body.text?.verbosity ?? providerOpenAI?.textVerbosity
}

function resolveInclude(body: RequestBody): string[] {
  const providerOpenAI = body.providerOptions?.openai
  const base =
    body.include ??
    providerOpenAI?.include ??
    ["reasoning.encrypted_content"]
  const include = Array.from(new Set(base.filter(Boolean)))
  if (!include.includes("reasoning.encrypted_content")) {
    include.push("reasoning.encrypted_content")
  }
  return include
}

export function filterInput(
  input: InputItem[] | undefined,
): InputItem[] | undefined {
  if (!Array.isArray(input)) return input

  return input
}

function stripItemIds(input: InputItem[]): InputItem[] {
  return input
    .filter((item) => item.type !== "item_reference")
    .map((item) => {
      if ("id" in item) {
        const { id, ...rest } = item as InputItem & { id: unknown }
        return rest as InputItem
      }
      return item
    })
}

export function filterOpenCodeSystemPrompts(
  input: InputItem[] | undefined,
): InputItem[] | undefined {
  if (!Array.isArray(input)) return input

  return filterOpenCodeSystemPromptsWithCachedPrompt(input, null)
}

export function addCodexBridgeMessage(
  input: InputItem[] | undefined,
  hasTools: boolean,
): InputItem[] | undefined {
  if (!hasTools || !Array.isArray(input)) return input

  const bridgeMessage: InputItem = {
    type: "message",
    role: "developer",
    content: [
      {
        type: "input_text",
        text: CODEX_OPENCODE_BRIDGE,
      },
    ],
  }

  return [bridgeMessage, ...input]
}

export function getReasoningConfig(
  modelName: string | undefined,
  userConfig: ConfigOptions = {},
): ReasoningConfig {
  const normalizedName = modelName?.toLowerCase() ?? ""

  const isGpt53Codex =
    normalizedName.includes("gpt-5.3-codex") ||
    normalizedName.includes("gpt 5.3 codex")

  const isGpt52General =
    (normalizedName.includes("gpt-5.2") || normalizedName.includes("gpt 5.2"))

  const supportsXhigh = isGpt52General || isGpt53Codex
  const supportsNone = isGpt52General

  const defaultEffort: ReasoningConfig["effort"] = supportsXhigh ? "high" : "medium"

  let effort = userConfig.reasoningEffort || defaultEffort

  if (!supportsXhigh && effort === "xhigh") {
    effort = "high"
  }

  if (!supportsNone && effort === "none") {
    effort = "low"
  }

  return {
    effort,
    summary: userConfig.reasoningSummary || "auto",
  }
}

export async function transformRequestBody(
  body: RequestBody,
  codexInstructions: string,
): Promise<RequestBody> {
  const originalModel = body.model
  const normalizedModel = normalizeModel(body.model)

  logDebug(
    `Model lookup: "${originalModel}" -> "${normalizedModel}"`,
    {
      hasTools: !!body.tools,
    },
  )

  body.model = normalizedModel
  body.stream = true
  body.instructions = codexInstructions

  if (body.input && Array.isArray(body.input)) {
    body.input = stripItemIds(body.input)
    body.input = filterOpenCodeSystemPrompts(body.input)
    body.input = addCodexBridgeMessage(body.input, !!body.tools)

    if (body.input) {
      body.input = normalizeOrphanedToolOutputs(body.input)
    }
  }

  const reasoningConfig = resolveReasoningConfig(normalizedModel, body)
  body.reasoning = {
    ...body.reasoning,
    ...reasoningConfig,
  }

  const verbosity = resolveTextVerbosity(body)
  if (verbosity) {
    body.text = {
      ...body.text,
      verbosity,
    }
  }

  body.include = resolveInclude(body)

  body.max_output_tokens = undefined
  body.max_completion_tokens = undefined

  return body
}

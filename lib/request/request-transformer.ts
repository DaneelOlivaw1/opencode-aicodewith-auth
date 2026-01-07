import { logDebug, logWarn } from "../logger"
import { CODEX_OPENCODE_BRIDGE } from "../prompts/codex-opencode-bridge"
import { getOpenCodeCodexPrompt } from "../prompts/opencode-codex"
import { getNormalizedModel } from "./helpers/model-map"
import {
  filterOpenCodeSystemPromptsWithCachedPrompt,
  normalizeOrphanedToolOutputs,
} from "./helpers/input-utils"
import type { ConfigOptions, InputItem, ReasoningConfig, RequestBody } from "../types"

export function normalizeModel(model: string | undefined): string {
  if (!model) return "gpt-5.1"

  const modelId = model.includes("/") ? model.split("/").pop()! : model

  const mappedModel = getNormalizedModel(modelId)
  if (mappedModel) {
    return mappedModel
  }

  const normalized = modelId.toLowerCase()

  if (
    normalized.includes("gpt-5.2-codex") ||
    normalized.includes("gpt 5.2 codex")
  ) {
    return "gpt-5.2-codex"
  }

  if (normalized.includes("gpt-5.2") || normalized.includes("gpt 5.2")) {
    return "gpt-5.2"
  }

  if (
    normalized.includes("gpt-5.1-codex-max") ||
    normalized.includes("gpt 5.1 codex max")
  ) {
    return "gpt-5.1-codex-max"
  }

  if (
    normalized.includes("gpt-5.1-codex-mini") ||
    normalized.includes("gpt 5.1 codex mini")
  ) {
    return "gpt-5.1-codex-mini"
  }

  if (
    normalized.includes("codex-mini-latest") ||
    normalized.includes("gpt-5-codex-mini") ||
    normalized.includes("gpt 5 codex mini")
  ) {
    return "codex-mini-latest"
  }

  if (
    normalized.includes("gpt-5.1-codex") ||
    normalized.includes("gpt 5.1 codex")
  ) {
    return "gpt-5.1-codex"
  }

  if (normalized.includes("gpt-5.1") || normalized.includes("gpt 5.1")) {
    return "gpt-5.1"
  }

  if (normalized.includes("codex")) {
    return "gpt-5.1-codex"
  }

  if (normalized.includes("gpt-5") || normalized.includes("gpt 5")) {
    return "gpt-5.1"
  }

  return "gpt-5.1"
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
    .filter((item) => {
      if (item.type === "item_reference") {
        return false
      }
      return true
    })
    .map((item) => {
      if (item.id) {
        const { id, ...itemWithoutId } = item
        return itemWithoutId as InputItem
      }
      return item
    })
}

export async function filterOpenCodeSystemPrompts(
  input: InputItem[] | undefined,
): Promise<InputItem[] | undefined> {
  if (!Array.isArray(input)) return input

  let cachedPrompt: string | null = null
  try {
    cachedPrompt = await getOpenCodeCodexPrompt()
  } catch {
  }

  return filterOpenCodeSystemPromptsWithCachedPrompt(input, cachedPrompt)
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

  const isGpt52Codex =
    normalizedName.includes("gpt-5.2-codex") ||
    normalizedName.includes("gpt 5.2 codex")

  const isGpt52General =
    (normalizedName.includes("gpt-5.2") || normalizedName.includes("gpt 5.2")) &&
    !isGpt52Codex
  const isCodexMax =
    normalizedName.includes("codex-max") ||
    normalizedName.includes("codex max")
  const isCodexMini =
    normalizedName.includes("codex-mini") ||
    normalizedName.includes("codex mini") ||
    normalizedName.includes("codex_mini") ||
    normalizedName.includes("codex-mini-latest")
  const isCodex = normalizedName.includes("codex") && !isCodexMini
  const isLightweight =
    !isCodexMini &&
    (normalizedName.includes("nano") || normalizedName.includes("mini"))

  const isGpt51General =
    (normalizedName.includes("gpt-5.1") || normalizedName.includes("gpt 5.1")) &&
    !isCodex &&
    !isCodexMax &&
    !isCodexMini

  const supportsXhigh = isGpt52General || isGpt52Codex || isCodexMax
  const supportsNone = isGpt52General || isGpt51General

  const defaultEffort: ReasoningConfig["effort"] = isCodexMini
    ? "medium"
    : supportsXhigh
      ? "high"
      : isLightweight
        ? "minimal"
        : "medium"

  let effort = userConfig.reasoningEffort || defaultEffort

  if (isCodexMini) {
    if (effort === "minimal" || effort === "low" || effort === "none") {
      effort = "medium"
    }
    if (effort === "xhigh") {
      effort = "high"
    }
    if (effort !== "high" && effort !== "medium") {
      effort = "medium"
    }
  }

  if (!supportsXhigh && effort === "xhigh") {
    effort = "high"
  }

  if (!supportsNone && effort === "none") {
    effort = "low"
  }

  if (isCodex && effort === "minimal") {
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
  body.store = false
  body.stream = true
  body.instructions = codexInstructions

  if (body.input && Array.isArray(body.input)) {
    const originalIds = body.input
      .filter((item) => item.id)
      .map((item) => item.id)
    if (originalIds.length > 0) {
      logDebug("Filtering message IDs", originalIds)
    }

    body.input = filterInput(body.input)

    const remainingIds = (body.input || [])
      .filter((item) => item.id)
      .map((item) => item.id)
    if (remainingIds.length > 0) {
      logWarn("IDs still present after filtering", remainingIds)
    }

    body.input = await filterOpenCodeSystemPrompts(body.input)
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

/**
 * @file provider.ts
 * @input  Provider settings (apiKey, baseURL, headers)
 * @output Multi-provider language model factory (OpenAI/Anthropic/Google)
 * @pos    Core provider - routes model requests to appropriate SDK
 *
 * 📌 On change: Update this header + README.md file index
 */

import type { LanguageModelV2 } from "@ai-sdk/provider"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { FetchFunction } from "@ai-sdk/provider-utils"

export type AicodewithProviderSettings = {
  apiKey?: string
  baseURL?: string
  headers?: Record<string, string>
  fetch?: FetchFunction
  anthropic?: {
    apiKey?: string
    baseURL?: string
    headers?: Record<string, string>
  }
  google?: {
    apiKey?: string
    baseURL?: string
    headers?: Record<string, string>
  }
}

export interface AicodewithProvider {
  (modelId: string): LanguageModelV2
  chat(modelId: string): LanguageModelV2
  responses(modelId: string): LanguageModelV2
  languageModel(modelId: string): LanguageModelV2
}

const isClaude = (modelId: string) => modelId.startsWith("claude-")
const isGemini = (modelId: string) => modelId.startsWith("gemini-")
const isResponses = (modelId: string) => modelId.startsWith("gpt-") || modelId.startsWith("codex")

const normalizeModelId = (modelId: string) => String(modelId).trim()

export function createAicodewith(options: AicodewithProviderSettings = {}): AicodewithProvider {
  const openai = createOpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    headers: options.headers,
    fetch: options.fetch,
  })

  const openaiLanguageModel =
    typeof openai.languageModel === "function" ? openai.languageModel : openai.chat
  const openaiChatModel = typeof openai.chat === "function" ? openai.chat : openaiLanguageModel

  const anthropic = createAnthropic({
    apiKey: options.anthropic?.apiKey ?? options.apiKey,
    baseURL: options.anthropic?.baseURL,
    headers: options.anthropic?.headers ?? options.headers,
    fetch: options.fetch,
  })

  const google = createGoogleGenerativeAI({
    // Always pass apiKey to prevent SDK from reading GOOGLE_API_KEY env var
    // The actual key is set in the fetch hook (index.ts)
    apiKey: options.google?.apiKey ?? options.apiKey ?? "placeholder-key-replaced-by-fetch-hook",
    baseURL: options.google?.baseURL,
    headers: options.google?.headers ?? options.headers,
    fetch: options.fetch,
  })

  const createModel = (modelId: string) => {
    const id = normalizeModelId(modelId)
    if (isClaude(id)) return anthropic.languageModel(id)
    if (isGemini(id)) return google.languageModel(id)
    if (isResponses(id) && typeof openai.responses === "function") return openai.responses(id)
    return openaiLanguageModel(id)
  }

  const provider = ((modelId: string) => createModel(modelId)) as AicodewithProvider
  provider.languageModel = createModel
  provider.chat = (modelId: string) => {
    const id = normalizeModelId(modelId)
    if (isClaude(id)) return anthropic.languageModel(id)
    if (isGemini(id)) return google.languageModel(id)
    return openaiChatModel(id)
  }
  provider.responses = (modelId: string) => {
    const id = normalizeModelId(modelId)
    if (isClaude(id) || isGemini(id)) return provider.chat(id)
    return openai.responses(id)
  }

  return provider
}

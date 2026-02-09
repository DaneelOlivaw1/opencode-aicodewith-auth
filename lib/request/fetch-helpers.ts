/**
 * @file fetch-helpers.ts
 * @input  Raw request, API key, RequestInit
 * @output Transformed headers, URL extraction, response handlers
 * @pos    Request layer entry - coordinates transformation and response handling
 *
 * 📌 On change: Update this header + lib/request/ARCHITECTURE.md
 */

import { HEADER_NAMES, ORIGINATOR, USER_AGENT } from "../constants"
import { logRequest } from "../logger"
import { getCodexInstructions } from "../prompts/codex"
import type { RequestBody } from "../types"
import { transformRequestBody, normalizeModel } from "./request-transformer"
import { convertSseToJson, ensureContentType } from "./response-handler"

export function extractRequestUrl(input: Request | string | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  return input.url
}

export async function transformRequestForCodex(
  init?: RequestInit,
): Promise<{ body: RequestBody; updatedInit: RequestInit } | undefined> {
  if (!init?.body || typeof init.body !== "string") return undefined

  try {
    const body = JSON.parse(init.body as string) as RequestBody
    const normalizedModel = normalizeModel(body.model)
    const codexInstructions = getCodexInstructions(normalizedModel)
    const transformedBody = await transformRequestBody(
      body,
      codexInstructions,
    )

    logRequest("after-transform", {
      model: transformedBody.model,
      hasTools: !!transformedBody.tools,
      hasInput: !!transformedBody.input,
    })

    return {
      body: transformedBody,
      updatedInit: { ...init, body: JSON.stringify(transformedBody) },
    }
  } catch {
    return undefined
  }
}

export function createAicodewithHeaders(
  init: RequestInit | undefined,
  apiKey: string,
  opts?: { promptCacheKey?: string },
): Headers {
  const headers = new Headers(init?.headers ?? {})

  headers.delete(HEADER_NAMES.OPENAI_BETA)
  headers.delete(HEADER_NAMES.CHATGPT_ACCOUNT_ID)
  headers.delete("x-api-key")

  headers.set(HEADER_NAMES.AUTHORIZATION, `Bearer ${apiKey}`)
  headers.set(HEADER_NAMES.ORIGINATOR, ORIGINATOR)
  headers.set(HEADER_NAMES.USER_AGENT, USER_AGENT)
  headers.set(HEADER_NAMES.ACCEPT, "text/event-stream")

  if (!headers.has(HEADER_NAMES.CONTENT_TYPE)) {
    headers.set(HEADER_NAMES.CONTENT_TYPE, "application/json")
  }

  const cacheKey = opts?.promptCacheKey
  if (cacheKey) {
    headers.set(HEADER_NAMES.CONVERSATION_ID, cacheKey)
    headers.set(HEADER_NAMES.SESSION_ID, cacheKey)
  } else {
    headers.delete(HEADER_NAMES.CONVERSATION_ID)
    headers.delete(HEADER_NAMES.SESSION_ID)
  }

  return headers
}

export async function handleErrorResponse(response: Response): Promise<Response> {
  logRequest("error-response", {
    status: response.status,
    statusText: response.statusText,
  })
  return response
}

export async function handleSuccessResponse(
  response: Response,
  isStreaming: boolean,
): Promise<Response> {
  const responseHeaders = ensureContentType(response.headers)

  if (!isStreaming) {
    return await convertSseToJson(response, responseHeaders)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

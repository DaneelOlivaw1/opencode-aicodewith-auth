import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http"
import { transformRequestForCodex, sanitizeRequestBody } from "../../lib/request/fetch-helpers"

function buildRealisticRequestBody() {
  return {
    model: "aicodewith/gpt-5.3-codex",
    previousResponseId: "resp_0bc3ff660dbeaab501698af7fcb53c8197b7887c4b7663f20d",
    previous_response_id: "resp_0bc3ff660dbeaab501698af7fcb53c8197b7887c4b7663f20d",
    store: false,
    stream: true,
    max_output_tokens: 32000,
    input: [
      {
        type: "message",
        role: "developer",
        content: [{ type: "input_text", text: "You are a helpful coding assistant." }],
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "What did we do so far?" }],
      },
      {
        type: "item_reference",
        id: "msg_0bc3ff660dbeaab501698af7fcb53c8197b7887c4b7663f20d",
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Continue if you have next steps" }],
      },
      {
        type: "item_reference",
        id: "msg_062420f006f4f47201698af8acf180819186b552452948a2c0",
      },
      {
        type: "function_call",
        id: "fc_abc123",
        call_id: "call_abc123",
        name: "read_file",
        arguments: '{"path":"index.ts"}',
      },
      {
        type: "function_call_output",
        call_id: "call_abc123",
        output: "file contents here",
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Now fix the bug" }],
      },
    ],
    tools: [
      { type: "function", name: "read_file", description: "Read a file", parameters: {} },
    ],
  }
}

function assertCleanBody(body: Record<string, unknown>, label: string) {
  expect(body.previousResponseId, `${label}: previousResponseId should be removed`).toBeUndefined()
  expect(body.previous_response_id, `${label}: previous_response_id should be removed`).toBeUndefined()

  if (Array.isArray(body.input)) {
    const itemRefs = body.input.filter((item: any) => item.type === "item_reference")
    expect(itemRefs, `${label}: item_reference entries should be removed`).toHaveLength(0)
  }
}

describe("E2E: item_reference sanitization", () => {
  describe("transformRequestForCodex — full pipeline", () => {
    it("strips item_reference and previousResponseId from a realistic multi-turn request", async () => {
      const body = buildRealisticRequestBody()
      const init: RequestInit = {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }

      const result = await transformRequestForCodex(init)

      expect(result).toBeDefined()
      const transformed = JSON.parse(result!.updatedInit.body as string)

      assertCleanBody(transformed, "transformRequestForCodex")

      const funcCall = transformed.input?.find((item: any) => item.type === "function_call")
      expect(funcCall, "function_call should be preserved").toBeDefined()
      expect(funcCall?.id, "function_call id should be stripped in stateless mode").toBeUndefined()
      expect(funcCall?.call_id, "function_call call_id should be preserved").toBe("call_abc123")

      const messages = transformed.input?.filter((item: any) => item.type === "message")
      for (const msg of messages ?? []) {
        expect(msg.id, "message items should not have id").toBeUndefined()
      }
    })

    it("strips item_reference when there are many (10+) item_references", async () => {
      const body = buildRealisticRequestBody()
      for (let i = 0; i < 10; i++) {
        body.input.push({
          type: "item_reference",
          id: `msg_extra_${i}_${"a".repeat(40)}`,
        } as any)
      }

      const init: RequestInit = {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }

      const result = await transformRequestForCodex(init)
      expect(result).toBeDefined()
      const transformed = JSON.parse(result!.updatedInit.body as string)
      assertCleanBody(transformed, "many item_references")
    })
  })

  describe("sanitizeRequestBody — safety-net fallback", () => {
    it("strips item_reference and previousResponseId as a standalone fallback", () => {
      const body = buildRealisticRequestBody()
      const sanitized = JSON.parse(sanitizeRequestBody(JSON.stringify(body)))

      assertCleanBody(sanitized, "sanitizeRequestBody")
    })

    it("preserves all other fields when sanitizing", () => {
      const body = buildRealisticRequestBody()
      const sanitized = JSON.parse(sanitizeRequestBody(JSON.stringify(body)))

      expect(sanitized.model).toBe("aicodewith/gpt-5.3-codex")
      expect(sanitized.store).toBe(false)
      expect(sanitized.stream).toBe(true)
      expect(sanitized.tools).toHaveLength(1)
      const messages = sanitized.input.filter((item: any) => item.type === "message")
      expect(messages.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe("mock upstream server — wire-level verification", () => {
    let server: Server
    let serverPort: number
    let capturedBodies: string[]

    beforeEach(async () => {
      capturedBodies = []

      server = createServer((req: IncomingMessage, res: ServerResponse) => {
        let body = ""
        req.on("data", (chunk: Buffer) => { body += chunk.toString() })
        req.on("end", () => {
          capturedBodies.push(body)
          res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8" })
          res.write('data: {"type":"response.done","response":{"id":"resp_test","output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"ok"}]}]}}\n\n')
          res.end()
        })
      })

      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address()
          if (addr && typeof addr === "object") {
            serverPort = addr.port
          }
          resolve()
        })
      })
    })

    afterEach(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    })

    it("sends a clean body over the wire (no item_reference, no previousResponseId)", async () => {
      const body = buildRealisticRequestBody()
      const init: RequestInit = {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }

      const result = await transformRequestForCodex(init)
      expect(result).toBeDefined()

      const targetUrl = `http://127.0.0.1:${serverPort}/v1/responses`
      await fetch(targetUrl, {
        ...result!.updatedInit,
        headers: { "content-type": "application/json", authorization: "Bearer test-key" },
      })

      expect(capturedBodies).toHaveLength(1)
      const received = JSON.parse(capturedBodies[0])

      assertCleanBody(received, "wire-level")

      expect(capturedBodies[0]).not.toContain('"item_reference"')
      expect(capturedBodies[0]).not.toContain('"previousResponseId"')
      expect(capturedBodies[0]).not.toContain('"previous_response_id"')
    })

    it("safety-net sends clean body even when transformation would fail", async () => {
      const body = buildRealisticRequestBody()
      const bodyStr = JSON.stringify(body)

      const sanitized = sanitizeRequestBody(bodyStr)

      const targetUrl = `http://127.0.0.1:${serverPort}/v1/responses`
      await fetch(targetUrl, {
        method: "POST",
        body: sanitized,
        headers: { "content-type": "application/json", authorization: "Bearer test-key" },
      })

      expect(capturedBodies).toHaveLength(1)
      const received = JSON.parse(capturedBodies[0])

      assertCleanBody(received, "safety-net wire-level")
      expect(capturedBodies[0]).not.toContain('"item_reference"')
      expect(capturedBodies[0]).not.toContain('"previousResponseId"')
    })
  })

  describe("edge cases", () => {
    it("handles request with only item_references in input (no real messages)", async () => {
      const body = {
        model: "aicodewith/gpt-5.3-codex",
        previousResponseId: "resp_123",
        input: [
          { type: "item_reference", id: "msg_1" },
          { type: "item_reference", id: "msg_2" },
        ],
        tools: [],
      }

      const init: RequestInit = {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }

      const result = await transformRequestForCodex(init)
      expect(result).toBeDefined()
      const transformed = JSON.parse(result!.updatedInit.body as string)

      assertCleanBody(transformed, "only item_references")
    })

    it("handles request with empty input array", async () => {
      const body = {
        model: "aicodewith/gpt-5.3-codex",
        previousResponseId: "resp_123",
        input: [],
        tools: [],
      }

      const init: RequestInit = {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }

      const result = await transformRequestForCodex(init)
      expect(result).toBeDefined()
      const transformed = JSON.parse(result!.updatedInit.body as string)

      assertCleanBody(transformed, "empty input")
    })

    it("handles request with no input field at all", async () => {
      const body = {
        model: "aicodewith/gpt-5.3-codex",
        previousResponseId: "resp_123",
        tools: [],
      }

      const init: RequestInit = {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }

      const result = await transformRequestForCodex(init)
      expect(result).toBeDefined()
      const transformed = JSON.parse(result!.updatedInit.body as string)

      assertCleanBody(transformed, "no input field")
    })

    it("handles item_reference mixed with various item types", async () => {
      const body = {
        model: "aicodewith/gpt-5.3-codex",
        previousResponseId: "resp_123",
        input: [
          { type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] },
          { type: "item_reference", id: "msg_1" },
          { type: "function_call", id: "fc_1", call_id: "call_1", name: "test", arguments: "{}" },
          { type: "item_reference", id: "msg_2" },
          { type: "function_call_output", call_id: "call_1", output: "result" },
          { type: "item_reference", id: "msg_3" },
          { type: "message", role: "assistant", content: [{ type: "output_text", text: "done" }] },
        ],
        tools: [{ type: "function", name: "test", description: "test", parameters: {} }],
      }

      const init: RequestInit = {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }

      const result = await transformRequestForCodex(init)
      expect(result).toBeDefined()
      const transformed = JSON.parse(result!.updatedInit.body as string)

      assertCleanBody(transformed, "mixed item types")

      const types = transformed.input.map((item: any) => item.type)
      expect(types).not.toContain("item_reference")
      expect(types).toContain("function_call")
      expect(types).toContain("function_call_output")
    })
  })
})

import { describe, it, expect } from "vitest"
import {
  transformClaudeRequest,
  transformClaudeResponse,
} from "../../lib/request/claude-tools-transform"

const CLAUDE_USER_ID = "user_7b18c0b8358639d7ff4cdbf78a1552a7d5ca63ba83aee236c4b22ae2be77ba5f_account_3bb3dcbe-4efe-4795-b248-b73603575290_session_4a72737c-93d6-4c45-aebe-6e2d47281338"

describe("transformClaudeRequest", () => {
  describe("with no body", () => {
    it("returns init unchanged when body is undefined", () => {
      const init: RequestInit = { method: "POST" }
      expect(transformClaudeRequest(init)).toEqual(init)
    })

    it("returns init unchanged when body is not a string", () => {
      const body = new Blob(["test"])
      const init: RequestInit = { method: "POST", body }
      expect(transformClaudeRequest(init)).toEqual(init)
    })

    it("returns undefined when init is undefined", () => {
      expect(transformClaudeRequest(undefined)).toBeUndefined()
    })
  })

  describe("metadata user_id injection", () => {
    it("injects user_id when metadata does not exist", () => {
      const init: RequestInit = {
        body: JSON.stringify({ messages: [] }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.metadata.user_id).toBe(CLAUDE_USER_ID)
    })

    it("injects user_id when metadata exists but user_id is missing", () => {
      const init: RequestInit = {
        body: JSON.stringify({ metadata: { other: "value" } }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.metadata.user_id).toBe(CLAUDE_USER_ID)
      expect(parsed.metadata.other).toBe("value")
    })

    it("does not override existing user_id", () => {
      const existingId = "existing-id"
      const init: RequestInit = {
        body: JSON.stringify({ metadata: { user_id: existingId } }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.metadata.user_id).toBe(existingId)
    })
  })

  describe("tools name transformation", () => {
    it("adds mcp_ prefix to tool names in tools array", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          tools: [
            { name: "bash", type: "bash" },
            { name: "python", type: "python" },
          ],
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.tools[0].name).toBe("mcp_bash")
      expect(parsed.tools[1].name).toBe("mcp_python")
    })

    it("handles tools with missing name gracefully", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          tools: [{ type: "bash" }, { name: "python", type: "python" }],
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.tools[0]).toEqual({ type: "bash" })
      expect(parsed.tools[1].name).toBe("mcp_python")
    })

    it("preserves other tool properties when adding prefix", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          tools: [
            {
              name: "bash",
              type: "bash",
              description: "Run bash commands",
              input_schema: { type: "object" },
            },
          ],
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.tools[0].name).toBe("mcp_bash")
      expect(parsed.tools[0].type).toBe("bash")
      expect(parsed.tools[0].description).toBe("Run bash commands")
      expect(parsed.tools[0].input_schema).toEqual({ type: "object" })
    })
  })

  describe("tool_use content block transformation", () => {
    it("adds mcp_ prefix to tool_use block names in messages", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          messages: [
            {
              role: "assistant",
              content: [
                { type: "tool_use", name: "bash", id: "call_1" },
                { type: "text", text: "calling bash" },
              ],
            },
          ],
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.messages[0].content[0].name).toBe("mcp_bash")
      expect(parsed.messages[0].content[1].type).toBe("text")
    })

    it("handles multiple tool_use blocks in a single message", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          messages: [
            {
              role: "assistant",
              content: [
                { type: "tool_use", name: "bash", id: "call_1" },
                { type: "tool_use", name: "python", id: "call_2" },
              ],
            },
          ],
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.messages[0].content[0].name).toBe("mcp_bash")
      expect(parsed.messages[0].content[1].name).toBe("mcp_python")
    })

    it("handles messages without content gracefully", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          messages: [{ role: "user" }, { role: "assistant", content: [] }],
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.messages[0]).toEqual({ role: "user" })
      expect(parsed.messages[1].content).toEqual([])
    })

    it("preserves other content block properties", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          messages: [
            {
              role: "assistant",
              content: [
                {
                  type: "tool_use",
                  name: "bash",
                  id: "call_1",
                  input: { command: "ls" },
                },
              ],
            },
          ],
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.messages[0].content[0].name).toBe("mcp_bash")
      expect(parsed.messages[0].content[0].id).toBe("call_1")
      expect(parsed.messages[0].content[0].input).toEqual({ command: "ls" })
    })
  })

  describe("combined transformations", () => {
    it("applies all transformations together", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          model: "claude-opus",
          tools: [{ name: "bash", type: "bash" }],
          messages: [
            {
              role: "assistant",
              content: [{ type: "tool_use", name: "python", id: "call_1" }],
            },
          ],
          metadata: { other: "data" },
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toBeDefined()
      const parsed = JSON.parse(result!.body as string)
      expect(parsed.metadata.user_id).toBe(CLAUDE_USER_ID)
      expect(parsed.metadata.other).toBe("data")
      expect(parsed.tools[0].name).toBe("mcp_bash")
      expect(parsed.messages[0].content[0].name).toBe("mcp_python")
    })
  })

  describe("invalid JSON handling", () => {
    it("returns original init when JSON parsing fails", () => {
      const init: RequestInit = {
        body: "not valid json",
      }
      const result = transformClaudeRequest(init)
      expect(result).toEqual(init)
    })
  })

  describe("no modification cases", () => {
    it("returns original init when no transformations needed", () => {
      const init: RequestInit = {
        body: JSON.stringify({
          model: "claude-opus",
          metadata: { user_id: "existing-id" },
        }),
      }
      const result = transformClaudeRequest(init)
      expect(result).toEqual(init)
    })
  })
})

describe("transformClaudeResponse", () => {
  describe("with no body", () => {
    it("returns response unchanged when body is null", () => {
      const response = new Response(null, { status: 200 })
      const result = transformClaudeResponse(response)
      expect(result).toEqual(response)
    })
  })

  describe("error responses (non-2xx)", () => {
    it("returns 400 error response unchanged", async () => {
      const errorBody = JSON.stringify({
        error: {
          type: "invalid_request_error",
          message: "Invalid request",
        },
      })
      const response = new Response(errorBody, { status: 400 })
      const result = transformClaudeResponse(response)
      expect(result.status).toBe(400)
      expect(await result.text()).toBe(errorBody)
    })

    it("returns 500 error response unchanged", async () => {
      const errorBody = JSON.stringify({
        error: {
          type: "internal_error",
          message: "Internal server error",
        },
      })
      const response = new Response(errorBody, { status: 500 })
      const result = transformClaudeResponse(response)
      expect(result.status).toBe(500)
      expect(await result.text()).toBe(errorBody)
    })

    it("does not strip mcp_ prefix from error responses even if body contains mcp_", async () => {
      const errorBody = JSON.stringify({
        error: {
          message: "Tool mcp_bash not found",
        },
      })
      const response = new Response(errorBody, { status: 400 })
      const result = transformClaudeResponse(response)
      expect(await result.text()).toBe(errorBody)
    })

    it("returns 403 forbidden unchanged", async () => {
      const errorBody = JSON.stringify({
        error: { message: "Forbidden" },
      })
      const response = new Response(errorBody, { status: 403 })
      const result = transformClaudeResponse(response)
      expect(result.status).toBe(403)
      expect(await result.text()).toBe(errorBody)
    })
  })

  describe("success responses (2xx)", () => {
    it("strips mcp_ prefix from tool names in 200 response", async () => {
      const responseBody = JSON.stringify({
        id: "msg_123",
        content: [{ type: "tool_use", name: "mcp_bash", id: "call_1" }],
      })
      const response = new Response(responseBody, { status: 200 })
      const result = transformClaudeResponse(response)
      expect(result.status).toBe(200)
      const text = await result.text()
      expect(text).toContain('"name": "bash"')
      expect(text).not.toContain("mcp_bash")
    })

    it("strips mcp_ prefix with whitespace variations", async () => {
      const responseBody = `"name":"mcp_python"` // No space after colon
      const response = new Response(responseBody, { status: 200 })
      const result = transformClaudeResponse(response)
      const text = await result.text()
      expect(text).toContain('"name": "python"')
    })

    it("strips mcp_ prefix with multiple spaces", async () => {
      const responseBody = `"name"  :  "mcp_bash"` // Multiple spaces
      const response = new Response(responseBody, { status: 200 })
      const result = transformClaudeResponse(response)
      const text = await result.text()
      expect(text).toContain('"name"')
      expect(text).toContain('"bash"')
      expect(text).not.toContain("mcp_bash")
    })

    it("strips mcp_ prefix from multiple tool names in response", async () => {
      const responseBody = JSON.stringify({
        id: "msg_123",
        content: [
          { type: "tool_use", name: "mcp_bash", id: "call_1" },
          { type: "tool_use", name: "mcp_python", id: "call_2" },
        ],
      })
      const response = new Response(responseBody, { status: 200 })
      const result = transformClaudeResponse(response)
      const text = await result.text()
      expect(text).toContain('"name": "bash"')
      expect(text).toContain('"name": "python"')
      expect(text).not.toContain("mcp_")
    })

    it("leaves tool names without mcp_ prefix unchanged", async () => {
      const responseBody = JSON.stringify({
        id: "msg_123",
        content: [{ type: "tool_use", name: "bash", id: "call_1" }],
      })
      const response = new Response(responseBody, { status: 200 })
      const result = transformClaudeResponse(response)
      const text = await result.text()
      expect(text).toContain('"name":"bash"')
    })
  })

  describe("streaming responses", () => {
    it("handles streaming with server-sent events format", async () => {
      const chunk1 = 'event: content_block_start\ndata: {"type":"content_block","index":0,"content_block":{"type":"tool_use","name":"mcp_bash"}}\n\n'
      const chunk2 = 'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"command\\""}}\n\n'
      const responseBody = chunk1 + chunk2
      const response = new Response(responseBody, { status: 200 })
      const result = transformClaudeResponse(response)
      const text = await result.text()
      expect(text).toContain('"name": "bash"')
      expect(text).not.toContain("mcp_bash")
    })
  })

  describe("response headers preservation", () => {
    it("preserves response headers", async () => {
      const headers = new Headers({
        "content-type": "application/json",
        "x-custom": "value",
      })
      const response = new Response('{"name":"mcp_test"}', {
        status: 200,
        headers,
      })
      const result = transformClaudeResponse(response)
      expect(result.headers.get("content-type")).toBe("application/json")
      expect(result.headers.get("x-custom")).toBe("value")
    })

    it("preserves status text", async () => {
      const response = new Response('{"name":"mcp_test"}', {
        status: 201,
        statusText: "Created",
      })
      const result = transformClaudeResponse(response)
      expect(result.statusText).toBe("Created")
    })
  })

  describe("edge cases", () => {
    it("handles response with mcp_ in non-name context", async () => {
      const responseBody = JSON.stringify({
        id: "msg_123",
        description: "This tool uses mcp_ prefix",
        content: [{ type: "text", text: "mcp_bash is a tool" }],
      })
      const response = new Response(responseBody, { status: 200 })
      const result = transformClaudeResponse(response)
      const text = await result.text()
      // Should not modify mcp_ outside of "name": "mcp_..." pattern
      expect(text).toContain("mcp_ prefix")
      expect(text).toContain("mcp_bash is a tool")
    })

    it("handles empty response body", async () => {
      const response = new Response("", { status: 200 })
      const result = transformClaudeResponse(response)
      const text = await result.text()
      expect(text).toBe("")
    })

    it("handles response with only status 2xx but empty body", async () => {
      const response = new Response("", { status: 204 })
      const result = transformClaudeResponse(response)
      expect(result.status).toBe(204)
      const text = await result.text()
      expect(text).toBe("")
    })
  })
})

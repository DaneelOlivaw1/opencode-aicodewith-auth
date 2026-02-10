import { describe, it, expect } from "vitest"
import { sanitizeRequestBody } from "../../lib/request/fetch-helpers"

describe("sanitizeRequestBody", () => {
  it("removes item_reference from input array", () => {
    const input = JSON.stringify({
      model: "gpt-5.3-codex",
      input: [
        { role: "user", content: "hi" },
        { type: "item_reference", id: "msg_123" },
        { role: "user", content: "hello" }
      ]
    })
    const result = JSON.parse(sanitizeRequestBody(input))
    expect(result.input).toHaveLength(2)
    expect(result.input.every((item: any) => item.type !== "item_reference")).toBe(true)
  })

  it("preserves previousResponseId (camelCase) in request body", () => {
    const input = JSON.stringify({
      model: "gpt-5.3-codex",
      previousResponseId: "resp_123",
      input: []
    })
    const result = JSON.parse(sanitizeRequestBody(input))
    expect(result.previousResponseId).toBe("resp_123")
  })

  it("preserves previous_response_id (snake_case) in request body", () => {
    const input = JSON.stringify({
      model: "gpt-5.3-codex",
      previous_response_id: "resp_123",
      input: []
    })
    const result = JSON.parse(sanitizeRequestBody(input))
    expect(result.previous_response_id).toBe("resp_123")
  })

  it("preserves both previousResponseId variants if both present", () => {
    const input = JSON.stringify({
      model: "gpt-5.3-codex",
      previousResponseId: "resp_123",
      previous_response_id: "resp_456",
      input: []
    })
    const result = JSON.parse(sanitizeRequestBody(input))
    expect(result.previousResponseId).toBe("resp_123")
    expect(result.previous_response_id).toBe("resp_456")
  })

  it("returns original string on parse failure", () => {
    const invalid = "not valid json"
    expect(sanitizeRequestBody(invalid)).toBe(invalid)
  })

  it("handles missing input array", () => {
    const input = JSON.stringify({
      model: "gpt-5.3-codex",
      previousResponseId: "resp_123"
    })
    const result = JSON.parse(sanitizeRequestBody(input))
    expect(result.previousResponseId).toBe("resp_123")
    expect(result.input).toBeUndefined()
  })

  it("strips id from non-call items", () => {
    const input = JSON.stringify({
      model: "gpt-5.3-codex",
      input: [
        { role: "user", content: "hi", id: "msg_1" },
        { role: "assistant", content: "hello", id: "msg_2" }
      ]
    })
    const result = JSON.parse(sanitizeRequestBody(input))
    expect(result.input[0].id).toBeUndefined()
    expect(result.input[1].id).toBeUndefined()
  })

  it("strips id from all items including call items in stateless mode", () => {
    const input = JSON.stringify({
      model: "gpt-5.3-codex",
      input: [
        { type: "function_call", id: "call_123", call_id: "fc_1", name: "test" },
        { type: "local_shell_call", id: "call_456", call_id: "ls_1", command: "ls" },
        { type: "custom_tool_call", id: "call_789", call_id: "ct_1", tool: "custom" },
        { role: "user", content: "hi", id: "msg_1" }
      ]
    })
    const result = JSON.parse(sanitizeRequestBody(input))
    expect(result.input[0].id).toBeUndefined()
    expect(result.input[0].call_id).toBe("fc_1")
    expect(result.input[1].id).toBeUndefined()
    expect(result.input[1].call_id).toBe("ls_1")
    expect(result.input[2].id).toBeUndefined()
    expect(result.input[2].call_id).toBe("ct_1")
    expect(result.input[3].id).toBeUndefined()
  })

  it("handles complex real-world request body", () => {
    const input = JSON.stringify({
      model: "gpt-5.3-codex",
      previousResponseId: "resp_123",
      input: [
        { role: "developer", content: "You are a helpful assistant" },
        { role: "user", content: [{ type: "input_text", text: "hi" }] },
        { type: "item_reference", id: "msg_062420f006f4f47201698af8acf180819186b552452948a2c0" },
        { role: "user", content: [{ type: "input_text", text: "hello" }] }
      ],
      store: false,
      tools: []
    })
    const result = JSON.parse(sanitizeRequestBody(input))
    expect(result.previousResponseId).toBe("resp_123")
    expect(result.input).toHaveLength(3)
    expect(result.input.every((item: any) => item.type !== "item_reference")).toBe(true)
    expect(result.store).toBe(false)
    expect(result.tools).toEqual([])
  })
})

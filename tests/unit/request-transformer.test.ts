import { describe, it, expect } from "vitest"
import { 
  normalizeModel, 
  getReasoningConfig,
  addCodexBridgeMessage,
  sanitizeItemIds,
  transformRequestBody,
} from "../../lib/request/request-transformer"

describe("normalizeModel", () => {
  describe("GPT-5.3 Codex models", () => {
    it("normalizes gpt-5.3-codex variants", () => {
      expect(normalizeModel("gpt-5.3-codex")).toBe("gpt-5.3-codex")
      expect(normalizeModel("GPT-5.3-CODEX")).toBe("gpt-5.3-codex")
      expect(normalizeModel("gpt 5.3 codex")).toBe("gpt-5.3-codex")
    })
  })

  describe("GPT-5.2 models", () => {
    it("normalizes gpt-5.2 base model", () => {
      expect(normalizeModel("gpt-5.2")).toBe("gpt-5.2")
      expect(normalizeModel("GPT-5.2")).toBe("gpt-5.2")
      expect(normalizeModel("gpt 5.2")).toBe("gpt-5.2")
    })
  })

  describe("provider prefix handling", () => {
    it("strips aicodewith/ prefix", () => {
      expect(normalizeModel("aicodewith/gpt-5.3-codex")).toBe("gpt-5.3-codex")
      expect(normalizeModel("aicodewith/gpt-5.2")).toBe("gpt-5.2")
    })

    it("strips other provider prefixes", () => {
      expect(normalizeModel("openai/gpt-5.2")).toBe("gpt-5.2")
    })
  })

  describe("fallback behavior", () => {
    it("returns gpt-5.3-codex for undefined", () => {
      expect(normalizeModel(undefined)).toBe("gpt-5.3-codex")
    })

    it("returns gpt-5.3-codex for generic codex", () => {
      expect(normalizeModel("codex")).toBe("gpt-5.3-codex")
    })
  })
})

describe("getReasoningConfig", () => {
  describe("default effort levels", () => {
    it("returns high for gpt-5.3-codex", () => {
      const config = getReasoningConfig("gpt-5.3-codex")
      expect(config.effort).toBe("high")
    })

    it("returns high for gpt-5.2", () => {
      const config = getReasoningConfig("gpt-5.2")
      expect(config.effort).toBe("high")
    })
  })

  describe("user config overrides", () => {
    it("respects user reasoningEffort", () => {
      const config = getReasoningConfig("gpt-5.2", { reasoningEffort: "low" })
      expect(config.effort).toBe("low")
    })

    it("respects user reasoningSummary", () => {
      const config = getReasoningConfig("gpt-5.2", { reasoningSummary: "detailed" })
      expect(config.summary).toBe("detailed")
    })
  })

  describe("effort level constraints", () => {
    it("allows xhigh for gpt-5.2", () => {
      const config = getReasoningConfig("gpt-5.2", { reasoningEffort: "xhigh" })
      expect(config.effort).toBe("xhigh")
    })

    it("allows xhigh for gpt-5.3-codex", () => {
      const config = getReasoningConfig("gpt-5.3-codex", { reasoningEffort: "xhigh" })
      expect(config.effort).toBe("xhigh")
    })

    it("allows none for gpt-5.2", () => {
      const config = getReasoningConfig("gpt-5.2", { reasoningEffort: "none" })
      expect(config.effort).toBe("none")
    })
  })

  describe("default summary", () => {
    it("defaults to auto", () => {
      const config = getReasoningConfig("gpt-5.2")
      expect(config.summary).toBe("auto")
    })
  })
})

describe("sanitizeItemIds", () => {
  it("filters out item_reference type items", () => {
    const input = [
      { type: "message", role: "user", content: "hello" },
      { type: "item_reference", role: "system" },
      { type: "message", role: "assistant", content: "hi" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe("message")
    expect(result[1].type).toBe("message")
  })

  it("strips id from function_call without matching function_call_output", () => {
    const input = [
      { id: "msg-1", type: "function_call", call_id: "call-1", name: "test" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(1)
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].type).toBe("function_call")
    expect(result[0].call_id).toBe("call-1")
  })

  it("strips id from function_call even with matching function_call_output (stateless mode)", () => {
    const input = [
      { id: "msg-1", type: "function_call", call_id: "call-1", name: "test" },
      { type: "function_call_output", call_id: "call-1", output: "result" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(2)
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].type).toBe("function_call")
    expect(result[0].call_id).toBe("call-1")
  })

  it("strips id from local_shell_call even with matching output (stateless mode)", () => {
    const input = [
      { id: "msg-2", type: "local_shell_call", call_id: "call-2", command: "ls" },
      { type: "local_shell_call_output", call_id: "call-2", output: "files" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(2)
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].type).toBe("local_shell_call")
    expect(result[0].call_id).toBe("call-2")
  })

  it("strips id from custom_tool_call even with matching output (stateless mode)", () => {
    const input = [
      { id: "msg-3", type: "custom_tool_call", call_id: "call-3", tool: "custom" },
      { type: "custom_tool_call_output", call_id: "call-3", output: "data" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(2)
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].type).toBe("custom_tool_call")
    expect(result[0].call_id).toBe("call-3")
  })

  it("passes through items without id field unchanged", () => {
    const input = [
      { type: "message", role: "user", content: "hello" },
      { type: "message", role: "assistant", content: "hi" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(input[0])
    expect(result[1]).toEqual(input[1])
  })

  it("handles empty input array", () => {
    const input: any[] = []
    const result = sanitizeItemIds(input)
    expect(result).toHaveLength(0)
  })

  it("handles mixed items - strips all IDs in stateless mode", () => {
    const input = [
      { id: "msg-1", type: "function_call", call_id: "call-1", name: "test1" },
      { id: "msg-2", type: "function_call", call_id: "call-2", name: "test2" },
      { type: "function_call_output", call_id: "call-1", output: "result1" },
      { type: "message", role: "user", content: "hello" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(4)
    // All IDs stripped in stateless mode
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].type).toBe("function_call")
    expect(result[0].call_id).toBe("call-1")
    expect(result[1]).not.toHaveProperty("id")
    expect(result[1].type).toBe("function_call")
    expect(result[1].call_id).toBe("call-2")
    // Output preserved
    expect(result[2].type).toBe("function_call_output")
    // Message unchanged
    expect(result[3]).toEqual(input[3])
  })

  it("handles call_id with whitespace by trimming", () => {
    const input = [
      { id: "msg-1", type: "function_call", call_id: " call-1 ", name: "test" },
      { type: "function_call_output", call_id: "call-1", output: "result" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(2)
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].call_id).toBe(" call-1 ")
  })

  it("strips id from message item", () => {
    const input = [
      { id: "msg-0c4cb61177bb", type: "message", role: "user", content: "hello" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(1)
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].type).toBe("message")
    expect(result[0].role).toBe("user")
    expect(result[0].content).toBe("hello")
  })

  it("strips id from reasoning item", () => {
    const input = [
      { id: "reasoning-123", type: "reasoning", thinking: "let me think about this" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(1)
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].type).toBe("reasoning")
    expect(result[0].thinking).toBe("let me think about this")
  })

  it("strips id from both message and function_call in stateless mode", () => {
    const input = [
      { id: "msg-1", type: "message", role: "user", content: "call a function" },
      { id: "call-1", type: "function_call", call_id: "call-1", name: "test" },
      { type: "function_call_output", call_id: "call-1", output: "result" },
    ]
    const result = sanitizeItemIds(input as any)
    expect(result).toHaveLength(3)
    expect(result[0]).not.toHaveProperty("id")
    expect(result[0].type).toBe("message")
    expect(result[1]).not.toHaveProperty("id")
    expect(result[1].type).toBe("function_call")
    expect(result[1].call_id).toBe("call-1")
    expect(result[2].type).toBe("function_call_output")
  })
})

describe("transformRequestBody", () => {
  describe("store field behavior", () => {
    it("sets store to false in output body", async () => {
      const body = {
        model: "gpt-5.3-codex",
        input: [],
      }
      const result = await transformRequestBody(body as any, "test instructions")
      expect(result.store).toBe(false)
    })

    it("sets store to false even if input body has store: true", async () => {
      const body = {
        model: "gpt-5.3-codex",
        input: [],
        store: true,
      }
      const result = await transformRequestBody(body as any, "test instructions")
      expect(result.store).toBe(false)
    })

    it("sets store to false even if input body has no store field", async () => {
      const body = {
        model: "gpt-5.3-codex",
        input: [],
      }
      const result = await transformRequestBody(body as any, "test instructions")
      expect(result.store).toBe(false)
    })
  })

  describe("previousResponseId preservation", () => {
    it("preserves previousResponseId (camelCase) in request body", async () => {
      const body = {
        model: "gpt-5.3-codex",
        input: [],
        previousResponseId: "response-123",
      }
      const result = await transformRequestBody(body as any, "test instructions")
      expect(result.previousResponseId).toBe("response-123")
    })

    it("preserves previous_response_id (snake_case) in request body", async () => {
      const body = {
        model: "gpt-5.3-codex",
        input: [],
        previous_response_id: "response-456",
      }
      const result = await transformRequestBody(body as any, "test instructions")
      expect(result.previous_response_id).toBe("response-456")
    })

    it("preserves both previousResponseId and previous_response_id if both present", async () => {
      const body = {
        model: "gpt-5.3-codex",
        input: [],
        previousResponseId: "response-123",
        previous_response_id: "response-456",
      }
      const result = await transformRequestBody(body as any, "test instructions")
      expect(result.previousResponseId).toBe("response-123")
      expect(result.previous_response_id).toBe("response-456")
    })

    it("preserves other fields alongside previousResponseId", async () => {
      const body = {
        model: "gpt-5.3-codex",
        input: [],
        previousResponseId: "response-123",
        metadata: { key: "value" },
        customField: "test",
      }
      const result = await transformRequestBody(body as any, "test instructions")
      expect(result.previousResponseId).toBe("response-123")
      expect(result.metadata).toEqual({ key: "value" })
      expect(result.customField).toBe("test")
    })
  })
})

describe("addCodexBridgeMessage", () => {
  it("returns undefined for non-array input", () => {
    expect(addCodexBridgeMessage(undefined, true)).toBeUndefined()
  })

  it("returns input unchanged when hasTools is false", () => {
    const input = [{ type: "message", role: "user", content: "hello" }]
    expect(addCodexBridgeMessage(input, false)).toBe(input)
  })

  it("prepends bridge message when hasTools is true", () => {
    const input = [{ type: "message", role: "user", content: "hello" }]
    const result = addCodexBridgeMessage(input, true)
    
    expect(result).toHaveLength(2)
    expect(result?.[0].type).toBe("message")
    expect(result?.[0].role).toBe("developer")
    expect(result?.[1]).toEqual(input[0])
  })
})

import { describe, it, expect } from "vitest"
import { 
  normalizeModel, 
  filterInput, 
  getReasoningConfig,
  addCodexBridgeMessage,
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

describe("filterInput", () => {
  it("returns input unchanged for non-array input", () => {
    expect(filterInput(undefined)).toBeUndefined()
    expect(filterInput(null as any)).toBeNull()
  })

  it("filters out item_reference types", () => {
    const input = [
      { type: "message", role: "user", content: "hello" },
      { type: "item_reference", role: "system" },
      { type: "message", role: "assistant", content: "hi" },
    ]
    const result = filterInput(input)
    expect(result).toHaveLength(2)
    expect(result?.every(item => item.type !== "item_reference")).toBe(true)
  })

  it("removes id field from items", () => {
    const input = [
      { id: "msg-1", type: "message", role: "user", content: "hello" },
      { id: "msg-2", type: "message", role: "assistant", content: "hi" },
    ]
    const result = filterInput(input)
    expect(result?.every(item => !("id" in item))).toBe(true)
  })

  it("preserves other fields", () => {
    const input = [
      { id: "msg-1", type: "message", role: "user", content: "hello", metadata: { key: "value" } },
    ]
    const result = filterInput(input)
    expect(result?.[0]).toEqual({
      type: "message",
      role: "user",
      content: "hello",
      metadata: { key: "value" },
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

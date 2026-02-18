import { describe, it, expect } from "vitest"
import { createAicodewith } from "../../provider"

describe("createAicodewith", () => {
  const provider = createAicodewith({
    apiKey: "test-key",
    baseURL: "https://api.test.com",
  })

  describe("model routing", () => {
    it("routes claude models to anthropic provider", () => {
      const model = provider("claude-opus-4-6-20260205")
      expect(model.modelId).toBe("claude-opus-4-6-20260205")
      expect(model.provider).toBe("anthropic.messages")
    })

    it("routes claude-sonnet to anthropic provider", () => {
      const model = provider("claude-sonnet-4-6")
      expect(model.modelId).toBe("claude-sonnet-4-6")
      expect(model.provider).toBe("anthropic.messages")
    })

    it("routes gemini models to google provider", () => {
      const model = provider("gemini-3-pro")
      expect(model.modelId).toBe("gemini-3-pro")
      expect(model.provider).toBe("google.generative-ai")
    })

    it("routes gpt models to openai responses provider", () => {
      const model = provider("gpt-5.2")
      expect(model.modelId).toBe("gpt-5.2")
      expect(model.provider).toBe("openai.responses")
    })

    it("routes codex models to openai responses provider", () => {
      const model = provider("codex-mini-latest")
      expect(model.modelId).toBe("codex-mini-latest")
      expect(model.provider).toBe("openai.responses")
    })
  })

  describe("provider methods", () => {
    it("exposes languageModel method", () => {
      expect(typeof provider.languageModel).toBe("function")
      const model = provider.languageModel("gpt-5.2")
      expect(model.modelId).toBe("gpt-5.2")
    })

    it("exposes chat method", () => {
      expect(typeof provider.chat).toBe("function")
      const model = provider.chat("gpt-5.2")
      expect(model.modelId).toBe("gpt-5.2")
    })

    it("exposes responses method", () => {
      expect(typeof provider.responses).toBe("function")
      const model = provider.responses("gpt-5.2")
      expect(model.modelId).toBe("gpt-5.2")
    })

    it("chat routes claude to anthropic", () => {
      const model = provider.chat("claude-opus-4-6-20260205")
      expect(model.provider).toBe("anthropic.messages")
    })

    it("chat routes gemini to google", () => {
      const model = provider.chat("gemini-3-pro")
      expect(model.provider).toBe("google.generative-ai")
    })

    it("responses falls back to chat for claude", () => {
      const model = provider.responses("claude-opus-4-6-20260205")
      expect(model.provider).toBe("anthropic.messages")
    })

    it("responses falls back to chat for gemini", () => {
      const model = provider.responses("gemini-3-pro")
      expect(model.provider).toBe("google.generative-ai")
    })
  })

  describe("model ID normalization", () => {
    it("trims whitespace from model IDs", () => {
      const model = provider("  gpt-5.2  ")
      expect(model.modelId).toBe("gpt-5.2")
    })

    it("handles model IDs with leading/trailing spaces", () => {
      const model = provider.languageModel(" claude-opus-4-6-20260205 ")
      expect(model.modelId).toBe("claude-opus-4-6-20260205")
    })
  })
})

describe("provider configuration", () => {
  it("accepts custom anthropic settings", () => {
    const provider = createAicodewith({
      apiKey: "main-key",
      anthropic: {
        apiKey: "anthropic-key",
        baseURL: "https://custom-anthropic.com",
      },
    })
    const model = provider("claude-opus-4-6-20260205")
    expect(model).toBeDefined()
  })

  it("accepts custom google settings", () => {
    const provider = createAicodewith({
      apiKey: "main-key",
      google: {
        apiKey: "google-key",
        baseURL: "https://custom-google.com",
      },
    })
    const model = provider("gemini-3-pro")
    expect(model).toBeDefined()
  })

  it("falls back to main apiKey for anthropic", () => {
    const provider = createAicodewith({
      apiKey: "main-key",
    })
    const model = provider("claude-opus-4-6-20260205")
    expect(model).toBeDefined()
  })

  it("uses placeholder key for google when no key provided", () => {
    const provider = createAicodewith({})
    const model = provider("gemini-3-pro")
    expect(model).toBeDefined()
  })
})

import { describe, it, expect } from "vitest"
import {
  MODELS,
  PROVIDER_ID,
  getActiveModels,
  getDeprecatedModels,
  getModelById,
  getModelByAlias,
  getModelsByFamily,
  buildModelMigrations,
  buildProviderConfig,
  buildAliasMap,
} from "../../lib/models"

describe("Model Registry", () => {
  describe("MODELS array", () => {
    it("contains all expected model families", () => {
      const families = new Set(MODELS.map(m => m.family))
      expect(families).toContain("codex")
      expect(families).toContain("gpt")
      expect(families).toContain("claude")
      expect(families).toContain("gemini")
    })

    it("all models have required fields", () => {
      for (const model of MODELS) {
        expect(model.id).toBeTruthy()
        expect(model.family).toBeTruthy()
        expect(model.displayName).toBeTruthy()
        expect(model.version).toBeTruthy()
        expect(model.limit.context).toBeGreaterThan(0)
        expect(model.limit.output).toBeGreaterThan(0)
        expect(model.modalities.input).toContain("text")
        expect(model.modalities.output).toContain("text")
      }
    })

    it("deprecated models have replacedBy field", () => {
      const deprecated = MODELS.filter(m => m.deprecated)
      for (const model of deprecated) {
        expect(model.replacedBy).toBeTruthy()
        const replacement = getModelById(model.replacedBy!)
        expect(replacement).toBeDefined()
        expect(replacement?.deprecated).toBeFalsy()
      }
    })
  })

  describe("getActiveModels", () => {
    it("excludes deprecated models", () => {
      const active = getActiveModels()
      expect(active.every(m => !m.deprecated)).toBe(true)
    })

    it("includes current models", () => {
      const active = getActiveModels()
      const ids = active.map(m => m.id)
      expect(ids).toContain("gpt-5.3-codex")
      expect(ids).toContain("gpt-5.2")
      expect(ids).toContain("claude-opus-4-6-20260205")
      expect(ids).toContain("gemini-3-pro")
    })
  })

  describe("getDeprecatedModels", () => {
    it("only returns deprecated models", () => {
      const deprecated = getDeprecatedModels()
      expect(deprecated.every(m => m.deprecated)).toBe(true)
    })

    it("includes opus 4.5 as deprecated", () => {
      const deprecated = getDeprecatedModels()
      const ids = deprecated.map(m => m.id)
      expect(ids).toContain("claude-opus-4-5-20251101")
    })
  })

  describe("getModelById", () => {
    it("finds model by exact id", () => {
      const model = getModelById("gpt-5.3-codex")
      expect(model?.displayName).toBe("GPT-5.3 Codex")
    })

    it("returns undefined for unknown id", () => {
      expect(getModelById("unknown-model")).toBeUndefined()
    })
  })

  describe("getModelByAlias", () => {
    it("finds model by id", () => {
      const model = getModelByAlias("gpt-5.3-codex")
      expect(model?.id).toBe("gpt-5.3-codex")
    })

    it("finds model by alias", () => {
      const model = getModelByAlias("gpt 5.3 codex")
      expect(model?.id).toBe("gpt-5.3-codex")
    })

    it("is case insensitive", () => {
      const model = getModelByAlias("GPT-5.3-CODEX")
      expect(model?.id).toBe("gpt-5.3-codex")
    })

    it("trims whitespace", () => {
      const model = getModelByAlias("  gpt-5.3-codex  ")
      expect(model?.id).toBe("gpt-5.3-codex")
    })
  })

  describe("getModelsByFamily", () => {
    it("returns only models of specified family", () => {
      const claudeModels = getModelsByFamily("claude")
      expect(claudeModels.every(m => m.family === "claude")).toBe(true)
    })

    it("excludes deprecated models", () => {
      const claudeModels = getModelsByFamily("claude")
      expect(claudeModels.every(m => !m.deprecated)).toBe(true)
    })
  })

  describe("buildModelMigrations", () => {
    it("creates migration map from deprecated models", () => {
      const migrations = buildModelMigrations()
      expect(migrations["claude-opus-4-5-20251101"]).toBe("claude-opus-4-6-20260205")
    })

    it("includes provider-prefixed migrations", () => {
      const migrations = buildModelMigrations()
      expect(migrations[`${PROVIDER_ID}/claude-opus-4-5-20251101`])
        .toBe(`${PROVIDER_ID}/claude-opus-4-6-20260205`)
    })

    it("handles third-party variants", () => {
      const migrations = buildModelMigrations()
      expect(migrations["claude-opus-4-5-20251101-third-party"])
        .toBe("claude-opus-4-6-20260205-third-party")
    })
  })

  describe("buildProviderConfig", () => {
    it("generates valid provider config structure", () => {
      const config = buildProviderConfig()
      expect(config.name).toBe("AICodewith")
      expect(config.env).toContain("AICODEWITH_API_KEY")
      expect(config.models).toBeDefined()
    })

    it("includes all active models", () => {
      const config = buildProviderConfig()
      const activeIds = getActiveModels().map(m => m.id)
      for (const id of activeIds) {
        expect(config.models[id]).toBeDefined()
      }
    })

    it("excludes deprecated models", () => {
      const config = buildProviderConfig()
      const deprecatedIds = getDeprecatedModels().map(m => m.id)
      for (const id of deprecatedIds) {
        expect(config.models[id]).toBeUndefined()
      }
    })

    it("model config has correct structure", () => {
      const config = buildProviderConfig()
      const gpt53codex = config.models["gpt-5.3-codex"]
      expect(gpt53codex.name).toBe("GPT-5.3 Codex")
      expect(gpt53codex.limit.context).toBe(400000)
      expect(gpt53codex.limit.output).toBe(128000)
      expect(gpt53codex.modalities.input).toContain("text")
    })
  })

  describe("buildAliasMap", () => {
    it("maps model id to itself", () => {
      const map = buildAliasMap()
      expect(map["gpt-5.3-codex"]).toBe("gpt-5.3-codex")
    })

    it("maps aliases to model id", () => {
      const map = buildAliasMap()
      expect(map["gpt 5.3 codex"]).toBe("gpt-5.3-codex")
    })

    it("maps effort variants to base model", () => {
      const map = buildAliasMap()
      expect(map["gpt-5.3-codex-high"]).toBe("gpt-5.3-codex")
      expect(map["gpt-5.3-codex-xhigh"]).toBe("gpt-5.3-codex")
    })

    it("aliases are lowercase", () => {
      const map = buildAliasMap()
      const keys = Object.keys(map)
      expect(keys.every(k => k === k.toLowerCase())).toBe(true)
    })
  })
})

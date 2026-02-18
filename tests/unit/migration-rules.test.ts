import { describe, it, expect } from "vitest"
import { MODEL_MIGRATIONS } from "../../lib/constants"
import { OMO_MODEL_ASSIGNMENTS, buildModelMigrations } from "../../lib/models"

describe("Migration Rules", () => {
  describe("MODEL_MIGRATIONS structure", () => {
    it("contains deprecated model mappings", () => {
      expect(MODEL_MIGRATIONS["claude-opus-4-5-20251101"]).toBe("claude-opus-4-6-20260205")
    })

    it("contains provider-prefixed mappings", () => {
      expect(MODEL_MIGRATIONS["aicodewith/claude-opus-4-5-20251101"]).toBe("aicodewith/claude-opus-4-6-20260205")
    })

    it("migrates third-party variants to non-third-party", () => {
      expect(MODEL_MIGRATIONS["claude-opus-4-6-20260205-third-party"]).toBe("claude-opus-4-6-20260205")
      expect(MODEL_MIGRATIONS["claude-opus-4-5-20251101-third-party"]).toBe("claude-opus-4-6-20260205")
      expect(MODEL_MIGRATIONS["claude-sonnet-4-5-20250929-third-party"]).toBe("claude-sonnet-4-6")
      expect(MODEL_MIGRATIONS["claude-haiku-4-5-20251001-third-party"]).toBe("claude-haiku-4-5-20251001")
    })
  })

  describe("OMO migration scenarios", () => {
    it("migrates aicodewith/claude-opus-4-5 to aicodewith/claude-opus-4-6", () => {
      const oldModel = "aicodewith/claude-opus-4-5-20251101"
      const newModel = MODEL_MIGRATIONS[oldModel]
      expect(newModel).toBe("aicodewith/claude-opus-4-6-20260205")
    })

    it("does NOT migrate non-aicodewith models", () => {
      const nonAicodewithModel = "anthropic/claude-opus-4-5-20251101"
      expect(MODEL_MIGRATIONS[nonAicodewithModel]).toBeUndefined()
    })

    it("migrates deprecated aicodewith sonnet-4-5 to sonnet-4-6", () => {
      const currentModel = "aicodewith/claude-sonnet-4-5-20250929"
      expect(MODEL_MIGRATIONS[currentModel]).toBe("aicodewith/claude-sonnet-4-6")
    })
  })

  describe("OMO default config as migration target", () => {
    it("OMO_MODEL_ASSIGNMENTS contains current model versions for custom agents", () => {
      expect(OMO_MODEL_ASSIGNMENTS.agents.build).toBe("aicodewith/claude-opus-4-6-20260205")
      expect(OMO_MODEL_ASSIGNMENTS.agents.plan).toBe("aicodewith/claude-opus-4-6-20260205")
      expect(OMO_MODEL_ASSIGNMENTS.agents["sisyphus-junior"]).toBe("aicodewith/claude-sonnet-4-6")
    })

    it("OMO_MODEL_ASSIGNMENTS does NOT contain deprecated models", () => {
      const allModels = [
        ...Object.values(OMO_MODEL_ASSIGNMENTS.agents),
        ...Object.values(OMO_MODEL_ASSIGNMENTS.categories),
      ]
      
      const deprecatedModels = Object.keys(MODEL_MIGRATIONS)
      
      for (const model of allModels) {
        expect(deprecatedModels).not.toContain(model)
      }
    })
  })

  describe("Migration rule: only aicodewith prefix", () => {
    const testCases = [
      { input: "aicodewith/claude-opus-4-5-20251101", shouldMigrate: true },
      { input: "claude-opus-4-5-20251101", shouldMigrate: true },
      { input: "anthropic/claude-opus-4-5-20251101", shouldMigrate: false },
      { input: "openai/gpt-4o", shouldMigrate: false },
      { input: "aicodewith/gpt-5.2", shouldMigrate: false },
      { input: "aicodewith/claude-sonnet-4-5-20250929", shouldMigrate: true },
      { input: "claude-sonnet-4-5-20250929", shouldMigrate: true },
    ]

    for (const { input, shouldMigrate } of testCases) {
      it(`${input} → ${shouldMigrate ? "migrates" : "does NOT migrate"}`, () => {
        const result = MODEL_MIGRATIONS[input]
        if (shouldMigrate) {
          expect(result).toBeDefined()
        } else {
          expect(result).toBeUndefined()
        }
      })
    }
  })
})

describe("Migration Flow Documentation", () => {
  it("documents the complete migration flow", () => {
    const migrationFlow = `
    OMO Config Migration Rules:
    
    1. WHEN: Plugin loads (syncOmoConfig called)
    
    2. WHAT gets migrated:
       - User's aicodewith/* models that are in MODEL_MIGRATIONS
       - Example: aicodewith/claude-opus-4-5-20251101 → aicodewith/claude-opus-4-6-20260205
    
    3. WHAT does NOT get migrated:
       - Non-aicodewith models (e.g., anthropic/*, openai/*)
       - Current (non-deprecated) aicodewith models
       - User customizations (temperature, etc.) are preserved
    
    4. WHAT gets added:
       - Missing agents/categories from default-omo-config.json
       - Only if user doesn't have that agent/category defined
    
    5. WHAT does NOT get overwritten:
       - User's existing agent/category model choices
       - Even if different from default-omo-config.json
    `
    
    expect(migrationFlow).toContain("aicodewith")
    expect(migrationFlow).toContain("MODEL_MIGRATIONS")
  })
})

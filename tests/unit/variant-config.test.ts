import { describe, test, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("Variant Configuration", () => {
  const projectRoot = join(import.meta.dirname!, "../..")
  const omoConfigPath = join(projectRoot, "assets/default-omo-config.json")

  test("ultrabrain category uses 'high' variant (not 'xhigh')", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.categories?.ultrabrain).toBeDefined()
    expect(omoConfig.categories.ultrabrain.variant).toBe("high")
    expect(omoConfig.categories.ultrabrain.variant).not.toBe("xhigh")
  })

  test("deep category uses 'medium' variant", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.categories?.deep).toBeDefined()
    expect(omoConfig.categories.deep.variant).toBe("medium")
  })

  test("hephaestus agent uses 'medium' variant", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.agents?.hephaestus).toBeDefined()
    expect(omoConfig.agents.hephaestus.variant).toBe("medium")
  })

  test("oracle agent uses 'high' variant", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.agents?.oracle).toBeDefined()
    expect(omoConfig.agents.oracle.variant).toBe("high")
  })

  test("momus agent uses 'medium' variant", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.agents?.momus).toBeDefined()
    expect(omoConfig.agents.momus.variant).toBe("medium")
  })

  test("sisyphus agent uses 'max' variant (from OMO)", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.agents?.sisyphus).toBeDefined()
    expect(omoConfig.agents.sisyphus.variant).toBe("max")
  })

  test("prometheus agent uses 'max' variant (from OMO)", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.agents?.prometheus).toBeDefined()
    expect(omoConfig.agents.prometheus.variant).toBe("max")
  })

  test("metis agent uses 'max' variant (from OMO)", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.agents?.metis).toBeDefined()
    expect(omoConfig.agents.metis.variant).toBe("max")
  })

  test("artistry category uses 'high' variant (from OMO)", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(omoConfig.categories?.artistry).toBeDefined()
    expect(omoConfig.categories.artistry.variant).toBe("high")
  })

  test("all GPT Codex agents/categories have reasonable variants", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    const gptCodexEntries: Array<{ name: string; type: "agent" | "category"; variant?: string }> = []
    
    // Collect all GPT Codex entries
    for (const [name, config] of Object.entries(omoConfig.agents || {})) {
      const agentConfig = config as { model?: string; variant?: string }
      if (agentConfig.model?.includes("gpt-5.3-codex") || agentConfig.model?.includes("gpt-5.2-codex")) {
        gptCodexEntries.push({ name, type: "agent", variant: agentConfig.variant })
      }
    }
    
    for (const [name, config] of Object.entries(omoConfig.categories || {})) {
      const categoryConfig = config as { model?: string; variant?: string }
      if (categoryConfig.model?.includes("gpt-5.3-codex") || categoryConfig.model?.includes("gpt-5.2-codex")) {
        gptCodexEntries.push({ name, type: "category", variant: categoryConfig.variant })
      }
    }
    
    // Verify no entry uses 'xhigh' (causes excessive thinking)
    for (const entry of gptCodexEntries) {
      expect(entry.variant).not.toBe("xhigh")
      expect(["high", "medium", "low", undefined]).toContain(entry.variant)
    }
    
    // Verify at least some entries have variants set
    const entriesWithVariant = gptCodexEntries.filter(e => e.variant !== undefined)
    expect(entriesWithVariant.length).toBeGreaterThan(0)
  })

  test("config prevents 'GPT stuck thinking' issue", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    // The main culprit was ultrabrain with xhigh
    const ultrabrainVariant = omoConfig.categories?.ultrabrain?.variant
    
    // Should be 'high' to prevent excessive thinking
    expect(ultrabrainVariant).toBe("high")
    
    // Document the fix
    if (ultrabrainVariant === "xhigh") {
      throw new Error(
        "ultrabrain uses 'xhigh' variant which causes GPT 5.3 Codex to think excessively. " +
        "This should be 'high' for reasonable performance."
      )
    }
  })
})

describe("Variant Inheritance from OMO", () => {
  const projectRoot = join(import.meta.dirname!, "../..")
  const omoConfigPath = join(projectRoot, "assets/default-omo-config.json")

  test("all config fields are copied from OMO, not just model", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    // Check that agents with variants have them preserved
    const agentsWithVariants = Object.entries(omoConfig.agents || {})
      .filter(([_, config]) => (config as any).variant !== undefined)
    
    expect(agentsWithVariants.length).toBeGreaterThan(0)
    
    // Check that categories with variants have them preserved
    const categoriesWithVariants = Object.entries(omoConfig.categories || {})
      .filter(([_, config]) => (config as any).variant !== undefined)
    
    expect(categoriesWithVariants.length).toBeGreaterThan(0)
  })

  test("reasoning overrides are applied on top of OMO defaults", () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    // These should be overridden by REASONING_OVERRIDES in generate-omo-config.ts
    const overriddenEntries = [
      { path: "categories.ultrabrain", expected: "high" },
      { path: "agents.oracle", expected: "high" },
      { path: "agents.momus", expected: "medium" },
    ]
    
    for (const { path, expected } of overriddenEntries) {
      const [type, name] = path.split(".")
      const config = type === "categories" 
        ? omoConfig.categories?.[name]
        : omoConfig.agents?.[name]
      
      expect(config).toBeDefined()
      expect((config as any).variant).toBe(expected)
    }
  })
})

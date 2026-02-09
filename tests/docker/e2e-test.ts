import { writeFileSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { execSync } from "node:child_process"

const projectRoot = "/app"

async function runTests() {
  console.log("🧪 E2E Tests - Config Generation & Build")
  console.log("=========================================\n")

  let passed = 0
  let failed = 0

  const test = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn()
      console.log(`✅ ${name}`)
      passed++
    } catch (error) {
      console.log(`❌ ${name}`)
      console.log(`   Error: ${error instanceof Error ? error.message : error}`)
      failed++
    }
  }

  const registryPath = join(projectRoot, "lib/models/registry.ts")
  const providerConfigPath = join(projectRoot, "lib/provider-config.json")
  const omoConfigPath = join(projectRoot, "assets/default-omo-config.json")
  
  const originalRegistry = readFileSync(registryPath, "utf-8")

  console.log("📦 Testing: Add New Model\n")

  await test("generates provider-config.json with new model after adding to registry", () => {
    const newModel = `
  {
    id: "gpt-6.0-test",
    family: "gpt" as const,
    displayName: "GPT-6.0 Test",
    version: "6.0",
    limit: { context: 500000, output: 200000 },
    modalities: { input: ["text", "image"] as const, output: ["text"] as const },
    reasoning: "xhigh" as const,
    aliases: ["gpt-6.0-test", "gpt 6.0 test"],
  },`

    const modifiedRegistry = originalRegistry.replace(
      "// GPT Models",
      `// GPT Models\n${newModel}`
    )
    writeFileSync(registryPath, modifiedRegistry)

    try {
      execSync("bun scripts/generate-provider-config.ts", { cwd: projectRoot })
      const generatedConfig = JSON.parse(readFileSync(providerConfigPath, "utf-8"))
      
      if (!generatedConfig.models["gpt-6.0-test"]) throw new Error("Model not found")
      if (generatedConfig.models["gpt-6.0-test"].name !== "GPT-6.0 Test") throw new Error("Wrong name")
      if (generatedConfig.models["gpt-6.0-test"].limit.context !== 500000) throw new Error("Wrong context limit")
    } finally {
      writeFileSync(registryPath, originalRegistry)
    }
  })

  await test("excludes deprecated models from provider-config.json", () => {
    const deprecatedModel = `
  {
    id: "gpt-old-deprecated",
    family: "gpt" as const,
    displayName: "GPT Old (deprecated)",
    version: "old",
    limit: { context: 100000, output: 50000 },
    modalities: { input: ["text"] as const, output: ["text"] as const },
    deprecated: true,
    replacedBy: "gpt-5.2",
  },`

    const modifiedRegistry = originalRegistry.replace(
      "// GPT Models",
      `// GPT Models\n${deprecatedModel}`
    )
    writeFileSync(registryPath, modifiedRegistry)

    try {
      execSync("bun scripts/generate-provider-config.ts", { cwd: projectRoot })
      const generatedConfig = JSON.parse(readFileSync(providerConfigPath, "utf-8"))
      if (generatedConfig.models["gpt-old-deprecated"]) throw new Error("Deprecated model should not be included")
    } finally {
      writeFileSync(registryPath, originalRegistry)
    }
  })

  console.log("\n📦 Testing: Model Version Upgrade\n")

  await test("generates migration mapping when model is deprecated with replacedBy", async () => {
    const { buildModelMigrations } = await import("../../lib/models")
    const migrations = buildModelMigrations()

    if (migrations["claude-opus-4-5-20251101"] !== "claude-opus-4-6-20260205")
      throw new Error(`Expected claude-opus-4-5-20251101 → claude-opus-4-6-20260205, got ${migrations["claude-opus-4-5-20251101"]}`)
    if (migrations["aicodewith/claude-opus-4-5-20251101"] !== "aicodewith/claude-opus-4-6-20260205")
      throw new Error("Prefixed migration missing")
    if (migrations["claude-opus-4-6-20260205-third-party"] !== "claude-opus-4-6-20260205")
      throw new Error("Third-party migration missing")
  })

  console.log("\n📦 Testing: Model Alias Resolution\n")

  await test("resolves model aliases correctly via model-map", async () => {
    const { getNormalizedModel } = await import("../../lib/request/helpers/model-map")

    const cases: [string, string][] = [
      ["gpt-5.3-codex", "gpt-5.3-codex"],
      ["gpt 5.3 codex", "gpt-5.3-codex"],
      ["GPT-5.3-CODEX", "gpt-5.3-codex"],
      ["gpt-5.3-codex-high", "gpt-5.3-codex"],
      ["gpt-5.2", "gpt-5.2"],
      ["gpt 5.2", "gpt-5.2"],
    ]
    for (const [input, expected] of cases) {
      const result = getNormalizedModel(input)
      if (result !== expected) throw new Error(`getNormalizedModel("${input}") = "${result}", expected "${expected}"`)
    }
  })

  console.log("\n📦 Testing: User Config Sync\n")

  await test("overwrites aicodewith provider config with latest from plugin", async () => {
    const { applyProviderConfig, buildStandardProviderConfig } = await import("../../lib/config/sync")
    const standardProvider = buildStandardProviderConfig("file:///test/provider.ts")

    const config: Record<string, unknown> = {
      provider: {
        aicodewith: { name: "AICodewith", models: { "gpt-5.0-old": { name: "Old" } } },
        "other-provider": { name: "Other" },
      },
      plugin: ["opencode-aicodewith-auth"],
    }

    const result = applyProviderConfig(config, standardProvider, "file:///test/plugin.ts")
    if (!result.changed) throw new Error("Expected changed=true")
    if (!result.changes.includes("provider_updated")) throw new Error("Expected provider_updated change")

    const providers = config.provider as Record<string, any>
    if (!providers.aicodewith.models["gpt-5.3-codex"]) throw new Error("New model missing")
    if (providers.aicodewith.models["gpt-5.0-old"]) throw new Error("Old model should be gone")
    if (providers["other-provider"].name !== "Other") throw new Error("Other provider was modified")
  })

  await test("migrates deprecated model in user config.model field", async () => {
    const { applyProviderConfig, buildStandardProviderConfig } = await import("../../lib/config/sync")
    const standardProvider = buildStandardProviderConfig("file:///test/provider.ts")

    const config: Record<string, unknown> = {
      model: "aicodewith/claude-opus-4-5-20251101",
      plugin: ["opencode-aicodewith-auth"],
    }

    applyProviderConfig(config, standardProvider, "file:///test/plugin.ts")
    if (config.model !== "aicodewith/claude-opus-4-6-20260205")
      throw new Error(`Expected migrated model, got ${config.model}`)
  })

  console.log("\n📦 Testing: Variant Configuration\n")

  await test("generates OMO config with correct variant settings", async () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))

    if (!omoConfig.categories?.ultrabrain) throw new Error("ultrabrain category missing")
    if (omoConfig.categories.ultrabrain.variant !== "high") 
      throw new Error(`ultrabrain variant should be 'high', got '${omoConfig.categories.ultrabrain.variant}'`)

    if (!omoConfig.categories?.deep) throw new Error("deep category missing")
    if (omoConfig.categories.deep.variant !== "medium")
      throw new Error(`deep variant should be 'medium', got '${omoConfig.categories.deep.variant}'`)

    if (!omoConfig.agents?.hephaestus) throw new Error("hephaestus agent missing")
    if (omoConfig.agents.hephaestus.variant !== "medium")
      throw new Error(`hephaestus variant should be 'medium', got '${omoConfig.agents.hephaestus.variant}'`)

    if (!omoConfig.agents?.oracle) throw new Error("oracle agent missing")
    if (omoConfig.agents.oracle.variant !== "high")
      throw new Error(`oracle variant should be 'high', got '${omoConfig.agents.oracle.variant}'`)

    if (!omoConfig.agents?.momus) throw new Error("momus agent missing")
    if (omoConfig.agents.momus.variant !== "medium")
      throw new Error(`momus variant should be 'medium', got '${omoConfig.agents.momus.variant}'`)
  })

  await test("copies all config fields from OMO, not just model", async () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))

    if (!omoConfig.agents?.sisyphus) throw new Error("sisyphus agent missing")
    if (omoConfig.agents.sisyphus.variant !== "max")
      throw new Error(`sisyphus should have variant='max', got '${omoConfig.agents.sisyphus.variant}'`)

    if (!omoConfig.categories?.artistry) throw new Error("artistry category missing")
    if (omoConfig.categories.artistry.variant !== "high")
      throw new Error(`artistry should have variant='high', got '${omoConfig.categories.artistry.variant}'`)
  })

  await test("reasoning overrides are applied correctly", async () => {
    // This test verifies that REASONING_OVERRIDES in generate-omo-config.ts works
    const omoConfigContent = readFileSync(omoConfigPath, "utf-8")
    const omoConfig = JSON.parse(omoConfigContent)

    // ultrabrain should be overridden to 'high' (not 'xhigh' from OMO)
    if (omoConfig.categories?.ultrabrain?.variant !== "high")
      throw new Error(`ultrabrain override failed: expected 'high', got '${omoConfig.categories?.ultrabrain?.variant}'`)

    // oracle should be overridden to 'high'
    if (omoConfig.agents?.oracle?.variant !== "high")
      throw new Error(`oracle override failed: expected 'high', got '${omoConfig.agents?.oracle?.variant}'`)

    // momus should be overridden to 'medium'
    if (omoConfig.agents?.momus?.variant !== "medium")
      throw new Error(`momus override failed: expected 'medium', got '${omoConfig.agents?.momus?.variant}'`)
  })

  console.log("\n📦 Testing: OMO Config Sync\n")

  await test("adds missing agents without overwriting user customizations", async () => {
    const { buildOmoConfig } = await import("../../lib/models")
    const defaultConfig = buildOmoConfig()

    const userConfig: Record<string, any> = {
      agents: { sisyphus: { model: "openai/gpt-4o" } },
      categories: {},
    }

    for (const [name, agent] of Object.entries(defaultConfig.agents as Record<string, { model: string }>)) {
      if (!userConfig.agents[name]) {
        userConfig.agents[name] = agent
      }
    }

    if (userConfig.agents.sisyphus.model !== "openai/gpt-4o") throw new Error("User customization was overwritten")
    if (!userConfig.agents.oracle) throw new Error("Missing agent: oracle")
    if (!userConfig.agents.build) throw new Error("Missing agent: build")
  })

  await test("migrates deprecated models in user OMO config", async () => {
    const { MODEL_MIGRATIONS } = await import("../../lib/constants")

    const userConfig: Record<string, any> = {
      agents: { build: { model: "aicodewith/claude-opus-4-5-20251101" } },
      categories: {},
    }

    for (const agent of Object.values(userConfig.agents) as { model?: string }[]) {
      if (agent.model && MODEL_MIGRATIONS[agent.model]) {
        agent.model = MODEL_MIGRATIONS[agent.model]
      }
    }

    if (userConfig.agents.build.model !== "aicodewith/claude-opus-4-6-20260205")
      throw new Error(`Expected migrated model, got ${userConfig.agents.build.model}`)
  })

  await test("updates OMO config when adding new agent assignment", async () => {
    const newAgentAssignment = `"test-agent": getFullModelId("gpt-5.2"),`
    
    const modifiedRegistry = originalRegistry.replace(
      '"sisyphus": getFullModelId("claude-sonnet-4-5-20250929"),',
      `"sisyphus": getFullModelId("claude-sonnet-4-5-20250929"),\n    ${newAgentAssignment}`
    )
    
    const modifiedWithType = modifiedRegistry.replace(
      'export type OmoAgentName =',
      'export type OmoAgentName = "test-agent" |'
    )
    
    writeFileSync(registryPath, modifiedWithType)

    try {
      execSync("OMO_PATH=/tmp/oh-my-opencode bun scripts/generate-omo-config.ts", { cwd: projectRoot })
      const generatedOmo = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
      
      if (!generatedOmo.agents["test-agent"]) throw new Error("test-agent not found")
      if (generatedOmo.agents["test-agent"].model !== "aicodewith/gpt-5.2") 
        throw new Error(`Expected aicodewith/gpt-5.2, got ${generatedOmo.agents["test-agent"].model}`)
    } finally {
      writeFileSync(registryPath, originalRegistry)
    }
  })

  await test("sisyphus uses opus from oh-my-opencode defaults", async () => {
    execSync("OMO_PATH=/tmp/oh-my-opencode bun scripts/generate-omo-config.ts", { cwd: projectRoot })
    const generatedOmo = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    if (generatedOmo.agents.sisyphus.model !== "aicodewith/claude-opus-4-6-20260205")
      throw new Error(`sisyphus should use opus, got ${generatedOmo.agents.sisyphus.model}`)
    if (generatedOmo.agents.prometheus.model !== "aicodewith/claude-opus-4-6-20260205")
      throw new Error(`prometheus should use opus, got ${generatedOmo.agents.prometheus.model}`)
    if (generatedOmo.agents.metis.model !== "aicodewith/claude-opus-4-6-20260205")
      throw new Error(`metis should use opus, got ${generatedOmo.agents.metis.model}`)
  })

  console.log("\n📦 Testing: Config Generation Idempotency\n")

  await test("running generate:config twice produces identical output", () => {
    execSync("bun run generate:config", { cwd: projectRoot })
    const firstRun = {
      provider: readFileSync(providerConfigPath, "utf-8"),
      omo: readFileSync(omoConfigPath, "utf-8"),
    }

    execSync("bun run generate:config", { cwd: projectRoot })
    const secondRun = {
      provider: readFileSync(providerConfigPath, "utf-8"),
      omo: readFileSync(omoConfigPath, "utf-8"),
    }

    if (firstRun.provider !== secondRun.provider) throw new Error("provider-config.json differs")
    if (firstRun.omo !== secondRun.omo) throw new Error("omo-config.json differs")
  })

  console.log("\n📦 Testing: Reasoning Effort Transformation\n")

  await test("transforms variant to reasoningEffort for GPT models", async () => {
    const { transformRequestBody } = await import("../../lib/request/request-transformer")
    
    const makeRequest = (model: string, effort: "xhigh" | "high" | "medium" | "low") => ({
      model,
      messages: [{ role: "user" as const, content: "test" }],
      providerOptions: { openai: { reasoningEffort: effort } },
    })

    const xhighResult = await transformRequestBody(makeRequest("aicodewith/gpt-5.3-codex", "xhigh"), "")
    if (xhighResult.reasoning?.effort !== "xhigh") 
      throw new Error(`Expected xhigh, got ${xhighResult.reasoning?.effort}`)

    const highResult = await transformRequestBody(makeRequest("aicodewith/gpt-5.3-codex", "high"), "")
    if (highResult.reasoning?.effort !== "high")
      throw new Error(`Expected high, got ${highResult.reasoning?.effort}`)

    const mediumResult = await transformRequestBody(makeRequest("aicodewith/gpt-5.3-codex", "medium"), "")
    if (mediumResult.reasoning?.effort !== "medium")
      throw new Error(`Expected medium, got ${mediumResult.reasoning?.effort}`)
  })

  await test("downgrades xhigh to high for models that don't support it", async () => {
    const { transformRequestBody } = await import("../../lib/request/request-transformer")
    
    const request = {
      model: "aicodewith/gpt-5.1-codex",
      messages: [{ role: "user" as const, content: "test" }],
      providerOptions: { openai: { reasoningEffort: "xhigh" as const } },
    }
    const result = await transformRequestBody(request, "")
    if (result.reasoning?.effort !== "high")
      throw new Error(`xhigh should downgrade to high for gpt-5.1, got ${result.reasoning?.effort}`)
  })

  await test("uses default reasoning effort when not specified", async () => {
    const { transformRequestBody } = await import("../../lib/request/request-transformer")
    
    const request = {
      model: "aicodewith/gpt-5.3-codex",
      messages: [{ role: "user" as const, content: "test" }],
    }
    const result = await transformRequestBody(request, "")
    if (result.reasoning?.effort !== "high")
      throw new Error(`Default for gpt-5.3-codex should be high, got ${result.reasoning?.effort}`)
  })

  await test("prevents excessive thinking by using reasonable defaults", async () => {
    const omoConfig = JSON.parse(readFileSync(omoConfigPath, "utf-8"))

    const ultrabrainVariant = omoConfig.categories?.ultrabrain?.variant
    if (ultrabrainVariant === "xhigh")
      throw new Error("ultrabrain should not use xhigh (causes excessive thinking)")
    if (ultrabrainVariant !== "high")
      throw new Error(`ultrabrain should use 'high', got '${ultrabrainVariant}'`)

    const hephaestusVariant = omoConfig.agents?.hephaestus?.variant
    if (hephaestusVariant !== "medium")
      throw new Error(`hephaestus should use 'medium' for balanced performance, got '${hephaestusVariant}'`)
  })

  console.log("\n📦 Testing: Full Build\n")

  await test("bun run build succeeds without errors", () => {
    execSync("bun run build", { cwd: projectRoot, stdio: "pipe" })
  })

  await test("build output contains expected files", () => {
    execSync("bun run build", { cwd: projectRoot, stdio: "pipe" })
    if (!existsSync(join(projectRoot, "dist/index.js"))) throw new Error("dist/index.js not found")
    if (!existsSync(join(projectRoot, "dist/provider.js"))) throw new Error("dist/provider.js not found")
  })

  console.log("\n\n📊 Summary")
  console.log("==========")
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

runTests()

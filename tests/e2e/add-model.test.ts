import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"
import os from "node:os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, "../..")

describe("Add New Model E2E", () => {
  const registryPath = join(projectRoot, "lib/models/registry.ts")
  const providerConfigPath = join(projectRoot, "lib/provider-config.json")
  const omoConfigPath = join(projectRoot, "assets/default-omo-config.json")
  
  let originalRegistry: string
  let originalProviderConfig: string
  let originalOmoConfig: string

  beforeAll(() => {
    originalRegistry = readFileSync(registryPath, "utf-8")
    originalProviderConfig = readFileSync(providerConfigPath, "utf-8")
    originalOmoConfig = readFileSync(omoConfigPath, "utf-8")
  })

  afterAll(() => {
    writeFileSync(registryPath, originalRegistry)
    writeFileSync(providerConfigPath, originalProviderConfig)
    writeFileSync(omoConfigPath, originalOmoConfig)
  })

  afterEach(() => {
    writeFileSync(registryPath, originalRegistry)
  })

  it("generates provider-config.json with new model after adding to registry", () => {
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

    execSync("bun scripts/generate-provider-config.ts", { cwd: projectRoot })

    const generatedConfig = JSON.parse(readFileSync(providerConfigPath, "utf-8"))
    
    expect(generatedConfig.models["gpt-6.0-test"]).toBeDefined()
    expect(generatedConfig.models["gpt-6.0-test"].name).toBe("GPT-6.0 Test")
    expect(generatedConfig.models["gpt-6.0-test"].limit.context).toBe(500000)
    expect(generatedConfig.models["gpt-6.0-test"].limit.output).toBe(200000)
  })

  it("excludes deprecated models from provider-config.json", () => {
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

    execSync("bun scripts/generate-provider-config.ts", { cwd: projectRoot })
    
    const generatedConfig = JSON.parse(readFileSync(providerConfigPath, "utf-8"))
    expect(generatedConfig.models["gpt-old-deprecated"]).toBeUndefined()
  })

  it("updates OMO config when adding new agent assignment", () => {
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

    execSync("bun scripts/generate-omo-config.ts", { cwd: projectRoot })

    const generatedOmo = JSON.parse(readFileSync(omoConfigPath, "utf-8"))
    
    expect(generatedOmo.agents["test-agent"]).toBeDefined()
    expect(generatedOmo.agents["test-agent"].model).toBe("aicodewith/gpt-5.2")
  })
})

describe("Model Version Upgrade E2E", () => {
  it("generates migration mapping when model is deprecated with replacedBy", async () => {
    const { buildModelMigrations } = await import("../../lib/models")
    const migrations = buildModelMigrations()
    
    expect(migrations["claude-opus-4-5-20251101"]).toBe("claude-opus-4-6-20260205")
    expect(migrations["aicodewith/claude-opus-4-5-20251101"]).toBe("aicodewith/claude-opus-4-6-20260205")
    expect(migrations["claude-opus-4-5-20251101-third-party"]).toBe("claude-opus-4-6-20260205-third-party")
  })
})

describe("Model Alias Resolution E2E", () => {
  it("resolves model aliases correctly via model-map", async () => {
    const { getNormalizedModel } = await import("../../lib/request/helpers/model-map")
    
    expect(getNormalizedModel("gpt-5.3-codex")).toBe("gpt-5.3-codex")
    expect(getNormalizedModel("gpt 5.3 codex")).toBe("gpt-5.3-codex")
    expect(getNormalizedModel("GPT-5.3-CODEX")).toBe("gpt-5.3-codex")
    expect(getNormalizedModel("gpt-5.3-codex-high")).toBe("gpt-5.3-codex")
    expect(getNormalizedModel("gpt-5.2")).toBe("gpt-5.2")
    expect(getNormalizedModel("gpt 5.2")).toBe("gpt-5.2")
  })
})

describe("User Config Sync E2E", () => {
  const testConfigDir = join(os.tmpdir(), "opencode-test-config")
  const testConfigPath = join(testConfigDir, "opencode.json")
  
  beforeEach(() => {
    process.env.OPENCODE_TEST_HOME = os.tmpdir()
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true })
    }
  })

  afterEach(() => {
    delete process.env.OPENCODE_TEST_HOME
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true })
    }
  })

  it("overwrites aicodewith provider config with latest from plugin", async () => {
    const oldUserConfig = {
      $schema: "https://opencode.ai/config.json",
      provider: {
        aicodewith: {
          name: "AICodewith",
          models: {
            "gpt-5.0-old": { name: "Old GPT 5.0", limit: { context: 100000, output: 50000 } }
          }
        },
        "other-provider": { name: "Other" }
      },
      plugin: ["opencode-aicodewith-auth"]
    }
    writeFileSync(testConfigPath, JSON.stringify(oldUserConfig, null, 2))

    const { applyProviderConfig, buildStandardProviderConfig } = await import("../../lib/config/sync")
    const standardProvider = buildStandardProviderConfig("file:///test/provider.ts")
    
    const config = JSON.parse(readFileSync(testConfigPath, "utf-8"))
    const result = applyProviderConfig(config, standardProvider, "file:///test/plugin.ts")

    expect(result.changed).toBe(true)
    expect(result.changes).toContain("provider_updated")
    
    const aicodewithConfig = config.provider.aicodewith
    expect(aicodewithConfig.models["gpt-5.3-codex"]).toBeDefined()
    expect(aicodewithConfig.models["gpt-5.2"]).toBeDefined()
    expect(aicodewithConfig.models["gpt-5.0-old"]).toBeUndefined()
    
    expect(config.provider["other-provider"]).toEqual({ name: "Other" })
  })

  it("migrates deprecated model in user config.model field", async () => {
    const oldUserConfig = {
      $schema: "https://opencode.ai/config.json",
      model: "aicodewith/claude-opus-4-5-20251101",
      plugin: ["opencode-aicodewith-auth"]
    }
    writeFileSync(testConfigPath, JSON.stringify(oldUserConfig, null, 2))

    const { applyProviderConfig, buildStandardProviderConfig } = await import("../../lib/config/sync")
    const standardProvider = buildStandardProviderConfig("file:///test/provider.ts")
    
    const config = JSON.parse(readFileSync(testConfigPath, "utf-8"))
    applyProviderConfig(config, standardProvider, "file:///test/plugin.ts")

    expect(config.model).toBe("aicodewith/claude-opus-4-6-20260205")
  })
})

describe("OMO Config Sync E2E", () => {
  const testConfigDir = join(os.tmpdir(), "opencode-test-omo")
  const testOmoPath = join(testConfigDir, "opencode", "oh-my-opencode.json")
  
  beforeEach(() => {
    process.env.OPENCODE_TEST_HOME = os.tmpdir()
    const omoDir = join(testConfigDir, "opencode")
    if (!existsSync(omoDir)) {
      mkdirSync(omoDir, { recursive: true })
    }
  })

  afterEach(() => {
    delete process.env.OPENCODE_TEST_HOME
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true })
    }
  })

  it("adds missing agents without overwriting user customizations", async () => {
    const userOmoConfig = {
      $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
      agents: {
        sisyphus: { model: "openai/gpt-4o" }
      },
      categories: {}
    }
    writeFileSync(testOmoPath, JSON.stringify(userOmoConfig, null, 2))

    const { buildOmoConfig } = await import("../../lib/models")
    const defaultConfig = buildOmoConfig()
    
    const userConfig = JSON.parse(readFileSync(testOmoPath, "utf-8"))
    
    expect(userConfig.agents.sisyphus.model).toBe("openai/gpt-4o")
    
    for (const [name, agent] of Object.entries(defaultConfig.agents as Record<string, { model: string }>)) {
      if (!userConfig.agents[name]) {
        userConfig.agents[name] = agent
      }
    }
    
    expect(userConfig.agents.sisyphus.model).toBe("openai/gpt-4o")
    expect(userConfig.agents.oracle).toBeDefined()
    expect(userConfig.agents.build).toBeDefined()
  })

  it("migrates deprecated models in user OMO config", async () => {
    const userOmoConfig = {
      agents: {
        build: { model: "aicodewith/claude-opus-4-5-20251101" }
      },
      categories: {}
    }
    writeFileSync(testOmoPath, JSON.stringify(userOmoConfig, null, 2))

    const { MODEL_MIGRATIONS } = await import("../../lib/constants")
    
    const userConfig = JSON.parse(readFileSync(testOmoPath, "utf-8"))
    
    for (const agent of Object.values(userConfig.agents) as { model?: string }[]) {
      if (agent.model && MODEL_MIGRATIONS[agent.model]) {
        agent.model = MODEL_MIGRATIONS[agent.model]
      }
    }
    
    expect(userConfig.agents.build.model).toBe("aicodewith/claude-opus-4-6-20260205")
  })
})

describe("Config Generation Idempotency", () => {
  it("running generate:config twice produces identical output", () => {
    execSync("bun run generate:config", { cwd: projectRoot })
    const firstRun = {
      provider: readFileSync(join(projectRoot, "lib/provider-config.json"), "utf-8"),
      omo: readFileSync(join(projectRoot, "assets/default-omo-config.json"), "utf-8"),
    }

    execSync("bun run generate:config", { cwd: projectRoot })
    const secondRun = {
      provider: readFileSync(join(projectRoot, "lib/provider-config.json"), "utf-8"),
      omo: readFileSync(join(projectRoot, "assets/default-omo-config.json"), "utf-8"),
    }

    expect(firstRun.provider).toBe(secondRun.provider)
    expect(firstRun.omo).toBe(secondRun.omo)
  })
})

describe("Full Build E2E", () => {
  it("bun run build succeeds without errors", () => {
    expect(() => {
      execSync("bun run build", { cwd: projectRoot, stdio: "pipe" })
    }).not.toThrow()
  })

  it("build output contains expected files", () => {
    execSync("bun run build", { cwd: projectRoot, stdio: "pipe" })
    
    expect(existsSync(join(projectRoot, "dist/index.js"))).toBe(true)
    expect(existsSync(join(projectRoot, "dist/provider.js"))).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readFile, writeFile, access } from "node:fs/promises"
import path from "node:path"
import os from "node:os"

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockAccess = vi.mocked(access)

const DEFAULT_OMO_CONFIG = {
  $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  agents: {
    sisyphus: { model: "aicodewith/claude-sonnet-4-6", variant: "max" },
    oracle: { model: "aicodewith/gpt-5.2", variant: "high" },
    build: { model: "aicodewith/claude-opus-4-6-20260205" },
    momus: { model: "aicodewith/gpt-5.2", variant: "medium" },
  },
  categories: {
    quick: { model: "aicodewith/claude-sonnet-4-6" },
    ultrabrain: { model: "aicodewith/gpt-5.3-codex", variant: "high" },
    deep: { model: "aicodewith/gpt-5.3-codex", variant: "medium" },
  },
}

describe("OMO Config Sync", () => {
  let syncOmoConfig: () => Promise<void>
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    originalEnv = { ...process.env }
    delete process.env.AICODEWITH_DISABLE_OMO_SYNC
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(DEFAULT_OMO_CONFIG),
    })

    const module = await import("../../lib/hooks/omo-config-sync/index")
    syncOmoConfig = module.syncOmoConfig
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe("environment variable control", () => {
    it("skips sync when AICODEWITH_DISABLE_OMO_SYNC=1", async () => {
      process.env.AICODEWITH_DISABLE_OMO_SYNC = "1"
      
      const module = await import("../../lib/hooks/omo-config-sync/index")
      await module.syncOmoConfig()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it("skips sync when AICODEWITH_DISABLE_OMO_SYNC=true", async () => {
      process.env.AICODEWITH_DISABLE_OMO_SYNC = "true"
      
      const module = await import("../../lib/hooks/omo-config-sync/index")
      await module.syncOmoConfig()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it("proceeds with sync when env var is not set", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT"))
      
      await syncOmoConfig()
      
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe("new user (no config file)", () => {
    beforeEach(() => {
      mockAccess.mockRejectedValue(new Error("ENOENT"))
    })

    it("creates config with default agents and categories including variant", async () => {
      await syncOmoConfig()
      
      expect(mockWriteFile).toHaveBeenCalled()
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      
      expect(writtenContent.agents.sisyphus).toEqual({ model: "aicodewith/claude-sonnet-4-6", variant: "max" })
      expect(writtenContent.agents.oracle).toEqual({ model: "aicodewith/gpt-5.2", variant: "high" })
      expect(writtenContent.categories.quick).toEqual({ model: "aicodewith/claude-sonnet-4-6" })
      expect(writtenContent.categories.ultrabrain).toEqual({ model: "aicodewith/gpt-5.3-codex", variant: "high" })
    })

    it("includes $schema in new config", async () => {
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.$schema).toContain("oh-my-opencode.schema.json")
    })
  })

  describe("existing user config", () => {
    it("adds missing agents from default config", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "aicodewith/claude-sonnet-4-6", variant: "max" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.oracle).toEqual({ model: "aicodewith/gpt-5.2", variant: "high" })
      expect(writtenContent.agents.build).toEqual({ model: "aicodewith/claude-opus-4-6-20260205" })
    })

    it("adds missing categories from default config", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {
          quick: { model: "aicodewith/claude-sonnet-4-6" },
        },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.categories.ultrabrain).toEqual({ model: "aicodewith/gpt-5.3-codex", variant: "high" })
      expect(writtenContent.categories.deep).toEqual({ model: "aicodewith/gpt-5.3-codex", variant: "medium" })
    })

    it("preserves user customized agent model (does NOT overwrite)", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "openai/gpt-4o" },
          oracle: { model: "anthropic/claude-3-opus" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.sisyphus.model).toBe("openai/gpt-4o")
      expect(writtenContent.agents.oracle.model).toBe("anthropic/claude-3-opus")
    })

    it("preserves user customized category model (does NOT overwrite)", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {
          quick: { model: "openai/gpt-4o-mini" },
        },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.categories.quick.model).toBe("openai/gpt-4o-mini")
    })

    it("preserves user's extra config fields", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { 
            model: "aicodewith/claude-sonnet-4-6",
            temperature: 0.5,
            customField: "user value",
          },
        },
        categories: {},
        userCustomSection: { foo: "bar" },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.sisyphus.temperature).toBe(0.5)
      expect(writtenContent.agents.sisyphus.customField).toBe("user value")
      expect(writtenContent.userCustomSection).toEqual({ foo: "bar" })
    })
  })

  describe("model migration", () => {
    it("migrates deprecated agent models", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          build: { model: "aicodewith/claude-opus-4-5-20251101" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.build.model).toBe("aicodewith/claude-opus-4-6-20260205")
    })

    it("migrates deprecated category models", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {
          ultrabrain: { model: "aicodewith/claude-opus-4-5-20251101" },
        },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.categories.ultrabrain.model).toBe("aicodewith/claude-opus-4-6-20260205")
    })

    it("does not migrate non-aicodewith models", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "openai/gpt-4o" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.sisyphus.model).toBe("openai/gpt-4o")
    })
  })

  describe("variant field sync", () => {
    it("copies variant field when adding missing agents", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      // Agents with variant in default config should have variant copied
      expect(writtenContent.agents.sisyphus.variant).toBe("max")
      expect(writtenContent.agents.oracle.variant).toBe("high")
      expect(writtenContent.agents.momus.variant).toBe("medium")
      // Agents without variant in default config should not have variant
      expect(writtenContent.agents.build.variant).toBeUndefined()
    })

    it("copies variant field when adding missing categories", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      // Categories with variant in default config should have variant copied
      expect(writtenContent.categories.ultrabrain.variant).toBe("high")
      expect(writtenContent.categories.deep.variant).toBe("medium")
      // Categories without variant in default config should not have variant
      expect(writtenContent.categories.quick.variant).toBeUndefined()
    })

    it("backfills missing variant for existing agent when default has variant", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "aicodewith/claude-sonnet-4-6" },
          oracle: { model: "aicodewith/gpt-5.2" },
          build: { model: "aicodewith/claude-opus-4-6-20260205" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.sisyphus.variant).toBe("max")
      expect(writtenContent.agents.oracle.variant).toBe("high")
      expect(writtenContent.agents.build.variant).toBeUndefined()
    })

    it("backfills missing variant for existing category when default has variant", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {},
        categories: {
          ultrabrain: { model: "aicodewith/gpt-5.3-codex" },
          deep: { model: "aicodewith/gpt-5.3-codex" },
          quick: { model: "aicodewith/claude-sonnet-4-6" },
        },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.categories.ultrabrain.variant).toBe("high")
      expect(writtenContent.categories.deep.variant).toBe("medium")
      expect(writtenContent.categories.quick.variant).toBeUndefined()
    })

    it("does NOT backfill variant when user uses non-aicodewith model", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "openai/gpt-4o" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.sisyphus.variant).toBeUndefined()
    })

    it("does NOT backfill variant when user uses different aicodewith model", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          oracle: { model: "aicodewith/claude-opus-4-6-20260205" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      expect(writtenContent.agents.oracle.variant).toBeUndefined()
    })

    it("preserves user's existing variant when agent already exists", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "aicodewith/claude-sonnet-4-6", variant: "low" },
          oracle: { model: "aicodewith/gpt-5.2", variant: "xhigh" },
        },
        categories: {
          ultrabrain: { model: "aicodewith/gpt-5.3-codex", variant: "xhigh" },
        },
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      // User's custom variant should be preserved (not overwritten by default)
      expect(writtenContent.agents.sisyphus.variant).toBe("low")
      expect(writtenContent.agents.oracle.variant).toBe("xhigh")
      expect(writtenContent.categories.ultrabrain.variant).toBe("xhigh")
    })

    it("preserves user's variant during model migration", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          build: { model: "aicodewith/claude-opus-4-5-20251101", variant: "high" },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      // Model should be migrated but variant should be preserved
      expect(writtenContent.agents.build.model).toBe("aicodewith/claude-opus-4-6-20260205")
      expect(writtenContent.agents.build.variant).toBe("high")
    })

    it("new user gets full config with all variant fields", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT"))
      
      await syncOmoConfig()
      
      expect(mockWriteFile).toHaveBeenCalled()
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      
      // Verify all variant fields from default config are present
      expect(writtenContent.agents.sisyphus).toEqual({ model: "aicodewith/claude-sonnet-4-6", variant: "max" })
      expect(writtenContent.agents.oracle).toEqual({ model: "aicodewith/gpt-5.2", variant: "high" })
      expect(writtenContent.agents.momus).toEqual({ model: "aicodewith/gpt-5.2", variant: "medium" })
      expect(writtenContent.agents.build).toEqual({ model: "aicodewith/claude-opus-4-6-20260205" })
      expect(writtenContent.categories.ultrabrain).toEqual({ model: "aicodewith/gpt-5.3-codex", variant: "high" })
      expect(writtenContent.categories.deep).toEqual({ model: "aicodewith/gpt-5.3-codex", variant: "medium" })
      expect(writtenContent.categories.quick).toEqual({ model: "aicodewith/claude-sonnet-4-6" })
    })

    it("preserves user extra fields alongside variant during sync", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { 
            model: "aicodewith/claude-sonnet-4-6",
            variant: "max",
            temperature: 0.7,
          },
        },
        categories: {},
      }))
      
      await syncOmoConfig()
      
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
      // All fields should be preserved
      expect(writtenContent.agents.sisyphus.model).toBe("aicodewith/claude-sonnet-4-6")
      expect(writtenContent.agents.sisyphus.variant).toBe("max")
      expect(writtenContent.agents.sisyphus.temperature).toBe(0.7)
    })
  })

  describe("no changes needed", () => {
    it("does not write file when config is already in sync", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(JSON.stringify({
        agents: {
          sisyphus: { model: "aicodewith/claude-sonnet-4-6", variant: "max" },
          oracle: { model: "aicodewith/gpt-5.2", variant: "high" },
          build: { model: "aicodewith/claude-opus-4-6-20260205" },
          momus: { model: "aicodewith/gpt-5.2", variant: "medium" },
        },
        categories: {
          quick: { model: "aicodewith/claude-sonnet-4-6" },
          ultrabrain: { model: "aicodewith/gpt-5.3-codex", variant: "high" },
          deep: { model: "aicodewith/gpt-5.3-codex", variant: "medium" },
        },
      }))
      
      await syncOmoConfig()
      
      expect(mockWriteFile).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("handles fetch failure gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))
      
      await expect(syncOmoConfig()).resolves.not.toThrow()
      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it("handles fetch timeout gracefully", async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 100)
      }))
      
      await expect(syncOmoConfig()).resolves.not.toThrow()
    })

    it("handles invalid JSON in user config gracefully", async () => {
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue("{ invalid json }")
      
      await expect(syncOmoConfig()).resolves.not.toThrow()
      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it("handles write failure gracefully", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT"))
      mockWriteFile.mockRejectedValue(new Error("Permission denied"))
      
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      
      await expect(syncOmoConfig()).resolves.not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})

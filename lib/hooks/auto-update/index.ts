import type { PluginInput } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import {
  getCachedVersion,
  getLocalDevVersion,
  findPluginEntry,
  getLatestVersion,
  updatePinnedVersion,
  log,
} from "./checker"
import { invalidatePackage } from "./cache"
import { PACKAGE_NAME, CACHE_DIR } from "./constants"
import type { AutoUpdateOptions } from "./types"

const DISPLAY_NAME = "AICodewith"
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

export function createAutoUpdateHook(ctx: PluginInput, options: AutoUpdateOptions = {}) {
  const { autoUpdate = true, showStartupToast = true } = options

  let hasChecked = false

  return {
    event: async ({ event }: { event: { type: string; properties?: unknown } }) => {
      if (event.type !== "session.created") return
      if (hasChecked) return

      const props = event.properties as { info?: { parentID?: string } } | undefined
      if (props?.info?.parentID) return

      hasChecked = true

      const cachedVersion = getCachedVersion()
      const localDevVersion = getLocalDevVersion(ctx.directory)
      const displayVersion = localDevVersion ?? cachedVersion ?? "unknown"

      if (localDevVersion) {
        if (showStartupToast) {
          showStartupToastWithSpinner(ctx, `${displayVersion} (dev)`, "Local development mode").catch(() => {})
        }
        log("Local development mode, skipping update check")
        return
      }

      if (showStartupToast) {
        showStartupToastWithSpinner(ctx, displayVersion, "GPT-5.2 · Claude · Gemini").catch(() => {})
      }

      runBackgroundUpdateCheck(ctx, autoUpdate).catch((err) => {
        log("Background update check failed:", err)
      })
    },
  }
}

async function showStartupToastWithSpinner(ctx: PluginInput, version: string, message: string): Promise<void> {
  const totalDuration = 3000
  const frameInterval = 100
  const totalFrames = Math.floor(totalDuration / frameInterval)

  for (let i = 0; i < totalFrames; i++) {
    const spinner = SPINNER_FRAMES[i % SPINNER_FRAMES.length]
    await ctx.client.tui
      .showToast({
        body: {
          title: `${spinner} ${DISPLAY_NAME} v${version}`,
          message,
          variant: "info" as const,
          duration: frameInterval + 50,
        },
      })
      .catch(() => {})
    await new Promise(resolve => setTimeout(resolve, frameInterval))
  }
  log(`Startup toast shown: v${version}`)
}

async function runBackgroundUpdateCheck(ctx: PluginInput, autoUpdate: boolean): Promise<void> {
  const pluginInfo = findPluginEntry(ctx.directory)
  if (!pluginInfo) {
    log("Plugin not found in config")
    return
  }

  const cachedVersion = getCachedVersion()
  const currentVersion = cachedVersion ?? pluginInfo.pinnedVersion
  if (!currentVersion) {
    log("No version found (cached or pinned)")
    return
  }

  const latestVersion = await getLatestVersion()
  if (!latestVersion) {
    log("Failed to fetch latest version")
    return
  }

  if (currentVersion === latestVersion) {
    log("Already on latest version")
    return
  }

  log(`Update available: ${currentVersion} → ${latestVersion}`)

  if (!autoUpdate) {
    await showUpdateAvailableToast(ctx, currentVersion, latestVersion)
    log("Auto-update disabled, notification only")
    return
  }

  if (pluginInfo.isPinned) {
    const updated = updatePinnedVersion(pluginInfo.configPath, pluginInfo.entry, latestVersion)
    if (!updated) {
      await showUpdateAvailableToast(ctx, currentVersion, latestVersion)
      log("Failed to update pinned version in config")
      return
    }
    log(`Config updated: ${pluginInfo.entry} → ${PACKAGE_NAME}@${latestVersion}`)
  }

  invalidatePackage(PACKAGE_NAME)

  const installSuccess = await runBunInstallSafe()

  if (installSuccess) {
    await showAutoUpdatedToast(ctx, currentVersion, latestVersion)
    log(`Update installed: ${currentVersion} → ${latestVersion}`)
  } else {
    await showUpdateAvailableToast(ctx, currentVersion, latestVersion)
    log("bun install failed; update not installed (falling back to notification-only)")
  }
}

async function runBunInstallSafe(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const child = spawn("bun", ["install"], {
        cwd: CACHE_DIR,
        stdio: "ignore",
        detached: true,
      })

      child.unref()

      child.on("close", (code) => {
        resolve(code === 0)
      })

      child.on("error", () => {
        resolve(false)
      })

      setTimeout(() => resolve(false), 30000)
    } catch (err) {
      log("bun install error:", err)
      resolve(false)
    }
  })
}

async function showUpdateAvailableToast(
  ctx: PluginInput,
  currentVersion: string,
  latestVersion: string
): Promise<void> {
  await ctx.client.tui
    .showToast({
      body: {
        title: `${DISPLAY_NAME} Update Available`,
        message: `v${currentVersion} → v${latestVersion}\nRestart OpenCode to apply.`,
        variant: "info" as const,
        duration: 8000,
      },
    })
    .catch(() => {})
  log(`Update available toast shown: v${latestVersion}`)
}

async function showAutoUpdatedToast(
  ctx: PluginInput,
  oldVersion: string,
  newVersion: string
): Promise<void> {
  await ctx.client.tui
    .showToast({
      body: {
        title: `${DISPLAY_NAME} Updated!`,
        message: `v${oldVersion} → v${newVersion}\nRestart OpenCode to apply.`,
        variant: "success" as const,
        duration: 8000,
      },
    })
    .catch(() => {})
  log(`Auto-updated toast shown: v${oldVersion} → v${newVersion}`)
}

export type { AutoUpdateOptions } from "./types"
export { invalidatePackage } from "./cache"

export interface NpmDistTags {
  latest: string
  [key: string]: string
}

export interface OpencodeConfig {
  plugin?: string[]
  [key: string]: unknown
}

export interface PackageJson {
  version: string
  name?: string
  [key: string]: unknown
}

export interface UpdateCheckResult {
  needsUpdate: boolean
  currentVersion: string | null
  latestVersion: string | null
  isLocalDev: boolean
  isPinned: boolean
}

export interface AutoUpdateOptions {
  autoUpdate?: boolean
  showStartupToast?: boolean
}

export interface PluginEntryInfo {
  entry: string
  isPinned: boolean
  pinnedVersion: string | null
  configPath: string
}

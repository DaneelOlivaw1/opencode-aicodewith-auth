export interface ConfigOptions {
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh"
  reasoningSummary?: "auto" | "concise" | "detailed" | "off" | "on"
  textVerbosity?: "low" | "medium" | "high"
  include?: string[]
}

export interface ReasoningConfig {
  effort: "none" | "minimal" | "low" | "medium" | "high" | "xhigh"
  summary: "auto" | "concise" | "detailed" | "off" | "on"
}

export interface InputItem {
  id?: string
  type: string
  role: string
  content?: unknown
  [key: string]: unknown
}

export interface RequestBody {
  model: string
  store?: boolean
  stream?: boolean
  instructions?: string
  input?: InputItem[]
  tools?: unknown
  reasoning?: Partial<ReasoningConfig>
  text?: {
    verbosity?: "low" | "medium" | "high"
  }
  include?: string[]
  providerOptions?: {
    openai?: Partial<ConfigOptions> & { store?: boolean; include?: string[] }
    [key: string]: unknown
  }
  prompt_cache_key?: string
  max_output_tokens?: number
  max_completion_tokens?: number
  [key: string]: unknown
}

export interface SSEEventData {
  type: string
  response?: unknown
  [key: string]: unknown
}

export interface CacheMetadata {
  etag: string | null
  tag: string
  lastChecked: number
  url: string
}

export interface GitHubRelease {
  tag_name: string
  [key: string]: unknown
}

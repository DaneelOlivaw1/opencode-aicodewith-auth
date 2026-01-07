export const PLUGIN_NAME = "opencode-aicodewith-auth"
export const PROVIDER_ID = "aicodewith"
export const AUTH_METHOD_LABEL = "AICodewith API Key"
export const CODEX_BASE_URL = "https://api.aicodewith.com/chatgpt/v1"
export const AICODEWITH_ANTHROPIC_BASE_URL = "https://api.aicodewith.com"
export const AICODEWITH_GEMINI_BASE_URL = "https://api.aicodewith.com/gemini_cli"
export const GEMINI_USER_AGENT = "GeminiCLI/v25.2.1 (darwin; arm64)"
export const GEMINI_API_CLIENT = "google-genai-sdk/1.30.0 gl-node/v25.2.1"
export const GEMINI_PRIVILEGED_USER_ID_ENV = "AICODEWITH_GEMINI_USER_ID"
export const USER_AGENT =
  "codex_cli_rs/0.77.0 (Mac OS 26.2.0; arm64) iTerm.app/3.6.6"
export const ORIGINATOR = "codex_cli_rs"

export const HEADER_NAMES = {
  AUTHORIZATION: "authorization",
  ORIGINATOR: "originator",
  SESSION_ID: "session_id",
  CONVERSATION_ID: "conversation_id",
  USER_AGENT: "user-agent",
  ACCEPT: "accept",
  CONTENT_TYPE: "content-type",
  OPENAI_BETA: "openai-beta",
  CHATGPT_ACCOUNT_ID: "chatgpt-account-id",
  X_GOOG_API_KEY: "x-goog-api-key",
  X_GOOG_API_CLIENT: "x-goog-api-client",
  X_GEMINI_PRIVILEGED_USER_ID: "x-gemini-api-privileged-user-id",
} as const

# opencode-aicodewith-auth

An OpenCode plugin for AICodewith authentication. Access multiple AI models including GPT-5.2, Claude, and Gemini through AICodewith API.

## Features

- Unified authentication for multiple AI providers
- Support for the following models:
  - `gpt-5.2-codex` - OpenAI GPT-5.2 Codex
  - `gpt-5.2` - OpenAI GPT-5.2
  - `claude-sonnet-4-5-20250929` - Anthropic Claude Sonnet 4.5
  - `claude-opus-4-5-20251101` - Anthropic Claude Opus 4.5
  - `gemini-3-pro-high` - Google Gemini 3 Pro High
- Automatic configuration injection

## Installation

### From npm

Add the plugin to your OpenCode configuration file:

```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

Then restart OpenCode. The plugin will be automatically installed.

### From source

1. Clone the repository:
```bash
git clone https://github.com/user/opencode-aicodewith-auth.git
cd opencode-aicodewith-auth
```

2. Install dependencies:
```bash
bun install
```

3. Build the plugin:
```bash
bun run build
```

## Configuration

After installation, the plugin will automatically configure the `aicodewith` provider in your OpenCode config. You can also manually configure it:

```json title="~/.config/opencode/opencode.json"
{
  "provider": {
    "aicodewith": {
      "name": "AICodewith",
      "api": "https://api.openai.com/v1",
      "env": ["AICODEWITH_API_KEY"],
      "models": {
        "gpt-5.2-codex": {},
        "gpt-5.2": {},
        "claude-sonnet-4-5-20250929": {},
        "claude-opus-4-5-20251101": {},
        "gemini-3-pro-high": {}
      }
    }
  }
}
```

## Authentication

Set your AICodewith API key as an environment variable:

```bash
export AICODEWITH_API_KEY=sk-your-api-key
```

Or authenticate via the OpenCode TUI by selecting the "AICodewith API Key" authentication method.

## Usage

Once configured, you can select any of the supported models in OpenCode:

```bash
opencode --model gpt-5.2-codex
```

Or switch models within the TUI.

## Development

### Build

```bash
bun run build
```

### Type check

```bash
bun run typecheck
```

### Clean

```bash
bun run clean
```

## License

MIT

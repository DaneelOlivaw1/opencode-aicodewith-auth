<!--
opencode-aicodewith-auth
An OpenCode auth plugin for AICodewith
-->

<div align="center">

# opencode-aicodewith-auth

**AICodewith authentication plugin for OpenCode.**
One login → multiple models (GPT, Claude, Gemini) via AICodewith.

[![npm version](https://img.shields.io/npm/v/opencode-aicodewith-auth?label=npm&style=flat-square)](https://www.npmjs.com/package/opencode-aicodewith-auth)
[![npm downloads](https://img.shields.io/npm/dt/opencode-aicodewith-auth?style=flat-square)](https://www.npmjs.com/package/opencode-aicodewith-auth)
[![license](https://img.shields.io/badge/license-MIT-black?style=flat-square)](#license)

</div>

---

## What this does

OpenCode supports many providers. This plugin adds **AICodewith** as an auth/provider layer, so you can:

- keep **one** provider config
- authenticate once
- select from multiple models inside OpenCode

If your team ships across providers (OpenAI/Anthropic/Google), this keeps setup predictable.

---

## Supported models

Out of the box, the plugin exposes these model identifiers:

- `gpt-5.2-codex`
- `gpt-5.2`
- `claude-sonnet-4-5-20250929`
- `claude-opus-4-5-20251101`
- `gemini-3-pro-high`

> You can extend/override models in `opencode.json` if AICodewith adds more.

---

## Installation

### For humans

Add the plugin to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

Then restart OpenCode.

---

### For LLM agents (copy-paste)

Open a fresh session in your coding agent (OpenCode / Claude Code / Cursor / etc.) and paste:

```
Install and configure opencode-aicodewith-auth by following the instructions here: https://raw.githubusercontent.com/DaneelOlivaw1/opencode-aicodewith-auth/main/README.ai.md
```

The AI will guide you through the entire setup, including API key registration if needed.

---

## Authentication

### Option A — Environment variable (recommended)

Set your API key:

```bash
export AICODEWITH_API_KEY="sk-your-api-key"
```

To persist it:

* **macOS/Linux**: add the export line to `~/.zshrc` or `~/.bashrc`, then restart your terminal
* **Windows (PowerShell)**:

  ```powershell
  setx AICODEWITH_API_KEY "sk-your-api-key"
  ```

---

### Option B — OpenCode TUI

OpenCode → Auth/Login → choose:

**AICodewith API Key**

(If your plugin registers a dedicated auth method, this will appear automatically.)

---

## Provider configuration

### Auto-injected (default)

After installation, the plugin will inject an `aicodewith` provider into your OpenCode config automatically.

If you prefer to manage it manually, use this template:

```json
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

---

## Usage

Pick a model at launch:

```bash
opencode --model gpt-5.2-codex
```

Or switch inside the OpenCode UI.

---

## Troubleshooting

### "Provider not found: aicodewith"

* Confirm the plugin is actually loaded:
  * check your `opencode.json` has `"plugin": ["opencode-aicodewith-auth"]`
* restart OpenCode after editing config

### "Missing env var AICODEWITH_API_KEY"

* run `echo $AICODEWITH_API_KEY` (macOS/Linux) or `echo %AICODEWITH_API_KEY%` (Windows cmd)
* if you set it in a shell rc file, **restart the terminal**

### Requests hit the wrong endpoint

* check your `provider.aicodewith.api`
* make sure it points to your AICodewith API base, not a placeholder

---

## Security notes

* Treat `AICODEWITH_API_KEY` like a password.
* Don't commit keys into git.
* Prefer OS keychain / CI secrets / env vars.

---

## Development

Clone and build:

```bash
git clone https://github.com/DaneelOlivaw1/opencode-aicodewith-auth.git
cd opencode-aicodewith-auth
bun install
bun run build
```

Type check:

```bash
bun run typecheck
```

Clean:

```bash
bun run clean
```

---

## License

MIT

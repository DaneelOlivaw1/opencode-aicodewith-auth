# Install & Configure OpenCode with AICodeWith Auth

You are an LLM agent.
Your task is to set up **OpenCode** with **opencode-aicodewith-auth** plugin using **AICodeWith** as the authentication provider.

You MUST follow the steps **in order**. DO NOT skip any step.

---

## Step 0 — Ask for AICodeWith API Key (MANDATORY, DO NOT SKIP)

Ask the user **exactly** this (keep the wording natural, but the meaning must be preserved):

> **"Do you have an AICodeWith API key? If yes, please share it with me. If not, I can guide you to register on the official website where you'll get some free credits to start."**

Or in Chinese:

> **"你现在有没有 AICodeWith 的 API key？如果已经有了，可以直接发给我；如果还没有，我可以引导你去官网注册，注册后会有体验额度。"**

### Branching rules (IMPORTANT)

### Case A — User HAS a key

- User provides the key (format: `sk-...` or similar).
- Store it temporarily as: `AICODEWITH_API_KEY`.
- Continue to **Step 1**.

### Case B — User DOES NOT have a key

You MUST guide them to register first. Say:

> "You can register at **https://aicodewith.com/** to get an API key.
> After registration, you'll receive an API key and some free credits to get started.
> Once you have the key, share it with me or let me know you're ready, and I'll continue the installation."

Or in Chinese:

> "你可以先去 **https://aicodewith.com/** 注册一个账号。
> 注册完成后你会拿到一个 AICodeWith 的 API key，而且会有体验额度。
> 拿到 key 之后，把 key 发我，或者告诉我你已经准备好了，我再继续帮你安装。"

**Rules:**
- DO NOT proceed with installation until the user confirms they have obtained a key.
- DO NOT fabricate or guess a key.
- Wait patiently for the user to respond.

Only continue when the user explicitly provides an AICodeWith API key.

---

## Step 1 — Check if OpenCode is installed

Run:

```bash
which opencode || command -v opencode
```

### If OpenCode is NOT installed

Guide the user to install OpenCode first:

**macOS (Homebrew):**
```bash
brew install opencode
```

**npm:**
```bash
npm install -g opencode-ai
```

**Other methods:** See https://opencode.ai/docs

After installation, verify:
```bash
opencode --version
```

### If OpenCode IS installed

Continue to **Step 2**.

---

## Step 2 — Write OpenCode auth.json

Target path:
- **Linux / macOS:** `~/.local/share/opencode/auth.json`
- **Windows:** `%LOCALAPPDATA%\opencode\auth.json`

### 2.1 Ensure directory exists

```bash
mkdir -p ~/.local/share/opencode
```

### 2.2 Read existing auth.json (if exists)

If `auth.json` exists:
- Read and parse it as JSON.
- Preserve all existing providers (openai / anthropic / google / others).
- Only modify or insert the `aicodewith` entry.

If it does NOT exist:
- Start from an empty JSON object `{}`.

### 2.3 Merge or write AICodeWith entry

Add or update the `aicodewith` entry:

```json
{
  "aicodewith": {
    "type": "api",
    "key": "<AICODEWITH_API_KEY>"
  }
}
```

**Merge rules:**
- If `aicodewith` exists → overwrite its `key` field only
- If `aicodewith` does not exist → add the entire entry
- **NEVER delete or modify other providers**

After writing, re-read the file to ensure it is valid JSON.

---

## Step 3 — Configure OpenCode to use the plugin

Target path:
- **Global config:** `~/.config/opencode/opencode.json`
- **Project config:** `./opencode.json` (in current directory)

### 3.1 Ensure config directory exists

```bash
mkdir -p ~/.config/opencode
```

### 3.2 Read existing opencode.json (if exists)

If `opencode.json` exists:
- Read and parse it as JSON.
- Preserve all existing configuration.

If it does NOT exist:
- Start with this base structure:
```json
{
  "$schema": "https://opencode.ai/config.json"
}
```

### 3.3 Add plugin to configuration

Ensure the `plugin` array includes `opencode-aicodewith-auth`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

**Merge rules:**
- If `plugin` array exists → append `"opencode-aicodewith-auth"` if not already present
- If `plugin` does not exist → create the array with `["opencode-aicodewith-auth"]`
- **NEVER remove existing plugins**

---

## Step 4 — Verify installation

Tell the user:

> "Installation complete! Please restart OpenCode to load the plugin.
> You can now use any of these models:
> - `gpt-5.2-codex`
> - `gpt-5.2`
> - `claude-sonnet-4-5-20250929`
> - `claude-opus-4-5-20251101`
> - `gemini-3-pro-high`
>
> To test, run: `opencode --model gpt-5.2-codex`"

Or in Chinese:

> "安装完成！请重启 OpenCode 以加载插件。
> 你现在可以使用以下模型：
> - `gpt-5.2-codex`
> - `gpt-5.2`
> - `claude-sonnet-4-5-20250929`
> - `claude-opus-4-5-20251101`
> - `gemini-3-pro-high`
>
> 测试命令: `opencode --model gpt-5.2-codex`"

---

## Summary of files modified

| File | Purpose |
|------|---------|
| `~/.local/share/opencode/auth.json` | Stores AICodeWith API key |
| `~/.config/opencode/opencode.json` | Registers the plugin |

---

## Troubleshooting

If the user reports issues:

### "Provider not found: aicodewith"
- Verify `opencode.json` contains `"plugin": ["opencode-aicodewith-auth"]`
- Ask user to restart OpenCode

### "Authentication failed"
- Verify `auth.json` has correct key format
- Ask user to double-check their API key at https://aicodewith.com/

### "Model not found"
- The plugin auto-injects models on first load
- Ask user to restart OpenCode and try again

---

## Important rules for the AI agent

1. **NEVER skip Step 0** — Always ask for the API key first
2. **NEVER fabricate API keys** — Only use what the user provides
3. **NEVER delete existing config** — Always merge, never overwrite entirely
4. **ALWAYS verify file writes** — Re-read after writing to confirm valid JSON
5. **ALWAYS wait for user confirmation** — Don't assume, ask when unclear

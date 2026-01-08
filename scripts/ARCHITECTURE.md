<!--
📌 SELF-MAINTAINING: When this folder changes, update this file.
-->

# scripts/ Architecture

**Installation and setup automation.**

```
scripts/
└── install-opencode-aicodewith.js  # postinstall hook for config auto-injection
```

---

## File Index

| File | Input | Output | Role |
|------|-------|--------|------|
| `install-opencode-aicodewith.js` | Existing opencode.json | Updated opencode.json | Auto-injects provider config and plugin entry on npm install |

---

## What It Does

1. Reads `~/.config/opencode/opencode.json` (or creates if missing)
2. Adds `aicodewith` provider with all supported models
3. Adds plugin to `plugin` array
4. Writes back only if changes were made

**Model Display Names:**
- `gpt-5.2-codex` → "GPT-5.2 Codex"
- `claude-sonnet-4-5` → "Claude Sonnet 4.5"
- etc.

**Model Capabilities:**
- All models declare `modalities: { input: ["text", "image"], output: ["text"] }`
- This enables image input support in OpenCode UI

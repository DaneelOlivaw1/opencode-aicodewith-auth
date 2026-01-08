# OpenCode AICodewith Auth Plugin - 安装指南

**一次登录 → 多模型可用（GPT-5.2、Claude、Gemini）**

本指南帮助你安装和配置 OpenCode 的 `opencode-aicodewith-auth` 插件。

---

## 目录

- [这是什么？](#这是什么)
- [支持的模型](#支持的模型)
- [安装](#安装)
  - [人类用户](#人类用户)
  - [LLM Agent](#llm-agent)
- [使用方法](#使用方法)
- [配置选项](#配置选项)
- [与 oh-my-opencode 集成](#与-oh-my-opencode-集成)
- [故障排查](#故障排查)

---

## 这是什么？

OpenCode 支持多种 AI 提供商。这个插件使用 **AICodewith** 作为统一的认证层,让你可以:

- 只维护 **一份** 配置
- 只认证 **一次**
- 在 OpenCode 中自由切换多个模型

如果你需要同时使用 OpenAI / Anthropic / Google 的模型,这个插件能让配置变得简单可控。

---

## 支持的模型

开箱即用,插件提供以下模型:

| 模型 ID | 说明 |
|---------|------|
| `aicodewith/gpt-5.2-codex` | GPT-5.2 代码优化版 |
| `aicodewith/gpt-5.2` | 最新 GPT-5.2 |
| `aicodewith/claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `aicodewith/claude-opus-4-5-20251101` | Claude Opus 4.5 |
| `aicodewith/gemini-3-pro-high` | Gemini 3 Pro |

> AICodewith 后续支持更多模型时,插件也会同步更新。

---

## 安装

### 人类用户

**让 AI 帮你装（推荐）**

打开你的 AI 编程助手（OpenCode / Claude Code / Cursor 等），粘贴这句话:

```
帮我安装配置 opencode-aicodewith-auth，按照这个说明操作: https://raw.githubusercontent.com/DaneelOlivaw1/opencode-aicodewith-auth/main/README.ai.md
```

AI 会引导你完成整个安装流程。

---

<details>
<summary><strong>手动安装</strong></summary>

#### 第一步: 获取 API Key

1. 访问 **https://aicodewith.com/**
2. 注册账号
3. 注册后会获得 API Key 和体验额度

#### 第二步: 添加插件

编辑 OpenCode 配置文件 (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

#### 第三步: 重启 OpenCode

关闭并重新打开 OpenCode 以加载插件。

#### 第四步: 配置认证

**方法一: 使用 auth.json（推荐用于自动化）**

编辑 `~/.local/share/opencode/auth.json`:

```json
{
  "aicodewith": {
    "type": "api",
    "key": "你的_API_KEY"
  }
}
```

**方法二: 交互式登录**

在终端运行:

```bash
opencode auth login
```

按提示操作:
1. 选择 **Other**
2. 供应商名称: `aicodewith`
3. 输入你的 API key
4. 回车完成

![认证流程](assets/auth-login.png)

</details>

---

### LLM Agent

<details>
<summary>Instructions for LLM Agents (click to expand)</summary>

If you're an LLM Agent helping set up opencode-aicodewith-auth, follow these steps:

### Step 0: Ask user for API key

Ask the user:

> **"Do you have an AICodewith API key?"**
>
> - If yes, please provide it
> - If no, please visit **https://aicodewith.com/** to register (you'll get free trial credits)
>
> Please let me know and I'll continue with the setup.

**Rules:**
- DO NOT proceed until the user provides a valid API key
- DO NOT fabricate or guess a key
- Wait for the user to respond

### Step 1: Check OpenCode installation

```bash
which opencode || command -v opencode
```

If OpenCode is NOT installed:

**macOS (Homebrew):**
```bash
brew install opencode
```

**npm:**
```bash
npm install -g opencode-ai
```

Verify:
```bash
opencode --version
```

### Step 2: Configure authentication

**Target path:**
- Linux/macOS: `~/.local/share/opencode/auth.json`

**2.1 Ensure directory exists**

```bash
mkdir -p ~/.local/share/opencode
```

**2.2 Read existing auth.json**

If `auth.json` exists:
- Read and parse it as JSON
- Preserve all existing providers
- Only modify the `aicodewith` entry

If it does NOT exist:
- Start from empty JSON object `{}`

**2.3 Write AICodewith entry**

Add or update the `aicodewith` entry:

```json
{
  "aicodewith": {
    "type": "api",
    "key": "<USER_PROVIDED_API_KEY>"
  }
}
```

**Merge rules:**
- If `aicodewith` exists → overwrite its `key` field only
- If `aicodewith` does not exist → add the entire entry
- **NEVER delete or modify other providers**

### Step 3: Configure OpenCode plugin

**Target path:**
- Global config: `~/.config/opencode/opencode.json`

**3.1 Ensure config directory exists**

```bash
mkdir -p ~/.config/opencode
```

**3.2 Read existing opencode.json**

If `opencode.json` exists:
- Read and parse it as JSON
- Preserve all existing configuration

If it does NOT exist:
- Start with base structure:
```json
{
  "$schema": "https://opencode.ai/config.json"
}
```

**3.3 Add plugin to configuration**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

**Merge rules:**
- If `plugin` array exists → append `"opencode-aicodewith-auth"` if not present
- If `plugin` does not exist → create array with `["opencode-aicodewith-auth"]`
- **NEVER remove existing plugins**

### Step 4: Verify installation

Tell the user:

> "Installation complete! Please restart OpenCode to load the plugin.
> You can now use any of these models:
> - `aicodewith/gpt-5.2-codex`
> - `aicodewith/gpt-5.2`
> - `aicodewith/claude-sonnet-4-5-20250929`
> - `aicodewith/claude-opus-4-5-20251101`
> - `aicodewith/gemini-3-pro-high`
>
> To test, run: `opencode --model aicodewith/gpt-5.2-codex`"

### Summary of changes

| File | Description |
|------|-------------|
| `~/.local/share/opencode/auth.json` | Stores AICodewith API key |
| `~/.config/opencode/opencode.json` | Registers the plugin |

### Important rules for AI agents

1. **NEVER skip Step 0** — Always ask for API key first
2. **NEVER fabricate API keys** — Only use what user provides
3. **NEVER delete existing config** — Always merge, never overwrite
4. **ALWAYS verify file writes** — Re-read after writing to confirm valid JSON
5. **ALWAYS wait for user confirmation** — Don't assume, ask when unclear

</details>

---

## 使用方法

启动 OpenCode 并指定模型:

```bash
opencode --model aicodewith/gpt-5.2-codex
```

或者在 OpenCode 界面中切换模型。

---

## 配置选项

### Provider 配置

插件会自动在你的 OpenCode 配置中注入 `aicodewith` provider。

如果你想手动管理，可以在 `~/.config/opencode/opencode.json` 中使用这个模板:

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

### 模型选择

可以在 `opencode.json` 中设置默认模型:

```json
{
  "model": "aicodewith/gpt-5.2-codex"
}
```

或使用环境变量:

```bash
export OPENCODE_MODEL=aicodewith/gpt-5.2-codex
```

---

## 与 oh-my-opencode 集成

如果你使用 [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode),可以配置其 agent 使用 AICodewith 的模型。

### 安装 oh-my-opencode

```bash
bunx oh-my-opencode install --no-tui --claude=no --chatgpt=no --gemini=no
```

### 配置 oh-my-opencode 使用 AICodewith 模型

编辑 `~/.config/opencode/oh-my-opencode.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  "agents": {
    "Sisyphus": {
      "model": "aicodewith/claude-opus-4-5-20251101"
    },
    "oracle": {
      "model": "aicodewith/gpt-5.2"
    },
    "librarian": {
      "model": "aicodewith/claude-sonnet-4-5-20250929"
    },
    "explore": {
      "model": "aicodewith/gemini-3-pro-high"
    },
    "frontend-ui-ux-engineer": {
      "model": "aicodewith/gemini-3-pro-high"
    },
    "document-writer": {
      "model": "aicodewith/gemini-3-pro-high"
    },
    "multimodal-looker": {
      "model": "aicodewith/gemini-3-pro-high"
    }
  }
}
```

这样配置后:
- **Sisyphus** (主编排 agent) 使用 Claude Opus 4.5
- **oracle** (架构、代码审查) 使用 GPT-5.2
- **librarian** (文档查询) 使用 Claude Sonnet 4.5
- **explore** (快速代码探索) 使用 Gemini 3 Pro
- **frontend-ui-ux-engineer** (前端 UI) 使用 Gemini 3 Pro
- **document-writer** (技术文档) 使用 Gemini 3 Pro
- **multimodal-looker** (视觉内容分析) 使用 Gemini 3 Pro

### 完整配置示例

在 `~/.config/opencode/opencode.json` 中:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-aicodewith-auth",
    "oh-my-opencode"
  ],
  "model": "aicodewith/claude-opus-4-5-20251101"
}
```

---

## 故障排查

### "Provider not found: aicodewith"

- 确认 `opencode.json` 中有 `"plugin": ["opencode-aicodewith-auth"]`
- 修改配置后记得重启 OpenCode

### "Authentication failed"

- 确认 `auth.json` 中的 key 格式正确
- 在 https://aicodewith.com/ 重新检查你的 API key
- 确保 key 以正确的前缀开头

### "Model not found"

- 插件会在首次加载时自动注入模型
- 重启 OpenCode 后重试
- 检查模型名称是否包含 `aicodewith/` 前缀

### 速率限制或配额错误

- 在 https://aicodewith.com/ 检查账户余额
- 考虑升级套餐以获得更高限额

---

## 卸载

如需移除插件:

1. **从 OpenCode 配置中移除**

   编辑 `~/.config/opencode/opencode.json`，从 `plugin` 数组中删除 `"opencode-aicodewith-auth"`。

2. **移除认证信息（可选）**

   ```bash
   # 从 auth.json 中移除 AICodewith 条目
   # 编辑 ~/.local/share/opencode/auth.json，删除 "aicodewith" 部分
   ```

3. **验证移除**

   ```bash
   opencode --version
   # 插件应该不再被加载
   ```

---

## 许可证

MIT

---

## 相关链接

- GitHub: https://github.com/DaneelOlivaw1/opencode-aicodewith-auth
- NPM: https://www.npmjs.com/package/opencode-aicodewith-auth
- AICodewith: https://aicodewith.com/
- oh-my-opencode: https://github.com/code-yeongyu/oh-my-opencode

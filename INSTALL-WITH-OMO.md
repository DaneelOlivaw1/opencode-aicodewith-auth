# 安装 opencode-aicodewith-auth + oh-my-opencode

**适用于 LLM Agent 自动化安装**

## 重要说明：OpenCode ≠ Claude Code

| 工具 | 命令 | 说明 |
|------|------|------|
| **OpenCode** | `opencode` | 开源 AI 编码工具，支持多模型、插件系统、oh-my-opencode |
| **Claude Code** | `claude` | Anthropic 官方 CLI，仅支持 Claude 模型，无插件系统 |

**本插件适用于 OpenCode，不是 Claude Code。**

如果你在 Claude Code 中执行本安装流程：
- ✅ 可以完成所有安装步骤（安装 OpenCode、配置文件等）
- ⚠️ 安装完成后，需要在**新终端窗口**中运行 `opencode` 来使用 Sisyphus
- ❌ 无法在 Claude Code 内部直接使用 oh-my-opencode 的功能

---

## 任务目标

帮助用户同时安装和配置：
1. `opencode-aicodewith-auth` - AICodewith 认证插件
2. `oh-my-opencode` - OpenCode 增强功能套件

配置完成后，用户只需要一个 AICodewith 账号，就能使用 oh-my-opencode 的所有功能（Sisyphus、oracle、librarian 等 agents），无需订阅 Claude Pro / ChatGPT Plus / Gemini。

---

## 安装步骤

### Step 0: 询问用户 API Key

问用户：

> **"你现在有没有 AICodewith 的 API key？"**
>
> - 如果已经有了，请直接发给我
> - 如果还没有，请去 **https://aicodewith.com/** 注册（按住 Command 点击链接可直接跳转），注册后会有免费体验额度
>
> 请告诉我你的情况，我会继续帮你配置。

**重要规则：**
- 必须等用户提供有效的 API key 才能继续
- 不要编造或猜测 API key
- 不要跳过这一步

---

### Step 1: 检查 OpenCode 是否已安装

```bash
which opencode || command -v opencode
```

If OpenCode is NOT installed:

**Recommended (one-line install):**
```bash
curl -fsSL https://opencode.ai/install | bash
```

**Alternative methods:**

**npm:**
```bash
npm i -g opencode-ai
```

**bun:**
```bash
bun add -g opencode-ai
```

**Homebrew (official tap):**
```bash
brew install anomalyco/tap/opencode
```

**Arch Linux (AUR):**
```bash
paru -S opencode
```

Verify:
```bash
opencode --version
```

---

### Step 2: 安装 opencode-aicodewith-auth

#### 2.1 配置 auth.json

**目标路径：** `~/.local/share/opencode/auth.json`

1. 确保目录存在：
```bash
mkdir -p ~/.local/share/opencode
```

2. 读取现有 auth.json（如果存在）并保留所有其他 provider
3. 添加或更新 `aicodewith` 条目：

```json
{
  "aicodewith": {
    "type": "api",
    "key": "<用户提供的API_KEY>"
  }
}
```

#### 2.2 配置 opencode.json

**目标路径：** `~/.config/opencode/opencode.json`

1. 确保目录存在：
```bash
mkdir -p ~/.config/opencode
```

2. 读取现有配置并保留所有现有设置
3. 添加插件到 `plugin` 数组（如果不存在则创建）：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

**合并规则：**
- 如果 `plugin` 数组已存在 → 追加 `"opencode-aicodewith-auth"`（如果还没有）
- 如果 `plugin` 不存在 → 创建数组
- **绝不删除现有插件**

---

### Step 3: 安装 oh-my-opencode

运行安装命令（不启用 Claude/ChatGPT/Gemini 的内置认证）：

```bash
bunx oh-my-opencode install --no-tui --claude=no --chatgpt=no --gemini=no
```

**注意：** 
- `--no-tui` 避免交互界面阻塞
- 所有认证参数设为 `no`，因为我们使用 AICodewith 作为统一认证层

---

### Step 4: 配置 oh-my-opencode 使用 AICodewith 模型

#### 4.1 创建或更新 oh-my-opencode.json

**目标路径：** `~/.config/opencode/oh-my-opencode.json`

读取现有配置（如果存在）并合并，否则创建新文件：

```json
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  "google_auth": false,
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
      "model": "aicodewith/gemini-3-pro"
    },
    "frontend-ui-ux-engineer": {
      "model": "aicodewith/gemini-3-pro"
    },
    "document-writer": {
      "model": "aicodewith/gemini-3-pro"
    },
    "multimodal-looker": {
      "model": "aicodewith/gemini-3-pro"
    }
  }
}
```

> **⚠️ 极其重要：Agent 名称必须完全一致，区分大小写！**
>
> 以下 agent 名称是 oh-my-opencode 内部固定的，**不能改动、不能用同义词替换**：
>
> | 正确名称 | 作用 | 常见错误写法 |
> |---------|------|-------------|
> | `Sisyphus` | 主编排 agent | ~~orchestrator~~, ~~main~~, ~~sisyphus~~ |
> | `oracle` | 架构顾问 | ~~architect~~, ~~advisor~~ |
> | `librarian` | 文档/代码查询 | ~~researcher~~, ~~search~~ |
> | `explore` | 代码探索 | ~~explorer~~, ~~codebase~~ |
> | `frontend-ui-ux-engineer` | 前端 UI/UX | ~~frontend~~, ~~ui~~ |
> | `document-writer` | 文档编写 | ~~docs~~, ~~writer~~ |
> | `multimodal-looker` | 多模态分析 | ~~vision~~, ~~multimodal~~ |
>
> **错误示例（绝对不要这样写）：**
> ```json
> {
>   "agents": {
>     "orchestrator": { "model": "..." },
>     "architect": { "model": "..." },
>     "default": { "model": "..." }
>   }
> }
> ```
> 上述配置会导致 agents 使用默认的 Anthropic API 而不是 AICodewith！

**配置说明：**
- `google_auth: false` - 禁用 oh-my-opencode 的内置 Google 认证
- 所有 agents 的 `model` 都使用 `aicodewith/` 前缀
- 模型分配策略：
  - **Sisyphus**（主编排）→ Claude Opus 4.5（最强推理能力）
  - **oracle**（架构/审查）→ GPT-5.2（逻辑推理）
  - **librarian**（文档查询）→ Claude Sonnet 4.5（深度理解）
  - **explore**（快速探索）→ Gemini 3 Pro（快速响应）
  - **frontend/document/multimodal** → Gemini 3 Pro（创意任务）

#### 4.2 更新 opencode.json 添加 oh-my-opencode 插件

确保 `~/.config/opencode/opencode.json` 中的 `plugin` 数组同时包含两个插件：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-aicodewith-auth",
    "oh-my-opencode"
  ]
}
```

可选：设置默认模型

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

### Step 5: 验证安装

#### 5.1 检查 npm 源

```bash
npm config get registry
```

如果输出不是 `https://registry.npmjs.org/`（例如显示 taobao、cnpm 等镜像），需要在最终提示中加入警告。

#### 5.2 告诉用户安装完成

**如果用户在 Claude Code 中执行安装：**

> **"安装完成！🎉"**
>
> 所有配置文件已就绪。由于你当前在 Claude Code 中，需要在**新终端窗口**启动 OpenCode：
>
> **macOS/Linux:**
> ```bash
> # 打开新终端窗口，运行：
> opencode
> ```
>
> **Windows:**
> ```powershell
> # 打开新 PowerShell 窗口，运行：
> opencode
> ```
>
> 启动后输入 `ultrawork` 或 `ulw` 关键词，即可使用 Sisyphus 编排多个 agents 并行工作。

**如果用户在 OpenCode 或普通终端中执行安装，且使用官方 npm 源：**

> **"安装完成！🎉"**
>
> 你现在拥有：
> - ✅ AICodewith 认证插件（支持 GPT-5.2、Claude、Gemini）
> - ✅ oh-my-opencode 增强功能（Sisyphus、oracle、librarian 等 agents）
> - ✅ 所有功能只需一个 AICodewith 账号，无需订阅多个服务
>
> **测试命令：**
> ```bash
> opencode --model aicodewith/claude-opus-4-5
> ```
>
> **开始使用：**
> - 输入 `ultrawork` 或 `ulw` 关键词，Sisyphus 会自动编排多个 agents 并行工作
> - 各个 agent 会自动使用最适合的模型完成任务
> - 详细功能请参考：https://github.com/code-yeongyu/oh-my-opencode

**如果使用镜像源，额外添加警告：**

> ⚠️ **注意**: 检测到你使用的是非官方 npm 源。如果启动 OpenCode 时遇到插件加载失败（如 `BunInstallFailedError`），可能是镜像源尚未同步最新版本。解决方法：
> ```bash
> # 临时切换到官方源
> npm config set registry https://registry.npmjs.org/
> # 重启 OpenCode
> # 之后可以改回原来的源
> ```

---

### Step 6: 文件清单总结

告诉用户已修改的文件：

| 文件路径 | 说明 |
|---------|------|
| `~/.local/share/opencode/auth.json` | 存储 AICodewith API key |
| `~/.config/opencode/opencode.json` | 注册两个插件 |
| `~/.config/opencode/oh-my-opencode.json` | 配置 agents 使用 AICodewith 模型 |

---

## 重要规则（LLM Agent 必读）

1. **NEVER skip Step 0** — 必须先获取 API key
2. **NEVER fabricate API keys** — 只使用用户提供的真实 key
3. **NEVER delete existing config** — 始终合并配置，不要覆盖
4. **NEVER run interactive commands without tmux** — `opencode auth login` 会阻塞
5. **ALWAYS verify file writes** — 写入后重新读取确认 JSON 有效
6. **ALWAYS preserve user settings** — 保留用户现有的所有配置
7. **Use `bunx` or `npx`** — 如果 bunx 不可用，回退到 npx
8. **ALWAYS check npm registry and warn if using mirrors** — 运行 `npm config get registry`，如果不是官方源则在最终提示中警告用户可能存在同步问题
9. **NEVER invent agent names** — Agent 名称必须严格使用 `Sisyphus`、`oracle`、`librarian`、`explore`、`frontend-ui-ux-engineer`、`document-writer`、`multimodal-looker`，不能用 `orchestrator`、`architect`、`default` 等自创名称
10. **ALWAYS copy the exact JSON from Step 4** — oh-my-opencode.json 的内容必须严格按照文档中的 JSON 复制，不要修改 agent 名称

---

## 故障排查

### "BunInstallFailedError" 或插件加载失败

这通常是因为 npm 镜像源尚未同步最新版本。告诉用户：

> "这个问题通常是因为你的 npm 镜像源还没有同步最新版本。解决方法：
> ```bash
> # 临时切换到官方源
> npm config set registry https://registry.npmjs.org/
> # 重启 OpenCode
> # 之后可以改回原来的源
> ```"

### "Provider not found: aicodewith"
- 检查 `opencode.json` 是否包含 `"opencode-aicodewith-auth"`
- 重启 OpenCode

### "Plugin not found: oh-my-opencode"
- 检查 `opencode.json` 是否包含 `"oh-my-opencode"`
- 重新运行 `bunx oh-my-opencode install --no-tui --claude=no --chatgpt=no --gemini=no`

### Agents 仍使用默认模型（如 Anthropic API）

这是最常见的配置错误，通常是因为 **agent 名称写错了**。

**排查步骤：**

1. 检查 `oh-my-opencode.json` 中的 agent 名称是否正确：
```bash
cat ~/.config/opencode/oh-my-opencode.json
```

2. **正确的 agent 名称**（区分大小写）：
   - `Sisyphus` ✅ （不是 `orchestrator`、`main`、`sisyphus`）
   - `oracle` ✅ （不是 `architect`、`advisor`）
   - `librarian` ✅
   - `explore` ✅ （不是 `explorer`）
   - `frontend-ui-ux-engineer` ✅
   - `document-writer` ✅
   - `multimodal-looker` ✅

3. 如果名称错误，删除并重新创建配置文件：
```bash
rm ~/.config/opencode/oh-my-opencode.json
```
然后按照 Step 4 重新创建正确的配置。

4. 确保模型名称使用 `aicodewith/` 前缀
5. 重启 OpenCode

### bunx 命令失败
- Ubuntu/Debian Snap 用户：改用 `npx oh-my-opencode install ...`
- 或重新安装 Bun：`curl -fsSL https://bun.sh/install | bash`

---

## 成功标志

安装成功后，用户应该能够：
1. 运行 `opencode --model aicodewith/claude-opus-4-5-20251101` 正常启动
2. 在 OpenCode 中看到所有 AICodewith 模型可选
3. 使用 `ultrawork` 关键词触发 Sisyphus 编排多个 agents
4. 各个 agent（oracle、librarian、explore 等）正常工作
5. 只需一个 AICodewith 账号，无需其他订阅

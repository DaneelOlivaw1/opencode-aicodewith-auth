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

### Step 1: 按照官方文档安装 oh-my-opencode

**📖 官方安装文档：** https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/refs/heads/master/README.md

按照官方文档的 "For LLM Agents" 部分进行安装，**但有以下关键修改**：

#### 1.1 在 Step 0（询问订阅）时

当官方文档询问用户是否有 Claude/ChatGPT/Gemini 订阅时，**全部回答 NO**：

```bash
bunx oh-my-opencode install --no-tui --claude=no --openai=no --gemini=no --copilot=no
```

> **⚠️ 注意：** 正确的 flag 是 `--openai=no`，不是 `--chatgpt=no`。请参考 oh-my-opencode 官方文档确认最新的 CLI 参数。

**原因：** 我们使用 AICodewith 作为统一认证层，不需要这些订阅。

#### 1.2 跳过官方文档的 Step 4（Configure Authentication）

**不要执行** 官方文档中的认证步骤（Anthropic、Google Gemini、OpenAI 的 OAuth 登录）。

这些步骤是为有订阅的用户准备的，我们将在下一步使用 AICodewith 认证代替。

#### 1.3 验证插件缓存安装（关键步骤）

**OpenCode 从 `~/.cache/opencode/packages/` 目录加载插件**，而不是从 `~/.config/opencode/node_modules/` 或 `~/.opencode/node_modules/`。

安装完成后，必须检查插件是否已正确安装到缓存目录：

```bash
ls ~/.cache/opencode/packages/
```

应该能看到类似以下目录：
```
opencode-aicodewith-auth@latest/
oh-my-opencode@<version>/
```

**检查目录是否为空：**

```bash
ls ~/.cache/opencode/packages/opencode-aicodewith-auth@latest/node_modules/opencode-aicodewith-auth/dist/index.js
```

如果文件不存在或目录为空，说明 OpenCode 的自动安装失败了，需要手动安装：

```bash
cd ~/.cache/opencode/packages/opencode-aicodewith-auth@latest
bun init -y
bun add opencode-aicodewith-auth
```

对 oh-my-opencode 也做同样的操作（注意替换为实际版本号）：

```bash
cd ~/.cache/opencode/packages/oh-my-opencode@<version>
bun init -y
bun add oh-my-opencode@<version>
```

**验证方法：** 检查 OpenCode 启动日志确认插件是否加载成功：

```bash
# 查看最新日志
ls -lt ~/.local/share/opencode/log/ | head -2
# 搜索插件加载相关信息
grep -E "plugin|aicodewith|error|fail" ~/.local/share/opencode/log/<最新日志文件>
```

如果看到类似以下错误，说明缓存目录安装有问题：
```
ENOENT: no such file or directory, open '.../.cache/opencode/packages/opencode-aicodewith-auth@latest/node_modules/package.json'
```

---

### Step 2: 安装 opencode-aicodewith-auth 插件

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

#### 2.2 添加插件到 opencode.json

**目标路径：** `~/.config/opencode/opencode.json`

在现有的 `plugin` 数组中添加 `"opencode-aicodewith-auth"`（放在 `"oh-my-opencode"` 之前）：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-aicodewith-auth",
    "oh-my-opencode"
  ]
}
```

**合并规则：**
- 如果 `plugin` 数组已存在 → 追加 `"opencode-aicodewith-auth"`（如果还没有）
- **绝不删除现有插件**

---

### Step 3: 修改 oh-my-opencode 配置，使用 AICodewith 模型

**目标路径：** `~/.config/opencode/oh-my-opencode.json`

Step 1 安装完成后，官方会自动生成这个配置文件。现在需要修改它，把所有 agent 的模型都改成 AICodewith 的模型。

#### 3.1 读取现有配置

```bash
cat ~/.config/opencode/oh-my-opencode.json
```

#### 3.2 了解可用的 AICodewith 模型

| 模型 | 擅长领域 |
|-----|---------|
| `aicodewith/claude-opus-4-6-20260205` | 最强推理能力，适合主编排、复杂决策 |
| `aicodewith/gpt-5.2` | 架构设计、逻辑推理、代码审查 |
| `aicodewith/gemini-3-pro` | 前端 UI/UX、创意任务、视觉相关 |
| `aicodewith/claude-sonnet-4-5-20250929` | 通用任务、文档、探索、杂活 |

#### 3.3 修改 agents 配置

**修改规则：**

1. 设置 `"google_auth": false`（禁用内置 Google 认证）
2. 遍历 `agents` 对象中的**每一个 agent**
3. **根据每个 agent 的名称和角色描述，选择最合适的 AICodewith 模型：**
   - 主编排 agent（如 `Sisyphus`）→ `aicodewith/claude-opus-4-6-20260205`
   - 架构/审查/策略相关 agent（如 `oracle`）→ `aicodewith/gpt-5.2`
   - 前端/UI/UX/视觉相关 agent（如 `frontend-ui-ux-engineer`）→ `aicodewith/gemini-3-pro`
   - 其他通用 agent → `aicodewith/claude-sonnet-4-5-20250929`

> **⚠️ 重要：不要硬编码 agent 列表！**
>
> 官方可能会新增 agent，所以必须**遍历配置文件中已有的所有 agent**，根据其角色智能选择模型。

#### 3.4 示例：修改后的配置

```json
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  "google_auth": false,
  "agents": {
    "Sisyphus": {
      "model": "aicodewith/claude-opus-4-6-20260205"
    },
    "oracle": {
      "model": "aicodewith/gpt-5.2"
    },
    "frontend-ui-ux-engineer": {
      "model": "aicodewith/gemini-3-pro"
    },
    "librarian": {
      "model": "aicodewith/claude-sonnet-4-5-20250929"
    },
    "explore": {
      "model": "aicodewith/claude-sonnet-4-5-20250929"
    },
    "document-writer": {
      "model": "aicodewith/claude-sonnet-4-5-20250929"
    },
    "multimodal-looker": {
      "model": "aicodewith/claude-sonnet-4-5-20250929"
    }
  }
}
```

#### 3.5 保留其他配置

修改时**只改 `google_auth` 和 `agents` 里的 `model`**，保留配置文件中的其他所有设置（如 `disabled_hooks`、`ralph_loop` 等）

---

### Step 4: 验证安装

#### 4.1 检查插件加载

启动 OpenCode 后，检查最新日志确认插件已加载：

```bash
ls -lt ~/.local/share/opencode/log/ | head -2
grep -E "plugin|aicodewith" ~/.local/share/opencode/log/<最新日志文件> | head -10
```

**成功标志：** 日志中应出现 `service=plugin path=opencode-aicodewith-auth loading plugin`，且没有 `ENOENT` 或 `failed to resolve plugin server entry` 错误。

#### 4.2 检查 npm 源

```bash
npm config get registry
```

如果输出不是 `https://registry.npmjs.org/`（例如显示 taobao、cnpm 等镜像），需要在最终提示中加入警告。

#### 4.3 告诉用户安装完成

**如果用户在 Claude Code 中执行安装：**

> **"安装完成！🎉"**
>
> 所有配置文件已就绪。由于你当前在 Claude Code 中，需要在**新终端窗口**启动 OpenCode：
>
> ```bash
> opencode
> ```
>
> 启动后输入 `ultrawork` 或 `ulw` 关键词，即可使用 Sisyphus 编排多个 agents 并行工作。

**如果用户在 OpenCode 或普通终端中执行安装：**

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
> npm config set registry https://registry.npmjs.org/
> # 重启 OpenCode，之后可以改回原来的源
> ```

---

## 文件清单总结

| 文件路径 | 说明 |
|---------|------|
| `~/.local/share/opencode/auth.json` | 存储 AICodewith API key |
| `~/.config/opencode/opencode.json` | 注册两个插件 |
| `~/.config/opencode/oh-my-opencode.json` | 配置 agents 使用 AICodewith 模型 |
| `~/.cache/opencode/packages/` | **OpenCode 插件实际加载目录**（关键） |

---

## 重要规则（LLM Agent 必读）

1. **NEVER skip Step 0** — 必须先获取 API key
2. **NEVER fabricate API keys** — 只使用用户提供的真实 key
3. **NEVER delete existing config** — 始终合并配置，不要覆盖
4. **NEVER run interactive commands without tmux** — `opencode auth login` 会阻塞
5. **ALWAYS verify file writes** — 写入后重新读取确认 JSON 有效
6. **ALWAYS preserve user settings** — 保留用户现有的所有配置
7. **ALWAYS follow official oh-my-opencode README first** — 本文档只补充 AICodewith 认证部分
8. **NEVER hardcode agent list** — 必须遍历官方配置中的所有 agent，根据角色智能选择模型
9. **ALWAYS choose model by agent role** — 主编排用 Opus，架构用 GPT，前端用 Gemini，其他用 Sonnet
10. **ALWAYS check logs after installation** — 查看 `~/.local/share/opencode/log/` 确认插件加载成功，不要假设配置写入就等于插件生效
11. **ALWAYS verify plugin cache** — 确认 `~/.cache/opencode/packages/` 下的插件目录不为空，如为空需手动安装

---

## 故障排查

### "BunInstallFailedError" 或插件加载失败

```bash
# 临时切换到官方源
npm config set registry https://registry.npmjs.org/
# 重启 OpenCode，之后可以改回原来的源
```

### "Provider not found: aicodewith" 或 "model aicodewith/xxx is not valid"

这通常意味着 `opencode-aicodewith-auth` 插件没有被 OpenCode 加载。

**排查步骤：**

1. 检查 `opencode.json` 是否包含 `"opencode-aicodewith-auth"`
2. 检查插件缓存目录是否为空：
```bash
ls ~/.cache/opencode/packages/opencode-aicodewith-auth@latest/node_modules/opencode-aicodewith-auth/dist/index.js
```
3. 如果文件不存在，手动安装到缓存目录：
```bash
cd ~/.cache/opencode/packages/opencode-aicodewith-auth@latest
bun init -y
bun add opencode-aicodewith-auth
```
4. 检查启动日志确认插件加载：
```bash
grep -E "plugin|aicodewith|error" ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1)
```
5. 重启 OpenCode

### 插件缓存目录为空

OpenCode 在启动时会尝试自动安装插件到 `~/.cache/opencode/packages/`。如果自动安装失败（常见于 `@opencode-ai/plugin` 版本不匹配），目录会被创建但内容为空。

**解决方法：**

```bash
# 手动安装 opencode-aicodewith-auth
cd ~/.cache/opencode/packages/opencode-aicodewith-auth@latest
bun init -y
bun add opencode-aicodewith-auth

# 手动安装 oh-my-opencode（替换为实际版本号）
cd ~/.cache/opencode/packages/oh-my-opencode@<version>
bun init -y
bun add oh-my-opencode@<version>
```

**如何确认版本号：**
```bash
ls ~/.cache/opencode/packages/ | grep oh-my-opencode
```

### Agents 仍使用默认模型

检查 `oh-my-opencode.json`：
1. 确认 `google_auth` 设为 `false`
2. 确认**每个** agent 的 model 都有 `aicodewith/` 前缀
3. 如果官方新增了 agent 但没有配置 model，添加 `aicodewith/claude-sonnet-4-5-20250929`

---

## 成功标志

1. 启动日志中 `opencode-aicodewith-auth` 插件加载成功（无 ENOENT 错误）
2. 运行 `opencode --model aicodewith/claude-opus-4-6-20260205` 正常启动
3. 使用 `ultrawork` 关键词触发 Sisyphus 编排多个 agents
4. 只需一个 AICodewith 账号，无需其他订阅

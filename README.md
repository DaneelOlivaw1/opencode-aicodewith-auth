<!--
opencode-aicodewith-auth
An OpenCode auth plugin for AICodewith
-->

<div align="center">

# opencode-aicodewith-auth

**OpenCode 的 AICodewith 认证插件**

一次登录 → 多模型可用（GPT-5.2、Claude、Gemini）

**🚀 配合 [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) 使用，只需一个账号即可获得完整 Agent 团队！**

[![npm version](https://img.shields.io/npm/v/opencode-aicodewith-auth?label=npm&style=flat-square)](https://www.npmjs.com/package/opencode-aicodewith-auth)
[![npm downloads](https://img.shields.io/npm/dt/opencode-aicodewith-auth?style=flat-square)](https://www.npmjs.com/package/opencode-aicodewith-auth)
[![license](https://img.shields.io/badge/license-MIT-black?style=flat-square)](#license)

</div>

---

## 这是什么

OpenCode 支持多种 AI 提供商。这个插件把 **AICodewith** 作为统一的认证层，让你可以：

- 只维护 **一份** 配置
- 只认证 **一次**  
- 在 OpenCode 里自由切换多个模型（GPT-5.2、Claude Opus 4.5、Gemini 3 Pro）

**🎯 特别适合搭配 [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode)：**
- ❌ **不需要** Claude Pro 订阅
- ❌ **不需要** ChatGPT Plus/Pro 订阅  
- ❌ **不需要** Google Gemini 订阅
- ✅ **只需要** AICodewith 一个账号
- ✅ 获得完整的 Agent 团队（Sisyphus、oracle、librarian、explore 等）

---

## 支持的模型

开箱即用，插件提供以下模型：

| 模型 ID | 说明 | 适合场景 |
|---------|------|---------|
| `aicodewith/gpt-5.2-codex` | GPT-5.2 代码优化版 | 日常编程、代码生成 |
| `aicodewith/gpt-5.2` | 最新 GPT-5.2 | 架构设计、逻辑推理 |
| `aicodewith/claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | 代码审查、文档查询 |
| `aicodewith/claude-opus-4-5-20251101` | Claude Opus 4.5 | 复杂任务、深度思考 |
| `aicodewith/gemini-3-pro-high` | Gemini 3 Pro | 前端 UI、多模态任务 |

> AICodewith 后续支持更多模型时，插件也会同步更新。

**💡 提示**: 配合 [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) 使用，可以让不同的 agent 自动选择最适合的模型！

---

## 快速开始

### 🔥 方案一：完整安装（推荐 - 包含 oh-my-opencode）

**只需 AICodewith 一个账号，即可获得 oh-my-opencode 的全部功能！**

复制下面这句话，发给你的 AI 编程助手（OpenCode / Claude Code / Cursor 等）：

```
帮我安装配置 opencode-aicodewith-auth 和 oh-my-opencode，按照这个说明操作：https://raw.githubusercontent.com/DaneelOlivaw1/opencode-aicodewith-auth/main/INSTALL-WITH-OMO.md
```

**AI 会自动帮你：**
- ✅ 安装 `opencode-aicodewith-auth` 插件
- ✅ 安装 `oh-my-opencode` 增强功能（Sisyphus、oracle、librarian 等完整 Agent 团队）
- ✅ 配置所有 agents 使用 AICodewith 模型
- ✅ 完成认证设置

**结果：只需 AICodewith 一个账号，无需订阅 Claude Pro / ChatGPT Plus / Gemini！**

---

### 📦 方案二：单独安装（仅安装认证插件）

如果你只想使用基础的模型切换功能，不需要 oh-my-opencode 的增强特性：

**第一步：** 去 **https://aicodewith.com/** 注册账号，获取 API Key

**第二步：** 复制下面这句话，发给你的 AI 助手：

```
帮我安装配置 opencode-aicodewith-auth，按照这个说明操作：https://raw.githubusercontent.com/DaneelOlivaw1/opencode-aicodewith-auth/main/README.ai.md
```

---

<details>
<summary><strong>手动安装</strong></summary>

#### 1. 添加插件

在你的 OpenCode 配置文件中添加插件：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

#### 2. 重启 OpenCode

关闭并重新打开 OpenCode，让插件生效。

#### 3. 运行认证

在终端运行：

```bash
opencode auth login
```

按提示操作：

1. 选择 **Other**
2. 供应商名称填：`aicodewith`
3. 输入你的 API Key（在 AICodewith 平台创建的 key）
4. 回车完成

![认证流程](assets/auth-login.png)

</details>

---

## Provider 配置

### 自动注入（默认）

安装后，插件会自动在你的 OpenCode 配置中注入 `aicodewith` provider。

如果你想手动管理，可以用这个模板：

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

## 使用

启动时指定模型：

```bash
opencode --model aicodewith/gpt-5.2-codex
```

或者在 OpenCode 界面里切换模型。

### 与 oh-my-opencode 配合使用

如果你安装了 oh-my-opencode，可以这样配置 agents：

编辑 `~/.config/opencode/oh-my-opencode.json`：

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
    }
  }
}
```

这样，所有 oh-my-opencode 的强大功能都会通过 AICodewith 来运行，**只需一个账号！**

详细配置说明请查看 [INSTALL.md](INSTALL.md)。

---

## 常见问题

### "Provider not found: aicodewith"

* 确认 `opencode.json` 中有 `"plugin": ["opencode-aicodewith-auth"]`
* 修改配置后记得重启 OpenCode

---

## 开发

克隆并构建：

```bash
git clone https://github.com/DaneelOlivaw1/opencode-aicodewith-auth.git
cd opencode-aicodewith-auth
bun install
bun run build
```

类型检查：

```bash
bun run typecheck
```

清理：

```bash
bun run clean
```

---

## License

MIT

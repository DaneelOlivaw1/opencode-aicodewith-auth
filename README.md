<!--
opencode-aicodewith-auth
An OpenCode auth plugin for AICodewith

📌 MAINTAINER NOTICE:
Any architecture, feature, or convention changes MUST update:
1. This file (if affecting overall structure)
2. Relevant subdirectory's ARCHITECTURE.md
3. Affected file headers (input/output/pos comments)
-->

<div align="center">

# opencode-aicodewith-auth

**OpenCode 的 AICodewith 认证插件**

一次登录 → 多模型可用（GPT-5.2、Claude、Gemini）

[![npm version](https://img.shields.io/npm/v/opencode-aicodewith-auth?label=npm&style=flat-square)](https://www.npmjs.com/package/opencode-aicodewith-auth)
[![npm downloads](https://img.shields.io/npm/dt/opencode-aicodewith-auth?style=flat-square)](https://www.npmjs.com/package/opencode-aicodewith-auth)
[![license](https://img.shields.io/badge/license-MIT-black?style=flat-square)](#license)

</div>

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     opencode-aicodewith-auth                     │
├─────────────────────────────────────────────────────────────────┤
│  index.ts          Plugin entry, auth hook, config injection    │
│  provider.ts       Multi-provider factory (OpenAI/Claude/Gemini)│
├─────────────────────────────────────────────────────────────────┤
│  lib/              Core library modules                          │
│  ├── constants.ts      Global constants & header names          │
│  ├── types.ts          Shared TypeScript interfaces             │
│  ├── logger.ts         Debug/request logging utilities          │
│  ├── prompts/          Codex prompt fetching & bridging         │
│  └── request/          Request transformation & response handling│
├─────────────────────────────────────────────────────────────────┤
│  scripts/          Installation automation                       │
│  └── install-opencode-aicodewith.js   postinstall config writer │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Request → OpenCode → Plugin Auth Hook → Route by Model:
  ├── gpt-*/codex-* → Codex API (transform + headers)
  ├── claude-*      → Anthropic API (URL rewrite)
  └── gemini-*      → Gemini API (headers + URL build)
```

---

## 支持的模型

| 模型 ID | 显示名称 | 图片输入 | 适合场景 |
|---------|---------|:-------:|---------|
| `aicodewith/gpt-5.3-codex` | GPT-5.3 Codex | ✅ | 日常编程、代码生成 |
| `aicodewith/gpt-5.2` | GPT-5.2 | ✅ | 架构设计、逻辑推理 |
| `aicodewith/claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | ✅ | 代码审查、文档查询 |
| `aicodewith/claude-opus-4-6-20260205` | Claude Opus 4.6 | ✅ | 复杂任务、深度思考 |
| `aicodewith/gemini-3-pro` | Gemini 3 Pro | ✅ | 前端 UI、多模态任务 |

---

## 快速开始

### 🔥 方案一：完整安装（推荐 - 包含 oh-my-opencode）

```
帮我安装配置 opencode-aicodewith-auth 和 oh-my-opencode，按照这个说明操作：https://raw.githubusercontent.com/DaneelOlivaw1/opencode-aicodewith-auth/main/INSTALL-WITH-OMO.md
```

### 📦 方案二：单独安装

```
帮我安装配置 opencode-aicodewith-auth，按照这个说明操作：https://raw.githubusercontent.com/DaneelOlivaw1/opencode-aicodewith-auth/main/README.ai.md
```

<details>
<summary><strong>手动安装</strong></summary>

1. 编辑 `~/.config/opencode/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

2. 运行 `opencode auth login` → 选择 Other → 输入 `aicodewith` → 输入 API Key

</details>

---

## 使用

```bash
opencode --model aicodewith/gpt-5.2-codex
```

---

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `AICODEWITH_DISABLE_OMO_SYNC` | - | 设为 `1` 或 `true` 禁用 oh-my-opencode 配置自动同步 |

### 禁用 OMO 配置同步

插件默认会自动同步 oh-my-opencode 的 agent/category 配置。如果你想完全自定义 OMO 配置，可以禁用此功能：

```bash
# 在 shell 配置文件中添加（如 ~/.zshrc 或 ~/.bashrc）
export AICODEWITH_DISABLE_OMO_SYNC=1
```

或启动时指定：

```bash
AICODEWITH_DISABLE_OMO_SYNC=1 opencode
```

---

## 开发

```bash
git clone https://github.com/DaneelOlivaw1/opencode-aicodewith-auth.git
cd opencode-aicodewith-auth
bun install
bun run build
bun run typecheck
```

---

## File Index

| File | Role | Description |
|------|------|-------------|
| `index.ts` | **Entry** | Plugin main, auth hook, config auto-injection |
| `provider.ts` | **Core** | Multi-provider language model factory |
| `lib/` | **Library** | See [lib/ARCHITECTURE.md](lib/ARCHITECTURE.md) |
| `scripts/` | **Tooling** | See [scripts/ARCHITECTURE.md](scripts/ARCHITECTURE.md) |

---

## License

MIT

<!--
opencode-aicodewith-auth
An OpenCode auth plugin for AICodewith
-->

<div align="center">

# opencode-aicodewith-auth

**OpenCode 的 AICodewith 认证插件**
一次登录 → 多模型可用（GPT、Claude、Gemini）

[![npm version](https://img.shields.io/npm/v/opencode-aicodewith-auth?label=npm&style=flat-square)](https://www.npmjs.com/package/opencode-aicodewith-auth)
[![npm downloads](https://img.shields.io/npm/dt/opencode-aicodewith-auth?style=flat-square)](https://www.npmjs.com/package/opencode-aicodewith-auth)
[![license](https://img.shields.io/badge/license-MIT-black?style=flat-square)](#license)

</div>

---

## 这是什么

OpenCode 支持多种 AI 提供商。这个插件把 **AICodewith** 作为统一的认证层，让你可以：

- 只维护 **一份** 配置
- 只认证 **一次**
- 在 OpenCode 里自由切换多个模型

如果你需要同时用 OpenAI / Anthropic / Google 的模型，这个插件能让配置变得简单可控。

---

## 支持的模型

开箱即用，插件提供以下模型：

- `gpt-5.2-codex`
- `gpt-5.2`
- `claude-sonnet-4-5-20250929`
- `claude-opus-4-5-20251101`
- `gemini-3-pro-high`

> 如果 AICodewith 后续支持更多模型，你可以在 `opencode.json` 里自行扩展。

---

## 安装

### 手动安装

在你的 OpenCode 配置文件中添加插件：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-aicodewith-auth"]
}
```

然后重启 OpenCode。

---

### 让 AI 帮你装（复制粘贴）

打开你的 AI 编程助手（OpenCode / Claude Code / Cursor 等），粘贴这句话：

```
帮我安装配置 opencode-aicodewith-auth，按照这个说明操作：https://raw.githubusercontent.com/DaneelOlivaw1/opencode-aicodewith-auth/main/README.ai.md
```

AI 会引导你完成整个安装流程，包括注册获取 API Key（如果你还没有的话）。

---

## 认证

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

---

### 还没有 API Key？

去 **https://aicodewith.com/** 注册账号，注册后会获得 API Key 和体验额度。

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
opencode --model gpt-5.2-codex
```

或者在 OpenCode 界面里切换模型。

---

## 常见问题

### "Provider not found: aicodewith"

* 确认 `opencode.json` 中有 `"plugin": ["opencode-aicodewith-auth"]`
* 修改配置后记得重启 OpenCode

### "Missing env var AICODEWITH_API_KEY"

* 运行 `echo $AICODEWITH_API_KEY` 检查环境变量是否生效
* 如果是写在 shell 配置文件里的，**重启终端**

### 请求打到了错误的地址

* 检查 `provider.aicodewith.api` 配置
* 确保指向正确的 AICodewith API 地址

---

## 安全提示

* 把 `AICODEWITH_API_KEY` 当密码一样保护
* 不要把 Key 提交到 Git
* 建议使用系统钥匙串 / CI Secrets / 环境变量

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

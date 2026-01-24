# OpenCode Version Switcher - Quick Setup

## 使用方法

### 直接使用

```bash
# 查看当前版本
./scripts/switch-version.sh status

# 切换到开发版本（使用本地代码）
./scripts/switch-version.sh dev

# 切换到线上版本（使用 npm 安装的版本）
./scripts/switch-version.sh prod

# 显示帮助
./scripts/switch-version.sh help
```

### 添加快捷命令（推荐）

添加以下内容到你的 `~/.zshrc` 或 `~/.bashrc`:

```bash
# OpenCode AICodewith Auth - Version Switcher
alias oc-switch='/Users/wangboyi/project/opencode/opencode-aicodewith-auth/scripts/switch-version.sh'
```

然后重新加载配置:

```bash
source ~/.zshrc  # 如果使用 zsh
# 或
source ~/.bashrc  # 如果使用 bash
```

之后就可以使用简短命令了:

```bash
oc-switch status   # 查看当前版本
oc-switch dev      # 切换到开发版本
oc-switch prod     # 切换到线上版本
```

## 工作流程

### 开发新功能时

```bash
# 1. 切换到开发版本
oc-switch dev

# 2. 修改代码
# ... 编辑 index.ts, lib/ 等文件 ...

# 3. 构建
bun run build

# 4. 重启 OpenCode 测试

# 5. 满意后切回线上版本
oc-switch prod
```

### 使用线上稳定版本时

```bash
# 切换到线上版本
oc-switch prod

# 重启 OpenCode
```

## 注意事项

- 切换版本后需要重启 OpenCode 才能生效
- 开发版本需要手动运行 `bun run build` 构建
- 脚本会自动备份配置文件到 `opencode.json.bak`

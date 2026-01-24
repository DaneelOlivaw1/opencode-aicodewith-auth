#!/bin/bash

# OpenCode AICodewith Auth - Version Switcher
# 快速切换本地开发版本和线上版本

CONFIG_FILE="$HOME/.config/opencode/opencode.json"
DEV_PATH="file:///Users/wangboyi/project/opencode/opencode-aicodewith-auth"
PROD_PATH="file:///Users/wangboyi/.cache/opencode/node_modules/opencode-aicodewith-auth/dist"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查配置文件是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  配置文件不存在: $CONFIG_FILE${NC}"
    exit 1
fi

# 检查当前版本
check_current_version() {
    if grep -q "$DEV_PATH/index.ts" "$CONFIG_FILE"; then
        echo -e "${BLUE}📍 当前版本: 开发版 (dev)${NC}"
        return 10  # dev version
    else
        # 检查是否使用 npm 包名
        if grep -q '"opencode-aicodewith-auth"' "$CONFIG_FILE" | head -10; then
            echo -e "${BLUE}📍 当前版本: 线上版 (prod)${NC}"
            return 11  # prod version
        else
            echo -e "${YELLOW}⚠️  无法识别当前版本${NC}"
            return 1  # error
        fi
    fi
}

# 切换到开发版本
switch_to_dev() {
    echo -e "${GREEN}🔄 切换到开发版本...${NC}"

    # 备份配置文件
    cp "$CONFIG_FILE" "$CONFIG_FILE.bak"

    # 替换 plugin 数组中的引用
    sed -i.tmp 's|"opencode-aicodewith-auth"|"'"$DEV_PATH"'/index.ts"|g' "$CONFIG_FILE"

    # 替换 provider npm 路径
    sed -i.tmp 's|"npm": "'"$PROD_PATH"'/provider.js"|"npm": "'"$DEV_PATH"'/provider.ts"|g' "$CONFIG_FILE"

    # 清理临时文件
    rm -f "$CONFIG_FILE.tmp"

    echo -e "${GREEN}✅ 已切换到开发版本${NC}"
    echo -e "${YELLOW}📝 提示: 修改代码后需要运行 'bun run build'${NC}"
}

# 切换到线上版本
switch_to_prod() {
    echo -e "${GREEN}🔄 切换到线上版本...${NC}"

    # 备份配置文件
    cp "$CONFIG_FILE" "$CONFIG_FILE.bak"

    # 替换 plugin 数组中的引用
    sed -i.tmp 's|"'"$DEV_PATH"'/index.ts"|"opencode-aicodewith-auth"|g' "$CONFIG_FILE"

    # 替换 provider npm 路径
    sed -i.tmp 's|"npm": "'"$DEV_PATH"'/provider.ts"|"npm": "'"$PROD_PATH"'/provider.js"|g' "$CONFIG_FILE"

    # 清理临时文件
    rm -f "$CONFIG_FILE.tmp"

    echo -e "${GREEN}✅ 已切换到线上版本${NC}"
    echo -e "${YELLOW}📝 提示: 请重启 OpenCode 以加载新版本${NC}"
}

# 显示帮助信息
show_help() {
    echo "OpenCode AICodewith Auth - 版本切换工具"
    echo ""
    echo "用法:"
    echo "  $0 dev     切换到开发版本 (本地代码)"
    echo "  $0 prod    切换到线上版本 (npm 安装)"
    echo "  $0 status  查看当前版本"
    echo "  $0 help    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev     # 使用本地开发代码"
    echo "  $0 prod    # 使用 npm 安装的版本"
}

# 主逻辑
case "${1:-status}" in
    dev)
        check_current_version
        CURRENT=$?
        if [ $CURRENT -eq 10 ]; then
            echo -e "${BLUE}ℹ️  已经是开发版本${NC}"
        else
            switch_to_dev
        fi
        ;;
    prod)
        check_current_version
        CURRENT=$?
        if [ $CURRENT -eq 11 ]; then
            echo -e "${BLUE}ℹ️  已经是线上版本${NC}"
        else
            switch_to_prod
        fi
        ;;
    status)
        check_current_version
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${YELLOW}⚠️  未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

exit 0

#!/bin/bash

# =====================================================================
# 🚀 B2B Payment System - 跨国演示级内网穿透脚本 (Cloudflare Tunnel)
# =====================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚡ 正在初始化 Cloudflare 军用级加密隧道...${NC}"

# 1. 检查是否已安装 cloudflared
if ! command -v cloudflared &> /dev/null
then
    echo -e "${RED}❌ 未检测到 cloudflared，正在为您全自动下载并安装 (Linux amd64)...${NC}"
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
    echo -e "${GREEN}✅ cloudflared 安装成功！${NC}"
else
    echo -e "${GREEN}✅ cloudflared 已安装，跳过下载。${NC}"
fi

echo ""
echo -e "${YELLOW}👉 请输入您要暴露给外网的系统端口号 (例如前端通常是 3000，Go后端是 8080):${NC}"
read -p "端口号 [默认 3000]: " PORT
PORT=${PORT:-3000}

echo -e "${GREEN}🚀 正在打通虫洞，将本地 localhost:${PORT} 映射至全球公网...${NC}"
echo -e "${YELLOW}⚠️  注意：稍后终端会输出一个类似 https://xxxx.trycloudflare.com 的网址。${NC}"
echo -e "${YELLOW}🔗 请将该网址发给您的导师即可！(按 Ctrl+C 即可关闭隧道)${NC}"
echo "-------------------------------------------------------------------"

# 2. 启动隧道
cloudflared tunnel --url http://localhost:${PORT}
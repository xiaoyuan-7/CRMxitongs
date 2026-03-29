#!/bin/bash
# CRM 系统本地运行脚本 - 零成本方案
# 适用：Windows / Mac / Linux

echo "=========================================="
echo "  CRM 系统 - 本地运行脚本"
echo "  零成本部署方案"
echo "=========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装："
    echo "  Windows/Mac: https://nodejs.org/"
    echo "  Linux: sudo apt install nodejs npm"
    exit 1
fi

echo "[✓] Node.js 版本：$(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "[错误] 未检测到 npm"
    exit 1
fi

echo "[✓] npm 版本：$(npm -v)"

# 进入后端目录
BACKEND_DIR="/root/.openclaw/workspace/crm-system/backend"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "[错误] 未找到后端目录：$BACKEND_DIR"
    exit 1
fi

cd $BACKEND_DIR

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "[信息] 首次运行，正在安装依赖..."
    npm install
fi

# 检查数据库目录
mkdir -p data

# 启动后端
echo ""
echo "=========================================="
echo "  正在启动 CRM 后端..."
echo "  访问地址：http://localhost:3000"
echo "=========================================="
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

npm start

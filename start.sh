#!/bin/bash

# CRM 系统启动脚本

echo "🚀 启动客户管理系统 CRM..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"
echo "✅ npm 版本：$(npm -v)"

# 进入项目目录
cd "$(dirname "$0")"

# 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ 后端依赖已安装"
fi

# 启动后端服务
echo ""
echo "🔧 启动后端服务..."
node server.js &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ 前端依赖已安装"
fi

# 启动前端服务
echo ""
echo "🎨 启动前端服务..."
echo ""
echo "========================================"
echo "  CRM 系统已启动！"
echo "  前端：http://localhost:3000"
echo "  后端：http://localhost:3001"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动前端
npm start

# 清理
kill $BACKEND_PID 2>/dev/null

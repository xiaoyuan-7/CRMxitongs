#!/bin/bash

# CRM 系统远程访问启动脚本

echo "🚀 启动 CRM 系统（远程访问模式）..."

# 获取服务器 IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo "📡 服务器 IP: $SERVER_IP"

# 停止旧进程
pkill -f "node server.js" 2>/dev/null
pkill -f "python3 -m http.server" 2>/dev/null
sleep 1

# 启动后端
echo "📦 启动后端服务..."
cd /root/.openclaw/workspace/crm-system/backend
nohup node server.js > /tmp/crm-backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

# 启动前端
echo "🎨 启动前端服务..."
cd /root/.openclaw/workspace/crm-system/frontend-simple
nohup python3 -m http.server 3000 --bind 0.0.0.0 > /tmp/crm-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 2

# 检查服务状态
echo ""
echo "=========================================="
echo "  CRM 系统已启动！"
echo "=========================================="
echo "  本地访问：http://localhost:3000"
echo "  远程访问：http://$SERVER_IP:3000"
echo "  后端 API：http://$SERVER_IP:3001"
echo "=========================================="
echo ""
echo "后端 PID: $BACKEND_PID"
echo "前端 PID: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止服务（后台运行不受影响）"
echo "查看日志：tail -f /tmp/crm-backend.log"
echo ""

# 防火墙提示
echo "⚠️  如果无法远程访问，请检查："
echo "   1. 云服务器安全组是否开放 3000 和 3001 端口"
echo "   2. 防火墙设置（运行以下命令开放端口）："
echo "      sudo ufw allow 3000/tcp"
echo "      sudo ufw allow 3001/tcp"
echo ""

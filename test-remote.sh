#!/bin/bash

# CRM 系统远程访问测试脚本

echo "======================================"
echo "  CRM 远程访问测试"
echo "======================================"
echo ""

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "服务器 IP: $SERVER_IP"
echo ""

# 检查端口监听
echo "1. 检查端口监听状态..."
if netstat -tlnp 2>/dev/null | grep -q ":3000" || ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "   ✅ 3000 端口监听正常"
else
    echo "   ❌ 3000 端口未监听"
fi

if netstat -tlnp 2>/dev/null | grep -q ":3001" || ss -tlnp 2>/dev/null | grep -q ":3001"; then
    echo "   ✅ 3001 端口监听正常"
else
    echo "   ❌ 3001 端口未监听"
fi
echo ""

# 本地访问测试
echo "2. 本地访问测试..."
if curl -s --connect-timeout 3 http://localhost:3000 | grep -q "客户管理系统"; then
    echo "   ✅ 本地访问正常"
else
    echo "   ❌ 本地访问失败"
fi
echo ""

# 外网访问测试
echo "3. 外网访问测试..."
if curl -s --connect-timeout 5 http://$SERVER_IP:3000 | grep -q "客户管理系统"; then
    echo "   ✅ 外网访问正常！"
else
    echo "   ❌ 外网访问失败"
    echo ""
    echo "   可能原因："
    echo "   - 安全组规则未生效（等待 1-2 分钟）"
    echo "   - 安全组未正确配置 3000/3001 端口"
    echo "   - 防火墙拦截"
fi
echo ""

echo "======================================"
echo "访问地址："
echo "  本地：http://localhost:3000"
echo "  远程：http://$SERVER_IP:3000"
echo "======================================"

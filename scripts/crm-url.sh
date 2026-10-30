#!/bin/bash
# 打印当前 CRM 公网访问地址 + 登录信息
LOG=/home/admin/.pm2/logs/crm-tunnel-error.log
URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" "$LOG" | tail -1)
PASS=$(cat /home/admin/.openclaw/workspace/scripts/.crm-pass 2>/dev/null)
echo "公网地址: $URL"
echo "用户名  : admin"
echo "密码    : $PASS"
echo "本机地址: http://127.0.0.1:3001 (直连,无需密码)"

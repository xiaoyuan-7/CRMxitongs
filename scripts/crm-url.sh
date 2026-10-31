#!/bin/bash
# 打印当前公网访问地址 + 登录信息
LOG=/home/admin/.pm2/logs/crm-tunnel-error.log
URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" "$LOG" | tail -1)
PASS=$(cat /home/admin/.openclaw/workspace/scripts/.crm-pass 2>/dev/null)
echo "CRM 客户管理: ${URL}/"
echo "行业研究站  : ${URL}/research/"
echo "用户名      : admin"
echo "密码        : $PASS"
echo "本机直连    : http://127.0.0.1:3001 (CRM) / http://127.0.0.1:8000/web/ (研究站)"

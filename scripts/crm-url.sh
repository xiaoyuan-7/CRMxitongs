#!/bin/bash
# 打印当前公网访问地址 + 登录信息
LOG=/home/admin/.pm2/logs/crm-tunnel-error.log
URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" "$LOG" | tail -1)
PASS=$(cat /home/admin/.openclaw/workspace/scripts/.crm-pass 2>/dev/null)
IP=47.96.177.153
echo "CRM 客户管理  : http://$IP:3001/        (推荐，最快)"
echo "工作台        : http://$IP/                      (推荐，根路径自动跳工作台)"
echo "工作台(直链)  : http://$IP/workbench/index.html"
echo "隧道 CRM      : ${URL}/"
echo "隧道 工作台   : ${URL}/workbench/index.html"
echo "隧道 旧路径   : ${URL}/research/workbench/index.html"
echo "登录页        : http://$IP/__login   (手机端走这个，不要等弹窗)"
echo "用户名        : admin"
echo "密码          : $PASS"
echo "本机直连      : http://127.0.0.1:3011 (CRM 后端) / http://127.0.0.1:8000 (静态站)"

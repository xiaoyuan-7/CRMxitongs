#!/bin/bash
# 修改 CRM/研究站登录密码
# 用法: bash scripts/set-pass.sh <新密码>
# 注意：密码是 pm2 进程命令行参数，必须 pm2 delete + start，不能 restart
set -e
cd /home/admin/.openclaw/workspace || exit 1
NEW="$1"
[ -n "$NEW" ] || { echo "用法: bash scripts/set-pass.sh <新密码>"; exit 1; }

printf '%s' "$NEW" > scripts/.crm-pass
chmod 600 scripts/.crm-pass

USER_NAME="${CRM_USER:-admin}"
STATIC_PORT="${CRM_STATIC_PORT:-8000}"
BACKEND_PORT="${CRM_BACKEND_PORT:-3001}"
PROXY_PORT="${CRM_PROXY_PORT:-3100}"

pm2 delete crm-auth >/dev/null 2>&1 || true
pm2 start scripts/auth-proxy.js --name crm-auth -- \
  "$BACKEND_PORT" "$PROXY_PORT" "$USER_NAME" "$NEW" "$STATIC_PORT" >/dev/null
sleep 2
pm2 save >/dev/null 2>&1

# 自检
code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' -u "$USER_NAME:$NEW" "http://127.0.0.1:$PROXY_PORT/api/health")
echo "新密码自检（/api/health）: $code"
if [ "$code" != "200" ]; then
  echo "自检未通过，请检查 pm2 logs crm-auth"
  exit 1
fi
echo "密码已更新为: $NEW"

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
BACKEND_PORT="${CRM_BACKEND_PORT:-3011}"
PROXY_PORT="${CRM_PROXY_PORT:-3100}"
PUBLIC_CRM_PORT="${CRM_PUBLIC_PORT:-3001}"
PUBLIC_WB_PORT="${CRM_PUBLIC_WB_PORT:-80}"

pm2 delete crm-auth >/dev/null 2>&1 || true
pm2 delete crm-public >/dev/null 2>&1 || true
pm2 delete workbench-public >/dev/null 2>&1 || true

PROXY_PASS="$NEW" pm2 start scripts/auth-proxy.js --name crm-auth -- \
  "$BACKEND_PORT" "$PROXY_PORT" "$USER_NAME" "" "$STATIC_PORT" >/dev/null
PROXY_PASS="$NEW" LISTEN_HOST=0.0.0.0 pm2 start scripts/auth-proxy.js --name crm-public -- \
  "$BACKEND_PORT" "$PUBLIC_CRM_PORT" "$USER_NAME" "" 0 >/dev/null
PROXY_PASS="$NEW" LISTEN_HOST=0.0.0.0 PROXY_MODE=static pm2 start scripts/auth-proxy.js --name workbench-public -- \
  0 "$PUBLIC_WB_PORT" "$USER_NAME" "" "$STATIC_PORT" >/dev/null
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

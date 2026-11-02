#!/bin/bash
# 重建三个公网入口（幂等，可重复执行）
#
#   CRM 客户管理   http://47.96.177.153:3001   → auth-proxy(公网) → backend(127.0.0.1:3011)
#   行业研究工作台 http://47.96.177.153/       → auth-proxy(公网, static 模式) → static(8000)
#   隧道入口       https://<hash>.trycloudflare.com → auth-proxy(3100) → backend + /research
#
# 密码从 scripts/.crm-pass 读，经 PROXY_PASS 环境变量传给代理，
# 不再出现在 ps 命令行里。
set -e
cd /home/admin/.openclaw/workspace || exit 1

BACKEND_PORT="${CRM_BACKEND_PORT:-3011}"
TUNNEL_PROXY_PORT="${CRM_PROXY_PORT:-3100}"
STATIC_PORT="${CRM_STATIC_PORT:-8000}"
PUBLIC_CRM_PORT="${CRM_PUBLIC_PORT:-3001}"
PUBLIC_WB_PORT="${CRM_PUBLIC_WB_PORT:-80}"
USER_NAME="${CRM_USER:-admin}"

PASS=$(cat scripts/.crm-pass)
[ -n "$PASS" ] || { echo "缺少 scripts/.crm-pass"; exit 1; }

# ---- 后端：只监听本机，端口挪到 3011，把公网 3001 让给代理 ----
JWT=$(pm2 env 0 | sed -n 's/^JWT_SECRET: //p' | head -1)
INT=$(pm2 env 0 | sed -n 's/^INTERNAL_API_SECRET: //p' | head -1)
if [ -z "$JWT" ] || [ -z "$INT" ]; then echo "取不到后端密钥，终止"; exit 1; fi
PORT="$BACKEND_PORT" HOST=127.0.0.1 JWT_SECRET="$JWT" INTERNAL_API_SECRET="$INT" \
  pm2 restart crm-backend --update-env >/dev/null

# ---- 隧道代理（3100）：CRM + /research 静态站，供 cloudflared 使用 ----
pm2 delete crm-auth >/dev/null 2>&1 || true
PROXY_PASS="$PASS" pm2 start scripts/auth-proxy.js --name crm-auth -- \
  "$BACKEND_PORT" "$TUNNEL_PROXY_PORT" "$USER_NAME" "" "$STATIC_PORT" >/dev/null

# ---- 公网 CRM（3001）：只做 CRM 反代，不暴露静态站 ----
pm2 delete crm-public >/dev/null 2>&1 || true
PROXY_PASS="$PASS" LISTEN_HOST=0.0.0.0 pm2 start scripts/auth-proxy.js --name crm-public -- \
  "$BACKEND_PORT" "$PUBLIC_CRM_PORT" "$USER_NAME" "" 0 >/dev/null

# ---- 公网工作台（80）：纯静态模式，'/' → /workbench/index.html ----
pm2 delete workbench-public >/dev/null 2>&1 || true
PROXY_PASS="$PASS" LISTEN_HOST=0.0.0.0 PROXY_MODE=static pm2 start scripts/auth-proxy.js --name workbench-public -- \
  0 "$PUBLIC_WB_PORT" "$USER_NAME" "" "$STATIC_PORT" >/dev/null

sleep 2
pm2 save >/dev/null

echo "--- 自检 ---"
echo -n "backend  : "; curl -s -m 8 -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$BACKEND_PORT/api/health"
echo -n "crm 公网 : "; curl -s -m 8 -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$PUBLIC_CRM_PORT/api/health" -u "$USER_NAME:$PASS"
echo -n "工作台   : "; curl -s -m 8 -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$PUBLIC_WB_PORT/workbench/index.html" -u "$USER_NAME:$PASS"
echo -n "隧道代理 : "; curl -s -m 8 -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$TUNNEL_PROXY_PORT/research/web/index.html" -u "$USER_NAME:$PASS"

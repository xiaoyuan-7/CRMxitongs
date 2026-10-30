#!/bin/bash
# 从 GitHub 拉取最新代码并重启 CRM 服务
# 用法: bash deploy-from-git.sh [branch]
set -e

BRANCH="${1:-workspace-crm-backup}"
CRM_DIR="/home/admin/.openclaw/workspace/crm-system"
export GIT_SSH_COMMAND="ssh -i /home/admin/.ssh/id_ed25519 -o StrictHostKeyChecking=no"

echo "==> 拉取分支 $BRANCH"
cd "$CRM_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --no-edit origin "$BRANCH"

echo "==> 安装依赖 (如有变化)"
cd "$CRM_DIR/backend"
if [ -f package.json ]; then
  npm install --omit=dev --no-audit --no-fund 2>&1 | tail -3
fi

echo "==> 重启后端"
pm2 restart crm-backend
pm2 save

echo "==> 健康检查"
sleep 3
curl -s --max-time 10 http://127.0.0.1:3001/api/health && echo
echo "==> 完成"

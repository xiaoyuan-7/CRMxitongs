#!/bin/bash
# CRM 完整备份脚本：系统代码 + 数据库
# 备份到 GitHub 仓库的两个分支

WORKSPACE_DIR="/home/admin/.openclaw/workspace"
CRM_DIR="$WORKSPACE_DIR/crm-system"
DB_PATH="$CRM_DIR/backend/crm.db"
DB_SQL="$WORKSPACE_DIR/crm-db-backup.sql"
SSH_KEY="/home/admin/.ssh/id_ed25519"

export GIT_SSH_COMMAND="ssh -i $SSH_KEY"

# 1. 导出数据库为 SQL
sqlite3 "$DB_PATH" ".dump" > "$DB_SQL"

# 2. 提交数据库备份到主工作区仓库
cd $WORKSPACE_DIR
git add crm-db-backup.sql
git commit -m "Database backup $(date '+%Y-%m-%d %H:%M')" --allow-empty

# 3. 推送主工作区（包含数据库 SQL）
git push origin workspace-backup

# 4. 在 crm-system 子模块中提交代码更新
cd $CRM_DIR
git add -A
git commit -m "CRM code backup $(date '+%Y-%m-%d %H:%M')" --allow-empty

# 5. 推送 crm-system 到其备份分支
git push -u origin workspace-crm-backup

echo "=== 备份完成 ==="
echo "工作区: workspace-backup"
echo "CRM系统: workspace-crm-backup"
echo "数据库: crm-db-backup.sql"
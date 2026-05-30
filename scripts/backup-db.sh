#!/bin/bash
# CRM 数据库备份脚本
# 导出 SQL 并提交到 git 仓库

DB_PATH="/home/admin/.openclaw/workspace/crm-system/backend/crm.db"
BACKUP_SQL="/home/admin/.openclaw/workspace/crm-system/backend/crm_latest.sql"
REPO_DIR="/home/admin/.openclaw/workspace"

cd $REPO_DIR

# 导出数据库为 SQL
sqlite3 $DB_PATH ".dump" > $BACKUP_SQL

# git add 并 commit
git add crm-system/backend/crm_latest.sql
git commit -m "Database backup $(date '+%Y-%m-%d %H:%M')" --allow-empty

echo "数据库备份完成: $BACKUP_SQL"
#!/bin/bash
BACKUP_DIR="/root/.openclaw/workspace/crm-system/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp crm.db $BACKUP_DIR/crm_$DATE.db
echo "备份完成：crm_$DATE.db"
# 保留最近 7 天的备份
find $BACKUP_DIR -name "crm_*.db" -mtime +7 -delete

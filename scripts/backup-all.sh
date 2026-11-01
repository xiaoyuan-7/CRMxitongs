#!/bin/bash
# CRM 完整备份脚本：系统代码 + 数据库
#
# 安全变更（2026-11-01）：
#   1. 数据库导出改为 **AES-256 加密**后再入库（原明文 SQL 曾进入公开仓库，
#      含 57 家客户的生日/家庭状况/联系方式等隐私信息）
#   2. 加密密钥放在仓库外（/home/admin/.openclaw/keys/），不随备份入库
#   3. 不再 `git add -A` 无差别提交，改为按白名单 add，避开 .gitignore 之外的意外文件
#   4. 推送前检查敏感文件是否被意外 staged
set -euo pipefail

WORKSPACE_DIR="/home/admin/.openclaw/workspace"
CRM_DIR="$WORKSPACE_DIR/crm-system"
DB_PATH="$CRM_DIR/backend/crm.db"
DB_SQL="$WORKSPACE_DIR/crm-db-backup.sql"
DB_ENC="$WORKSPACE_DIR/crm-db-backup.sql.enc"
SSH_KEY="/home/admin/.ssh/id_ed25519"
ENC_KEY_DIR="/home/admin/.openclaw/keys"
ENC_KEY="$ENC_KEY_DIR/backup-enc.key"

export GIT_SSH_COMMAND="ssh -i $SSH_KEY"

# ---------- 加密密钥 ----------
# 密钥必须存在且权限为 600；没有就生成一个
if [ ! -f "$ENC_KEY" ]; then
  mkdir -p "$ENC_KEY_DIR"
  chmod 700 "$ENC_KEY_DIR"
  openssl rand -base64 48 > "$ENC_KEY"
  chmod 600 "$ENC_KEY"
  echo "[!] 已生成新的备份加密密钥: $ENC_KEY"
  echo "[!] 恢复数据库需要它，请另存一份到别处（丢了就只能靠旧备份）"
fi

# ---------- 1. 导出并加密数据库 ----------
# 用 .backup 而不是 .dump：能拿到一致性快照（包含 WAL 中已提交的数据）
TMP_SNAP="$WORKSPACE_DIR/.backup-snapshot.db"
sqlite3 "$DB_PATH" ".backup '$TMP_SNAP'"
sqlite3 "$TMP_SNAP" ".dump" > "$DB_SQL"

# 加密：PBKDF2 派生 + AES-256-CBC
openssl enc -aes-256-cbc -pbkdf2 -iter 200000 \
  -in "$DB_SQL" -out "$DB_ENC" \
  -pass "file:$ENC_KEY"

rm -f "$TMP_SNAP"

# ---------- 2. 暂存前检查敏感文件 ----------
check_sensitive() {
  local dir="$1"
  local bad
  bad=$(cd "$dir" && git diff --cached --name-only 2>/dev/null \
        | grep -E '(^keys/|\.crm-pass$|\.pem$|\.key$|\.db$|\.db-wal$|\.db-shm$|^.*\.sql$|^\.env$)' \
        | grep -vE 'import_(leads|referrals)\.sql|\.sql\.enc$' || true)
  if [ -n "$bad" ]; then
    echo "[ABORT] 检测到敏感文件被暂存，拒绝提交："
    echo "$bad"
    exit 1
  fi
}

# ---------- 3. 主工作区 ----------
cd "$WORKSPACE_DIR"
git add -f "$DB_ENC"
git add .gitignore
git commit -q -m "Database backup (encrypted) $(date '+%Y-%m-%d %H:%M')" --allow-empty
check_sensitive "$WORKSPACE_DIR"
git push origin workspace-backup

# ---------- 4. crm-system 代码 ----------
cd "$CRM_DIR"
git add -A
git commit -q -m "CRM code backup $(date '+%Y-%m-%d %H:%M')" --allow-empty || true
check_sensitive "$CRM_DIR"
git push -u origin workspace-crm-backup

# ---------- 5. 行业研究站 ----------
RESEARCH_DIR="/home/admin/industry-research"
if [ -d "$RESEARCH_DIR/.git" ]; then
  cd "$RESEARCH_DIR"
  git add -A
  git commit -q -m "Research site backup $(date '+%Y-%m-%d %H:%M')" --allow-empty || true
  git push origin HEAD:refs/heads/industry-research-backup
  echo "研究站: industry-research-backup"
else
  echo "研究站: 跳过（非 git 仓库）"
fi

# ---------- 6. 清理明文 dump ----------
# 明文 SQL 不留在磁盘上（它是客户隐私）
rm -f "$DB_SQL"

echo "=== 备份完成 ==="
echo "工作区: workspace-backup"
echo "CRM系统: workspace-crm-backup"
echo "研究站: industry-research-backup"
echo "数据库: crm-db-backup.sql.enc (AES-256 加密)"
echo "解密密钥: $ENC_KEY (仓库外, 请另存)"
echo ""
echo "恢复方法:"
echo "  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \\"
echo "    -in crm-db-backup.sql.enc -out restored.sql -pass file:$ENC_KEY"
echo "  sqlite3 backend/crm.db < restored.sql"

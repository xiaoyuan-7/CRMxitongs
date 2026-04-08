#!/bin/bash
# OpenClaw 自动推送到 GitHub 脚本

set -e

WORKSPACE="/home/admin/.openclaw/workspace"
LOG_FILE="/tmp/openclaw-push-$(date +%Y%m%d).log"

echo "=== OpenClaw 自动推送开始：$(date) ===" | tee -a "$LOG_FILE"

cd "$WORKSPACE"

# 检查 git 状态
CHANGES=$(git status --porcelain 2>&1 || echo "ERROR")

if [ "$CHANGES" = "ERROR" ]; then
    echo "❌ Git 状态检查失败" | tee -a "$LOG_FILE"
    exit 1
fi

if [ -z "$CHANGES" ]; then
    echo "✅ 没有新的更改，跳过推送" | tee -a "$LOG_FILE"
else
    echo "📝 发现更改，准备提交..." | tee -a "$LOG_FILE"
    
    # 添加所有更改
    git add -A 2>&1 | tee -a "$LOG_FILE"
    
    # 提交
    git commit -m "🤖 Auto backup: $(date '+%Y-%m-%d %H:%M:%S')" 2>&1 | tee -a "$LOG_FILE"
    
    # 推送
    echo "🚀 推送到 GitHub..." | tee -a "$LOG_FILE"
    git push origin master 2>&1 | tee -a "$LOG_FILE"
    
    echo "✅ 推送成功！" | tee -a "$LOG_FILE"
fi

echo "=== OpenClaw 自动推送结束：$(date) ===" | tee -a "$LOG_FILE"

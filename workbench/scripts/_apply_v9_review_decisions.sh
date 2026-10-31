#!/usr/bin/env bash
# 应用 v9 复检 UI 导出的 decisions JSON 到 companies.json
# 用法: ./scripts/_apply_v9_review_decisions.sh <decisions.json>

set -e

if [ -z "$1" ]; then
  echo "用法: $0 <decisions.json>"
  echo ""
  echo "decisions.json 是 v9 复检页导出的 _v9_review_decisions_*.json"
  echo ""
  echo "示例:"
  echo "  $0 scripts/_v9_review_decisions_2026-08-18-07-15.json"
  exit 1
fi

DECISIONS_FILE="$1"

if [ ! -f "$DECISIONS_FILE" ]; then
  echo "❌ 文件不存在: $DECISIONS_FILE"
  exit 1
fi

# 切到 workbench 根目录
cd "$(dirname "$0")/.."

echo "============================================================"
echo "应用 v9 复检 UI 决策 → companies.json"
echo "============================================================"
echo "  decisions 文件: $DECISIONS_FILE"
echo ""

# --actions "" = 只用 UI 决策, 不应用 CSV 的自动改
python3 scripts/_refine_v9_apply.py \
  --decisions "$DECISIONS_FILE" \
  --actions ""

echo ""
echo "============================================================"
echo "下一步:"
echo "  1. 检查 workbench 顶部 data 日期是否更新"
echo "  2. 浏览器 Ctrl+Shift+R 强刷 (避免缓存)"
echo "  3. 看 v9 复检页 banner 是否变绿 (全部完成)"
echo "  4. 可选: 清空 localStorage 的 v9ReviewDecisions (打开 devtools → Application → Local Storage)"
echo "============================================================"
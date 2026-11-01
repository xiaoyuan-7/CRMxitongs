#!/bin/bash
# 预生成静态资源的 .gz 文件
#
# 为什么：服务器只有 2 核，static-server 的实时 gzip 在并发请求下抢 CPU
# （实测单文件 43ms，但 11 个并发时 aggregates.json 160KB 花了 11.9 秒 = 13KB/s）。
# 预压缩一次存盘，运行时零 CPU 消耗。
set -e

ROOT="/home/admin/industry-research"
OUT_DIR="/home/admin/.openclaw/workspace/.gzcache"

echo "=== 预压缩静态资源 ==="
mkdir -p "$OUT_DIR"

# 需要压缩的文件类型
EXTS="js css json html svg md csv"

count=0
total_before=0
total_after=0

while IFS= read -r f; do
  rel="${f#$ROOT/}"
  # 路径映射：保留目录结构
  dest="$OUT_DIR/$rel.gz"
  mkdir -p "$(dirname "$dest")"

  before=$(stat -c%s "$f")
  # level 6 是压缩率/速度平衡点；level 9 太慢收益小
  gzip -6 -c "$f" > "$dest.tmp" && mv "$dest.tmp" "$dest"
  after=$(stat -c%s "$dest")

  total_before=$((total_before + before))
  total_after=$((total_after + after))
  count=$((count + 1))
  printf "  %-50s %8d -> %8d B\n" "$rel" "$before" "$after"
done < <(find "$ROOT" -type f \( -name "*.js" -o -name "*.css" -o -name "*.json" -o -name "*.html" -o -name "*.svg" -o -name "*.md" -o -name "*.csv" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" -not -name "*.gz")

echo ""
echo "=== 完成 ==="
echo "文件数: $count"
echo "原始:   $((total_before/1024/1024)) MB"
echo "压缩后: $((total_after/1024/1024)) MB  (压到 $((total_after*100/total_before))%)"
echo "缓存目录: $OUT_DIR"

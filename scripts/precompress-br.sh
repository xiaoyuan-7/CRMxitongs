#!/bin/bash
# 预压缩 brotli：写入 .gzcache/<相对路径>.br
# 用法: bash scripts/precompress-br.sh [相对路径...]
#   不带参数 → 处理 workbench/data/*.json 与 web/ 下的 html/css/js/json
# 作用：手机端走 Cloudflare 隧道带宽只有 ~80KB/s，br 比 gz 小 ~25%，首屏快十几秒
set -u
ROOT=/home/admin/industry-research
CACHE=/home/admin/.openclaw/workspace/.gzcache
mkdir -p "$CACHE"

targets=("$@")
if [ ${#targets[@]} -eq 0 ]; then
  while IFS= read -r f; do targets+=("$f"); done < <(find "$ROOT/workbench/data" -maxdepth 1 -type f -name '*.json' 2>/dev/null)
  while IFS= read -r f; do targets+=("$f"); done < <(find "$ROOT/web" -maxdepth 2 -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.json' \) 2>/dev/null)
fi

for f in "${targets[@]}"; do
  [ -f "$f" ] || continue
  rel="${f#$ROOT/}"
  out="$CACHE/$rel.br"
  mkdir -p "$(dirname "$out")"
  tmp="$out.tmp"
  if brotli -q 6 -f -c "$f" > "$tmp" 2>/dev/null && [ -s "$tmp" ]; then
    mv "$tmp" "$out"
    raw=$(stat -c%s "$f"); br=$(stat -c%s "$out")
    printf '%-60s %10d -> %10d (-%d%%)\n' "$rel" "$raw" "$br" $(( (raw-br)*100/raw ))
  else
    rm -f "$tmp"
    echo "FAIL $rel"
  fi
done

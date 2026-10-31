#!/usr/bin/env bash
# push-to-github.sh — 把 industry-research 推到 GitHub
#
# 用法:
#   GH_TOKEN=ghp_xxx GH_USER=yourname bash push-to-github.sh [repo_name] [private|public]
#
# 做四件事:
#   1. 校验 token
#   2. 用 API 建仓库 (幂等: 已存在就复用)
#   3. 设 remote + 分支名
#   4. push main 分支
#
# 注意: token 只出现在命令行里, 不会写进 credential store。
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_NAME="${1:-industry-research}"
VISIBILITY="${2:-private}"
BRANCH="main"

: "${GH_TOKEN:?请先设置 GH_TOKEN 环境变量}"
: "${GH_USER:?请先设置 GH_USER 环境变量}"

if [ "$VISIBILITY" != "private" ]; then
  echo "⚠️  警告: 本仓库含银行对公客户名单 / 专精特新企业名单 / 客户拜访跟进记录"
  echo "    非 private 可见性 = 数据泄露。继续请显式传 'public'。"
  exit 1
fi

echo "==> 1/4 校验 token"
curl -sS -H "Authorization: Bearer ${GH_TOKEN}" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/user \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('    token OK, 登录身份:', d.get('login'), '|', d.get('name') or '(未设置昵称)')"

echo "==> 2/4 创建/复用仓库 ${GH_USER}/${REPO_NAME} (${VISIBILITY})"
EXIST=$(curl -sS -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer ${GH_TOKEN}" \
        -H "Accept: application/vnd.github+json" \
        "https://api.github.com/repos/${GH_USER}/${REPO_NAME}")
if [ "$EXIST" = "200" ]; then
  echo "    仓库已存在, 复用"
elif [ "$EXIST" = "404" ]; then
  curl -sS -X POST \
       -H "Authorization: Bearer ${GH_TOKEN}" \
       -H "Accept: application/vnd.github+json" \
       -H "Content-Type: application/json" \
       -d "{\"name\":\"${REPO_NAME}\",\"private\":true,\"description\":\"对公行业研究系统 · 拓客决策工作台\",\"auto_init\":false}" \
       https://api.github.com/user/repos \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('    已创建:', d.get('full_name') or d)"
else
  echo "    API 返回 $EXIST, 中止"; exit 1
fi

echo "==> 3/4 设置 remote + 分支名"
cd "$REPO_DIR"
git branch -M "$BRANCH"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${GH_USER}/${REPO_NAME}.git"

echo "==> 4/4 push (打包后约 45 MB)"
git -c credential.helper= push -u origin "$BRANCH" \
    "https://${GH_USER}:${GH_TOKEN}@github.com/${GH_USER}/${REPO_NAME}.git"

echo
echo "✅ 完成: https://github.com/${GH_USER}/${REPO_NAME}"

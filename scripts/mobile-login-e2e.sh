#!/bin/bash
# 真机模拟走完整登录流程（走公网隧道）
cd /home/admin/.openclaw/workspace || exit 1
URL=$(bash scripts/crm-url.sh | head -1 | sed 's/.*: //;s:/$::')
node scripts/mobile-login-check.js "$URL" admin "$(cat scripts/.crm-pass)"

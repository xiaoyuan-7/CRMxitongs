#!/bin/bash
# 手机端模拟检查 workbench 布局（直连静态站，绕过认证）
cd /home/admin/.openclaw/workspace || exit 1
node scripts/mobile-check.js "http://127.0.0.1:8000/workbench/index.html" /tmp/wb-mobile

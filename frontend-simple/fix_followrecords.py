#!/usr/bin/env python3
# Fix the follow record rendering to include timestamp and make it collapsible
# Also change the add button style
import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# 1. Change 操作 header to 跟进记录
content = content.replace(
    '<th style="padding:10px 8px;text-align:center;white-space:nowrap;">操作</th>',
    '<th style="padding:10px 8px;text-align:center;white-space:nowrap;">跟进记录</th>'
)
print("1. Changed 操作 -> 跟进记录")

# 2. Change the follow record rendering to include timestamp
old = """var followItems = g.records
                .filter(function(r) { return r.follow_record && r.follow_record.trim(); })
                .map(function(r) {
                    return '<div style="margin-bottom:4px;font-size:12px;background:#f9fafb;padding:4px 6px;border-radius:4px;">' + (r.follow_record || '') + '</div>';
                })
                .join('');
            followHtml = '<div style="margin-top:4px;" class="follow-toggle" onclick="toggleSubList(this)">' +
                '<span style="cursor:pointer;color:#667eea;font-size:12px;">📝 跟进记录（' + g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); }).length + '）▾</span>' +
                '<div class="sub-list" style="display:block;margin-top:4px;padding-left:8px;">' + followItems + '</div></div>';"""

new = """var followItems = g.records
                .filter(function(r) { return r.follow_record && r.follow_record.trim(); })
                .map(function(r) {
                    var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
                    return '<div style="margin-bottom:6px;padding:6px 8px;background:#f0fdf4;border-radius:6px;border-left:3px solid #22c55e;">' +
                        '<div style="font-size:10px;color:#059669;font-weight:600;margin-bottom:2px;">' + time + '</div>' +
                        '<div style="font-size:12px;color:#374151;">' + (r.follow_record || '') + '</div></div>';
                })
                .join('');
            followHtml = '<div style="margin-top:4px;" class="follow-toggle" onclick="toggleSubList(this)">' +
                '<span style="cursor:pointer;color:#059669;font-size:12px;">📝 跟进记录（' + g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); }).length + '）▾</span>' +
                '<div class="sub-list" style="display:block;margin-top:4px;padding-left:8px;">' + followItems + '</div></div>';"""

if old in content:
    content = content.replace(old, new)
    print("2. Updated follow record rendering with timestamps")
else:
    print("2. Could not find exact match for followItems")

# 3. Improve add button style
old_btn = "var addBtn = '<button onclick=\"addCompanyForGroup(\\'\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\'\\')\" style=\"font-size:11px;padding:2px 6px;border:1px dashed #d1d5db;border-radius:4px;background:white;color:#9ca3af;cursor:pointer;\">+ 添加企业</button>';"

new_btn = "var addBtn = '<button onclick=\"addCompanyForGroup(\\'\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\'\\')\" style=\"font-size:11px;padding:3px 10px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;transition:all 0.2s;\">+ 添加企业</button>';"

if old_btn in content:
    content = content.replace(old_btn, new_btn)
    print("3. Improved add button style")
else:
    print("3. Add button pattern not found")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"\nDone. File size: {len(content)} bytes")
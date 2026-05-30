#!/usr/bin/env python3
import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# 1. Change "操作" header to "跟进记录"
content = content.replace(
    '<th style="padding:10px 8px;text-align:center;white-space:nowrap;">操作</th>',
    '<th style="padding:10px 8px;text-align:center;white-space:nowrap;">跟进记录</th>'
)
print("1. Changed 操作 -> 跟进记录")

# 2. Find and patch the follow record rendering to include timestamps
# The current rendering is a plain text that can't record time
# We need to change the followHtml to include a proper structure

old_follow_rendering = '''// 跟进记录子列表（可展开）
        var hasFollow = g.records.some(function(r) { return r.follow_record && r.follow_record.trim(); });
        var followHtml = '';
        if (hasFollow) {
            var followItems = g.records
                .filter(function(r) { return r.follow_record && r.follow_record.trim(); })
                .map(function(r) {
                    return '<span style="display:inline-block;padding:2px 6px;background:#ecfdf5;border-radius:4px;font-size:12px;color:#065f46;margin:2px;">' + r.follow_record + '</span>';
                })
                .join('');
            followHtml = '<div style="margin-top:4px;" class="follow-toggle" onclick="toggleSubList(this)">' +
                '<span style="cursor:pointer;color:#059669;font-size:12px;">📝 跟进记录（' + g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); }).length + '）▾</span>' +
                '<div class="sub-list" style="display:block;margin-top:4px;padding-left:8px;">' + followItems + '</div></div>';
        }'''

new_follow_rendering = '''// 跟进记录子列表（可展开）
        var hasFollow = g.records.some(function(r) { return r.follow_record && r.follow_record.trim(); });
        var followHtml = '';
        if (hasFollow) {
            var followItems = g.records
                .filter(function(r) { return r.follow_record && r.follow_record.trim(); })
                .map(function(r) {
                    var time = r.updated_at ? new Date(r.updated_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : (r.created_at ? new Date(r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '');
                    return '<div style="margin-bottom:4px;padding:4px 8px;background:#ecfdf5;border-radius:4px;font-size:11px;color:#065f46;">' +
                        '<span style="color:#059669;font-weight:600;">' + time + '</span>' +
                        '<span style="margin-left:6px;">' + r.follow_record + '</span>' +
                        '</div>';
                })
                .join('');
            followHtml = '<div style="margin-top:4px;" class="follow-toggle" onclick="toggleSubList(this)">' +
                '<span style="cursor:pointer;color:#059669;font-size:12px;">📝 跟进记录（' + g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); }).length + '）▾</span>' +
                '<div class="sub-list" style="display:block;margin-top:4px;padding-left:8px;">' + followItems + '</div></div>';
        }'''

if old_follow_rendering in content:
    content = content.replace(old_follow_rendering, new_follow_rendering)
    print("2. Updated follow record rendering with timestamps")
else:
    print("2. Could not find old follow record rendering, trying alternate search")
    # Try to find it with a simpler pattern
    idx = content.find('跟进记录子列表')
    if idx > 0:
        print(f"   Found at index {idx}")
        print(content[idx:idx+200])

# 3. Update the "添加企业" button to be more visible when no companies exist
old_add_btn = "var addBtn = '<button onclick=\"addCompanyForGroup(\\'\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\'\\')\" style=\"font-size:11px;padding:2px 6px;border:1px dashed #d1d5db;border-radius:4px;background:white;color:#9ca3af;cursor:pointer;\">+ 添加企业</button>';"

if old_add_btn in content:
    content = content.replace(old_add_btn, "var addBtn = '<button onclick=\"addCompanyForGroup(\\'\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\'\\')\" style=\"font-size:11px;padding:2px 8px;border:1px dashed #667eea;border-radius:4px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;\">+ 添加企业</button>';")
    print("3. Improved add button style")
else:
    print("3. Add button pattern not found exactly")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"\nDone. File size: {len(content)} bytes")
print("Remember: Ctrl+Shift+R to force refresh after upload")
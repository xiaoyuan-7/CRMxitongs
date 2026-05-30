#!/usr/bin/env python3
# Rewrite the fusion table rendering to:
# 1. Show companies and follow records as collapsible sub-lists with count badges
# 2. Have clear "+添加" buttons for both when list is empty OR when collapsed
# 3. Better visual distinction between the two columns

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find and replace the renderFusionTableByType function
# We'll replace the whole table row rendering

old_row_rendering = '''        // 目标企业子列表（可展开）
        var hasCompanies = g.records.some(function(r) { return r.target_company && r.target_company.trim(); });
        var companiesHtml = '';
        if (hasCompanies) {
            var companyItems = g.records
                .filter(function(r) { return r.target_company && r.target_company.trim(); })
                .map(function(r) {
                    return '<span class="inline-edit" data-field="target_company" data-id="' + r.id + '" style="cursor:pointer;padding:2px 6px;background:#f3f4f6;border-radius:4px;font-size:12px;display:inline-block;margin:2px;">' + r.target_company + '</span>';
                })
                .join('');
            companiesHtml = '<div style="margin-top:4px;" class="companies-toggle" onclick="toggleSubList(this)">' +
                '<span style="cursor:pointer;color:#667eea;font-size:12px;">📁 目标企业（' + g.records.filter(function(r) { return r.target_company && r.target_company.trim(); }).length + '）▾</span>' +
                '<div class="sub-list" style="display:block;margin-top:4px;padding-left:8px;">' + companyItems + '</div></div>';
        }
        
        // 无企业时显示添加按钮
        var addBtn = '<button onclick="addCompanyForGroup(\\'\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\'\\')" style="font-size:11px;padding:2px 6px;border:1px dashed #d1d5db;border-radius:4px;background:white;color:#9ca3af;cursor:pointer;">+ 添加企业</button>';
        
        // 跟进记录子列表（可展开）
        var hasFollow = g.records.some(function(r) { return r.follow_record && r.follow_record.trim(); });
        var followHtml = '';
        if (hasFollow) {
            var followItems = g.records
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
                '<div class="sub-list" style="display:block;margin-top:4px;padding-left:8px;">' + followItems + '</div></div>';
        }'''

new_row_rendering = '''        // 目标企业子列表（可展开，固定展开状态）
        var companyRecords = g.records.filter(function(r) { return r.target_company && r.target_company.trim(); });
        var companyCount = companyRecords.length;
        var companyItems = companyRecords.map(function(r) {
            return '<span class="inline-edit" data-field="target_company" data-id="' + r.id + '" style="cursor:pointer;padding:2px 6px;background:#f3f4f6;border-radius:4px;font-size:12px;display:inline-block;margin:2px;">' + r.target_company + '</span>';
        }).join('');
        var companiesHtml = '<div style="margin-top:4px;" class="companies-toggle" onclick="toggleSubList(this)">' +
            '<span style="cursor:pointer;color:#667eea;font-size:12px;font-weight:500;">📁 目标企业（' + companyCount + '）' + (companyCount > 0 ? '▾' : '▸') + '</span>' +
            '<div class="sub-list" style="display:' + (companyCount > 0 ? 'block' : 'none') + ';margin-top:6px;padding-left:4px;">' +
            (companyCount > 0 ? companyItems : '') +
            '</div></div>';
        
        // 目标企业添加按钮（始终显示）
        var addCompanyBtn = '<button onclick="addCompanyForGroup(\\'\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\'\\')" style="margin-top:6px;font-size:11px;padding:3px 10px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;">+ 添加企业</button>';
        
        // 跟进记录子列表（可展开，固定展开状态）
        var followRecords = g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); });
        var followCount = followRecords.length;
        var followItems = followRecords.map(function(r) {
            var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
            return '<div style="margin-bottom:6px;padding:6px 8px;background:#f0fdf4;border-radius:6px;border-left:3px solid #22c55e;position:relative;">' +
                '<div style="font-size:10px;color:#059669;font-weight:600;margin-bottom:2px;">' + time + '</div>' +
                '<div style="font-size:12px;color:#374151;margin-bottom:4px;">' + (r.follow_record || '') + '</div>' +
                '<button onclick="event.stopPropagation();openFollowEdit(' + r.id + ')" style="font-size:10px;padding:1px 6px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;color:#666;">编辑</button>' +
                '</div>';
        }).join('');
        var followHtml = '<div style="margin-top:4px;" class="follow-toggle" onclick="toggleSubList(this)">' +
            '<span style="cursor:pointer;color:#059669;font-size:12px;font-weight:500;">📝 跟进记录（' + followCount + '）' + (followCount > 0 ? '▾' : '▸') + '</span>' +
            '<div class="sub-list" style="display:' + (followCount > 0 ? 'block' : 'none') + ';margin-top:6px;padding-left:4px;">' +
            (followCount > 0 ? followItems : '') +
            '</div></div>';
        
        // 跟进记录添加按钮（始终显示）
        var addFollowBtn = '<button onclick="openFollowAdd(\'' + g.manager_name + '\',\'' + g.line + '\',\'' + targetType + '\')" style="margin-top:6px;font-size:11px;padding:3px 10px;border:1px dashed #059669;border-radius:6px;background:#f0fdf4;color:#059669;cursor:pointer;font-weight:500;width:100%;">+ 添加跟进</button>';'''

if old_row_rendering in content:
    content = content.replace(old_row_rendering, new_row_rendering)
    print("Replaced companies/follow rendering with improved version")
else:
    print("Could not find old rendering code")
    idx = content.find('目标企业子列表')
    if idx > 0:
        print(f"Found at index {idx}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"Done. File size: {len(content)} bytes")
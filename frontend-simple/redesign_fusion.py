#!/usr/bin/env python3
# Complete rewrite of the fusion table row rendering
# Changes:
# 1. Companies and follow-records always show add button below the list
# 2. Lists start collapsed, click to expand
# 3. Both columns get proper add buttons

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find the entire renderFusionTableByType function and replace its body
old_fn_start = "        // 目标企业子列表（可展开）\n        var hasCompanies = g.records.some(function(r) { return r.target_company && r.target_company.trim(); });\n        var companiesHtml = '';\n        if (hasCompanies) {\n            var companyItems = g.records\n                .filter(function(r) { return r.target_company && r.target_company.trim(); })\n                .map(function(r) {\n                    return '<span class=\"inline-edit\" data-field=\"target_company\" data-id=\"' + r.id + '\" style=\"cursor:pointer;padding:2px 6px;background:#f3f4f6;border-radius:4px;font-size:12px;display:inline-block;margin:2px;\">' + r.target_company + '</span>';\n                })\n                .join('');\n            companiesHtml = '<div style=\"margin-top:4px;\" class=\"companies-toggle\" onclick=\"toggleSubList(this)\">' +\n                '<span style=\"cursor:pointer;color:#667eea;font-size:12px;\">📁 目标企业（' + g.records.filter(function(r) { return r.target_company && r.target_company.trim(); }).length + '）▾</span>' +\n                '<div class=\"sub-list\" style=\"display:block;margin-top:4px;padding-left:8px;\">' + companyItems + '</div></div>';\n        }\n        \n        // 无企业时显示添加按钮\n        var addBtn = '<button onclick=\"addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')\" style=\"font-size:11px;padding:2px 6px;border:1px dashed #d1d5db;border-radius:4px;background:white;color:#9ca3af;cursor:pointer;\">+ 添加企业</button>';\n        \n        // 跟进记录子列表（可展开）\n        var hasFollow = g.records.some(function(r) { return r.follow_record && r.follow_record.trim(); });\n        var followHtml = '';\n        if (hasFollow) {\n            var followItems = g.records\n                .filter(function(r) { return r.follow_record && r.follow_record.trim(); })\n                .map(function(r) {\n                    var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';\n                    return '<div style=\"margin-bottom:6px;padding:6px 8px;background:#f0fdf4;border-radius:6px;border-left:3px solid #22c55e;\">' +\n                        '<div style=\"font-size:10px;color:#059669;font-weight:600;margin-bottom:2px;\">' + time + '</div>' +\n                        '<div style=\"font-size:12px;color:#374151;\">' + (r.follow_record || '') + '</div></div>';\n                })\n                .join('');\n            followHtml = '<div style=\"margin-top:4px;\" class=\"follow-toggle\" onclick=\"toggleSubList(this)\">' +\n                '<span style=\"cursor:pointer;color:#059669;font-size:12px;\">📝 跟进记录（' + g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); }).length + '）▾</span>' +\n                '<div class=\"sub-list\" style=\"display:block;margin-top:4px;padding-left:8px;\">' + followItems + '</div></div>';\n        }\n        \n        return '<tr style=\"border-bottom:1px solid #f3f4f6;\">' +\n            '<td style=\"padding:10px 8px;vertical-align:top;\"><div style=\"font-weight:600;color:#374151;\">' + g.manager_name + '</div><div style=\"margin-top:2px;\">' + lineBadge + '</div></td>' +\n            '<td style=\"padding:10px 8px;text-align:center;vertical-align:top;\"><span style=\"cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;\" onclick=\"editGroupField(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\x27,\\'task_count\\',\\'' + g.task_count + '\\')\">' + g.task_count + '</span></td>' +\n            '<td style=\"padding:10px 8px;text-align:center;vertical-align:top;\"><span style=\"cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;\" onclick=\"editGroupField(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\x27,\\'completed_count\\',\\'' + g.completed_count + '\\')\">' + g.completed_count + '</span></td>' +\n            '<td style=\"padding:10px 8px;text-align:center;vertical-align:top;\"><span style=\"color:' + rateColor + ';font-weight:700;font-size:14px;\">' + rate + '%</span></td>' +\n            '<td style=\"padding:10px 8px;vertical-align:top;\">' + (hasCompanies ? companiesHtml : addBtn) + '</td>' +\n            '<td style=\"padding:10px 8px;vertical-align:top;\">' + followHtml + '</td>' +\n            '<td style=\"padding:10px 8px;white-space:nowrap;vertical-align:top;\">' +\n                '<button onclick=\"editFusionTarget(' + g.records[0].id + ')\" style=\"padding:4px 8px;font-size:12px;background:white;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;\">编辑</button>' +\n            '</td>' +\n        '</tr>';"

new_fn_body = """        // ========== 目标企业列 ==========
        var companyRecords = g.records.filter(function(r) { return r.target_company && r.target_company.trim(); });
        var companyCount = companyRecords.length;
        var companyItems = companyRecords.map(function(r) {
            return '<span class="inline-edit" data-field="target_company" data-id="' + r.id + '" style="cursor:pointer;padding:2px 6px;background:#f3f4f6;border-radius:4px;font-size:12px;display:inline-block;margin:2px;">' + r.target_company + '</span>';
        }).join('');
        var companiesToggle = '<div class="companies-toggle" onclick="toggleSubList(this)" style="cursor:pointer;color:#667eea;font-size:12px;font-weight:500;">📁 目标企业（' + companyCount + '）<span style="font-size:10px;">' + (companyCount > 0 ? '▾' : '（空）▸') + '</span></div>';
        var companyList = '<div class="sub-list" style="display:none;margin-top:6px;padding-left:4px;">' + companyItems + '</div>';
        var addCompanyBtn = '<button onclick="addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:6px;font-size:11px;padding:3px 8px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;">+ 添加企业</button>';
        var companiesHtml = '<div style="min-width:80px;">' + companiesToggle + companyList + addCompanyBtn + '</div>';
        
        // ========== 跟进记录列 ==========
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
        var followToggle = '<div class="follow-toggle" onclick="toggleSubList(this)" style="cursor:pointer;color:#059669;font-size:12px;font-weight:500;">📝 跟进记录（' + followCount + '）<span style="font-size:10px;">' + (followCount > 0 ? '▾' : '（空）▸') + '</span></div>';
        var followList = '<div class="sub-list" style="display:none;margin-top:6px;padding-left:4px;">' + followItems + '</div>';
        var addFollowBtn = '<button onclick="openFollowAdd(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:6px;font-size:11px;padding:3px 8px;border:1px dashed #059669;border-radius:6px;background:#f0fdf4;color:#059669;cursor:pointer;font-weight:500;width:100%;">+ 添加跟进</button>';
        var followHtml = '<div style="min-width:80px;">' + followToggle + followList + addFollowBtn + '</div>';
        
        return '<tr style="border-bottom:1px solid #f3f4f6;">' +
            '<td style="padding:10px 8px;vertical-align:top;"><div style="font-weight:600;color:#374151;">' + g.manager_name + '</div><div style="margin-top:2px;">' + lineBadge + '</div></td>' +
            '<td style="padding:10px 8px;text-align:center;vertical-align:top;"><span style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;" onclick="editGroupField(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\x27,\\'task_count\\',\\'' + g.task_count + '\\')">' + g.task_count + '</span></td>' +
            '<td style="padding:10px 8px;text-align:center;vertical-align:top;"><span style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;" onclick="editGroupField(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\x27,\\'completed_count\\',\\'' + g.completed_count + '\\')">' + g.completed_count + '</span></td>' +
            '<td style="padding:10px 8px;text-align:center;vertical-align:top;"><span style="color:' + rateColor + ';font-weight:700;font-size:14px;">' + rate + '%</span></td>' +
            '<td style="padding:10px 8px;vertical-align:top;">' + companiesHtml + '</td>' +
            '<td style="padding:10px 8px;vertical-align:top;">' + followHtml + '</td>' +
            '<td style="padding:10px 8px;white-space:nowrap;vertical-align:top;">' +
                '<button onclick="editFusionTarget(' + g.records[0].id + ')" style="padding:4px 8px;font-size:12px;background:white;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;">编辑</button>' +
            '</td>' +
        '</tr>'; """

if old_fn_start in content:
    content = content.replace(old_fn_start, new_fn_body)
    print("Successfully replaced fusion row rendering")
else:
    print("Could not find exact match, trying substring search...")
    idx = content.find('// 目标企业子列表（可展开）')
    if idx > 0:
        print(f"Found at index {idx}")
        # Try a more targeted approach
        start_idx = content.find('        // 目标企业子列表', idx)
        end_idx = content.find("'</tr>';", idx) + len("'</tr>';")
        print(f"Start: {start_idx}, End: {end_idx}")
        print("Old content snippet:")
        print(repr(content[start_idx:start_idx+200]))

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
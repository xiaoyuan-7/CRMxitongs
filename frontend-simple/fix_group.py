#!/usr/bin/env python3
FRONTEND = '/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html'
with open(FRONTEND, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the old renderFusionTableByType and replace it
old_fn = '''function renderFusionTableByType(targetType, tbody) {
    var rows = allFusionTargets.filter(function(r) { return r.target_type === targetType; });
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#999;">暂无数据</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(function(r) {
        var rate = r.task_count > 0 ? Math.round(r.completed_count / r.task_count * 100) : 0;
        var rateColor = rate >= 50 ? '#22c55e' : rate > 0 ? '#f59e0b' : '#ef4444';
        var lineBadge = r.line === '批发'
            ? '<span style="color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:11px;">批发</span>'
            : '<span style="color:#92400e;background:#fef3c3;padding:1px 6px;border-radius:4px;font-size:11px;">零售</span>';
        var companyDisplay = r.target_company
            ? '<span class="inline-edit" data-field="target_company" data-id="' + r.id + '" style="cursor:pointer;padding:2px 6px;background:#f3f4f6;border-radius:4px;font-size:12px;">' + r.target_company + '</span>'
            : '<button onclick="addEmptyCompany(' + r.id + ')" style="font-size:11px;padding:2px 6px;border:1px dashed #d1d5db;border-radius:4px;background:white;color:#9ca3af;cursor:pointer;">+ 添加企业</button>';
        return '<tr data-id="' + r.id + '" style="border-bottom:1px solid #f3f4f6;">' +
            '<td style="padding:10px 8px;"><div style="font-weight:600;color:#374151;">' + r.manager_name + '</div><div style="margin-top:2px;">' + lineBadge + '</div></td>' +
            '<td style="padding:10px 8px;text-align:center;"><span class="inline-edit" data-field="task_count" data-id="' + r.id + '" style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;">' + r.task_count + '</span></td>' +
            '<td style="padding:10px 8px;text-align:center;"><span class="inline-edit" data-field="completed_count" data-id="' + r.id + '" style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;">' + r.completed_count + '</span></td>' +
            '<td style="padding:10px 8px;text-align:center;"><span style="color:' + rateColor + ';font-weight:700;font-size:14px;">' + rate + '%</span></td>' +
            '<td style="padding:10px 8px;">' + companyDisplay + '</td>' +
            '<td style="padding:10px 8px;white-space:nowrap;">' +
                '<button onclick="toggleFollowRecord(this, ' + r.id + ')" style="cursor:pointer;font-size:12px;color:#667eea;padding:2px 6px;border-radius:4px;background:#eef2ff;border:none;">跟进</button>' +
                '<div id="fr_' + r.id + '" style="display:none;margin-top:4px;">' +
                    '<textarea id="flt_' + r.id + '" style="width:100%;min-height:40px;border:1px solid #e5e7eb;border-radius:6px;padding:6px;font-size:12px;resize:vertical;">' + (r.follow_record || '') + '</textarea>' +
                    '<button onclick="saveFollowRecord(' + r.id + ')" style="margin-top:4px;padding:4px 10px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">保存</button>' +
                '</div>' +
            '</td>' +
            '<td style="padding:10px 8px;white-space:nowrap;">' +
                '<button onclick="editFusionTarget(' + r.id + ')" style="padding:4px 8px;font-size:12px;background:white;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;">编辑</button>' +
                '<button onclick="if(confirm(\\x27确定删除?\\x27)) deleteFusionTarget(' + r.id + ')" style="padding:4px 8px;font-size:12px;background:white;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;color:#dc2626;margin-left:2px;">删除</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}'''

new_fn = '''function renderFusionTableByType(targetType, tbody) {
    var rows = allFusionTargets.filter(function(r) { return r.target_type === targetType; });
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:#999;">暂无数据</td></tr>';
        return;
    }
    // 按客户经理+条线分组
    var groups = {};
    rows.forEach(function(r) {
        var key = r.manager_name + '||' + r.line;
        if (!groups[key]) {
            groups[key] = {
                manager_name: r.manager_name,
                line: r.line,
                task_count: 0,
                completed_count: 0,
                records: []
            };
        }
        groups[key].task_count += r.task_count || 0;
        groups[key].completed_count += r.completed_count || 0;
        groups[key].records.push(r);
    });
    
    tbody.innerHTML = Object.values(groups).map(function(g) {
        var rate = g.task_count > 0 ? Math.round(g.completed_count / g.task_count * 100) : 0;
        var rateColor = rate >= 50 ? '#22c55e' : rate > 0 ? '#f59e0b' : '#ef4444';
        var lineBadge = g.line === '批发'
            ? '<span style="color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:11px;">批发</span>'
            : '<span style="color:#92400e;background:#fef3c3;padding:1px 6px;border-radius:4px;font-size:11px;">零售</span>';
        
        // 目标企业子列表（可展开）
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
        var addBtn = '<button onclick="addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="font-size:11px;padding:2px 6px;border:1px dashed #d1d5db;border-radius:4px;background:white;color:#9ca3af;cursor:pointer;">+ 添加企业</button>';
        
        // 跟进记录子列表（可展开）
        var hasFollow = g.records.some(function(r) { return r.follow_record && r.follow_record.trim(); });
        var followHtml = '';
        if (hasFollow) {
            var followItems = g.records
                .filter(function(r) { return r.follow_record && r.follow_record.trim(); })
                .map(function(r) {
                    return '<div style="margin-bottom:4px;font-size:12px;background:#f9fafb;padding:4px 6px;border-radius:4px;">' + (r.follow_record || '') + '</div>';
                })
                .join('');
            followHtml = '<div style="margin-top:4px;" class="follow-toggle" onclick="toggleSubList(this)">' +
                '<span style="cursor:pointer;color:#667eea;font-size:12px;">📝 跟进记录（' + g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); }).length + '）▾</span>' +
                '<div class="sub-list" style="display:block;margin-top:4px;padding-left:8px;">' + followItems + '</div></div>';
        }
        
        return '<tr style="border-bottom:1px solid #f3f4f6;">' +
            '<td style="padding:10px 8px;vertical-align:top;"><div style="font-weight:600;color:#374151;">' + g.manager_name + '</div><div style="margin-top:2px;">' + lineBadge + '</div></td>' +
            '<td style="padding:10px 8px;text-align:center;vertical-align:top;"><span style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;" onclick="editGroupField(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\x27,\\'task_count\\',\\'' + g.task_count + '\\')">' + g.task_count + '</span></td>' +
            '<td style="padding:10px 8px;text-align:center;vertical-align:top;"><span style="cursor:pointer;padding:2px 8px;border-radius:4px;font-size:14px;font-weight:600;" onclick="editGroupField(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\x27,\\'completed_count\\',\\'' + g.completed_count + '\\')">' + g.completed_count + '</span></td>' +
            '<td style="padding:10px 8px;text-align:center;vertical-align:top;"><span style="color:' + rateColor + ';font-weight:700;font-size:14px;">' + rate + '%</span></td>' +
            '<td style="padding:10px 8px;vertical-align:top;">' + (hasCompanies ? companiesHtml : addBtn) + '</td>' +
            '<td style="padding:10px 8px;vertical-align:top;">' + followHtml + '</td>' +
            '<td style="padding:10px 8px;white-space:nowrap;vertical-align:top;">' +
                '<button onclick="editFusionTarget(' + g.records[0].id + ')" style="padding:4px 8px;font-size:12px;background:white;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;">编辑</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}'''

if old_fn in content:
    content = content.replace(old_fn, new_fn)
    print('Replaced renderFusionTableByType')
else:
    print('Could not find exact old function, trying partial match')
    # Try to find and replace just the function body
    idx = content.find('function renderFusionTableByType(targetType, tbody)')
    if idx > 0:
        # Find the closing of this function (next function declaration or end of script)
        end_idx = content.find('\nfunction', idx + 1)
        if end_idx > 0:
            content = content[:idx] + new_fn + content[end_idx:]
            print('Replaced by partial match')

with open(FRONTEND, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done, size:', len(content))
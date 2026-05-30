#!/usr/bin/env python3
# Implement timeline + card hybrid view for fusion follow-up display

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find and replace the renderFusionTableByType function's inner rendering
# We need to find where the tbody.innerHTML assignment happens

# The old rendering uses g.manager_name, g.line, etc in a table row format
# New rendering will use expandable cards with timeline

old_render_start = "    tbody.innerHTML = Object.values(groups).map(function(g) {"
old_render_end = "    }).join('');"

start_idx = content.find(old_render_start)
end_marker = "        '</tr>'; "
end_idx = content.find("    }).join('');", start_idx)

if start_idx < 0 or end_idx < 0:
    print(f"Could not find markers. start={start_idx}, end={end_idx}")
else:
    print(f"Found render section at {start_idx} to {end_idx}")
    
    # New implementation: expandable cards with timeline
    new_render = """    tbody.innerHTML = Object.values(groups).map(function(g) {
        var rate = g.task_count > 0 ? Math.round(g.completed_count / g.task_count * 100) : 0;
        var rateColor = rate >= 50 ? '#22c55e' : rate > 0 ? '#f59e0b' : '#ef4444';
        var lineBadge = g.line === '批发'
            ? '<span style="color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:11px;">批发</span>'
            : '<span style="color:#92400e;background:#fef3c3;padding:1px 6px;border-radius:4px;font-size:11px;">零售</span>';
        
        // Build company cards with follow-up timelines
        var companyCardsHtml = g.records.filter(function(r) { return r.target_company && r.target_company.trim(); }).map(function(r) {
            var companyName = r.target_company;
            var followText = r.follow_record && r.follow_record.trim() ? r.follow_record : '';
            var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
            var progressPercent = g.task_count > 0 ? Math.round((r.completed_count || 0) / g.task_count * 100) : 0;
            var progressColor = progressPercent >= 50 ? '#22c55e' : progressPercent > 0 ? '#f59e0b' : '#ef4444';
            
            var timelineHtml = '';
            if (followText) {
                timelineHtml = '<div style="margin-top:8px;padding:6px 8px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px;font-size:11px;color:#065f46;">' +
                    '<div style="font-size:9px;color:#059669;font-weight:600;margin-bottom:3px;">📍 ' + companyName + ' · ' + time + '</div>' +
                    '<div style="font-size:12px;color:#374151;line-height:1.4;">' + followText + '</div>' +
                    '<button onclick="openFollowEdit(' + r.id + ')" style="margin-top:6px;font-size:10px;padding:2px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;color:#666;">编辑</button>' +
                    '</div>';
            } else {
                timelineHtml = '<div style="margin-top:8px;padding:6px 8px;background:#fef3c3;border-left:3px solid #f59e0b;border-radius:4px;font-size:11px;color:#92400e;">' +
                    '<div style="font-size:10px;">📍 ' + companyName + '</div>' +
                    '<div style="font-size:11px;color:#92400e;margin-top:2px;">暂无跟进记录</div>' +
                    '<button onclick="openFollowAdd(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + r.target_type + '\\')" style="margin-top:4px;font-size:10px;padding:2px 8px;border:1px dashed #f59e0b;border-radius:4px;background:#fff;font-size:10px;cursor:pointer;color:#92400e;">+ 添加跟进</button>' +
                    '</div>';
            }
            
            return '<div style="margin-bottom:10px;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
                '<span style="font-weight:600;color:#374151;font-size:13px;">' + companyName + '</span>' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div style="width:60px;height:6px;background:#f3f4f6;border-radius:3px;overflow:hidden;"><div style="width:' + progressPercent + '%;height:100%;background:' + progressColor + ';border-radius:3px;"></div></div>' +
                '<span style="font-size:11px;color:' + progressColor + ';font-weight:600;">' + progressPercent + '%</span>' +
                '</div>' +
                '</div>' +
                timelineHtml +
                '</div>';
        }).join('');
        
        var emptyCardsHtml = g.records.filter(function(r) { return !r.target_company || !r.target_company.trim(); }).map(function(r) {
            return '<div style="margin-bottom:8px;padding:8px;background:#f9f9f9;border:1px dashed #d1d5db;border-radius:6px;text-align:center;color:#9ca3af;font-size:12px;">' +
                '（未填写企业）' +
                '<button onclick="editFusionTarget(' + r.id + ')" style="margin-left:8px;font-size:10px;padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;background:white;cursor:pointer;color:#666;">添加</button>' +
                '</div>';
        }).join('');
        
        var totalCompanies = g.records.filter(function(r) { return r.target_company && r.target_company.trim(); }).length;
        var expandBtnId = 'expandBtn_' + g.manager_name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + g.line;
        var cardContainerId = 'cards_' + g.manager_name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + g.line;
        
        var headerHtml = '<div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="toggleCompanyCards(\\'' + expandBtnId + '\\x27,\\'' + cardContainerId + '\\x27)">' +
            '<span style="font-size:16px;">▸</span>' +
            '<span style="font-weight:600;color:#374151;font-size:14px;">' + g.manager_name + '</span>' +
            lineBadge +
            '<span style="font-size:11px;color:#6b7280;">（' + totalCompanies + '家企业）</span>' +
            '</div>';
        
        var addCompanyBtn = '<button onclick="addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;">+ 添加目标企业</button>';
        
        var cardsContainer = '<div id="' + cardContainerId + '" style="display:none;margin-top:10px;">' + companyCardsHtml + emptyCardsHtml + addCompanyBtn + '</div>';
        
        var summaryHtml = '<div style="display:flex;gap:16px;align-items:center;">' +
            '<div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:#374151;">' + g.task_count + '</div><div style="font-size:10px;color:#6b7280;">任务数</div></div>' +
            '<div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:#22c55e;">' + g.completed_count + '</div><div style="font-size:10px;color:#6b7280;">完成数</div></div>' +
            '<div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:' + rateColor + ';">' + rate + '%</div><div style="font-size:10px;color:#6b7280;">完成率</div></div>' +
            '</div>';
        
        return '<tr style="border-bottom:1px solid #f3f4f6;">' +
            '<td style="padding:12px 8px;vertical-align:top;">' + headerHtml + cardsContainer + '</td>' +
            '<td style="padding:12px 8px;vertical-align:top;">' + summaryHtml + '</td>' +
            '<td style="padding:12px 8px;white-space:nowrap;vertical-align:top;">' +
                '<button onclick="editGroupField(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\x27,\\'task_count\\',\\'' + g.task_count + '\\')" style="padding:4px 8px;font-size:12px;background:white;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;margin-right:4px;">编辑</button>' +
                '<button onclick="deleteManagerGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="padding:4px 8px;font-size:12px;background:white;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;color:#dc2626;">删除</button>' +
            '</td>' +
        '</tr>'; 
    }).join('');
"""

    content = content[:start_idx] + new_render + content[end_idx:]
    print("Replaced rendering section")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
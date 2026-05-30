#!/usr/bin/env python3
"""修复融合攻坚模块：去掉条线标注 + 添加对接客户经理字段"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# =============================================
# 1. 去掉 lineBadge 变量（第1处）
# =============================================
old_manager_block = """                    var statusIcon = getStatusIcon(mg);
                    var companyList = Object.values(mg.companies);
                    var coDots = companyList.map(function(co) {
                        return co.records.length > 0
                            ? '<span style="color:#22c55e;" title="' + co.name + ' 已跟进">●</span>'
                            : '<span style="color:#fbbf24;" title="' + co.name + ' 待跟进">○</span>';
                    }).join('');

                    var lastFollow = '';
                    var allEmpty = mg.completed_count === 0;
                    var allDone = mg.completed_count >= mg.task_count && mg.task_count > 0;
                    var statusLabel = allDone ? '<span style="color:#22c55e;font-size:11px;font-weight:500;">已完成</span>'
                        : allEmpty ? '<span style="color:#d1d5db;font-size:11px;font-weight:500;">未开始</span>'
                        : '<span style="color:#f59e0b;font-size:11px;font-weight:500;">进行中</span>';

                    if (mg.records.length > 0) {
                        var sortedRecs = mg.records.slice().sort(function(a, b) { return (b.updated_at||'').localeCompare(a.updated_at||''); });
                        var lastRec = sortedRecs[0];
                        lastFollow = lastRec && lastRec.updated_at ? lastRec.updated_at.substr(0, 16).replace('T', ' ') : '';
                    }

                    html += '<div class="fusion-row" style="display:flex;align-items:center;padding:10px 14px;background:white;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background 0.12s;" onmouseenter="showFusionActions(this)" onmouseleave="hideFusionActions(this)" onclick="toggleFusionManagerRow(this)">';

                    // Status icon
                    html += '<div style="font-size:16px;margin-right:10px;width:20px;text-align:center;">' + statusIcon + '</div>';

                    // Manager name + badge
                    html += '<div style="min-width:80px;flex:1;">';
                    html += '<div style="font-weight:600;font-size:13px;color:#1f2937;">' + mg.manager_name + '</div>';
                    html += lineBadge;
                    html += '</div>';

                    // Company dots + names preview"""

new_manager_block = """                    var statusIcon = getStatusIcon(mg);
                    var companyList = Object.values(mg.companies);
                    var coDots = companyList.map(function(co) {
                        return co.records.length > 0
                            ? '<span style="color:#22c55e;" title="' + co.name + ' 已跟进">●</span>'
                            : '<span style="color:#fbbf24;" title="' + co.name + ' 待跟进">○</span>';
                    }).join('');

                    var lastFollow = '';
                    var allEmpty = mg.completed_count === 0;
                    var allDone = mg.completed_count >= mg.task_count && mg.task_count > 0;
                    var statusLabel = allDone ? '<span style="color:#22c55e;font-size:11px;font-weight:500;">已完成</span>'
                        : allEmpty ? '<span style="color:#d1d5db;font-size:11px;font-weight:500;">未开始</span>'
                        : '<span style="color:#f59e0b;font-size:11px;font-weight:500;">进行中</span>';

                    if (mg.records.length > 0) {
                        var sortedRecs = mg.records.slice().sort(function(a, b) { return (b.updated_at||'').localeCompare(a.updated_at||''); });
                        var lastRec = sortedRecs[0];
                        lastFollow = lastRec && lastRec.updated_at ? lastRec.updated_at.substr(0, 16).replace('T', ' ') : '';
                    }

                    html += '<div class="fusion-row" style="display:flex;align-items:center;padding:10px 14px;background:white;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background 0.12s;" onmouseenter="showFusionActions(this)" onmouseleave="hideFusionActions(this)" onclick="toggleFusionManagerRow(this)">';

                    // Status icon
                    html += '<div style="font-size:16px;margin-right:10px;width:20px;text-align:center;">' + statusIcon + '</div>';

                    // Manager name
                    html += '<div style="min-width:80px;flex:1;">';
                    html += '<div style="font-weight:600;font-size:13px;color:#1f2937;">' + mg.manager_name + '</div>';
                    html += '</div>';

                    // Company dots + names preview"""

if old_manager_block in content:
    content = content.replace(old_manager_block, new_manager_block)
    print("✅ 去掉 lineBadge 完成")
else:
    print("⚠️ 找不到 lineBadge manager block，尝试备用方案")

# =============================================
# 2. 公司卡片加 contact_manager 展示
# =============================================
old_card_header = """                        html += '<div style="border:' + borderLeft + ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:' + cardBg + ';position:relative;">';
                        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
                        html += '<div onclick="event.stopPropagation(); editFusionCompanyName(this, \\'' + co.name.replace(/'/g, "\\\\'") + '\\', ' + co.records[0].id + ')" style="font-size:13px;font-weight:600;color:#1f2937;cursor:pointer;flex:1;padding:2px 4px;border-radius:4px;transition:background 0.12s;" onmouseenter="this.style.background=\\'#fef3c7\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击修改企业名称">' + co.name + ' <span style="font-size:10px;color:#9ca3af;">✏️</span></div>';
                        html += '<div onclick="event.stopPropagation(); editFusionRecordCounts(this, ' + co.records[0].id + ')" style="cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.12s;" onmouseenter="this.style.background=\\'#f3f4f6\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击修改">';
                        html += '<span style="color:#22c55e;font-weight:600;font-size:13px;">' + coComp + '</span>';
                        html += '<span style="color:#d1d5db;margin:0 2px;">/</span>';
                        html += '<span style="color:#6b7280;font-size:13px;">' + coTask + '</span>';
                        html += '</div>';
                        html += '<div onclick="event.stopPropagation(); incFusionRecordCompleted(' + co.records[0].id + ', ' + coTask + ', ' + coComp + ')" style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;" onmouseenter="this.style.background=\\'#dcfce7\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击+1完成">';
                        html += '<div style="width:44px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="width:' + coRate + '%;height:100%;background:' + coRateColor + ';border-radius:2px;"></div></div>';
                        html += '<span style="font-size:12px;font-weight:bold;color:' + coRateColor + ';">' + coRate + '%</span>';
                        html += '</div>';
                        html += '<button onclick="event.stopPropagation(); addFusionFollowInline(this, \\'' + mg.manager_name.replace(/'/g, "\\\\'") + '\\', \\'' + (mg.line||'') + '\\', \\'' + type + '\\', \\'' + co.name.replace(/'/g, "\\\\'") + '\\')" style="padding:3px 10px;font-size:11px;background:#667eea;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:500;transition:background 0.12s;" onmouseenter="this.style.background=\\'#5a67d8\\'" onmouseleave="this.style.background=\\'#667eea\\'">+ 跟进</button>';
                        html += '</div>';"""

new_card_header = """                        var contactMgr = co.records.length > 0 && co.records[0].contact_manager ? co.records[0].contact_manager : '';
                        html += '<div style="border:' + borderLeft + ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:' + cardBg + ';position:relative;">';
                        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
                        html += '<div style="flex:1;min-width:0;">';
                        html += '<div onclick="event.stopPropagation(); editFusionCompanyName(this, \\'' + co.name.replace(/'/g, "\\\\'") + '\\', ' + co.records[0].id + ')" style="font-size:13px;font-weight:600;color:#1f2937;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;" onmouseenter="this.style.background=\\'#fef3c7\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击修改企业名称">' + co.name + ' <span style="font-size:10px;color:#9ca3af;">✏️</span></div>';
                        html += '<div onclick="event.stopPropagation(); editFusionContactMgr(this, ' + co.records[0].id + ', \\'' + (contactMgr||'').replace(/'/g, "\\\\'") + '\\')" style="font-size:11px;color:#7c3aed;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;margin-top:2px;" onmouseenter="this.style.background=\\'#ede9fe\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击修改对接客户经理">' + (contactMgr ? '👤 ' + contactMgr : '➕ 添加对接客户经理') + '</div>';
                        html += '</div>';
                        html += '<div onclick="event.stopPropagation(); editFusionRecordCounts(this, ' + co.records[0].id + ')" style="cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.12s;" onmouseenter="this.style.background=\\'#f3f4f6\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击修改">';
                        html += '<span style="color:#22c55e;font-weight:600;font-size:13px;">' + coComp + '</span>';
                        html += '<span style="color:#d1d5db;margin:0 2px;">/</span>';
                        html += '<span style="color:#6b7280;font-size:13px;">' + coTask + '</span>';
                        html += '</div>';
                        html += '<div onclick="event.stopPropagation(); incFusionRecordCompleted(' + co.records[0].id + ', ' + coTask + ', ' + coComp + ')" style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;" onmouseenter="this.style.background=\\'#dcfce7\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击+1完成">';
                        html += '<div style="width:44px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="width:' + coRate + '%;height:100%;background:' + coRateColor + ';border-radius:2px;"></div></div>';
                        html += '<span style="font-size:12px;font-weight:bold;color:' + coRateColor + ';">' + coRate + '%</span>';
                        html += '</div>';
                        html += '<button onclick="event.stopPropagation(); addFusionFollowInline(this, \\'' + mg.manager_name.replace(/'/g, "\\\\'") + '\\', \\'' + (mg.line||'') + '\\', \\'' + type + '\\', \\'' + co.name.replace(/'/g, "\\\\'") + '\\')" style="padding:3px 10px;font-size:11px;background:#667eea;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:500;transition:background 0.12s;" onmouseenter="this.style.background=\\'#5a67d8\\'" onmouseleave="this.style.background=\\'#667eea\\'">+ 跟进</button>';
                        html += '</div>';"""

if old_card_header in content:
    content = content.replace(old_card_header, new_card_header)
    print("✅ 添加 contact_manager 展示完成")
else:
    print("⚠️ 找不到 company card header，尝试备用方案")
    # 尝试不用转义的版本
    alt_old = old_card_header.replace("\\\\'", "\\'")
    if alt_old in content:
        content = content.replace(alt_old, new_card_header)
        print("✅ alt 版本替换成功")
    else:
        print("❌ 找不到 company card header")

# =============================================
# 3. 去掉看板视图里的 lineBadge（kanban）
# =============================================
# 看板视图里没有 lineBadge，这里先找一下有没有

# =============================================
# 4. 添加 editFusionContactMgr 函数（在 addFusionCompanyInline 后）
# =============================================
add_company_func = """        function addFusionCompanyInline(el, managerName, line, targetType) {
            var companyName = prompt('\\u8f93\\u5165\\u76ee\\u6807\\u4f01\\u4e1a\\u540d\\u79f0:', '');
            if (!companyName || !companyName.trim()) return;
            fetch('/api/fusion/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manager_name: managerName, line: line, target_type: targetType, target_company: companyName.trim(), follow_record: '', task_count: 1, completed_count: 0 })
            }).then(function() { loadFusionData(); });
        }"""

edit_contact_func = """
        function editFusionContactMgr(el, followId, currentContact) {
            var newContact = prompt('\\u8f93\\u5165\\u5bf9\\u63a5\\u5ba2\\u6237\\u7ecf\\u7406\\u59d4\\u5458(\\u96f6\\u552e\\u6761\\u7ebf):', currentContact || '');
            if (newContact === null) return;
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact_manager: newContact.trim() })
            }).then(function() { loadFusionData(); });
        }"""

if add_company_func in content:
    content = content.replace(add_company_func, add_company_func + edit_contact_func)
    print("✅ 添加 editFusionContactMgr 函数完成")
else:
    print("⚠️ 找不到 addFusionCompanyInline，尝试备用方案")
    alt_add = add_company_func.replace("\\u", "\\u")
    if add_company_func in content:
        content = content.replace(add_company_func, add_company_func + edit_contact_func)
        print("✅ add 函数替换成功")
    else:
        print("❌ 找不到 addFusionCompanyInline 函数")

# =============================================
# 5. 后端 PATCH 允许 contact_manager 字段
# =============================================
backend_file = '/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js'
with open(backend_file, 'r') as f:
    bcontent = f.read()

old_allowed = "const allowed = ['manager_name','task_category','target_type','line','task_count','completed_count','open_red_task','open_red_completed','status','follow_record','target_company'];"
new_allowed = "const allowed = ['manager_name','task_category','target_type','line','task_count','completed_count','open_red_task','open_red_completed','status','follow_record','target_company','contact_manager'];"

if old_allowed in bcontent:
    bcontent = bcontent.replace(old_allowed, new_allowed)
    with open(backend_file, 'w') as f:
        f.write(bcontent)
    print("✅ 后端 PATCH 允许 contact_manager 完成")
else:
    print("⚠️ 后端 allowed 字段未变化（可能已有 contact_manager）")

# =============================================
# 保存
# =============================================
with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("✅ 前端 index.html 保存完成")
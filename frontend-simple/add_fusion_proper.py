#!/usr/bin/env python3
"""
Properly add fusion module without breaking existing tabs/structure
Step by step approach with verification at each step - FIXED VERSION
"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

print(f"Original file size: {len(content)}")

# === STEP 1: Verify original tabs are correct ===
tab_check = content.count("switchTab('fusion')")
print(f"Fusion tab count before: {tab_check}")
if tab_check != 0:
    print("ERROR: fusion already exists in original!")
    exit(1)

# === STEP 2: Add fusion tab button after reminders ===
reminders_btn = '<button class="tab" onclick="switchTab(\'reminders\')">智能提醒</button>'
idx = content.find(reminders_btn)
if idx == -1:
    print("ERROR: Could not find reminders button!")
    exit(1)

fusion_btn = '''<button class="tab" onclick="switchTab('fusion')">融合攻坚</button>'''
insert_pos = idx + len(reminders_btn)
content = content[:insert_pos] + '\n            ' + fusion_btn + content[insert_pos:]
print("Step 1: Added fusion tab button")

# === STEP 3: Add fusion tab HTML container ===
# Find remindersTab div closing - look for the pattern after remindersList
# The reminders tab section ends with: remindersList</div>\n        </div>\n    </div>
# We want to insert fusionTab BEFORE the </div> that closes the tabs container (before <!-- 全局 Loading -->)

reminders_close_marker = '''            <div id="remindersList"></div>
        </div>
    </div>

    <!-- 全局 Loading -->'''

idx = content.find(reminders_close_marker)
if idx == -1:
    print("ERROR: Could not find reminders close marker!")
    exit(1)

# Insert position is at the start of the marker
insert_pos = idx

# Build fusion tab HTML
fusion_tab_html = '''
        <div id="fusionTab" style="display:none;">
            <div style="background:white;border-radius:12px;padding:14px;margin-bottom:12px;">
                <h2 style="font-size:16px;font-weight:600;color:#374151;margin-bottom:8px;">融合攻坚目标追踪</h2>
                <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
                    <select id="fusionLineFilter" onchange="loadFusionData()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;min-width:120px;">
                        <option value="">全部条线</option>
                        <option value="批发">批发</option>
                        <option value="零售">零售</option>
                    </select>
                    <button onclick="loadFusionData()" style="padding:5px 10px;font-size:12px;background:white;color:#666;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;">刷新</button>
                </div>
                <div id="fusionDashboard" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;"></div>
            </div>
            
            <div id="fusionTablesContainer">
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:12px;">
                    <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:#92400e;">B2C保险</div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;min-width:500px;">
                            <thead><tr style="background:#fef3c3;">
                                <th style="padding:8px 10px;text-align:left;font-size:12px;color:#92400e;">客户经理 · 企业（点击展开）</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">任务/完成/率</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">操作</th>
                            </tr></thead>
                            <tbody id="fusionB2CInsurance"></tbody>
                        </table>
                    </div>
                </div>

                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:12px;">
                    <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:#92400e;">B2C小微贷</div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;min-width:500px;">
                            <thead><tr style="background:#fef3c3;">
                                <th style="padding:8px 10px;text-align:left;font-size:12px;color:#92400e;">客户经理 · 企业（点击展开）</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">任务/完成/率</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">操作</th>
                            </tr></thead>
                            <tbody id="fusionB2CLoan"></tbody>
                        </table>
                    </div>
                </div>

                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:12px;">
                    <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:#92400e;">B2C百人代发</div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;min-width:500px;">
                            <thead><tr style="background:#fef3c3;">
                                <th style="padding:8px 10px;text-align:left;font-size:12px;color:#92400e;">客户经理 · 企业（点击展开）</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">任务/完成/率</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">操作</th>
                            </tr></thead>
                            <tbody id="fusionB2CPayroll"></tbody>
                        </table>
                    </div>
                </div>

                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px;margin-bottom:12px;">
                    <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:#1e40af;">C2B授信</div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;min-width:500px;">
                            <thead><tr style="background:#dbeafe;">
                                <th style="padding:8px 10px;text-align:left;font-size:12px;color:#1e40af;">客户经理 · 企业（点击展开）</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#1e40af;">任务/完成/率</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#1e40af;">操作</th>
                            </tr></thead>
                            <tbody id="fusionC2BCredit"></tbody>
                        </table>
                    </div>
                </div>

                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px;">
                    <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:#1e40af;">C2B高质量开户</div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;min-width:500px;">
                            <thead><tr style="background:#dbeafe;">
                                <th style="padding:8px 10px;text-align:left;font-size:12px;color:#1e40af;">客户经理 · 企业（点击展开）</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#1e40af;">任务/完成/率</th>
                                <th style="padding:8px;text-align:center;font-size:12px;color:#1e40af;">操作</th>
                            </tr></thead>
                            <tbody id="fusionC2BAccount"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
'''

content = content[:insert_pos] + fusion_tab_html + content[insert_pos:]
print("Step 2: Added fusion tab HTML")

# === STEP 4: Add fusion JavaScript - find switchTab and add loadFusionData ===
old_referrals_check = "if (tab==='referrals') { loadReferrals(); }"
idx = content.find(old_referrals_check)
if idx == -1:
    print("WARNING: Could not find referrals check in switchTab")
else:
    fusion_check = "if (tab==='fusion') { loadFusionData(); }\n            "
    content = content[:idx] + fusion_check + content[idx:]
    print("Step 3: Added fusion check in switchTab")

# === STEP 5: Add fusion JS functions before </script> ===
last_script_idx = content.rfind('</script>')
if last_script_idx == -1:
    print("ERROR: Could not find closing </script>!")
    exit(1)

fusion_js = '''

        // ========== 融合攻坚目标追踪 ==========
        var allFusionTargets = [];
        
        function loadFusionData() {
            var lineFilter = (document.getElementById('fusionLineFilter') || {}).value || '';
            var followUrl = '/api/fusion/followup' + (lineFilter ? '?line=' + encodeURIComponent(lineFilter) : '');
            Promise.all([
                fetch('/api/fusion/dashboard').then(function(r) { return r.json(); }),
                fetch(followUrl).then(function(r) { return r.json(); })
            ]).then(function(results) {
                renderFusionDashboard(results[0]);
                allFusionTargets = results[1];
                renderAllTables();
            }).catch(function(e) { console.error(e); });
        }
        
        function renderFusionDashboard(data) {
            var container = document.getElementById('fusionDashboard');
            if (!container) return;
            var typeMap = {
                'B2C保险': { color: '#f59e0b', bg: '#fef3c3' },
                'B2C小微贷': { color: '#f59e0b', bg: '#fef3c3' },
                'B2C百人代发': { color: '#f59e0b', bg: '#fef3c3' },
                'C2B高质量开户': { color: '#3b82f6', bg: '#dbeafe' },
                'C2B授信': { color: '#3b82f6', bg: '#dbeafe' }
            };
            container.innerHTML = data.map(function(d) {
                var style = typeMap[d.target_type] || { color: '#6b7280', bg: '#f3f4f6' };
                var rate = d.completion_rate || 0;
                var rateColor = rate >= 50 ? '#22c55e' : rate > 0 ? '#f59e0b' : '#ef4444';
                return '<div style="background:' + style.bg + ';border-left:4px solid ' + style.color + ';padding:12px;border-radius:8px;">' +
                    '<div style="font-size:13px;font-weight:600;color:' + style.color + ';margin-bottom:4px;">' + d.target_type + '</div>' +
                    '<div style="font-size:22px;font-weight:bold;color:' + rateColor + ';margin-bottom:2px;">' + rate + '%</div>' +
                    '<div style="font-size:12px;color:#666;">' + d.total_completed + '/' + d.total_task + ' · ' + d.manager_count + '人</div>' +
                    '</div>';
            }).join('');
        }
        
        function renderAllTables() {
            var types = ['B2C保险','B2C小微贷','B2C百人代发','C2B高质量开户','C2B授信'];
            var ids = ['fusionB2CInsurance','fusionB2CLoan','fusionB2CPayroll','fusionC2BAccount','fusionC2BCredit'];
            types.forEach(function(t, i) {
                var el = document.getElementById(ids[i]);
                if (el) renderFusionTableByType(t, el);
            });
        }
        
        function renderFusionTableByType(targetType, tbody) {
            var rows = allFusionTargets.filter(function(r) { return r.target_type === targetType; });
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:#999;">暂无数据</td></tr>';
                return;
            }
            var groups = {};
            rows.forEach(function(r) {
                var key = r.manager_name + '||' + r.line;
                if (!groups[key]) {
                    groups[key] = { manager_name: r.manager_name, line: r.line, task_count: 0, completed_count: 0, records: [] };
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
                
                var expandBtnId = 'expandBtn_' + g.manager_name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + g.line;
                var cardContainerId = 'cards_' + g.manager_name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + g.line;
                
                var companyCardsHtml = g.records.filter(function(r) { return r.target_company && r.target_company.trim(); }).map(function(r) {
                    var companyName = r.target_company;
                    var followText = r.follow_record && r.follow_record.trim() ? r.follow_record : '';
                    var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
                    var recordProgress = g.task_count > 0 ? Math.round((r.completed_count || 0) / g.task_count * 100) : 0;
                    var progressColor = recordProgress >= 50 ? '#22c55e' : recordProgress > 0 ? '#f59e0b' : '#ef4444';
                    
                    var timelineHtml = '';
                    if (followText) {
                        timelineHtml = '<div style="margin-top:8px;padding:6px 8px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px;font-size:11px;color:#065f46;">' +
                            '<div style="font-size:9px;color:#059669;font-weight:600;margin-bottom:3px;">' + companyName + ' · ' + time + '</div>' +
                            '<div style="font-size:12px;color:#374151;line-height:1.4;">' + followText + '</div>' +
                            '<button onclick="openFollowEdit(' + r.id + ')" style="margin-top:6px;font-size:10px;padding:2px 8px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;color:#666;">编辑</button>' +
                            '</div>';
                    } else {
                        timelineHtml = '<div style="margin-top:8px;padding:6px 8px;background:#fef3c3;border-left:3px solid #f59e0b;border-radius:4px;font-size:11px;color:#92400e;">' +
                            '<div style="font-size:10px;">暂无跟进记录</div>' +
                            '<button onclick="openFollowAdd(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + r.target_type + '\\')" style="margin-top:4px;font-size:10px;padding:2px 8px;border:1px dashed #f59e0b;border-radius:4px;background:#fff;cursor:pointer;color:#92400e;">+ 添加跟进</button>' +
                            '</div>';
                    }
                    return '<div style="margin-bottom:10px;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">' +
                        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
                        '<span style="font-weight:600;color:#374151;font-size:13px;">' + companyName + '</span>' +
                        '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<div style="width:60px;height:6px;background:#f3f4f6;border-radius:3px;overflow:hidden;"><div style="width:' + recordProgress + '%;height:100%;background:' + progressColor + ';"></div></div>' +
                        '<span style="font-size:11px;color:' + progressColor + ';font-weight:600;">' + recordProgress + '%</span>' +
                        '</div></div>' + timelineHtml + '</div>';
                }).join('');
                
                var emptyCardsHtml = g.records.filter(function(r) { return !r.target_company || !r.target_company.trim(); }).map(function(r) {
                    return '<div style="margin-bottom:8px;padding:8px;background:#f9f9f9;border:1px dashed #d1d5db;border-radius:6px;text-align:center;color:#9ca3af;font-size:12px;">' +
                        '（未填写企业）' +
                        '<button onclick="editFusionTarget(' + r.id + ')" style="margin-left:8px;font-size:10px;padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;background:white;cursor:pointer;color:#666;">添加</button>' +
                        '</div>';
                }).join('');
                
                var totalCompanies = g.records.filter(function(r) { return r.target_company && r.target_company.trim(); }).length;
                var headerHtml = '<div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="toggleCompanyCards(\'' + expandBtnId + '\x27,\'' + cardContainerId + '\x27)">' +
                    '<span style="font-size:16px;">▸</span>' +
                    '<span style="font-weight:600;color:#374151;font-size:14px;">' + g.manager_name + '</span>' +
                    lineBadge +
                    '<span style="font-size:11px;color:#6b7280;">（' + totalCompanies + '家企业）</span></div>';
                
                var addCompanyBtn = '<button onclick="addCompanyForGroup(\'' + g.manager_name + '\x27,\'' + g.line + '\x27,\'' + targetType + '\')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;">+ 添加目标企业</button>';
                var cardsContainer = '<div id="' + cardContainerId + '" style="display:none;margin-top:10px;">' + companyCardsHtml + emptyCardsHtml + addCompanyBtn + '</div>';
                
                var summaryHtml = '<div style="display:flex;gap:16px;align-items:center;">' +
                    '<div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:#374151;">' + g.task_count + '</div><div style="font-size:10px;color:#6b7280;">任务数</div></div>' +
                    '<div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:#22c55e;">' + g.completed_count + '</div><div style="font-size:10px;color:#6b7280;">完成数</div></div>' +
                    '<div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:' + rateColor + ';">' + rate + '%</div><div style="font-size:10px;color:#6b7280;">完成率</div></div></div>';
                
                return '<tr style="border-bottom:1px solid #f3f4f6;">' +
                    '<td style="padding:12px 8px;vertical-align:top;">' + headerHtml + cardsContainer + '</td>' +
                    '<td style="padding:12px 8px;vertical-align:top;">' + summaryHtml + '</td>' +
                    '<td style="padding:12px 8px;white-space:nowrap;vertical-align:top;">' +
                    '<button onclick="editGroupField(\'' + g.manager_name + '\x27,\'' + g.line + '\x27,\'' + targetType + '\x27,\'task_count\',\'' + g.task_count + '\')" style="padding:4px 8px;font-size:12px;background:white;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;margin-right:4px;">编辑</button>' +
                    '<button onclick="deleteManagerGroup(\'' + g.manager_name + '\x27,\'' + g.line + '\x27,\'' + targetType + '\')" style="padding:4px 8px;font-size:12px;background:white;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;color:#dc2626;">删除</button></td></tr>';
            }).join('');
        }
        
        function toggleCompanyCards(btnId, cardsId) {
            var btn = document.getElementById(btnId);
            var cards = document.getElementById(cardsId);
            if (!btn || !cards) return;
            var isOpen = cards.style.display !== 'none';
            cards.style.display = isOpen ? 'none' : 'block';
            if (btn.innerHTML.indexOf('▸') > -1) {
                btn.innerHTML = '<span style="font-size:16px;">▾</span> ' + btn.innerHTML.replace('<span style="font-size:16px;">▸</span> ', '');
            } else {
                btn.innerHTML = '<span style="font-size:16px;">▸</span> ' + btn.innerHTML.replace('<span style="font-size:16px;">▾</span> ', '');
            }
        }
        
        function deleteManagerGroup(managerName, line, targetType) {
            if (!confirm('确定要删除 ' + managerName + ' 的所有记录吗？')) return;
            var groupRecords = allFusionTargets.filter(function(r) {
                return r.manager_name === managerName && r.line === line && r.target_type === targetType;
            });
            var ids = groupRecords.map(function(r) { return r.id; });
            if (!ids.length) return;
            Promise.all(ids.map(function(id) {
                return fetch('/api/fusion/followup/' + id, { method: 'DELETE' });
            })).then(function() { loadFusionData(); });
        }
        
        function openFollowEdit(id) {
            var record = allFusionTargets.find(function(r) { return r.id === id; });
            if (!record) return;
            var newRecord = prompt('编辑跟进记录:', record.follow_record || '');
            if (newRecord === null) return;
            fetch('/api/fusion/followup/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ follow_record: newRecord.trim() })
            }).then(function(res) {
                if (res.ok) {
                    record.follow_record = newRecord.trim();
                    renderAllTables();
                }
            });
        }
        
        function openFollowAdd(managerName, line, targetType) {
            var record = prompt('请输入跟进记录:');
            if (!record || !record.trim()) return;
            var data = {
                manager_name: managerName,
                task_category: targetType,
                target_type: targetType,
                line: line,
                task_count: 0,
                completed_count: 0,
                target_company: '',
                follow_record: record.trim(),
                status: '进行中'
            };
            fetch('/api/fusion/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(function(res) { return res.json(); }).then(function(result) {
                if (result.id) loadFusionData();
            });
        }
        
        function addCompanyForGroup(managerName, line, targetType) {
            var company = prompt('请输入目标企业名称:');
            if (!company || !company.trim()) return;
            var data = {
                manager_name: managerName,
                line: line,
                target_type: targetType,
                task_category: targetType,
                task_count: 0,
                completed_count: 0,
                target_company: company.trim(),
                follow_record: '',
                status: '进行中'
            };
            fetch('/api/fusion/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(function(res) { return res.json(); }).then(function(result) {
                if (result.id) loadFusionData();
            });
        }
        
        function editGroupField(managerName, line, targetType, field, currentVal) {
            var newVal = prompt('修改 ' + field + ':', currentVal);
            if (newVal === null || newVal === '') return;
            newVal = field === 'task_count' || field === 'completed_count' ? parseInt(newVal) || 0 : newVal;
            var groupRecords = allFusionTargets.filter(function(r) {
                return r.manager_name === managerName && r.line === line && r.target_type === targetType;
            });
            Promise.all(groupRecords.map(function(r) {
                var body = {};
                body[field] = newVal;
                return fetch('/api/fusion/followup/' + r.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            })).then(function() { loadFusionData(); });
        }
        
        function editFusionTarget(id) {
            var record = allFusionTargets.find(function(r) { return r.id === id; });
            if (!record) return;
            var modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
            var typeColor = record.target_type.startsWith('B2C') ? '#92400e' : '#1e40af';
            var lineColor = record.line === '批发' ? '#1e40af' : '#92400e';
            var typeBg = record.target_type.startsWith('B2C') ? '#fef3c3' : '#dbeafe';
            modal.innerHTML = '<div style="background:white;border-radius:12px;padding:24px;width:90%;max-width:420px;">' +
                '<h3 style="margin-bottom:16px;">编辑目标</h3>' +
                '<div style="display:flex;gap:12px;margin-bottom:12px;">' +
                '<div style="flex:1;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">任务类型</label><div style="padding:8px;background:' + typeBg + ';border-radius:6px;color:' + typeColor + ';font-weight:500;">' + record.target_type + '</div></div>' +
                '<div style="flex:1;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">条线</label><div style="padding:8px;background:' + (record.line === '批发' ? '#dbeafe' : '#fef3c3') + ';border-radius:6px;color:' + lineColor + ';font-weight:500;">' + record.line + '</div></div>' +
                '</div>' +
                '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">目标企业</label><input id="editTargetCompany" type="text" value="' + (record.target_company || '') + '" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;" placeholder="输入企业名称"/></div>' +
                '<div style="display:flex;gap:12px;margin-bottom:12px;">' +
                '<div style="flex:1;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">任务数</label><input id="editTaskCount" type="number" value="' + record.task_count + '" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;" min="0"/></div>' +
                '<div style="flex:1;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">完成数</label><input id="editCompletedCount" type="number" value="' + record.completed_count + '" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;" min="0"/></div>' +
                '</div>' +
                '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                '<button onclick="this.closest(\'div\').parentNode.remove()" style="padding:8px 16px;border:1px solid #e5e7eb;border-radius:6px;background:white;color:#6b7280;cursor:pointer;">取消</button>' +
                '<button id="saveFusionBtn" style="padding:8px 16px;border:none;border-radius:6px;background:#667eea;color:white;cursor:pointer;">保存</button>' +
                '</div></div>';
            document.body.appendChild(modal);
            modal.querySelector('#saveFusionBtn').onclick = function() {
                var data = {
                    target_company: document.getElementById('editTargetCompany').value.trim(),
                    task_count: parseInt(document.getElementById('editTaskCount').value) || 0,
                    completed_count: parseInt(document.getElementById('editCompletedCount').value) || 0
                };
                fetch('/api/fusion/followup/' + id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(function(res) { return res.json(); }).then(function() {
                    modal.remove();
                    loadFusionData();
                });
            };
            modal.onclick = function(e) {
                if (e.target === modal) modal.remove();
            };
        }
'''

content = content[:last_script_idx] + fusion_js + content[last_script_idx:]
print("Step 4: Added fusion JavaScript functions")
print(f"Final file size: {len(content)}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("\nDone! Fusion module added properly.")
print("Verifying tab order...")
import subprocess
result = subprocess.run(['curl', '-s', 'http://localhost:3001/'], capture_output=True, text=True)
tabs = [line for line in result.stdout.split('\n') if 'switchTab' in line and 'tab' in line.lower()]
print(f"Tab buttons found: {len([t for t in tabs if '<button' in t])}")
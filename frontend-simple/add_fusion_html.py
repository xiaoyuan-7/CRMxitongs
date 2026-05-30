#!/usr/bin/env python3
# Add fusion tracking tab to the CRM system - Step 1: Add HTML section

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find the location to add fusion tab - after the tabs section around line 514
# Look for the tab buttons area and add fusion tab button
tab_button_marker = "switchTab('fusion')"
idx = content.find(tab_button_marker)

if idx > 0:
    # Found the switchTab call for fusion - check if the tab button itself exists
    if "融合攻坚" not in content[idx-500:idx]:
        print("Adding fusion tab button...")
        # Add tab button before the fusionTab div
        fusion_tab_html = """                <button class="tab" onclick="switchTab('fusion')">融合攻坚</button>
"""
        # Find the tab button section - look for the tab before fusion (likely reminders)
        prev_tab = "switchTab('reminders')"
        prev_idx = content.find(prev_tab)
        if prev_idx > 0:
            insert_idx = prev_idx
            # Check if we need to add the button before reminders or after todo
            todo_marker = "switchTab('todo')"
            todo_idx = content.find(todo_marker)
            if todo_idx > 0 and todo_idx < idx:
                insert_idx = todo_idx + len(todo_marker)
                content = content[:insert_idx] + "\n                <button class=\"tab\" onclick=\"switchTab('fusion')\">融合攻坚</button>" + content[insert_idx:]
                print("Added fusion tab button after todo")
            else:
                content = content[:idx] + "\n                <button class=\"tab\" onclick=\"switchTab('fusion')\">融合攻坚</button>" + content[idx:]
                print("Added fusion tab button before switchTab call")
    else:
        print("Fusion tab button already exists")

# Now find where to add the fusion tab content div - look for remindersTab
reminders_tab_marker = 'id="remindersTab"'
reminders_idx = content.find(reminders_tab_marker)

if reminders_idx > 0:
    # Find the end of remindersTab div to insert fusionTab before it
    # The div structure is: <div id="remindersTab" ...>...</div>
    # We want to insert fusionTab before remindersTab
    content = content[:reminders_idx] + '''    <div id="fusionTab" style="display:none;">
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
''' + content[reminders_idx:]
    print("Added fusion tab HTML")
else:
    print("Could not find remindersTab location")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
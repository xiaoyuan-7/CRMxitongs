with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# 1. Replace the fusionTab HTML
old_html = '''        <div id="fusionTab" style="display:none;">
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
                    <table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#fef3c3;"><th style="padding:8px 10px;text-align:left;font-size:12px;color:#92400e;">客户经理</th><th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">任务/完成</th><th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">操作</th></tr></thead><tbody id="fusionB2CInsurance"></tbody></table>
                </div>
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:12px;">
                    <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:#92400e;">B2C小微贷</div>
                    <table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#fef3c3;"><th style="padding:8px 10px;text-align:left;font-size:12px;color:#92400e;">客户经理</th><th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">任务/完成</th><th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">操作</th></tr></thead><tbody id="fusionB2CLoan"></tbody></table>
                </div>
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px;">
                    <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:#1e40af;">C2B授信 + 高质量开户</div>
                    <table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#dbeafe;"><th style="padding:8px 10px;text-align:left;font-size:12px;color:#1e40af;">客户经理</th><th style="padding:8px;text-align:center;font-size:12px;color:#1e40af;">任务/完成</th><th style="padding:8px;text-align:center;font-size:12px;color:#1e40af;">操作</th></tr></thead><tbody id="fusionC2B"></tbody></table>
                </div>
            </div>
        </div>'''

new_html = '''        <div id="fusionTab" style="display:none;">
            <div style="background:white;border-radius:12px;padding:14px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <h2 style="font-size:16px;font-weight:600;color:#374151;margin:0;">融合攻坚目标追踪</h2>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <select id="fusionLineFilter" onchange="loadFusionData()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;min-width:110px;">
                            <option value="">全部条线</option>
                            <option value="批发">批发</option>
                            <option value="零售">零售</option>
                        </select>
                        <button onclick="loadFusionData()" style="padding:6px 12px;font-size:12px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">🔄 刷新</button>
                    </div>
                </div>
                <div id="fusionDashboard" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:4px;"></div>
            </div>
            <div id="fusionContent" style="padding:0 4px;"></div>
        </div>'''

if old_html in content:
    content = content.replace(old_html, new_html)
    print("HTML replaced OK")
else:
    print("HTML block not found exactly, checking...")
    idx = content.find('id="fusionTab"')
    print(f"fusionTab at index: {idx}")
    idx2 = content.find('id="fusionTablesContainer"')
    print(f"fusionTablesContainer at index: {idx2}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
print("File written OK")
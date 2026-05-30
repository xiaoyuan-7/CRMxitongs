with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

old_html = '''        <div id="fusionTab" style="display:none;">
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

new_html = '''        <div id="fusionTab" style="display:none;">
            <div style="background:white;border-radius:12px;padding:14px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                    <h2 style="font-size:16px;font-weight:600;color:#374151;margin:0;">融合攻坚目标追踪</h2>
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <input id="fusionSearch" oninput="renderFusionContent()" placeholder="🔍 搜索客户经理/企业" style="padding:5px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;min-width:130px;outline:none;" onkeypress="if(event.keyCode===13)renderFusionContent()"/>
                        <select id="fusionStatusFilter" onchange="renderFusionContent()" style="padding:5px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;min-width:100px;">
                            <option value="">全部状态</option>
                            <option value="已完成">已完成</option>
                            <option value="进行中">进行中</option>
                            <option value="未开始">未开始</option>
                        </select>
                        <select id="fusionLineFilter" onchange="loadFusionData()" style="padding:5px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;min-width:100px;">
                            <option value="">全部条线</option>
                            <option value="批发">批发</option>
                            <option value="零售">零售</option>
                        </select>
                        <button onclick="loadFusionData()" style="padding:5px 12px;font-size:12px;background:#667eea;color:white;border:none;border-radius:6px;cursor:pointer;">🔄 刷新</button>
                    </div>
                </div>
                <div id="fusionDashboard" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:4px;"></div>
            </div>
            <!-- Column header bar -->
            <div id="fusionListHeader" style="display:flex;align-items:center;padding:6px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;font-size:11px;color:#9ca3af;font-weight:500;gap:8px;margin-bottom:0;overflow:hidden;">
                <div style="width:20px;"></div>
                <div style="min-width:80px;flex:1;">客户经理</div>
                <div style="flex:2;min-width:0;">企业进度</div>
                <div style="min-width:60px;text-align:center;">任务/完成</div>
                <div style="min-width:70px;text-align:center;">完成率</div>
                <div style="min-width:55px;text-align:center;">状态</div>
                <div style="min-width:85px;text-align:right;">最近跟进</div>
                <div style="width:16px;"></div>
            </div>
            <div id="fusionContent" style="padding:0;"></div>
        </div>'''

if old_html in content:
    content = content.replace(old_html, new_html)
    print("HTML replaced OK")
else:
    print("HTML not found!")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
print("Written, size:", len(content))
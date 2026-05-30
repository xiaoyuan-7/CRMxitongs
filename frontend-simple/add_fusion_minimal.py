#!/usr/bin/env python3
"""Careful, minimal fusion module addition - only what's needed"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

print(f"Original size: {len(content)}")

# STEP 1: Add fusion tab button (only once, after reminders)
reminders_btn = "<button class=\"tab\" onclick=\"switchTab('reminders')\">智能提醒</button>"
if content.count("switchTab('fusion')") == 0:
    idx = content.find(reminders_btn)
    if idx > 0:
        insert_pos = idx + len(reminders_btn)
        content = content[:insert_pos] + "\n            <button class=\"tab\" onclick=\"switchTab('fusion')\">融合攻坚</button>" + content[insert_pos:]
        print("Step 1: Added fusion tab button")
    else:
        print("ERROR: reminders button not found")
else:
    print("Step 1: fusion button already exists")

# STEP 2: Add fusionTab div (inside the tab container, before globalLoading comment)
fusion_html = '''

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
        </div>
'''

# Find insertion point: before <!-- 全局 Loading -->
insert_marker = "<!-- 全局 Loading -->"
idx = content.find(insert_marker)
if idx > 0:
    content = content[:idx] + fusion_html + content[idx:]
    print("Step 2: Added fusionTab HTML")
else:
    print("ERROR: global loading marker not found")

# STEP 3: Add fusion to switchTab tab list and handler
old_list = "['leads','tasks','companies','referrals','todo','weekly','reminders']"
new_list = "['leads','tasks','companies','referrals','todo','weekly','reminders','fusion']"
if old_list in content:
    content = content.replace(old_list, new_list)
    print("Step 3: Added fusion to tab list")
else:
    print("WARNING: tab list pattern not found")

old_handler = "if (tab==='todo') { loadTodos(); updateWeekTaskSummary(); }"
new_handler = "if (tab==='todo') { loadTodos(); updateWeekTaskSummary(); }\n            if (tab==='fusion') { loadFusionData(); }"
if old_handler in content:
    content = content.replace(old_handler, new_handler)
    print("Step 3: Added fusion handler")
else:
    print("WARNING: todo handler pattern not found")

# STEP 4: Add fusion JS functions at end of script (before </script>)
fusion_js = '''

        // ========== 融合攻坚目标追踪 ==========
        var allFusionTargets = [];
        function loadFusionData() {
            var lineFilter = (document.getElementById("fusionLineFilter") || {}).value || "";
            var followUrl = "/api/fusion/followup" + (lineFilter ? "?line=" + encodeURIComponent(lineFilter) : "");
            Promise.all([
                fetch("/api/fusion/dashboard").then(function(r) { return r.json(); }),
                fetch(followUrl).then(function(r) { return r.json(); })
            ]).then(function(results) {
                renderFusionDashboard(results[0]);
                allFusionTargets = results[1];
                renderAllTables();
            }).catch(function(e) { console.error(e); });
        }
        function renderFusionDashboard(data) {
            var container = document.getElementById("fusionDashboard");
            if (!container) return;
            var typeMap = { "B2C保险": { color: "#f59e0b", bg: "#fef3c3" }, "B2C小微贷": { color: "#f59e0b", bg: "#fef3c3" }, "C2B授信": { color: "#3b82f6", bg: "#dbeafe" }, "C2B高质量开户": { color: "#3b82f6", bg: "#dbeafe" } };
            container.innerHTML = data.map(function(d) {
                var style = typeMap[d.target_type] || { color: "#6b7280", bg: "#f3f4f6" };
                var rate = d.completion_rate || 0;
                var rateColor = rate >= 50 ? "#22c55e" : rate > 0 ? "#f59e0b" : "#ef4444";
                return "<div style=\"background:" + style.bg + ";border-left:4px solid " + style.color + ";padding:12px;border-radius:8px;\">" +
                    "<div style=\"font-size:13px;font-weight:600;color:" + style.color + ";margin-bottom:4px;\">" + d.target_type + "</div>" +
                    "<div style=\"font-size:22px;font-weight:bold;color:" + rateColor + ";margin-bottom:2px;\">" + rate + "%</div>" +
                    "<div style=\"font-size:12px;color:#666;\">" + d.total_completed + "/" + d.total_task + " · " + d.manager_count + "人</div></div>";
            }).join("");
        }
        function renderAllTables() {
            var types = ["B2C保险", "B2C小微贷", "C2B授信"];
            var ids = ["fusionB2CInsurance", "fusionB2CLoan", "fusionC2B"];
            types.forEach(function(t, i) {
                var el = document.getElementById(ids[i]);
                if (el) renderFusionTableByType(t, el);
            });
        }
        function renderFusionTableByType(targetType, tbody) {
            var rows = allFusionTargets.filter(function(r) { return r.target_type === targetType; });
            if (!rows.length) { tbody.innerHTML = "<tr><td colspan=3 style=text-align:center;padding:16px;color:#999;>暂无数据</td></tr>"; return; }
            var groups = {};
            rows.forEach(function(r) {
                var key = r.manager_name + "||" + r.line;
                if (!groups[key]) groups[key] = { manager_name: r.manager_name, line: r.line, task_count: 0, completed_count: 0, records: [] };
                groups[key].task_count += r.task_count || 0;
                groups[key].completed_count += r.completed_count || 0;
                groups[key].records.push(r);
            });
            tbody.innerHTML = Object.values(groups).map(function(g) {
                var rate = g.task_count > 0 ? Math.round(g.completed_count / g.task_count * 100) : 0;
                var rateColor = rate >= 50 ? "#22c55e" : rate > 0 ? "#f59e0b" : "#ef4444";
                var lineBadge = g.line === "批发" ? "<span style=color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:11px;>批发</span>" : "<span style=color:#92400e;background:#fef3c3;padding:1px 6px;border-radius:4px;font-size:11px;>零售</span>";
                var companies = g.records.filter(function(r) { return r.target_company && r.target_company.trim(); });
                var companyHtml = companies.map(function(r) { return "<div style=margin-top:4px;font-size:12px;>" + (r.target_company || "未填") + " <span style=color:#666;>(" + (r.completed_count||0) + "/" + (r.task_count||0) + ")</span></div>"; }).join("");
                return "<tr style=border-bottom:1px solid #f3f4f6;><td style=padding:8px;><b>" + g.manager_name + "</b> " + lineBadge + companyHtml + "</td><td style=padding:8px;text-align:center;>" + g.completed_count + "/" + g.task_count + " <span style=color:" + rateColor + ">(" + rate + "%)</span></td><td style=padding:8px;text-align:center;><button onclick=editFusionGroup('" + g.manager_name + "','" + g.line + "','" + targetType + "') style=padding:4px 8px;font-size:12px;background:white;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;>编辑</button></td></tr>";
            }).join("");
        }
        function editFusionGroup(managerName, line, targetType) {
            var groupRecords = allFusionTargets.filter(function(r) { return r.manager_name === managerName && r.line === line && r.target_type === targetType; });
            if (!groupRecords.length) return;
            var r = groupRecords[0];
            var newTask = prompt("修改任务数:", r.task_count);
            if (newTask === null) return;
            var newCompleted = prompt("修改完成数:", r.completed_count);
            if (newCompleted === null) return;
            Promise.all(groupRecords.map(function(rec) {
                return fetch("/api/fusion/followup/" + rec.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task_count: parseInt(newTask)||0, completed_count: parseInt(newCompleted)||0 }) });
            })).then(function() { loadFusionData(); });
        }
'''

last_script_idx = content.rfind("</script>")
if last_script_idx > 0:
    content = content[:last_script_idx] + fusion_js + content[last_script_idx:]
    print("Step 4: Added fusion JS functions")
else:
    print("ERROR: closing script tag not found")

print(f"Final size: {len(content)}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("\nAll done!")
print("Verifying...")
import subprocess
result = subprocess.check_output(['curl', '-s', 'http://localhost:3001/'])
print(f"Server response size: {len(result)} bytes")
if b'fusionTab' in result:
    print("✓ fusionTab found in response")
if b'switchTab' in result and b"'fusion'" in result:
    print("✓ switchTab('fusion') found in response")
if b'loadFusionData' in result:
    print("✓ loadFusionData found in response")
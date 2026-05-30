with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The old functions block to replace
old_js = '''        function loadFusionData() {
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
                return '<div style="background:' + style.bg + ';border-left:4px solid ' + style.color + ';padding:12px;border-radius:8px;">' +
                    '<div style="font-size:13px;font-weight:600;color:' + style.color + ';margin-bottom:4px;">' + d.target_type + '</div>' +
                    '<div style="font-size:22px;font-weight:bold;color:' + rateColor + ';margin-bottom:2px;">' + rate + '%</div>' +
                    '<div style="font-size:12px;color:#666;">' + d.total_completed + '/' + d.total_task + ' · ' + d.manager_count + '人</div></div>';
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
        }'''

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/fusion_new_js.py', 'r') as f:
    new_js = f.read()

if old_js in content:
    content = content.replace(old_js, new_js)
    print("JS replaced OK")
else:
    print("Old JS not found!")
    idx = content.find('function loadFusionData')
    print(f"loadFusionData at: {idx}")
    idx2 = content.find('function editFusionGroup')
    print(f"editFusionGroup at: {idx2}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
print("Written OK, size:", len(content))
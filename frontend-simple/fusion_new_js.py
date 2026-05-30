function loadFusionData() {
            var lineFilter = (document.getElementById("fusionLineFilter") || {}).value || "";
            var followUrl = "/api/fusion/followup" + (lineFilter ? "?line=" + encodeURIComponent(lineFilter) : "");
            Promise.all([
                fetch("/api/fusion/dashboard").then(function(r) { return r.json(); }),
                fetch(followUrl).then(function(r) { return r.json(); })
            ]).then(function(results) {
                renderFusionDashboard(results[0]);
                allFusionTargets = results[1];
                renderFusionContent();
            }).catch(function(e) { console.error(e); });
        }

        function renderFusionDashboard(data) {
            var container = document.getElementById("fusionDashboard");
            if (!container) return;
            var typeMap = {
                "B2C保险": { color: "#f59e0b", bg: "#fef3c3", label: "B2C保险" },
                "B2C小微贷": { color: "#f59e0b", bg: "#fef3c3", label: "B2C小微贷" },
                "B2C百人代发": { color: "#f59e0b", bg: "#fef3c3", label: "B2C百人代发" },
                "C2B授信": { color: "#3b82f6", bg: "#dbeafe", label: "C2B授信" },
                "C2B高质量开户": { color: "#3b82f6", bg: "#dbeafe", label: "C2B高质量开户" },
                "B2B百人代发": { color: "#8b5cf6", bg: "#ede9fe", label: "B2B百人代发" }
            };
            container.innerHTML = data.map(function(d) {
                var style = typeMap[d.target_type] || { color: "#6b7280", bg: "#f3f4f6", label: d.target_type };
                var rate = d.completion_rate || 0;
                var rateColor = rate >= 50 ? "#22c55e" : rate > 0 ? "#f59e0b" : "#ef4444";
                return '<div style="background:' + style.bg + ';border-left:4px solid ' + style.color + ';padding:10px 12px;border-radius:8px;cursor:pointer;" onclick="scrollToManager(\'' + d.target_type + '\')">' +
                    '<div style="font-size:12px;font-weight:600;color:' + style.color + ';margin-bottom:4px;">' + style.label + '</div>' +
                    '<div style="font-size:20px;font-weight:bold;color:' + rateColor + ';margin-bottom:2px;">' + rate + '%</div>' +
                    '<div style="font-size:11px;color:#666;">' + (d.total_completed || 0) + '/' + (d.total_task || 0) + ' · ' + (d.manager_count || 0) + '人</div></div>';
            }).join("");
        }

        function scrollToManager(targetType) {
            var el = document.getElementById('fusion_type_' + targetType);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function renderFusionContent() {
            var container = document.getElementById("fusionContent");
            if (!container) return;
            if (!allFusionTargets || !allFusionTargets.length) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无数据，请先添加目标企业</div>';
                return;
            }

            // Group by target_type
            var typeGroups = {};
            allFusionTargets.forEach(function(r) {
                var type = r.target_type || r.task_category || '未知';
                if (!typeGroups[type]) typeGroups[type] = [];
                typeGroups[type].push(r);
            });

            var html = '';
            var typeColors = {
                "B2C保险": { header: "#92400e", headerBg: "#fef3c3", card: "#fffbeb", border: "#fde68a" },
                "B2C小微贷": { header: "#92400e", headerBg: "#fef3c3", card: "#fffbeb", border: "#fde68a" },
                "B2C百人代发": { header: "#92400e", headerBg: "#fef3c3", card: "#fffbeb", border: "#fde68a" },
                "C2B授信": { header: "#1e40af", headerBg: "#dbeafe", card: "#eff6ff", border: "#bfdbfe" },
                "C2B高质量开户": { header: "#1e40af", headerBg: "#dbeafe", card: "#eff6ff", border: "#bfdbfe" },
                "B2B百人代发": { header: "#6d28d9", headerBg: "#ede9fe", card: "#f5f3ff", border: "#ddd6fe" }
            };

            Object.keys(typeGroups).forEach(function(type) {
                var records = typeGroups[type];
                var colors = typeColors[type] || { header: "#374151", headerBg: "#f3f4f6", card: "#fff", border: "#e5e7eb" };

                // Group by manager
                var managerGroups = {};
                records.forEach(function(r) {
                    var key = r.manager_name + '||' + r.line;
                    if (!managerGroups[key]) {
                        managerGroups[key] = { manager_name: r.manager_name, line: r.line, companies: {}, task_count: 0, completed_count: 0 };
                    }
                    var co = r.target_company || '未命名企业';
                    if (!managerGroups[key].companies[co]) {
                        managerGroups[key].companies[co] = { name: co, records: [], task_count: 0, completed_count: 0 };
                    }
                    managerGroups[key].companies[co].records.push(r);
                    managerGroups[key].task_count += r.task_count || 0;
                    managerGroups[key].completed_count += r.completed_count || 0;
                });

                var managerCount = Object.keys(managerGroups).length;
                html += '<div id="fusion_type_' + type + '" style="margin-bottom:16px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:' + colors.headerBg + ';border-radius:8px 8px 0 0;border-bottom:2px solid ' + colors.border + ';">';
                html += '<span style="font-size:13px;font-weight:600;color:' + colors.header + ';">📋 ' + type + '</span>';
                html += '<span style="font-size:11px;color:' + colors.header + ';opacity:0.7;">' + managerCount + ' 位客户经理</span>';
                html += '</div>';

                Object.values(managerGroups).forEach(function(mg) {
                    var totalRate = mg.task_count > 0 ? Math.round(mg.completed_count / mg.task_count * 100) : 0;
                    var rateColor = totalRate >= 50 ? "#22c55e" : totalRate > 0 ? "#f59e0b" : "#ef4444";
                    var lineBadge = mg.line === '批发' ? '<span style="color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:6px;">批发</span>' : '<span style="color:#92400e;background:#fef3c3;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:6px;">零售</span>';

                    html += '<div style="background:white;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;margin-bottom:8px;overflow:hidden;">';
                    html += '<div class="fusion-manager-row" onclick="toggleFusionManager(this)" style="display:flex;align-items:center;padding:10px 12px;cursor:pointer;background:#fafafa;border-bottom:1px solid #f3f4f6;transition:background 0.15s;">';
                    html += '<span class="fusion-arrow" style="font-size:12px;color:#667eea;margin-right:8px;transition:transform 0.2s;">▶</span>';
                    html += '<span style="font-weight:600;font-size:13px;color:#374151;flex:1;">' + mg.manager_name + '</span>' + lineBadge;
                    html += '<div style="display:flex;align-items:center;gap:12px;margin-left:auto;">';
                    html += '<div style="text-align:right;">';
                    html += '<div style="font-size:11px;color:#666;">任务/完成</div>';
                    html += '<div style="font-size:13px;font-weight:600;">' + mg.completed_count + ' / ' + mg.task_count + '</div>';
                    html += '</div>';
                    html += '<div style="text-align:center;min-width:50px;">';
                    html += '<div style="font-size:14px;font-weight:bold;color:' + rateColor + ';">' + totalRate + '%</div>';
                    html += '<div style="width:50px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="width:' + totalRate + '%;height:100%;background:' + rateColor + ';border-radius:2px;"></div></div>';
                    html += '</div>';
                    html += '<span style="font-size:12px;color:#999;">' + Object.keys(mg.companies).length + '家企业</span>';
                    html += '</div></div>';

                    // Company cards container (hidden by default)
                    html += '<div class="fusion-manager-companies" style="display:none;padding:8px;background:white;">';
                    Object.values(mg.companies).forEach(function(co) {
                        var coRate = co.task_count > 0 ? Math.round(co.completed_count / co.task_count * 100) : 0;
                        var coRateColor = coRate >= 50 ? "#22c55e" : coRate > 0 ? "#f59e0b" : "#ef4444";
                        var borderColor = co.records.length > 0 ? "#22c55e" : "#f59e0b";
                        var borderLeft = co.records.length > 0 ? "3px solid #22c55e" : "3px solid #f59e0b";
                        var timelineBg = co.records.length > 0 ? "#f0fdf4" : "#fffbeb";

                        html += '<div style="border:' + borderLeft + ';border-radius:6px;padding:8px 10px;margin-bottom:6px;background:' + timelineBg + ';">';
                        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
                        html += '<div style="font-size:12px;font-weight:600;color:#374151;">' + co.name + '</div>';
                        html += '<div style="display:flex;align-items:center;gap:8px;">';
                        html += '<div style="display:flex;align-items:center;gap:4px;">';
                        html += '<div style="width:40px;height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="width:' + coRate + '%;height:100%;background:' + coRateColor + ';border-radius:2px;"></div></div>';
                        html += '<span style="font-size:12px;font-weight:bold;color:' + coRateColor + ';">' + coRate + '%</span>';
                        html += '</div>';
                        html += '<span style="font-size:11px;color:#666;">' + co.completed_count + '/' + co.task_count + '</span>';
                        html += '</div></div>';

                        // Follow-up timeline
                        if (co.records.length > 0) {
                            html += '<div style="margin-top:6px;padding-left:8px;border-left:2px solid #d1d5db;">';
                            co.records.slice().reverse().forEach(function(rec) {
                                var recDate = rec.updated_at ? rec.updated_at.substr(0, 16) : '无时间';
                                var recContent = rec.follow_record || '暂无跟进内容';
                                html += '<div style="margin-bottom:6px;font-size:11px;line-height:1.4;">';
                                html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">';
                                html += '<span style="color:#22c55e;font-size:10px;">●</span>';
                                html += '<span style="color:#666;font-size:10px;">' + recDate + '</span>';
                                html += '<span style="margin-left:auto;display:flex;gap:4px;">';
                                html += '<button onclick="editFusionFollow(this, ' + rec.id + ')" style="padding:1px 6px;font-size:10px;background:white;border:1px solid #e5e7eb;border-radius:4px;cursor:pointer;color:#666;">编辑</button>';
                                html += '<button onclick="deleteFusionFollow(' + rec.id + ')" style="padding:1px 6px;font-size:10px;background:white;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;color:#ef4444;">删除</button>';
                                html += '</span></div>';
                                html += '<div style="color:#374151;padding-left:14px;">' + escapeHtml(recContent.substring(0, 200)) + '</div>';
                                html += '</div>';
                            });
                            html += '</div>';
                        } else {
                            html += '<div style="margin-top:4px;font-size:11px;color:#f59e0b;text-align:center;padding:4px;background:#fef3c3;border-radius:4px;">⚠️ 暂未跟进</div>';
                        }

                        // Add follow-up button
                        html += '<div style="margin-top:4px;text-align:center;">';
                        html += '<button onclick="addFusionFollow(this, \'' + mg.manager_name + '\', \'' + (mg.line || '') + '\', \'' + type + '\', \'' + co.name + '\')" style="padding:3px 10px;font-size:11px;background:white;color:#667eea;border:1px solid #667eea;border-radius:4px;cursor:pointer;">+ 添加跟进</button>';
                        html += '</div>';
                    });

                    // Add company button
                    html += '<div style="text-align:center;margin-top:4px;">';
                    html += '<button onclick="addFusionCompany(this, \'' + mg.manager_name + '\', \'' + (mg.line || '') + '\', \'' + type + '\')" style="padding:4px 12px;font-size:11px;background:#f3f4f6;color:#666;border:1px dashed #d1d5db;border-radius:4px;cursor:pointer;">+ 添加目标企业</button>';
                    html += '</div></div>'; // close company cards container
                    html += '</div>'; // close manager row
                });

                html += '</div>';
            });

            container.innerHTML = html;
        }

        function toggleFusionManager(el) {
            var arrow = el.querySelector('.fusion-arrow');
            var companies = el.nextElementSibling;
            if (!companies) return;
            var isOpen = companies.style.display !== 'none';
            if (isOpen) {
                companies.style.display = 'none';
                arrow.textContent = '▶';
                arrow.style.transform = '';
            } else {
                companies.style.display = 'block';
                arrow.textContent = '▼';
                arrow.style.transform = 'rotate(0deg)';
            }
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        }

        function addFusionFollow(el, managerName, line, targetType, companyName) {
            var content = prompt('添加跟进记录:', '');
            if (content === null) return;
            fetch('/api/fusion/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    manager_name: managerName,
                    line: line,
                    target_type: targetType,
                    target_company: companyName,
                    follow_record: content,
                    task_count: 1,
                    completed_count: 0
                })
            }).then(function(r) { return r.json(); }).then(function() {
                loadFusionData();
            });
        }

        function editFusionFollow(el, followId) {
            var newContent = prompt('编辑跟进记录:', '');
            if (newContent === null) return;
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ follow_record: newContent })
            }).then(function(r) { return r.json(); }).then(function() {
                loadFusionData();
            });
        }

        function deleteFusionFollow(followId) {
            if (!confirm('确定删除这条跟进记录？')) return;
            fetch('/api/fusion/followup/' + followId, { method: 'DELETE' }).then(function(r) { return r.json(); }).then(function() {
                loadFusionData();
            });
        }

        function addFusionCompany(el, managerName, line, targetType) {
            var companyName = prompt('输入目标企业名称:', '');
            if (!companyName || !companyName.trim()) return;
            fetch('/api/fusion/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    manager_name: managerName,
                    line: line,
                    target_type: targetType,
                    target_company: companyName.trim(),
                    follow_record: '',
                    task_count: 1,
                    completed_count: 0
                })
            }).then(function(r) { return r.json(); }).then(function() {
                loadFusionData();
            });
        }
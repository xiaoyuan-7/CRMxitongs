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
                "B2C保险": { color: "#f59e0b", bg: "#fef3c3" },
                "B2C小微贷": { color: "#f59e0b", bg: "#fef3c3" },
                "B2C百人代发": { color: "#f59e0b", bg: "#fef3c3" },
                "C2B授信": { color: "#3b82f6", bg: "#dbeafe" },
                "C2B高质量开户": { color: "#3b82f6", bg: "#dbeafe" },
                "B2B百人代发": { color: "#8b5cf6", bg: "#ede9fe" }
            };
            container.innerHTML = data.map(function(d) {
                var style = typeMap[d.target_type] || { color: "#6b7280", bg: "#f3f4f6" };
                var rate = d.completion_rate || 0;
                var rateColor = rate >= 50 ? "#22c55e" : rate > 0 ? "#f59e0b" : "#ef4444";
                return '<div style="background:' + style.bg + ';border-left:4px solid ' + style.color + ';padding:10px 12px;border-radius:8px;cursor:pointer;" onclick="scrollToManager(\'' + d.target_type + '\')">' +
                    '<div style="font-size:12px;font-weight:600;color:' + style.color + ';margin-bottom:4px;">' + d.target_type + '</div>' +
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
                container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无数据</div>';
                return;
            }

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

                html += '<div id="fusion_type_' + type + '" style="margin-bottom:16px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:' + colors.headerBg + ';border-radius:8px 8px 0 0;border-bottom:2px solid ' + colors.border + ';">';
                html += '<span style="font-size:13px;font-weight:600;color:' + colors.header + ';">📋 ' + type + '</span>';
                html += '<span style="font-size:11px;color:' + colors.header + ';opacity:0.7;">' + Object.keys(managerGroups).length + ' 位客户经理</span>';
                html += '</div>';

                Object.values(managerGroups).forEach(function(mg) {
                    var totalRate = mg.task_count > 0 ? Math.round(mg.completed_count / mg.task_count * 100) : 0;
                    var rateColor = totalRate >= 50 ? "#22c55e" : totalRate > 0 ? "#f59e0b" : "#ef4444";
                    var lineBadge = mg.line === '批发'
                        ? '<span style="color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:6px;">批发</span>'
                        : '<span style="color:#92400e;background:#fef3c3;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:6px;">零售</span>';

                    html += '<div style="background:white;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;margin-bottom:8px;overflow:hidden;">';
                    html += '<div class="fusion-manager-row" onclick="toggleFusionManager(this)" style="display:flex;align-items:center;padding:10px 12px;cursor:pointer;background:#fafafa;border-bottom:1px solid #f3f4f6;">';
                    html += '<span class="fusion-arrow" style="font-size:12px;color:#667eea;margin-right:8px;transition:transform 0.2s;display:inline-block;width:12px;text-align:center;">▶</span>';
                    html += '<span style="font-weight:600;font-size:13px;color:#374151;flex:1;">' + mg.manager_name + '</span>' + lineBadge;
                    html += '<div style="display:flex;align-items:center;gap:16px;margin-left:auto;">';

                    // task/completed - click to edit
                    html += '<div onclick="event.stopPropagation(); editFusionCounts(this, \'' + mg.manager_name + '\', \'' + (mg.line||'') + '\', \'' + type + '\')" style="text-align:center;cursor:pointer;padding:4px 8px;border-radius:6px;transition:background 0.15s;" onmouseenter="this.style.background=\'#f3f4f6\'" onmouseleave="this.style.background=\'transparent\'" title="点击修改任务/完成数">';
                    html += '<div style="font-size:11px;color:#666;margin-bottom:2px;">任务 / 完成</div>';
                    html += '<div style="font-size:14px;font-weight:600;color:#374151;">' + mg.completed_count + ' / ' + mg.task_count + '</div>';
                    html += '</div>';

                    // progress bar - click to increment completed
                    html += '<div onclick="event.stopPropagation(); incFusionCompleted(\'' + mg.manager_name + '\', \'' + (mg.line||'') + '\', \'' + type + '\')" style="text-align:center;min-width:60px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:background 0.15s;" onmouseenter="this.style.background=\'#f3f4f6\'" onmouseleave="this.style.background=\'transparent\'" title="点击+1完成数">';
                    html += '<div style="font-size:14px;font-weight:bold;color:' + rateColor + ';">' + totalRate + '%</div>';
                    html += '<div style="width:60px;height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin-top:3px;"><div style="width:' + totalRate + '%;height:100%;background:' + rateColor + ';border-radius:3px;transition:width 0.3s;"></div></div>';
                    html += '</div>';

                    html += '<span style="font-size:12px;color:#999;white-space:nowrap;">' + Object.keys(mg.companies).length + '家企业</span>';
                    html += '</div></div>';

                    // Company cards
                    html += '<div class="fusion-manager-companies" style="display:none;">';
                    Object.values(mg.companies).forEach(function(co) {
                        var coTaskCount = 0, coCompleted = 0;
                        co.records.forEach(function(r) { coTaskCount += r.task_count||0; coCompleted += r.completed_count||0; });
                        var coRate = coTaskCount > 0 ? Math.round(coCompleted / coTaskCount * 100) : 0;
                        var coRateColor = coRate >= 50 ? "#22c55e" : coRate > 0 ? "#f59e0b" : "#ef4444";
                        var hasFollow = co.records.length > 0;
                        var borderLeft = hasFollow ? "3px solid #22c55e" : "3px solid #f59e0b";
                        var timelineBg = hasFollow ? "#f0fdf4" : "#fffbeb";

                        html += '<div style="border:' + borderLeft + ';border-radius:6px;padding:10px 12px;margin:6px 8px;background:' + timelineBg + ';position:relative;">';

                        // Header: company name (editable) + task/completed counts + progress
                        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
                        // Company name - click to edit
                        html += '<div onclick="event.stopPropagation(); editFusionCompanyName(this, \'' + co.name + '\', ' + co.records[0].id + ')" style="font-size:13px;font-weight:600;color:#1f2937;cursor:pointer;flex:1;padding:2px 4px;border-radius:4px;transition:background 0.15s;" onmouseenter="this.style.background=\'#fef3c3\'" onmouseleave="this.style.background=\'transparent\'" title="点击修改企业名称">' + co.name + ' <span style="font-size:10px;color:#9ca3af;">✏️</span></div>';

                        // Task/Completed - click to edit
                        html += '<div onclick="event.stopPropagation(); editFusionRecordCounts(this, ' + co.records[0].id + ')" style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:12px;color:#6b7280;transition:background 0.15s;" onmouseenter="this.style.background=\'#f3f4f6\'" onmouseleave="this.style.background=\'transparent\'" title="点击修改任务/完成数">';
                        html += '<span style="color:#22c55e;font-weight:600;">' + coCompleted + '</span>';
                        html += '<span style="color:#d1d5db;">/</span>';
                        html += '<span style="color:#6b7280;">' + coTaskCount + '</span>';
                        html += '</div>';

                        // Progress bar - click to increment completed
                        html += '<div onclick="event.stopPropagation(); incFusionRecordCompleted(' + co.records[0].id + ', ' + coTaskCount + ', ' + coCompleted + ')" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.15s;" onmouseenter="this.style.background=\'#dcfce7\'" onmouseleave="this.style.background=\'transparent\'" title="点击+1完成数">';
                        html += '<div style="width:48px;height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden;"><div style="width:' + coRate + '%;height:100%;background:' + coRateColor + ';border-radius:3px;"></div></div>';
                        html += '<span style="font-size:12px;font-weight:bold;color:' + coRateColor + ';">' + coRate + '%</span>';
                        html += '</div>';

                        html += '</div>';

                        // Follow-up timeline
                        if (hasFollow) {
                            html += '<div style="padding-left:10px;border-left:2px solid #bbf7d0;margin-top:6px;">';
                            co.records.slice().reverse().forEach(function(rec) {
                                var recDate = rec.updated_at ? rec.updated_at.substr(0, 16).replace('T', ' ') : '无时间';
                                var recContent = rec.follow_record || '';
                                // Click content to edit
                                html += '<div style="margin-bottom:8px;position:relative;" onmouseenter="this.querySelector(\'.fusion-op-btns\').style.opacity=\'1\'" onmouseleave="this.querySelector(\'.fusion-op-btns\').style.opacity=\'0\'">';
                                html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">';
                                html += '<span style="color:#22c55e;font-size:9px;">●</span>';
                                html += '<span style="font-size:11px;color:#9ca3af;">' + recDate + '</span>';
                                html += '<span class="fusion-op-btns" style="margin-left:auto;display:flex;gap:4px;opacity:0;transition:opacity 0.15s;">';
                                html += '<button onclick="event.stopPropagation(); editFusionFollowInline(this, ' + rec.id + ', \'' + escapeHtmlForAttr(recContent) + '\')" style="padding:1px 6px;font-size:10px;background:white;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;color:#6b7280;">编辑</button>';
                                html += '<button onclick="event.stopPropagation(); deleteFusionFollow(' + rec.id + ')" style="padding:1px 6px;font-size:10px;background:white;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;color:#ef4444;">删除</button>';
                                html += '</span></div>';
                                // Click content to edit inline
                                html += '<div onclick="event.stopPropagation(); editFusionFollowInline(this, ' + rec.id + ', \'' + escapeHtmlForAttr(recContent) + '\')" style="font-size:12px;color:#374151;line-height:1.5;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.15s;" onmouseenter="this.style.background=\'#dcfce7\'" onmouseleave="this.style.background=\'transparent\'" title="点击编辑跟进内容">' + (recContent || '<span style="color:#d1d5db;font-style:italic;">暂无内容，点击添加</span>') + '</div>';
                                html += '</div>';
                            });
                            html += '</div>';
                        } else {
                            html += '<div style="text-align:center;padding:6px;background:#fef3c3;border-radius:4px;margin-top:4px;font-size:11px;color:#f59e0b;">⚠️ 暂无跟进记录</div>';
                        }

                        // Add follow button
                        html += '<div style="text-align:center;margin-top:6px;">';
                        html += '<button onclick="event.stopPropagation(); addFusionFollowInline(this, \'' + mg.manager_name + '\', \'' + (mg.line||'') + '\', \'' + type + '\', \'' + escapeHtmlForAttr(co.name) + '\')" style="padding:3px 10px;font-size:11px;background:white;color:#667eea;border:1px solid #667eea;border-radius:4px;cursor:pointer;">+ 添加跟进</button>';
                        html += '</div>';
                        html += '</div>';
                    });

                    // Add company button
                    html += '<div style="text-align:center;margin:4px 8px 8px;">';
                    html += '<button onclick="event.stopPropagation(); addFusionCompanyInline(this, \'' + mg.manager_name + '\', \'' + (mg.line||'') + '\', \'' + type + '\')" style="padding:4px 12px;font-size:11px;background:#f9fafb;color:#9ca3af;border:1px dashed #d1d5db;border-radius:4px;cursor:pointer;transition:all 0.15s;" onmouseenter="this.style.background=\'#f3f4f6\';this.style.color=\'#6b7280\'" onmouseleave="this.style.background=\'#f9fafb\';this.style.color=\'#9ca3af\'">+ 添加目标企业</button>';
                    html += '</div></div>';
                });
                html += '</div></div>';
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
            } else {
                companies.style.display = 'block';
                arrow.textContent = '▼';
            }
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        }

        function escapeHtmlForAttr(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, ' ');
        }

        // Edit manager-level task/completed counts
        function editFusionCounts(el, managerName, line, targetType) {
            var records = allFusionTargets.filter(function(r) {
                return r.manager_name === managerName && r.line === line && (r.target_type === targetType || r.task_category === targetType);
            });
            if (!records.length) return;
            var r = records[0];
            var newTask = prompt('修改任务数:', r.task_count);
            if (newTask === null) return;
            var newCompleted = prompt('修改完成数:', r.completed_count);
            if (newCompleted === null) return;
            Promise.all(records.map(function(rec) {
                return fetch('/api/fusion/followup/' + rec.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_count: parseInt(newTask)||0, completed_count: parseInt(newCompleted)||0 })
                });
            })).then(function() { loadFusionData(); });
        }

        // Increment manager-level completed count by 1
        function incFusionCompleted(managerName, line, targetType) {
            var records = allFusionTargets.filter(function(r) {
                return r.manager_name === managerName && r.line === line && (r.target_type === targetType || r.task_category === targetType);
            });
            if (!records.length) return;
            var r = records[0];
            var newCompleted = (r.completed_count || 0) + 1;
            Promise.all(records.map(function(rec) {
                return fetch('/api/fusion/followup/' + rec.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ completed_count: newCompleted })
                });
            })).then(function() { loadFusionData(); });
        }

        // Edit company name
        function editFusionCompanyName(el, oldName, followId) {
            var newName = prompt('修改企业名称:', oldName);
            if (newName === null || !newName.trim() || newName.trim() === oldName) return;
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_company: newName.trim() })
            }).then(function() { loadFusionData(); });
        }

        // Edit record-level task/completed
        function editFusionRecordCounts(el, followId) {
            // Find current values from allFusionTargets
            var rec = allFusionTargets.find(function(r) { return r.id === followId; });
            if (!rec) return;
            var newTask = prompt('修改任务数:', rec.task_count);
            if (newTask === null) return;
            var newCompleted = prompt('修改完成数:', rec.completed_count);
            if (newCompleted === null) return;
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_count: parseInt(newTask)||0, completed_count: parseInt(newCompleted)||0 })
            }).then(function() { loadFusionData(); });
        }

        // Increment record-level completed by 1
        function incFusionRecordCompleted(followId, taskCount, currentCompleted) {
            if (currentCompleted >= taskCount) {
                alert('已完成数已达到任务数上限');
                return;
            }
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed_count: currentCompleted + 1 })
            }).then(function() { loadFusionData(); });
        }

        // Add follow-up inline
        function addFusionFollowInline(el, managerName, line, targetType, companyName) {
            var content = prompt('添加跟进记录:', '');
            if (!content) return;
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
            }).then(function() { loadFusionData(); });
        }

        // Edit follow-up inline
        function editFusionFollowInline(el, followId, currentContent) {
            var decoded = currentContent.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<br>/g, '\n');
            var newContent = prompt('编辑跟进记录:', decoded);
            if (newContent === null) return;
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ follow_record: newContent })
            }).then(function() { loadFusionData(); });
        }

        // Delete follow-up
        function deleteFusionFollow(followId) {
            if (!confirm('确定删除这条跟进记录？')) return;
            fetch('/api/fusion/followup/' + followId, { method: 'DELETE' }).then(function() { loadFusionData(); });
        }

        // Add company inline
        function addFusionCompanyInline(el, managerName, line, targetType) {
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
            }).then(function() { loadFusionData(); });
        }
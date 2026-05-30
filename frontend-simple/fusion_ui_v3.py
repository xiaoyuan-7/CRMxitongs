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
                "B2C保险": { header: "#92400e", headerBg: "#fef3c3" },
                "B2C小微贷": { header: "#92400e", headerBg: "#fef3c3" },
                "B2C百人代发": { header: "#92400e", headerBg: "#fef3c3" },
                "C2B授信": { header: "#1e40af", headerBg: "#dbeafe" },
                "C2B高质量开户": { header: "#1e40af", headerBg: "#dbeafe" },
                "B2B百人代发": { header: "#6d28d9", headerBg: "#ede9fe" }
            };

            Object.keys(typeGroups).forEach(function(type) {
                var records = typeGroups[type];
                var colors = typeColors[type] || { header: "#374151", headerBg: "#f3f4f6" };

                var managerGroups = {};
                records.forEach(function(r) {
                    var key = r.manager_name + '||' + r.line;
                    if (!managerGroups[key]) {
                        managerGroups[key] = { manager_name: r.manager_name, line: r.line, companies: {}, task_count: 0, completed_count: 0, records: [] };
                    }
                    var co = r.target_company || '未命名企业';
                    if (!managerGroups[key].companies[co]) {
                        managerGroups[key].companies[co] = { name: co, records: [], task_count: 0, completed_count: 0 };
                    }
                    managerGroups[key].companies[co].records.push(r);
                    managerGroups[key].companies[co].task_count += r.task_count || 0;
                    managerGroups[key].companies[co].completed_count += r.completed_count || 0;
                    managerGroups[key].task_count += r.task_count || 0;
                    managerGroups[key].completed_count += r.completed_count || 0;
                    managerGroups[key].records.push(r);
                });

                html += '<div id="fusion_type_' + type + '" style="margin-bottom:20px;">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:' + colors.headerBg + ';border-radius:8px 8px 0 0;border-bottom:2px solid ' + (colors.headerBg === "#fef3c3" ? "#fde68a" : colors.headerBg === "#dbeafe" ? "#bfdbfe" : "#ddd6fe") + ';">';
                html += '<span style="font-size:13px;font-weight:600;color:' + colors.header + ';">📋 ' + type + '</span>';
                html += '<span style="font-size:11px;color:' + colors.header + ';opacity:0.7;">' + Object.keys(managerGroups).length + ' 位客户经理</span>';
                html += '</div>';

                Object.values(managerGroups).forEach(function(mg) {
                    var totalRate = mg.task_count > 0 ? Math.round(mg.completed_count / mg.task_count * 100) : 0;
                    var rateColor = totalRate >= 50 ? "#22c55e" : totalRate > 0 ? "#f59e0b" : "#ef4444";
                    var lineBadge = mg.line === '批发'
                        ? '<span style="color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:6px;">批发</span>'
                        : '<span style="color:#92400e;background:#fef3c3;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:6px;">零售</span>';
                    var companyList = Object.values(mg.companies);
                    var coCount = companyList.length;
                    var firstTwo = companyList.slice(0, 2);
                    var restCount = coCount - 2;

                    html += '<div style="background:white;border:1px solid #e5e7eb;border-bottom:none;margin-bottom:8px;overflow:hidden;border-radius:8px 8px 0 0;">';

                    // ===== MANAGER ROW =====
                    html += '<div onclick="toggleFusionManager(this)" style="display:flex;align-items:center;padding:10px 14px;cursor:pointer;background:#fafafa;transition:background 0.15s;" onmouseenter="this.style.background=\'#f0f0f0\'" onmouseleave="this.style.background=\'#fafafa\'">';
                    html += '<span class="fusion-arrow" style="font-size:11px;color:#667eea;margin-right:10px;display:inline-block;width:12px;text-align:center;">▶</span>';
                    html += '<span style="font-weight:600;font-size:13px;color:#374151;flex:1;min-width:80px;">' + mg.manager_name + '</span>' + lineBadge;

                    // Preview companies (shown when collapsed) - only first 2
                    html += '<div class="fusion-preview" style="display:flex;gap:8px;margin-left:12px;flex:1;">';
                    firstTwo.forEach(function(co) {
                        var coR = co.task_count > 0 ? Math.round(co.completed_count / co.task_count * 100) : 0;
                        var coColor = coR >= 50 ? "#22c55e" : coR > 0 ? "#f59e0b" : "#ef4444";
                        var hasFollow = co.records.length > 0;
                        html += '<div onclick="event.stopPropagation(); toggleFusionCompanyPreview(this)" style="display:flex;align-items:center;gap:5px;padding:3px 8px;background:' + (hasFollow ? '#f0fdf4' : '#fffbeb') + ';border:1px solid ' + (hasFollow ? '#bbf7d0' : '#fde68a') + ';border-radius:20px;font-size:11px;cursor:pointer;" title="点击展开跟进记录">';
                        html += '<span style="color:#374151;font-weight:500;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + co.name.substring(0, 8) + '</span>';
                        html += '<span style="color:' + coColor + ';font-weight:600;">' + coR + '%</span>';
                        html += '<span style="color:#9ca3af;font-size:10px;">▼</span>';
                        html += '</div>';
                    });
                    if (restCount > 0) {
                        html += '<div style="padding:3px 8px;font-size:11px;color:#9ca3af;background:#f3f4f6;border-radius:20px;">+' + restCount + '家</div>';
                    }
                    html += '</div>';

                    // Stats
                    html += '<div style="display:flex;align-items:center;gap:14px;margin-left:auto;">';
                    html += '<div onclick="event.stopPropagation(); editFusionCounts(this, \'' + mg.manager_name + '\', \'' + (mg.line||'') + '\', \'' + type + '\')" style="text-align:center;cursor:pointer;padding:3px 8px;border-radius:6px;transition:background 0.15s;" onmouseenter="this.style.background=\'#f3f4f6\'" onmouseleave="this.style.background=\'transparent\'" title="点击修改">';
                    html += '<div style="font-size:10px;color:#9ca3af;margin-bottom:1px;">任务/完成</div>';
                    html += '<div style="font-size:13px;font-weight:600;color:#374151;">' + mg.completed_count + ' / ' + mg.task_count + '</div>';
                    html += '</div>';
                    html += '<div onclick="event.stopPropagation(); incFusionCompleted(\'' + mg.manager_name + '\', \'' + (mg.line||'') + '\', \'' + type + '\')" style="text-align:center;min-width:56px;cursor:pointer;padding:3px 8px;border-radius:6px;transition:background 0.15s;" onmouseenter="this.style.background=\'#dcfce7\'" onmouseleave="this.style.background=\'transparent\'" title="点击+1完成">';
                    html += '<div style="font-size:13px;font-weight:bold;color:' + rateColor + ';">' + totalRate + '%</div>';
                    html += '<div style="width:56px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:2px;"><div style="width:' + totalRate + '%;height:100%;background:' + rateColor + ';border-radius:2px;"></div></div>';
                    html += '</div>';
                    html += '</div></div>';

                    // ===== COMPANY DETAIL SECTION (hidden when collapsed) =====
                    html += '<div class="fusion-manager-detail" style="display:none;padding:8px 14px 12px;background:white;">';
                    companyList.forEach(function(co) {
                        var coTask = co.task_count, coComp = co.completed_count;
                        var coRate = coTask > 0 ? Math.round(coComp / coTask * 100) : 0;
                        var coRateColor = coRate >= 50 ? "#22c55e" : coRate > 0 ? "#f59e0b" : "#ef4444";
                        var hasFollow = co.records.length > 0;
                        var borderLeft = hasFollow ? "3px solid #22c55e" : "3px solid #f59e0b";
                        var cardBg = hasFollow ? "#f0fdf4" : "#fffbeb";

                        html += '<div style="border:' + borderLeft + ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:' + cardBg + ';">';
                        // Company header row
                        html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">';
                        // Company name (editable)
                        html += '<div onclick="event.stopPropagation(); editFusionCompanyName(this, \'' + co.name.replace(/'/g, "\\'") + '\', ' + co.records[0].id + ')" style="font-size:13px;font-weight:600;color:#1f2937;cursor:pointer;flex:1;padding:2px 4px;border-radius:4px;transition:background 0.15s;" onmouseenter="this.style.background=\'#fef3c3\'" onmouseleave="this.style.background=\'transparent\'" title="点击修改企业名称">' + co.name + ' <span style="font-size:10px;color:#9ca3af;">✏️</span></div>';
                        // Task/completed
                        html += '<div onclick="event.stopPropagation(); editFusionRecordCounts(this, ' + co.records[0].id + ')" style="cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.15s;" onmouseenter="this.style.background=\'#f3f4f6\'" onmouseleave="this.style.background=\'transparent\'" title="点击修改">';
                        html += '<span style="color:#22c55e;font-weight:600;font-size:13px;">' + coComp + '</span>';
                        html += '<span style="color:#d1d5db;margin:0 2px;">/</span>';
                        html += '<span style="color:#6b7280;font-size:13px;">' + coTask + '</span>';
                        html += '</div>';
                        // Progress bar (click to +1)
                        html += '<div onclick="event.stopPropagation(); incFusionRecordCompleted(' + co.records[0].id + ', ' + coTask + ', ' + coComp + ')" style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.15s;" onmouseenter="this.style.background=\'#dcfce7\'" onmouseleave="this.style.background=\'transparent\'" title="点击+1完成">';
                        html += '<div style="width:44px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="width:' + coRate + '%;height:100%;background:' + coRateColor + ';border-radius:2px;"></div></div>';
                        html += '<span style="font-size:12px;font-weight:bold;color:' + coRateColor + ';">' + coRate + '%</span>';
                        html += '</div>';
                        // Add follow button
                        html += '<button onclick="event.stopPropagation(); addFusionFollowInline(this, \'' + mg.manager_name.replace(/'/g, "\\'") + '\', \'' + (mg.line||'') + '\', \'' + type + '\', \'' + co.name.replace(/'/g, "\\'") + '\')" style="padding:3px 10px;font-size:11px;background:#667eea;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:500;transition:background 0.15s;" onmouseenter="this.style.background=\'#5a67d8\'" onmouseleave="this.style.background=\'#667eea\'">+ 跟进</button>';
                        html += '</div>';

                        // Follow-up timeline (collapsed by default, click to expand)
                        html += '<div class="fusion-follow-section" style="margin-top:4px;">';
                        if (hasFollow) {
                            html += '<div onclick="event.stopPropagation(); toggleFollowTimeline(this)" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:4px 6px;border-radius:4px;transition:background 0.15s;font-size:11px;color:#6b7280;" onmouseenter="this.style.background=\'#e5e7eb\'" onmouseleave="this.style.background=\'transparent\'">';
                            html += '<span style="color:#22c55e;">●</span>';
                            html += '<span>查看 ' + co.records.length + ' 条跟进记录</span>';
                            html += '<span class="fusion-follow-arrow" style="font-size:10px;transition:transform 0.2s;">▶</span>';
                            html += '</div>';
                            // Timeline hidden by default
                            html += '<div class="fusion-timeline" style="display:none;padding-left:10px;border-left:2px solid #bbf7d0;margin-top:6px;">';
                            co.records.slice().reverse().forEach(function(rec) {
                                var recDate = rec.updated_at ? rec.updated_at.substr(0, 16).replace('T', ' ') : '无时间';
                                var recContent = rec.follow_record || '';
                                var displayContent = recContent ? recContent.substring(0, 150) + (recContent.length > 150 ? '...' : '') : '<span style="color:#d1d5db;font-style:italic;">暂无内容</span>';
                                html += '<div style="margin-bottom:8px;position:relative;" onmouseenter="this.querySelector(\'.f-op\').style.opacity=\'1\'" onmouseleave="this.querySelector(\'.f-op\').style.opacity=\'0\'">';
                                html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">';
                                html += '<span style="color:#9ca3af;font-size:10px;">' + recDate + '</span>';
                                html += '<span class="f-op" style="margin-left:auto;display:flex;gap:3px;opacity:0;transition:opacity 0.15s;">';
                                html += '<button onclick="event.stopPropagation(); editFusionFollowInline(this, ' + rec.id + ', \'' + escapeHtmlForAttr(recContent) + '\')" style="padding:1px 5px;font-size:10px;background:white;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;color:#6b7280;">编辑</button>';
                                html += '<button onclick="event.stopPropagation(); deleteFusionFollow(' + rec.id + ')" style="padding:1px 5px;font-size:10px;background:white;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;color:#ef4444;">删除</button>';
                                html += '</span></div>';
                                // Click content to edit
                                html += '<div onclick="event.stopPropagation(); editFusionFollowInline(this, ' + rec.id + ', \'' + escapeHtmlForAttr(recContent) + '\')" style="font-size:12px;color:#374151;line-height:1.5;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.15s;" onmouseenter="this.style.background=\'#dcfce7\'" onmouseleave="this.style.background=\'transparent\'" title="点击编辑">' + displayContent + '</div>';
                                html += '</div>';
                            });
                            html += '</div>';
                        } else {
                            html += '<div onclick="event.stopPropagation(); addFusionFollowInline(this, \'' + mg.manager_name.replace(/'/g, "\\'") + '\', \'' + (mg.line||'') + '\', \'' + type + '\', \'' + co.name.replace(/'/g, "\\'") + '\')" style="text-align:center;padding:6px;background:#fef3c3;border-radius:4px;font-size:11px;color:#f59e0b;cursor:pointer;transition:background 0.15s;" onmouseenter="this.style.background=\'#fde68a\'" onmouseleave="this.style.background=\'#fef3c3\'">⚠️ 暂无跟进，点击添加第一条</div>';
                        }
                        html += '</div>';
                        html += '</div>';
                    });

                    // Add company button
                    html += '<div style="text-align:center;margin-top:4px;">';
                    html += '<button onclick="event.stopPropagation(); addFusionCompanyInline(this, \'' + mg.manager_name.replace(/'/g, "\\'") + '\', \'' + (mg.line||'') + '\', \'' + type + '\')" style="padding:5px 14px;font-size:11px;background:#f9fafb;color:#9ca3af;border:1px dashed #d1d5db;border-radius:20px;cursor:pointer;transition:all 0.15s;" onmouseenter="this.style.background=\'#f3f4f6\';this.style.color=\'#6b7280\';this.style.borderColor=\'#9ca3af\'" onmouseleave="this.style.background=\'#f9fafb\';this.style.color=\'#9ca3af\';this.style.borderColor=\'#d1d5db\'">+ 添加目标企业</button>';
                    html += '</div></div>';
                });
                html += '</div>';
            });

            container.innerHTML = html;
        }

        function toggleFusionManager(el) {
            var arrow = el.querySelector('.fusion-arrow');
            var detail = el.nextElementSibling;
            if (!detail) return;
            var isOpen = detail.style.display !== 'none';
            if (isOpen) {
                detail.style.display = 'none';
                arrow.textContent = '▶';
            } else {
                detail.style.display = 'block';
                arrow.textContent = '▼';
            }
        }

        function toggleFollowTimeline(el) {
            var timeline = el.nextElementSibling;
            var arrow = el.querySelector('.fusion-follow-arrow');
            if (!timeline) return;
            var isOpen = timeline.style.display !== 'none';
            if (isOpen) {
                timeline.style.display = 'none';
                arrow.textContent = '▶';
                arrow.style.transform = '';
            } else {
                timeline.style.display = 'block';
                arrow.textContent = '▼';
            }
        }

        function toggleFusionCompanyPreview(el) {
            // Find parent manager row and trigger expand if needed
            var parentDetail = el.closest('.fusion-manager-detail');
            if (!parentDetail) return;
            var managerRow = parentDetail.previousElementSibling;
            if (managerRow && managerRow.classList.contains('onclick')) {
                // Already open
            }
            // Find the timeline in this company card and toggle it
            var followSection = el.closest('.fusion-follow-section');
            if (followSection) {
                var timeline = followSection.querySelector('.fusion-timeline');
                var followBtn = followSection.querySelector('.fusion-follow-arrow');
                if (timeline) {
                    var isOpen = timeline.style.display !== 'none';
                    timeline.style.display = isOpen ? 'none' : 'block';
                    if (followBtn) followBtn.textContent = isOpen ? '▶' : '▼';
                }
            }
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        }

        function escapeHtmlForAttr(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, ' ');
        }

        function editFusionCounts(el, managerName, line, targetType) {
            var records = allFusionTargets.filter(function(r) {
                return r.manager_name === managerName && r.line === line && (r.target_type === targetType || r.task_category === targetType);
            });
            if (!records.length) return;
            var r = records[0];
            var newTask = prompt('\u4fee\u6539\u4efb\u52a1\u6570:', r.task_count);
            if (newTask === null) return;
            var newCompleted = prompt('\u4fee\u6539\u5b8c\u6210\u6570:', r.completed_count);
            if (newCompleted === null) return;
            Promise.all(records.map(function(rec) {
                return fetch('/api/fusion/followup/' + rec.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_count: parseInt(newTask)||0, completed_count: parseInt(newCompleted)||0 })
                });
            })).then(function() { loadFusionData(); });
        }

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

        function editFusionCompanyName(el, oldName, followId) {
            var newName = prompt('\u4fee\u6539\u4f01\u4e1a\u540d\u79f0:', oldName);
            if (newName === null || !newName.trim() || newName.trim() === oldName) return;
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_company: newName.trim() })
            }).then(function() { loadFusionData(); });
        }

        function editFusionRecordCounts(el, followId) {
            var rec = allFusionTargets.find(function(r) { return r.id === followId; });
            if (!rec) return;
            var newTask = prompt('\u4fee\u6539\u4efb\u52a1\u6570:', rec.task_count);
            if (newTask === null) return;
            var newCompleted = prompt('\u4fee\u6539\u5b8c\u6210\u6570:', rec.completed_count);
            if (newCompleted === null) return;
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_count: parseInt(newTask)||0, completed_count: parseInt(newCompleted)||0 })
            }).then(function() { loadFusionData(); });
        }

        function incFusionRecordCompleted(followId, taskCount, currentCompleted) {
            if (currentCompleted >= taskCount) {
                alert('\u5df2\u5b8c\u6210\u6570\u5df2\u8fbe\u5230\u4efb\u52a1\u6570\u4e0a\u9650');
                return;
            }
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed_count: currentCompleted + 1 })
            }).then(function() { loadFusionData(); });
        }

        function addFusionFollowInline(el, managerName, line, targetType, companyName) {
            var content = prompt('\u6dfb\u52a0\u8ddf\u8fdb\u8bb0\u5f55:', '');
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

        function editFusionFollowInline(el, followId, currentContent) {
            var decoded = currentContent.replace(/&quot;/g, '"').replace(/\\'/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<br>/g, '\n');
            var newContent = prompt('\u7f16\u8f91\u8ddf\u8fdb\u8bb0\u5f55:', decoded);
            if (newContent === null) return;
            fetch('/api/fusion/followup/' + followId, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ follow_record: newContent })
            }).then(function() { loadFusionData(); });
        }

        function deleteFusionFollow(followId) {
            if (!confirm('\u786e\u5b9a\u5220\u9669\u8fd9\u6761\u8ddf\u8fdb\u8bb0\u5f55\uff1f')) return;
            fetch('/api/fusion/followup/' + followId, { method: 'DELETE' }).then(function() { loadFusionData(); });
        }

        function addFusionCompanyInline(el, managerName, line, targetType) {
            var companyName = prompt('\u8f93\u5165\u76ee\u6807\u4f01\u4e1a\u540d\u79f0:', '');
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
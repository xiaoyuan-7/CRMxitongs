var currentFusionView = 'table';

        function switchFusionView(view) {
            currentFusionView = view;
            var btnTable = document.getElementById('fusionViewTable');
            var btnKanban = document.getElementById('fusionViewKanban');
            if (btnTable && btnKanban) {
                if (view === 'table') {
                    btnTable.style.background = '#667eea';
                    btnTable.style.color = 'white';
                    btnTable.style.border = 'none';
                    btnKanban.style.background = 'white';
                    btnKanban.style.color = '#6b7280';
                    btnKanban.style.border = '1px solid #e5e7eb';
                } else {
                    btnKanban.style.background = '#667eea';
                    btnKanban.style.color = 'white';
                    btnKanban.style.border = 'none';
                    btnTable.style.background = 'white';
                    btnTable.style.color = '#6b7280';
                    btnTable.style.border = '1px solid #e5e7eb';
                }
            }
            renderFusionContent();
        }

        function renderKanbanView(typeGroups) {
            var typeColors = {
                "B2C保险": { color: "#92400e", bg: "#fef3c3", border: "#fde68a" },
                "B2C小微贷": { color: "#92400e", bg: "#fef3c3", border: "#fde68a" },
                "B2C百人代发": { color: "#92400e", bg: "#fef3c3", border: "#fde68a" },
                "C2B授信": { color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
                "C2B高质量开户": { color: "#1e40af", bg: "#dbeafe", border: "#bfdbfe" },
                "B2B百人代发": { color: "#6d28d9", bg: "#ede9fe", border: "#ddd6fe" }
            };

            var html = '<div style="display:flex;gap:16px;overflow-x:auto;padding:12px 14px;align-items:flex-start;">';

            Object.keys(typeGroups).forEach(function(type) {
                var records = typeGroups[type];
                var colors = typeColors[type] || { color: "#374151", bg: "#f3f4f6", border: "#e5e7eb" };

                var managerGroups = {};
                records.forEach(function(r) {
                    var key = r.manager_name + '||' + r.line;
                    if (!managerGroups[key]) {
                        managerGroups[key] = { manager_name: r.manager_name, line: r.line, task_count: 0, completed_count: 0 };
                    }
                    managerGroups[key].task_count += r.task_count || 0;
                    managerGroups[key].completed_count += r.completed_count || 0;
                });

                var managers = Object.values(managerGroups);

                html += '<div style="min-width:200px;max-width:220px;flex-shrink:0;width:100%;">';
                html += '<div style="padding:8px 10px;background:' + colors.bg + ';border-radius:8px 8px 0 0;border-bottom:2px solid ' + colors.border + ';text-align:center;">';
                html += '<div style="font-size:12px;font-weight:600;color:' + colors.color + ';">' + type + '</div>';
                html += '<div style="font-size:11px;color:' + colors.color + ';opacity:0.7;margin-top:2px;">' + managers.length + ' 位客户经理</div>';
                html += '</div>';
                html += '<div style="background:#fafafa;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:8px;min-height:200px;">';

                managers.forEach(function(mg) {
                    var totalRate = mg.task_count > 0 ? Math.round(mg.completed_count / mg.task_count * 100) : 0;
                    var rateColor = totalRate >= 50 ? "#22c55e" : totalRate > 0 ? "#f59e0b" : "#ef4444";
                    var allDone = mg.completed_count >= mg.task_count && mg.task_count > 0;
                    var allEmpty = mg.completed_count === 0;
                    var badgeColor = allDone ? '#22c55e' : allEmpty ? '#d1d5db' : '#f59e0b';
                    var badgeText = allDone ? '✅' : allEmpty ? '○' : '◐';
                    var lineBadge = mg.line === '批发' ? '<span style="color:#1e40af;font-size:9px;background:#dbeafe;padding:1px 4px;border-radius:3px;margin-left:4px;">批发</span>' : '<span style="color:#92400e;font-size:9px;background:#fef3c3;padding:1px 4px;border-radius:3px;margin-left:4px;">零售</span>';

                    html += '<div onclick="switchFusionView(\'table\'); setTimeout(function(){ scrollToManager(\'' + type + '\'); }, 100);" style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:8px;cursor:pointer;transition:box-shadow 0.15s;" onmouseenter="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.1)\'" onmouseleave="this.style.boxShadow=\'none\'">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
                    html += '<div style="font-size:12px;font-weight:600;color:#1f2937;">' + mg.manager_name + '</div>';
                    html += '<span style="font-size:12px;">' + badgeText + '</span>';
                    html += '</div>';
                    html += '<div style="font-size:11px;color:#6b7280;margin-bottom:6px;">' + mg.completed_count + ' / ' + mg.task_count + lineBadge + '</div>';
                    html += '<div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin-bottom:4px;">';
                    html += '<div style="width:' + totalRate + '%;height:100%;background:' + rateColor + ';border-radius:3px;"></div>';
                    html += '</div>';
                    html += '<div style="text-align:right;font-size:12px;font-weight:bold;color:' + rateColor + ';">' + totalRate + '%</div>';
                    html += '</div>';
                });

                html += '</div></div>';
            });

            html += '</div>';
            return html;
        }
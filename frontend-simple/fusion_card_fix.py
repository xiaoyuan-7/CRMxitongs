#!/usr/bin/env python3
with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    lines = f.readlines()

# Build the new card header block
new_block = [
    "                        var contactMgr = co.records.length > 0 && co.records[0].contact_manager ? co.records[0].contact_manager : '';\n",
    "                        html += '<div style=\"border:' + borderLeft + ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:' + cardBg + ';position:relative;\">;\n",
    "                        html += '<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px;\">;\n",
    "                        html += '<div style=\"flex:1;min-width:0;\">;\n",
    "                        html += '<div onclick=\"event.stopPropagation(); editFusionCompanyName(this, \\'' + co.name.replace(/'/g, \"\\'\") + '\\', ' + co.records[0].id + ')\" style=\"font-size:13px;font-weight:600;color:#1f2937;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;\" onmouseenter=\"this.style.background=\\'#fef3c3\'\" onmouseleave=\"this.style.background=\\'transparent\'\" title=\"点击修改企业名称\">' + co.name + ' <span style=\"font-size:10px;color:#9ca3af;\">✏️</span></div>;\n",
    "                        html += '<div onclick=\"event.stopPropagation(); editFusionContactMgr(this, ' + co.records[0].id + ', \\'' + (contactMgr or '').replace(/'/g, \"\\'\") + '\\')\" style=\"font-size:11px;color:#7c3aed;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;margin-top:2px;\" onmouseenter=\"this.style.background=\'#ede9fe'\" onmouseleave=\"this.style.background=\'transparent'\" title=\"点击修改对接客户经理\">' + (contactMgr ? '👤 ' + contactMgr : '➕ 添加对接客户经理') + '</div>;\n",
    "                        html += '</div>;\n",
    "                        html += '<div onclick=\"event.stopPropagation(); editFusionRecordCounts(this, ' + co.records[0].id + ')\" style=\"cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.12s;\" onmouseenter=\"this.style.background=\'#f3f4f6'\" onmouseleave=\"this.style.background=\'transparent'\" title=\"点击修改\">;\n",
    "                        html += '<span style=\"color:#22c55e;font-weight:600;font-size:13px;\">' + coComp + '</span>;\n",
    "                        html += '<span style=\"color:#d1d5db;margin:0 2px;\">/</span>;\n",
    "                        html += '<span style=\"color:#6b7280;font-size:13px;\">' + coTask + '</span>;\n",
    "                        html += '</div>;\n",
    "                        html += '<div onclick=\"event.stopPropagation(); incFusionRecordCompleted(' + co.records[0].id + ', ' + coTask + ', ' + coComp + ')\" style=\"display:flex;align-items:center;gap:5px;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;\" onmouseenter=\"this.style.background=\'#dcfce7'\" onmouseleave=\"this.style.background=\'transparent'\" title=\"点击+1完成\">;\n",
    "                        html += '<div style=\"width:44px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;\"><div style=\"width:' + coRate + '%;height:100%;background:' + coRateColor + ';border-radius:2px;\"></div></div>;\n",
    "                        html += '<span style=\"font-size:12px;font-weight:bold;color:' + coRateColor + ';\">' + coRate + '%</span>;\n",
    "                        html += '</div>;\n",
    "                        html += '<button onclick=\"event.stopPropagation(); addFusionFollowInline(this, \\'' + mg.manager_name.replace(/'/g, \"\\'\") + '\\', \\'' + (mg.line or '') + '\\', \\'' + type + '\\', \\'' + co.name.replace(/'/g, \"\\'\") + '\\')\" style=\"padding:3px 10px;font-size:11px;background:#667eea;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:500;transition:background 0.12s;\" onmouseenter=\"this.style.background=\'#5a67d8'\" onmouseleave=\"this.style.background=\'#667eea'\">+ 跟进</button>;\n",
    "                        html += '</div>;\n",
    "\n",
]

# Replace lines at index 4998-5009 (old html card header lines)
result = lines[:4998] + new_block + lines[5010:]

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.writelines(result)

print(f"Done! Replaced lines 4999-5010 (1-indexed), new total lines: {len(result)}")
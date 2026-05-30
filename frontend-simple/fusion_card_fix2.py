#!/usr/bin/env python3
with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    lines = f.readlines()

B = chr(92)  # backslash
Q = chr(39)  # single quote

def js_rep(s):
    return s.replace("'", B + Q)

# Build new card header lines
# We replace lines 4998-5009 (0-indexed) with the new block (keeping borderLeft/cardBg vars at 4996-4997)
new_block = [
    ("                        var contactMgr = co.records.length > 0 && co.records[0].contact_manager ? co.records[0].contact_manager : '';\n"),
    ("                        html += " + Q + "<div style=" + Q + "border:" + Q + " + borderLeft + " + Q + ";border-radius:6px;padding:10px 12px;margin-bottom:8px;background:" + Q + " + cardBg + " + Q + ";position:relative;" + Q + ">;\n"),
    ("                        html += " + Q + "<div style=" + Q + "display:flex;align-items:center;gap:8px;margin-bottom:6px;" + Q + ">;\n"),
    ("                        html += " + Q + "<div style=" + Q + "flex:1;min-width:0;" + Q + ">;\n"),
    ("                        html += " + Q + "<div onclick=" + Q + "event.stopPropagation(); editFusionCompanyName(this, " + Q + "' + co.name.replace(/'/g, " + B + Q + Q + ") + " + Q + ", " + Q + " + co.records[0].id + " + Q + ")" style=" + Q + "font-size:13px;font-weight:600;color:#1f2937;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;" onmouseenter=" + Q + "this.style.background=" + B + Q + "#fef3c3" + B + Q + " onmouseleave=" + Q + "this.style.background=" + B + Q + "transparent" + B + Q + " title=" + Q + "点击修改企业名称" + Q + ">" + Q + "' + co.name + " + Q + " <span style=" + Q + "font-size:10px;color:#9ca3af;" + Q + ">✏️</span></div>;\n"),
    ("                        html += " + Q + "<div onclick=" + Q + "event.stopPropagation(); editFusionContactMgr(this, " + Q + " + co.records[0].id + " + Q + ", " + Q + "' + (" + Q + "(contactMgr||'')" + Q + ").replace(/'/g, " + B + Q + Q + ") + " + Q + ")" style=" + Q + "font-size:11px;color:#7c3aed;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;margin-top:2px;" onmouseenter=" + Q + "this.style.background=" + B + Q + "#ede9fe" + B + Q + " onmouseleave=" + Q + "this.style.background=" + B + Q + "transparent" + B + Q + " title=" + Q + "点击修改对接客户经理" + Q + ">" + Q + "' + (contactMgr ? " + Q + "👤 " + Q + " + contactMgr : " + Q + "➕ 添加对接客户经理" + Q + ") + " + Q + "</div>;\n"),
    ("                        html += '</div>;\n"),
    ("                        html += " + Q + "<div onclick=" + Q + "event.stopPropagation(); editFusionRecordCounts(this, " + Q + " + co.records[0].id + " + Q + ")" style=" + Q + "cursor:pointer;padding:2px 6px;border-radius:4px;transition:background 0.12s;" onmouseenter=" + Q + "this.style.background=" + B + Q + "#f3f4f6" + B + Q + " onmouseleave=" + Q + "this.style.background=" + B + Q + "transparent" + B + Q + " title=" + Q + "点击修改" + Q + ">" + Q + ";\n"),
    ("                        html += '<span style="color:#22c55e;font-weight:600;font-size:13px;">' + coComp + '</span>;\n"),
    ("                        html += '<span style="color:#d1d5db;margin:0 2px;">/</span>';\n"),
    ("                        html += '<span style="color:#6b7280;font-size:13px;">' + coTask + '</span>';\n"),
    ("                        html += '</div>;\n"),
    ("                        html += " + Q + "<div onclick=" + Q + "event.stopPropagation(); incFusionRecordCompleted(" + Q + " + co.records[0].id + " + Q + ", " + Q + " + coTask + " + Q + ", " + Q + " + coComp + " + Q + ")" style=" + Q + "display:flex;align-items:center;gap:5px;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;" onmouseenter=" + Q + "this.style.background=" + B + Q + "#dcfce7" + B + Q + " onmouseleave=" + Q + "this.style.background=" + B + Q + "transparent" + B + Q + " title=" + Q + "点击+1完成" + Q + ">" + Q + ";\n"),
    ("                        html += '<div style="width:44px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="width:' + coRate + '%;height:100%;background:' + coRateColor + ';border-radius:2px;"></div></div>';\n"),
    ("                        html += '<span style="font-size:12px;font-weight:bold;color:' + coRateColor + ';">' + coRate + '%</span>';\n"),
    ("                        html += '</div>;\n"),
    ("                        html += " + Q + "<button onclick=" + Q + "event.stopPropagation(); addFusionFollowInline(this, " + Q + "' + mg.manager_name.replace(/'/g, " + B + Q + Q + ") + " + Q + ", " + Q + "' + (mg.line||'')" + Q + ", " + Q + "' + type" + Q + ", " + Q + "' + co.name.replace(/'/g, " + B + Q + Q + ") + " + Q + ")" style=" + Q + "padding:3px 10px;font-size:11px;background:#667eea;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:500;transition:background 0.12s;" onmouseenter=" + Q + "this.style.background=" + B + Q + "#5a67d8" + B + Q + " onmouseleave=" + Q + "this.style.background=" + B + Q + "#667eea" + B + Q + ">+ 跟进</button>;\n"),
    ("                        html += '</div>;\n"),
    ("\n"),
]

# Replace lines at index 4998-5009 (the old card header html lines)
result = lines[:4998] + new_block + lines[5010:]

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.writelines(result)

print("Done! New total lines:", len(result))
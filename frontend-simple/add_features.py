import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# =======================================================
# CHANGE 1: Add +企业 button in manager row (after arrow)
# =======================================================
old_arrow = "                    html += '<div class=\"fusion-row-arrow\" style=\"font-size:11px;color:#667eea;margin-left:10px;width:16px;text-align:center;\">▶</div>';"
new_arrow = """                    html += '<div class="fusion-row-arrow" style="font-size:11px;color:#667eea;margin-left:10px;width:16px;text-align:center;">▶</div>';
                    html += '<div onclick="event.stopPropagation(); addFusionCompanyInline(this, \\'' + mg.manager_name.replace(/'/g, "\\\\'") + '\\', \\'' + (mg.line||'') + '\\', \\'' + type + '\\')" style="margin-left:6px;padding:2px 8px;font-size:11px;background:#667eea;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:500;transition:background 0.12s;" onmouseenter="this.style.background='#5a67d8'" onmouseleave="this.style.background='#667eea'" title="添加目标企业">+ 企业</div>';"""

if old_arrow in content:
    content = content.replace(old_arrow, new_arrow)
    print("Change 1 (arrow/+企业 button): DONE")
else:
    print("ERROR: old_arrow not found")

# =======================================================
# CHANGE 2: Add delete button to company card
# =======================================================
old_card = """                        html += '<div style="border:' + borderLeft + ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:' + cardBg + ';position:relative;">';
                        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
                        html += '<div onclick="event.stopPropagation(); editFusionCompanyName(this, \\'' + co.name.replace(/'/g, "\\\\'") + '\\', ' + co.records[0].id + ')" style="font-size:13px;font-weight:600;color:#1f2937;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;" onmouseenter="this.style.background=\\'#fef3c3\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击修改企业名称">' + co.name + ' <span style="font-size:10px;color:#9ca3af;">✏️</span></div>';
                        html += '<div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;">';
                        html += '<span style="font-size:11px;color:#7c3aed;white-space:nowrap;">对接客户经理：</span>';
                        html += '<input type="text" value="' + (contactMgr||'') + '" onclick="event.stopPropagation()" onblur="var v=this.value.trim();if(v!==(contactMgr||\\'\\')){fetch(\\'/api/fusion/followup/\\'+co.records[0].id,{method:\\'PATCH\\',headers:{\\'Content-Type\\':\\'application/json\\'},body:JSON.stringify({contact_manager:v})}).then(function(){loadFusionData();});}" style="border:none;background:#f3f4f6;outline:none;font-size:11px;color:#7c3aed;padding:2px 6px;border-radius:4px;width:72px;" placeholder="输入" title="' + (contactMgr||'点击添加') + '">';
                        html += '<input type="text" value="' + (co.records[0].contact_info||'') + '" onclick="event.stopPropagation()" onblur="var v=this.value.trim();if(v!==(co.records[0].contact_info||\\'\\')){fetch(\\'/api/fusion/followup/\\'+co.records[0].id,{method:\\'PATCH\\',headers:{\\'Content-Type\\':\\'application/json\\'},body:JSON.stringify({contact_info:v})}).then(function(){loadFusionData();});}" style="border:none;background:#f9fafb;outline:none;font-size:11px;color:#6b7280;padding:2px 6px;border-radius:4px;flex:1;min-width:60px;" placeholder="客户简介" title="' + (co.records[0].contact_info||'点击添加简介') + '">';
                        html += '</div>';
                        html += '</div>';"""

new_card = """                        html += '<div style="border:' + borderLeft + ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:' + cardBg + ';position:relative;">';
                        html += '<div onclick="event.stopPropagation(); deleteFusionCompany(this, ' + co.records[0].id + ', \\'' + co.name.replace(/'/g, "\\\\'") + '\\')" style="position:absolute;top:6px;right:8px;font-size:12px;cursor:pointer;opacity:0;transition:opacity 0.15s;z-index:5;padding:2px;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'" title="删除企业">🗑️</div>';
                        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
                        html += '<div onclick="event.stopPropagation(); editFusionCompanyName(this, \\'' + co.name.replace(/'/g, "\\\\'") + '\\', ' + co.records[0].id + ')" style="font-size:13px;font-weight:600;color:#1f2937;cursor:pointer;padding:2px 4px;border-radius:4px;transition:background 0.12s;" onmouseenter="this.style.background=\\'#fef3c3\\'" onmouseleave="this.style.background=\\'transparent\\'" title="点击修改企业名称">' + co.name + ' <span style="font-size:10px;color:#9ca3af;">✏️</span></div>';
                        html += '<div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;">';
                        html += '<span style="font-size:11px;color:#7c3aed;white-space:nowrap;">对接客户经理：</span>';
                        html += '<input type="text" value="' + (contactMgr||'') + '" onclick="event.stopPropagation()" onblur="var v=this.value.trim();if(v!==(contactMgr||\\'\\')){fetch(\\'/api/fusion/followup/\\'+co.records[0].id,{method:\\'PATCH\\',headers:{\\'Content-Type\\':\\'application/json\\'},body:JSON.stringify({contact_manager:v})}).then(function(){loadFusionData();});}" style="border:none;background:#f3f4f6;outline:none;font-size:11px;color:#7c3aed;padding:2px 6px;border-radius:4px;width:72px;" placeholder="输入" title="' + (contactMgr||'点击添加') + '">';
                        html += '<input type="text" value="' + (co.records[0].contact_info||'') + '" onclick="event.stopPropagation()" onblur="var v=this.value.trim();if(v!==(co.records[0].contact_info||\\'\\')){fetch(\\'/api/fusion/followup/\\'+co.records[0].id,{method:\\'PATCH\\',headers:{\\'Content-Type\\':\\'application/json\\'},body:JSON.stringify({contact_info:v})}).then(function(){loadFusionData();});}" style="border:none;background:#f9fafb;outline:none;font-size:11px;color:#6b7280;padding:2px 6px;border-radius:4px;flex:1;min-width:60px;" placeholder="客户简介" title="' + (co.records[0].contact_info||'点击添加简介') + '">';
                        html += '</div>';
                        html += '</div>';"""

if old_card in content:
    content = content.replace(old_card, new_card)
    print("Change 2 (company delete button): DONE")
else:
    print("ERROR: old_card not found - trying to locate...")
    # Try a simpler approach - find the card div and insert delete button after it
    pattern = r"html \+= '<div style=\"border:' \+ borderLeft \+ ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:' \+ cardBg \+ ';position:relative;\">';"
    match = re.search(pattern, content)
    if match:
        print(f"Found card div at index {match.start()}")
        print("Context:", repr(content[match.start():match.start()+300]))
    else:
        print("Card div pattern not found at all")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("Done!")
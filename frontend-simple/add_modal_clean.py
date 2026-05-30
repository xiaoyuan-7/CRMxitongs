#!/usr/bin/env python3
"""Clean approach: replace prompt() with modal in the original file"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# First, add modal system functions before the closing </script>
# Insert after the last function definition in the main script

modal_functions = '''

// ========== 融合攻坚弹窗系统 ==========
var fusionModalCallback = null;

function openFusionModal(title, bodyHtml, onConfirm) {
    var modal = document.getElementById('fusionModal');
    if (!modal) { alert('Modal not found'); return; }
    document.getElementById('fusionModalTitle').textContent = title;
    document.getElementById('fusionModalBody').innerHTML = bodyHtml;
    modal.style.display = 'flex';
    fusionModalCallback = onConfirm;
}

function closeFusionModal() {
    var modal = document.getElementById('fusionModal');
    if (modal) modal.style.display = 'none';
    fusionModalCallback = null;
}

function confirmFusionModal() {
    if (fusionModalCallback) {
        fusionModalCallback();
        closeFusionModal();
    }
}
'''

# Find the last </script> in the file and insert modal before it
last_script_idx = content.rfind('</script>')
if last_script_idx > 0:
    content = content[:last_script_idx] + modal_functions + content[last_script_idx:]
    print(f"Added modal functions before last </script> at position {last_script_idx}")

# Now add the modal HTML right after the <body> tag or in a good location
# Actually, let's add it just before the main script's closing
modal_html = '''
<!-- Fusion Module Modal -->
<div id="fusionModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;">
    <div style="background:white;border-radius:12px;padding:24px;width:420px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 id="fusionModalTitle" style="margin:0;font-size:16px;color:#111827;"></h3>
            <span onclick="closeFusionModal()" style="cursor:pointer;font-size:20px;color:#9ca3af;line-height:1;">&times;</span>
        </div>
        <div id="fusionModalBody" style="margin-bottom:16px;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button onclick="closeFusionModal()" style="padding:8px 16px;border:1px solid #e5e7eb;border-radius:6px;background:white;color:#6b7280;cursor:pointer;font-size:13px;">取消</button>
            <button id="fusionModalConfirmBtn" onclick="confirmFusionModal()" style="padding:8px 16px;border:none;border-radius:6px;background:#667eea;color:white;cursor:pointer;font-size:13px;font-weight:500;">确定</button>
        </div>
    </div>
</div>
'''

# Insert modal HTML just before </body>
body_idx = content.rfind('</body>')
if body_idx > 0:
    content = content[:body_idx] + modal_html + content[body_idx:]
    print(f"Added modal HTML before </body> at position {body_idx}")

# Now replace all prompt() calls in the fusion functions
# Replace openFollowEdit
old1 = "var newRecord = prompt('编辑跟进记录:', record.follow_record || '');\n            if (newRecord === null) return;"
new1 = "var bodyHtml = '<div style=\"margin-bottom:12px;\"><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">企业名称</label><div style=\"padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;\">' + (record.target_company || '(未填写)') + '</div></div>' + '<div><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">跟进记录</label><textarea id=\"fusionModalInput\" rows=\"4\" style=\"width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;resize:vertical;\" placeholder=\"请输入跟进记录...\">' + (record.follow_record || '') + '</textarea></div>'; openFusionModal('编辑跟进记录', bodyHtml, function() { var newRecord = document.getElementById('fusionModalInput').value.trim();"
content = content.replace(old1, new1)

# Replace the fetch part in openFollowEdit
old1b = "}).then(function(res) {\n                if (res.ok) {\n                    record.follow_record = newRecord.trim();\n                    renderAllTables();\n                }\n            });\n        }"
new1b = "}).then(function(res) { return res.json(); }).then(function() { loadFusionData(); }); }); }"
if old1b in content:
    content = content.replace(old1b, new1b)
    print("Fixed openFollowEdit")

# Replace openFollowAdd
old2 = "var record = prompt('请输入跟进记录:');\n            if (!record || !record.trim()) return;"
new2 = "var bodyHtml = '<div style=\"margin-bottom:12px;\"><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">客户经理</label><div style=\"padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;\">' + managerName + '</div></div>' + '<div style=\"margin-bottom:12px;\"><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">任务类型</label><div style=\"padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;\">' + targetType + '</div></div>' + '<div style=\"margin-bottom:12px;\"><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">目标企业（选填）</label><input id=\"fusionModalCompany\" type=\"text\" style=\"width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;\" placeholder=\"输入企业名称\"/></div>' + '<div><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">跟进记录</label><textarea id=\"fusionModalInput\" rows=\"3\" style=\"width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;resize:vertical;\" placeholder=\"输入跟进内容...\"></textarea></div>'; openFusionModal('添加跟进记录', bodyHtml, function() { var company = document.getElementById('fusionModalCompany').value.trim(); var record = document.getElementById('fusionModalInput').value.trim(); if (!record) { alert('请输入跟进记录'); return; }"
content = content.replace(old2, new2)

# Replace addCompanyForGroup
old3 = "var company = prompt('请输入目标企业名称:');\n            if (!company || !company.trim()) return;"
new3 = "var bodyHtml = '<div style=\"margin-bottom:12px;\"><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">客户经理</label><div style=\"padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;\">' + managerName + '</div></div>' + '<div style=\"margin-bottom:12px;\"><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">任务类型</label><div style=\"padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;\">' + targetType + '</div></div>' + '<div><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">目标企业名称</label><input id=\"fusionModalCompany\" type=\"text\" style=\"width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;\" placeholder=\"输入目标企业名称\"/></div>'; openFusionModal('添加目标企业', bodyHtml, function() { var company = document.getElementById('fusionModalCompany').value.trim(); if (!company) { alert('请输入企业名称'); return; }"
content = content.replace(old3, new3)

# Fix the closing of addCompanyForGroup
old3b = "}).then(function(result) {\n                if (result.id) loadFusionData();\n            });\n        }\n        \n        // 编辑客户经理汇总的任务数/完成数"
new3b = "}).then(function(result) { if (result.id) loadFusionData(); }); }); }"
if old3b in content:
    content = content.replace(old3b, new3b)
    print("Fixed addCompanyForGroup closing")

# Replace editGroupField
old4 = "var newVal = prompt('修改 ' + field + ':', currentVal);\n            if (newVal === null || newVal === '') return;"
new4 = "var fieldLabel = field === 'task_count' ? '任务数' : field === 'completed_count' ? '完成数' : field; var bodyHtml = '<div style=\"margin-bottom:12px;\"><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">客户经理</label><div style=\"padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;\">' + managerName + '</div></div>' + '<div style=\"margin-bottom:12px;\"><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">任务类型</label><div style=\"padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;\">' + targetType + '</div></div>' + '<div><label style=\"display:block;font-size:12px;color:#6b7280;margin-bottom:4px;\">新' + fieldLabel + '</label><input id=\"fusionModalNumber\" type=\"number\" min=\"0\" style=\"width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;\" value=\"' + currentVal + '\"/></div>'; openFusionModal('修改' + fieldLabel, bodyHtml, function() { var newVal = parseInt(document.getElementById('fusionModalNumber').value) || 0;"
content = content.replace(old4, new4)

# Fix the rest of editGroupField
old4b = "newVal = field === 'task_count' || field === 'completed_count' ? parseInt(newVal) || 0 : newVal;\n            var groupRecords = allFusionTargets.filter(function(r) {\n                return r.manager_name === managerName && r.line === line && r.target_type === targetType;\n            });\n            Promise.all(groupRecords.map(function(r) {\n                var body = {};\n                body[field] = newVal;\n                return fetch('/api/fusion/followup/' + r.id, {\n                    method: 'PATCH',\n                    headers: { 'Content-Type': 'application/json' },\n                    body: JSON.stringify(body)\n                });\n            })).then(function() { loadFusionData(); });\n        }"
new4b = "var groupRecords = allFusionTargets.filter(function(r) { return r.manager_name === managerName && r.line === line && r.target_type === targetType; }); Promise.all(groupRecords.map(function(r) { var body = {}; body[field] = newVal; return fetch('/api/fusion/followup/' + r.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); })).then(function() { loadFusionData(); }); }); }"
if old4b in content:
    content = content.replace(old4b, new4b)
    print("Fixed editGroupField")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("Done! Modal system added.")
print(f"File size: {len(content)} bytes")
#!/usr/bin/env python3
"""Properly fix the fusion modal - remove broken parts and rebuild"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Step 1: Remove the broken fusion modal section from inside the main script
# The broken section starts after deleteManagerGroup and includes:
# - <!-- Fusion Module Modals --> (HTML comment inside script - invalid)
# - <div id="fusionModal">...</div> (HTML inside script - invalid)
# - <script> with modal functions (nested script - invalid)

# Find where the main inline script ends (second </script> at end of file)
# Then work backwards to find and remove the broken section

# Split at the last </script>
parts = content.rsplit('</script>', 1)
if len(parts) == 2:
    before_last_script = parts[0]
    after_last_script = '</script>' + parts[1]
else:
    print("Could not find split point")
    exit(1)

# In before_last_script, find and remove the broken section
# It starts after "function deleteManagerGroup" and ends before "function editFusionTarget"
broken_start = before_last_script.find('function deleteManagerGroup')
broken_end = before_last_script.find('// 编辑单条目标记录')

if broken_start > 0 and broken_end > 0:
    # Check if the broken section is actually there
    section = before_last_script[broken_start:broken_end]
    if '<!-- Fusion Module Modals -->' in section or '<div id="fusionModal"' in section:
        before_last_script = before_last_script[:broken_start] + before_last_script[broken_end:]
        print(f"Removed broken section ({broken_end - broken_start} chars)")
    else:
        print("Broken section pattern not found in expected location")
        # Just check if modal HTML is anywhere in the file
        if '<div id="fusionModal"' in before_last_script:
            print("Found fusionModal in file, removing...")
            idx = before_last_script.find('<div id="fusionModal"')
            end_idx = before_last_script.find('</div>', idx) + 6
            # Also remove the stray <script> before it
            before_script = before_last_script[:idx]
            # Find the <script> that introduced the modal functions
            modal_script_start = before_last_script.find('<script>\nvar fusionModalCallback')
            if modal_script_start < idx:
                before_last_script = before_last_script[:modal_script_start]
            else:
                before_last_script = before_last_script[:idx]
            print("Removed fusionModal div")
        else:
            print("No fusionModal found in main content")

# Step 2: Build proper modal HTML and functions to insert after the main script
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
                    <button id="fusionModalConfirm" onclick="confirmFusionModal()" style="padding:8px 16px;border:none;border-radius:6px;background:#667eea;color:white;cursor:pointer;font-size:13px;font-weight:500;">确定</button>
                </div>
            </div>
        </div>

        <script>
        var fusionModalCallback = null;

        function openFusionModal(title, bodyHtml, onConfirm) {
            document.getElementById('fusionModalTitle').textContent = title;
            document.getElementById('fusionModalBody').innerHTML = bodyHtml;
            document.getElementById('fusionModal').style.display = 'flex';
            fusionModalCallback = onConfirm;
        }

        function closeFusionModal() {
            document.getElementById('fusionModal').style.display = 'none';
            fusionModalCallback = null;
        }

        function confirmFusionModal() {
            if (fusionModalCallback) fusionModalCallback();
            closeFusionModal();
        }

        function openFollowEdit(id) {
            var record = allFusionTargets.find(function(r) { return r.id === id; });
            if (!record) return;
            var bodyHtml = '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">企业名称</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + (record.target_company || '(未填写)') + '</div></div>' +
                '<div><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">跟进记录</label><textarea id="fusionModalInput" rows="4" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;resize:vertical;" placeholder="请输入跟进记录...">' + (record.follow_record || '') + '</textarea></div>';
            openFusionModal('编辑跟进记录', bodyHtml, function() {
                var newRecord = document.getElementById('fusionModalInput').value.trim();
                fetch('/api/fusion/followup/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ follow_record: newRecord }) }).then(function(res) { return res.json(); }).then(function() { loadFusionData(); });
            });
        }

        function openFollowAdd(managerName, line, targetType) {
            var bodyHtml = '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">客户经理</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + managerName + '</div></div>' +
                '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">任务类型</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + targetType + '</div></div>' +
                '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">目标企业（选填）</label><input id="fusionModalCompany" type="text" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;" placeholder="输入企业名称"/></div>' +
                '<div><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">跟进记录</label><textarea id="fusionModalInput" rows="3" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;resize:vertical;" placeholder="输入跟进内容..."></textarea></div>';
            openFusionModal('添加跟进记录', bodyHtml, function() {
                var company = document.getElementById('fusionModalCompany').value.trim();
                var record = document.getElementById('fusionModalInput').value.trim();
                if (!record) { alert('请输入跟进记录'); return; }
                var data = { manager_name: managerName, task_category: targetType, target_type: targetType, line: line, task_count: 0, completed_count: 0, target_company: company, follow_record: record, status: '进行中' };
                fetch('/api/fusion/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function(res) { return res.json(); }).then(function(result) { if (result.id) loadFusionData(); });
            });
        }

        function addCompanyForGroup(managerName, line, targetType) {
            var bodyHtml = '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">客户经理</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + managerName + '</div></div>' +
                '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">任务类型</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + targetType + '</div></div>' +
                '<div><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">目标企业名称</label><input id="fusionModalCompany" type="text" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;" placeholder="输入目标企业名称"/></div>';
            openFusionModal('添加目标企业', bodyHtml, function() {
                var company = document.getElementById('fusionModalCompany').value.trim();
                if (!company) { alert('请输入企业名称'); return; }
                var data = { manager_name: managerName, line: line, target_type: targetType, task_category: targetType, task_count: 0, completed_count: 0, target_company: company, follow_record: '', status: '进行中' };
                fetch('/api/fusion/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function(res) { return res.json(); }).then(function(result) { if (result.id) loadFusionData(); });
            });
        }

        function editGroupField(managerName, line, targetType, field, currentVal) {
            var fieldLabel = field === 'task_count' ? '任务数' : field === 'completed_count' ? '完成数' : field;
            var bodyHtml = '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">客户经理</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + managerName + '</div></div>' +
                '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">任务类型</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + targetType + '</div></div>' +
                '<div><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">新' + fieldLabel + '</label><input id="fusionModalNumber" type="number" min="0" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;" value="' + currentVal + '"/></div>';
            openFusionModal('修改' + fieldLabel, bodyHtml, function() {
                var newVal = parseInt(document.getElementById('fusionModalNumber').value) || 0;
                var groupRecords = allFusionTargets.filter(function(r) { return r.manager_name === managerName && r.line === line && r.target_type === targetType; });
                Promise.all(groupRecords.map(function(r) {
                    var body = {}; body[field] = newVal;
                    return fetch('/api/fusion/followup/' + r.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                })).then(function() { loadFusionData(); });
            });
        }
        </script>
'''

# Insert modal HTML before the last </script> closing tag
new_content = before_last_script + modal_html + after_last_script

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(new_content)

print("Fusion modal fixed!")
print(f"File now has {len(new_content)} bytes")
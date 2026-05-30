#!/usr/bin/env python3
"""Fix the broken fusion module - move modal HTML outside script tag"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The problem: the fusion modal HTML is inside a <script> tag that started at line 832
# It should be outside any script tag
# Also there's a stray <script> tag inside the main script

# Find the pattern: after toggleCompanyCards and deleteManagerGroup, we have
# a comment, then the modal HTML, then a stray <script> tag
# We need to:
# 1. Remove the comment and modal HTML from inside the script
# 2. Insert the modal HTML after the closing </script> of the main inline script

# Pattern to find and remove (the broken part inside script)
broken_pattern = '''        function deleteManagerGroup(managerName, line, targetType) {
            if (!confirm('确定要删除 ' + managerName + ' 的所有记录吗？')) return;
            var groupRecords = allFusionTargets.filter(function(r) {
                return r.manager_name === managerName && r.line === line && r.target_type === targetType;
            });
            var ids = groupRecords.map(function(r) { return r.id; });
            if (!ids.length) return;
            Promise.all(ids.map(function(id) {
                return fetch('/api/fusion/followup/' + id, { method: 'DELETE' });
            })).then(function() { loadFusionData(); });
        }
        <!-- Fusion Module Modals -->
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

        // Replace openFollowEdit - edit follow record
        function openFollowEdit(id) {
            var record = allFusionTargets.find(function(r) { return r.id === id; });
            if (!record) return;
            var bodyHtml = '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">企业名称</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + (record.target_company || '(未填写)') + '</div></div>' +
                '<div><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">跟进记录</label><textarea id="fusionModalInput" rows="4" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;resize:vertical;" placeholder="请输入跟进记录...">' + (record.follow_record || '') + '</textarea></div>';
            openFusionModal('编辑跟进记录', bodyHtml, function() {
                var newRecord = document.getElementById('fusionModalInput').value.trim();
                fetch('/api/fusion/followup/' + id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ follow_record: newRecord })
                }).then(function(res) { return res.json(); }).then(function() { loadFusionData(); });
            });
        }

        // Replace openFollowAdd - add follow record for a manager
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

        // Replace addCompanyForGroup - add target company
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

        // Replace editGroupField - edit task/completed count
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
'''

if broken_pattern in content:
    content = content.replace(broken_pattern, '')
    print("Removed broken fusion modal block from inside script")
else:
    print("Pattern not found exactly, trying to find similar...")
    # Try to find just the part to remove
    start_marker = 'function deleteManagerGroup(managerName, line, targetType)'
    end_marker = 'function openFollowEdit(id)'
    
    start_idx = content.find(start_marker)
    # Find the SECOND occurrence of openFollowEdit (the modal version)
    first_openfollow = content.find('function openFollowEdit(id)', start_idx + 100)
    
    if start_idx > 0 and first_openfollow > 0:
        # Find where the broken block ends (the end of editGroupField)
        # Look for the pattern after the broken modal <script> ends
        broken_end_marker = "        }\n\n        // 编辑单条目标记录"
        broken_end_idx = content.find(broken_end_marker, first_openfollow)
        if broken_end_idx > 0:
            content = content[:start_idx] + content[broken_end_idx:]
            print("Removed broken block using alternative method")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("Step 1 done")
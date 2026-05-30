#!/usr/bin/env python3
"""Replace all prompt() calls with modal dialogs in fusion module"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Replace 1: openFollowEdit
old1 = '''        function openFollowEdit(id) {
            var record = allFusionTargets.find(function(r) { return r.id === id; });
            if (!record) return;
            var newRecord = prompt('编辑跟进记录:', record.follow_record || '');
            if (newRecord === null) return;
            fetch('/api/fusion/followup/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ follow_record: newRecord.trim() })
            }).then(function(res) {
                if (res.ok) {
                    record.follow_record = newRecord.trim();
                    renderAllTables();
                }
            });
        }'''

new1 = '''        function openFollowEdit(id) {
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
        }'''

content = content.replace(old1, new1)

# Replace 2: openFollowAdd
old2 = '''        // 打开添加跟进记录弹窗
        function openFollowAdd(managerName, line, targetType) {
            var record = prompt('请输入跟进记录:');
            if (!record || !record.trim()) return;
            var data = {
                manager_name: managerName,
                task_category: targetType,
                target_type: targetType,
                line: line,
                task_count: 0,
                completed_count: 0,
                target_company: '',
                follow_record: record.trim(),
                status: '进行中'
            };
            fetch('/api/fusion/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(function(res) { return res.json(); }).then(function(result) {
                if (result.id) loadFusionData();
            });
        }'''

new2 = '''        function openFollowAdd(managerName, line, targetType) {
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
        }'''

content = content.replace(old2, new2)

# Replace 3: addCompanyForGroup
old3 = '''        // 为客户经理解锁添加企业
        function addCompanyForGroup(managerName, line, targetType) {
            var company = prompt('请输入目标企业名称:');
            if (!company || !company.trim()) return;
            var data = {
                manager_name: managerName,
                line: line,
                target_type: targetType,
                task_category: targetType,
                task_count: 0,
                completed_count: 0,
                target_company: company.trim(),
                follow_record: '',
                status: '进行中'
            };
            fetch('/api/fusion/followup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(function(res) { return res.json(); }).then(function(result) {
                if (result.id) loadFusionData();
            });
        }'''

new3 = '''        function addCompanyForGroup(managerName, line, targetType) {
            var bodyHtml = '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">客户经理</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + managerName + '</div></div>' +
                '<div style="margin-bottom:12px;"><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">任务类型</label><div style="padding:8px;background:#f9fafb;border-radius:6px;color:#374151;font-size:14px;">' + targetType + '</div></div>' +
                '<div><label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">目标企业名称</label><input id="fusionModalCompany" type="text" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;" placeholder="输入目标企业名称"/></div>';
            openFusionModal('添加目标企业', bodyHtml, function() {
                var company = document.getElementById('fusionModalCompany').value.trim();
                if (!company) { alert('请输入企业名称'); return; }
                var data = { manager_name: managerName, line: line, target_type: targetType, task_category: targetType, task_count: 0, completed_count: 0, target_company: company, follow_record: '', status: '进行中' };
                fetch('/api/fusion/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function(res) { return res.json(); }).then(function(result) { if (result.id) loadFusionData(); });
            });
        }'''

content = content.replace(old3, new3)

# Replace 4: editGroupField
old4 = '''        // 编辑客户经理汇总的任务数/完成数
        function editGroupField(managerName, line, targetType, field, currentVal) {
            var newVal = prompt('修改 ' + field + ':', currentVal);
            if (newVal === null || newVal === '') return;
            newVal = field === 'task_count' || field === 'completed_count' ? parseInt(newVal) || 0 : newVal;
            var groupRecords = allFusionTargets.filter(function(r) {
                return r.manager_name === managerName && r.line === line && r.target_type === targetType;
            });
            Promise.all(groupRecords.map(function(r) {
                var body = {};
                body[field] = newVal;
                return fetch('/api/fusion/followup/' + r.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            })).then(function() { loadFusionData(); });
        }'''

new4 = '''        function editGroupField(managerName, line, targetType, field, currentVal) {
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
        }'''

content = content.replace(old4, new4)

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("All prompt() calls replaced with modals!")
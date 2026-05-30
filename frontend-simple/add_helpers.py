#!/usr/bin/env python3
FRONTEND = '/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html'
with open(FRONTEND, 'r', encoding='utf-8') as f:
    content = f.read()

# Add helper functions before the closing </script>
script_end = content.rfind('</script>')
new_funcs = '''

// 折叠/展开子列表
function toggleSubList(el) {
    var sub = el.querySelector('.sub-list');
    if (!sub) return;
    var isOpen = sub.style.display !== 'none';
    sub.style.display = isOpen ? 'none' : 'block';
    var span = el.querySelector('span');
    if (span) {
        var text = span.textContent;
        if (isOpen) {
            span.textContent = text.replace('▾', '▸');
        } else {
            span.textContent = text.replace('▸', '▾');
        }
    }
}

// 为客户经理解锁添加企业（创建新记录）
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
}

// 编辑客户经理汇总的任务数/完成数（同步更新所有关联记录）
function editGroupField(managerName, line, targetType, field, currentVal) {
    var newVal = prompt('修改 ' + field + ':', currentVal);
    if (newVal === null || newVal === '') return;
    newVal = field === 'task_count' || field === 'completed_count' ? parseInt(newVal) || 0 : newVal;
    // 找到该组的所有记录，PATCH每个
    var groupRecords = allFusionTargets.filter(function(r) {
        return r.manager_name === managerName && r.line === line && r.target_type === targetType;
    });
    var promises = groupRecords.map(function(r) {
        var body = {};
        body[field] = newVal;
        return fetch('/api/fusion/followup/' + r.id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    });
    Promise.all(promises).then(function() { loadFusionData(); });
}
'''

content = content[:script_end] + new_funcs + content[script_end:]

with open(FRONTEND, 'w', encoding='utf-8') as f:
    f.write(content)

print('Added helper functions, size:', len(content))
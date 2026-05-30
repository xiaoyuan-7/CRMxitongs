#!/usr/bin/env python3
# Add helper functions for new follow add/edit buttons
import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find where to add the new functions - after the toggleSubList function
# Find the toggleSubList function and add after it
new_functions = '''

// 打开跟进记录编辑弹窗
function openFollowEdit(id) {
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
}

// 打开添加跟进记录弹窗（为某客户经理+类型添加新跟进）
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
}
'''

# Find the end of toggleSubList function
idx = content.find('function toggleSubList(el)')
if idx > 0:
    # Find the closing of this function - look for the next function or end of render section
    end_idx = content.find('\nfunction ', idx + 1)
    if end_idx > 0:
        content = content[:end_idx] + new_functions + '\n' + content[end_idx:]
        print(f"Added helper functions after toggleSubList")
    else:
        print("Could not find end of section")
else:
    print("Could not find toggleSubList function")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
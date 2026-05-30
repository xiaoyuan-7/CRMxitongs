#!/usr/bin/env python3
# Add deleteManagerGroup function

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Add deleteManagerGroup function after deleteFusionTarget
marker = "function deleteFusionTarget(id) {"
idx = content.find(marker)

if idx < 0:
    print("Could not find deleteFusionTarget")
else:
    # Find the end of deleteFusionTarget
    end_idx = content.find("}\n\n", idx)
    if end_idx > 0:
        insert_pos = end_idx + 3
        new_func = """
// 删除整个客户经理组（按manager_name+line+target_type）
function deleteManagerGroup(managerName, line, targetType) {
    if (!confirm('确定要删除 ' + managerName + ' 的所有记录吗？')) return;
    var groupRecords = allFusionTargets.filter(function(r) {
        return r.manager_name === managerName && r.line === line && r.target_type === targetType;
    });
    var ids = groupRecords.map(function(r) { return r.id; });
    if (!ids.length) return;
    
    Promise.all(ids.map(function(id) {
        return fetch('/api/fusion/followup/' + id, { method: 'DELETE' });
    })).then(function() {
        loadFusionData();
    }).catch(function(err) {
        console.error('删除失败', err);
        alert('删除失败，请重试');
    });
}
"""
        content = content[:insert_pos] + new_func + content[insert_pos:]
        print("Added deleteManagerGroup function")
    else:
        print("Could not find end of deleteFusionTarget")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
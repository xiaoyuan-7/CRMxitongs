#!/usr/bin/env python3
"""Fix the broken fusion module section"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Fix 1: Remove the broken comment line and fix the structure
# The broken section has: "// 打开跟进记录编辑弹窗" followed by "<!-- Fusion Module Modals -->"
# inside a <script> tag - this is invalid

old_broken = '''        // 打开跟进记录编辑弹窗
        <!-- Fusion Module Modals -->'''

new_fixed = '''        <!-- Fusion Module Modals -->'''

content = content.replace(old_broken, new_fixed)

# Fix 2: Add back deleteManagerGroup function (it was removed when we removed the old block)
# Find the location after editGroupField function, before the modal section
delete_manager_group_func = '''

        function deleteManagerGroup(managerName, line, targetType) {
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
'''

# Find where to insert it - after the last of the new functions (editGroupField ends, then modal starts)
# Look for the pattern after editGroupField's closing
insert_after = "        }).then(function() { loadFusionData(); });\n            });\n        }\n\n        <!-- Fusion Module Modals -->"
insert_idx = content.find(insert_after)
if insert_idx > 0:
    insert_idx = insert_idx + len(insert_after)
    content = content[:insert_idx] + delete_manager_group_func + content[insert_idx:]
    print("Added deleteManagerGroup function")
else:
    print("Could not find insertion point for deleteManagerGroup")
    # Try alternative approach
    alt_pattern = "        <!-- Fusion Module Modals -->"
    alt_idx = content.find(alt_pattern)
    if alt_idx > 0:
        content = content[:alt_idx] + delete_manager_group_func + content[alt_idx:]
        print("Added deleteManagerGroup using alternative approach")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("Fix complete!")
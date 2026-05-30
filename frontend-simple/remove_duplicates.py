#!/usr/bin/env python3
"""Remove duplicate function definitions from fusion module, keeping modal versions"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The old (prompt-based) functions are at lines ~4868-4916
# The new (modal-based) functions are at lines ~5028-5140
# We need to remove the old duplicate functions

# Find the block of old functions to remove
old_block_start = "        // 删除整个客户经理组\n        function deleteManagerGroup(managerName, line, targetType) {"
old_block_end = "        // 使用 modal 版本的 openFollowEdit（见下方）\n        function openFollowEdit(id) {"

idx_start = content.find(old_block_start)
idx_end = content.find(old_block_end)

if idx_start > 0 and idx_end > 0:
    # Remove the old functions (the first occurrence of openFollowEdit that has prompts)
    # Actually, let's find and remove the entire old block up to the modal version
    old_to_remove = content[idx_start:idx_end]
    content = content.replace(old_to_remove, '', 1)
    print("Removed old duplicate functions")
else:
    print("Pattern not found, trying alternative approach")
    # Alternative: find and mark the first occurrences as old
    # Find the first occurrence of each old function and comment it out

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("Done!")
#!/usr/bin/env python3
"""Remove first occurrences of duplicate fusion functions (keep modal versions)"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    lines = f.readlines()

# We want to remove the first occurrences of the duplicate functions
# The functions appear twice:
#   First occurrence around lines 4868-4925 (old prompt-based versions, now also using modal)
#   Second occurrence around lines 5028-5140 (modal versions)
# We want to remove the first block

# Find line numbers of first occurrences (old block before deleteManagerGroup)
# and second occurrences (modal block starting with "<!-- Fusion Module Modals -->")

# Mark lines to remove - the old functions from "// 删除整个客户经理组" to just before modal section
remove_start = None
remove_end = None

for i, line in enumerate(lines):
    if '// 删除整个客户经理组' in line and remove_start is None:
        remove_start = i
    if '<!-- Fusion Module Modals -->' in line and remove_start is not None and remove_end is None:
        remove_end = i
        break

print(f"Removing lines {remove_start+1} to {remove_end} (old duplicate functions)")

# Remove those lines
new_lines = lines[:remove_start] + lines[remove_end:]

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.writelines(new_lines)

print("Done! Removed old duplicate functions.")
print(f"Removed {remove_end - remove_start} lines")
print(f"Remaining lines: {len(new_lines)}")
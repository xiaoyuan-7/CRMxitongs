#!/usr/bin/env python3
"""Remove first occurrences of duplicate fusion functions (keep modal versions) - take 2"""

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    lines = f.readlines()

# Find line numbers
# The old functions we want to remove are from "function openFollowEdit" (first occurrence)
# to just before "<!-- Fusion Module Modals -->"
# The second occurrences (modal versions) should be kept

remove_start = None
remove_end = None

for i, line in enumerate(lines):
    if 'function openFollowEdit(id) {' in line and remove_start is None:
        # Check if this is the first occurrence by looking ahead for deleteManagerGroup
        # The first occurrence is right after "function editGroupField" etc.
        # We want to remove from this first openFollowEdit up to the modal comment
        remove_start = i
    if '<!-- Fusion Module Modals -->' in line and remove_start is not None and remove_end is None:
        remove_end = i
        break

if remove_start is not None and remove_end is not None:
    print(f"Removing lines {remove_start+1} to {remove_end} ({remove_end - remove_start} lines)")
    new_lines = lines[:remove_start] + lines[remove_end:]
else:
    print("Could not find pattern")
    new_lines = lines

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.writelines(new_lines)

print(f"Done! File now has {len(new_lines)} lines")
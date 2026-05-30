#!/usr/bin/env python3
# Remove the duplicate old code that overwrites the new rendering
# The duplicate starts with: var addCompanyBtn = '...addCompanyForGroup...
# (no backslash escaping in the file, just regular escaped quotes)

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find both occurrences of the addCompanyBtn line
# Using raw string as it appears in the file
pattern = "var addCompanyBtn = '<button onclick=\"addCompanyForGroup"
first = content.find(pattern)
print(f"First occurrence at: {first}")

second = content.find(pattern, first + 10)
print(f"Second occurrence at: {second}")

if second > 0:
    # Find the return statement after the second occurrence
    return_pattern = "        return '<tr style=\"border-bottom:1px solid #f3f4f6;\">'"
    return_idx = content.find(return_pattern, second)
    print(f"Return statement at: {return_idx}")
    
    if return_idx > 0:
        # The duplicate code goes from second addCompanyBtn to just before return
        old_block = content[second:return_idx]
        print(f"Removing {len(old_block)} characters")
        content = content[:second] + content[return_idx:]
        print("Successfully removed duplicate code block")
    else:
        print("Could not find return statement")
else:
    print("Only one occurrence found - nothing to remove")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
print(f"File size: {len(content)}")
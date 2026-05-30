#!/usr/bin/env python3
# Remove duplicate old code that overwrites the new rendering

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find the second occurrence of "var addCompanyBtn = '<button onclick=\"addCompanyForGroup\""
# which starts the duplicate old code
first_addCompany = content.find("var addCompanyBtn = '<button onclick=\"addCompanyForGroup\"")
print(f"First addCompanyBtn at: {first_addCompany}")

# Find the second occurrence after the first
second_addCompany = content.find("var addCompanyBtn = '<button onclick=\"addCompanyForGroup\"", first_addCompany + 10)
print(f"Second addCompanyBtn at: {second_addCompany}")

if second_addCompany > 0:
    # Find the return statement after the second addCompanyBtn
    return_idx = content.find("        return '<tr style=\"border-bottom:1px solid #f3f4f6;\">'", second_addCompany)
    print(f"Return statement at: {return_idx}")
    
    if return_idx > 0:
        # Remove everything from second addCompanyBtn to just before return
        old_content = content[second_addCompany:return_idx]
        print(f"Removing {len(old_content)} characters of duplicate code")
        content = content[:second_addCompany] + content[return_idx:]
        print("Removed duplicate code")
    else:
        print("Could not find return statement")
else:
    print("Only one occurrence found")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
print(f"File size: {len(content)}")
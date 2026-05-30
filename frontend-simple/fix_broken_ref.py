#!/usr/bin/env python3
# Fix the broken companiesHtml reference

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The problem: companiesHtml = '<div style="min-width:80px;">' + companiesToggle + companyList + addCompanyBtn + '</div>';
# companiesToggle and companyList don't exist in the new code
# Should be: companiesHtml = '<div style="min-width:120px;">' + companyCards + addCompanyBtn + '</div>';

old_broken = "var companiesHtml = '<div style=\"min-width:80px;\">' + companiesToggle + companyList + addCompanyBtn + '</div>';"
new_fixed = "var companiesHtml = '<div style=\"min-width:120px;\">' + companyCards + addCompanyBtn + '</div>';"

if old_broken in content:
    content = content.replace(old_broken, new_fixed)
    print("Fixed companiesHtml reference")
else:
    print("Could not find the broken pattern")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
print(f"File size: {len(content)}")
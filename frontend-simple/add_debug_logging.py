#!/usr/bin/env python3
# Add debugging to addCompanyForGroup function
import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find and patch the addCompanyForGroup function to add debug logging
old_func = """function addCompanyForGroup(managerName, line, targetType) {
    var company = prompt('请输入目标企业名称:');
    if (!company || !company.trim()) return;"""

new_func = """function addCompanyForGroup(managerName, line, targetType) {
    console.log('=== addCompanyForGroup called ===');
    console.log('managerName:', managerName);
    console.log('line:', line);
    console.log('targetType:', targetType);
    var company = prompt('请输入目标企业名称:');
    console.log('company input:', company);
    if (!company || !company.trim()) {
        console.log('Empty company, returning');
        return;
    }"""

if old_func in content:
    content = content.replace(old_func, new_func)
    print("Added debug logging to addCompanyForGroup")
else:
    print("Could not find addCompanyForGroup function to patch")

# Also add logging after fetch
old_fetch = """.then(function(result) {
        if (result.id) loadFusionData();
    });"""

new_fetch = """.then(function(result) {
        console.log('API result:', result);
        if (result.id) {
            console.log('Calling loadFusionData...');
            loadFusionData();
        }
    }).catch(function(err) {
        console.error('API error:', err);
    });"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    print("Added debug to fetch result handling")
else:
    print("Could not find fetch result handler")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"Done. File size: {len(content)}")
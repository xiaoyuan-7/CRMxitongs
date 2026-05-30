#!/usr/bin/env python3
# Fix the addCompanyForGroup button onclick handler - the escaped single quotes might cause issues
import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The problematic line:
old = "var addBtn = '<button onclick=\"addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + \\')\\')';"

# Actually let me just find the exact line and see what's there
for i, line in enumerate(content.split('\n')):
    if 'addCompanyForGroup' in line and 'addBtn' in line:
        print(f"Line {i+1}: {repr(line)}")
        break
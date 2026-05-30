#!/usr/bin/env python3
import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Replace all 5 instances of 操作 header in fusion tables
# B2C tables (orange theme)
content = content.replace(
    '<th style="padding:8px;text-align:left;font-size:12px;color:#92400e;">操作</th>',
    '<th style="padding:8px;text-align:left;font-size:12px;color:#92400e;">跟进记录</th>'
)
# C2B tables (blue theme)
content = content.replace(
    '<th style="padding:8px;text-align:left;font-size:12px;color:#1e40af;">操作</th>',
    '<th style="padding:8px;text-align:left;font-size:12px;color:#1e40af;">跟进记录</th>'
)

print("Changed 操作 -> 跟进记录 in fusion table headers")

# Also change the last "操作" column (line 4870 area) - the 编辑 button column
# This one doesn't have a color specific style, it just says 操作
# Let's find and change specifically the one in the fusion table context

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

# Count remaining 操作
count = content.count('操作')
print(f"Remaining '操作' occurrences: {count}")
print(f"File size: {len(content)} bytes")
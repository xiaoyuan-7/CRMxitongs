#!/usr/bin/env python3
import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    html = f.read()

match = re.search(r'<script>([\s\S]*?)</script>', html)
if match:
    lines = match.group(1).split('\n')
    print(f'Script has {len(lines)} lines')
    if len(lines) >= 34537:
        line = lines[34536]
        print(f'Line 34537 (0-indexed: 34536): {repr(line[:200])}')
        # Check for problematic patterns
        if "\\x27\\x27" in line:
            print("Found double escaped quotes!")
        if ')"' in line and '\\' in line:
            print("Found potential quote escape issue")
else:
    print("No script found")
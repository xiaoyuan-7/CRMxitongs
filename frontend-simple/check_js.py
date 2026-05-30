#!/usr/bin/env python3
import re, subprocess, sys

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    html = f.read()

# Extract script content
match = re.search(r'<script>([\s\S]*?)<\/script>', html)
if not match:
    print("No script found")
    sys.exit(1)

script = match.group(1)

# Save to temp file
with open('/tmp/test_script.js', 'w') as f:
    f.write(script)

# Check syntax
result = subprocess.run(['node', '--check', '/tmp/test_script.js'], capture_output=True, text=True)
if result.returncode != 0:
    print("JS syntax error:")
    print(result.stderr)
else:
    print("JS syntax OK")
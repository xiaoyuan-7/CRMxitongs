#!/usr/bin/env python3
import re, subprocess, sys

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    html = f.read()

match = re.search(r'<script>([\s\S]*?)<\/script>', html)
if not match:
    print("No script found")
    sys.exit(1)

script = match.group(1)
with open('/tmp/test_script.js', 'w') as f:
    f.write(script)

p = subprocess.Popen(['node', '--check', '/tmp/test_script.js'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
stdout, stderr = p.communicate()
if p.returncode != 0:
    print("JS syntax error:")
    print(stderr.decode())
else:
    print("JS syntax OK")
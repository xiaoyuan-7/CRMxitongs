#!/usr/bin/env python3
# Fix the HTML structure issue - fusionTab is inside an unclosed div

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The problem: <div class="content-card"     <div id="fusionTab"
# The content-card div is not properly closed before fusionTab starts

old_bad = '<div class="content-card"     <div id="fusionTab"'
new_good = '<div id="fusionTab" style="display:none;">'

if old_bad in content:
    content = content.replace(old_bad, new_good)
    print("Fixed missing > and extra div")
else:
    print("Could not find exact pattern, trying alternative...")
    # Try finding the problematic area
    import re
    pattern = r'<div class="content-card"\s+<div id="fusionTab"'
    if re.search(pattern, content):
        content = re.sub(pattern, '<div id="fusionTab" style="display:none;">', content)
        print("Fixed with regex")
    else:
        print("Pattern not found")

# Also check if there's an extra closing div needed before fusionTab
# Look at what comes before fusionTab insertion
idx = content.find('<div id="fusionTab"')
if idx > 0:
    # Check what comes 100 chars before
    before = content[idx-100:idx]
    print(f"Before fusionTab: {repr(before[-50:])}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
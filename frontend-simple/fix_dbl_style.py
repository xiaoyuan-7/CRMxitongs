#!/usr/bin/env python3
# Fix the double style="display:none;" issue

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The problem: <div id="fusionTab" style="display:none;"> style="display:none;">
# This happened because my earlier fix added another style="display:none;"
# when the original already had it in the HTML section

# Fix the double occurrence
old_bad = '<div id="fusionTab" style="display:none;"> style="display:none;">'
new_good = '<div id="fusionTab" style="display:none;">'

if old_bad in content:
    content = content.replace(old_bad, new_good)
    print("Fixed double display:none")
else:
    print("Could not find exact double pattern")
    # Try to find any variant
    import re
    pattern = r'<div id="fusionTab"[^>]*>\s*style="display:none;">'
    match = re.search(pattern, content)
    if match:
        print(f"Found pattern at {match.start()}: {repr(match.group())}")
        # Replace with just the proper opening tag
        content = re.sub(pattern, '<div id="fusionTab" style="display:none;">', content)
        print("Fixed with regex")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
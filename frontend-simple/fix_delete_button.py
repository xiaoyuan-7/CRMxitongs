import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The delete button line has: onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'"
# Inside a JS string that uses single quotes, this becomes problematic because
# the inner ' characters are not escaped

# We need to escape the inner single quotes for the JS context
# The current (broken) version has: onmouseenter="this.style.opacity=\'1\'" onmouseleave="this.style.opacity=\'0\'"
# But this doesn't work inside a string that uses ' as the delimiter

# Fix: replace the inner quotes with escaped versions that work in JS single-quote strings
# Actually, the issue is the surrounding string context. Let me check what the actual context is

# Find the delete button HTML line
idx = content.find('deleteFusionCompany(this, ')
if idx > 0:
    # Get the full html += line containing this
    line_start = content.rfind("html += '", 0, idx)
    line_end = content.find("';", idx) + 2
    line = content[line_start:line_end]
    print("Original delete button line:")
    print(line[:200])
    print()

    # The issue: inside a JS string with ' delimiter, the " in HTML attributes is fine,
    # but the ' inside onmouseenter/onmouseleave values like '1' and '0' conflict with the string delimiter

    # Fix: escape the inner single quotes using \'
    fixed_line = line.replace("onmouseenter=\"this.style.opacity='1'\"", "onmouseenter=\\\"this.style.opacity=\\'1\'\\\"")
    fixed_line = fixed_line.replace("onmouseleave=\"this.style.opacity='0'\"", "onmouseleave=\\\"this.style.opacity=\\'0\'\\\"")

    print("Fixed line:")
    print(fixed_line[:200])

    content = content[:line_start] + fixed_line + content[line_end:]
    print("\nReplacement done!")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
#!/usr/bin/env python3
# Fix duplicate });.join('') that causes JS syntax error

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The duplicate is at line 4033-4034:
#     }).join('');
#     }).join('');
# This extra closing needs to be removed

# Find the pattern: duplicate });.join('');
bad_pattern = "    }).join('');\n    }).join('');"
good_pattern = "    }).join('');"

if bad_pattern in content:
    content = content.replace(bad_pattern, good_pattern)
    print("Fixed duplicate });.join('')")
else:
    print("Could not find exact duplicate pattern, trying alternative...")
    # Maybe there's extra whitespace
    import re
    # Find duplicate });.join(''); in the script area (around line 4033)
    idx = content.find("});.join('');")
    if idx > 0:
        # Check if the next character sequence matches another }).join('');
        next_idx = idx + len("});.join('');")
        if content[next_idx:next_idx+15] == "\n    }).join('');":
            # This is the duplicate - remove it
            content = content[:next_idx] + content[next_idx+15:]
            print("Fixed by removing duplicate at position", next_idx)
        else:
            print("Not a simple duplicate at", idx)
    else:
        print("Could not find });.join('');")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print("File size:", len(content))
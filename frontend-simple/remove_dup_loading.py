#!/usr/bin/env python3
# Fix the duplicate/malformed globalLoading block (lines 815-820)

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The bad block to remove:
bad_block = '''    <div id="globalLoading">
            <div class="filter-bar"><h2 style="margin:0;">📌 智能提醒</h2><button class="btn btn-secondary" onclick="loadReminders()">🔄 刷新</button></div>
            <div id="remindersList"></div>
        </div>
    </div>

'''

if bad_block in content:
    content = content.replace(bad_block, '')
    print("Removed duplicate malformed globalLoading block")
else:
    print("Could not find exact bad block")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
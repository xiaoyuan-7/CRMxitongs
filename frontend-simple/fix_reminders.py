#!/usr/bin/env python3
# Fix the malformed remindersTab section - missing opening <div>

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The problem is: 
#     </div>
#     </div>
# </div>
#     </div>
# id="remindersTab"...
# The remindersTab opening <div is missing

# Find the problematic area around line 810-815
bad_pattern = """        </div>
    </div>
id="remindersTab" style="display:none;">"""

good_pattern = """        </div>
    </div>
    <div id="remindersTab" style="display:none;">
        <div class="filter-bar"><h2 style="margin:0;">📌 智能提醒</h2><button class="btn btn-secondary" onclick="loadReminders()">🔄 刷新</button></div>
        <div id="remindersList"></div>
    </div>
    <div id="globalLoading">"""

if bad_pattern in content:
    content = content.replace(bad_pattern, good_pattern)
    print("Fixed missing div tag for remindersTab")
else:
    print("Could not find exact pattern")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
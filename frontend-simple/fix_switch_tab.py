#!/usr/bin/env python3
# Fix switchTab to include fusion tab

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Fix 1: Add 'fusion' to the display array
old_array = "['leads','tasks','companies','referrals','todo','weekly','reminders']"
new_array = "['leads','tasks','companies','referrals','todo','weekly','reminders','fusion']"

if old_array in content:
    content = content.replace(old_array, new_array)
    print("Added 'fusion' to display array")
else:
    print("Could not find display array")

# Fix 2: Add fusion handler after reminders handler
old_handler = "if (tab==='reminders') { loadReminders(); updateWeekTaskSummary(); }"
new_handler = "if (tab==='reminders') { loadReminders(); updateWeekTaskSummary(); }\n            if (tab==='fusion') { loadFusionData(); }"

if old_handler in content:
    content = content.replace(old_handler, new_handler)
    print("Added fusion handler")
else:
    print("Could not find reminders handler")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
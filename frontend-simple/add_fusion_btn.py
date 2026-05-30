#!/usr/bin/env python3
# Add fusion tab button to the tabs section

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find the reminders tab button and add fusion tab button after it
reminders_marker = "<button class=\"tab\" onclick=\"switchTab('reminders')\">智能提醒</button>"
idx = content.find(reminders_marker)

if idx > 0:
    insert_pos = idx + len(reminders_marker)
    fusion_btn = "\n            <button class=\"tab\" onclick=\"switchTab('fusion')\">融合攻坚</button>"
    content = content[:insert_pos] + fusion_btn + content[insert_pos:]
    print("Added fusion tab button after reminders")
else:
    print("Could not find reminders button")
    # Try alternative
    alt_marker = "switchTab('reminders')"
    alt_idx = content.find(alt_marker)
    if alt_idx > 0:
        # Find the start of this button
        start = content.rfind("<button", 0, alt_idx)
        end = content.find("</button>", alt_idx) + len("</button>")
        insert_pos = end
        fusion_btn = "\n            <button class=\"tab\" onclick=\"switchTab('fusion')\">融合攻坚</button>"
        content = content[:insert_pos] + fusion_btn + content[insert_pos:]
        print("Added fusion tab button (alt method)")
    else:
        print("Could not find any reminders reference")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
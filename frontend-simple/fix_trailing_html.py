#!/usr/bin/env python3
# Fix the malformed end section by replacing everything after fusionTablesContainer ends

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find the end of fusionTablesContainer (the last </div> that closes the container)
# and replace everything until <script> with properly structured trailing HTML

# Find fusionTablesContainer closing
container_end = content.find('</div>\n    </div>\n    <div id="remindersTab"')
if container_end > 0:
    # Find where the content should actually end for proper structure
    # We want to keep everything up to and including the remindersTab section
    # But we need to remove the duplicate/malformed parts
    
    # Find the proper closing sequence
    proper_end = content.find('<!-- 全局 Loading -->', container_end)
    if proper_end > 0:
        # Get everything up to proper end + the globalLoading section
        part1 = content[:proper_end]
        
        # Find the actual proper ending
        actual_script_start = content.find('    <script>', proper_end)
        part2 = content[proper_end:actual_script_start]
        
        # Check if part2 has duplicate malformed content
        if part2.count('id="remindersTab"') > 1:
            # Find the good remindersTab section and keep only that
            first_reminders = part2.find('<div id="remindersTab"')
            second_reminders = part2.find('<div id="remindersTab"', first_reminders + 1)
            
            if second_reminders > 0:
                # Keep only the first one
                part2 = part2[:second_reminders]
                # Now find where the duplicate starts and cut it
                dup_start = part2.find('</div>\n        <div id="remindersTab"')
                if dup_start > 0:
                    # Find the proper ending of remindersTab and keep everything before it
                    proper_reminders_end = part2.find('</div>\n    </div>\n\n    <!-- 全局 Loading -->')
                    if proper_reminders_end > 0:
                        part2 = part2[:proper_reminders_end + len('</div>\n    </div>\n')]
        
        content = part1 + part2 + content[actual_script_start:]
        print("Fixed malformed trailing HTML")
    else:
        print("Could not find proper end marker")
else:
    print("Could not find fusionTablesContainer end")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
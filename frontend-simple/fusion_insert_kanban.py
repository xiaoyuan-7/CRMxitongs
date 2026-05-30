with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    lines = f.readlines()

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/fusion_kanban.py', 'r') as f:
    new_code = f.read()

# Find loadFusionData line
insert_line = None
for i, line in enumerate(lines):
    if 'function loadFusionData()' in line:
        insert_line = i
        break

if insert_line is not None:
    lines.insert(insert_line, '\n' + new_code + '\n')
    print(f'Inserted at line {insert_line+1}')
else:
    print('loadFusionData not found!')

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.writelines(lines)
print('Done, total lines:', len(lines))
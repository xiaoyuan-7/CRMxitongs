with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html') as f:
    lines = f.readlines()

print('Total lines:', len(lines))
print()

print('=== fusion-manager-section locations ===')
for i, line in enumerate(lines):
    if 'fusion-manager-section' in line:
        print('Line {}: {}'.format(i+1, line[:80]))

print()
in_foreach = False
print('=== fusion-detail forEach locations ===')
for i, line in enumerate(lines):
    if 'Object.values(managerGroups).forEach' in line:
        in_foreach = True
        print('Line {}: START forEach loop'.format(i+1))
    if in_foreach and 'fusion-detail' in line:
        print('Line {}: {}'.format(i+1, line[:80]))
    if in_foreach and "html += '</div>" in line:
        in_foreach = False
        print('Line {}: END forEach iteration'.format(i+1))

print()
print('=== All closing divs of manager section ===')
for i, line in enumerate(lines):
    if 'fusion-row' in line and 'html' in line and '</div>' in line:
        print('Line {}: {}'.format(i+1, line[:80]))
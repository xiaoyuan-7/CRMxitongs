with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Fix: replace filteredManagers.forEach with Object.values(managerGroups).forEach
# in the kanban section where filteredManagers was never defined
old = '                filteredManagers.forEach(function(mg) {\n                    var totalRate = mg.task_count > 0 ? Math.round(mg.completed_count / mg.task_count * 100) : 0;'
new = '                Object.values(managerGroups).forEach(function(mg) {\n                    var totalRate = mg.task_count > 0 ? Math.round(mg.completed_count / mg.task_count * 100) : 0;'

if old in content:
    content = content.replace(old, new)
    print('Replaced filteredManagers.forEach')
else:
    print('Not found - checking...')
    idx = content.find('filteredManagers.forEach')
    print('filteredManagers.forEach at:', idx)
    if idx > 0:
        print('Context:', repr(content[idx-100:idx+100]))

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
print('Done, size:', len(content))
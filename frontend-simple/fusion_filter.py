with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    lines = f.readlines()

# Find the line to insert filter code - after "Object.values(managerGroups).forEach(function(mg) {"
# But actually we need to filter before that. Let me find the line where we build managerGroups and filter it.

# Strategy: find "Object.values(managerGroups).forEach(function(mg) {" and insert filter block before it
new_block = '''
                // Apply filters
                var filteredManagers = Object.values(managerGroups).filter(function(mg) {
                    var allEmpty = mg.completed_count === 0;
                    var allDone = mg.completed_count >= mg.task_count && mg.task_count > 0;
                    var isAll = allDone ? '\u5df2\u5b8c\u6210' : allEmpty ? '\u672a\u5f00\u59cb' : '\u8fdb\u884c\u4e2d';
                    if (statusFilter && statusFilter !== isAll) return false;
                    if (searchText) {
                        var s = searchText.toLowerCase();
                        var matchName = mg.manager_name.toLowerCase().includes(s);
                        var matchCo = Object.keys(mg.companies).some(function(co) { return co.toLowerCase().includes(s); });
                        if (!matchName && !matchCo) return false;
                    }
                    return true;
                });

'''

target_line = '                Object.values(managerGroups).forEach(function(mg) {'
replaced = False
for i, line in enumerate(lines):
    if target_line in line:
        indent = line[:len(line) - len(line.lstrip())]
        insert = indent + new_block.strip().replace('\n', '\n' + indent)
        lines[i] = insert + '\n' + line
        replaced = True
        print(f'Inserted at line {i+1}')
        break

if not replaced:
    print('Target line not found:', target_line)

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.writelines(lines)
print('Done')
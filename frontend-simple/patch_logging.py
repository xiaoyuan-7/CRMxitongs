#!/usr/bin/env python3
# Patch the fusion POST handler to log before db.run
import re

with open('/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js', 'r') as f:
    content = f.read()

# Find and replace the INSERT block to add logging
old_code = '''const sql = `INSERT INTO fusion_targets 
      (manager_name, task_category, target_type, line, task_count, completed_count, open_red_task, open_red_completed, status, follow_record, target_company)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [manager_name, task_category, target_type, line, task_count||0, completed_count||0, open_red_task||0, open_red_completed||0, status||'进行中', follow_record||'', target_company||''], function(err) {'''

new_code = '''const sql = `INSERT INTO fusion_targets 
      (manager_name, task_category, target_type, line, task_count, completed_count, open_red_task, open_red_completed, status, follow_record, target_company)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [manager_name, task_category, target_type, line, task_count||0, completed_count||0, open_red_task||0, open_red_completed||0, status||'进行中', follow_record||'', target_company||''];
    console.log('=== INSERT PARAMS ===');
    console.log('target_company value:', target_company);
    console.log('params[10]:', params[10]);
    console.log('params:', JSON.stringify(params));
    db.run(sql, params, function(err) {'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print('Patched INSERT with logging')
else:
    print('Could not find INSERT code to patch')

with open('/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js', 'w') as f:
    f.write(content)
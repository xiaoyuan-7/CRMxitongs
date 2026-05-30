#!/usr/bin/env python3
import urllib.request
import json

data = {
    "manager_name": "API测试",
    "task_category": "C2B授信",
    "target_type": "C2B授信",
    "line": "零售",
    "task_count": 0,
    "completed_count": 0,
    "target_company": "API测试公司",
    "follow_record": "",
    "status": "进行中"
}

req = urllib.request.Request(
    'http://127.0.0.1:3001/api/fusion/followup',
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=10) as res:
        result = json.loads(res.read())
    print('POST result:', result)
except Exception as e:
    print('POST error:', e)

# Check record
import sqlite3
conn = sqlite3.connect('/home/admin/.openclaw/workspace/crm-system/backend/crm.db')
cursor = conn.cursor()
cursor.execute("SELECT id, manager_name, target_company FROM fusion_targets WHERE manager_name='API测试'")
print('DB record:', cursor.fetchone())
conn.close()
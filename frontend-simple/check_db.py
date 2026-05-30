#!/usr/bin/env python3
import sqlite3

db_path = '/home/admin/.openclaw/workspace/crm-system/backend/crm.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if there's a record with non-null target_company
cursor.execute("SELECT id, manager_name, target_company FROM fusion_targets WHERE target_company IS NOT NULL AND target_company != '' LIMIT 5")
rows = cursor.fetchall()
print("Records with target_company not null/empty:", len(rows))
for r in rows:
    print(r)

# Check the last inserted record
cursor.execute("SELECT id, manager_name, target_company FROM fusion_targets ORDER BY id DESC LIMIT 3")
rows = cursor.fetchall()
print("\nLast 3 records:")
for r in rows:
    print(r)

conn.close()
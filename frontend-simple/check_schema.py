#!/usr/bin/env python3
import sqlite3

db_path = '/home/admin/.openclaw/workspace/crm-system/backend/crm.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check the table structure and data
cursor.execute("PRAGMA table_info(fusion_targets)")
print("Table structure:")
for col in cursor.fetchall():
    print(col)

# Check if there are any non-null target_company records at all
cursor.execute("SELECT id, manager_name, target_company, typeof(target_company) FROM fusion_targets WHERE target_company IS NOT NULL LIMIT 5")
print("\nRecords with non-null target_company:")
for r in cursor.fetchall():
    print(r)

conn.close()
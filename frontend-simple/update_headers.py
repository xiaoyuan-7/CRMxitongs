#!/usr/bin/env python3
# Update the table headers for the new timeline view
# Old headers: 客户经理 | 任务数 | 完成数 | 完成率 | 目标企业 | 跟进记录
# New headers: 客户经理 | 汇总 | 操作

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Define the old header patterns and new header for each table section
# We need to update each of the 5 fusion tables

old_header_b2c = """                                <thead><tr style="background:#fef3c3;">
                                    <th style="padding:8px 10px;text-align:left;font-size:12px;color:#92400e;">客户经理</th>
                                    <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">任务数</th>
                                    <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">完成数</th>
                                    <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">完成率</th>
                                    <th style="padding:8px;text-align:left;font-size:12px;color:#92400e;">目标企业</th>
                                    <th style="padding:8px;text-align:left;font-size:12px;color:#92400e;">跟进记录</th>
                                </tr></thead>"""

new_header = """                                <thead><tr style="background:#fef3c3;">
                                    <th style="padding:8px 10px;text-align:left;font-size:12px;color:#92400e;">客户经理 · 企业（点击展开）</th>
                                    <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">任务/完成/率</th>
                                    <th style="padding:8px;text-align:center;font-size:12px;color:#92400e;">操作</th>
                                </tr></thead>"""

if old_header_b2c in content:
    content = content.replace(old_header_b2c, new_header)
    count = content.count(old_header_b2c)  # Should be 0 after replace
    print(f"Replaced headers. Remaining occurrences: {content.count(old_header_b2c)}")
else:
    print("Could not find exact header pattern")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
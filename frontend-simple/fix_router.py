#!/usr/bin/env python3
# Fix the missing closing braces in fusion.js router.delete

with open('/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js', 'r') as f:
    content = f.read()

# The bug: router.delete is missing closing });
# Find the problematic area and fix it
old = """router.delete('/followup/:id', (req, res) => {
  db.run('DELETE FROM fusion_targets WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message })

  })

// 局部更新目标记录"""

new = """router.delete('/followup/:id', (req, res) => {
  db.run('DELETE FROM fusion_targets WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 局部更新目标记录"""

if old in content:
    content = content.replace(old, new)
    print("Fixed missing }); after router.delete")
else:
    print("Could not find the exact pattern to fix")
    # Try to find what's actually there
    idx = content.find("router.delete('/followup/:id'")
    if idx > 0:
        print("Found router.delete at index", idx)
        print("Context:")
        print(repr(content[idx:idx+400]))

with open('/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js', 'w') as f:
    f.write(content)
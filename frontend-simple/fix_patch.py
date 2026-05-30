#!/usr/bin/env python3
# Fix extra }); after router.patch in fusion.js

with open('/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js', 'r') as f:
    content = f.read()

# The problematic pattern - extra }); and ; after the router.patch closing
old = """  db.run(sql, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});
;
}"""

new = """  db.run(sql, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
}"""

if old in content:
    content = content.replace(old, new)
    print("Fixed extra }); and ; after router.patch")
else:
    print("Could not find the exact pattern")
    idx = content.find('Cannot PATCH')
    if idx > 0:
        print("Context around patch error:")
        print(repr(content[idx-200:idx+100]))

with open('/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js', 'w') as f:
    f.write(content)
    
print("Done")
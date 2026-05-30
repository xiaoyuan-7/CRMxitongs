#!/usr/bin/env python3
# This script patches fusion.js to add a debug endpoint
import re

# Read the fusion.js file
with open('/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js', 'r') as f:
    content = f.read()

# Add debug endpoint after the POST /followup endpoint
# Find the closing of the post /followup block
debug_endpoint = '''

// Debug endpoint - temporary
router.post('/debug', (req, res) => {
    console.log('Full body:', JSON.stringify(req.body));
    console.log('target_company value:', req.body.target_company);
    res.json({ received: req.body, target_company: req.body.target_company });
});
'''

# Insert after the POST /followup but before DELETE /followup
delete_pos = content.find("router.delete('/followup/:id'")
if delete_pos > 0:
    content = content[:delete_pos] + debug_endpoint + '\n' + content[delete_pos:]
    print('Added debug endpoint')
else:
    print('Could not find delete position')

# Write back
with open('/home/admin/.openclaw/workspace/crm-system/backend/routes/fusion.js', 'w') as f:
    f.write(content)
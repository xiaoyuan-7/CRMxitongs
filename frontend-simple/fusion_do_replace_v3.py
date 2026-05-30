with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    lines = f.readlines()

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/fusion_ui_v3.py', 'r') as f:
    new_js_lines = f.readlines()

# Find start (function loadFusionData) and end (</script>)
start_line = None
end_line = None
for i, line in enumerate(lines):
    if 'function loadFusionData()' in line:
        start_line = i
    if '</script>' in line and start_line is not None and i > 4800:
        end_line = i
        break

print(f"Start: line {start_line+1}, End: line {end_line+1}")

# Build new content
new_content = ''.join(lines[:start_line] + new_js_lines + ['\n'] + lines[end_line+1:])

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(new_content)

print("Done! New size:", len(new_content))
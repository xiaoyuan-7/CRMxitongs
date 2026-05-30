with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find the start of the old fusion JS block
start_marker = "function loadFusionData()"
# Find the end (just before </script>)
end_marker = "\n</script>"
end_marker_idx = content.rfind(end_marker)

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERROR: Start marker not found")
elif end_marker_idx == -1:
    print("ERROR: End marker not found")
else:
    print(f"Start: {start_idx}, End: {end_marker_idx}")
    prefix = content[:start_idx]
    suffix = content[end_marker_idx:]
    print(f"Prefix length: {len(prefix)}, Suffix length: {len(suffix)}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/fusion_ui_v2.py', 'r') as f:
    new_js = f.read()

new_content = prefix + "\n" + new_js + "\n" + suffix

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(new_content)
print("Done! New size:", len(new_content))
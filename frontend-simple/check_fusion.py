#!/usr/bin/env python3
import re
import sys

html = sys.stdin.read()

# Find the fusionTab content
fusion_match = re.search(r'id="fusionTab"(.*?)</div>\s*<div', html, re.DOTALL)
if fusion_match:
    content = fusion_match.group(1)
    print("fusionTab content length:", len(content))
    
    # Check for manager_name in the content
    manager_count = content.count("manager_name")
    print("manager_name occurrences:", manager_count)
    
    # Check for table rows
    tr_count = content.count("<tr")
    print("tr occurrences:", tr_count)
    
    # Check for some specific text
    if "武孝龙" in content:
        print("Found 武孝龙")
    else:
        print("武孝龙 NOT found")
    
    # Look for any TD with manager name
    td_match = re.findall(r'<td[^>]*><div[^>]*>([^<]+)</div>', content[:5000])
    print("First few manager TDs:", td_match[:5])
else:
    print("Could not find fusionTab")
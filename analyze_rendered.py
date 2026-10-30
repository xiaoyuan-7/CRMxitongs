#!/usr/bin/env python3
"""Analyze the rendered fusion table HTML to understand what's being generated."""
import subprocess
import re

html = subprocess.check_output(['curl', '-s', 'http://localhost:3001']).decode('utf-8')

# Extract the fusionContent div content
fusion_match = re.search(r'id="fusionContent"[^>]*>(.*?)</div>\s*<!--', html, re.DOTALL)
if fusion_match:
    content = fusion_match.group(1)
    
    # Count sections
    manager_sections = re.findall(r'class="fusion-manager-section"', content)
    fusion_rows = re.findall(r'class="fusion-row"', content)
    fusion_details = re.findall(r'class="fusion-detail"', content)
    type_headers = re.findall(r'fusion_type_', content)
    
    print("fusion-manager-section:", len(manager_sections))
    print("fusion-row:", len(fusion_rows))
    print("fusion-detail:", len(fusion_details))
    print("fusion_type_ headers:", len(type_headers))
    
    # Check if fusion_detail is visible or hidden
    visible_details = re.findall(r'class="fusion-detail" style="background:', content)
    hidden_details = re.findall(r'class="fusion-detail" style="display:none', content)
    print("visible fusion-detail (no display:none):", len(visible_details))
    print("hidden fusion-detail (display:none):", len(hidden_details))
    
    # Try to find manager names
    names = re.findall(r'font-weight:600;font-size:13px;color:#1f2937;">([^<]+)</div>', content)
    print("\nManager names found:", names[:10])
else:
    print("Could not find fusionContent")
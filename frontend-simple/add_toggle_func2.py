#!/usr/bin/env python3
# Add the toggleCompanyCards function after toggleSubList

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find toggleSubList function and add our function after it
marker = "function toggleSubList(el) {"
idx = content.find(marker)

if idx < 0:
    print("Could not find toggleSubList")
else:
    # Find the closing brace of toggleSubList (look for the standalone "}" after the function body)
    # The function ends at line 5107 with "}" - find the position
    # Look for the pattern: el.querySelector('span');\n    }\n  }\n}
    search_start = idx + len(marker)
    close_idx = content.find("    }", search_start)
    # Now we need to find the next "}" that closes the function
    # The function structure is: if (span) { ... } -> } -> return
    # Let's find the actual end
    pattern_end = "    }\n}\n\n// 为客户经理解锁添加企业"
    end_idx = content.find(pattern_end, idx)
    if end_idx > 0:
        insert_pos = end_idx + len(pattern_end) - len("// 为客户经理解锁添加企业")
        new_func = """// 展开/收起企业卡片容器
function toggleCompanyCards(btnId, cardsId) {
    var btn = document.getElementById(btnId);
    var cards = document.getElementById(cardsId);
    if (!btn || !cards) return;
    
    var isOpen = cards.style.display !== 'none';
    cards.style.display = isOpen ? 'none' : 'block';
    
    // Update arrow indicator
    if (btn.innerHTML.indexOf('▸') > -1) {
        btn.innerHTML = '<span style="font-size:16px;">▾</span> ' + btn.innerHTML.replace('<span style="font-size:16px;">▸</span> ', '');
    } else {
        btn.innerHTML = '<span style="font-size:16px;">▸</span> ' + btn.innerHTML.replace('<span style="font-size:16px;">▾</span> ', '');
    }
}

"""
        content = content[:insert_pos] + new_func + content[insert_pos:]
        print("Added toggleCompanyCards function")
    else:
        print("Could not find insertion point")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
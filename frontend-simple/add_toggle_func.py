#!/usr/bin/env python3
# Add the toggleCompanyCards function after toggleSubList

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find where toggleSubList ends and add our function after it
marker = "// 折叠/展开子列表\nfunction toggleSubList(el) {"
idx = content.find(marker)

if idx < 0:
    print("Could not find toggleSubList marker")
else:
    # Find the end of toggleSubList
    end_marker = "}\n\n// 打开跟进记录编辑弹窗"
    end_idx = content.find(end_marker, idx)
    if end_idx > 0:
        # Insert our new function after toggleSubList
        new_func = """

// 展开/收起企业卡片容器
function toggleCompanyCards(btnId, cardsId) {
    var btn = document.getElementById(btnId);
    var cards = document.getElementById(cardsId);
    if (!btn || !cards) return;
    
    var isOpen = cards.style.display !== 'none';
    cards.style.display = isOpen ? 'none' : 'block';
    
    // Update the arrow
    var arrow = btn.querySelector('span') || btn;
    if (btn.textContent.startsWith('▸')) {
        btn.innerHTML = '<span style="font-size:16px;">▾</span> ' + btn.textContent.slice(2);
    } else {
        btn.innerHTML = '<span style="font-size:16px;">▸</span> ' + btn.textContent.slice(2);
    }
}
"""
        insert_pos = end_idx + len(end_marker)
        content = content[:insert_pos] + new_func + content[insert_pos:]
        print("Added toggleCompanyCards function")
    else:
        print("Could not find end of toggleSubList")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
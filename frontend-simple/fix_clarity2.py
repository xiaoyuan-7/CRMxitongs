#!/usr/bin/env python3
# Find the exact bytes and do a more targeted fix
import re

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find the section starting with the companies column definition
# The pattern starts with '// ========== 目标企业列' in UTF-8 but with some encoding
start_marker = '// ========== 目标企业列'
idx = content.find(start_marker)
if idx < 0:
    # Try to find by the variable name instead
    idx = content.find('var companyRecords = g.records.filter')

print(f"Found start at index: {idx}")

# Find the end of the section - look for the final two Html variables being assigned
# The section ends with: var companiesHtml and var followHtml assignments
end_pattern = "var addCompanyBtn = '<button onclick=\"addCompanyForGroup"
end_idx = content.find(end_pattern, idx)
print(f"Found end at index: {end_idx}")

if idx > 0 and end_idx > 0:
    # Get the old section
    old_section = content[idx:end_idx]
    print(f"Old section length: {len(old_section)}")
    print(f"Old section preview: {old_section[:200]}")
    
    # Define the new section
    new_section = '''        // ========== 目标企业列：卡片式展示，每条记录对应跟进 ==========
        var companyCards = g.records.map(function(r) {
            var companyName = r.target_company && r.target_company.trim() ? r.target_company : '';
            var followText = r.follow_record && r.follow_record.trim() ? r.follow_record : '';
            var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
            
            if (!companyName && !followText) return '';
            
            var companyBadge = companyName 
                ? '<span class="inline-edit" data-field="target_company" data-id="' + r.id + '" style="cursor:pointer;padding:4px 10px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;font-size:12px;font-weight:500;display:inline-block;margin:2px 0;box-shadow:0 2px 4px rgba(102,126,234,0.3);">' + companyName + '</span>'
                : '<span style="cursor:pointer;padding:4px 10px;background:#f3f4f6;color:#9ca3af;border-radius:8px;font-size:12px;display:inline-block;margin:2px 0;" class="inline-edit" data-field="target_company" data-id="' + r.id + '">（待填写）</span>';
            
            var followBadge = '';
            if (followText) {
                followBadge = '<div style="margin-top:6px;padding:4px 8px;background:#ecfdf5;border-left:3px solid #22c55e;border-radius:4px;font-size:11px;color:#065f46;"><span style="font-size:9px;color:#059669;font-weight:600;">' + time + '</span> ' + followText + '</div>';
            }
            
            var editBtn = '<button onclick="editFusionTarget(' + r.id + ')" style="margin-top:4px;font-size:10px;padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;background:white;cursor:pointer;color:#666;">编辑</button>';
            
            return '<div style="margin-bottom:8px;padding:6px 8px;background:#fafafa;border-radius:6px;border:1px solid #f0f0f0;">' + 
                companyBadge + followBadge + editBtn + '</div>';
        }).join('');
        
        if (!companyCards) {
            companyCards = '<div style="text-align:center;padding:8px;color:#9ca3af;font-size:12px;">暂无目标企业</div>';
        }
        
        var addCompanyBtn = '<button onclick="addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;">+ 添加企业</button>';
        var companiesHtml = '<div style="min-width:120px;">' + companyCards + addCompanyBtn + '</div>';
        
        // ========== 跟进记录列 ==========
        var followCards = g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); }).map(function(r) {
            var companyName = r.target_company && r.target_company.trim() ? r.target_company : '（未填写企业）';
            var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
            return '<div style="margin-bottom:6px;padding:6px 8px;background:#f0fdf4;border-radius:6px;border-left:4px solid #22c55e;">' +
                '<div style="font-size:10px;color:#059669;font-weight:600;margin-bottom:3px;">📍 ' + companyName + ' · ' + time + '</div>' +
                '<div style="font-size:12px;color:#374151;">' + r.follow_record + '</div>' +
                '<button onclick="openFollowEdit(' + r.id + ')" style="margin-top:4px;font-size:10px;padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;color:#666;">编辑</button>' +
                '</div>';
        }).join('');
        
        if (!followCards) {
            followCards = '<div style="text-align:center;padding:8px;color:#9ca3af;font-size:12px;">暂无跟进记录</div>';
        }
        
        var addFollowBtn = '<button onclick="openFollowAdd(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1px dashed #059669;border-radius:6px;background:#f0fdf4;color:#059669;cursor:pointer;font-weight:500;width:100%;">+ 添加跟进</button>';
        var followHtml = '<div style="min-width:120px;">' + followCards + addFollowBtn + '</div>';
'''
    
    content = content[:idx] + new_section + content[end_idx:]
    print("Successfully replaced the section")
else:
    print(f"Could not find boundaries. idx={idx}, end_idx={end_idx}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
#!/usr/bin/env python3
# Remove the duplicate old rendering code that wasn't cleaned up

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# The problem: there's a leftover block of old code (companiesToggle, companyList) that references
# variables that no longer exist, AND the return statement still uses them
# We need to find where the duplicate starts and ends

# Find the problematic section - look for the OLD code pattern that wasn't removed
old_duplicate = """var addCompanyBtn = '<button onclick="addCompanyForGroup(\\'\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\'\\')" style="margin-top:6px;font-size:11px;padding:3px 8px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;">+ 添加企业</button>';
        var companiesHtml = '<div style="min-width:80px;">' + companiesToggle + companyList + addCompanyBtn + '</div>';
        
        // ========== 跟进记录列 ==========
        var followRecords = g.records.filter(function(r) { return r.follow_record && r.follow_record.trim(); });
        var followCount = followRecords.length;
        var followItems = followRecords.map(function(r) {
            var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
            return '<div style="margin-bottom:6px;padding:6px 8px;background:#f0fdf4;border-radius:6px;border-left:3px solid #22c55e;position:relative;">' +
                '<div style="font-size:10px;color:#059669;font-weight:600;margin-bottom:2px;">' + time + '</div>' +
                '<div style="font-size:12px;color:#374151;margin-bottom:4px;">' + (r.follow_record || '') + '</div>' +
                '<button onclick="event.stopPropagation();openFollowEdit(' + r.id + ')" style="font-size:10px;padding:1px 6px;border:1px solid #d1d5db;border-radius:4px;background:white;cursor:pointer;color:#666;">编辑</button>' +
                '</div>';
        }).join('');
        var followToggle = '<div class="follow-toggle" onclick="toggleSubList(this)" style="cursor:pointer;color:#059669;font-size:12px;font-weight:500;">📝 跟进记录（' + followCount + '）<span style="font-size:10px;">' + (followCount > 0 ? '▾' : '（空）▸') + '</span></div>';
        var followList = '<div class="sub-list" style="display:none;margin-top:6px;padding-left:4px;">' + followItems + '</div>';
        var addFollowBtn = '<button onclick="openFollowAdd(\\'\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\'\\')" style="margin-top:6px;font-size:11px;padding:3px 8px;border:1px dashed #059669;border-radius:6px;background:#f0fdf4;color:#059669;cursor:pointer;font-weight:500;width:100%;">+ 添加跟进</button>';
        var followHtml = '<div style="min-width:80px;">' + followToggle + followList + addFollowBtn + '</div>';
        
        return"""

# Check if this duplicate exists
if old_duplicate in content:
    content = content.replace(old_duplicate, "var addCompanyBtn = '<button onclick=\"addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')\" style=\"margin-top:8px;font-size:11px;padding:4px 10px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;\">+ 添加企业</button>';")
    print("Removed duplicate old code and kept new code's addCompanyBtn")
else:
    print("Could not find exact duplicate pattern")
    # Try finding the general area
    idx = content.find("companiesToggle + companyList")
    if idx > 0:
        print(f"Found 'companiesToggle + companyList' at index {idx}")
        print(repr(content[idx-200:idx+300]))

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)
print(f"File size: {len(content)}")
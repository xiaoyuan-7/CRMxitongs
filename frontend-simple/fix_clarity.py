#!/usr/bin/env python3
# Redefine the fusion cell rendering for clear company+follow correspondence
# Design: Each company as a card with optional follow records below it
# Two columns: left = companies, right = follow records
# Each company card shows: company name, and under it any follow records for that specific company

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r') as f:
    content = f.read()

# Find and replace the companies/follow rendering in renderFusionTableByType
old_rendering = """        // ========== 目标企业列 ==========
        var companyRecords = g.records.filter(function(r) { return r.target_company && r.target_company.trim(); });
        var companyCount = companyRecords.length;
        var companyItems = companyRecords.map(function(r) {
            return '<span class="inline-edit" data-field="target_company" data-id="' + r.id + '" style="cursor:pointer;padding:2px 6px;background:#f3f4f6;border-radius:4px;font-size:12px;display:inline-block;margin:2px;">' + r.target_company + '</span>';
        }).join('');
        var companiesToggle = '<div class="companies-toggle" onclick="toggleSubList(this)" style="cursor:pointer;color:#667eea;font-size:12px;font-weight:500;">📁 目标企业（' + companyCount + '）<span style="font-size:10px;">' + (companyCount > 0 ? '▾' : '（空）▸') + '</span></div>';
        var companyList = '<div class="sub-list" style="display:none;margin-top:6px;padding-left:4px;">' + companyItems + '</div>';
        var addCompanyBtn = '<button onclick="addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:6px;font-size:11px;padding:3px 8px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;">+ 添加企业</button>';
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
        var addFollowBtn = '<button onclick="openFollowAdd(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:6px;font-size:11px;padding:3px 8px;border:1px dashed #059669;border-radius:6px;background:#f0fdf4;color:#059669;cursor:pointer;font-weight:500;width:100%;">+ 添加跟进</button>';
        var followHtml = '<div style="min-width:80px;">' + followToggle + followList + addFollowBtn + '</div>'; """

new_rendering = """        // ========== 目标企业列：每条记录独立卡片，清晰对应跟进 ==========
        var companyCards = g.records.map(function(r) {
            var companyName = r.target_company && r.target_company.trim() ? r.target_company : '';
            var followText = r.follow_record && r.follow_record.trim() ? r.follow_record : '';
            var time = (r.updated_at || r.created_at) ? new Date(r.updated_at || r.created_at).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
            
            if (!companyName && !followText) return ''; // skip empty records
            
            // Company badge
            var companyBadge = companyName 
                ? '<span class="inline-edit" data-field="target_company" data-id="' + r.id + '" style="cursor:pointer;padding:4px 10px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;font-size:12px;font-weight:500;display:inline-block;margin:2px 0;box-shadow:0 2px 4px rgba(102,126,234,0.3);">' + companyName + '</span>'
                : '<span style="cursor:pointer;padding:4px 10px;background:#f3f4f6;color:#9ca3af;border-radius:8px;font-size:12px;display:inline-block;margin:2px 0;" class="inline-edit" data-field="target_company" data-id="' + r.id + '">（待填写）</span>';
            
            // Follow record shown inline next to/under company
            var followBadge = '';
            if (followText) {
                followBadge = '<div style="margin-top:6px;padding:4px 8px;background:#ecfdf5;border-left:3px solid #22c55e;border-radius:4px;font-size:11px;color:#065f46;"><span style="font-size:9px;color:#059669;font-weight:600;">' + time + '</span> ' + followText + '</div>';
            }
            
            // Edit button for this record
            var editBtn = '<button onclick="editFusionTarget(' + r.id + ')" style="margin-top:4px;font-size:10px;padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;background:white;cursor:pointer;color:#666;">编辑</button>';
            
            return '<div style="margin-bottom:8px;padding:6px 8px;background:#fafafa;border-radius:6px;border:1px solid #f0f0f0;">' + 
                companyBadge + followBadge + editBtn + '</div>';
        }).join('');
        
        if (!companyCards) {
            companyCards = '<div style="text-align:center;padding:12px;color:#9ca3af;font-size:12px;">暂无目标企业</div>';
        }
        
        var addCompanyBtn = '<button onclick="addCompanyForGroup(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1px dashed #667eea;border-radius:6px;background:#f5f3ff;color:#667eea;cursor:pointer;font-weight:500;width:100%;">+ 添加企业</button>';
        var companiesHtml = '<div style="min-width:120px;">' + companyCards + addCompanyBtn + '</div>';
        
        // Follow records column - show as a list with company context
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
            followCards = '<div style="text-align:center;padding:12px;color:#9ca3af;font-size:12px;">暂无跟进记录</div>';
        }
        
        var addFollowBtn = '<button onclick="openFollowAdd(\\'' + g.manager_name + '\\x27,\\'' + g.line + '\\x27,\\'' + targetType + '\\')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1px dashed #059669;border-radius:6px;background:#f0fdf4;color:#059669;cursor:pointer;font-weight:500;width:100%;">+ 添加跟进</button>';
        var followHtml = '<div style="min-width:120px;">' + followCards + addFollowBtn + '</div>';"""

if old_rendering in content:
    content = content.replace(old_rendering, new_rendering)
    print("Successfully replaced cell rendering with card-based UI")
else:
    print("Could not find exact match for old rendering")
    idx = content.find('// ========== 目标企业列 ==========')
    if idx > 0:
        print(f"Found at index {idx}")
        print("Content around that area:")
        print(repr(content[idx:idx+500]))

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w') as f:
    f.write(content)

print(f"File size: {len(content)}")
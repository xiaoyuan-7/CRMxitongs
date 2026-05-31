const http = require('http');
http.get('http://localhost:3001/api/fusion/followup', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const allFusionTargets = JSON.parse(data);
        
        const typeGroups = {};
        allFusionTargets.forEach(function(r) {
            const type = r.target_type || r.task_category || '未知';
            if (!typeGroups[type]) typeGroups[type] = [];
            typeGroups[type].push(r);
        });
        
        let html = '';
        Object.keys(typeGroups).sort().forEach(function(type) {
            const records = typeGroups[type];
            const managerGroups = {};
            records.forEach(function(r) {
                const key = r.manager_name + '||' + r.line;
                if (!managerGroups[key]) {
                    managerGroups[key] = { manager_name: r.manager_name, line: r.line, companies: {}, task_count: 0, completed_count: 0, records: [] };
                }
                managerGroups[key].records.push(r);
                const coKey = r.target_company || r.company_name || '(no company)';
                if (!managerGroups[key].companies[coKey]) {
                    managerGroups[key].companies[coKey] = { name: coKey, records: [] };
                }
                managerGroups[key].companies[coKey].records.push(r);
                managerGroups[key].task_count += r.task_count || 0;
                managerGroups[key].completed_count += r.completed_count || 0;
            });
            
            const colors = { header: '#92400e', headerBg: '#fef3c3' };
            
            html += '<div id="fusion_type_' + type + '" style="margin-bottom:20px;">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:' + colors.headerBg + ';border-radius:8px 8px 0 0;">';
            html += '<span style="font-size:13px;font-weight:600;color:' + colors.header + ';">📋 ' + type + '</span>';
            html += '<div style="display:flex;align-items:center;gap:8px;">';
            html += '<span style="font-size:11px;color:' + colors.header + ';opacity:0.7;">' + Object.keys(managerGroups).length + ' 位客户经理</span>';
            html += '</div></div>';
            
            Object.values(managerGroups).forEach(function(mg) {
                html += '<div class="fusion-manager-section">';
                html += '<div class="fusion-row" style="display:flex;align-items:center;padding:10px 14px;background:white;border-bottom:1px solid #f3f4f6;cursor:pointer;">';
                html += '<div style="font-size:16px;margin-right:10px;width:20px;text-align:center;">◐</div>';
                html += '<div style="font-weight:600;font-size:13px;color:#1f2937;min-width:80px;flex:1;">' + mg.manager_name + '</div>';
                html += '<div class="fusion-row-arrow" style="font-size:11px;color:#667eea;margin-left:10px;width:16px;text-align:center;">▶</div>';
                html += '<div class="fusion-actions" style="display:none;"></div>';
                html += '</div>';
                
                html += '<div class="fusion-detail" style="display:none;background:#fafafa;padding:12px 14px;border-bottom:1px solid #e5e7eb;">';
                
                const companyList = Object.values(mg.companies);
                companyList.forEach(function(co) {
                    const hasFollow = co.records.length > 0;
                    const borderLeft = hasFollow ? '3px solid #22c55e' : '3px solid #fbbf24';
                    const cardBg = hasFollow ? '#f0fdf4' : '#fffbeb';
                    
                    html += '<div style="border:' + borderLeft + ';border-radius:6px;padding:10px 12px;margin-bottom:8px;background:' + cardBg + ';position:relative;">';
                    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
                    html += '<div style="font-size:13px;font-weight:600;color:#1f2937;">' + co.name + '</div>';
                    html += '<div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;">';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                });
                
                html += '</div>';
                html += '</div>';
            });
            
            html += '</div>';
        });
        
        console.log('Total HTML length:', html.length);
        
        const typeMatches = html.match(/<div id="fusion_type_[^"]*/g);
        console.log('fusion_type divs:', typeMatches ? typeMatches.length : 0);
        
        const detailMatches = html.match(/<div class="fusion-detail"/g);
        console.log('fusion-detail divs:', detailMatches ? detailMatches.length : 0);
        
        const mgrMatches = html.match(/<div class="fusion-manager-section"/g);
        console.log('fusion-manager-section divs:', mgrMatches ? mgrMatches.length : 0);
        
        const closes = html.match(/<\/div>/g);
        console.log('Total closing divs:', closes ? closes.length : 0);
        
        // Split and check structure
        const sections = html.split('fusion_type_');
        console.log('Type sections:', sections.length - 1);
        
        sections.slice(1).forEach((s, i) => {
            const endIdx = s.indexOf('"');
            const typeName = s.substring(0, endIdx);
            const detailCount = (s.match(/<div class="fusion-detail"/g) || []).length;
            const mgrCount = (s.match(/<div class="fusion-manager-section"/g) || []).length;
            console.log('  Type ' + (i+1) + ': ' + typeName + ' | details: ' + detailCount + ' | mgrs: ' + mgrCount);
        });
    });
});
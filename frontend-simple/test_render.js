const http = require('http');
http.get('http://127.0.0.1:3001/api/fusion/followup?limit=200', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const allFusionTargets = JSON.parse(data);
    const b2cInsurance = allFusionTargets.filter(r => r.target_type === 'B2C保险');
    
    const groups = {};
    b2cInsurance.forEach(r => {
      const key = r.manager_name + '||' + r.line;
      if (!groups[key]) {
        groups[key] = { manager_name: r.manager_name, line: r.line, task_count: 0, records: [] };
      }
      groups[key].task_count += r.task_count || 0;
      groups[key].records.push(r);
    });
    
    const firstGroupKey = Object.keys(groups)[0];
    const g = groups[firstGroupKey];
    
    const rate = g.task_count > 0 ? Math.round(g.completed_count / g.task_count * 100) : 0;
    const rateColor = rate >= 50 ? '#22c55e' : rate > 0 ? '#f59e0b' : '#ef4444';
    const lineBadge = g.line === '批发'
      ? '<span style="color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;font-size:11px;">批发</span>'
      : '<span style="color:#92400e;background:#fef3c3;padding:1px 6px;border-radius:4px;font-size:11px;">零售</span>';
    
    const firstTd = '<td style="padding:10px 8px;vertical-align:top;"><div style="font-weight:600;color:#374151;">' + g.manager_name + '</div><div style="margin-top:2px;">' + lineBadge + '</div></td>';
    
    console.log('Sample manager_name TD:');
    console.log(firstTd);
    console.log('Groups count:', Object.keys(groups).length);
  });
});
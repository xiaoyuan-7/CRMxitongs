const express = require('express');
const router = express.Router();
const { db } = require('../database');

// ========== 融合攻坚任务 ==========

// 获取任务要求
router.get('/tasks', (req, res) => {
  const tasks = {
    批发条线: {
      全年要求: ['1、普惠不得为负', '2、企业年金折算考核户不低于1户', '3、百人高质量目标2户，一票否决门槛：1户'],
      全年个人要求: ['1、转介保险不低于2单', '2、转介零售小微抵押贷不低于2单'],
      开门红要求: ['1、百人高质量1户', '2、转介保险或零售小微抵押贷不低于1单'],
      开门红个人要求: ['1、转介保险或零售小微抵押贷不低于1单']
    },
    零售条线: {
      全年要求: ['1、百人高质量目标2户，一票否决门槛：1户', '2、零售小微抵押贷、房消完成支行全年预算'],
      全年个人要求: ['对公开户及授信转介', 'L3：转介高质量开户6户，转介授信2户', 'L2：转介高质量开户5户，转介授信1户', 'L1：转介高质量开户2户', '市拓：转介高质量开户8户，转介授信2户', '*科创企业开户按1.5倍计入'],
      开门红要求: ['1、百人高质量1户', '2、转介高质量开户', 'L3：2户，L2/L1：1户，市拓：3户'],
      开门红个人要求: ['1、转介高质量开户', 'L3：2户，L2/L1：1户，市拓：3户']
    },
    运营条线: {
      全年要求: ['1、首面产品开通率不低于85%'],
      全年个人要求: ['1、信用卡不低于3户', '2、闪电贷不低于3户', '3、会计柜员转介外币户开户不低于3户'],
      开门红要求: ['1、首面产品开通率不低于85%'],
      开门红个人要求: ['1、信用卡不低于1户', '2、闪电贷不低于1户', '3、会计柜员转介外币户开户不低于1户']
    }
  };
  res.json(tasks);
});

// 获取客户经理目标跟进列表（支持按target_type筛选）
router.get('/followup', (req, res) => {
  const { target_type, manager_name, line } = req.query;
  let sql = 'SELECT * FROM fusion_targets WHERE 1=1';
  const params = [];
  if (target_type) { sql += ' AND target_type = ?'; params.push(target_type); }
  if (manager_name) { sql += ' AND manager_name LIKE ?'; params.push('%' + manager_name + '%'); }
  if (line) { sql += ' AND line = ?'; params.push(line); }
  sql += ' ORDER BY line, task_category, manager_name';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 新增/更新客户经理目标
router.post('/followup', (req, res) => {
  const { id, manager_name, task_category, target_type, line, task_count, completed_count, open_red_task, open_red_completed, status, follow_record, target_company } = req.body;
  if (!manager_name || !task_category || !target_type || !line) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  if (id) {
    const sql = `UPDATE fusion_targets SET 
      manager_name=?, task_category=?, target_type=?, line=?,
      task_count=?, completed_count=?, open_red_task=?, open_red_completed=?,
      status=?, follow_record=?, target_company=?, follow_type=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?`;
    db.run(sql, [manager_name, task_category, target_type, line, task_count||0, completed_count||0, open_red_task||0, open_red_completed||0, status||'进行中', follow_record||'', target_company||'', req.body.follow_type||'', id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    });
  } else {
    const sql = `INSERT INTO fusion_targets 
      (manager_name, task_category, target_type, line, task_count, completed_count, open_red_task, open_red_completed, status, follow_record, target_company, follow_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [manager_name, task_category, target_type, line, task_count||0, completed_count||0, open_red_task||0, open_red_completed||0, status||'进行中', follow_record||'', target_company||'', req.body.follow_type||''];
    console.log('=== INSERT PARAMS ===');
    console.log('target_company value:', target_company);
    console.log('params[10]:', params[10]);
    console.log('params:', JSON.stringify(params));
    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    });
  }
});

// 删除目标记录


// Debug endpoint - temporary
router.post('/debug', (req, res) => {
    console.log('Full body:', JSON.stringify(req.body));
    console.log('target_company value:', req.body.target_company);
    res.json({ received: req.body, target_company: req.body.target_company });
});

router.delete('/followup/:id', (req, res) => {
  db.run('DELETE FROM fusion_targets WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 局部更新目标记录（支持单个或多个字段）
router.patch('/followup/:id', (req, res) => {
  const allowed = ['manager_name','task_category','target_type','line','task_count','completed_count','open_red_task','open_red_completed','status','follow_record','target_company','contact_manager','follow_type'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body.hasOwnProperty(key)) {
      fields.push(key + '=?');
      values.push(req.body[key]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: '没有有效的更新字段' });
  values.push(req.params.id);
  const sql = 'UPDATE fusion_targets SET ' + fields.join(',') + ', updated_at=CURRENT_TIMESTAMP WHERE id=?';
  db.run(sql, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 批量导入目标（从Excel数据）
router.post('/import', (req, res) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: '需要提供 records 数组' });
  }
  const stmt = db.prepare(`INSERT INTO fusion_targets 
    (manager_name, task_category, target_type, line, task_count, completed_count, open_red_task, open_red_completed, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '进行中')`);
  let imported = 0;
  records.forEach(r => {
    if (r.manager_name && r.target_type && r.line) {
      stmt.run(r.manager_name, r.task_category||'', r.target_type, r.line, r.task_count||0, r.completed_count||0, r.open_red_task||0, r.open_red_completed||0);
      imported++;
    }
  });
  stmt.finalize();
  res.json({ success: true, imported, message: `成功导入 ${imported} 条目标记录` });
});

// 获取统计看板（按target_type分组，不按line分组）
router.get('/dashboard', (req, res) => {
  const sql = `SELECT 
    target_type,
    line,
    SUM(task_count) as total_task,
    SUM(completed_count) as total_completed,
    SUM(open_red_task) as total_open_red_task,
    SUM(open_red_completed) as total_open_red_completed,
    COUNT(*) as manager_count
    FROM fusion_targets GROUP BY target_type, line`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows = rows.map(r => ({
      ...r,
      completion_rate: r.total_task > 0 ? Math.round(r.total_completed / r.total_task * 100) : 0,
      open_red_rate: r.total_open_red_task > 0 ? Math.round(r.total_open_red_completed / r.total_open_red_task * 100) : 0
    }));
    res.json(rows);
  });
});

// 获取某客户经理的所有目标
router.get('/manager/:name', (req, res) => {
  db.all('SELECT * FROM fusion_targets WHERE manager_name = ? ORDER BY target_type', [req.params.name], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ========== 推送到营销任务 ==========

// 将目标企业推送到营销任务（跳过的已存在企业）
router.post('/push-to-marketing', (req, res) => {
  const { fusion_target_id, task_id, companies } = req.body;
  
  if (!fusion_target_id || !task_id || !companies || !Array.isArray(companies)) {
    return res.status(400).json({ error: '缺少必填字段：fusion_target_id, task_id, companies数组' });
  }
  
  // 先获取fusion_target记录，确认目标企业
  db.get('SELECT * FROM fusion_targets WHERE id = ?', [fusion_target_id], (err, fusionRecord) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!fusionRecord) return res.status(404).json({ error: '融合目标记录不存在' });
    
    // 检查哪些企业已存在（同一任务下同名的企业）
    const companyNames = companies.map(c => typeof c === 'string' ? c : c.name);
    const placeholders = companyNames.map(() => '?').join(',');
    
    db.all(`SELECT name FROM companies WHERE task_id = ? AND name IN (${placeholders})`, [task_id, ...companyNames], (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const existingNames = new Set(existing.map(e => e.name));
      const newCompanies = companyNames.filter(name => !existingNames.has(name));
      
      if (newCompanies.length === 0) {
        return res.json({ 
          success: true, 
          pushed: 0, 
          skipped: companyNames.length,
          message: `全部${companyNames.length}家企业已存在，跳过` 
        });
      }
      
      // 插入新企业
      const stmt = db.prepare(`INSERT INTO companies (name, task_id, manager_name, target_type, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
      let inserted = 0;
      newCompanies.forEach(name => {
        stmt.run(name, task_id, fusionRecord.manager_name, fusionRecord.target_type);
        inserted++;
      });
      stmt.finalize();
      
      res.json({ 
        success: true, 
        pushed: inserted, 
        skipped: existingNames.size,
        message: `推送成功：新增${inserted}家，跳过${existingNames.size}家（已存在）` 
      });
    });
  });
});

// 获取可推送的营销任务列表（用于选择推送到哪个任务）
router.get('/marketing-tasks', (req, res) => {
  db.all('SELECT id, name, description FROM marketing_tasks ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
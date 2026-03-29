const express = require('express');
const router = express.Router();
const db = require('../database');

// 创建周计划表
db.run(`
  CREATE TABLE IF NOT EXISTS week_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    company_name TEXT,
    plan_date TEXT,
    time_period TEXT DEFAULT 'am',
    action TEXT,
    priority TEXT DEFAULT 'medium',
    week_start TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  )
`);

// 获取周计划（支持按周筛选）
router.get('/', (req, res) => {
  const { week_start } = req.query;
  let query = 'SELECT * FROM week_tasks WHERE 1=1';
  const params = [];
  
  if (week_start) {
    query += ' AND week_start = ?';
    params.push(week_start);
  }
  
  query += ' ORDER BY plan_date, priority DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 创建周计划
router.post('/', (req, res) => {
  const { company_id, company_name, plan_date, time_period, action, priority, week_start, description } = req.body;
  
  db.run(
    `INSERT INTO week_tasks (company_id, company_name, plan_date, time_period, action, priority, week_start, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [company_id, company_name || null, plan_date, time_period || 'am', action, priority || 'medium', week_start, description || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: '待办添加成功' });
    }
  );
});

// 更新周计划（支持编辑任务内容和状态）
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, company_id, company_name, plan_date, time_period, action, priority, week_start } = req.body;
  
  // 构建动态更新语句
  const updates = [];
  const params = [];
  
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (company_name !== undefined) {
    updates.push('company_name = ?');
    params.push(company_name);
  }
  if (plan_date !== undefined && plan_date) {
    updates.push('plan_date = ?');
    params.push(plan_date);
    // 如果设置了日期，自动计算 week_start（周一日期）
    const date = new Date(plan_date + 'T00:00:00');
    let day = date.getUTCDay();
    if (day === 0) day = 7;
    const diff = date.getUTCDate() - day + 1;
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
    const mondayStr = monday.toISOString().split('T')[0];
    updates.push('week_start = ?');
    params.push(mondayStr);
  }
  if (time_period !== undefined) {
    updates.push('time_period = ?');
    params.push(time_period);
  }
  if (action !== undefined) {
    updates.push('action = ?');
    params.push(action);
  }
  if (priority !== undefined) {
    updates.push('priority = ?');
    params.push(priority);
  }
  if (week_start !== undefined) {
    updates.push('week_start = ?');
    params.push(week_start);
  }
  
  if (updates.length === 0) {
    return res.json({ message: '无更新内容' });
  }
  
  params.push(id);
  
  db.run(`UPDATE week_tasks SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // 如果是企业相关待办且状态变为已完成，更新企业联系频次
    if (status === 'completed' && company_id) {
      db.run(`
        UPDATE companies 
        SET contact_frequency = CASE 
          WHEN contact_frequency = '低频' THEN '中频'
          WHEN contact_frequency = '中频' THEN '高频'
          ELSE '高频'
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [company_id], function(err) {
        if (err) console.error('更新联系频次失败:', err.message);
      });
    }
    
    res.json({ message: '更新成功' });
  });
});

// 删除周计划
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM week_tasks WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '删除成功' });
  });
});

module.exports = router;

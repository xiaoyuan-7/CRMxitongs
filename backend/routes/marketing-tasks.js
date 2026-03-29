const express = require('express');
const router = express.Router();
const db = require('../database');

// 获取所有营销任务
router.get('/', (req, res) => {
  const query = `
    SELECT t.*, 
           (SELECT COUNT(*) FROM companies WHERE task_id = t.id) as company_count,
           (SELECT GROUP_CONCAT(name, ', ') FROM companies WHERE task_id = t.id) as company_names
    FROM marketing_tasks t
    ORDER BY t.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 获取任务关联的企业列表
router.get('/:id/companies', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT id, name, industry, annual_revenue, contact_names, is_account_opened, 
           is_payroll_service, is_active_customer, is_high_quality, progress_status
    FROM companies 
    WHERE task_id = ?
    ORDER BY name
  `;
  db.all(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 获取单个任务
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM marketing_tasks WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '任务不存在' });
    res.json(row);
  });
});

// 创建任务
router.post('/', (req, res) => {
  const { name, description, status, company_ids = [] } = req.body;
  
  db.run(
    'INSERT INTO marketing_tasks (name, description, status) VALUES (?, ?, ?)',
    [name, description, status || '进行中'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const taskId = this.lastID;
      
      // 关联企业到任务
      if (company_ids && company_ids.length > 0) {
        const updatePromises = company_ids.map(companyId => {
          return new Promise((resolve, reject) => {
            db.run('UPDATE companies SET task_id = ? WHERE id = ?', [taskId, companyId], function(err) {
              if (err) reject(err);
              else resolve();
            });
          });
        });
        
        Promise.all(updatePromises).then(() => {
          res.json({ id: taskId, message: '任务创建成功', company_count: company_ids.length });
        }).catch(err => {
          res.status(500).json({ error: err.message });
        });
      } else {
        res.json({ id: taskId, message: '任务创建成功', company_count: 0 });
      }
    }
  );
});

// 更新任务
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  db.run(
    'UPDATE marketing_tasks SET name=?, description=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [name, description, status, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '任务更新成功' });
    }
  );
});

// 删除任务
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM marketing_tasks WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '任务删除成功' });
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../database');

// 创建线索板块表
db.run(`
  CREATE TABLE IF NOT EXISTS lead_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
  )
`);

// 创建线索表
db.run(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER,
    company_name TEXT NOT NULL,
    employee_count TEXT,
    is_visited INTEGER DEFAULT 0,
    visit_status TEXT,
    manager_name TEXT,
    remarks TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES lead_boards(id)
  )
`);

// 获取所有线索板块
router.get('/boards', (req, res) => {
  db.all('SELECT * FROM lead_boards ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 创建线索板块
router.post('/boards', (req, res) => {
  const { name, description, created_by } = req.body;
  db.run('INSERT INTO lead_boards (name, description, created_by) VALUES (?, ?, ?)',
    [name, description, created_by],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: '板块创建成功' });
    }
  );
});

// 删除线索板块
router.delete('/boards/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM lead_boards WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '删除成功' });
  });
});

// 获取所有线索（支持筛选）
router.get('/', (req, res) => {
  const { board_id, manager_name, is_visited } = req.query;
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];
  
  if (board_id) {
    query += ' AND board_id = ?';
    params.push(board_id);
  }
  if (manager_name) {
    query += ' AND manager_name = ?';
    params.push(manager_name);
  }
  if (is_visited !== undefined) {
    query += ' AND is_visited = ?';
    params.push(is_visited === 'true' ? 1 : 0);
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 获取某板块的所有线索
router.get('/boards/:boardId/leads', (req, res) => {
  const { boardId } = req.params;
  db.all('SELECT * FROM leads WHERE board_id = ? ORDER BY created_at DESC', [boardId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 添加线索
router.post('/leads', (req, res) => {
  const { board_id, company_name, employee_count, is_visited, visit_status, manager_name, remarks } = req.body;
  db.run(`INSERT INTO leads (board_id, company_name, employee_count, is_visited, visit_status, manager_name, remarks)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [board_id, company_name, employee_count, is_visited||0, visit_status, manager_name, remarks],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: '线索添加成功' });
    }
  );
});

// 更新线索
router.put('/leads/:id', (req, res) => {
  const { id } = req.params;
  const data = req.body;
  db.run(`UPDATE leads SET 
    company_name = COALESCE(?, company_name),
    employee_count = COALESCE(?, employee_count),
    is_visited = COALESCE(?, is_visited),
    visit_status = COALESCE(?, visit_status),
    manager_name = COALESCE(?, manager_name),
    remarks = COALESCE(?, remarks)
    WHERE id = ?`,
    [data.company_name, data.employee_count, data.is_visited, data.visit_status, data.manager_name, data.remarks, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '更新成功' });
    }
  );
});

// 删除线索
router.delete('/leads/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM leads WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '删除成功' });
  });
});

// 转为营销任务
router.post('/leads/:id/convert', (req, res) => {
  const { id } = req.params;
  const { task_id } = req.body;
  
  db.get('SELECT * FROM leads WHERE id = ?', [id], (err, lead) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!lead) return res.status(404).json({ error: '线索不存在' });
    
    // 添加到企业表
    db.run(`INSERT INTO companies (name, manager_name, remarks, task_id) VALUES (?, ?, ?, ?)`,
      [lead.company_name, lead.manager_name, lead.visit_status, task_id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // 更新线索状态
        db.run('UPDATE leads SET status = ? WHERE id = ?', ['converted', id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: '已转为营销任务', company_id: this.lastID });
        });
      }
    );
  });
});

module.exports = router;

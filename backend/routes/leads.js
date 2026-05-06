const express = require('express');
const router = express.Router();
const db = require('../database');

// ========== 表初始化（启动时执行一次）==========

db.run(`
  CREATE TABLE IF NOT EXISTS lead_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
  )
`);

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
    FOREIGN KEY (board_id) REFERENCES lead_boards(id) ON DELETE CASCADE
  )
`);

// 索引
db.run(`CREATE INDEX IF NOT EXISTS idx_leads_board ON leads(board_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_leads_manager ON leads(manager_name)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_leads_visited ON leads(is_visited)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`);

// ========== 线索板块 API ==========

router.get('/boards', (req, res) => {
  db.all('SELECT * FROM lead_boards ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/boards', (req, res) => {
  const { name, description, created_by } = req.body;
  if (!name) return res.status(400).json({ error: '板块名称不能为空' });
  db.run('INSERT INTO lead_boards (name, description, created_by) VALUES (?, ?, ?)',
    [name, description || '', created_by || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: '板块创建成功' });
    });
});

router.delete('/boards/:id', (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.run('DELETE FROM leads WHERE board_id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
    });
    db.run('DELETE FROM lead_boards WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '删除成功' });
    });
  });
});

// ========== 线索 API ==========

router.get('/', (req, res) => {
  const { board_id, manager_name, is_visited, status, limit, offset } = req.query;
  let query = 'SELECT * FROM leads WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM leads WHERE 1=1';
  const params = [];
  const countParams = [];

  if (board_id) {
    query += ' AND board_id = ?';
    countQuery += ' AND board_id = ?';
    params.push(parseInt(board_id));
    countParams.push(parseInt(board_id));
  }
  if (manager_name) {
    query += ' AND manager_name = ?';
    countQuery += ' AND manager_name = ?';
    params.push(manager_name);
    countParams.push(manager_name);
  }
  if (is_visited !== undefined) {
    query += ' AND is_visited = ?';
    countQuery += ' AND is_visited = ?';
    params.push(is_visited === 'true' ? 1 : 0);
    countParams.push(is_visited === 'true' ? 1 : 0);
  }
  if (status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(status);
    countParams.push(status);
  }

  const limitVal = parseInt(limit) || 100;
  const offsetVal = parseInt(offset) || 0;

  countQuery += ' GROUP BY 1'; // dummy for consistency
  db.get(countQuery.replace(/ GROUP BY 1$/, ''), countParams, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitVal, offsetVal);

    db.all(query, params, (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ total: countRow ? countRow.total : rows.length, rows });
    });
  });
});

router.get('/boards/:boardId/leads', (req, res) => {
  const { boardId } = req.params;
  const { limit, offset } = req.query;
  db.all('SELECT * FROM leads WHERE board_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [boardId, parseInt(limit) || 100, parseInt(offset) || 0],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
});

router.get('/leads/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM leads WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '线索不存在' });
    res.json(row);
  });
});

router.post('/leads', (req, res) => {
  const { board_id, company_name, employee_count, is_visited, visit_status, manager_name, remarks } = req.body;
  if (!company_name) return res.status(400).json({ error: '企业名称不能为空' });
  db.run(`INSERT INTO leads (board_id, company_name, employee_count, is_visited, visit_status, manager_name, remarks)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [board_id || null, company_name, employee_count || '', is_visited ? 1 : 0, visit_status || '', manager_name || '', remarks || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: '线索添加成功' });
    });
});

router.put('/leads/:id', (req, res) => {
  const { id } = req.params;
  const data = req.body;
  db.get('SELECT * FROM leads WHERE id = ?', [id], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!existing) return res.status(404).json({ error: '线索不存在' });
    db.run(`UPDATE leads SET
      company_name = ?,
      employee_count = ?,
      is_visited = ?,
      visit_status = ?,
      manager_name = ?,
      remarks = ?
      WHERE id = ?`,
      [
        data.company_name !== undefined ? data.company_name : existing.company_name,
        data.employee_count !== undefined ? data.employee_count : existing.employee_count,
        data.is_visited !== undefined ? (data.is_visited ? 1 : 0) : existing.is_visited,
        data.visit_status !== undefined ? data.visit_status : existing.visit_status,
        data.manager_name !== undefined ? data.manager_name : existing.manager_name,
        data.remarks !== undefined ? data.remarks : existing.remarks,
        id
      ],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '更新成功' });
      });
  });
});

router.delete('/leads/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM leads WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '已删除' });
  });
});

router.post('/leads/:id/convert', (req, res) => {
  const { id } = req.params;
  const { task_id } = req.body;
  db.get('SELECT * FROM leads WHERE id = ?', [id], (err, lead) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!lead) return res.status(404).json({ error: '线索不存在' });
    let insertedId = null;
    db.serialize(() => {
      db.run(`INSERT INTO companies (name, manager_name, remarks, task_id) VALUES (?, ?, ?, ?)`,
        [lead.company_name, lead.manager_name, lead.visit_status, task_id || null],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          insertedId = this.lastID;
        });
      db.run('UPDATE leads SET status = ? WHERE id = ?', ['converted', id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '已转为营销任务', company_id: insertedId });
      });
    });
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../database');

// 获取企业的所有跟进记录
router.get('/company/:companyId', (req, res) => {
  const companyId = req.params.companyId;
  db.all(
    `SELECT * FROM follow_ups WHERE company_id = ? ORDER BY follow_date DESC, follow_time DESC`,
    [companyId],
    (err, rows) => {
      if (err) {
        console.error('获取跟进记录失败:', err.message);
        res.status(500).json({ error: '获取失败' });
      } else {
        res.json(rows);
      }
    }
  );
});

// 添加跟进记录
router.post('/', (req, res) => {
  const { company_id, follow_date, follow_time, follow_type, follow_content, next_follow_date, notes } = req.body;
  
  if (!company_id || !follow_date || !follow_content) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  
  const sql = `INSERT INTO follow_ups (company_id, follow_date, follow_time, follow_type, follow_content, next_follow_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(
    sql,
    [company_id, follow_date, follow_time || '上午', follow_type || '电话', follow_content, next_follow_date || null, notes || ''],
    function(err) {
      if (err) {
        console.error('添加跟进记录失败:', err.message);
        res.status(500).json({ error: '添加失败' });
      } else {
        res.json({ id: this.lastID, message: '添加成功' });
      }
    }
  );
});

// 更新跟进记录
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const { follow_date, follow_time, follow_type, follow_content, next_follow_date, notes } = req.body;
  
  const sql = `UPDATE follow_ups SET follow_date = ?, follow_time = ?, follow_type = ?, follow_content = ?, next_follow_date = ?, notes = ? WHERE id = ?`;
  
  db.run(
    sql,
    [follow_date, follow_time, follow_type, follow_content, next_follow_date, notes, id],
    function(err) {
      if (err) {
        console.error('更新跟进记录失败:', err.message);
        res.status(500).json({ error: '更新失败' });
      } else {
        res.json({ message: '更新成功' });
      }
    }
  );
});

// 删除跟进记录
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  
  db.run(`DELETE FROM follow_ups WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error('删除跟进记录失败:', err.message);
      res.status(500).json({ error: '删除失败' });
    } else {
      res.json({ message: '删除成功' });
    }
  });
});

module.exports = router;

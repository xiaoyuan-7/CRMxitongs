const express = require('express');
const router = express.Router();
const db = require('../database');

// 获取企业的所有营销进度记录
router.get('/company/:companyId', (req, res) => {
  const { companyId } = req.params;
  
  const query = `
    SELECT mp.*, c.name as contact_name
    FROM marketing_progress mp
    LEFT JOIN contacts c ON mp.contact_id = c.id
    WHERE mp.company_id = ?
    ORDER BY mp.follow_up_date DESC
  `;

  db.all(query, [companyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取统计信息（跟进频率）
router.get('/stats/:companyId', (req, res) => {
  const { companyId } = req.params;
  
  const query = `
    SELECT 
      COUNT(*) as total_follow_ups,
      COUNT(DISTINCT follow_up_date) as follow_up_days,
      MAX(follow_up_date) as last_follow_up,
      MIN(follow_up_date) as first_follow_up
    FROM marketing_progress
    WHERE company_id = ?
  `;

  db.get(query, [companyId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row || { total_follow_ups: 0, follow_up_days: 0 });
  });
});

// 创建营销进度记录
router.post('/', (req, res) => {
  const { company_id, contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date, notes } = req.body;
  
  const query = `
    INSERT INTO marketing_progress (company_id, contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [company_id, contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date, notes];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: '跟进记录创建成功' });
  });
});

// 更新营销进度记录
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date, notes } = req.body;
  
  const query = `
    UPDATE marketing_progress SET
      contact_id = ?, follow_up_date = ?, follow_up_type = ?, 
      follow_up_content = ?, next_follow_up_date = ?, notes = ?
    WHERE id = ?
  `;
  
  const params = [contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date, notes, id];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ message: '跟进记录更新成功' });
  });
});

// 删除营销进度记录
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM marketing_progress WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ message: '跟进记录删除成功' });
  });
});

module.exports = router;

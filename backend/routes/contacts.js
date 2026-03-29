const express = require('express');
const router = express.Router();
const db = require('../database');

// 获取企业的所有关键人
router.get('/company/:companyId', (req, res) => {
  const { companyId } = req.params;
  
  const query = `
    SELECT * FROM contacts 
    WHERE company_id = ? 
    ORDER BY is_primary DESC, created_at DESC
  `;

  db.all(query, [companyId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取单个关键人详情
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT c.*, co.name as company_name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE c.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '关键人不存在' });
    }
    res.json(row);
  });
});

// 创建关键人
router.post('/', (req, res) => {
  const { company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary } = req.body;
  
  // 如果设置为 primary，先将同公司的其他关键人设为非 primary
  if (is_primary) {
    db.run('UPDATE contacts SET is_primary = 0 WHERE company_id = ?', [company_id]);
  }
  
  const query = `
    INSERT INTO contacts (company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary ? 1 : 0];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: '关键人创建成功' });
  });
});

// 更新关键人
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary } = req.body;
  
  // 如果设置为 primary，先将同公司的其他关键人设为非 primary
  if (is_primary) {
    db.run('UPDATE contacts SET is_primary = 0 WHERE company_id = ? AND id != ?', [company_id, id]);
  }
  
  const query = `
    UPDATE contacts SET
      name = ?, position = ?, birth_date = ?, family_info = ?, 
      preferences = ?, gift_recommendations = ?, is_primary = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const params = [name, position, birth_date, family_info, preferences, gift_recommendations, is_primary ? 1 : 0, id];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '关键人不存在' });
    }
    res.json({ message: '关键人更新成功' });
  });
});

// 删除关键人
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '关键人不存在' });
    }
    res.json({ message: '关键人删除成功' });
  });
});

// 获取即将过生日的关键人
router.get('/birthdays/upcoming', (req, res) => {
  const { days = 30 } = req.query;
  
  const query = `
    SELECT c.*, co.name as company_name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE c.birth_date IS NOT NULL
    AND strftime('%m-%d', c.birth_date) BETWEEN strftime('%m-%d', 'now') 
        AND date('now', '+' || ? || ' days')
    ORDER BY strftime('%m-%d', c.birth_date)
  `;

  db.all(query, [days], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;

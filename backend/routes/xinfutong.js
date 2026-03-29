const express = require('express');
const router = express.Router();
const db = require('../database');

// 获取企业的薪福通详情
router.get('/:companyId', (req, res) => {
  const { companyId } = req.params;
  const query = 'SELECT * FROM xinfutong_details WHERE company_id = ?';
  db.get(query, [companyId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || {});
  });
});

// 创建或更新薪福通详情
router.post('/', (req, res) => {
  const { company_id, is_registered, modules, config_status, config_teacher } = req.body;
  
  db.get('SELECT * FROM xinfutong_details WHERE company_id = ?', [company_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row) {
      const query = `UPDATE xinfutong_details SET is_registered=?, modules=?, config_status=?, config_teacher=?, updated_at=CURRENT_TIMESTAMP WHERE company_id=?`;
      db.run(query, [is_registered, modules, config_status, config_teacher, company_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '更新成功' });
      });
    } else {
      const query = `INSERT INTO xinfutong_details (company_id, is_registered, modules, config_status, config_teacher) VALUES (?, ?, ?, ?, ?)`;
      db.run(query, [company_id, is_registered, modules, config_status, config_teacher], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '创建成功' });
      });
    }
  });
});

module.exports = router;

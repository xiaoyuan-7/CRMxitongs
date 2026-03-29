const express = require('express');
const router = express.Router();
const db = require('../database');

// 获取所有提醒（支持筛选）
router.get('/', (req, res) => {
  const { is_completed, reminder_type, start_date, end_date } = req.query;
  
  let query = `
    SELECT r.*, c.name as contact_name, co.name as company_name
    FROM reminders r
    LEFT JOIN contacts c ON r.contact_id = c.id
    LEFT JOIN companies co ON r.company_id = co.id
    WHERE 1=1
  `;
  const params = [];

  if (is_completed !== undefined) {
    query += ` AND r.is_completed = ?`;
    params.push(is_completed === 'true' ? 1 : 0);
  }
  if (reminder_type) {
    query += ` AND r.reminder_type = ?`;
    params.push(reminder_type);
  }
  if (start_date) {
    query += ` AND r.reminder_date >= ?`;
    params.push(start_date);
  }
  if (end_date) {
    query += ` AND r.reminder_date <= ?`;
    params.push(end_date);
  }

  query += ` ORDER BY r.reminder_date ASC, r.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取今日提醒
router.get('/today', (req, res) => {
  const query = `
    SELECT r.*, c.name as contact_name, co.name as company_name
    FROM reminders r
    LEFT JOIN contacts c ON r.contact_id = c.id
    LEFT JOIN companies co ON r.company_id = co.id
    WHERE date(r.reminder_date) = date('now')
    AND r.is_completed = 0
    ORDER BY r.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取即将到期的提醒
router.get('/upcoming', (req, res) => {
  const { days = 7 } = req.query;
  
  const query = `
    SELECT r.*, c.name as contact_name, co.name as company_name
    FROM reminders r
    LEFT JOIN contacts c ON r.contact_id = c.id
    LEFT JOIN companies co ON r.company_id = co.id
    WHERE date(r.reminder_date) BETWEEN date('now') AND date('now', '+' || ? || ' days')
    AND r.is_completed = 0
    ORDER BY r.reminder_date ASC
  `;

  db.all(query, [days], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 创建提醒
router.post('/', (req, res) => {
  const { user_id, contact_id, company_id, reminder_type, reminder_date, title, description } = req.body;
  
  const query = `
    INSERT INTO reminders (user_id, contact_id, company_id, reminder_type, reminder_date, title, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [user_id, contact_id, company_id, reminder_type, reminder_date, title, description];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: '提醒创建成功' });
  });
});

// 标记提醒为完成
router.put('/:id/complete', (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE reminders SET is_completed = 1 WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '提醒不存在' });
    }
    res.json({ message: '提醒已完成' });
  });
});

// 更新提醒
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { reminder_type, reminder_date, title, description, is_completed } = req.body;
  
  const query = `
    UPDATE reminders SET
      reminder_type = ?, reminder_date = ?, title = ?, description = ?, is_completed = ?
    WHERE id = ?
  `;
  
  const params = [reminder_type, reminder_date, title, description, is_completed ? 1 : 0, id];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '提醒不存在' });
    }
    res.json({ message: '提醒更新成功' });
  });
});

// 删除提醒
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM reminders WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '提醒不存在' });
    }
    res.json({ message: '提醒删除成功' });
  });
});

// 自动生成生日提醒
router.post('/generate-birthday-reminders', (req, res) => {
  const { year = new Date().getFullYear() } = req.body;
  
  const query = `
    INSERT INTO reminders (contact_id, company_id, reminder_type, reminder_date, title, description)
    SELECT 
      c.id,
      c.company_id,
      '生日',
      date('${year}-' || strftime('%m', c.birth_date) || '-' || strftime('%d', c.birth_date)),
      c.name || ' 生日',
      '今天是 ' || c.name || ' 的生日，来自 ' || co.name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE c.birth_date IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM reminders r 
      WHERE r.contact_id = c.id 
      AND r.reminder_type = '生日'
      AND strftime('%Y', r.reminder_date) = '${year}'
    )
  `;

  db.run(query, [], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: `已生成 ${this.changes} 条生日提醒` });
  });
});

// 自动生成节假日送礼提醒
router.post('/generate-gift-reminders', (req, res) => {
  const { year = new Date().getFullYear() } = req.body;
  
  // 定义节假日（农历节日需要特殊处理，这里用公历近似）
  const holidays = [
    { date: `${year}-01-01`, name: '元旦' },
    { date: `${year}-02-14`, name: '情人节' },
    { date: `${year}-03-08`, name: '妇女节' },
    { date: `${year}-05-01`, name: '劳动节' },
    { date: `${year}-06-01`, name: '儿童节' },
    { date: `${year}-09-10`, name: '教师节' },
    { date: `${year}-10-01`, name: '国庆节' },
    { date: `${year}-12-25`, name: '圣诞节' }
  ];

  let totalInserted = 0;

  const insertHoliday = (holiday, index) => {
    if (index >= holidays.length) {
      return res.json({ message: `已生成 ${totalInserted} 条节假日送礼提醒` });
    }

    const query = `
      INSERT INTO reminders (company_id, reminder_type, reminder_date, title, description)
      SELECT 
        c.id,
        '节假日送礼',
        ?,
        ? || ' 送礼提醒',
        '今天是' || ? || '，建议给 ' || c.name || ' 的关键人发送节日祝福或礼品'
      FROM companies c
      WHERE NOT EXISTS (
        SELECT 1 FROM reminders r 
        WHERE r.company_id = c.id 
        AND r.reminder_type = '节假日送礼'
        AND r.reminder_date = ?
      )
    `;

    db.run(query, [holiday.date, holiday.name, holiday.name, holiday.date], function(err) {
      if (!err) {
        totalInserted += this.changes;
      }
      insertHoliday(holidays[index + 1], index + 1);
    });
  };

  insertHoliday(holidays[0], 0);
});

module.exports = router;

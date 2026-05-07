const express = require('express');
const router = express.Router();
const { getDatabase, allAsync, getAsync, runAsync } = require('../database');

// 获取提醒列表
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const reminders = await allAsync(`
      SELECT r.*, u.username, c.name as contact_name, comp.name as company_name
      FROM reminders r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN contacts c ON r.contact_id = c.id
      LEFT JOIN companies comp ON r.company_id = comp.id
      ORDER BY r.reminder_date DESC
    `);
    
    res.json(reminders);
  } catch (error) {
    console.error('获取提醒列表失败:', error);
    res.status(500).json({ error: '获取提醒列表失败' });
  }
});

// 获取今日提醒
router.get('/today', async (req, res) => {
  try {
    const db = getDatabase();
    const reminders = await allAsync(`
      SELECT r.*, u.username, c.name as contact_name, comp.name as company_name
      FROM reminders r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN contacts c ON r.contact_id = c.id
      LEFT JOIN companies comp ON r.company_id = comp.id
      WHERE DATE(r.reminder_date) = DATE('now')
      AND r.is_completed = 0
      ORDER BY r.reminder_date
    `);
    
    res.json(reminders);
  } catch (error) {
    console.error('获取今日提醒失败:', error);
    res.status(500).json({ error: '获取今日提醒失败' });
  }
});

// 获取即将到期的提醒
router.get('/upcoming', async (req, res) => {
  try {
    const db = getDatabase();
    const reminders = await allAsync(`
      SELECT r.*, u.username, c.name as contact_name, comp.name as company_name
      FROM reminders r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN contacts c ON r.contact_id = c.id
      LEFT JOIN companies comp ON r.company_id = comp.id
      WHERE r.reminder_date >= date('now')
      AND r.is_completed = 0
      ORDER BY r.reminder_date
      LIMIT 10
    `);
    
    res.json(reminders);
  } catch (error) {
    console.error('获取即将到期提醒失败:', error);
    res.status(500).json({ error: '获取即将到期提醒失败' });
  }
});

// 创建提醒
router.post('/', async (req, res) => {
  try {
    const { user_id, contact_id, company_id, reminder_type, reminder_date, title, description } = req.body;
    
    const db = getDatabase();
    const result = await runAsync(`
      INSERT INTO reminders (user_id, contact_id, company_id, reminder_type, reminder_date, title, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [user_id, contact_id, company_id, reminder_type, reminder_date, title, description]);

    res.json({ id: result.lastID, message: '提醒创建成功' });
  } catch (error) {
    console.error('创建提醒失败:', error);
    res.status(500).json({ error: '创建提醒失败' });
  }
});

// 生成本年生日提醒
router.post('/generate-birthday-reminders', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 获取所有关键人
    const contacts = await allAsync('SELECT * FROM contacts WHERE birth_date IS NOT NULL');
    
    const currentYear = new Date().getFullYear();
    const reminders = [];
    
    for (const contact of contacts) {
      if (contact.birth_date) {
        const birthday = new Date(contact.birth_date);
        birthday.setFullYear(currentYear);
        const reminderDate = birthday.toISOString().split('T')[0];
        
        const result = await runAsync(`
          INSERT INTO reminders (user_id, contact_id, company_id, reminder_type, reminder_date, title, description)
          VALUES (1, ?, ?, 'birthday', ?, ?, ?)
        `, [contact.id, contact.company_id, reminderDate, `生日提醒 - ${contact.name}`, `${contact.name}的生日到了`]);
        
        reminders.push({ contact_id: contact.id, reminder_date: reminderDate });
      }
    }
    
    res.json({ 
      message: `成功生成了 ${reminders.length} 个生日提醒`, 
      reminders 
    });
  } catch (error) {
    console.error('生成生日提醒失败:', error);
    res.status(500).json({ error: '生成生日提醒失败' });
  }
});

// 生成节假日送礼提醒
router.post('/generate-gift-reminders', async (req, res) => {
  try {
    const db = getDatabase();
    
    const holidays = [
      { name: '春节', date: new Date(new Date().getFullYear(), 1, 1).toISOString().split('T')[0] },
      { name: '中秋节', date: new Date(new Date().getFullYear(), 8, 15).toISOString().split('T')[0] },
      { name: '国庆节', date: new Date(new Date().getFullYear(), 9, 1).toISOString().split('T')[0] }
    ];
    
    const reminders = [];
    
    for (const holiday of holidays) {
      // 获取所有关键人
      const contacts = await allAsync('SELECT * FROM contacts');
      
      for (const contact of contacts) {
        const result = await runAsync(`
          INSERT INTO reminders (user_id, contact_id, company_id, reminder_type, reminder_date, title, description)
          VALUES (1, ?, ?, 'gift', ?, ?, ?)
        `, [contact.id, contact.company_id, holiday.date, `节日送礼提醒 - ${holiday.name}`, `${holiday.name}将至，记得为${contact.name}准备礼物`]);
        
        reminders.push({ contact_id: contact.id, holiday: holiday.name });
      }
    }
    
    res.json({ 
      message: `成功生成了 ${reminders.length} 个节假日送礼提醒`, 
      reminders 
    });
  } catch (error) {
    console.error('生成节假日送礼提醒失败:', error);
    res.status(500).json({ error: '生成节假日送礼提醒失败' });
  }
});

// 标记提醒为完成
router.post('/:id/complete', async (req, res) => {
  try {
    const db = getDatabase();
    await runAsync('UPDATE reminders SET is_completed = 1 WHERE id = ?', [req.params.id]);

    res.json({ message: '提醒已标记为完成' });
  } catch (error) {
    console.error('标记提醒完成失败:', error);
    res.status(500).json({ error: '标记提醒完成失败' });
  }
});

// 删除提醒
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    await runAsync('DELETE FROM reminders WHERE id = ?', [req.params.id]);

    res.json({ message: '提醒删除成功' });
  } catch (error) {
    console.error('删除提醒失败:', error);
    res.status(500).json({ error: '删除提醒失败' });
  }
});

module.exports = router;
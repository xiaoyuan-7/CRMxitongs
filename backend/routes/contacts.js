const express = require('express');
const router = express.Router();
const { getDatabase, allAsync, getAsync, runAsync } = require('../database');

// 获取企业的关键人列表
router.get('/company/:companyId', async (req, res) => {
  try {
    const db = getDatabase();
    const contacts = await allAsync('SELECT * FROM contacts WHERE company_id = ? ORDER BY is_primary DESC, created_at DESC', [req.params.companyId]);
    res.json(contacts);
  } catch (error) {
    console.error('获取关键人列表失败:', error);
    res.status(500).json({ error: '获取关键人列表失败' });
  }
});

// 获取关键人详情
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const contact = await getAsync('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    
    if (!contact) {
      return res.status(404).json({ error: '关键人不存在' });
    }

    res.json(contact);
  } catch (error) {
    console.error('获取关键人详情失败:', error);
    res.status(500).json({ error: '获取关键人详情失败' });
  }
});

// 获取即将过生日的关键人
router.get('/birthdays/upcoming', async (req, res) => {
  try {
    const db = getDatabase();
    const contacts = await allAsync(`
      SELECT c.*, comp.name as company_name
      FROM contacts c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.birth_date IS NOT NULL
      AND strftime('%m-%d', c.birth_date) = strftime('%m-%d', date('now', '+7 days'))
      ORDER BY c.birth_date
    `);
    
    res.json(contacts);
  } catch (error) {
    console.error('获取生日提醒失败:', error);
    res.status(500).json({ error: '获取生日提醒失败' });
  }
});

// 创建关键人
router.post('/', async (req, res) => {
  try {
    const { company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary } = req.body;
    
    const db = getDatabase();
    const result = await runAsync(`
      INSERT INTO contacts (company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary || 0]);

    res.json({ id: result.lastID, message: '关键人创建成功' });
  } catch (error) {
    console.error('创建关键人失败:', error);
    res.status(500).json({ error: '创建关键人失败' });
  }
});

// 更新关键人
router.put('/:id', async (req, res) => {
  try {
    const { company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary } = req.body;
    
    const db = getDatabase();
    await runAsync(`
      UPDATE contacts 
      SET company_id = ?, name = ?, position = ?, birth_date = ?, family_info = ?, preferences = ?, gift_recommendations = ?, is_primary = ?
      WHERE id = ?
    `, [company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary || 0, req.params.id]);

    res.json({ message: '关键人更新成功' });
  } catch (error) {
    console.error('更新关键人失败:', error);
    res.status(500).json({ error: '更新关键人失败' });
  }
});

// 删除关键人
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 先删除相关的营销进度和提醒
    await runAsync('DELETE FROM marketing_progress WHERE contact_id = ?', [req.params.id]);
    await runAsync('DELETE FROM reminders WHERE contact_id = ?', [req.params.id]);
    
    // 删除关键人
    await runAsync('DELETE FROM contacts WHERE id = ?', [req.params.id]);

    res.json({ message: '关键人删除成功' });
  } catch (error) {
    console.error('删除关键人失败:', error);
    res.status(500).json({ error: '删除关键人失败' });
  }
});

module.exports = router;
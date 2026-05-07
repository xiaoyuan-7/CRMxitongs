const express = require('express');
const router = express.Router();
const { getDatabase, allAsync, getAsync, runAsync } = require('../database');

// 获取企业的跟进记录
router.get('/company/:companyId', async (req, res) => {
  try {
    const db = getDatabase();
    const records = await allAsync(`
      SELECT mp.*, ct.name as contact_name, comp.name as company_name
      FROM marketing_progress mp
      LEFT JOIN contacts ct ON mp.contact_id = ct.id
      LEFT JOIN companies comp ON mp.company_id = comp.id
      WHERE mp.company_id = ?
      ORDER BY mp.follow_up_date DESC
    `, [req.params.companyId]);
    
    res.json(records);
  } catch (error) {
    console.error('获取跟进记录失败:', error);
    res.status(500).json({ error: '获取跟进记录失败' });
  }
});

// 获取跟进统计
router.get('/stats/:companyId', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 总跟进次数
    const totalFollowups = await getAsync('SELECT COUNT(*) as count FROM marketing_progress WHERE company_id = ?', [req.params.companyId]);
    
    // 按类型统计
    const typeStats = await allAsync(`
      SELECT follow_up_type, COUNT(*) as count
      FROM marketing_progress 
      WHERE company_id = ?
      GROUP BY follow_up_type
    `, [req.params.companyId]);
    
    // 最近30天跟进趋势
    const recentTrend = await allAsync(`
      SELECT DATE(follow_up_date) as date, COUNT(*) as count
      FROM marketing_progress 
      WHERE company_id = ? AND follow_up_date >= date('now', '-30 days')
      GROUP BY DATE(follow_up_date)
      ORDER BY date
    `, [req.params.companyId]);

    res.json({
      totalFollowups: totalFollowups.count,
      typeStats,
      recentTrend
    });
  } catch (error) {
    console.error('获取跟进统计失败:', error);
    res.status(500).json({ error: '获取跟进统计失败' });
  }
});

// 创建跟进记录
router.post('/', async (req, res) => {
  try {
    const { company_id, contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date } = req.body;
    
    const db = getDatabase();
    const result = await runAsync(`
      INSERT INTO marketing_progress (company_id, contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [company_id, contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date]);

    res.json({ id: result.lastID, message: '跟进记录创建成功' });
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    res.status(500).json({ error: '创建跟进记录失败' });
  }
});

// 更新跟进记录
router.put('/:id', async (req, res) => {
  try {
    const { company_id, contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date } = req.body;
    
    const db = getDatabase();
    await runAsync(`
      UPDATE marketing_progress 
      SET company_id = ?, contact_id = ?, follow_up_date = ?, follow_up_type = ?, follow_up_content = ?, next_follow_up_date = ?
      WHERE id = ?
    `, [company_id, contact_id, follow_up_date, follow_up_type, follow_up_content, next_follow_up_date, req.params.id]);

    res.json({ message: '跟进记录更新成功' });
  } catch (error) {
    console.error('更新跟进记录失败:', error);
    res.status(500).json({ error: '更新跟进记录失败' });
  }
});

// 删除跟进记录
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    await runAsync('DELETE FROM marketing_progress WHERE id = ?', [req.params.id]);

    res.json({ message: '跟进记录删除成功' });
  } catch (error) {
    console.error('删除跟进记录失败:', error);
    res.status(500).json({ error: '删除跟进记录失败' });
  }
});

module.exports = router;
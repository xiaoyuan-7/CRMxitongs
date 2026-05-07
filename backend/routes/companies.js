const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// 获取所有企业（支持搜索和筛选）
router.get('/', async (req, res) => {
  const { search, industry, is_account_opened, is_payroll_service, is_active_customer, is_high_quality, progress_status } = req.query;
  
  let query = `
    SELECT c.*, 
           (SELECT GROUP_CONCAT(ct.name, ', ') FROM contacts ct WHERE ct.company_id = c.id) as contact_names,
           (SELECT COUNT(*) FROM marketing_progress mp WHERE mp.company_id = c.id) as follow_up_count
    FROM companies c WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (c.name LIKE ? OR c.introduction LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (industry) {
    query += ` AND c.industry = ?`;
    params.push(industry);
  }
  if (is_account_opened !== undefined) {
    query += ` AND c.is_account_opened = ?`;
    params.push(is_account_opened === 'true' ? 1 : 0);
  }
  if (is_payroll_service !== undefined) {
    query += ` AND c.is_payroll_service = ?`;
    params.push(is_payroll_service === 'true' ? 1 : 0);
  }
  if (is_active_customer !== undefined) {
    query += ` AND c.is_active_customer = ?`;
    params.push(is_active_customer === 'true' ? 1 : 0);
  }
  if (is_high_quality !== undefined) {
    query += ` AND c.is_high_quality = ?`;
    params.push(is_high_quality === 'true' ? 1 : 0);
  }
  if (progress_status) {
    query += ` AND c.progress_status = ?`;
    params.push(progress_status);
  }

  query += ` ORDER BY c.created_at DESC`;

  try {
    const db = getDatabase();
    const companies = await db.all(query, params);
    res.json(companies);
  } catch (error) {
    console.error('获取企业列表失败:', error);
    res.status(500).json({ error: '获取企业列表失败' });
  }
});

// 获取企业详情
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const company = await db.get('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    
    if (!company) {
      return res.status(404).json({ error: '企业不存在' });
    }

    // 获取企业关键人
    const contacts = await db.all('SELECT * FROM contacts WHERE company_id = ?', [req.params.id]);
    
    // 获取营销进度
    const marketing = await db.all(`
      SELECT mp.*, ct.name as contact_name 
      FROM marketing_progress mp 
      LEFT JOIN contacts ct ON mp.contact_id = ct.id 
      WHERE mp.company_id = ?
      ORDER BY mp.follow_up_date DESC
    `, [req.params.id]);

    res.json({
      ...company,
      contacts,
      marketing
    });
  } catch (error) {
    console.error('获取企业详情失败:', error);
    res.status(500).json({ error: '获取企业详情失败' });
  }
});

// 创建企业
router.post('/', async (req, res) => {
  try {
    const { name, introduction, industry, financial_info, upstream_info, downstream_info } = req.body;
    
    const db = getDatabase();
    const result = await db.run(`
      INSERT INTO companies (name, introduction, industry, financial_info, upstream_info, downstream_info)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, introduction, industry, financial_info, upstream_info, downstream_info]);

    res.json({ id: result.lastID, message: '企业创建成功' });
  } catch (error) {
    console.error('创建企业失败:', error);
    res.status(500).json({ error: '创建企业失败' });
  }
});

// 更新企业
router.put('/:id', async (req, res) => {
  try {
    const { name, introduction, industry, financial_info, upstream_info, downstream_info, is_account_opened, is_payroll_service, is_active_customer, is_high_quality, progress_status } = req.body;
    
    const db = getDatabase();
    await db.run(`
      UPDATE companies 
      SET name = ?, introduction = ?, industry = ?, financial_info = ?, upstream_info = ?, downstream_info = ?, 
          is_account_opened = ?, is_payroll_service = ?, is_active_customer = ?, is_high_quality = ?, progress_status = ?
      WHERE id = ?
    `, [name, introduction, industry, financial_info, upstream_info, downstream_info, is_account_opened, is_payroll_service, is_active_customer, is_high_quality, progress_status, req.params.id]);

    res.json({ message: '企业更新成功' });
  } catch (error) {
    console.error('更新企业失败:', error);
    res.status(500).json({ error: '更新企业失败' });
  }
});

// 删除企业
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 先删除相关的数据
    await db.run('DELETE FROM marketing_progress WHERE company_id = ?', [req.params.id]);
    await db.run('DELETE FROM contacts WHERE company_id = ?', [req.params.id]);
    await db.run('DELETE FROM reminders WHERE company_id = ?', [req.params.id]);
    
    // 删除企业
    await db.run('DELETE FROM companies WHERE id = ?', [req.params.id]);

    res.json({ message: '企业删除成功' });
  } catch (error) {
    console.error('删除企业失败:', error);
    res.status(500).json({ error: '删除企业失败' });
  }
});

module.exports = router;
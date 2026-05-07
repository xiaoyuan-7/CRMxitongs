const express = require('express');
const router = express.Router();
const { getDatabase, allAsync, getAsync, runAsync } = require('../database');

// 获取统计数据
router.get('/stats', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 总企业数
    const totalCompanies = await getAsync('SELECT COUNT(*) as count FROM companies');
    
    // 总关键人数
    const totalContacts = await getAsync('SELECT COUNT(*) as count FROM contacts');
    
    // 总跟进记录数
    const totalFollowups = await getAsync('SELECT COUNT(*) as count FROM marketing_progress');
    
    // 总提醒数
    const totalReminders = await getAsync('SELECT COUNT(*) as count FROM reminders');
    
    res.json({
      totalCompanies: totalCompanies.count,
      totalContacts: totalContacts.count,
      totalFollowups: totalFollowups.count,
      totalReminders: totalReminders.count
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// 获取转化率
router.get('/conversion', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 开户企业数
    const accountOpened = await getAsync('SELECT COUNT(*) as count FROM companies WHERE is_account_opened = 1');
    
    // 代发企业数
    const payrollService = await getAsync('SELECT COUNT(*) as count FROM companies WHERE is_payroll_service = 1');
    
    // 有效户企业数
    const activeCustomer = await getAsync('SELECT COUNT(*) as count FROM companies WHERE is_active_customer = 1');
    
    // 高质量企业数
    const highQuality = await getAsync('SELECT COUNT(*) as count FROM companies WHERE is_high_quality = 1');
    
    const totalCompanies = await getAsync('SELECT COUNT(*) as count FROM companies');
    
    res.json({
      totalCompanies: totalCompanies.count,
      accountOpened: accountOpened.count,
      payrollService: payrollService.count,
      activeCustomer: activeCustomer.count,
      highQuality: highQuality.count,
      conversionRates: {
        accountOpened: totalCompanies.count > 0 ? (accountOpened.count / totalCompanies.count * 100).toFixed(1) : 0,
        payrollService: totalCompanies.count > 0 ? (payrollService.count / totalCompanies.count * 100).toFixed(1) : 0,
        activeCustomer: totalCompanies.count > 0 ? (activeCustomer.count / totalCompanies.count * 100).toFixed(1) : 0,
        highQuality: totalCompanies.count > 0 ? (highQuality.count / totalCompanies.count * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('获取转化率失败:', error);
    res.status(500).json({ error: '获取转化率失败' });
  }
});

// 获取跟进统计
router.get('/follow-up-stats', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 按类型统计
    const typeStats = await allAsync(`
      SELECT follow_up_type, COUNT(*) as count
      FROM marketing_progress 
      GROUP BY follow_up_type
    `);
    
    // 最近30天跟进趋势
    const recentTrend = await allAsync(`
      SELECT DATE(follow_up_date) as date, COUNT(*) as count
      FROM marketing_progress 
      WHERE follow_up_date >= date('now', '-30 days')
      GROUP BY DATE(follow_up_date)
      ORDER BY date
    `);
    
    res.json({
      typeStats,
      recentTrend
    });
  } catch (error) {
    console.error('获取跟进统计失败:', error);
    res.status(500).json({ error: '获取跟进统计失败' });
  }
});

// 获取业绩趋势
router.get('/performance-trend', async (req, res) => {
  try {
    const db = getDatabase();
    
    // 最近6个月的趋势
    const monthlyTrend = await allAsync(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM companies 
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `);
    
    res.json(monthlyTrend);
  } catch (error) {
    console.error('获取业绩趋势失败:', error);
    res.status(500).json({ error: '获取业绩趋势失败' });
  }
});

// 获取进度状态分布
router.get('/progress-distribution', async (req, res) => {
  try {
    const db = getDatabase();
    
    const progressStats = await allAsync(`
      SELECT progress_status, COUNT(*) as count
      FROM companies 
      GROUP BY progress_status
    `);
    
    res.json(progressStats);
  } catch (error) {
    console.error('获取进度状态分布失败:', error);
    res.status(500).json({ error: '获取进度状态分布失败' });
  }
});

// 获取行业分布
router.get('/industry-distribution', async (req, res) => {
  try {
    const db = getDatabase();
    
    const industryStats = await allAsync(`
      SELECT industry, COUNT(*) as count
      FROM companies 
      WHERE industry IS NOT NULL
      GROUP BY industry
      ORDER BY count DESC
    `);
    
    res.json(industryStats);
  } catch (error) {
    console.error('获取行业分布失败:', error);
    res.status(500).json({ error: '获取行业分布失败' });
  }
});

module.exports = router;
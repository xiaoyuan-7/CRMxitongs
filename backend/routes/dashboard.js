const express = require('express');
const router = express.Router();
const db = require('../database');

// 获取仪表盘统计数据
router.get('/stats', (req, res) => {
  const stats = {};
  
  const queries = {
    totalCompanies: 'SELECT COUNT(*) as count FROM companies',
    totalContacts: 'SELECT COUNT(*) as count FROM contacts',
    accountOpened: 'SELECT COUNT(*) as count FROM companies WHERE is_account_opened = 1',
    payrollService: 'SELECT COUNT(*) as count FROM companies WHERE is_payroll_service = 1',
    activeCustomers: 'SELECT COUNT(*) as count FROM companies WHERE is_active_customer = 1',
    highQuality: 'SELECT COUNT(*) as count FROM companies WHERE is_high_quality = 1',
    pendingFollowUps: `SELECT COUNT(*) as count FROM marketing_progress WHERE next_follow_up_date >= date('now')`,
    upcomingBirthdays: `SELECT COUNT(*) as count FROM contacts WHERE birth_date IS NOT NULL 
      AND strftime('%m-%d', birth_date) BETWEEN strftime('%m-%d', 'now') AND date('now', '+30 days')`,
    pendingReminders: `SELECT COUNT(*) as count FROM reminders WHERE is_completed = 0 AND reminder_date >= date('now')`
  };

  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, [], (err, row) => {
      if (err) {
        stats[key] = 0;
      } else {
        stats[key] = row ? row.count : 0;
      }
      completed++;
      if (completed === total) {
        res.json(stats);
      }
    });
  });
});

// 获取转化率数据
router.get('/conversion', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_account_opened = 1 THEN 1 ELSE 0 END) as account_opened,
      SUM(CASE WHEN is_payroll_service = 1 THEN 1 ELSE 0 END) as payroll_service,
      SUM(CASE WHEN is_active_customer = 1 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN is_high_quality = 1 THEN 1 ELSE 0 END) as high_quality
    FROM companies
  `;

  db.get(query, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const conversion = {
      total: row.total || 0,
      accountOpenedRate: row.total ? ((row.account_opened / row.total) * 100).toFixed(1) : 0,
      payrollServiceRate: row.total ? ((row.payroll_service / row.total) * 100).toFixed(1) : 0,
      activeRate: row.total ? ((row.active / row.total) * 100).toFixed(1) : 0,
      highQualityRate: row.total ? ((row.high_quality / row.total) * 100).toFixed(1) : 0
    };
    
    res.json(conversion);
  });
});

// 获取跟进统计
router.get('/follow-up-stats', (req, res) => {
  const { period = '30' } = req.query; // 默认 30 天
  
  const query = `
    SELECT 
      DATE(follow_up_date) as date,
      COUNT(*) as count,
      follow_up_type
    FROM marketing_progress
    WHERE follow_up_date >= date('now', '-' || ? || ' days')
    GROUP BY DATE(follow_up_date), follow_up_type
    ORDER BY date DESC
  `;

  db.all(query, [period], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // 按日期聚合
    const byDate = {};
    rows.forEach(row => {
      if (!byDate[row.date]) {
        byDate[row.date] = { date: row.date, total: 0, byType: {} };
      }
      byDate[row.date].total += row.count;
      byDate[row.date].byType[row.follow_up_type] = row.count;
    });
    
    res.json({
      daily: Object.values(byDate).reverse(),
      total: rows.reduce((sum, row) => sum + row.count, 0)
    });
  });
});

// 获取业绩趋势
router.get('/performance-trend', (req, res) => {
  const { months = 6 } = req.query;
  
  const query = `
    SELECT 
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as new_companies,
      SUM(CASE WHEN is_account_opened = 1 THEN 1 ELSE 0 END) as account_opened,
      SUM(CASE WHEN is_payroll_service = 1 THEN 1 ELSE 0 END) as payroll_service,
      SUM(CASE WHEN is_high_quality = 1 THEN 1 ELSE 0 END) as high_quality
    FROM companies
    WHERE created_at >= date('now', '-' || ? || ' months')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month
  `;

  db.all(query, [months], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取进度状态分布
router.get('/progress-distribution', (req, res) => {
  const query = `
    SELECT 
      progress_status,
      COUNT(*) as count
    FROM companies
    GROUP BY progress_status
    ORDER BY count DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取行业分布
router.get('/industry-distribution', (req, res) => {
  const query = `
    SELECT 
      industry,
      COUNT(*) as count
    FROM companies
    WHERE industry IS NOT NULL AND industry != ''
    GROUP BY industry
    ORDER BY count DESC
    LIMIT 10
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;

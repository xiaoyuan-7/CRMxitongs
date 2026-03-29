const express = require('express');
const router = express.Router();
const db = require('../database');

// 获取所有企业（支持搜索和筛选）
router.get('/', (req, res) => {
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

  query += ` ORDER BY c.updated_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 获取单个企业详情
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT c.*, 
           (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contact_count,
           (SELECT COUNT(*) FROM marketing_progress WHERE company_id = c.id) as follow_up_count
    FROM companies c WHERE c.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '企业不存在' });
    }
    res.json(row);
  });
});

// 创建企业
router.post('/', (req, res) => {
  const { name, introduction, industry, annual_revenue, financial_info, upstream_info, downstream_info, 
          is_account_opened, is_payroll_service, is_active_customer, is_high_quality, progress_status, 
          xinfutong, manager_name, remarks, landing_cycle, active_count, hq_count, task_id, xinfutong_status, contact_frequency } = req.body;
  
  const query = `
    INSERT INTO companies (name, introduction, industry, annual_revenue, financial_info, upstream_info, downstream_info,
                          is_account_opened, is_payroll_service, is_active_customer, is_high_quality, progress_status, 
                          xinfutong, manager_name, remarks, landing_cycle, active_count, hq_count, task_id, xinfutong_status, contact_frequency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    name, introduction || null, industry || null, annual_revenue || null, financial_info || null, 
    upstream_info || null, downstream_info || null,
    is_account_opened ? 1 : 0, is_payroll_service ? 1 : 0, is_active_customer ? 1 : 0, 
    is_high_quality ? 1 : 0, progress_status || '初步接触', 
    xinfutong ? 1 : 0, manager_name || null, remarks || null,
    landing_cycle || 'ongoing', active_count || 0, hq_count || 0, 
    task_id || null, xinfutong_status || 'not_applicable', contact_frequency || '低频'
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: '企业创建成功' });
  });
});

// 更新企业（支持部分字段更新）
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const data = req.body;
  
  db.get('SELECT * FROM companies WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '企业不存在' });
    
    const updated = {
      name: data.name !== undefined ? data.name : row.name,
      introduction: data.introduction !== undefined ? data.introduction : row.introduction,
      industry: data.industry !== undefined ? data.industry : row.industry,
      annual_revenue: data.annual_revenue !== undefined ? data.annual_revenue : row.annual_revenue,
      financial_info: data.financial_info !== undefined ? data.financial_info : row.financial_info,
      upstream_info: data.upstream_info !== undefined ? data.upstream_info : row.upstream_info,
      downstream_info: data.downstream_info !== undefined ? data.downstream_info : row.downstream_info,
      is_account_opened: data.is_account_opened !== undefined ? data.is_account_opened : row.is_account_opened,
      is_payroll_service: data.is_payroll_service !== undefined ? data.is_payroll_service : row.is_payroll_service,
      is_active_customer: data.is_active_customer !== undefined ? data.is_active_customer : row.is_active_customer,
      is_high_quality: data.is_high_quality !== undefined ? data.is_high_quality : row.is_high_quality,
      progress_status: data.progress_status !== undefined ? data.progress_status : row.progress_status,
      landing_cycle: data.landing_cycle !== undefined ? data.landing_cycle : row.landing_cycle,
      active_count: data.active_count !== undefined ? data.active_count : row.active_count,
      hq_count: data.hq_count !== undefined ? data.hq_count : row.hq_count,
      remarks: data.remarks !== undefined ? data.remarks : row.remarks,
      task_id: data.task_id !== undefined ? data.task_id : row.task_id,
      xinfutong: data.xinfutong !== undefined ? data.xinfutong : row.xinfutong,
      xinfutong_status: data.xinfutong_status !== undefined ? data.xinfutong_status : row.xinfutong_status,
      manager_name: data.manager_name !== undefined ? data.manager_name : row.manager_name,
      contact_frequency: data.contact_frequency !== undefined ? data.contact_frequency : row.contact_frequency,
      // 尽调字段
      main_product: data.main_product !== undefined ? data.main_product : row.main_product,
      top5_customers: data.top5_customers !== undefined ? data.top5_customers : row.top5_customers,
      revenue_range: data.revenue_range !== undefined ? data.revenue_range : row.revenue_range,
      net_profit: data.net_profit !== undefined ? data.net_profit : row.net_profit,
      vat_tax: data.vat_tax !== undefined ? data.vat_tax : row.vat_tax,
      income_tax: data.income_tax !== undefined ? data.income_tax : row.income_tax,
      domestic_settlement: data.domestic_settlement !== undefined ? data.domestic_settlement : row.domestic_settlement,
      cross_border: data.cross_border !== undefined ? data.cross_border : row.cross_border,
      main_banks: data.main_banks !== undefined ? data.main_banks : row.main_banks,
      personal_cards: data.personal_cards !== undefined ? data.personal_cards : row.personal_cards,
      asset_status: data.asset_status !== undefined ? data.asset_status : row.asset_status,
      family_status: data.family_status !== undefined ? data.family_status : row.family_status,
      venture_status: data.venture_status !== undefined ? data.venture_status : row.venture_status,
      executive_stock: data.executive_stock !== undefined ? data.executive_stock : row.executive_stock,
      listing_plan: data.listing_plan !== undefined ? data.listing_plan : row.listing_plan
    };
    
    const query = `
      UPDATE companies SET
        name = ?, introduction = ?, industry = ?, annual_revenue = ?, financial_info = ?, 
        upstream_info = ?, downstream_info = ?,
        is_account_opened = ?, is_payroll_service = ?, is_active_customer = ?, 
        is_high_quality = ?, progress_status = ?, landing_cycle = ?,
        active_count = ?, hq_count = ?, task_id = ?, xinfutong = ?, xinfutong_status = ?, manager_name = ?, contact_frequency = ?,
        main_product = ?, top5_customers = ?, revenue_range = ?, net_profit = ?, vat_tax = ?, income_tax = ?,
        domestic_settlement = ?, cross_border = ?, main_banks = ?,
        personal_cards = ?, asset_status = ?, family_status = ?,
        venture_status = ?, executive_stock = ?, listing_plan = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const params = [
      updated.name, updated.introduction, updated.industry, updated.annual_revenue, updated.financial_info,
      updated.upstream_info, updated.downstream_info,
      updated.is_account_opened, updated.is_payroll_service, updated.is_active_customer,
      updated.is_high_quality, updated.progress_status, updated.landing_cycle,
      updated.active_count, updated.hq_count, updated.task_id, updated.xinfutong, updated.xinfutong_status, updated.manager_name, updated.contact_frequency,
      updated.main_product, updated.top5_customers, updated.revenue_range, updated.net_profit, updated.vat_tax, updated.income_tax,
      updated.domestic_settlement, updated.cross_border, updated.main_banks,
      updated.personal_cards, updated.asset_status, updated.family_status,
      updated.venture_status, updated.executive_stock, updated.listing_plan, id
    ];

    db.run(query, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '企业更新成功' });
    });
  });
});

// 删除企业
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM companies WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '企业不存在' });
    }
    res.json({ message: '企业删除成功' });
  });
});

module.exports = router;

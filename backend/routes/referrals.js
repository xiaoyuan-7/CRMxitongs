const express = require('express');
const router = express.Router();
const db = require('../database');

// 创建转介业务表
db.run(`
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referral_date TEXT NOT NULL,
    from_department TEXT NOT NULL,
    from_person TEXT NOT NULL,
    to_department TEXT NOT NULL,
    to_person TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    business_status TEXT DEFAULT 'pending',
    amount REAL DEFAULT 0,
    points_rule TEXT DEFAULT 'standard',
    final_points INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// 获取所有转介记录
router.get('/', (req, res) => {
  const { month, from_dept, to_dept, status } = req.query;
  let query = 'SELECT * FROM referrals WHERE 1=1';
  const params = [];
  
  if (month) {
    query += ' AND strftime("%Y-%m", referral_date) = ?';
    params.push(month);
  }
  if (from_dept) {
    query += ' AND from_department = ?';
    params.push(from_dept);
  }
  if (to_dept) {
    query += ' AND to_department = ?';
    params.push(to_dept);
  }
  if (status) {
    query += ' AND business_status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY referral_date DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 获取单条转介记录
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM referrals WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '记录不存在' });
    res.json(row);
  });
});

// 创建转介记录
router.post('/', (req, res) => {
  const { 
    referral_date, from_department, from_person, to_department, to_person,
    customer_name, business_status, amount, points_rule, points_calculate, remarks 
  } = req.body;
  
  // 积分计算逻辑：根据是否核算积分决定
  let finalPoints = 0;
  if (business_status === 'completed' && points_calculate !== 0) {
    finalPoints = 1; // 已落地且核算积分，积 1 分
  }
  // 如果 points_calculate 为 0（不核算积分），则 finalPoints 为 0
  
  db.run(`
    INSERT INTO referrals (referral_date, from_department, from_person, to_department, to_person,
      customer_name, business_status, amount, points_rule, points_calculate, final_points, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    referral_date, from_department, from_person, to_department, to_person,
    customer_name, business_status || 'pending', amount || 0, points_rule || 'standard', 
    points_calculate !== undefined ? points_calculate : 1, finalPoints, remarks
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, final_points: finalPoints, message: '转介记录已创建' });
  });
});

// 更新转介记录
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { 
    referral_date, from_department, from_person, to_department, to_person,
    customer_name, business_status, amount, points_rule, points_calculate, remarks 
  } = req.body;
  
  // 积分计算逻辑：根据是否核算积分决定
  let finalPoints = 0;
  if (business_status === 'completed' && points_calculate !== 0) {
    finalPoints = 1; // 已落地且核算积分，积 1 分
  }
  // 如果 points_calculate 为 0（不核算积分），则 finalPoints 为 0
  
  db.run(`
    UPDATE referrals SET 
      referral_date = COALESCE(?, referral_date),
      from_department = COALESCE(?, from_department),
      from_person = COALESCE(?, from_person),
      to_department = COALESCE(?, to_department),
      to_person = COALESCE(?, to_person),
      customer_name = COALESCE(?, customer_name),
      business_status = COALESCE(?, business_status),
      amount = COALESCE(?, amount),
      points_rule = COALESCE(?, points_rule),
      points_calculate = COALESCE(?, points_calculate),
      final_points = ?,
      remarks = COALESCE(?, remarks),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    referral_date, from_department, from_person, to_department, to_person,
    customer_name, business_status, amount, points_rule, 
    points_calculate !== undefined ? points_calculate : 1, finalPoints, remarks, id
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '已更新', final_points: finalPoints });
  });
});

// 删除转介记录
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM referrals WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '已删除' });
  });
});

// 获取月度汇总数据（按条线）
router.get('/summary/monthly', (req, res) => {
  const { month } = req.query;
  let query = `
    SELECT 
      from_department,
      to_department,
      COUNT(*) as total_referrals,
      SUM(CASE WHEN business_status = 'completed' THEN 1 ELSE 0 END) as completed_count,
      ROUND(100.0 * SUM(CASE WHEN business_status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
      SUM(amount) as total_amount,
      SUM(final_points) as total_points
    FROM referrals
    WHERE 1=1
  `;
  const params = [];
  
  if (month) {
    query += ' AND strftime("%Y-%m", referral_date) = ?';
    params.push(month);
  }
  
  query += ' GROUP BY from_department, to_department ORDER BY total_points DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 获取个人积分排行榜
router.get('/ranking/personal', (req, res) => {
  const { month, limit } = req.query;
  let query = `
    SELECT 
      from_person as person_name,
      from_department as department,
      SUM(final_points) as total_points,
      SUM(CASE WHEN business_status = 'completed' THEN 1 ELSE 0 END) as success_count,
      ROUND(AVG(CASE WHEN business_status = 'completed' THEN final_points ELSE NULL END), 2) as avg_points,
      COUNT(*) as total_referrals
    FROM referrals
    WHERE 1=1
  `;
  const params = [];
  
  if (month) {
    query += ' AND strftime("%Y-%m", referral_date) = ?';
    params.push(month);
  }
  
  query += ' GROUP BY from_person, from_department ORDER BY total_points DESC';
  
  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // 添加星级评定
    const result = rows.map(row => {
      let stars = 1;
      if (row.total_points >= 1000) stars = 5;
      else if (row.total_points >= 500) stars = 4;
      else if (row.total_points >= 200) stars = 3;
      else if (row.total_points >= 50) stars = 2;
      
      return { ...row, stars };
    });
    
    res.json(result);
  });
});

// 获取条线转介流向数据（桑基图）
router.get('/flow/sankey', (req, res) => {
  const { month } = req.query;
  let query = `
    SELECT 
      from_department as source,
      to_department as target,
      SUM(amount) as value,
      COUNT(*) as count
    FROM referrals
    WHERE 1=1
  `;
  const params = [];
  
  if (month) {
    query += ' AND strftime("%Y-%m", referral_date) = ?';
    params.push(month);
  }
  
  query += ' GROUP BY from_department, to_department ORDER BY value DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 获取仪表盘数据（总积分与目标对比）
router.get('/dashboard/gauge', (req, res) => {
  const { month, target } = req.query;
  let query = `SELECT SUM(final_points) as total_points FROM referrals WHERE 1=1`;
  const params = [];
  
  if (month) {
    query += ' AND strftime("%Y-%m", referral_date) = ?';
    params.push(month);
  }
  
  db.get(query, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ 
      current: row.total_points || 0, 
      target: parseInt(target) || 10000,
      percentage: Math.round((row.total_points || 0) / (parseInt(target) || 10000) * 100)
    });
  });
});

// 获取条线转介量统计
router.get('/dashboard/bullet', (req, res) => {
  const { month } = req.query;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  if (month) {
    whereClause += ' AND strftime("%Y-%m", referral_date) = ?';
    params.push(month);
  }
  
  // 获取各条线转出统计
  const fromQuery = `
    SELECT 
      from_department as department,
      COUNT(*) as from_count,
      SUM(CASE WHEN business_status = 'completed' THEN 1 ELSE 0 END) as completed_count
    FROM referrals
    ${whereClause}
    GROUP BY from_department
  `;
  
  // 获取各条线接收统计
  const toQuery = `
    SELECT 
      to_department as department,
      COUNT(*) as to_count
    FROM referrals
    ${whereClause}
    GROUP BY to_department
  `;
  
  db.all(fromQuery, params, (err, fromRows) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(toQuery, params, (err2, toRows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      // 合并数据 - 总转介量只算转出数量（避免重复计算）
      const deptMap = {};
      fromRows.forEach(row => {
        deptMap[row.department] = { 
          department: row.department, 
          from_count: row.from_count, 
          to_count: 0,
          total: row.from_count,  // 总转介量 = 转出数量
          completed: row.completed_count
        };
      });
      toRows.forEach(row => {
        if (deptMap[row.department]) {
          deptMap[row.department].to_count = row.to_count;
          // total 不变，仍然是 from_count
        } else {
          deptMap[row.department] = {
            department: row.department,
            from_count: 0,
            to_count: row.to_count,
            total: 0,  // 只有接收没有转出的条线，转介量为 0
            completed: 0
          };
        }
      });
      
      const result = Object.values(deptMap).sort((a, b) => b.total - a.total);
      res.json({ data: result, target: 50 });
    });
  });
});

module.exports = router;

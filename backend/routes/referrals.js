const express = require('express');
const router = express.Router();
const db = require('../database');

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
    points_calculate INTEGER DEFAULT 1,
    final_points INTEGER DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_referrals_date ON referrals(referral_date)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_referrals_from ON referrals(from_person)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_referrals_to ON referrals(to_person)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(business_status)`);

const { runAsync, getAsync, allAsync } = require('../database');

// GET /api/referrals
router.get('/', async (req, res) => {
  try {
    const { month, from_dept, to_dept, status, limit, offset } = req.query;
    let query = 'SELECT * FROM referrals WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM referrals WHERE 1=1';
    const params = [];
    const countParams = [];

    if (month) {
      query += ' AND strftime("%Y-%m", referral_date) = ?';
      countQuery += ' AND strftime("%Y-%m", referral_date) = ?';
      params.push(month); countParams.push(month);
    }
    if (from_dept) {
      query += ' AND from_department = ?';
      countQuery += ' AND from_department = ?';
      params.push(from_dept); countParams.push(from_dept);
    }
    if (to_dept) {
      query += ' AND to_department = ?';
      countQuery += ' AND to_department = ?';
      params.push(to_dept); countParams.push(to_dept);
    }
    if (status) {
      query += ' AND business_status = ?';
      countQuery += ' AND business_status = ?';
      params.push(status); countParams.push(status);
    }

    const totalRow = await getAsync(countQuery, countParams);
    query += ' ORDER BY referral_date DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 200, parseInt(offset) || 0);

    const rows = await allAsync(query, params);
    res.json({ total: totalRow ? totalRow.total : rows.length, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/referrals/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await getAsync('SELECT * FROM referrals WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: '记录不存在' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/referrals
router.post('/', async (req, res) => {
  try {
    const {
      referral_date, from_department, from_person, to_department, to_person,
      customer_name, business_status, amount, points_calculate, remarks
    } = req.body;

    const finalPoints = (business_status === 'completed' && points_calculate !== 0) ? 1 : 0;

    const { lastID } = await runAsync(
      `INSERT INTO referrals (referral_date, from_department, from_person, to_department, to_person,
       customer_name, business_status, amount, points_rule, points_calculate, final_points, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'standard', ?, ?, ?)`,
      [referral_date, from_department, from_person, to_department, to_person,
       customer_name, business_status || 'pending', amount || 0,
       points_calculate !== undefined ? points_calculate : 1, finalPoints, remarks || '']
    );
    res.json({ id: lastID, final_points: finalPoints, message: '转介记录已创建' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/referrals/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      referral_date, from_department, from_person, to_department, to_person,
      customer_name, business_status, amount, points_calculate, remarks
    } = req.body;

    const existing = await getAsync('SELECT * FROM referrals WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: '记录不存在' });

    const finalPoints = (business_status === 'completed' && points_calculate !== 0) ? 1 : 0;

    await runAsync(
      `UPDATE referrals SET
       referral_date = ?, from_department = ?, from_person = ?, to_department = ?, to_person = ?,
       customer_name = ?, business_status = ?, amount = ?, points_calculate = ?, final_points = ?,
       remarks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        referral_date || existing.referral_date,
        from_department || existing.from_department,
        from_person || existing.from_person,
        to_department || existing.to_department,
        to_person || existing.to_person,
        customer_name || existing.customer_name,
        business_status || existing.business_status,
        amount !== undefined ? amount : existing.amount,
        points_calculate !== undefined ? points_calculate : existing.points_calculate,
        finalPoints,
        remarks !== undefined ? remarks : existing.remarks,
        id
      ]
    );
    res.json({ message: '已更新', final_points: finalPoints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/referrals/:id
router.delete('/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM referrals WHERE id = ?', [req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/referrals/summary/monthly
router.get('/summary/monthly', async (req, res) => {
  try {
    const { month } = req.query;
    let query = `
      SELECT from_department, to_department,
             COUNT(*) as total_referrals,
             SUM(CASE WHEN business_status = 'completed' THEN 1 ELSE 0 END) as completed_count,
             ROUND(100.0 * SUM(CASE WHEN business_status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
             SUM(amount) as total_amount,
             SUM(final_points) as total_points
      FROM referrals WHERE 1=1`;
    const params = [];
    if (month) { query += ' AND strftime("%Y-%m", referral_date) = ?'; params.push(month); }
    query += ' GROUP BY from_department, to_department ORDER BY total_points DESC';
    res.json(await allAsync(query, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/referrals/ranking/personal
router.get('/ranking/personal', async (req, res) => {
  try {
    const { month, limit } = req.query;
    let query = `
      SELECT from_person as person_name, from_department as department,
             SUM(final_points) as total_points,
             SUM(CASE WHEN business_status = 'completed' THEN 1 ELSE 0 END) as success_count,
             ROUND(AVG(CASE WHEN business_status = 'completed' THEN final_points ELSE NULL END), 2) as avg_points,
             COUNT(*) as total_referrals
      FROM referrals WHERE 1=1`;
    const params = [];
    if (month) { query += ' AND strftime("%Y-%m", referral_date) = ?'; params.push(month); }
    query += ' GROUP BY from_person, from_department ORDER BY total_points DESC';
    if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit)); }

    const rows = await allAsync(query, params);
    const result = rows.map(row => ({
      ...row,
      stars: row.total_points >= 1000 ? 5 : row.total_points >= 500 ? 4 : row.total_points >= 200 ? 3 : row.total_points >= 50 ? 2 : 1
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/referrals/flow/sankey
router.get('/flow/sankey', async (req, res) => {
  try {
    const { month } = req.query;
    let query = `
      SELECT from_department as source, to_department as target,
             SUM(amount) as value, COUNT(*) as count
      FROM referrals WHERE 1=1`;
    const params = [];
    if (month) { query += ' AND strftime("%Y-%m", referral_date) = ?'; params.push(month); }
    query += ' GROUP BY from_department, to_department ORDER BY value DESC';
    res.json(await allAsync(query, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/referrals/dashboard/gauge
router.get('/dashboard/gauge', async (req, res) => {
  try {
    const { month, target } = req.query;
    let query = 'SELECT SUM(final_points) as total_points FROM referrals WHERE 1=1';
    const params = [];
    if (month) { query += ' AND strftime("%Y-%m", referral_date) = ?'; params.push(month); }
    const row = await getAsync(query, params);
    const current = row ? row.total_points || 0 : 0;
    const targetVal = parseInt(target) || 10000;
    res.json({ current, target: targetVal, percentage: Math.round(current / targetVal * 100) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/referrals/dashboard/bullet
router.get('/dashboard/bullet', async (req, res) => {
  try {
    const { month } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (month) { whereClause += ' AND strftime("%Y-%m", referral_date) = ?'; params.push(month); }

    const fromRows = await allAsync(`
      SELECT from_department as department, COUNT(*) as from_count,
             SUM(CASE WHEN business_status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM referrals ${whereClause} GROUP BY from_department`, params);

    const toRows = await allAsync(`
      SELECT to_department as department, COUNT(*) as to_count
      FROM referrals ${whereClause} GROUP BY to_department`, params);

    const deptMap = {};
    fromRows.forEach(r => { deptMap[r.department] = { department: r.department, from_count: r.from_count, to_count: 0, total: r.from_count, completed: r.completed_count }; });
    toRows.forEach(r => { if (deptMap[r.department]) deptMap[r.department].to_count = r.to_count; else deptMap[r.department] = { department: r.department, from_count: 0, to_count: r.to_count, total: 0, completed: 0 }; });

    res.json({ data: Object.values(deptMap).sort((a, b) => b.total - a.total), target: 50 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

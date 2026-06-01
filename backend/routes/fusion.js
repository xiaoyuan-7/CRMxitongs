const express = require("express");
const router = express.Router();
const { db } = require("../database");

// 获取任务说明（保持不变）
router.get("/tasks", (req, res) => {
  const tasks = {
    批发条线: {
      全年要求: ["1、普惠不得为负", "2、企业年金折算考核户不低于1户", "3、百人高质量目标2户，一票否决门槛：1户"],
      全年个人要求: ["1、转介保险不低于2单", "2、转介零售小微抵押贷不低于2单"],
      开门红要求: ["1、百人高质量1户", "2、转介保险或零售小微抵押贷不低于1单"],
      开门红个人要求: ["1、转介保险或零售小微抵押贷不低于1单"]
    },
    零售条线: {
      全年要求: ["1、百人高质量目标2户，一票否决门槛：1户", "2、零售小微抵押贷、房消完成支行全年预算"],
      全年个人要求: ["对公开户及授信转介", "L3：转介高质量开户6户，转介授信2户", "L2：转介高质量开户5户，转介授信1户", "L1：转介高质量开户2户", "市拓：转介高质量开户8户，转介授信2户", "*科创企业开户按1.5倍计入"],
      开门红要求: ["1、百人高质量1户", "2、转介高质量开户", "L3：2户，L2/L1：1户，市拓：3户"],
      开门红个人要求: ["1、转介高质量开户", "L3：2户，L2/L1：1户，市拓：3户"]
    },
    运营条线: {
      全年要求: ["1、首面产品开通率不低于85%"],
      全年个人要求: ["1、信用卡不低于3户", "2、闪电贷不低于3户", "3、会计柜员转介外币户开户不低于3户"],
      开门红要求: ["1、首面产品开通率不低于85%"],
      开门红个人要求: ["1、信用卡不低于1户", "2、闪电贷不低于1户", "3、会计柜员转介外币户开户不低于1户"]
    }
  };
  res.json(tasks);
});

// 获取目标列表
router.get("/targets", (req, res) => {
  const { line, search } = req.query;
  let sql = "SELECT * FROM fusion_targets WHERE 1=1";
  const params = [];
  if (line) { sql += " AND line = ?"; params.push(line); }
  if (search) {
    sql += " AND (manager_name LIKE ? OR target_company LIKE ?)";
    params.push("%" + search + "%", "%" + search + "%");
  }
  sql += " ORDER BY line, target_type, manager_name, id";
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 获取统计
router.get("/stats", (req, res) => {
  const sql = `SELECT
    target_type, line,
    SUM(task_count) as total_task,
    SUM(completed_count) as total_completed,
    COUNT(DISTINCT manager_name) as manager_count,
    COUNT(*) as record_count
    FROM fusion_targets GROUP BY target_type, line`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows = rows.map(r => ({
      ...r,
      completion_rate: r.total_task > 0 ? Math.round(r.total_completed / r.total_task * 100) : 0
    }));
    res.json(rows);
  });
});

// 获取仪表盘统计
router.get("/dashboard", (req, res) => {
  const sql = `SELECT
    target_type, line,
    SUM(task_count) as total_task,
    SUM(completed_count) as total_completed,
    COUNT(DISTINCT manager_name) as manager_count,
    COUNT(*) as record_count
    FROM fusion_targets GROUP BY target_type, line`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    rows = rows.map(r => ({
      ...r,
      completion_rate: r.total_task > 0 ? Math.round(r.total_completed / r.total_task * 100) : 0
    }));
    res.json(rows);
  });
});

// 获取跟进列表
router.get("/followup", (req, res) => {
  const { line, search } = req.query;
  let sql = "SELECT * FROM fusion_targets WHERE 1=1";
  const params = [];
  if (line) { sql += " AND line = ?"; params.push(line); }
  if (search) {
    sql += " AND (manager_name LIKE ? OR target_company LIKE ?)";
    params.push("%" + search + "%", "%" + search + "%");
  }
  sql += " ORDER BY line, target_type, manager_name, id";
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 更新跟进记录
router.patch("/followup/:id", (req, res) => {
  const { contact_manager, contact_info, status, completed_count, task_count } = req.body;
  const sql = `UPDATE fusion_targets SET
    contact_manager=COALESCE(?, contact_manager),
    contact_info=COALESCE(?, contact_info),
    status=COALESCE(?, status),
    completed_count=COALESCE(?, completed_count),
    task_count=COALESCE(?, task_count),
    updated_at=CURRENT_TIMESTAMP
    WHERE id=?`;
  const params = [contact_manager||null, contact_info||null, status||null, completed_count, task_count, req.params.id];
  db.run(sql, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 创建跟进记录
router.post("/followup", (req, res) => {
  const { manager_name, target_type, line, task_count, completed_count, target_company, contact_manager, contact_info } = req.body;
  if (!manager_name || !target_type || !line) {
    return res.status(400).json({ error: "缺少必填字段" });
  }
  const sql = `INSERT INTO fusion_targets (manager_name, task_category, target_type, line, task_count, completed_count, target_company, contact_manager, contact_info, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "进行中")`;
  const params = [manager_name, target_type, target_type, line, task_count||0, completed_count||0, target_company||"", contact_manager||"", contact_info||""];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// 删除跟进记录
router.delete("/followup/:id", (req, res) => {
  db.run("DELETE FROM fusion_targets WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 新增目标
router.post("/targets", (req, res) => {
  const { manager_name, task_category, target_type, line, task_count, completed_count, target_company, follow_record } = req.body;
  if (!manager_name || !target_type || !line) {
    return res.status(400).json({ error: "缺少必填字段：manager_name, target_type, line" });
  }
  const sql = `INSERT INTO fusion_targets (manager_name, task_category, target_type, line, task_count, completed_count, target_company, follow_record, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, "进行中")`;
  const params = [manager_name, task_category||"", target_type, line, task_count||0, completed_count||0, target_company||"", follow_record||""];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// 更新目标
router.put("/targets/:id", (req, res) => {
  const { task_count, completed_count, target_company, follow_record, contact_manager, contact_info, status } = req.body;
  const sql = `UPDATE fusion_targets SET
    task_count=?, completed_count=?, target_company=?, follow_record=?, contact_manager=?, contact_info=?, status=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?`;
  const params = [task_count||0, completed_count||0, target_company||"", follow_record||"", contact_manager||"", contact_info||"", status||"进行中", req.params.id];
  db.run(sql, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 删除目标
router.delete("/targets/:id", (req, res) => {
  db.run("DELETE FROM fusion_targets WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 删除客户经理全部目标
router.delete("/manager/:name/:targetType/:line", (req, res) => {
  const { name, targetType, line } = req.params;
  db.run("DELETE FROM fusion_targets WHERE manager_name = ? AND target_type = ? AND line = ?", [name, targetType, line], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
const express = require("express");
const router = express.Router();
const { db } = require("../database");

// ========== 接触记录 CRUD ==========

// 获取某个目标的接触记录列表
router.get("/target/:targetId/logs", (req, res) => {
  const sql = `SELECT * FROM contact_log WHERE target_id = ? ORDER BY contact_time DESC`;
  db.all(sql, [req.params.targetId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 新增接触记录
router.post("/logs", (req, res) => {
  const { target_id, contact_time, contact_method, contact_content, next_followup_time, created_by } = req.body;
  if (!target_id || !contact_time || !contact_method) {
    return res.status(400).json({ error: "缺少必填字段：target_id, contact_time, contact_method" });
  }
  if (!contact_content) {
    return res.status(400).json({ error: "沟通内容不能为空" });
  }

  const sql = `INSERT INTO contact_log (target_id, contact_time, contact_method, contact_content, next_followup_time, created_by)
    VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [target_id, contact_time, contact_method, contact_content, next_followup_time || null, created_by || ""];
  
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // 同时更新 fusion_targets 的 last_contact_time 和 last_contact_method
    const updateSql = `UPDATE fusion_targets SET 
      last_contact_time = ?, last_contact_method = ?, current_stage = '跟进中', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`;
    db.run(updateSql, [contact_time, contact_method, target_id], (err2) => {
      if (err2) console.error("更新last_contact失败:", err2);
    });
    
    res.json({ success: true, id: this.lastID });
  });
});

// 更新接触记录
router.put("/logs/:id", (req, res) => {
  const { contact_time, contact_method, contact_content, next_followup_time } = req.body;
  const sql = `UPDATE contact_log SET 
    contact_time = ?, contact_method = ?, contact_content = ?, next_followup_time = ?
    WHERE id = ?`;
  const params = [contact_time, contact_method, contact_content || "", next_followup_time || null, req.params.id];
  db.run(sql, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 获取单条接触记录
router.get("/logs/:id", (req, res) => {
  db.get("SELECT * FROM contact_log WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "记录不存在" });
    res.json(row);
  });
});

// 删除接触记录
router.delete("/logs/:id", (req, res) => {
  // 先获取这条记录用于后续更新 fusion_targets
  db.get("SELECT target_id FROM contact_log WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "记录不存在" });
    
    db.run("DELETE FROM contact_log WHERE id = ?", [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      // 如果删除的是最新一条，需要更新 fusion_targets 的 last_contact 信息
      // 找到剩余记录中最新的一条
      db.get("SELECT contact_time, contact_method FROM contact_log WHERE target_id = ? ORDER BY contact_time DESC LIMIT 1",
        [row.target_id], (err3, latest) => {
          if (latest) {
            db.run("UPDATE fusion_targets SET last_contact_time = ?, last_contact_method = ? WHERE id = ?",
              [latest.contact_time, latest.contact_method, row.target_id]);
          }
          res.json({ success: true });
        });
    });
  });
});

module.exports = router;
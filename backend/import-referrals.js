const db = require('./database');

const records = [
  { date: '2026-04-22', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '陈喆', customer: '私募投资人赵总', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-04-21', from_dept: '公司条线', from_person: '徐嘉蔚', to_dept: '市拓条线', to_person: '谢文强', customer: '奥斯特电气', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-04-16', from_dept: '公司条线', from_person: '张祥霖', to_dept: '市拓条线', to_person: '谢文强', customer: '深圳市恒之易电子商务有限公司', status: '已落地', amount: 0, points: 1 },
  { date: '2026-04-13', from_dept: '公司条线', from_person: '张祥霖', to_dept: '理财条线', to_person: '魏小栋', customer: '维力谷吕总金葵花', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-04-13', from_dept: '理财条线', from_person: '魏小栋', to_dept: '公司条线', to_person: '张祥霖', customer: '深圳市振成建筑工程有限公司', status: '已落地', amount: 0, points: 1 },
  { date: '2026-04-08', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '林玉婵', customer: '倍贺科技', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-04-07', from_dept: '理财条线', from_person: '魏小栋', to_dept: '公司条线', to_person: '吴逸辉', customer: '翱鹰航空', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-04-01', from_dept: '理财条线', from_person: '明行', to_dept: '公司条线', to_person: '吴逸辉', customer: '德龙包装', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-04-01', from_dept: '理财条线', from_person: '魏小栋', to_dept: '公司条线', to_person: '吴逸辉', customer: '富友鹏投资集团', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-31', from_dept: '市拓条线', from_person: '谢文强', to_dept: '理财条线', to_person: '程方正', customer: '陈燕君保险', status: '已落地', amount: 0, points: 1 },
  { date: '2026-03-31', from_dept: '公司条线', from_person: '冯志翔', to_dept: '理财条线', to_person: '程方正', customer: '陈燕君保险', status: '已落地', amount: 0, points: 1 },
  { date: '2026-03-26', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '李紫茹', customer: '深圳收租大户', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-25', from_dept: '理财条线', from_person: '程方正', to_dept: '公司条线', to_person: '冯志翔', customer: '深圳华住酒店客户', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-23', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '林玉婵', customer: '深圳索斯特照明有限公司', status: '已落地', amount: 0, points: 1 },
  { date: '2026-03-21', from_dept: '市拓条线', from_person: '谢文强', to_dept: '公司条线', to_person: '廖灵通', customer: '深圳市吉昌盛电路技术有限公司', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-20', from_dept: '市拓条线', from_person: '谢文强', to_dept: '公司条线', to_person: '徐嘉蔚', customer: '深圳思远国际货运代理有限公司', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-20', from_dept: '市拓条线', from_person: '鄢奥成', to_dept: '市拓条线', to_person: '谢文强', customer: '深圳市芯睿视科技有限公司', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-18', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '吴逸辉', customer: '高质量线索刘总', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-12', from_dept: '市拓条线', from_person: '谢文强', to_dept: '公司条线', to_person: '张祥霖', customer: '华安芯（深圳）科技有限公司', status: '已落地', amount: 0, points: 1 },
  { date: '2026-03-10', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '林玉婵', customer: '深圳市新鑶网络技术有限公司', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-04', from_dept: '市拓条线', from_person: '谢文强', to_dept: '公司条线', to_person: '张祥霖', customer: '深圳市杰思瑞科技有限公司', status: '已落地', amount: 0, points: 1 },
  { date: '2026-03-03', from_dept: '公司条线', from_person: '张祥霖', to_dept: '理财条线', to_person: '魏小栋', customer: '一户金葵花', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-03-02', from_dept: '市拓条线', from_person: '谢文强', to_dept: '公司条线', to_person: '张祥霖', customer: '深圳市至鑫海科技开发有限公司', status: '已落地', amount: 0, points: 1 },
  { date: '2026-02-26', from_dept: '市拓条线', from_person: '谢文强', to_dept: '市拓条线', to_person: '林玉婵', customer: '深圳市福瑞诺科技有限公司', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-02-25', from_dept: '市拓条线', from_person: '谢文强', to_dept: '公司条线', to_person: '林玉婵', customer: '深圳市鑫梓润股份有限公司', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-02-05', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '李紫茹', customer: '合肥磐芯电子有限公司', status: '无效', amount: 0, points: 0 },
  { date: '2026-01-30', from_dept: '理财条线', from_person: '王菲菲', to_dept: '公司条线', to_person: '李紫茹', customer: '医承教育', status: '已落地', amount: 0, points: 1 },
  { date: '2026-01-30', from_dept: '理财条线', from_person: '程方正', to_dept: '公司条线', to_person: '李紫茹', customer: '科创企业鸿瑞德', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-01-27', from_dept: '理财条线', from_person: '王菲菲', to_dept: '公司条线', to_person: '李紫茹', customer: '欣睿电子', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-01-26', from_dept: '市拓条线', from_person: '谢文强', to_dept: '公司条线', to_person: '李紫茹', customer: '政采贷、招捷贷目标客户绿清生活', status: '无效', amount: 0, points: 0 },
  { date: '2026-01-26', from_dept: '公司条线', from_person: '冯志翔', to_dept: '理财条线', to_person: '武孝龙', customer: '公司客户了解境外美元理财', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-01-23', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '李紫茹', customer: '优质企业智迅加科技', status: '已落地', amount: 0, points: 1 },
  { date: '2026-01-23', from_dept: '公司条线', from_person: '马芷晴', to_dept: '理财条线', to_person: '程方正', customer: '陈总升级金葵花卡', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-01-23', from_dept: '公司条线', from_person: '吴逸辉', to_dept: '理财条线', to_person: '杨思娴', customer: '宝石角老板尹总金葵花转归属', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-01-20', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '李紫茹', customer: '方亭供应链', status: '已落地', amount: 0, points: 1 },
  { date: '2026-01-15', from_dept: '理财条线', from_person: '武孝龙', to_dept: '公司条线', to_person: '张祥霖', customer: '搏凯电子', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-01-14', from_dept: '公司条线', from_person: '林玉婵', to_dept: '理财条线', to_person: '武孝龙', customer: '优质夫妻客户今天开立金葵花卡', status: '跟进中', amount: 0, points: 0 },
  { date: '2026-01-12', from_dept: '理财条线', from_person: '程方正', to_dept: '公司条线', to_person: '冯志翔', customer: '优质华住集团渠道', status: '跟进中', amount: 0, points: 0 },
];

function statusMap(s) {
  const map = { '跟进中': 'pending', '已落地': 'completed', '无效': 'invalid' };
  return map[s] || 'pending';
}

db.serialize(() => {
  let inserted = 0;
  let skipped = 0;

  const stmt = db.prepare(`
    INSERT INTO referrals (referral_date, from_department, from_person, to_department, to_person, customer_name, business_status, amount, points_rule, final_points, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'standard', ?, '')
  `);

  const checkStmt = db.prepare(`
    SELECT id FROM referrals WHERE referral_date = ? AND from_person = ? AND customer_name = ?
  `);

  for (const r of records) {
    const existing = checkStmt.get([r.date, r.from_person, r.customer]);
    if (existing) {
      skipped++;
      continue;
    }
    stmt.run([r.date, r.from_dept, r.from_person, r.to_dept, r.to_person, r.customer, statusMap(r.status), r.amount, r.points]);
    inserted++;
  }

  stmt.finalize();
  checkStmt.finalize();

  console.log(`✅ 导入完成：新增 ${inserted} 条，跳过重复 ${skipped} 条`);
  process.exit(0);
});

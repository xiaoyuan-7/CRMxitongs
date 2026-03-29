// 企业尽调字段迁移脚本
// 运行：node migrate-dd-fields.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'crm.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('✅ 已连接到数据库');
});

// 需要添加的字段
const fields = [
  // 基本信息
  { name: 'main_product', type: 'TEXT', comment: '主营产品' },
  { name: 'top5_customers', type: 'TEXT', comment: '前五大下游客户' },
  { name: 'revenue_range', type: 'TEXT', comment: '营收范围' },
  { name: 'net_profit', type: 'INTEGER', comment: '净利润状态' },
  { name: 'vat_tax', type: 'TEXT', comment: '增值税纳税额' },
  { name: 'income_tax', type: 'TEXT', comment: '所得税纳税额' },
  
  // 结算模式
  { name: 'domestic_settlement', type: 'TEXT', comment: '境内业务结算' },
  { name: 'cross_border', type: 'TEXT', comment: '跨境业务' },
  
  // 合作银行
  { name: 'main_banks', type: 'TEXT', comment: '主要合作银行' },
  
  // 零售业务
  { name: 'personal_cards', type: 'TEXT', comment: '个人持卡情况' },
  { name: 'asset_status', type: 'TEXT', comment: '资产情况' },
  { name: 'family_status', type: 'TEXT', comment: '家庭情况' },
  
  // 资本市场
  { name: 'venture_status', type: 'TEXT', comment: '风投情况' },
  { name: 'executive_stock', type: 'INTEGER', comment: '高管持股' },
  { name: 'listing_plan', type: 'TEXT', comment: '上市计划' }
];

console.log('\n📋 开始添加企业尽调字段...\n');

let completed = 0;
const total = fields.length;

fields.forEach(field => {
  const sql = `ALTER TABLE companies ADD COLUMN ${field.name} ${field.type}`;
  
  db.run(sql, function(err) {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log(`⚠️  字段 ${field.name} 已存在，跳过`);
      } else {
        console.error(`❌ 添加字段 ${field.name} 失败:`, err.message);
      }
    } else {
      console.log(`✅ 添加字段 ${field.name} (${field.comment})`);
    }
    
    completed++;
    if (completed === total) {
      console.log(`\n🎉 迁移完成！共添加 ${total} 个字段`);
      db.close();
    }
  });
});

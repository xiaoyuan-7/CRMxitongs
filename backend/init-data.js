const db = require('./database');
const bcrypt = require('bcryptjs');

// 初始化测试数据
function initTestData() {
  // 创建默认管理员账户
  
  const defaultAdmin = {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  };

  bcrypt.hash(defaultAdmin.password, 10, (err, hash) => {
    if (err) {
      console.error('密码加密失败:', err);
      return;
    }

    db.run(
      'INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [defaultAdmin.username, hash, defaultAdmin.role],
      (err) => {
        if (err) {
          console.error('创建管理员失败:', err);
        } else {
          console.log('✅ 默认管理员账户已创建');
          console.log('   用户名：admin');
          console.log('   密码：admin123');
        }
      }
    );
  });

  // 创建示例企业数据
  const sampleCompanies = [
    {
      name: '科技有限公司',
      introduction: '专注于软件开发和信息技术服务',
      industry: '信息技术',
      financial_info: '年营业额约 5000 万',
      upstream_info: '硬件供应商、云服务商',
      downstream_info: '各类企业客户',
      is_account_opened: 1,
      is_payroll_service: 1,
      is_active_customer: 1,
      is_high_quality: 1,
      progress_status: '已签约'
    },
    {
      name: '贸易公司',
      introduction: '进出口贸易业务',
      industry: '贸易',
      financial_info: '年营业额约 3000 万',
      upstream_info: '海外供应商',
      downstream_info: '国内零售商',
      is_account_opened: 1,
      is_payroll_service: 0,
      is_active_customer: 1,
      is_high_quality: 0,
      progress_status: '已签约'
    },
    {
      name: '制造企业',
      introduction: '精密零部件制造',
      industry: '制造业',
      financial_info: '年营业额约 8000 万',
      upstream_info: '原材料供应商',
      downstream_info: '汽车厂商、机械设备商',
      is_account_opened: 0,
      is_payroll_service: 0,
      is_active_customer: 0,
      is_high_quality: 1,
      progress_status: '谈判中'
    },
    {
      name: '咨询服务公司',
      introduction: '企业管理咨询服务',
      industry: '服务业',
      financial_info: '年营业额约 2000 万',
      upstream_info: '专家顾问',
      downstream_info: '中小企业',
      is_account_opened: 1,
      is_payroll_service: 1,
      is_active_customer: 0,
      is_high_quality: 0,
      progress_status: '已签约'
    },
    {
      name: '零售连锁',
      introduction: '连锁超市运营',
      industry: '零售业',
      financial_info: '年营业额约 1.5 亿',
      upstream_info: '各类商品供应商',
      downstream_info: '个人消费者',
      is_account_opened: 0,
      is_payroll_service: 0,
      is_active_customer: 0,
      is_high_quality: 1,
      progress_status: '方案报价'
    }
  ];

  sampleCompanies.forEach((company, index) => {
    db.run(
      `INSERT OR IGNORE INTO companies (name, introduction, industry, financial_info, upstream_info, downstream_info,
        is_account_opened, is_payroll_service, is_active_customer, is_high_quality, progress_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company.name, company.introduction, company.industry, company.financial_info,
        company.upstream_info, company.downstream_info,
        company.is_account_opened, company.is_payroll_service, company.is_active_customer,
        company.is_high_quality, company.progress_status
      ],
      function(err) {
        if (!err && this.changes > 0) {
          const companyId = this.lastID;
          console.log(`✅ 示例企业已创建：${company.name}`);

          // 为每个企业创建示例关键人
          const sampleContacts = [
            {
              name: `张${index + 1}总`,
              position: '总经理',
              birth_date: `1975-0${index + 1}-15`,
              family_info: '已婚，有一子',
              preferences: '喜欢喝茶、高尔夫',
              gift_recommendations: '高档茶叶、高尔夫用品',
              is_primary: index === 0 ? 1 : 0
            },
            {
              name: `李${index + 1}经理`,
              position: '财务经理',
              birth_date: `1985-0${index + 2}-20`,
              family_info: '未婚',
              preferences: '喜欢读书、旅游',
              gift_recommendations: '书籍、旅行券',
              is_primary: 0
            }
          ];

          sampleContacts.forEach(contact => {
            db.run(
              `INSERT INTO contacts (company_id, name, position, birth_date, family_info, preferences, gift_recommendations, is_primary)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                companyId, contact.name, contact.position, contact.birth_date,
                contact.family_info, contact.preferences, contact.gift_recommendations, contact.is_primary
              ],
              (err) => {
                if (!err) {
                  console.log(`   ✅ 关键人已创建：${contact.name}`);
                }
              }
            );
          });
        }
      }
    );
  });

  setTimeout(() => {
    console.log('\n📊 示例数据初始化完成！');
    console.log('\n🚀 启动系统：');
    console.log('   cd /root/.openclaw/workspace/crm-system');
    console.log('   ./start.sh');
    console.log('\n或直接启动：');
    console.log('   后端：cd backend && npm start');
    console.log('   前端：cd frontend && npm start');
    process.exit(0);
  }, 2000);
}

initTestData();

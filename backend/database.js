// backend/database.js
// CRM 系统 - 增强版数据库配置（带断电保护 + 本地化部署优化）

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'crm.db');
const backupDir = path.join(__dirname, 'data', 'backups');
const walPath = path.join(__dirname, 'crm.db-wal');
const shmPath = path.join(__dirname, 'crm.db-shm');

// 确保目录存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('✅ 创建备份目录:', backupDir);
}

const db = new sqlite3.Database(dbPath);

// ========== 断电保护配置 ==========

db.run('PRAGMA journal_mode = WAL', (err) => {
  if (err) console.error('WAL 模式设置失败:', err);
  else console.log('✅ WAL 模式已开启（断电保护）');
});

db.run('PRAGMA synchronous = FULL', (err) => {
  if (err) console.error('同步模式设置失败:', err);
  else console.log('✅ 同步模式：FULL（强制刷新磁盘）');
});

db.run('PRAGMA cache_size = -64000'); // 64MB 缓存
db.run('PRAGMA temp_store = MEMORY'); // 临时表存内存
db.run('PRAGMA wal_autocheckpoint = 1000'); // 每 1000 页自动检查点

// ========== 自动备份功能 ==========

function createBackup() {
  const timestamp = Date.now();
  const backupPath = path.join(backupDir, `backup_${timestamp}.db`);
  
  return new Promise((resolve, reject) => {
    const backup = db.backup(backupPath, (ret, totalPages, remainingPages, ok, failMsg) => {
      if (ret !== sqlite3.OK) {
        reject(new Error(failMsg || '备份失败'));
      } else {
        resolve(backupPath);
        console.log(`✅ 自动备份完成：${backupPath}`);
        cleanupOldBackups();
      }
    });
  });
}

function cleanupOldBackups() {
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_'))
    .sort()
    .reverse();
  
  // 保留最近 10 个备份
  backups.slice(10).forEach(f => {
    const backupPath = path.join(backupDir, f);
    fs.unlinkSync(backupPath);
    console.log(`🗑️ 清理旧备份：${f}`);
  });
}

// 每日定时备份（凌晨 2 点）
function scheduleDailyBackup() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  
  const msUntilBackup = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    createBackup().catch(console.error);
    // 之后每天重复
    setInterval(() => {
      createBackup().catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }, msUntilBackup);
  
  console.log('✅ 已设置每日凌晨 2 点自动备份');
}

// ========== 数据库完整性检查 ==========

function checkIntegrity() {
  return new Promise((resolve, reject) => {
    db.get('PRAGMA integrity_check', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.integrity_check !== 'ok') {
        const error = new Error(`数据库损坏：${row.integrity_check}`);
        error.code = 'DATABASE_CORRUPT';
        reject(error);
      } else {
        resolve(true);
      }
    });
  });
}

// ========== 自动恢复功能 ==========

async function restoreFromLatestBackup() {
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_'))
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    throw new Error('没有可用备份');
  }
  
  const latestBackup = path.join(backupDir, backups[0]);
  const dbDir = path.dirname(dbPath);
  const corruptPath = path.join(dbDir, 'crm_corrupt.db');
  
  console.log(`正在从备份恢复：${latestBackup}`);
  
  // 重命名损坏的数据库
  if (fs.existsSync(dbPath)) {
    fs.renameSync(dbPath, corruptPath);
  }
  
  // 复制备份
  fs.copyFileSync(latestBackup, dbPath);
  
  console.log('✅ 数据库恢复完成');
  return true;
}

// ========== 启动时自动检查 ==========

async function initializeDatabase() {
  try {
    await checkIntegrity();
    console.log('✅ 数据库完整性检查通过');
  } catch (error) {
    if (error.code === 'DATABASE_CORRUPT') {
      console.warn('⚠️ 数据库损坏，尝试从备份恢复...');
      try {
        await restoreFromLatestBackup();
        console.log('✅ 数据库恢复成功');
      } catch (restoreError) {
        console.error('❌ 恢复失败:', restoreError.message);
        throw restoreError;
      }
    } else {
      throw error;
    }
  }
}

// ========== 初始化数据库表 ==========

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 企业表
      db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          introduction TEXT,
          industry TEXT,
          financial_info TEXT,
          upstream_info TEXT,
          downstream_info TEXT,
          is_account_opened INTEGER DEFAULT 0,
          is_payroll_service INTEGER DEFAULT 0,
          is_active_customer INTEGER DEFAULT 0,
          is_high_quality INTEGER DEFAULT 0,
          progress_status TEXT DEFAULT '初步接触',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 关键人表
      db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          position TEXT,
          birth_date DATE,
          family_info TEXT,
          preferences TEXT,
          gift_recommendations TEXT,
          is_primary INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
      `);

      // 营销进度表
      db.run(`
        CREATE TABLE IF NOT EXISTS marketing_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          contact_id INTEGER,
          follow_up_date DATETIME NOT NULL,
          follow_up_type TEXT,
          follow_up_content TEXT,
          next_follow_up_date DATETIME,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        )
      `);

      // 提醒表
      db.run(`
        CREATE TABLE IF NOT EXISTS reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          contact_id INTEGER,
          company_id INTEGER,
          reminder_type TEXT NOT NULL,
          reminder_date DATE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          is_completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
      `);

      // 跟进记录表
      db.run(`
        CREATE TABLE IF NOT EXISTS follow_ups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          follow_date DATE NOT NULL,
          follow_time TEXT DEFAULT '上午',
          follow_type TEXT DEFAULT '电话',
          follow_content TEXT NOT NULL,
          next_follow_date DATE,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
      `);

      // 营销任务表
      db.run(`
        CREATE TABLE IF NOT EXISTS marketing_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          target_valid_customers INTEGER DEFAULT 0,
          target_high_quality INTEGER DEFAULT 0,
          completed_valid_customers INTEGER DEFAULT 0,
          completed_high_quality INTEGER DEFAULT 0,
          month TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 每周计划表
      db.run(`
        CREATE TABLE IF NOT EXISTS week_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          company_id INTEGER NOT NULL,
          plan_date DATE NOT NULL,
          plan_content TEXT NOT NULL,
          is_completed INTEGER DEFAULT 0,
          completed_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
      `);

      // 信福通表
      db.run(`
        CREATE TABLE IF NOT EXISTS xinfutong (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          loan_amount REAL,
          loan_term INTEGER,
          interest_rate REAL,
          status TEXT DEFAULT '申请中',
          apply_date DATETIME,
          approve_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
      `);

      // 潜在线索表
      db.run(`
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_name TEXT NOT NULL,
          contact_name TEXT,
          contact_phone TEXT,
          source TEXT,
          status TEXT DEFAULT '待跟进',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 推荐人表
      db.run(`
        CREATE TABLE IF NOT EXISTS referrals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          referrer_name TEXT NOT NULL,
          referrer_phone TEXT,
          referrer_company TEXT,
          referred_company_name TEXT NOT NULL,
          referred_contact_name TEXT,
          referred_contact_phone TEXT,
          status TEXT DEFAULT '待联系',
          reward_status TEXT DEFAULT '未发放',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_marketing_company ON marketing_progress(company_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_reminders_contact ON reminders(contact_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_follow_ups_company ON follow_ups(company_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_week_tasks_company ON week_tasks(company_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_xinfutong_company ON xinfutong(company_id)`);

      console.log('✅ 数据库表初始化完成');
      resolve();
    });
  });
}

// ========== 导出 ==========

module.exports = {
  // 原始 sqlite3 数据库对象（支持回调方式）
  db,
  
  // 直接导出原始方法，供路由文件使用回调方式
  run: db.run.bind(db),
  get: db.get.bind(db),
  all: db.all.bind(db),
  
  // Promise 版本（供新代码使用）
  runAsync: (sql, params) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  
  getAsync: (sql, params) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  allAsync: (sql, params) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  // 其他功能
  createBackup,
  checkIntegrity,
  restoreFromLatestBackup,
  initializeDatabase,
  initDatabase,
  scheduleDailyBackup
};

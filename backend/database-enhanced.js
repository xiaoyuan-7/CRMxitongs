// backend/database.js
// CRM 系统 - 增强版数据库配置（带断电保护）

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm.db');
const backupDir = path.join(__dirname, 'data', 'backups');

// 确保目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// ========== 断电保护配置 ==========

// 1. WAL 模式 - 写前日志，断电可恢复
db.run('PRAGMA journal_mode = WAL', (err) => {
  if (err) console.error('WAL 模式设置失败:', err);
  else console.log('✅ WAL 模式已开启');
});

// 2. FULL 同步 - 每次写入都强制刷新到磁盘
db.run('PRAGMA synchronous = FULL', (err) => {
  if (err) console.error('同步模式设置失败:', err);
  else console.log('✅ 同步模式：FULL');
});

// 3. 缓存配置 - 64MB
db.run('PRAGMA cache_size = -64000', (err) => {
  if (err) console.error('缓存设置失败:', err);
});

// 4. 临时表存内存
db.run('PRAGMA temp_store = MEMORY');

// 5. 自动检查点 - 每 1000 页
db.run('PRAGMA wal_autocheckpoint = 1000');

// ========== 自动备份功能 ==========

function createBackup() {
  const timestamp = Date.now();
  const backupPath = path.join(backupDir, `backup_${timestamp}.db`);
  
  return new Promise((resolve, reject) => {
    // 使用 sqlite3 的 backup API
    const backup = db.backup(backupPath, (ret, totalPages, remainingPages, ok, failMsg) => {
      if (ret !== sqlite3.OK) {
        reject(new Error(failMsg || '备份失败'));
      } else {
        resolve(backupPath);
        console.log(`✅ 自动备份完成：${backupPath}`);
        
        // 清理旧备份（保留最近 10 个）
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
  
  // 删除超过 10 个的备份
  backups.slice(10).forEach(f => {
    const backupPath = path.join(backupDir, f);
    fs.unlinkSync(backupPath);
    console.log(`🗑️ 清理旧备份：${f}`);
  });
}

// 每次写入前自动备份（可选，根据性能需求开关）
const AUTO_BACKUP_BEFORE_WRITE = false; // 默认关闭，需要时开启

function safeWrite(operation) {
  if (!AUTO_BACKUP_BEFORE_WRITE) {
    return operation();
  }
  
  return createBackup().then(() => operation());
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
  const tempPath = path.join(dbDir, 'crm_corrupt.db');
  
  console.log(`正在从备份恢复：${latestBackup}`);
  
  // 重命名损坏的数据库
  if (fs.existsSync(dbPath)) {
    fs.renameSync(dbPath, tempPath);
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
        console.error('请手动检查备份目录:', backupDir);
        throw restoreError;
      }
    } else {
      throw error;
    }
  }
}

// ========== 导出 ==========

module.exports = {
  db,
  safeWrite,
  createBackup,
  checkIntegrity,
  restoreFromLatestBackup,
  initializeDatabase,
  
  // 便捷方法
  run: (sql, params) => {
    return safeWrite(() => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    });
  },
  
  get: (sql, params) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  all: (sql, params) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  close: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 安全头中间件
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// 静态文件服务（简化版前端）
app.use(express.static(path.join(__dirname, '../frontend-simple')));

// 导入路由
const companyRoutes = require('./routes/companies');
const contactRoutes = require('./routes/contacts');
const marketingRoutes = require('./routes/marketing');
const reminderRoutes = require('./routes/reminders');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/marketing-tasks');
const weekTaskRoutes = require('./routes/week-tasks');
const xinfutongRoutes = require('./routes/xinfutong');
const followUpRoutes = require('./routes/follow-ups');

// API 路由
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/marketing-tasks', taskRoutes);
app.use('/api/week-tasks', weekTaskRoutes);
app.use('/api/xinfutong', xinfutongRoutes);
app.use('/api/leads', require('./routes/leads'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/follow-ups', followUpRoutes);

// 健康检查（包含数据库状态）
app.get('/api/health', async (req, res) => {
  const { db, checkIntegrity } = require('./database');
  
  try {
    await checkIntegrity();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'healthy',
      uptime: process.uptime()
    });
  } catch (error) {
    res.json({ 
      status: 'degraded', 
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error.message
    });
  }
});

// 备份接口（手动触发）
app.post('/api/backup', async (req, res) => {
  try {
    const { createBackup } = require('./database');
    const backupPath = await createBackup();
    res.json({ 
      success: true, 
      message: '备份成功',
      path: backupPath 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 前端路由（SPA 支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-simple/index.html'));
});

// 错误处理
const { logError } = require('./utils/logger');
app.use((err, req, res, next) => {
  logError(err, {
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  res.status(500).json({ error: '服务器内部错误' });
});

// 优雅关闭处理
let server;

function gracefulShutdown(signal) {
  console.log(`\n收到${signal}信号，正在优雅关闭服务器...`);
  
  if (server) {
    server.close(async () => {
      console.log('HTTP 服务器已关闭');
      
      try {
        const { db, createBackup } = require('./database');
        console.log('正在关闭前备份数据库...');
        await createBackup();
        console.log('✅ 关闭前备份完成');
        
        await new Promise((resolve) => {
          db.close((err) => {
            if (err) console.error('数据库关闭错误:', err);
            else console.log('✅ 数据库已关闭');
            resolve();
          });
        });
      } catch (error) {
        console.error('关闭时出错:', error);
      }
      
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
async function startServer() {
  const { initializeDatabase, initDatabase, scheduleDailyBackup } = require('./database');
  
  try {
    // 初始化数据库
    await initDatabase();
    console.log('✅ 数据库初始化完成');
    
    // 检查数据库完整性
    await initializeDatabase();
    
    // 启动每日自动备份
    scheduleDailyBackup();
    
    // 启动 HTTP 服务器
    server = app.listen(PORT, HOST, () => {
      console.log('\n========================================');
      console.log('  CRM 系统已启动');
      console.log('========================================');
      console.log(`  本地访问：http://localhost:${PORT}`);
      console.log(`  局域网访问：http://<服务器 IP>:${PORT}`);
      console.log(`  API 端点：http://localhost:${PORT}/api`);
      console.log('========================================\n');
      console.log('提示：');
      console.log('  - 按 Ctrl+C 停止服务（会自动备份）');
      console.log('  - 每日凌晨 2 点自动备份数据库');
      console.log('  - 数据库已开启 WAL 断电保护模式');
      console.log('========================================\n');
    });
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;

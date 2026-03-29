// 简单日志工具
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/error.log');

// 确保日志目录存在
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function logError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({
    timestamp,
    error: error.message,
    stack: error.stack,
    context
  }) + '\n';
  
  fs.appendFileSync(logFile, logEntry);
  console.error(`[${timestamp}] ${error.message}`);
}

module.exports = { logError };

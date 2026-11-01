// 轻量静态文件服务器（无依赖），服务于 industry-research/web
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = process.argv[2] || '/home/admin/industry-research/web';
const PORT = parseInt(process.argv[3] || '8000', 10);

// ===== 目录白名单 =====
// 审计发现（2026-11-01）：ROOT 被指向整个项目根 /home/admin/industry-research，
// 导致 .gitignore 排除的数据目录（workbench/data/ 168M、名单/ 131M）也一起被公网暴露，
// 可直接下载 27,746 个真实手机号、20,945 个邮箱。
// 现在只放行工作台真正需要的两个目录，其余一律 403。
const ALLOWED_PREFIXES = ['web/', 'workbench/'];

// 黑名单：workbench/data/ 下的 .js 是旧版 window.X = {...} 全量数据副本（约 69MB），
// 工作台实际读取的是同名 .json，因此屏蔽 .js 不影响功能。
const BLOCKED_SUFFIXES = [];
function isBlocked(relPath) {
  if (/^workbench\/data\/.*\.js$/i.test(relPath)) return true;
  return BLOCKED_SUFFIXES.some((s) => relPath.toLowerCase().endsWith(s));
}

function isAllowed(relPath) {
  return ALLOWED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip'
};

http.createServer((req, res) => {
  let p = decodeURIComponent(url.parse(req.url).pathname);
  if (p === '/') p = '/index.html';

  // 相对 ROOT 的路径（用于白名单判定）
  let rel = path.normalize(p).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');

  // 目录白名单
  if (!isAllowed(rel)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 forbidden\n');
    return;
  }
  // 黑名单
  if (isBlocked(rel)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 forbidden\n');
    return;
  }

  const filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(path.resolve(ROOT))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 forbidden\n');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      const idx = path.join(filePath, 'index.html');
      if (fs.existsSync(idx)) {
        serveFile(idx, res);
        return;
      }
    }
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 not found: ' + p + '\n');
      return;
    }
    serveFile(filePath, res);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('static server on 127.0.0.1:' + PORT + ' root=' + ROOT);
});

function serveFile(filePath, res) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 not found\n');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

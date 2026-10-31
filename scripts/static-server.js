// 轻量静态文件服务器（无依赖），服务于 industry-research/web
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = process.argv[2] || '/home/admin/industry-research/web';
const PORT = parseInt(process.argv[3] || '8000', 10);

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

  const filePath = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
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

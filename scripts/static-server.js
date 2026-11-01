// 轻量静态文件服务器（无依赖），服务于 industry-research/web
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = process.argv[2] || '/home/admin/industry-research/web';
const PORT = parseInt(process.argv[3] || '8000', 10);

// ===== gzip 预压缩缓存 =====
// 审计发现（2026-11-01）：服务器只有 2 核，实时 gzip 在并发请求下抢 CPU
// （实测单文件 43ms，11 并发时 160KB 文件花了 11.9 秒 = 13KB/s）。
// 因此用 scripts/precompress.sh 预先压好存盘，运行时零 CPU 消耗。
// 实测收益：workbench 首屏 67.84MB → 约 10MB，28 秒 → 约 6 秒。
const GZ_CACHE = process.env.GZ_CACHE_DIR || '/home/admin/.openclaw/workspace/.gzcache';

// 可压缩的类型：其余（图片/字体/已压缩格式）压了也没意义
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.md', '.csv', '.svg', '.txt', '.xml']);

function acceptsGzip(req) {
  const ae = req.headers['accept-encoding'];
  if (!ae) return false;
  return /\bgzip\b/i.test(ae) && !/\bgzip\s*;\s*q=0(?:\.0+)?\b/i.test(ae);
}

// brotli：公网带宽窄（Cloudflare 隧道到国内手机端 ~80KB/s），
// 预压缩的 .br 比 .gz 小约 25%，手机端首屏能省十几秒。
// 只在缓存命中时使用，避免实时 brotli 抢 2 核 CPU（那是 2026-11-01 踩过的坑）。
function acceptsBrotli(req) {
  const ae = req.headers['accept-encoding'];
  if (!ae) return false;
  return /\bbr\b/i.test(ae) && !/\bbr\s*;\s*q=0(?:\.0+)?\b/i.test(ae);
}

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
        serveFile(idx, res, req);
        return;
      }
    }
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 not found: ' + p + '\n');
      return;
    }
    serveFile(filePath, res, req);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('static server on 127.0.0.1:' + PORT + ' root=' + ROOT);
});

function serveFile(filePath, res, req) {
  const t0 = Date.now();
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 not found\n');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();

    // --- brotli / gzip：优先用预压缩缓存，避免实时压缩抢 CPU ---
    // 优先 gz，其次 br。
    // 注意：Cloudflare 边缘会把上游的 br 解开再重新压成 gzip 发给客户端，
    // 实测公网拿到的仍是 2.19MB（= gz 大小），所以对同时支持 br/gzip 的浏览器
    // 优先给 gz，让边缘直接透传，少一次解压+重压。
    let brPath = null;
    if (COMPRESSIBLE.has(ext) && acceptsBrotli(req) && !acceptsGzip(req)) {
      const rel = path.relative(ROOT, filePath);
      const cand = path.join(GZ_CACHE, rel + '.br');
      try {
        const brStat = fs.statSync(cand);
        if (brStat.isFile() && brStat.mtimeMs >= stat.mtimeMs) brPath = cand;
      } catch (e) { /* 没预压缩 → 走 gzip */ }
    }
    let gzPath = null;
    if (COMPRESSIBLE.has(ext) && acceptsGzip(req)) {
      const rel = path.relative(ROOT, filePath);
      const cand = path.join(GZ_CACHE, rel + '.gz');
      // 缓存必须比源文件新，否则用陈旧的压缩内容
      try {
        const gzStat = fs.statSync(cand);
        if (gzStat.isFile() && gzStat.mtimeMs >= stat.mtimeMs) {
          gzPath = cand;
        }
      } catch (e) { /* 没预压缩 → 走原文件 */ }
    }

    if (brPath) {
      let brStat;
      try { brStat = fs.statSync(brPath); } catch (e) { brStat = null; }
      if (brStat) {
        const etag = '"' + stat.size.toString(16) + '-' + stat.mtimeMs.toString(16) + '-br"';
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304, { 'ETag': etag, 'Vary': 'Accept-Encoding' });
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Content-Length': brStat.size,
          'Content-Encoding': 'br',
          'Vary': 'Accept-Encoding',
          'ETag': etag,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
        });
        const s = fs.createReadStream(brPath);
        s.on('end', () => {
          console.log('[serve] ' + path.relative(ROOT, filePath) +
            ' br=' + brStat.size + 'B  ' + (Date.now() - t0) + 'ms');
        });
        s.pipe(res);
        return;
      }
    }

    if (gzPath) {
      let gzStat;
      try { gzStat = fs.statSync(gzPath); } catch (e) { gzStat = null; }
      if (gzStat) {
        const etag = '"' + stat.size.toString(16) + '-' + stat.mtimeMs.toString(16) + '"';
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304, { 'ETag': etag, 'Vary': 'Accept-Encoding' });
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Content-Length': gzStat.size,
          'Content-Encoding': 'gzip',
          'Vary': 'Accept-Encoding',
          'ETag': etag,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
        });
        const s = fs.createReadStream(gzPath);
        let sent = 0;
        s.on('data', (d) => { sent += d.length; });
        s.on('end', () => {
          console.log('[serve] ' + path.relative(ROOT, filePath) +
            ' gz=' + gzStat.size + 'B  ' + (Date.now() - t0) + 'ms');
        });
        s.pipe(res);
        return;
      }
    }

    const etag = '"' + stat.size.toString(16) + '-' + stat.mtimeMs.toString(16) + '"';
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { 'ETag': etag });
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'ETag': etag,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

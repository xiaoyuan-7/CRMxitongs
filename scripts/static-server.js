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

// ===== 公司详情查询 API =====
//
// 背景（2026-11-01）：company_details.json 有 3.9MB（gzip）。
// 之前点开任意一家企业都要整包下载，公网 tunnel 带宽 ~80KB/s → 要等 50 秒。
// 分片并行没用（实测 6 并发拉同一文件共 149 秒，带宽被瓜分，总吞吐固定）。
//
// 方案：服务器侧常驻内存索引，按 code 精确返回一条（约 0.3KB）。
// 前端 loadCompanyDetails() 改为调这个接口；全量 JSON 保留作为离线兜底。
const DETAILS_FILE = path.join(ROOT, 'workbench/data/company_details.json');
let detailsIndex = null; // Map<code, {biz, desc, addr}>
let detailsIndexLoading = null;

function loadDetailsIndex() {
  if (detailsIndex) return Promise.resolve(detailsIndex);
  if (detailsIndexLoading) return detailsIndexLoading;
  detailsIndexLoading = new Promise((resolve, reject) => {
    fs.readFile(DETAILS_FILE, 'utf8', (err, txt) => {
      if (err) return reject(err);
      try {
        const obj = JSON.parse(txt);
        detailsIndex = new Map();
        for (const code of Object.keys(obj)) detailsIndex.set(code, obj[code]);
        console.log('[details] indexed ' + detailsIndex.size + ' companies');
        resolve(detailsIndex);
      } catch (e) { reject(e); }
    });
  });
  return detailsIndexLoading;
}

function serveCompanyDetail(code, res) {
  loadDetailsIndex().then((idx) => {
    const d = idx.get(code);
    if (!d) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end('{"error":"not found"}');
      return;
    }
    const body = Buffer.from(JSON.stringify(d), 'utf8');
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(body);
  }).catch((e) => {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: String(e.message || e) }));
  });
}

// ===== 公司搜索 API =====
//
// 背景：搜索需要匹配 name/legal/addr，其中 addr 在单独的 company_details.json 里。
// 前端拉全量详情（3.9MB）才能搜，公网要 50 秒。
// 改为服务端搜：索引已经在内存里，直接返回匹配的 code 列表（几十 KB）。
const SEARCH_LIMIT = 300;

function serveCompanySearch(q, res) {
  loadDetailsIndex().then((idx) => {
    const needle = q.toLowerCase();
    const codes = [];
    // 先在主表数据里搜 name/legal/ind
    for (const c of getCompaniesForSearch()) {
      if (matchesCompany(c, needle)) { codes.push(c.code); if (codes.length >= SEARCH_LIMIT) break; }
      if (codes.length >= SEARCH_LIMIT) break;
    }
    // 再补上只有 details 里才命中的（地址匹配）
    if (codes.length < SEARCH_LIMIT) {
      for (const [code, d] of idx) {
        if (codes.length >= SEARCH_LIMIT) break;
        if (codes.indexOf(code) >= 0) continue;
        const addr = String(d.addr || '').toLowerCase();
        if (addr && addr.indexOf(needle) >= 0) codes.push(code);
      }
    }
    const body = Buffer.from(JSON.stringify({ codes: codes, total: codes.length }), 'utf8');
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store'
    });
    res.end(body);
  }).catch((e) => {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: String(e.message || e) }));
  });
}

function matchesCompany(c, needle) {
  const fields = [c.name, c.legal, c.ind, c.trk, c.sub_track, c.code];
  for (const f of fields) {
    if (f && String(f).toLowerCase().indexOf(needle) >= 0) return true;
  }
  return false;
}

// ===== 公司库分页 API =====
//
// 背景（2026-11-01）：companies.json 22,765 家瘦身后 gzip 仍有 2.19MB，
// 公网 tunnel 带宽 ~80KB/s → 进公司库要等 30 秒。
// 但表格一页只显示 50 条（gzip 5.7KB）。
//
// 方案：服务端做筛选 + 排序 + 分页，只回传当前页。
// 前端筛选维度（track/sub/ind/custInd/supInd/dist/city/emp/scale/status/
// confidence/chain/q）全部搬到服务端，与前端 applyFilter 逻辑保持一致。
const PAGE_DEFAULT = 50;

function matchCompanyFilter(c, f, addrMap) {
  if (f.track && c.trk !== f.track) return false;
  if (f.sub && c.sub_track !== f.sub) return false;
  if (f.ind && c.ind !== f.ind) return false;
  if (f.custInd && !(c.customer_ind || []).some(i => i.name === f.custInd)) return false;
  if (f.supInd && !(c.supplier_ind || []).some(i => i.name === f.supInd)) return false;
  if (f.emp) {
    const e = c.emp;
    const range = f.emp;
    if (range === 'unknown' && e != null) return false;
    if (range !== 'unknown' && e == null) return false;
    if (range === '0' && e !== 0) return false;
    if (range === '1-10' && (e == null || e < 1 || e > 10)) return false;
    if (range === '11-50' && (e == null || e < 11 || e > 50)) return false;
    if (range === '51-200' && (e == null || e < 51 || e > 200)) return false;
    if (range === '201-500' && (e == null || e < 201 || e > 500)) return false;
    if (range === '501-1000' && (e == null || e < 501 || e > 1000)) return false;
    if (range === '1001+' && (e == null || e <= 1000)) return false;
  }
  if (f.dist && c.dist !== f.dist) return false;
  if (f.city && c.city !== f.city) return false;
  if (f.scale && c.scale !== f.scale) return false;
  if (f.status && c.status !== f.status) return false;
  if (f.confidence) {
    const conf = c.confidence || '';
    if (f.confidence === 'none' && c.trk) return false;
    if (f.confidence !== 'none' && conf !== f.confidence) return false;
  }
  if (f.chain === 'yes' && (!c.chain_role || c.chain_role.length === 0)) return false;
  if (f.chain === 'no' && c.chain_role && c.chain_role.length > 0) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const localHit =
      (c.name || '').toLowerCase().includes(q) ||
      (c.legal || '').toLowerCase().includes(q) ||
      (c.ind || '').toLowerCase().includes(q) ||
      (c.trk || '').toLowerCase().includes(q) ||
      (c.sub_track || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q);
    if (!localHit) {
      const d = addrMap ? addrMap.get(c.code) : null;
      const addr = d ? String(d.addr || '').toLowerCase() : '';
      if (!addr || addr.indexOf(q) < 0) return false;
    }
  }
  return true;
}

// 公司库表格/筛选用到的列（去掉 addr/biz/desc 等长文本，详情走 API）
const COMPANY_LIST_FIELDS = [
  'code', 'name', 'trk', 'sub', 'sub_track', 'ind', 'ind_zl', 'ind_xl',
  'city', 'dist', 'emp', 'confidence', 'status', 'scale', 'chain_role',
  'customer_ind', 'supplier_ind', 'rc', 'pc', 'legal', 'est',
  'phone', 'email', 'sci', 'pat', 'method', 'src', 'risk'
];

function serveCompanyPage(query, res) {
  const all = getCompaniesForSearch();

  // 按 code 精确查一条（拜访清单/一页通用）
  if (query.code) {
    const c = all.find(x => x.code === query.code);
    if (!c) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end('{"error":"not found"}');
      return;
    }
    const item = {};
    for (const k of COMPANY_LIST_FIELDS) if (c[k] !== undefined) item[k] = c[k];
    loadDetailsIndex().then((idx) => {
      const d = idx.get(c.code);
      if (d) {
        for (const k of Object.keys(d)) if (item[k] === undefined) item[k] = d[k];
      }
      const body = Buffer.from(JSON.stringify({ item: item }), 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'Cache-Control': 'public, max-age=600'
      });
      res.end(body);
    }).catch(() => {
      const body = Buffer.from(JSON.stringify({ item: item }), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length });
      res.end(body);
    });
    return;
  }

  const f = {
    track: query.track || '', sub: query.sub || '', ind: query.ind || '',
    custInd: query.custInd || '', supInd: query.supInd || '',
    dist: query.dist || '', city: query.city || '', emp: query.emp || '',
    scale: query.scale || '', status: query.status || '',
    confidence: query.confidence || '', chain: query.chain || '',
    q: query.q || ''
  };
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const perPage = Math.min(200, Math.max(10, parseInt(query.perPage || String(PAGE_DEFAULT), 10) || PAGE_DEFAULT));

  let list = all;
  if (f.q) {
    loadDetailsIndex().then((idx) => {
      const filtered = all.filter(c => matchCompanyFilter(c, f, idx));
      respondPage(filtered, page, perPage, res);
    }).catch(() => {
      const filtered = all.filter(c => matchCompanyFilter(c, f, null));
      respondPage(filtered, page, perPage, res);
    });
    return;
  }
  const filtered = all.filter(c => matchCompanyFilter(c, f, null));
  respondPage(filtered, page, perPage, res);
}

function respondPage(filtered, page, perPage, res) {
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const items = filtered.slice(start, start + perPage).map(c => {
    const o = {};
    for (const k of COMPANY_LIST_FIELDS) if (c[k] !== undefined) o[k] = c[k];
    return o;
  });
  const body = Buffer.from(JSON.stringify({ items: items, total: total, page: page, totalPages: totalPages }), 'utf8');
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

let companiesForSearch = null;
function getCompaniesForSearch() {
  if (companiesForSearch) return companiesForSearch;
  const f = path.join(ROOT, 'workbench/data/companies.json');
  try {
    companiesForSearch = JSON.parse(fs.readFileSync(f, 'utf8'));
    console.log('[search] indexed ' + companiesForSearch.length + ' companies');
  } catch (e) {
    companiesForSearch = [];
  }
  return companiesForSearch;
}

http.createServer((req, res) => {
  let p = decodeURIComponent(url.parse(req.url).pathname);
  if (p === '/') p = '/index.html';

  // 公司搜索 API：/workbench/api/search?q=xxx
  if (p === '/workbench/api/search') {
    const parsed = url.parse(req.url, true);
    serveCompanySearch(String(parsed.query.q || ''), res);
    return;
  }

  // 公司库分页 API：/workbench/api/companies?track=...&page=1
  if (p === '/workbench/api/companies') {
    const parsed = url.parse(req.url, true);
    serveCompanyPage(parsed.query || {}, res);
    return;
  }

  // 公司详情 API：/workbench/api/company/<code>
  const detailMatch = p.match(/^\/workbench\/api\/company\/([A-Za-z0-9_-]{4,40})$/);
  if (detailMatch) {
    serveCompanyDetail(detailMatch[1], res);
    return;
  }

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

// 轻量认证反向代理：挡住未授权访问，再转发到本地业务端口
// 用法: node auth-proxy.js <targetPort> <listenPort> <user> <pass> [staticPort]
//
// 支持两种登录方式（2026-11-01 新增表单登录）：
//   1) Basic Auth —— 兼容 curl / 桌面浏览器
//   2) 表单登录   —— GET /__login 拿登录页，POST /__login 校验后下发 HttpOnly Cookie
//      手机端（尤其 QQ/微信 内置浏览器）对 Basic Auth 弹窗经常不响应，
//      表单 + Cookie 才是手机上真正能用的路径。
const http = require('http');
const crypto = require('crypto');

const targetPort = parseInt(process.argv[2] || '3001', 10);
const listenPort = parseInt(process.argv[3] || '3100', 10);
// 额外静态站点路由: /research/*  ->  staticPort
// staticPort=0 表示不提供静态站点（只做 CRM 反代）
const staticPort = parseInt(process.argv[6] || '8000', 10);
const user = process.argv[4] || 'admin';
// 密码优先从环境变量 PROXY_PASS 读取，避免明文出现在 ps 输出里；
// argv[5] 仅作为兼容老启动方式的兜底。
const pass = process.env.PROXY_PASS || process.argv[5] || '';

// 监听地址：默认只听本机（配合 cloudflared 隧道 / 内网）；
// 需要对公网开放时用 LISTEN_HOST=0.0.0.0
const LISTEN_HOST = process.env.LISTEN_HOST || '127.0.0.1';
// 代理模式：
//   crm    (默认) '/' -> targetPort(CRM)，/research/* -> staticPort
//   static 全部 -> staticPort，'/' 重定向到 /workbench/index.html
//            （工作台页面内部全是相对引用，必须让 URL 与真实目录一致，
//              否则 styles.css/app.js/data/*.json 全 404）
const PROXY_MODE = process.env.PROXY_MODE || 'crm';
// 静态模式下工作台入口路径
const STATIC_INDEX = process.env.STATIC_INDEX || '/workbench/index.html';

// 内部共享密钥：转发到 backend 时注入，后端用它确认请求来自本代理。
// 作用：后端 3001 只监听 127.0.0.1，但若有人绕过代理直连（隧道改配置、端口被转发等），
// 没有这个头的请求会被后端拒绝。从文件读取，避免出现在 ps 输出里。
let internalSecret = '';
try {
  internalSecret = require('fs').readFileSync('/home/admin/.openclaw/keys/internal-api.key', 'utf8').trim();
} catch (e) {
  console.error('[FATAL] 读不到 internal-api.key，无法向 backend 注入鉴权头');
  process.exit(1);
}

const COOKIE_NAME = 'crm_auth';
const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 天

// 会话 token = HMAC(secret, user+':'+pass)，服务端无状态，
// 改密码即所有旧会话立刻失效（token 随之变化）
function makeToken(u) {
  return crypto.createHmac('sha256', internalSecret).update(String(u) + ':' + pass).digest('hex');
}
function tokenValid(u, t) {
  if (!t) return false;
  const a = Buffer.from(String(t));
  const b = Buffer.from(makeToken(u));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function credsEqual(u, p) {
  const a = Buffer.from(String(u));
  const b = Buffer.from(String(p));
  const c = Buffer.from(user);
  const d = Buffer.from(String(pass));
  return a.length === c.length && crypto.timingSafeEqual(a, c) &&
         b.length === d.length && crypto.timingSafeEqual(b, d);
}

function basicOk(auth) {
  const m = /^Basic (.+)$/.exec(auth || '');
  if (!m) return false;
  const [u, p] = Buffer.from(m[1], 'base64').toString().split(':');
  return credsEqual(u, p);
}

function isBrowser(req) {
  const a = req.headers['accept'] || '';
  return /text\/html/i.test(a);
}

function buildLoginPage(rt) {
  const safeRt = (typeof rt === 'string' && rt.startsWith('/') && !rt.startsWith('//')) ? rt : '/';
  const rtField = `<input type="hidden" name="rt" value="${safeRt.replace(/"/g, '&quot;')}">`;
  return LOGIN_PAGE_TEMPLATE
    .replace('<!--RT_FIELD-->', rtField)
    .replace('<!--RT_JS-->', JSON.stringify(safeRt));
}

const LOGIN_PAGE_TEMPLATE = `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>登录 · 行业研究工作台</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
         background:#f2f4f8; color:#111; padding:24px; }
  .card { width:100%; max-width:360px; background:#fff; border-radius:16px; padding:28px 24px;
          box-shadow:0 8px 30px rgba(16,24,40,.10); }
  h1 { font-size:20px; margin:0 0 6px; }
  p.sub { margin:0 0 20px; font-size:13px; color:#667; }
  label { display:block; font-size:13px; margin:14px 0 6px; color:#344; }
  input { width:100%; height:46px; padding:0 14px; font-size:16px; border:1px solid #d0d5dd;
          border-radius:10px; background:#fff; color:#111; }
  input:focus { outline:2px solid #2563eb33; border-color:#2563eb; }
  button { width:100%; margin-top:22px; height:48px; border:0; border-radius:10px;
           background:#2563eb; color:#fff; font-size:16px; font-weight:600; }
  button:active { background:#1d4ed8; }
  .err { display:none; margin:0 0 8px; padding:10px 12px; border-radius:8px;
         background:#fef2f2; color:#b42318; font-size:13px; }
  .hint { margin-top:18px; font-size:12px; color:#888; line-height:1.6; }
</style></head><body>
<div class="card">
  <h1>登录</h1>
  <p class="sub">行业研究工作台 / CRM 客户管理</p>
  <p class="err" id="err">用户名或密码不正确</p>
  <form method="POST" action="/__login" autocomplete="on">
    <!--RT_FIELD-->
    <label for="u">用户名</label>
    <input id="u" name="username" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" required>
    <label for="p">密码</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">进入</button>
  </form>
  <div class="hint">登录成功后会保存 30 天，无需重复输入。<br>如果点「进入」没反应，请检查网络后重试。</div>
</div>
<script>
  var f = document.querySelector('form');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var b = f.querySelector('button');
    b.disabled = true; b.textContent = '登录中…';
    fetch('/__login', { method:'POST', body:new URLSearchParams(new FormData(f)), redirect:'follow', credentials:'same-origin' })
      .then(function (r) {
        if (r.redirected) { location.href = r.url; return; }
        return r.text();
      })
      .then(function () { location.href = <!--RT_JS-->; })
      .catch(function () {
        document.getElementById('err').style.display = 'block';
        b.disabled = false; b.textContent = '进入';
      });
  });
</script>
</body></html>`;

function log(req, status, extra) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '-').toString().split(',')[0].trim();
  console.log(new Date().toISOString(), req.method, req.url, '->', status, 'ip=' + ip, extra || '');
}

const server = http.createServer((req, res) => {
  const cookies = parseCookies(req.headers['cookie']);
  const auth = req.headers['authorization'] || '';
  const ok = basicOk(auth) || tokenValid(user, cookies[COOKIE_NAME]);

  // ---- 登录相关路由 ----
  if (req.url === '/__login' || req.url.startsWith('/__login?')) {
    let rt = '/';
    try {
      const q = new URL(req.url, 'http://x').searchParams.get('rt');
      if (q && q.startsWith('/') && !q.startsWith('//')) rt = q;
    } catch (e) { /* ignore */ }
    if (req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(buildLoginPage(rt));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      let tooBig = false;
      req.on('data', (c) => {
        body += c;
        if (body.length > 4096) { tooBig = true; req.destroy(); }
      });
      req.on('end', () => {
        if (tooBig) { res.writeHead(413); res.end('too large'); return; }
        const params = new URLSearchParams(body);
        const u = params.get('username') || '';
        const p = params.get('password') || '';
        let target = params.get('rt') || rt;
        if (!target.startsWith('/') || target.startsWith('//')) target = '/';
        if (!credsEqual(u, p)) {
          log(req, 401, 'login-fail');
          res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(buildLoginPage(target).replace('<p class="err" id="err">用户名或密码不正确</p>',
            '<p class="err" id="err" style="display:block">用户名或密码不正确</p>'));
          return;
        }
        const token = makeToken(user);
        res.writeHead(302, {
          'Location': target,
          'Set-Cookie': COOKIE_NAME + '=' + token + '; Path=/; Max-Age=' + Math.floor(SESSION_TTL_MS / 1000) + '; HttpOnly; SameSite=Lax',
          'Cache-Control': 'no-store'
        });
        res.end();
        log(req, 302, 'login-ok');
      });
      return;
    }
  }

  if (req.url === '/__logout') {
    res.writeHead(302, {
      'Location': '/__login',
      'Set-Cookie': COOKIE_NAME + '=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
    });
    res.end();
    return;
  }

  if (!ok) {
    // favicon：未登录时浏览器也会自动请求，不该弹 401 干扰（也免得控制台一堆红字）
    if (req.url === '/favicon.ico') {
      res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
      res.end();
      return;
    }
    // 浏览器 → 跳登录页（不要弹窗，弹窗在手机内置浏览器经常无反应）
    if (isBrowser(req)) {
      const rt = encodeURIComponent(req.url);
      res.writeHead(302, { 'Location': '/__login?rt=' + rt, 'Cache-Control': 'no-store' });
      res.end();
      log(req, 302, 'redirect-login');
    } else {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="CRM", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8'
      });
      res.end('需要登录\n');
      log(req, 401, 'basic-challenge');
    }
    return;
  }

  // 一次性通道：认证通过后允许下载上传密钥，避免手工抄写
  // 安全审计（2026-11-01）：该接口会把 SSH 私钥通过 HTTP 返回，
  // 历史上配合弱 Basic Auth 口令被利用（GitHub 公开仓库里就有同一把私钥）。
  // 现在默认关闭；确实需要临时取钥匙时用环境变量显式开启：
  //   ALLOW_KEY_DOWNLOAD=1 pm2 restart crm-auth --update-env
  if (req.url === '/__upload_key') {
    if (process.env.ALLOW_KEY_DOWNLOAD !== '1') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found\n');
      return;
    }
    const fs = require('fs');
    try {
      const key = fs.readFileSync('/home/admin/.openclaw/workspace/keys/crm_upload_key');
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(key);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found\n');
    }
    return;
  }

  // 静态研究站点走 /research/ 前缀；静态根 = 项目根，故页面里的 ../已分类 等相对路径仍可解析
  let upPort = targetPort;
  let upPath = req.url;

  // 模式二：纯静态（工作台专用入口）
  // '/' 重定向到真实目录 /workbench/index.html，让页面内相对引用（styles.css、data/*.json）
  // 解析到 /workbench/ 下；若直接以 '/' 提供 index.html，这些相对路径会全部 404。
  if (PROXY_MODE === 'static') {
    if (staticPort <= 0) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('静态服务未配置\n');
      return;
    }
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(302, { 'Location': STATIC_INDEX, 'Cache-Control': 'no-store' });
      res.end();
      log(req, 302, 'static-index');
      return;
    }
    upPort = staticPort;
  } else if (staticPort > 0 && (req.url === '/research' || req.url.startsWith('/research/') ||
                                req.url === '/workbench' || req.url.startsWith('/workbench/'))) {
    // 页面内部全是相对引用(app.js / data.js / dashboard.html)。
    // 若以 /research/ 为基准提供 index.html，这些会解析成 /research/app.js → 404，JS 全挂、只剩静态标题。
    // 因此重定向到真实目录 /research/web/index.html，让 URL 与文件目录一致。
    if (req.url === '/research' || req.url === '/research/') {
      res.writeHead(301, { 'Location': '/research/web/index.html' });
      res.end();
      return;
    }
    upPort = staticPort;
    // /research/* 去掉前缀（静态根 = 项目根）；/workbench/* 保留原路径
    if (req.url.startsWith('/research/')) {
      upPath = req.url.replace(/^\/research/, '');
    }
  }

  const proxyReq = http.request({
    host: '127.0.0.1',
    port: upPort,
    path: upPath,
    method: req.method,
    headers: Object.assign({}, req.headers, {
      host: '127.0.0.1:' + upPort,
      // 注入内部鉴权头（仅转发到 backend 时）
      ...(upPort === targetPort ? { 'x-internal-auth': internalSecret } : {})
    })
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('上游错误: ' + e.message + '\n');
  });
  req.pipe(proxyReq);
});

server.listen(listenPort, LISTEN_HOST, () => {
  console.log('auth-proxy listening on ' + LISTEN_HOST + ':' + listenPort +
    ' -> mode=' + PROXY_MODE + ' target=' + targetPort + ' static=' + staticPort);
});

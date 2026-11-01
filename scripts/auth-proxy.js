// 轻量 Basic Auth 反向代理：挡住未授权访问，再转发到本地业务端口
// 用法: node auth-proxy.js <targetPort> <listenPort> <user> <pass>
const http = require('http');
const crypto = require('crypto');

const targetPort = parseInt(process.argv[2] || '3001', 10);
const listenPort = parseInt(process.argv[3] || '3100', 10);
// 额外静态站点路由: /research/*  ->  staticPort
const staticPort = parseInt(process.argv[6] || '8000', 10);
const user = process.argv[4] || 'admin';
const pass = process.argv[5] || '';
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
const expected = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');

const server = http.createServer((req, res) => {
  const auth = req.headers['authorization'] || '';
  const ok = auth === expected ||
    (() => {
      const m = /^Basic (.+)$/.exec(auth);
      if (!m) return false;
      const [u, p] = Buffer.from(m[1], 'base64').toString().split(':');
      const a = Buffer.from(u + ':' + p);
      const b = Buffer.from(user + ':' + pass);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    })();

  if (!ok) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="CRM", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('需要登录\n');
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
  if (req.url === '/research' || req.url.startsWith('/research/')) {
    // 页面内部全是相对引用(app.js / data.js / dashboard.html)。
    // 若以 /research/ 为基准提供 index.html，这些会解析成 /research/app.js → 404，JS 全挂、只剩静态标题。
    // 因此重定向到真实目录 /research/web/index.html，让 URL 与文件目录一致。
    if (req.url === '/research' || req.url === '/research/') {
      res.writeHead(301, { 'Location': '/research/web/index.html' });
      res.end();
      return;
    }
    upPort = staticPort;
    upPath = req.url.replace(/^\/research/, '');
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

server.listen(listenPort, '127.0.0.1', () => {
  console.log('auth-proxy listening on 127.0.0.1:' + listenPort + ' -> ' + targetPort);
});

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
  if (req.url === '/__upload_key') {
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
    upPort = staticPort;
    upPath = req.url.replace(/^\/research/, '');
    if (upPath === '' || upPath === '/') upPath = '/web/index.html';
  }

  const proxyReq = http.request({
    host: '127.0.0.1',
    port: upPort,
    path: upPath,
    method: req.method,
    headers: Object.assign({}, req.headers, { host: '127.0.0.1:' + upPort })
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

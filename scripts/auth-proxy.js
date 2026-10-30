// 轻量 Basic Auth 反向代理：挡住未授权访问，再转发到本地业务端口
// 用法: node auth-proxy.js <targetPort> <listenPort> <user> <pass>
const http = require('http');
const crypto = require('crypto');

const targetPort = parseInt(process.argv[2] || '3001', 10);
const listenPort = parseInt(process.argv[3] || '3100', 10);
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

  const proxyReq = http.request({
    host: '127.0.0.1',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: Object.assign({}, req.headers, { host: '127.0.0.1:' + targetPort })
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

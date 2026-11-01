/**
 * CRM 前端端到端检查（2026-11-01 安全加固后回归）
 *
 * 目的：验证鉴权改造 + CSP 启用后，前端页面仍然正常渲染：
 *   1. 页面能加载（HTTP 200）
 *   2. 没有 CSP 拦截导致的 JS 报错
 *   3. API 请求成功返回数据（表格有行）
 *   4. 无 401 风暴
 *
 * 用法：BASE=http://127.0.0.1:3100 CRM_USER=admin CRM_PASS=xxx node scripts/crm-e2e-check.js
 */
const { spawn } = require('child_process');

const BASE = process.env.BASE || 'http://127.0.0.1:3100';
const USER = process.env.CRM_USER || 'admin';
const PASS = process.env.CRM_PASS || '';

const PORT = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/crmrt_' + PORT, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws;
let msgId = 0;
const pending = new Map();

function send(method, params) {
  return new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

async function evalJs(expression) {
  const r = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' +
    (r.exceptionDetails.exception && r.exceptionDetails.exception.description || ''));
  return r.result.value;
}

(async () => {
  let target;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try {
      const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      target = list.find(t => t.type === 'page');
      if (target) break;
    } catch (e) { /* chrome 还没起来 */ }
  }
  if (!target) { console.error('FAIL: chrome 未就绪'); process.exit(1); }

  const WebSocket = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.on('message', (data) => {
    const m = JSON.parse(data.toString());
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      p.resolve(m.result);
    }
  });
  await new Promise(r => ws.on('open', r));

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Network.enable');

  const consoleErrors = [];
  const cspViolations = [];
  const failedRequests = [];
  const apiCalls = [];

  ws.on('message', (data) => {
    const m = JSON.parse(data.toString());
    if (m.method === 'Log.entryAdded') {
      const e = m.params.entry;
      if (e.level === 'error') consoleErrors.push(e.text);
      if (/Content Security Policy/i.test(e.text)) cspViolations.push(e.text);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(m.params.args.map(a => a.value || a.description).join(' '));
    }
    if (m.method === 'Network.responseReceived') {
      const u = m.params.response.url;
      if (u.includes('/api/')) {
        apiCalls.push({ url: u.replace(BASE, ''), status: m.params.response.status });
      }
      if (m.params.response.status === 401) failedRequests.push(u);
    }
    if (m.method === 'Network.loadingFailed') {
      failedRequests.push('LOADFAIL ' + m.params.errorText);
    }
  });

  // 注入 Basic Auth
  const auth = Buffer.from(USER + ':' + PASS).toString('base64');
  await send('Network.setExtraHTTPHeaders', { headers: { Authorization: 'Basic ' + auth } });

  await send('Page.navigate', { url: BASE + '/' });
  await sleep(6000);

  const title = await evalJs('document.title');
  const bodyLen = await evalJs('document.body ? document.body.innerText.length : 0');
  const rowCount = await evalJs(
    "document.querySelectorAll('table tbody tr').length"
  );
  const hasLoginForm = await evalJs(
    "!!document.querySelector('input[type=password]')"
  );

  console.log('=== 页面检查 ===');
  console.log('title       :', title);
  console.log('body 文本长度:', bodyLen);
  console.log('表格行数     :', rowCount);
  console.log('出现登录框   :', hasLoginForm);
  console.log('');
  console.log('=== API 调用 (' + apiCalls.length + ') ===');
  const byStatus = {};
  apiCalls.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
  console.log('状态分布:', JSON.stringify(byStatus));
  apiCalls.slice(0, 10).forEach(c => console.log('  ', c.status, c.url));
  console.log('');
  console.log('=== CSP 违规 (' + cspViolations.length + ') ===');
  cspViolations.slice(0, 5).forEach(v => console.log('  ', v));
  console.log('');
  console.log('=== 控制台错误 (' + consoleErrors.length + ') ===');
  consoleErrors.slice(0, 8).forEach(e => console.log('  ', String(e).slice(0, 200)));
  console.log('');
  console.log('=== 失败请求 (' + failedRequests.length + ') ===');
  failedRequests.slice(0, 8).forEach(f => console.log('  ', String(f).slice(0, 160)));

  const ok = bodyLen > 100 && rowCount > 0 && cspViolations.length === 0
             && !apiCalls.some(c => c.status === 401);
  console.log('');
  console.log(ok ? 'PASS: 前端正常渲染，鉴权与 CSP 未破坏页面' : 'FAIL: 存在问题');

  chrome.kill();
  process.exit(ok ? 0 : 1);
})().catch(e => {
  console.error('ERROR:', e.message);
  chrome.kill();
  process.exit(1);
});

// 真机模拟（iPhone 15, 390×844）走完整登录流程：登录页 → 填表 → 点进入 → 验证工作台渲染
// 用法: node scripts/mobile-login-check.js <baseUrl> <user> <pass> [workbenchPath]
const { spawn } = require('child_process');
const fs = require('fs');

const BASE = process.argv[2];
const USER_ = process.argv[3];
const PASS_ = process.argv[4];
const WB_PATH = process.argv[5] || '/research/workbench/index.html';
const OUT = '/tmp/mobile-login';
const PORT = 9700 + Math.floor(Math.random() * 200);

const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=/tmp/cdp_login_' + PORT,
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let ws, target;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      target = list.find(t => t.type === 'page');
      if (target) break;
    } catch (e) {}
  }
  if (!target) { console.error('chrome 未就绪'); process.exit(1); }

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0;
  const pend = new Map();
  const events = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method) events.push(m);
  });
  const send = (method, params = {}) => new Promise(res => {
    const myId = ++id;
    pend.set(myId, res);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    return r.result && r.result.result ? r.result.result.value : undefined;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  const consoleErrs = [];
  const netFails = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') consoleErrs.push(JSON.stringify(m.params.exceptionDetails.text || m.params.exceptionDetails));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') consoleErrs.push(m.params.entry.text);
    if (m.method === 'Network.loadingFailed') netFails.push(m.params.errorText);
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      netFails.push('HTTP ' + m.params.response.status + ' ' + m.params.response.url);
    }
  });

  // 1. 直接访问工作台 → 应跳登录页
  await send('Page.navigate', { url: BASE + WB_PATH });
  await sleep(6000);
  console.log('STEP1 未登录访问工作台 → URL:', await evalJs('location.pathname'));
  const hasForm = await evalJs('!!document.querySelector("form input[name=username]")');
  console.log('STEP1 出现登录表单:', hasForm);
  await send('Page.captureScreenshot', {}).then(r => {
    fs.writeFileSync(OUT + '-1-login.png', Buffer.from(r.result.data, 'base64'));
  });

  // 2. 填账号密码
  await evalJs(`
    document.querySelector('input[name=username]').value = ${JSON.stringify(USER_)};
    document.querySelector('input[name=password]').value = ${JSON.stringify(PASS_)};
    document.querySelector('form').requestSubmit();
    true;
  `);
  await sleep(8000);
  console.log('STEP2 提交登录 → URL:', await evalJs('location.pathname'));

  // 3. 打开工作台
  await send('Page.navigate', { url: BASE + WB_PATH });
  await sleep(15000);
  const metrics = await evalJs(`JSON.stringify({
    url: location.pathname,
    iw: innerWidth,
    scrollW: document.documentElement.scrollWidth,
    docH: document.documentElement.scrollHeight,
    loaderHidden: (document.getElementById('loader')||{}).className || 'none',
    title: (document.querySelector('h1,.logo-text')||{}).textContent || '',
    text: document.body.innerText.slice(0, 300),
    cookie: document.cookie
  })`);
  console.log('STEP3 工作台:', metrics);
  await send('Page.captureScreenshot', { captureBeyondViewport: true }).then(r => {
    fs.writeFileSync(OUT + '-2-workbench.png', Buffer.from(r.result.data, 'base64'));
  });

  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrs.slice(0, 10)));
  console.log('NET_FAILS:', JSON.stringify(netFails.slice(0, 10)));
  ws.close();
  chrome.kill();
  process.exit(0);
})().catch(e => { console.error(e); try { chrome.kill(); } catch (x) {} process.exit(1); });

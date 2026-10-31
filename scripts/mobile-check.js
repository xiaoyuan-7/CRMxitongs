// 用 CDP 做真实移动设备模拟 + 抓 console/network 错误
// 用法: node mobile-check.js <url> <outPrefix>
const { spawn } = require('child_process');
const fs = require('fs');

const URL_ = process.argv[2];
const OUT = process.argv[3] || '/tmp/mc';
const PORT = 9333 + Math.floor(Math.random() * 400);

const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=/tmp/cdp_' + PORT,
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let ws, target;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await r.json();
      target = list.find(t => t.type === 'page');
      if (target) break;
    } catch (e) {}
  }
  if (!target) { console.error('chrome 未就绪'); process.exit(1); }

  ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const logs = [];
  const failed = [];

  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled') {
      logs.push('[' + m.params.type + '] ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      logs.push('[EXCEPTION] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    }
    if (m.method === 'Network.loadingFailed') {
      failed.push(m.params.errorText + ' ' + (m.params.type || ''));
    }
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      failed.push('HTTP ' + m.params.response.status + ' ' + m.params.response.url);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await send('Emulation.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  await send('Page.navigate', { url: URL_ });
  await sleep(9000);

  const metrics = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      iw: window.innerWidth,
      ih: window.innerHeight,
      docH: document.documentElement.scrollHeight,
      contentH: (document.getElementById('content')||document.body).scrollHeight,
      contentText: ((document.getElementById('content')||document.body).innerText||'').slice(0,300),
      bodyTextLen: (document.body.innerText||'').length
    })`, returnByValue: true
  });
  console.log('METRICS ' + metrics.result.value);

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(OUT + '.png', Buffer.from(shot.data, 'base64'));

  if (logs.length) console.log('CONSOLE:\n' + logs.join('\n'));
  if (failed.length) console.log('NETFAIL:\n' + failed.slice(0, 20).join('\n'));
  if (!logs.length && !failed.length) console.log('NO_ERRORS');

  ws.close();
  chrome.kill();
  process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

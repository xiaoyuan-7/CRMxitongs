// 测 workbench 各路由的移动端渲染
const { spawn } = require('child_process');
const fs = require('fs');

const BASE = process.argv[2];
const ROUTES = [
  ['home', '/research/workbench/'],
  ['companies', '/research/workbench/#/companies'],
  ['tech-v2', '/research/workbench/#/tech-v2'],
  ['overlap', '/research/workbench/#/overlap'],
  ['links', '/research/workbench/#/links'],
  ['research', '/research/workbench/#/research'],
  ['v9-review', '/research/workbench/#/v9-review']
];

const PORT = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/rt_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let target;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try {
      const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      target = list.find(t => t.type === 'page');
      if (target) break;
    } catch (e) {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  const errors = [];
  const send = (method, params = {}) => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push('EXC: ' + (m.params.exceptionDetails.exception?.description || '').slice(0, 200));
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('ERR: ' + m.params.args.map(a => a.value ?? '').join(' ').slice(0, 200));
    }
  };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  for (const [name, path] of ROUTES) {
    errors.length = 0;
    await send('Page.navigate', { url: BASE + path });
    await sleep(9000);
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const de = document.documentElement;
        const loader = document.getElementById('loader');
        const main = document.querySelector('.main') || document.body;
        return JSON.stringify({
          iw: window.innerWidth,
          scrollW: de.scrollWidth,
          docH: de.scrollHeight,
          loaderHidden: loader ? loader.classList.contains('hidden') : 'none',
          mainH: main.scrollHeight,
          text: (main.innerText||'').replace(/\\s+/g,' ').slice(0,140)
        });
      })()`, returnByValue: true
    });
    const v = JSON.parse(r.result.value);
    const overflow = v.scrollW > 392;
    console.log(`${name.padEnd(10)} iw=${v.iw} scrollW=${v.scrollW} docH=${v.docH} loader=${v.loaderHidden} ${overflow ? '❌横向溢出' : '✅'}`);
    console.log(`           ${v.text}`);
    if (errors.length) console.log('           ' + errors.slice(0, 3).join(' | '));

    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync('/tmp/rt_' + name + '.png', Buffer.from(shot.data, 'base64'));
  }
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

// 找出移动端横向溢出的元素
// 用法: node overflow-check.js <url>
const { spawn } = require('child_process');

const URL_ = process.argv[2];
const PORT = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/ov_' + PORT, 'about:blank'
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
  const send = (method, params = {}) => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_ });
  await sleep(8000);

  const expr = `(() => {
    const vw = 390;
    const out = { scrollW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, wide: [] };
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 2 || r.right > vw + 2) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') return;
        out.wide.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && String(el.className).slice(0,60)) || '',
          id: el.id || '',
          w: Math.round(r.width), right: Math.round(r.right),
          overflowX: cs.overflowX, minW: cs.minWidth
        });
      }
    });
    out.wide = out.wide.slice(0, 25);
    return JSON.stringify(out);
  })()`;
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log(res.result.value);
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

// 诊断某个元素的计算样式/位置
const { spawn } = require('child_process');
const URL_ = process.argv[2];
const SEL = process.argv[3] || '.filter-panel';
const PORT = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/dg_' + PORT, 'about:blank'
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
  await sleep(10000);

  const expr = `(() => {
    const el = document.querySelector(${JSON.stringify(SEL)});
    if (!el) return 'NOT FOUND';
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const out = {
      sel: ${JSON.stringify(SEL)},
      rect: {x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height)},
      display: cs.display, position: cs.position, visibility: cs.visibility,
      opacity: cs.opacity, overflow: cs.overflow, overflowY: cs.overflowY,
      maxHeight: cs.maxHeight, height: cs.height, zIndex: cs.zIndex,
      color: cs.color, background: cs.backgroundColor,
      fontSize: cs.fontSize, textLen: (el.innerText||'').length,
      parentRect: (() => { const p = el.parentElement; if(!p) return null; const pr = p.getBoundingClientRect(); const pcs = getComputedStyle(p); return {tag:p.tagName+'.'+p.className, x:Math.round(pr.x), y:Math.round(pr.y), w:Math.round(pr.width), h:Math.round(pr.height), display:pcs.display, overflow:pcs.overflow, height:pcs.height}; })()
    };
    return JSON.stringify(out);
  })()`;
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log(r.result.value);
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

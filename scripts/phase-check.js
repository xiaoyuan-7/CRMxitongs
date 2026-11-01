// 分阶段计时：workbench 加载到底卡在哪
const { spawn } = require('child_process');

const URL_ = process.argv[2];
const PORT = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/phase_' + PORT, 'about:blank'
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

  // 每 5 秒轮询一次 loader 状态
  for (let i = 0; i < 30; i++) {
    await sleep(5000);
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('loader');
        const sub = document.getElementById('wbLoadSub');
        const txt = document.getElementById('wbLoadText');
        const perf = performance.getEntriesByType('resource')
          .filter(e => e.name.includes('/data/'))
          .map(e => e.name.split('/').pop().replace('.json','') + ':' + Math.round(e.duration) + 'ms/' + Math.round(e.transferSize/1024) + 'KB');
        const m = performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null;
        return JSON.stringify({
          done: el ? el.classList.contains('hidden') : null,
          status: txt ? txt.textContent : null,
          sub: sub ? sub.textContent : null,
          heapMB: m,
          resources: perf
        });
      })()`, returnByValue: true
    });
    const v = JSON.parse(r.result.value);
    process.stdout.write(`t=${(i+1)*5}s done=${v.done} heap=${v.heapMB}MB status="${v.status}" sub="${v.sub}"\n`);
    if (v.resources.length) process.stdout.write('   ' + v.resources.join(' | ') + '\n');
    if (v.done) { console.log('>>> 加载完成'); break; }
  }
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

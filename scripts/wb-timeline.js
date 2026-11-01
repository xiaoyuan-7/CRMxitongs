/**
 * 精确定位首屏时间去向：在 data-loader 注入前后打点
 */
const { spawn } = require('child_process');
const BASE = process.env.WB_BASE || 'http://127.0.0.1:8000';
const PORT = 9850 + Math.floor(Math.random() * 100);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/wbt2_' + PORT, 'about:blank'
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
  const WebSocket = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  const send = (m, p = {}) => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method: m, params: p }));
  });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };
  await send('Page.enable'); await send('Runtime.enable');

  // 在导航前注入打点脚本：包裹 fetch 与 JSON.parse
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__marks = [];
      window.__mark = (n) => { window.__marks.push({n, t: Math.round(performance.now())}); };
      window.__mark('script-injected');
      const _fetch = window.fetch;
      window.fetch = function(...a) {
        const url = String(a[0]).split('/').pop();
        const t0 = performance.now();
        return _fetch.apply(this, a).then(res => {
          const t1 = performance.now();
          res.clone().text().then(txt => {
            window.__marks.push({n:'fetch:'+url+' bytes:'+txt.length,
              t: Math.round(t1-t0), done: Math.round(performance.now())});
          });
          return res;
        });
      };
      const _jp = JSON.parse;
      JSON.parse = function(txt, ...r) {
        const t0 = performance.now();
        const v = _jp.call(JSON, txt, ...r);
        window.__marks.push({n:'parse bytes:'+String(txt).length,
          t: Math.round(t0), dur: Math.round(performance.now()-t0)});
        return v;
      };
    `
  });

  const t0 = Date.now();
  await send('Page.navigate', { url: BASE + '/workbench/' });
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    const r = await send('Runtime.evaluate', {
      expression: "(()=>{const l=document.getElementById('loader');return l?l.classList.contains('hidden'):false})()",
      returnByValue: true
    });
    if (r.result.value) break;
  }
  const total = Date.now() - t0;

  const r = await send('Runtime.evaluate', {
    expression: "JSON.stringify(window.__marks)", returnByValue: true
  });
  const marks = JSON.parse(r.result.value);

  console.log('=== 首屏总耗时 ===', (total/1000).toFixed(2), '秒');
  console.log('');
  console.log('=== 打点（按时间排序）===');
  marks.sort((a, b) => a.t - b.t);
  marks.forEach(m => {
    const dur = m.dur != null ? ' 耗时' + String(m.dur).padStart(5) + 'ms' :
                (m.done != null ? ' 完结@' + String(m.done).padStart(6) + 'ms' : '');
    console.log('  t=' + String(m.t).padStart(6) + 'ms  ' + m.n.padEnd(34) + dur);
  });

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

/**
 * 定位 workbench 首屏 28 秒的时间去向
 */
const { spawn } = require('child_process');

const BASE = process.env.WB_BASE || 'http://127.0.0.1:8000';
const PORT = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/wbprof_' + PORT, 'about:blank'
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

  // 用 Performance 域采样主线程长任务
  await send('Performance.enable');
  const t0 = Date.now();
  await send('Page.navigate', { url: BASE + '/workbench/' });

  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const r = await send('Runtime.evaluate', {
      expression: "(()=>{const l=document.getElementById('loader');return l?l.classList.contains('hidden'):false})()",
      returnByValue: true
    });
    if (r.result.value) break;
  }
  const total = Date.now() - t0;

  // 拿 Performance metrics
  const m = await send('Performance.getMetrics');
  const metrics = {};
  m.metrics.forEach(x => metrics[x.name] = x.value);

  // 采样长任务
  const lt = await send('Runtime.evaluate', {
    expression: `JSON.stringify(performance.getEntriesByType('resource').map(r=>({
      n:r.name.split('/').pop(), d:Math.round(r.duration), e:r.encodedBodySize
    })))`, returnByValue: true
  });

  // 实测 JSON.parse 成本（重新 parse 一遍最重的）
  const jp = await send('Runtime.evaluate', {
    expression: `(async () => {
      const names = ['companies','relations','tech_v2','v9_review','aggregates'];
      const out = [];
      for (const n of names) {
        const t = performance.now();
        const txt = await (await fetch('data/'+n+'.json')).text();
        const t1 = performance.now();
        const d = JSON.parse(txt);
        const t2 = performance.now();
        out.push({n, bytes: txt.length, fetch: Math.round(t1-t), parse: Math.round(t2-t1),
                  size: Array.isArray(d)?d.length:Object.keys(d).length});
      }
      return JSON.stringify(out);
    })()`, returnByValue: true, awaitPromise: true
  });

  console.log('=== 首屏总耗时 ===', (total/1000).toFixed(2), '秒');
  console.log('');
  console.log('=== Performance 指标 ===');
  console.log('  JSHeapUsed    :', (metrics.JSHeapUsedSize/1048576).toFixed(1), 'MB');
  console.log('  TaskDuration  :', (metrics.TaskDuration*1000).toFixed(0), 'ms  (主线程总占用)');
  console.log('  ScriptDuration:', (metrics.ScriptDuration*1000).toFixed(0), 'ms  (JS 执行)');
  console.log('  LayoutDuration:', (metrics.LayoutDuration*1000).toFixed(0), 'ms');
  console.log('  RecalcStyle   :', (metrics.RecalcStyleDuration*1000).toFixed(0), 'ms');
  console.log('');
  console.log('=== 单项 JSON.parse 成本（复测）===');
  JSON.parse(jp.result.value).forEach(r => {
    console.log('  ' + r.n.padEnd(14) + 'fetch ' + String(r.fetch).padStart(5) + 'ms  parse ' +
      String(r.parse).padStart(6) + 'ms  ' + (r.bytes/1048576).toFixed(1) + 'MB → ' + r.size + ' 条');
  });
  console.log('');
  console.log('=== 资源 duration ===');
  JSON.parse(lt.result.value).forEach(r =>
    console.log('  ' + r.n.padEnd(26) + String(r.d).padStart(6) + 'ms'));

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

/**
 * workbench 首屏性能实测
 * 测：首屏传输量、加载耗时、JS 堆内存、解析耗时
 */
const { spawn } = require('child_process');
const fs = require('fs');

const BASE = process.env.WB_BASE || 'http://127.0.0.1:8000';
const PATHNAME = process.env.WB_PATH || '/workbench/';

const PORT = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--js-flags=--expose-gc',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/wbrt_' + PORT + '_' + Date.now(), 'about:blank'
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
  if (!target) { console.error('chrome 未就绪'); process.exit(1); }

  const WebSocket = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');

  const transferred = [];
  const timings = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Network.loadingFinished') {
      transferred.push({ id: m.params.requestId, bytes: m.params.encodedDataLength });
    }
    if (m.method === 'Network.responseReceived') {
      timings.push({ url: m.params.response.url, status: m.params.response.status });
    }
  });

  const t0 = Date.now();
  await send('Page.navigate', { url: BASE + PATHNAME });

  // 等 loader 隐藏
  let ready = false;
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const r = await send('Runtime.evaluate', {
      expression: "(()=>{const l=document.getElementById('loader');return JSON.stringify({hidden:l?l.classList.contains('hidden'):null,txt:document.getElementById('wbLoadSub')?document.getElementById('wbLoadSub').textContent:''})})()",
      returnByValue: true
    });
    const v = JSON.parse(r.result.value);
    if (v.hidden) { ready = true; break; }
  }
  const loadMs = Date.now() - t0;

  const mem = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      heapUsed: performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null,
      heapTotal: performance.memory ? Math.round(performance.memory.totalJSHeapSize/1048576) : null,
      domNodes: document.getElementsByTagName('*').length,
      title: document.title,
      nav: performance.getEntriesByType('navigation')[0] ? {
        domContentLoaded: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),
        loadEvent: Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd)
      } : null,
      dataSizes: ['COMPANIES','RELATIONS','TECH_V2','V9_REVIEW','AGGREGATES'].map(k=>{
        const v = window[k];
        let n = 0;
        if (Array.isArray(v)) n = v.length;
        else if (v && typeof v === 'object') n = Object.keys(v).length;
        return k+':'+n;
      }).join(', ')
    })`,
    returnByValue: true
  });
  const m = JSON.parse(mem.result.value);

  // 资源计时
  const res = await send('Runtime.evaluate', {
    expression: `JSON.stringify(performance.getEntriesByType('resource').map(r=>({
      n: r.name.split('/').pop(), enc: r.encodedBodySize, dec: r.decodedBodySize, d: Math.round(r.duration)
    })))`,
    returnByValue: true
  });
  const resources = JSON.parse(res.result.value).sort((a,b)=>b.dec-a.dec);

  console.log('=== 加载完成 ===');
  console.log('是否渲染成功 :', ready);
  console.log('首屏总耗时   :', (loadMs/1000).toFixed(2), '秒');
  console.log('DOMContentLoaded:', m.nav ? m.nav.domContentLoaded + 'ms' : '-');
  console.log('load 事件    :', m.nav ? m.nav.loadEvent + 'ms' : '-');
  console.log('JS 堆占用    :', m.heapUsed, 'MB /', m.heapTotal, 'MB');
  console.log('DOM 节点数   :', m.domNodes);
  console.log('数据集条目   :', m.dataSizes);
  console.log('');
  console.log('=== 资源传输（按解压后大小）===');
  let totEnc = 0, totDec = 0;
  resources.forEach(r => { totEnc += r.enc; totDec += r.dec; });
  resources.slice(0, 14).forEach(r =>
    console.log('  ' + r.n.padEnd(26) + (r.dec/1048576).toFixed(2).padStart(8) + ' MB  enc:' +
      (r.enc/1048576).toFixed(2).padStart(7) + ' MB  ' + r.d + 'ms'));
  console.log('  ' + '-'.repeat(70));
  console.log('  合计: 解压 ' + (totDec/1048576).toFixed(2) + ' MB → 实传 ' +
    (totEnc/1048576).toFixed(2) + ' MB   压缩率 ' +
    (totEnc ? Math.round(totEnc*100/totDec) : 0) + '%');

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

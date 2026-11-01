/**
 * 定位「HTML 导航 25 秒」的根因
 * 对比：导航请求 vs fetch 同 URL vs fetch 其他 URL 的分阶段 timing
 */
const { spawn } = require('child_process');
const PORT = 9700 + Math.floor(Math.random() * 200);
const BASE = process.env.WB_BASE || 'https://sanyo-concluded-opponent-heating.trycloudflare.com/research';
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=/tmp/wbdiag_' + PORT + '_' + Date.now(),
  'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let t;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = l.find(x => x.type === 'page'); if (t) break; } catch (e) {}
  }
  const WS = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
  const ws = new WS(t.webSocketDebuggerUrl);
  let id = 0; const p = new Map();
  const send = (m, pa = {}) => new Promise(r => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: pa })); });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } };
  await send('Page.enable'); await send('Runtime.enable');

  // 1) 导航到空白页并测试 fetch
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(800);

  const fetchTest = await send('Runtime.evaluate', {
    expression: `(async()=>{
      const urls = ${JSON.stringify([
        BASE + '/workbench/',
        BASE + '/workbench/data/sub_tracks.json',
        BASE + '/workbench/styles.css',
        BASE + '/workbench/',
        BASE + '/workbench/data/sub_tracks.json'
      ])};
      const out = [];
      for (const u of urls) {
        const t0 = performance.now();
        try {
          const r = await fetch(u, {cache:'no-store'});
          const txt = await r.text();
          const t1 = performance.now();
          const e = performance.getEntriesByType('resource').filter(x=>x.name===u).pop();
          out.push({url: u.replace(${JSON.stringify(BASE)},''),
            total: Math.round(t1-t0),
            status: r.status,
            timing: e ? {
              start: Math.round(e.startTime),
              dns: Math.round(e.domainLookupEnd - e.domainLookupStart),
              connect: Math.round(e.connectEnd - e.connectStart),
              tls: e.secureConnectionStart ? Math.round(e.connectEnd - e.secureConnectionStart) : null,
              ttfb: Math.round(e.responseStart - e.requestStart),
              proto: e.nextHopProtocol
            } : null});
        } catch(err) { out.push({url: u.replace(${JSON.stringify(BASE)},''), error: err.message}); }
      }
      return JSON.stringify(out, null, 1);
    })()`, returnByValue: true, awaitPromise: true
  });
  console.log('=== fetch 测试（无 Basic Auth，应返回 401，但仍能测网络）===');
  console.log(fetchTest.result.value);

  // 2) 导航计时
  const navT0 = Date.now();
  await send('Page.navigate', { url: BASE + '/workbench/' });
  await sleep(3000);
  const navInfo = await send('Runtime.evaluate', {
    expression: `(()=>{const n=performance.getEntriesByType('navigation')[0];return n?JSON.stringify({
      redirectStart:Math.round(n.redirectStart),redirectEnd:Math.round(n.redirectEnd),
      domainLookupStart:Math.round(n.domainLookupStart),domainLookupEnd:Math.round(n.domainLookupEnd),
      connectStart:Math.round(n.connectStart),connectEnd:Math.round(n.connectEnd),
      secureConnectionStart:Math.round(n.secureConnectionStart),
      requestStart:Math.round(n.requestStart),responseStart:Math.round(n.responseStart),
      responseEnd:Math.round(n.responseEnd),
      proto:n.nextHopProtocol,
      transfer:n.transferSize, decoded:n.decodedBodySize}):'no nav'})()`,
    returnByValue: true
  });
  console.log('=== 导航分阶段 timing ===');
  console.log(navInfo.result.value);
  console.log('导航墙钟耗时:', ((Date.now() - navT0) / 1000).toFixed(2), '秒');

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

/**
 * 决定性实验：Chrome 导航慢 25 秒，是否是 HTTP/3 (QUIC) 的 UDP/443 被黑洞导致？
 * 对比：默认 / --disable-quic / --disable-features=NetworkService
 */
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.env.WB_BASE || 'https://sanyo-concluded-opponent-heating.trycloudflare.com/research';

const CASES = [
  [[], '默认 (可能走 QUIC)'],
  [['--disable-quic'], '--disable-quic'],
  [['--disable-http2'], '--disable-http2'],
  [['--disable-quic', '--disable-http2'], 'quic+http2 都关']
];

function run(extra, label) {
  return new Promise(async resolve => {
    const PORT = 9800 + Math.floor(Math.random() * 150);
    const chrome = spawn('/usr/bin/google-chrome', [
      '--headless=new', '--no-sandbox', '--disable-gpu',
      '--remote-debugging-port=' + PORT,
      '--user-data-dir=/tmp/wbq_' + PORT + '_' + Date.now(),
      ...extra, 'about:blank'
    ], { stdio: 'ignore' });
    let t;
    for (let i = 0; i < 40; i++) {
      await sleep(400);
      try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = l.find(x => x.type === 'page'); if (t) break; } catch (e) {}
    }
    if (!t) { chrome.kill(); return resolve({ label, err: 'chrome 未就绪' }); }
    const WS = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
    const ws = new WS(t.webSocketDebuggerUrl);
    let id = 0; const p = new Map();
    const send = (m, pa = {}) => new Promise(r => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: pa })); });
    await new Promise(r => ws.onopen = r);
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } };
    await send('Page.enable'); await send('Runtime.enable');

    const t0 = Date.now();
    await send('Page.navigate', { url: BASE + '/workbench/' });
    await sleep(1500);
    const r = await send('Runtime.evaluate', {
      expression: `(()=>{const n=performance.getEntriesByType('navigation')[0];return n?JSON.stringify({
        dns:Math.round(n.domainLookupEnd-n.domainLookupStart),
        tcp:Math.round(n.connectEnd-n.connectStart),
        tls:Math.round(n.connectEnd-n.secureConnectionStart),
        req:Math.round(n.responseStart-n.requestStart),
        body:Math.round(n.responseEnd-n.responseStart),
        total:Math.round(n.responseEnd),
        proto:n.nextHopProtocol||'(none)'}) : 'no nav'})()`,
      returnByValue: true
    });
    const m = r.result.value ? JSON.parse(r.result.value) : null;
    ws.close(); chrome.kill();
    resolve({ label, wall: ((Date.now() - t0) / 1000).toFixed(2), m });
  });
}

(async () => {
  console.log('目标:', BASE + '/workbench/');
  console.log('');
  for (const [args, label] of CASES) {
    const r = await run(args, label);
    if (r.err) { console.log('  ' + label.padEnd(24) + 'ERR ' + r.err); continue; }
    console.log('  ' + r.label.padEnd(24) +
      '总计 ' + String(r.m.total).padStart(6) + 'ms  | dns ' + String(r.m.dns).padStart(4) +
      '  tcp ' + String(r.m.tcp).padStart(5) + '  tls ' + String(r.m.tls).padStart(5) +
      '  等响应头 ' + String(r.m.req).padStart(6) + '  收body ' + String(r.m.body).padStart(6) +
      '  proto ' + r.m.proto);
  }
})();

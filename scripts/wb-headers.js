/**
 * 抓 Chrome 发出的真实请求头，判断连接复用情况
 */
const { spawn } = require('child_process');
const PORT = 9950 + Math.floor(Math.random() * 40);
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/wbh_' + PORT, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  let t;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try {
      const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      t = l.find(x => x.type === 'page');
      if (t) break;
    } catch (e) {}
  }
  const WS = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
  const ws = new WS(t.webSocketDebuggerUrl);
  let id = 0; const p = new Map();
  const send = (m, pa = {}) => new Promise(r => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: pa })); });
  await new Promise(r => ws.onopen = r);
  const reqs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); }
    if (m.method === 'Network.requestWillBeSent') {
      reqs.push({ url: m.params.request.url.split('/').pop(), id: m.params.requestId,
                  headers: m.params.request.headers, ts: m.params.timestamp });
    }
    if (m.method === 'Network.responseReceived') {
      const r = reqs.find(x => x.id === m.params.requestId);
      if (r) { r.status = m.params.response.status; r.conn = m.params.response.connectionId;
               r.proto = m.params.response.protocol; }
    }
    if (m.method === 'Network.loadingFinished') {
      const r = reqs.find(x => x.id === m.params.requestId);
      if (r) { r.enc = m.params.encodedDataLength; r.doneTs = m.params.timestamp; }
    }
  };
  await send('Network.enable'); await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:8000/workbench/' });
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    const r = await send('Runtime.evaluate', {
      expression: "(()=>{const l=document.getElementById('loader');return l?l.classList.contains('hidden'):false})()",
      returnByValue: true });
    if (r.result.value) break;
  }

  console.log('=== Chrome 请求详情 ===');
  const base = reqs.length ? reqs[0].ts : 0;
  reqs.filter(r => r.url && r.url.includes('data/')).forEach(r => {
    console.log('  ' + r.url.padEnd(26) + 'conn=' + r.conn + ' proto=' + r.proto +
      '  发:' + Math.round((r.ts - base) * 1000) + 'ms  完:' + (r.doneTs ? Math.round((r.doneTs - base) * 1000) : '?') + 'ms' +
      '  enc=' + (r.enc ? (r.enc / 1048576).toFixed(2) + 'MB' : '?'));
  });
  console.log('');
  console.log('=== 关键请求头（首个 data 请求）===');
  const first = reqs.find(r => r.url && r.url.includes('data/'));
  if (first) {
    ['Connection', 'Accept-Encoding', 'Cache-Control', 'Pragma', 'Upgrade-Insecure-Requests']
      .forEach(h => { if (first.headers[h]) console.log('  ' + h + ': ' + first.headers[h]); });
  }
  console.log('');
  console.log('=== 用到的连接数 ===', new Set(reqs.filter(r=>r.conn).map(r=>r.conn)).size);
  console.log('=== 协议 ===', [...new Set(reqs.filter(r=>r.proto).map(r=>r.proto))].join(', '));

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

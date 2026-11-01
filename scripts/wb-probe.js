/**
 * 逐个 fetch 探针：区分「网络慢」与「并发竞争」
 */
const { spawn } = require('child_process');
const PORT = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/probe_' + PORT, 'about:blank'], { stdio: 'ignore' });
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
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:8000/workbench/' });
  await sleep(3000);

  // 串行：每个文件单独 fetch
  const serial = await send('Runtime.evaluate', {
    expression: `(async()=>{
      const out=[];
      for(const n of ['_fields','companies','relations','tech_v2','v9_review']){
        const t0=performance.now();
        const resp=await fetch('data/'+n+'.json',{cache:'no-store'});
        const tt=performance.now();
        const txt=await resp.text();
        out.push({n,headers:Math.round(tt-t0),body:Math.round(performance.now()-tt),
                  bytes:txt.length,enc:resp.headers.get('content-encoding')});
      }
      return JSON.stringify(out);
    })()`, returnByValue: true, awaitPromise: true
  });
  console.log('=== 串行 fetch（逐个）===');
  JSON.parse(serial.result.value).forEach(x =>
    console.log('  ' + x.n.padEnd(12) + '响应头 ' + String(x.headers).padStart(6) + 'ms   读body ' +
      String(x.body).padStart(6) + 'ms   ' + (x.bytes / 1048576).toFixed(1) + 'MB  enc:' + x.enc));

  // 并行：全部一起发
  const par = await send('Runtime.evaluate', {
    expression: `(async()=>{
      const names=['_fields','aggregates','sub_tracks','chain_links','overlap_28','top50_classified',
                   'top500_unclassified','v9_review','tech_v2','relations','companies'];
      const t0=performance.now();
      const res=await Promise.all(names.map(n=>fetch('data/'+n+'.json',{cache:'no-store'})
        .then(r=>r.text().then(t=>({n,len:t.length})))));
      return JSON.stringify({total:Math.round(performance.now()-t0),res});
    })()`, returnByValue: true, awaitPromise: true
  });
  const pj = JSON.parse(par.result.value);
  console.log('');
  console.log('=== 并行 fetch（11 个一起）===');
  console.log('  总耗时:', pj.total, 'ms');
  pj.res.forEach(x => console.log('    ' + x.n.padEnd(24) + (x.len / 1048576).toFixed(1) + 'MB'));

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

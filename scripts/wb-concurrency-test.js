/**
 * 决定性实验：并发 vs 串行 vs 分批
 * 目的：定位 workbench 首屏 26 秒到底卡在哪
 */
const { spawn } = require('child_process');
const PORT = 9700 + Math.floor(Math.random() * 80);
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/wbx_' + PORT, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const NAMES = "['_fields','aggregates','sub_tracks','chain_links','overlap_28','top50_classified','top500_unclassified','v9_review','tech_v2','relations','companies']";

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

  const run = async (label, expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    console.log('  ' + label.padEnd(28) + (r.result.value === undefined ? 'TIMEOUT/ERROR' : r.result.value + ' ms'));
  };

  console.log('=== 首屏 11 个数据集的加载方式对比 ===');

  // A. 全并行
  await run('A 全并行 (11 一起)', `(async()=>{
    const names=${NAMES};
    const t0=performance.now();
    await Promise.all(names.map(n=>fetch('data/'+n+'.json',{cache:'no-store'}).then(r=>r.text())));
    return Math.round(performance.now()-t0);
  })()`);

  // B. 全串行
  await run('B 全串行', `(async()=>{
    const names=${NAMES};
    const t0=performance.now();
    for(const n of names){ const r=await fetch('data/'+n+'.json',{cache:'no-store'}); await r.text(); }
    return Math.round(performance.now()-t0);
  })()`);

  // C. 分批 3 个
  await run('C 分批 (每批 3 个)', `(async()=>{
    const names=${NAMES};
    const t0=performance.now();
    for(let i=0;i<names.length;i+=3){
      await Promise.all(names.slice(i,i+3).map(n=>fetch('data/'+n+'.json',{cache:'no-store'}).then(r=>r.text())));
    }
    return Math.round(performance.now()-t0);
  })()`);

  // D. 分批 2 个
  await run('D 分批 (每批 2 个)', `(async()=>{
    const names=${NAMES};
    const t0=performance.now();
    for(let i=0;i<names.length;i+=2){
      await Promise.all(names.slice(i,i+2).map(n=>fetch('data/'+n+'.json',{cache:'no-store'}).then(r=>r.text())));
    }
    return Math.round(performance.now()-t0);
  })()`);

  // E. 并行 fetch 但串行读 body（只测下载并发）
  await run('E 并行下载+串行读body', `(async()=>{
    const names=${NAMES};
    const t0=performance.now();
    const resps=await Promise.all(names.map(n=>fetch('data/'+n+'.json',{cache:'no-store'})));
    for(const r of resps) await r.text();
    return Math.round(performance.now()-t0);
  })()`);

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

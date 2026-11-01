/**
 * 决定性实验：定位浏览器并行 fetch 卡 26 秒的根因
 * 变量：磁盘缓存开关 / HTTP 版本 / 移动限速
 */
const { spawn } = require('child_process');
const PORT = 9600 + Math.floor(Math.random() * 80);

function runChrome(extraArgs, label, cb) {
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/wbe_' + PORT + label.replace(/\W/g, ''),
    ...extraArgs, 'about:blank'
  ], { stdio: 'ignore' });
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
    if (!t) { chrome.kill(); return cb(label, null, 'chrome 未就绪'); }
    const WS = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
    const ws = new WS(t.webSocketDebuggerUrl);
    let id = 0; const p = new Map();
    const send = (m, pa = {}) => new Promise(r => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: pa })); });
    await new Promise(r => ws.onopen = r);
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.navigate', { url: 'http://127.0.0.1:8000/workbench/' });
    await sleep(1500);
    const r = await send('Runtime.evaluate', {
      expression: `(async()=>{
        const names=${JSON.stringify(['_fields', 'aggregates', 'sub_tracks', 'chain_links', 'overlap_28', 'top50_classified', 'top500_unclassified', 'v9_review', 'tech_v2', 'relations', 'companies'])};
        const t0=performance.now();
        const res=await Promise.all(names.map(n=>fetch('data/'+n+'.json',{cache:'no-store'}).then(r=>r.text().then(x=>x.length))));
        return JSON.stringify({ms:Math.round(performance.now()-t0), bytes:res.reduce((a,b)=>a+b,0)});
      })()`, returnByValue: true, awaitPromise: true
    });
    ws.close(); chrome.kill();
    cb(label, r.result.value ? JSON.parse(r.result.value) : null, null);
  })().catch(e => { chrome.kill(); cb(label, null, e.message); });
}

const CASES = [
  [[], '默认'],
  [['--disk-cache-size=1'], '禁用磁盘缓存'],
  [['--disable-http2'], '禁用 HTTP/2'],
  [['--disk-cache-size=1', '--disable-http2'], '两者都关'],
  [['--renderer-process-limit=1'], '单渲染进程']
];

(async () => {
  for (const [args, label] of CASES) {
    await new Promise(res => runChrome(args, label, (l, v, e) => {
      console.log('  ' + l.padEnd(20) + (v ? (v.ms + ' ms   ' + (v.bytes / 1048576).toFixed(1) + ' MB') : ('ERR: ' + e)));
      res();
    }));
  }
})();

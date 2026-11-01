const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = 9950 + Math.floor(Math.random() * 40);
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/wbchk_' + PORT + '_' + Date.now(), 'about:blank'], { stdio: 'ignore' });
(async () => {
  let t;
  for (let i = 0; i < 40; i++) { await sleep(400); try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = l.find(x => x.type === 'page'); if (t) break; } catch (e) {} }
  const WS = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
  const ws = new WS(t.webSocketDebuggerUrl); let id = 0; const p = new Map();
  const send = (m, pa = {}) => new Promise(r => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: pa })); });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:8000/workbench/' });
  await sleep(6000);
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
    appHTMLLen: (document.getElementById('app')?.innerHTML||'').length,
    appChildren: document.getElementById('app')?.children.length,
    text: (document.getElementById('app')?.innerText||'').replace(/\\s+/g,' ').slice(0,300),
    h2: [...document.querySelectorAll('#app h2')].map(x=>x.textContent.trim()),
    allLinks: document.querySelectorAll('#app a').length,
    err: window.__err || null
  })`, returnByValue: true
  });
  console.log(r.result.value);
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

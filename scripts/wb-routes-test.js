/**
 * 全路由渲染验证：每个页面都检查是否正常渲染出内容
 */
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.env.WB_BASE || 'http://127.0.0.1:8000/workbench/';
const PORT = 9970 + Math.floor(Math.random() * 25);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=/tmp/wbrt2_' + PORT + '_' + Date.now(),
  'about:blank'
], { stdio: 'ignore' });

const ROUTES = ['/', '/companies', '/overlap', '/links', '/research', '/visits', '/v9-review', '/tech-v2'];

(async () => {
  let t;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = l.find(x => x.type === 'page'); if (t) break; } catch (e) {}
  }
  const WS = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
  const ws = new WS(t.webSocketDebuggerUrl); let id = 0; const p = new Map();
  const send = (m, pa = {}) => new Promise((res, rej) => {
    const i = ++id; p.set(i, res);
    const timer = setTimeout(() => { if (p.has(i)) { p.delete(i); rej(new Error('CDP timeout: ' + m)); } }, 60000);
    const orig = res;
    ws.send(JSON.stringify({ id: i, method: m, params: pa }));
    p.set(i, (v) => { clearTimeout(timer); orig(v); });
  });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } };
  // 收集页面错误（挂在同一个 onmessage 处理器里，不要覆盖）
  const errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(m.params.exceptionDetails.text + ' ' +
        String(m.params.exceptionDetails.exception?.description || '').slice(0, 200));
    }
    if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); }
  };

  await send('Page.enable'); await send('Runtime.enable');

  await send('Page.navigate', { url: BASE });
  await sleep(5000);

  for (const r of ROUTES) {
    try {
      await send('Runtime.evaluate', { expression: `location.hash='#${r}'` });
      await sleep(r === '/companies' || r === '/tech-v2' ? 6000 : 2500);
      const res = await send('Runtime.evaluate', {
        expression: `(()=>{const app=document.getElementById('app');return JSON.stringify({
          len:(app?.innerHTML||'').length,
          text:(app?.innerText||'').replace(/\\s+/g,' ').slice(0,70),
          tables:app?.querySelectorAll('table').length,
          loading:!!app?.querySelector('.wb-route-loading')
        })})()`, returnByValue: true
      });
      const v = JSON.parse(res.result.value);
      const ok = v.len > 500 && !v.loading;
      console.log('  ' + (ok ? '✓' : '✗') + ' ' + r.padEnd(14) + ' html=' + String(v.len).padStart(6) +
        '  tables=' + v.tables + '  ' + v.text);
    } catch (e) {
      console.log('  ✗ ' + r.padEnd(14) + ' ' + e.message);
    }
  }

  console.log('\nJS 错误: ' + (errors.length ? errors.join('\n  ') : '无'));
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

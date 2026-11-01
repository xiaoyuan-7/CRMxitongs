/**
 * 端到端流程验证：首页 → 公司库 → 详情弹窗
 * 验证懒加载改造后各页面数据是否到位
 */
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.env.WB_BASE || 'https://sanyo-concluded-opponent-heating.trycloudflare.com/research';
const PORT = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--window-size=390,844',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=/tmp/wbflow_' + PORT + '_' + Date.now(),
  'about:blank'
], { stdio: 'ignore' });

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
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setExtraHTTPHeaders', { headers: { Authorization: 'Basic ' + Buffer.from('admin:oSty45kTwKhRgYVZYMnr').toString('base64') } });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  const ev = async (expr, waitMs) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (waitMs) await sleep(waitMs);
    return r.result.value;
  };

  await send('Page.navigate', { url: BASE + '/workbench/' });
  // 等 loader 消失
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    const ok = await ev("(()=>{const l=document.getElementById('loader');return l?l.classList.contains('hidden'):false})()");
    if (ok) break;
  }
  const home = await ev(`JSON.stringify({
    title: document.title,
    hasNav: document.querySelectorAll('.nav-item').length,
    cards: document.querySelectorAll('.card').length,
    subTracks: document.querySelectorAll('.filter-chip').length,
    companies: (window.COMPANIES||[]).length,
    aggregates: !!(window.AGGREGATES),
    chainCount: document.body.innerText.match(/(\\d+)\\s*家在主表/)?.[0]
  })`);
  console.log('【首页】', home);

  // 点公司库
  const t0 = Date.now();
  await ev("location.hash='#/companies'", 500);
  // 等公司库表格出现
  let ready = false;
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    const r = await ev("(()=>({rows:document.querySelectorAll('#companiesBody tr').length, loading:!!document.querySelector('.wb-route-loading'), n:(window.COMPANIES||[]).length}))()");
    if (r && r.rows > 0) { ready = true; console.log('【公司库】' + ((Date.now()-t0)/1000).toFixed(1) + 's', JSON.stringify(r)); break; }
    if (i === 4) console.log('  ...加载中', JSON.stringify(r));
  }
  if (!ready) console.log('【公司库】加载超时/失败');

  // 点第一个企业看详情
  await ev("document.querySelector('#companiesBody tr')?.click()", 800);
  const detail = await ev(`JSON.stringify({
    modalOpen: !document.getElementById('detailModal')?.classList.contains('hidden'),
    name: document.querySelector('.detail-name')?.textContent,
    sections: document.querySelectorAll('.detail-section').length
  })`);
  console.log('【详情】', detail);

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

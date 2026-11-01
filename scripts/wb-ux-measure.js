/**
 * 真实用户体验测量（不启用 CDP Network 域，避免 DevTools 协议干扰）
 *
 * 重要发现：CDP 的 Network.enable 会缓冲所有响应体，
 * 对 20MB 级响应会让浏览器侧的接收变成瓶颈，测量结果失真。
 * 这里只测用户真正感知的时间：导航 → loader 隐藏 → 首屏可交互。
 */
const { spawn } = require('child_process');

const BASE = process.env.WB_BASE || 'http://127.0.0.1:8000';
const PATHNAME = process.env.WB_PATH || '/workbench/';
const MOBILE = process.env.WB_MOBILE === '1';

const PORT = 9500 + Math.floor(Math.random() * 400);
const PROFILE_DIR = process.env.WB_PROFILE_DIR || ('/tmp/wbux_' + PORT + '_' + Date.now());
const args = [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + PROFILE_DIR,
  'about:blank'
];
if (MOBILE) {
  args.splice(3, 0,
    '--window-size=390,844',
    '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
}
const chrome = spawn('/usr/bin/google-chrome', args, { stdio: 'ignore' });
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

  const WS = require('/home/admin/.openclaw/extensions/wecom-openclaw-plugin/node_modules/ws');
  const ws = new WS(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };

  await send('Page.enable');
  await send('Runtime.enable');
  // 注意：不启用 Network 域（会缓冲响应体，影响测量准确性）
  // 但需要它才能设置 Basic Auth 头
  const needAuth = process.env.CRM_PASS || process.env.CRM_USER;
  if (needAuth) {
    await send('Network.enable');
    const u = process.env.CRM_USER || 'admin';
    const p = process.env.CRM_PASS || '';
    const auth = Buffer.from(u + ':' + p).toString('base64');
    await send('Network.setExtraHTTPHeaders', { headers: { Authorization: 'Basic ' + auth } });
  }

  if (MOBILE) {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  }

  const t0 = Date.now();
  await send('Page.navigate', { url: BASE + PATHNAME });

  let ready = false;
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    const r = await send('Runtime.evaluate', {
      expression: "(()=>{const l=document.getElementById('loader');return l?l.classList.contains('hidden'):false})()",
      returnByValue: true
    });
    if (r.result.value) { ready = true; break; }
  }
  const loadMs = Date.now() - t0;

  // 导航性能（由页面自己测，不受 CDP 干扰）
  const perf = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      nav: (()=>{const n=performance.getEntriesByType('navigation')[0];return n?{
        responseStart:Math.round(n.responseStart),
        domContentLoaded:Math.round(n.domContentLoadedEventEnd),
        load:Math.round(n.loadEventEnd),
        transferSize:Math.round(n.transferSize||0),
        decodedSize:Math.round(n.decodedBodySize||0)}:null})(),
      res: performance.getEntriesByType('resource').map(r=>({
        n:r.name.split('/').pop(), enc:r.encodedBodySize, dec:r.decodedBodySize, d:Math.round(r.duration)})),
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null,
      title: document.title,
      rows: document.querySelectorAll('table tbody tr').length,
      text: (document.body.innerText||'').replace(/\\s+/g,' ').slice(0,80),
      dataSizes: ['COMPANIES','RELATIONS','TECH_V2','V9_REVIEW'].map(k=>{
        const v=window[k]; return k+':'+(Array.isArray(v)?v.length:(v?Object.keys(v).length:0));}).join(', ')
    })`, returnByValue: true
  });
  const m = JSON.parse(perf.result.value);

  console.log('=== ' + (MOBILE ? '移动端 (390x844)' : '桌面端') + ' ===');
  console.log('渲染成功      :', ready);
  console.log('首屏可见耗时  :', (loadMs / 1000).toFixed(2), '秒');
  if (m.nav) {
    console.log('  responseStart:', m.nav.responseStart + 'ms');
    console.log('  DOMContentLoaded:', m.nav.domContentLoaded + 'ms');
    console.log('  load event  :', m.nav.load + 'ms');
  }
  console.log('JS 堆         :', m.heap, 'MB');
  console.log('表格行数      :', m.rows);
  console.log('页面标题      :', m.title);
  console.log('数据集        :', m.dataSizes);
  console.log('正文样本      :', m.text);
  let enc = 0, dec = 0;
  m.res.forEach(r => { enc += r.enc; dec += r.dec; });
  console.log('资源传输      : 解压 ' + (dec / 1048576).toFixed(2) + ' MB → 实传 ' +
    (enc / 1048576).toFixed(2) + ' MB');
  console.log('资源明细:');
  m.res.sort((a, b) => b.enc - a.enc).slice(0, 12).forEach(r =>
    console.log('  ' + r.n.padEnd(26) + (r.dec / 1048576).toFixed(2).padStart(8) + ' MB → ' +
      (r.enc / 1024).toFixed(0).padStart(7) + ' KB   ' + r.d + 'ms'));

  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

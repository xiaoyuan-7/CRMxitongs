// 检查浏览器实际加载的样式表与媒体查询匹配情况
const { spawn } = require('child_process');
const URL_ = process.argv[2];
const PORT = 9950 + Math.floor(Math.random() * 40);
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/ss_' + PORT, 'about:blank'
], { stdio: 'ignore' });
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
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_ });
  await sleep(10000);

  const expr = `(() => {
    const out = { sheets: [], matches: null, mq: [] };
    for (const ss of document.styleSheets) {
      let rules = [];
      try { rules = Array.from(ss.cssRules); } catch(e) { rules = ['CORS:'+e.message]; }
      out.sheets.push({ href: ss.href, ruleCount: rules.length,
        mediaQueries: rules.filter(r=>r.type===4).map(r=>({cond:r.conditionText, inner:r.cssRules?r.cssRules.length:0})) });
      for (const r of rules) {
        if (r.type===4 && r.conditionText.includes('768')) {
          const inner = Array.from(r.cssRules||[]).map(x=>x.cssText.slice(0,110));
          out.mq.push({cond:r.conditionText, hasFilterPanelWidth: inner.some(t=>t.includes('filter-panel')&&t.includes('width'))});
        }
      }
    }
    out.matches = window.matchMedia('(max-width: 768px)').matches;
    // 直接查匹配到的规则来源
    const el = document.querySelector('.filter-panel');
    if (el) {
      const matched = [];
      for (const ss of document.styleSheets) {
        let rules; try { rules = Array.from(ss.cssRules); } catch(e){ continue; }
        const walk = (rs, cond) => {
          for (const r of rs) {
            if (r.type===4) {
              if (r.conditionText.includes('768') && window.matchMedia(r.conditionText).matches) walk(r.cssRules, r.conditionText);
            } else if (r.type===1 && r.selectorText && el.matches(r.selectorText)) {
              if (r.style.width || r.style.position) matched.push({sel:r.selectorText, cond, width:r.style.width, position:r.style.position});
            }
          }
        };
        walk(rules, null);
      }
      out.matched = matched;
    }
    return JSON.stringify(out);
  })()`;
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log(r.result.value);
  ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });

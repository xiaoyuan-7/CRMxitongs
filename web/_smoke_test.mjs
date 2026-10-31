#!/usr/bin/env node
/**
 * web/ smoke test — 抓所有主功能页面 ReferenceError + 数据行数
 * 用法: 先起 server (python3 -m http.server 8765), 然后 node web/_smoke_test.mjs
 *      或: node web/_smoke_test.mjs --port 8765
 */
import pkg from '/mnt/c/Users/Administrator/Desktop/industry-research/web/node_modules/jsdom/lib/api.js';
const { JSDOM, VirtualConsole } = pkg;

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '8765');
const BASE = `http://localhost:${PORT}`;

// 主功能页面 (不含 19 个 _report_*.html 报告页)
const PAGES = [
  { path: '/index.html',          name: 'index 主页' },
  { path: '/customers.html',      name: '客户清单(多维度筛选)' },
  { path: '/dashboard.html',      name: '工作台 Dashboard' },
  { path: '/g2b.html',            name: 'G2B 政府采购' },
  { path: '/anchors.html',        name: '链上主体' },
  { path: '/follow-up.html',      name: '跟进记录' },
  { path: '/reports.html',        name: '报告中心' },
  { path: '/industry-chain.html', name: '产业链视图' },
];

async function testPage(page) {
  const vc = new VirtualConsole();
  const errors = [];
  const warns = [];
  vc.on('jsdomError', e => errors.push(e.detail?.message?.slice(0,200) || String(e).slice(0,200)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0,200)));
  vc.on('warn', (...a) => warns.push('warn: ' + a.join(' ').slice(0,100)));

  let dom;
  try {
    const html = await (await fetch(BASE + page.path)).text();
    dom = new JSDOM(html, {
      url: BASE + page.path,
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true,
      virtualConsole: vc,
    });
  } catch (e) {
    return { page, status: 'FETCH_FAIL', error: e.message };
  }

  // 等所有 script + DOMContentLoaded + 渲染
  await new Promise(r => setTimeout(r, 4000));

  const doc = dom.window.document;
  const tables = doc.querySelectorAll('table');
  const rows = doc.querySelectorAll('table tbody tr');
  const cards = doc.querySelectorAll('.card, .stat-card, [class*="card"], [class*="stat"], [class*="chip"], [class*="item"]');
  const h1 = doc.querySelector('h1')?.textContent?.trim()?.slice(0,60) || '(no h1)';

  // 智能判断: 有 table 但全部 tbody 空 → 表格空
  // 没 table 但有 ≥3 张卡片 → 卡片设计(正常)
  // 都没 → 表格空
  let status;
  const hasTable = tables.length > 0;
  const tableEmpty = hasTable && Array.from(doc.querySelectorAll('table tbody')).every(t => t.children.length === 0);
  const hasCards = cards.length >= 3;
  if (errors.length > 0) status = 'JS_ERR';
  else if (tableEmpty) status = 'TABLE_EMPTY';
  else if (!hasTable && !hasCards) status = 'EMPTY';
  else status = 'OK';

  return {
    page,
    h1,
    tables: tables.length,
    rows: rows.length,
    cards: cards.length,
    errors: errors.length,
    errorList: errors.slice(0, 3),
    status,
  };
}

(async () => {
  console.log(`🚀 web/ smoke test — ${PAGES.length} 个页面`);
  console.log(`📍 Server: ${BASE}\n`);

  const results = [];
  for (const page of PAGES) {
    const r = await testPage(page);
    results.push(r);
  }

  console.log('━'.repeat(80));
  console.log('| 页面 | 状态 | 表格 | 行数 | 卡片 | 错误 |');
  console.log('━'.repeat(80));

  let pass = 0, fail = 0;
  for (const r of results) {
    const ok = r.status === 'OK';
    const icon = r.status === 'OK' ? '✅' :
                 r.status === 'JS_ERR' ? '🔴' :
                 r.status === 'TABLE_EMPTY' ? '🟡' :
                 '⚠️';
    if (ok) pass++; else fail++;
    const p = r.page || {};
    console.log(`| ${(p.name || p.path || '?').padEnd(20)} | ${icon} ${r.status.padEnd(11)} | ${r.tables||0} | ${r.rows||0} | ${r.cards||0} | ${r.errors||0} |`);
    if (r.errors > 0 && r.errorList) {
      r.errorList.forEach(e => console.log(`    └─ ${e.slice(0, 100)}`));
    }
  }

  console.log('━'.repeat(80));
  console.log(`\n📊 结果: ${pass}/${results.length} OK, ${fail} 异常\n`);

  if (fail > 0) {
    console.log('⚠️ 异常页面:');
    results.filter(r => r.status !== 'OK').forEach(r => {
      console.log(`  - ${r.page.name}: ${r.status}`);
    });
    if (results.some(r => r.status === 'JS_ERR')) {
      process.exit(1);
    }
  } else {
    console.log('🎉 所有页面 smoke test 通过!');
    process.exit(0);
  }
})();
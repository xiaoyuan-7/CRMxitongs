/**
 * workbench 数据加载器
 *
 * 为什么不用 <script src="data/xxx.js">：
 *   那些文件是 `window.X = {...}` 形式，浏览器要把 69MB 当**脚本源码**解析
 *   （实测 scriptEval 1126ms vs JSON.parse 241ms，差 4.7 倍），
 *   主线程长时间阻塞 → 手机端白屏 / 标签页被杀。
 *
 * 改用 fetch + JSON.parse：
 *   - 传输层已由 static-server 的 gzip 压缩（69MB → 10MB）
 *   - 解析走 JSON.parse，比脚本求值快一个量级
 *   - 有真实进度反馈，不再是"转圈或白屏"
 *
 * 加载完成后把数据挂到 window.*（与旧 .js 行为一致），再动态注入 app.js。
 */
(function () {
  'use strict';

  // [全局变量名, 文件名, 加载时机]
  //
  // 性能改造（2026-11-01）：原设计 11 个数据集全部首屏一次性加载，
  // 实测首屏传输 67.84MB / 耗时 28 秒（手机端直接打不开）。
  // 现在拆成两阶段：
  //   首屏必需（~35MB）：主页与公司库要用的
  //   按路由懒加载：进入对应页面才拉
  //
  // 各路由依赖（由 app.js 渲染函数实际引用反推）：
  //   renderHome       → Aggregates, Companies, SubTracks, ChainLinks, Overlap28, V9Review
  //   renderCompanies  → Aggregates, Companies, SubTracks
  //   renderTechV2     → TechV2
  //   renderOverlap    → Overlap28
  //   renderLinks      → ChainLinks, Companies
  //   renderV9Review   → V9Review
  //   供应链搜索框     → Relations（24.7MB，仅搜索时需要）
  var FIRST_PAINT = [
    ['_FIELDS', '_fields'],
    ['AGGREGATES', 'aggregates'],
    ['SUB_TRACKS', 'sub_tracks'],
    ['CHAIN_LINKS', 'chain_links'],
    ['OVERLAP_28', 'overlap_28']
  ];

  var LAZY = [
    // companies 是最大的一块（22,765 家，瘦身后 gzip ~2.1MB）。
    // 首页其实不需要它（链主数量已预计算进 aggregates），
    // 所以改成进入公司库/相关页面时才加载。
    ['COMPANIES', 'companies'],
    ['TOP50_CLASSIFIED', 'top50_classified'],
    ['TOP500_UNCLASSIFIED', 'top500_unclassified'],
    ['V9_REVIEW', 'v9_review'],
    ['TECH_V2', 'tech_v2'],
    ['RELATIONS', 'relations'],
    // 公司详情附加字段（addr/biz/desc）—— 2026-11-01 第二轮瘦身
    // 这三个字段只用于详情弹窗与导出，却占了 companies.json 体积的 ~40%
    ['COMPANY_DETAILS', 'company_details']
  ];

  var DATASETS = FIRST_PAINT.concat(LAZY);
  var TOTAL = FIRST_PAINT.length;
  var loaded = 0;
  var failures = [];

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function ensureLoaderUI() {
    var el = document.getElementById('loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loader';
      el.className = 'loader';
      document.body.appendChild(el);
    }
    el.classList.remove('hidden');
    el.innerHTML =
      '<div class="loader-spinner"></div>' +
      '<div class="loader-text" id="wbLoadText">正在加载数据…</div>' +
      '<div class="wb-progress"><div class="wb-progress-fill" id="wbProgressFill"></div></div>' +
      '<div class="loader-text wb-load-sub" id="wbLoadSub">0 / ' + TOTAL + '</div>';
    return el;
  }

  function updateProgress(name, bytes, ms) {
    loaded++;
    var fill = document.getElementById('wbProgressFill');
    var sub = document.getElementById('wbLoadSub');
    var pct = Math.round((loaded / TOTAL) * 100);
    if (fill) fill.style.width = pct + '%';
    if (sub) {
      sub.textContent = loaded + ' / ' + TOTAL + '  ·  ' + pct + '%' +
        (bytes ? '  ·  ' + fmtBytes(bytes) : '') +
        (ms != null ? '  ·  ' + ms + 'ms' : '');
    }
  }

  function loadOne(globalName, fileName) {
    // 用相对路径构造 URL：若页面 URL 里带了 user:pass@ 凭证，fetch 会直接报错
    // ("Request cannot be constructed from a URL that includes credentials")，
    // 所以先取 pathname 拼出纯路径，保留同源 + 相对目录语义。
    var url = new URL('data/' + fileName + '.json', location.href);
    url.username = '';
    url.password = '';
    return fetch(url.toString(), { cache: 'force-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error(fileName + '.json HTTP ' + res.status);
        // 先读文本拿到字节数用于进度显示，再 JSON.parse
        return res.text().then(function (text) {
          var t0 = performance.now();
          var data = JSON.parse(text);
          var ms = Math.round(performance.now() - t0);
          window[globalName] = data;
          updateProgress(fileName, text.length, ms);
          return data;
        });
      })
      .catch(function (err) {
        failures.push(fileName + ': ' + err.message);
        updateProgress(fileName, 0);
        // 单个数据集失败不应让整个站白屏，用空结构兜底
        window[globalName] = /RELATIONS/.test(globalName) ? {} : [];
        throw err;
      });
  }

  // ---- 懒加载：供 app.js 在进入对应路由时调用 ----
  var lazyPromises = {};
  var lazyLoaded = {};

  window.loadDataset = function (globalName) {
    if (lazyLoaded[globalName]) return Promise.resolve(window[globalName]);
    if (lazyPromises[globalName]) return lazyPromises[globalName];
    var entry = null;
    for (var i = 0; i < LAZY.length; i++) {
      if (LAZY[i][0] === globalName) { entry = LAZY[i]; break; }
    }
    if (!entry) return Promise.resolve(window[globalName]);
    lazyPromises[globalName] = loadOne(entry[0], entry[1])
      .then(function (d) { lazyLoaded[globalName] = true; return d; })
      .catch(function () { lazyLoaded[globalName] = true; return window[globalName]; });
    return lazyPromises[globalName];
  };

  function loadApp() {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'app.js?v=2026083101';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('app.js 加载失败')); };
      document.body.appendChild(s);
    });
  }

  function fail(err) {
    var el = document.getElementById('loader');
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML =
      '<div class="loader-text" style="color:#f87171">⚠️ 数据加载失败</div>' +
      '<div class="loader-text wb-load-sub">' + (err && err.message ? err.message : '') + '</div>' +
      (failures.length
        ? '<div class="loader-text wb-load-sub">' + failures.join('<br>') + '</div>'
        : '') +
      '<div class="loader-text wb-load-sub">请检查网络后刷新重试</div>';
  }

  function start() {
    ensureLoaderUI();
    // 只并行拉取首屏必需的数据集；
    // 其余大数据集（relations/tech_v2/v9_review/top50/top500）由 app.js 在进入对应路由时懒加载。
    // 性能改造（2026-11-01）：原实现在这里拉全部 11 个，首屏 67.84MB / 28 秒，手机端直接打不开。
    Promise.all(FIRST_PAINT.map(function (d) { return loadOne(d[0], d[1]); }))
      .then(function () {
        var text = document.getElementById('wbLoadText');
        if (text) text.textContent = '正在启动…';
        return loadApp();
      })
      .then(function () {
        var el = document.getElementById('loader');
        if (el) el.classList.add('hidden');
      })
      .catch(fail);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

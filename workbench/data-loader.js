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

  // 数据文件内容哈希（内容变化 → URL 变化 → 浏览器不可能拿到陈旧缓存）
  // 由 scripts/_stamp_versions.py 自动生成，勿手改。
  var DATA_VERSIONS = {
    "_fields": "555777ba",
    "aggregates": "b108dbc5",
    "sub_tracks": "606f1c61",
    "chain_links": "61a76d19",
    "overlap_28": "d4ace5a1",
    "companies": "91c5fcab",
    "company_details": "963ba02d",
    "top50_classified": "de19f7a3",
    "top500_unclassified": "b1fad2c1",
    "v9_review": "e9111463",
    "tech_v2": "f4896563",
    "relations": "2c22e92c",
  };

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
    ['TOP50_CLASSIFIED', 'top50_classified'],
    ['TOP500_UNCLASSIFIED', 'top500_unclassified'],
    ['V9_REVIEW', 'v9_review'],
    ['TECH_V2', 'tech_v2'],
    ['RELATIONS', 'relations']
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
    // 带内容哈希版本号：数据文件更新后 URL 变化，浏览器不可能再拿到陈旧缓存。
    // （2026-11-01：之前用 cache:'force-cache' + 固定 URL，
    //  手机上一直跑旧版数据，首屏拉到 67MB 打不开。）
    var ver = DATA_VERSIONS[fileName];
    if (ver) url.searchParams.set('v', ver);
    // cache 用 'default'：命中本地缓存就秒开，没命中就走协商请求（304）。
    // 不要用 'force-cache' —— 它会跳过协商，导致数据更新后仍返回旧内容。
    return fetch(url.toString(), { cache: 'default' })
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

  // ---- 公司库分页查询（2026-11-01）----
  //
  // companies.json 22,765 家瘦身后 gzip 仍有 2.19MB，公网 ~80KB/s → 进页面等 30 秒。
  // 改为服务端筛选+分页：每页只回 50 条（gzip ~6KB）。
  window.fetchCompaniesPage = function (qs) {
    var url = new URL('workbench/api/companies?' + qs, location.href);
    url.username = '';
    url.password = '';
    return fetch(url.toString(), { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; });
  };

  // ---- 单条公司查询（含列表字段）----
  //
  // 拜访清单/一页通只需要少量具体公司，不再为了它们下载全量 companies.json。
  // 服务端按 code 返回一条（列表字段 + 详情字段）。
  var byCodeCache = {};
  window.fetchCompanyByCode = function (code) {
    if (!code) return Promise.resolve(null);
    if (byCodeCache[code]) return Promise.resolve(byCodeCache[code]);
    var url = new URL('workbench/api/companies?code=' + encodeURIComponent(code), location.href);
    url.username = '';
    url.password = '';
    return fetch(url.toString(), { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var c = data && data.item ? data.item : null;
        if (c) byCodeCache[code] = c;
        return c;
      })
      .catch(function () { return null; });
  };

  // ---- 服务端搜索（2026-11-01）----
  //
  // 地址字段在 company_details.json（3.9MB）里，前端拉全量才能搜，
  // 公网 tunnel 带宽窄 → 要 50 秒。改为服务端搜，只回传匹配的 code 列表。
  var searchCache = {};
  var searchTimer = null;
  window.searchCompaniesByServer = function (q) {
    q = String(q || '').trim();
    if (!q) { searchCache = {}; return Promise.resolve(null); }
    if (searchCache[q]) return Promise.resolve(searchCache[q]);
    return new Promise(function (resolve) {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        var url = new URL('workbench/api/search?q=' + encodeURIComponent(q), location.href);
        url.username = '';
        url.password = '';
        fetch(url.toString(), { cache: 'no-store' })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            if (!data || !data.codes) { resolve(null); return; }
            var set = new Set(data.codes);
            searchCache[q] = set;
            resolve(set);
          })
          .catch(function () { resolve(null); });
      }, 180);
    });
  };

  // ---- 单条公司详情查询（2026-11-01）----
  // company_details.json 有 3.9MB，公网 tunnel 带宽窄，点开一家企业要等 50 秒。
  // 静态服务器提供 /workbench/api/company/<code> 单条查询（约 0.3KB），
  // 详情弹窗改走这个接口；全量 JSON 只在搜索/导出时才会用到。
  var detailCache = {};
  window.fetchCompanyDetail = function (code) {
    if (!code) return Promise.resolve(null);
    if (detailCache[code]) return Promise.resolve(detailCache[code]);
    var url = new URL('workbench/api/company/' + encodeURIComponent(code), location.href);
    url.username = '';
    url.password = '';
    return fetch(url.toString(), { cache: 'default' })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (d) {
        if (d && !d.error) detailCache[code] = d;
        return d || null;
      })
      .catch(function () { return null; });
  };

  function loadApp() {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'app.js?v=20261101-2';
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

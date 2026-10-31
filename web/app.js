// ==========================================================
// 对公行业研究 · 浏览器
// 主逻辑:导航 / Markdown 渲染 / 搜索 / 快捷键
// ==========================================================

(function () {
  'use strict';

  // 配置 marked.js
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      gfm: true,
      breaks: false,
      headerIds: true,
      mangle: false,
      smartLists: false,
      highlight: function (code, lang) {
        // 不引入 highlight.js,保持轻量
        return code;
      },
    });
  }

  // 状态
  const state = {
    currentTrack: null,
    currentDoc: null,
    history: [],
  };

  // 从 localStorage 读取访问历史
  try {
    const saved = localStorage.getItem('research-history');
    if (saved) state.history = JSON.parse(saved);
  } catch (e) {
    state.history = [];
  }

  // ==========================================================
  // 渲染导航
  // ==========================================================

  function renderNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = '';

    RESEARCH_DATA.forEach((track) => {
      const trackEl = document.createElement('div');
      trackEl.className = 'track expanded';
      trackEl.dataset.trackId = track.id;

      const priorityClass =
        track.priority === '主攻'
          ? 'main'
          : track.priority === '储备'
          ? 'reserve'
          : 'track';

      const priorityLabel =
        track.priority === '主攻'
          ? '主攻'
          : track.priority === '储备'
          ? '储备'
          : '跟踪';

      trackEl.innerHTML = `
        <div class="track-header">
          <span class="track-icon">${track.icon}</span>
          <span class="track-name">${track.name}</span>
          <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
          <span class="track-arrow">▶</span>
        </div>
        <div class="track-docs">
          ${track.docs
            .map(
              (doc) => `
            <a class="doc-link"
               data-track-id="${track.id}"
               data-doc-id="${doc.id}"
               href="#${track.id}/${doc.id}">
              ${doc.title}
            </a>
          `
            )
            .join('')}
        </div>
      `;

      // 切换展开
      trackEl.querySelector('.track-header').addEventListener('click', () => {
        trackEl.classList.toggle('expanded');
      });

      // 文档点击
      trackEl.querySelectorAll('.doc-link').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const trackId = link.dataset.trackId;
          const docId = link.dataset.docId;
          loadDoc(trackId, docId);
          // 移动端:关闭侧边栏
          if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('overlay').classList.remove('active');
          }
        });
      });

      nav.appendChild(trackEl);
    });
  }

  // ==========================================================
  // 加载文档
  // ==========================================================

  function loadDoc(trackId, docId, pushHistory = true) {
    const track = RESEARCH_DATA.find((t) => t.id === trackId);
    if (!track) return;
    const doc = track.docs.find((d) => d.id === docId);
    if (!doc) return;

    state.currentTrack = trackId;
    state.currentDoc = docId;

    // 更新激活状态
    document.querySelectorAll('.doc-link').forEach((link) => {
      link.classList.toggle(
        'active',
        link.dataset.trackId === trackId && link.dataset.docId === docId
      );
    });

    // 自动展开对应 track
    document.querySelectorAll('.track').forEach((el) => {
      el.classList.toggle('expanded', el.dataset.trackId === trackId);
    });

    // 渲染 markdown
    const html = marked.parse(doc.content || '');
    const content = document.getElementById('content');
    content.innerHTML = `
      <div class="markdown-body">
        ${html}
      </div>
    `;

    // 更新面包屑
    document.getElementById('breadcrumb').innerHTML = `
      <span class="breadcrumb-item">${track.icon} ${track.name}</span>
      <span class="breadcrumb-item">${doc.title}</span>
    `;

    // 更新 URL
    if (pushHistory && window.location.hash !== `#${trackId}/${docId}`) {
      history.pushState(null, '', `#${trackId}/${docId}`);
    }

    // 滚动到顶部
    content.scrollTop = 0;
    window.scrollTo(0, 0);

    // 业务状态登记增强(行内可编辑 + 工具栏)
    enhanceFollowUpTable();

    // 保存访问历史
    const key = `${trackId}/${docId}`;
    state.history = [key, ...state.history.filter((k) => k !== key)].slice(0, 20);
    try {
      localStorage.setItem('research-history', JSON.stringify(state.history));
    } catch (e) {}

    // 更新上一篇下一篇按钮
    updateNavButtons();
  }

  // ==========================================================
  // 首页
  // ==========================================================

  function renderHome() {
    const content = document.getElementById('content');
    const totalDocs = RESEARCH_DATA.reduce((s, t) => s + t.docs.length, 0);
    const totalCompanies = 6410;
    const lastUpdate = '2026-07-20';

    content.innerHTML = `
      <div class="welcome">
        <div class="welcome-hero">
          <h1>🏦 对公行业研究 · 浏览器</h1>
          <p>深圳银行对公客户经理 · 1-2 个赛道专家计划</p>
        </div>

        <div class="welcome-section">
          <h2>🧰 主功能</h2>
          <div class="quick-actions">
            <a class="quick-action" href="dashboard.html">
              <span class="quick-action-icon">🚀</span>
              <span class="quick-action-text"><strong>工作台 Dashboard</strong><br/><span style="font-size:12px;color:#888;">今日该联系 · 关键指标卡</span></span>
            </a>
            <a class="quick-action" href="customers.html">
              <span class="quick-action-icon">📋</span>
              <span class="quick-action-text"><strong>客户清单</strong><br/><span style="font-size:12px;color:#888;">5971 家多维度筛选(赛道/规模/关系)</span></span>
            </a>
            <a class="quick-action" href="g2b.html">
              <span class="quick-action-icon">🏛️</span>
              <span class="quick-action-text"><strong>G2B 政府采购</strong><br/><span style="font-size:12px;color:#888;">42,940 条招投标 + 中标专业户</span></span>
            </a>
            <a class="quick-action" href="anchors.html">
              <span class="quick-action-icon">👑</span>
              <span class="quick-action-text"><strong>链上主体</strong><br/><span style="font-size:12px;color:#888;">38,655 链主 + 关系深度</span></span>
            </a>
            <a class="quick-action" href="follow-up.html">
              <span class="quick-action-icon">📞</span>
              <span class="quick-action-text"><strong>跟进记录</strong><br/><span style="font-size:12px;color:#888;">P0/P1/P2 · 今日/逾期提醒</span></span>
            </a>
            <a class="quick-action" href="reports.html">
              <span class="quick-action-icon">📊</span>
              <span class="quick-action-text"><strong>报告中心</strong><br/><span style="font-size:12px;color:#888;">v3 7 份 + v2 12 份专题报告</span></span>
            </a>
            <a class="quick-action" href="industry-chain.html">
              <span class="quick-action-icon">🔗</span>
              <span class="quick-action-text"><strong>产业链视图</strong><br/><span style="font-size:12px;color:#888;">SVG 关系图 + 上下游分层</span></span>
            </a>
          </div>
        </div>

        <div class="welcome-section">
          <h2>🚀 新手 3 步走</h2>
          <div class="quick-actions">
            <a class="quick-action" href="#medical-devices/industry-map">
              <span class="quick-action-icon">1️⃣</span>
              <span class="quick-action-text"><strong>学一个赛道</strong><br/><span style="font-size:12px;color:#888;">点"医疗器械 · 行业地图" 30 分钟掌握一个赛道</span></span>
            </a>
            <a class="quick-action" href="#medical-devices/potential-customers">
              <span class="quick-action-icon">2️⃣</span>
              <span class="quick-action-text"><strong>看真实客户</strong><br/><span style="font-size:12px;color:#888;">从"潜力客户名单 100+ 家"拿到可联系名单</span></span>
            </a>
            <a class="quick-action" href="#medical-devices/visit-checklist">
              <span class="quick-action-icon">3️⃣</span>
              <span class="quick-action-text"><strong>拿拜访清单</strong><br/><span style="font-size:12px;color:#888;">带"首次拜访清单"上门,3 句话问出关键信息</span></span>
            </a>
          </div>
        </div>

        <div class="welcome-section">
          <h2>🎯 本周重点(2026-07-20)</h2>
          <div style="background: #fff; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #10b981; line-height: 1.8;">
            <p><strong>📊 数据状态:</strong> 天眼查补全 <strong>${totalCompanies}/6460 = 100%</strong> (v3 跑完)</p>
            <p><strong>🏷️ 已分类:</strong> 17 个一级行业 · 29 个二级细分 · 45 个 MD 文档</p>
            <p><strong>⚠️ 提醒:</strong> "99-其他"还有 1870 家未细分,需客户经理手动筛(按注册资本排序看 Top 100)</p>
            <p><strong>🔄 下次更新:</strong> 每月 1 次重跑天眼查(详见 <code>名单/README.md</code>)</p>
          </div>
        </div>

        <div class="welcome-section">
          <h2>📚 赛道列表</h2>
          <div class="track-cards">
            ${RESEARCH_DATA.map(
              (track) => `
              <div class="track-card" data-track-id="${track.id}">
                <div class="track-card-header">
                  <span class="track-card-icon">${track.icon}</span>
                  <div class="track-card-title">
                    <h2>${track.name}</h2>
                    <p class="track-card-desc">${track.description}</p>
                  </div>
                </div>
                <div class="track-card-stats">
                  <div class="stat">
                    <span class="stat-value">${track.docs.length}</span>
                    <span>篇文档</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value">${track.priority}</span>
                    <span>优先级</span>
                  </div>
                </div>
              </div>
            `
            ).join('')}
          </div>
        </div>

        <div class="welcome-section">
          <h2>📇 6410 家客户清单(按行业分类)</h2>
          <div class="quick-actions">
            <a class="quick-action" href="#company-list/medical-devices">
              <span class="quick-action-icon">🏥</span>
              <span class="quick-action-text">医疗器械 90 家</span>
            </a>
            <a class="quick-action" href="#company-list/cross-border-ecommerce">
              <span class="quick-action-icon">🌍</span>
              <span class="quick-action-text">跨境电商 14 家</span>
            </a>
            <a class="quick-action" href="#company-list/new-energy-storage">
              <span class="quick-action-icon">⚡</span>
              <span class="quick-action-text">新能源储能 35 家</span>
            </a>
            <a class="quick-action" href="#company-list/robotics-ai">
              <span class="quick-action-icon">🤖</span>
              <span class="quick-action-text">机器人 AI 56 家</span>
            </a>
            <a class="quick-action" href="#company-list/supply-chain">
              <span class="quick-action-icon">🔌</span>
              <span class="quick-action-text">供应链电子 380 家</span>
            </a>
            <a class="quick-action" href="#company-list/other">
              <span class="quick-action-icon">📦</span>
              <span class="quick-action-text">其他待筛 1870 家</span>
            </a>
          </div>
          <p style="color: var(--color-text-muted); font-size: 13px; margin-top: 12px;">
            📂 左侧导航"已分类"目录下,按 17 个一级行业组织的细分客户清单。每个细分有注册资本排序 + 银行产品建议。
          </p>
        </div>

        <div class="welcome-section">
          <h2>💡 使用提示</h2>
          <ul style="line-height: 2; color: var(--color-text-muted); padding-left: 24px;">
            <li>左侧导航切换文档 · 点击赛道标题展开/收起</li>
            <li>右上角 <strong>Ctrl/⌘ + K</strong> 唤起搜索(跨所有文档)</li>
            <li>顶部 <strong>← →</strong> 切换上一篇下一篇</li>
            <li>底部 <strong>🖨️ 打印</strong> 可打印当前文档(支持转 PDF)</li>
            <li>移动端:左上角 ☰ 切换侧边栏</li>
          </ul>
        </div>

        <div class="welcome-section" style="text-align: center; color: var(--color-text-muted); font-size: 13px;">
          📊 共 ${RESEARCH_DATA.length} 个赛道 · ${totalDocs} 篇文档 · ${totalCompanies} 家天眼查补全企业 · 最后更新 ${lastUpdate}
        </div>
      </div>
    `;

    // 卡片点击
    content.querySelectorAll('.track-card').forEach((card) => {
      card.addEventListener('click', () => {
        const trackId = card.dataset.trackId;
        const track = RESEARCH_DATA.find((t) => t.id === trackId);
        if (track && track.docs.length > 0) {
          loadDoc(trackId, track.docs[0].id);
        }
      });
    });

    document.getElementById('breadcrumb').innerHTML =
      '<span class="breadcrumb-item">首页</span>';
    state.currentTrack = null;
    state.currentDoc = null;
  }

  // ==========================================================
  // 上一篇下一篇
  // ==========================================================

  function getFlatDocs() {
    const list = [];
    RESEARCH_DATA.forEach((track) => {
      track.docs.forEach((doc) => {
        list.push({ trackId: track.id, docId: doc.id, title: doc.title });
      });
    });
    return list;
  }

  function updateNavButtons() {
    const flat = getFlatDocs();
    const idx = flat.findIndex(
      (d) => d.trackId === state.currentTrack && d.docId === state.currentDoc
    );
    const prevBtn = document.getElementById('prevDocBtn');
    const nextBtn = document.getElementById('nextDocBtn');
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx === -1 || idx >= flat.length - 1;
  }

  function navigateDoc(direction) {
    const flat = getFlatDocs();
    const idx = flat.findIndex(
      (d) => d.trackId === state.currentTrack && d.docId === state.currentDoc
    );
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < flat.length) {
      loadDoc(flat[newIdx].trackId, flat[newIdx].docId);
    }
  }

  // ==========================================================
  // 搜索
  // ==========================================================

  let searchResultsEl = null;

  function setupSearch() {
    const input = document.getElementById('searchInput');

    // 创建结果容器
    searchResultsEl = document.createElement('div');
    searchResultsEl.className = 'search-results';
    input.parentElement.appendChild(searchResultsEl);

    let debounceTimer = null;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => performSearch(input.value.trim()), 150);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) performSearch(input.value.trim());
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box')) {
        searchResultsEl.classList.remove('active');
      }
    });
  }

  function performSearch(query) {
    if (!query || query.length < 2) {
      searchResultsEl.classList.remove('active');
      return;
    }

    const results = [];
    const lowerQuery = query.toLowerCase();

    RESEARCH_DATA.forEach((track) => {
      track.docs.forEach((doc) => {
        const content = doc.content || '';
        const lowerContent = content.toLowerCase();
        const idx = lowerContent.indexOf(lowerQuery);
        if (idx === -1) return;

        // 计算匹配次数
        const matches = (lowerContent.match(new RegExp(lowerQuery, 'g')) || [])
          .length;

        // 提取片段
        const start = Math.max(0, idx - 50);
        const end = Math.min(content.length, idx + 100);
        let snippet = content.slice(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';

        // 高亮
        const regex = new RegExp(
          '(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')',
          'gi'
        );
        snippet = snippet.replace(regex, '<mark>$1</mark>');

        // 提取标题位置
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const titleContext = titleMatch ? titleMatch[1] : '';

        results.push({
          trackId: track.id,
          trackName: track.name,
          trackIcon: track.icon,
          docId: doc.id,
          docTitle: doc.title,
          snippet: snippet.replace(/\n/g, ' ').slice(0, 200),
          matches,
        });
      });
    });

    // 排序:匹配数多者优先
    results.sort((a, b) => b.matches - a.matches);

    if (results.length === 0) {
      searchResultsEl.innerHTML = `
        <div class="search-result">
          <div class="search-result-snippet">未找到 "${escapeHtml(query)}" 相关结果</div>
        </div>
      `;
      searchResultsEl.classList.add('active');
      return;
    }

    searchResultsEl.innerHTML = results
      .slice(0, 20)
      .map(
        (r) => `
        <div class="search-result"
             data-track-id="${r.trackId}"
             data-doc-id="${r.docId}">
          <div class="search-result-title">
            ${r.trackIcon} ${r.trackName} · ${r.docTitle}
            <span style="color: var(--color-text-muted); font-weight: normal; font-size: 11px;">
              ${r.matches} 处匹配
            </span>
          </div>
          <div class="search-result-snippet">${r.snippet}</div>
        </div>
      `
      )
      .join('');

    searchResultsEl.classList.add('active');

    // 点击结果
    searchResultsEl.querySelectorAll('.search-result').forEach((el) => {
      el.addEventListener('click', () => {
        const trackId = el.dataset.trackId;
        const docId = el.dataset.docId;
        if (trackId && docId) {
          loadDoc(trackId, docId);
          searchResultsEl.classList.remove('active');
          document.getElementById('searchInput').value = '';
        }
      });
    });
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // ==========================================================
  // 移动端菜单
  // ==========================================================

  function setupMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // ==========================================================
  // 快捷键
  // ==========================================================

  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/⌘ + K 搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
        return;
      }

      // Esc 关闭搜索
      if (e.key === 'Escape') {
        searchResultsEl.classList.remove('active');
        document.getElementById('searchInput').blur();
        return;
      }

      // Alt + ← / → 切换文档
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateDoc(-1);
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        navigateDoc(1);
      }

      // Home 键回首页
      if (e.key === 'Home' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        renderHome();
      }
    });
  }

  // ==========================================================
  // 按钮事件
  // ==========================================================

  function setupButtons() {
    document.getElementById('printBtn').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('homeBtn').addEventListener('click', () => {
      renderHome();
      history.pushState(null, '', '#');
    });

    document.getElementById('prevDocBtn').addEventListener('click', () => {
      navigateDoc(-1);
    });

    document.getElementById('nextDocBtn').addEventListener('click', () => {
      navigateDoc(1);
    });
  }



  // ==========================================================
  // 业务状态登记表(用户编辑存 localStorage)
  // 列: 开户 | 授信 | 金额(万) | 代发 | 团队 | 详情
  // ==========================================================
  const FOLLOW_UP_STORAGE_KEY = 'v3-follow-up-table';
  const FOLLOW_UP_FIELDS = ['开户', '授信', '金额', '代发', '团队', '详情'];
  const FOLLOW_UP_FIELD_LABELS = {
    '开户': '是否开户',
    '授信': '是否授信',
    '金额': '授信金额(万)',
    '代发': '是否代发',
    '团队': '对公团队',
    '详情': '更多详情',
  };

  function loadFollowUpStorage() {
    try {
      return JSON.parse(localStorage.getItem(FOLLOW_UP_STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveFollowUpStorage(data) {
    localStorage.setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify(data));
  }

  function getFollowUpValue(company, field) {
    const data = loadFollowUpStorage();
    return (data[company] || {})[field] || '';
  }

  function setFollowUpValue(company, field, value) {
    const data = loadFollowUpStorage();
    if (!data[company]) data[company] = {};
    data[company][field] = value;
    // 清理空值
    if (!value) delete data[company][field];
    if (Object.keys(data[company]).length === 0) delete data[company];
    saveFollowUpStorage(data);
  }

  // 找 markdown 表格里"客户清单"(11 列且含"开户"列)
  function findCustomerTables() {
    const tables = document.querySelectorAll('.markdown-body table');
    const found = [];
    tables.forEach((table) => {
      const headerCells = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
      if (headerCells.length < 11) return;
      const headers = Array.from(headerCells).map((h) => h.textContent.trim());
      if (!headers.includes('开户')) return;
      found.push(table);
    });
    return found;
  }

  // 增强客户清单表格:后 6 列可编辑
  function enhanceFollowUpTable() {
    const tables = findCustomerTables();
    if (tables.length === 0) return;

    tables.forEach((table) => {
      const dataRows = table.querySelectorAll('tr');
      dataRows.forEach((row, idx) => {
        if (idx === 0) return; // 跳表头
        const cells = row.querySelectorAll('th, td');
        if (cells.length < 11) return;
        const nameCell = cells[1];
        const company = nameCell.textContent.trim();
        if (!company) return;

        // 后 6 列(索引 5-10):开户/授信/金额/代发/团队/详情
        for (let i = 0; i < 6; i++) {
          const cell = cells[5 + i];
          const field = FOLLOW_UP_FIELDS[i];
          const stored = getFollowUpValue(company, field);
          const display = stored || '—';
          cell.textContent = display;
          if (stored) {
            cell.classList.add('has-value');
            cell.title = `已编辑: ${stored}`;
          } else {
            cell.classList.remove('has-value');
            cell.title = '点击编辑';
          }
          cell.contentEditable = 'true';
          cell.dataset.company = company;
          cell.dataset.field = field;
          cell.addEventListener('blur', handleCellEdit);
          cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              cell.blur();
            }
          });
        }
      });
    });

    // 加工具栏(只加一次, 标记避免重复)
    if (!document.getElementById('followUpToolbar')) {
      addFollowUpToolbar();
    }
    updateToolbarCounter();
    
    // 有客户清单表格 → 显示工具栏
    const toolbar = document.getElementById('followUpToolbar');
    if (toolbar && tables.length > 0) {
      toolbar.classList.add('active');
    } else if (toolbar) {
      toolbar.classList.remove('active');
    }
  }

  function handleCellEdit(e) {
    const cell = e.target;
    const company = cell.dataset.company;
    const field = cell.dataset.field;
    let value = cell.textContent.trim();
    if (value === '—') value = '';
    setFollowUpValue(company, field, value);
    cell.textContent = value || '—';
    if (value) {
      cell.classList.add('has-value');
      cell.title = `已编辑: ${value}`;
    } else {
      cell.classList.remove('has-value');
      cell.title = '点击编辑';
    }
    // 视觉反馈
    cell.style.background = '#d4edda';
    setTimeout(() => { cell.style.background = ''; }, 600);
    updateToolbarCounter();
  }

  function updateToolbarCounter() {
    const counter = document.getElementById('followUpCount');
    if (!counter) return;
    const data = loadFollowUpStorage();
    const totalCells = Object.values(data).reduce((sum, c) => sum + Object.keys(c).length, 0);
    const totalCompanies = Object.keys(data).length;
    counter.textContent = `${totalCompanies} 家公司 · ${totalCells} 个字段已登记`;
  }

  function addFollowUpToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'followUpToolbar';
    toolbar.className = 'followup-toolbar';
    toolbar.innerHTML = `
      <div class="followup-info">
        <span class="followup-icon">📞</span>
        <strong>业务状态登记(浏览器本地)</strong>
        <span id="followUpCount" class="followup-count">0 家公司</span>
      </div>
      <div class="followup-actions">
        <button id="fuExportBtn" class="followup-btn" title="导出当前所有状态为 CSV">📥 导出 CSV</button>
        <button id="fuImportBtn" class="followup-btn" title="导入 CSV(覆盖当前编辑)">📤 导入 CSV</button>
        <button id="fuClearBtn" class="followup-btn followup-btn-danger" title="清除所有编辑">🗑️ 清除</button>
        <input type="file" id="fuFileInput" accept=".csv" style="display:none">
      </div>
      <div class="followup-hint">
        💡 点击任意"<span style="color:#10b981">开户/授信/金额/代发/团队/详情</span>"列单元格即可编辑<br>
        💾 数据存当前浏览器 localStorage · 换浏览器/电脑会丢 · 用"导出 CSV"备份
      </div>
    `;
    document.body.appendChild(toolbar);

    document.getElementById('fuExportBtn').addEventListener('click', exportFollowUpCSV);
    document.getElementById('fuImportBtn').addEventListener('click', () => {
      document.getElementById('fuFileInput').click();
    });
    document.getElementById('fuClearBtn').addEventListener('click', clearFollowUp);
    document.getElementById('fuFileInput').addEventListener('change', importFollowUpCSV);
  }

  function exportFollowUpCSV() {
    const data = loadFollowUpStorage();
    const companies = Object.keys(data);
    if (companies.length === 0) {
      alert('暂无编辑数据可导出');
      return;
    }
    // CSV 表头: 中文列名(跟 _follow_up.csv 一致)
    const headers = ['企业名称', '是否开户', '是否授信', '授信金额(万)', '是否代发', '对公团队', '更多详情'];
    const rows = [headers.join(',')];
    companies.forEach((company) => {
      const v = data[company];
      const row = [
        csvEscape(company),
        csvEscape(v['开户'] || ''),
        csvEscape(v['授信'] || ''),
        csvEscape(v['金额'] || ''),
        csvEscape(v['代发'] || ''),
        csvEscape(v['团队'] || ''),
        csvEscape(v['详情'] || ''),
      ];
      rows.push(row.join(','));
    });
    const csv = '\\uFEFF' + rows.join('\\n'); // BOM for Excel 中文识别
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `_follow_up_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(s) {
    s = String(s || '');
    if (s.includes(',') || s.includes('"') || s.includes('\\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function importFollowUpCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let text = ev.target.result;
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // 去 BOM
        const lines = text.split(/\\r?\\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          alert('CSV 格式错误(至少需要表头+1行数据)');
          return;
        }
        const header = parseCSVLine(lines[0]);
        const requiredHeaders = ['企业名称', '是否开户', '是否授信', '授信金额(万)', '是否代发', '对公团队', '更多详情'];
        const missing = requiredHeaders.filter((h) => !header.includes(h));
        if (missing.length > 0) {
          alert('CSV 缺少必需列: ' + missing.join(', '));
          return;
        }
        // 确认覆盖
        if (!confirm(`即将从 ${file.name} 导入 ${lines.length - 1} 行数据\n\n这会覆盖当前 localStorage 中的所有编辑。\n\n继续?`)) {
          return;
        }
        const data = {};
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCSVLine(lines[i]);
          if (cells.length < 7) continue;
          const company = cells[0].trim();
          if (!company) continue;
          data[company] = {
            '开户': cells[1].trim(),
            '授信': cells[2].trim(),
            '金额': cells[3].trim(),
            '代发': cells[4].trim(),
            '团队': cells[5].trim(),
            '详情': cells[6].trim(),
          };
          // 清理全空对象
          if (Object.values(data[company]).every((v) => !v)) delete data[company];
        }
        saveFollowUpStorage(data);
        updateToolbarCounter();
        // 重渲染当前页面
        if (state.currentTrack && state.currentDoc) {
          loadDoc(state.currentTrack, state.currentDoc, false);
        }
        alert(`✅ 导入成功!共 ${Object.keys(data).length} 家公司`);
      } catch (err) {
        alert('导入失败: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
    // 重置 input 让同名文件能再次导入
    e.target.value = '';
  }

  function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuote) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') {
          inQuote = false;
        } else {
          cur += c;
        }
      } else {
        if (c === '"') inQuote = true;
        else if (c === ',') { result.push(cur); cur = ''; }
        else cur += c;
      }
    }
    result.push(cur);
    return result;
  }

  function clearFollowUp() {
    if (!confirm('确定要清除所有编辑吗?\n\n建议先"导出 CSV"备份。')) return;
    localStorage.removeItem(FOLLOW_UP_STORAGE_KEY);
    updateToolbarCounter();
    if (state.currentTrack && state.currentDoc) {
      loadDoc(state.currentTrack, state.currentDoc, false);
    }
  }

  // ==========================================================
  // 路由
  // ==========================================================

  function handleRoute() {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      renderHome();
      return;
    }
    const [trackId, docId] = hash.split('/');
    if (trackId && docId) {
      loadDoc(trackId, docId, false);
    } else {
      renderHome();
    }
  }

  // ==========================================================
  // 初始化
  // ==========================================================

  function init() {
    renderNav();
    setupSearch();
    setupMobileMenu();
    setupKeyboard();
    setupButtons();

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
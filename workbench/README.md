# 对公拓客工作台

> 银行客户经理的拓客决策辅助 · 不再翻 22,765 家"裸数据"

## 🎯 这是什么

不是公司检索网站,是**对公拓客决策工作台**。核心问题:
- "今天该拜访谁?" → 三圈重叠 28 家(三重认定金子)
- "这家公司值不值得花时间?" → 单页画像卡(法人/科创/专利/链主)
- "它在产业链里什么位置?" → 链主网络(4 类链主)
- "这周我能攻下哪些赛道?" → 14 赛道分布

## 🚀 启动

```bash
cd industry-research/workbench
python3 -m http.server 8001
# 浏览器 http://localhost:8001/
```

**必须用 HTTP 协议**,不要直接双击 index.html(file:// 下 localStorage 可能不可用)。

## 📁 文件结构

```
workbench/
├── index.html            # 入口 HTML
├── styles.css            # 深色主题样式
├── app.js                # 核心逻辑(路由/筛选/详情/拜访清单)
├── data/
│   ├── companies.js      # 22,765 家瘦字段(13 MB,首屏加载)
│   ├── aggregates.js     # 14 赛道 + 18 行业 + 20 城市 + 30 区县
│   ├── overlap_28.js     # 三圈重叠 28 家金子
│   ├── top50_classified.js   # 已分类 Top 50
│   ├── top500_unclassified.js  # 未分类 Top 500
│   └── _fields.js        # 字段名映射
├── scripts/
│   └── _build_workbench_data.py  # 数据生成脚本(明天天眼查跑完后重跑)
└── README.md
```

## 🔄 重建数据

**何时需要?**
- 主桌面数据更新(天眼查补全后)
- v9 分类更新(新版本分类)
- 字段调整

**怎么重建?**

```bash
cd industry-research/workbench
python3 scripts/_build_workbench_data.py
```

脚本会:
1. 加载 v9 分类(5,971 家,UTF-8)
2. 加载主表 22,777 家(GBK,header 跳过 3 行声明)
3. 按 `统一社会信用代码` JOIN
4. 输出 6 个 JSON + 6 个 JS 全局变量

**踩坑提醒**(脚本注释里有):
- 主表是 GBK,字段名 mojibake,**直接按 index 取**(别尝试匹配字段名)
- 跳过前 3 行声明(推广+空行)
- 邮箱字段多个用 `;` 分隔,只取第一个
- 注册资本单位混乱(可能"5000万"也可能"5000.0"),统一 parse_wan 转万元

## 🗺️ 路由

| 路径 | 功能 | 数据规模 |
|---|---|---|
| `#/` | 工作台(今日行动) | 4 张统计卡 + 4 张行动卡 + 14 赛道分布 |
| `#/tech-v2` | **公私联动池 (科创企业总表_分类v2)** | **4097 家** · 按 banking_priority 排序 · 6 维度筛选 + 详情弹窗 + CSV 导出 |
| `#/companies` | 公司库(筛选 + 表格) | 22,765 家,50/页 |
| `#/companies?track=半导体` | 预筛选某赛道 | 单赛道 |
| `#/overlap` | 三圈重叠 28 家 | 全表展示 |
| `#/links` | 链主网络(占位) | 4 个 CSV 外链 |
| `#/visits` | 拜访清单 + 一键导出 | 列表 / CSV / JSON |
| `#/v9-review` | v9 分类复检 + 人工 override | 525 家 REVIEW / 4156 总行 |
| `#/research` | 行业研究(外链) | 跳到 ../web/ |

## 🤝 公私联动池 (新 · 2026-08-30)

**输入**: `/mnt/c/Users/Administrator/Desktop/名单/科创企业总表_分类v2.xls` (28 sheets, 4097 家)

**为什么做**: xls 里有招行 4097 家宝安科创企业, **法人都是零售客户**。零售经理 + 对公经理公私联动转化对公账户 + 授信 + 高价值产品。

**优质分 banking_priority (0-100)**:
- 赛道优先级 (S/A/B/C → 30/22/15/8)
- 公私联动挂钩 (有RM=25 / 有网点=15 / 有客户号=8)
- 政策标签 (专精特新=20 / 高新=15 / PEVC=12 / 新动能=10, 封顶20)
- 对公增量空间 (未开户=15 / 未授信+8)
- 分类置信度 (high=10 / medium=6 / low=3)
- 数据质量异常 (+5 但弹黄警告)

**数据快照** (按导入时间 2026-08-30):
| 维度 | 数字 | 说明 |
|---|---|---|
| 总量 | 4,097 | 宝安科创企业 |
| 已挂钩法人 RM | 655 (16%) | 已有对私关系, 可立刻联动 |
| 已挂钩网点 | 1,833 (45%) | 知道是哪个零售网点 |
| 高新企业 | 4,001 (97.7%) | 几乎是全部 |
| 国家级专精特新 | 4 | 真认定小巨人, 金子里的金子 |
| PEVC 已投 | 147 | 资本背书, 可推投贷联动 |
| 新动能 | 192 | 战略层 3 / 价值层 171 / 简单是 18 |
| 已开户 | 15 (0.4%) | 我行对公账户 |
| **增量空间** | **4,082 (99.6%)** | **主战场** |

**优质分分布**:
- ≥90 (S+): 91 家 ← 下周主打拜访
- 80-89 (A): 321 家 ← 第二批
- 60-79 (B): 1653 家 ← 日常拓客
- 40-59 (C): 1962 家 ← 暂存
- <40 (D): 9 家 ← 放弃

**用法**:
1. 启动工作台 → 顶部导航 `🤝 公私联动`
2. 默认按 banking_priority DESC 排, Top 1 是最该拜访的
3. 顶部筛选: 赛道 / 联动状态 / 政策标签 / 区县 / 搜索
4. 点企业 → 详情页看 公私联动 / 零售关系 / 对公现状 4 个 section
5. ⭐ 加入拜访清单 (复用现有 visits localStorage)
6. 顶部 `📥 导出 CSV` 一键下载当前筛选结果 (含电话/邮箱/RM/网点)

**重建脚本**: `python3 scripts/_import_tech_v2.py` (如 xls 更新重跑即可)

## 🎚️ 功能现状(P0 已完成)

- ✅ 工作台首屏(3 大块:统计 / 行动 / 赛道分布)
- ✅ 公司库筛选(赛道 / 行业大类 / 区县 / 规模 / 状态 + 关键词搜索 + 顶部筛选摘要 chips)
- ✅ 公司库表格表头(13 列) + 顶部全选 + 表头全选 + 行 checkbox + 批量加入拜访清单 + 导出选中 CSV
- ✅ 公司详情弹窗(基本信息 + 联系方式 + 科创指标 + 操作按钮)
- ✅ 三圈重叠 28 家展示
- ✅ 拜访清单(⭐ localStorage)
- ✅ 拜访清单页面(`#/visits`) + 顶部筛选栏(搜索/赛道/置信度) + 表头/顶部全选(部分选中 indeterminate) + 批量移除 + 按选中/全部导出 CSV/JSON + 单个移除 + 一键清空
- ✅ 一键拨打/天眼查跳转
- ✅ v9 复检页(`#/v9-review`)+ 4 张统计卡 + 顶部筛选(搜索/action/status)+ 表内行操作(✅ 采纳 / ⏭ 跳过 / 📝 自定义 / ↩ 撤销)+ 批量采纳本页 + 导出 overrides JSON + 工作台复检进度 banner

## ⏳ 待做(P1/P2)

- [ ] 链主网络搜索(输入企业名 → 它的供应商/客户链)
- [ ] 详情页"链主角色"显示(从合并结果数据来)
- [x] **拜访清单导出** (2026-08-17 完成):CSV(15 列 / UTF-8 BOM 兼容 Excel)+ JSON 两种格式 + 单个移除 + 一键清空
- [x] **v9 分类复检 UI** (2026-08-18 完成):4156 行 CSV → JSON 转换脚本 + 复检页面 + 决策本地保存 + overrides 导出 + apply 脚本扩展支持 `--decisions` 参数
- [ ] 拜访清单打印 / PDF
- [ ] 移动端适配(桌面为主,手机轻量)
- [ ] 数据 gzip(br)压缩首屏
- [ ] 数据索引拆分子文件(避免 13 MB 单文件)
- [ ] 第6部分天眼查跑完后重 join

## 📊 数据状态

| 字段 | 数 | 注 |
|---|---|---|
| 主桌面 | **22,765 家** | 1400 + 5000 + 深圳高企第1-6 部分 |
| 已分类 | **4,145 家** | v9 分类 5,971 中能 JOIN 到主表的部分 |
| 未分类 | **18,620 家** | 缺数据,第6部分天眼查补完后会减少 |
| 有电话 | **19,141 家** | 84% 命中率 |
| 有邮箱 | 约 2,500 家 | 主表字段缺失严重 |
| 三圈重叠 | **28 家** | 国家级专精特新 ∩ 5000 专精特新 ∩ 深圳高企 |
| 拓客 Top 50(已分类) | 50 家 | 按注册资本+科创+专利打分 |
| 拓客 Top 500(未分类) | 500 家 | 主桌面隐藏金矿 |

## 📅 版本历史

- **v1 (2026-08-16)** — 初始版本
  - 22,765 家基础数据(主表 GBK)
  - v9 5,971 家赛道分类 JOIN
  - 工作台 + 公司库 + 三圈重叠 4 大块
  - 拜访清单(localStorage)
  - jsdom 验证通过

---

## ⚙️ 已知踩坑

**给以后自己**:
1. 主表 `website` 字段实际是 `desc`(企业简介),索引推断错了一次
2. `统一社会信用代码` 在 v9 和主表里有 ~1,800 家不一致(名称匹配能补救大部分)
3. 公司库 22,765 家不分页会卡死浏览器 → 已用 50/页
4. file:// 协议下 localStorage 不可用 → 必须 http.server
5. 浏览器渲染 13 MB 中文 UTF-8 ≈ 1-2 秒,可接受

**保留脚本 `_build_workbench_data.py`** —— 天眼查跑完后只改 `load_master()` 路径即可重跑。

---

## 🐛 Bug 修复记录

### 2026-08-17: 翻页按钮死 + 拜访清单无法导出

**Bug 1: 翻页按钮无反应**
- 现象: 公司库点 ‹上一页 / 下一页› 没反应
- 根因: `bindFilterEvents()` 只委托了 `.filter-panel`,但按钮在 `.table-toolbar` 里(右侧表格上方)
- 修法: 新增 `bindTablePagerEvents()` 单独委托 `.table-toolbar`
- 教训: **事件委托选错容器就是死按钮**。下次写 HTML 时确保被委托的元素是按钮的**祖先节点**

**Bug 2: 无法导出拜访清单**
- 现象: 顶部 `⭐ 拜访清单 N` 看起来可以点,点了没反应
- 根因: 那只是个 `<span>`,没有任何 handler。README 里"拜访清单导出"本来就是 P1 待做
- 修法:
  - 加 `bindVisitBadge()`:span 加 cursor:pointer + role=button + click 跳 `#/visits`
  - 加 `renderVisits()` 路由:列表 + 导出按钮 + 单个移除 + 一键清空
  - 加 `exportVisitsCSV()` / `exportVisitsJSON()`:Blob + URL.createObjectURL 下载,CSV 加 UTF-8 BOM 兼容 Excel
  - CSS: `.visit-count` 加 hover 高亮

**导出字段(15 列)**:公司名 / 统一社会信用代码 / 赛道 / 子赛道 / 置信度 / 行业大类 / 行业中类 / 注册资本(万) / 员工 / 科创分 / 法人 / 电话 / 邮箱 / 地址 / 区县

**验证**: 7 项 jsdom 测试全过(翻页 / 跳转 / 空态 / 非空列表 / 表格行数 / 导出调用 / blob MIME)

### 2026-08-17: 拜访清单页 - 顶部筛选栏 + 全选 + 批量操作

**用户报**:再加一个列表全选 + 列表上面显示表头和筛选

**做了什么**:
- 顶部 `.visits-filter` 筛选栏(搜索 / 赛道 chips / 置信度 chips + 重置按钮)
- 工具栏:顶部全选 checkbox + "已选 N 家 · 列表中 M 家" + 4 个操作按钮(导出选中/全部/JSON/清空)
- 表格 thead 第一列加全选 checkbox + tbody 每行加 row checkbox
- 部分选中状态:表头 checkbox 显示 indeterminate (一横)
- 行勾选不重渲染,只更新计数 + 表头状态(避免列表闪烁)
- 筛选/全选互不干扰:selection 跨筛选持久,企业被移除后自动 pruneStaleSelection
- `state.visitsFilter` + `state.visitsSelection` 持久
- `exportVisitsCSV(items, scope)` / `exportVisitsJSON(items)` 接参数:scope = 'selected' 时文件名带 "选中" 前缀

**踩坑(给以后自己)**:
- **jsdom 不会自动改 checkbox.checked**——dispatchEvent('change') 之前必须手动设 checked
- **state 是 IIFE 局部 const**——测试不能"写完 reload 再验证",要预置 localStorage 启动新 jsdom(同上轮 Bug 2 教训)
- **selection 跨筛选持久**——切换赛道过滤后,被过滤掉的选中仍保留,切回又能看到;但企业被移除后要 prune 否则永远占着空位
- **indeterminate 状态必须用 el.indeterminate = true**,不是 HTML 属性(jsdom / 真实浏览器都一样)

**验证**: 4 场景 18 项 jsdom 测试全过
- 场景 A UI 渲染:筛选栏 + 搜索 + 5+5 chips + 顶部/表头/行 checkbox + 4 按钮
- 场景 B 行勾选 + 联动:勾 3 行 → 已选 3 + indeterminate + 导出按钮文字 "(3)" + 全选 → 已选 6 + 6 checked
- 场景 C 筛选:高置信度 → 6→2 家,重置 → 6 家恢复
- 场景 D 导出:导出选中 (1 次 text/csv) + 全部 CSV (2 次) + JSON (3 次)

**产物**:
- `industry-research/workbench/app.js` — 新增 ~160 行 (applyVisitsFilter + pruneStaleSelection + bindVisitsEvents + 全选逻辑)
- `industry-research/workbench/styles.css` — `.visits-filter` + 行选中高亮
- `industry-research/workbench/index.html` — cache buster `v=2026081708`

### 2026-08-17: 公司库表头 + 全选 + 顶部筛选摘要

**用户报**:公司库的企业列表没有表头和全选和筛选

**根因**:
- **表头**: 原代码 `<thead id="companiesHead">` 从来没被渲染过(空的 `<thead>`)。renderTable() 里完全没写 companiesHead 的 innerHTML
- **全选**: 缺失功能
- **筛选**: 原本在左侧 sidebar(功能正常),但用户没注意到 → 在表格上方加了“筛选摘要条”明确显示已应用的筛选条件

**做了什么**:
- **修表头 bug**: renderTable() 里加 `$('#companiesHead').innerHTML = '<tr>...13 列...</tr>'`,列名: ☐ / ⭐ / 公司名 / 赛道 / 子赛道 / 置信度 / 链主 / 行业大类 / 区县 / 注册资本 / 员工 / 科创分 / 电话
- **全选 checkbox**: 顶部 + 表头 + 每行 三处联动,部分选中显示 indeterminate (一横)
- **批量操作**: ⭐ 批量加入拜访清单 (勾中的全部进 localStorage) + 📥 导出选中 CSV (复用 visits 页的 exportVisitsCSV 函数)
- **顶部筛选摘要条**: 搜索框(与左侧同步) + 已应用筛选 chips(可点 X 移除单个) + 清空全部按钮 + 未筛选时显示提示
- **拆事件绑定**: `bindCompaniesToolbarEvents()` 一次性绑(顶部/批量/顶部搜索) + `bindCompaniesTableEvents()` 每次 renderTable 重绑(行 checkbox / 表头 checkbox)
- **修潜在 bug**: renderCompanies 顶部 URL 参数处理改为只在 hash 变化时生效(避免 sidebar/chip 操作被 URL 重置)

**踩坑(给以后自己)**:
- **renderTable 重写 tbody 丢掉旧事件** —— 事件委托到容器不行(列表中的是新 DOM),必须每次重渲染后重新绑或用 document 级委托
- **renderCompanies 总是从 URL 重置 state.filter** —— 造成顶部 chip 清除失效。修复: 加 `state._lastCompaniesHash` flag,只在 hash 变化时重读
- **bindCompaniesToolbarEvents 不要重复调用** —— 否则 topSearch 的 debounce input 会被绑多次,每次 input 触发多次 callback
- **jsdom `Cannot set properties of null`** —— 新模板里删了 `id="tableCount"` 但 renderTable() 还在用它,renderTable 崩,整个表不渲染

**验证**: 4 场景 22 项 jsdom 测试全过
- 场景 1: 顶部摘要条 + 13 列表头 + 顶部/表头/行 checkbox + 批量按钮 + 翻页仍可用
- 场景 2: 行勾选联动 → 已选 3 + indeterminate + 顶部全选 → 已选 50 + 批量加清单 → localStorage 50 家 + badge "拜访清单 50"
- 场景 3: 顶部 chip 单个移除 (2→1) + 全部清空 (1→0) + 未筛选提示恢复
- 场景 4: 顶部搜索同步 → 1 个 chip + 左侧同步 + 导出选中 → 1 次 text/csv blob

**产物**:
- `industry-research/workbench/app.js` — 新增 ~220 行 (activeChips + bindCompaniesToolbarEvents + bindCompaniesTableEvents + bindActiveFilterEvents + syncCompaniesSelCount + renderCompaniesRefresh + buildActiveChips)
- `industry-research/workbench/styles.css` — `.companies-filter-summary` + `.active-filter-chip` + 选中行高亮 + 表格表头
- `industry-research/workbench/index.html` — cache buster `v=2026081710`
---

### 2026-08-17 PM: v9 分类系统性 bug 修复 (1103 家)

**用户报**: 埃尔法光电是光模块公司, 被分到了 "模具" 赛道

**根因分析**:
- v9 算法只用 biz 关键词匹配, 不参考行业大类
- `_refine_v3.py` 第一行 `if method in ('v9', 'v9_name'): continue` —— v9 分类的公司**被完全跳过**, 从未复检
- `INDUSTRY_TRACK` 里 `'通信'` 赛道没被分配候选行业 → 这个赛道永远轮不到
- **影响面**: 4156 家 v9 分类中 1628 (39.2%) trk 不在 INDUSTRY_TRACK 候选里
- 最大错分行业: 批发业 505 家、仪器仪表 198 家

**修法**:
1. `scripts/_refine_v9_review.py` —— 生成复检报告 (不动数据, 让用户 review)
   - v3 算法多信号联合投票 + 行业一致性检查
   - action: CHANGE / REVIEW / KEEP
   - 输出 `scripts/_v9_review_report.csv` (4156 行)
2. `scripts/_refine_v9_apply.py` —— 应用 CHANGE 1103 家
   - 改 trk / sub_track / confidence / method, 保留 `_original_trk` 可追溯
   - 重生成 `aggregates.json/.js` + `sub_tracks.json/.js`
   - 备份 `data/companies.json.bak-<时间戳>`
3. INDUSTRY_TRACK 通信赛道修复:
   - `INDUSTRY_DL_TRACK['仪器仪表制造业']` 加 `'通信'`
   - `INDUSTRY_DL_TRACK['计算机、通信和其他电子设备制造业']` 加 `'通信'`
   - `INDUSTRY_DL_TRACK['通信设备制造业']` → `['通信', '供应链-电子']`
   - `INDUSTRY_XL_TRACK` 加 `'光通信设备制造'` / `'通信交换设备制造'` / `'光缆制造'`

**未做的** (需后续处理):
- 1046 家 action='REVIEW' 仍需人工 review
- 埃尔法业务上应是 '通信/光通信', 但 v3 推荐 '供应链-电子' (业务关键词不命中子赛道词典)。如需进一步细分, 人工调整

**踩坑 (给以后自己)**:
- **`import _classify_subtrack.py` 会触发主流程** — 22000 家公司重算 + 写文件。修法: 用 `ast.literal_eval` 只读常量
- **`_classify_subtrack.py` 末尾有 'PYEOF' 残留** — 删了
- **sub_track 不一致 bug**: trk 改了但 sub_track 没跟着改 → 旧 sub_track 不在新 trk 词典里 → 清空
- **1103 家 method 从 v9 → v9-review** — 保留 `_original_trk` 字段, 一行 JSON query 可回滚
- **.js 必须重生成** — workbench 读 `window.COMPANIES` 不是 .json

**验证**: jsdom 加载新数据
- 表头 13 列 ✅
- 翻页 1/456 → 2/456 ✅
- 供应链-电子 7678 → 8274 (+596)
- 供应链-精密 3253 → 3113 (-140)
- 埃尔法: trk=供应链-电子, _original_trk=供应链-精密, method=v9-review ✅

**产物**:
- `scripts/_refine_v9_review.py` (13 KB, 复检报告生成器)
- `scripts/_refine_v9_apply.py` (8 KB, 应用脚本, 含 ast 加载防副作用)
- `scripts/_v9_review_report.csv` (4156 行, 完整 review 报告)
- `scripts/_v9_review_summary.json` (摘要)
- `data/companies.json.bak-20260817-*` (备份)
- `data/companies.json` (1103 家改)
- `data/companies.js` (重生成 18.5 MB)
- `data/aggregates.json/.js` (重生成)
- `data/sub_tracks.json/.js` (重生成)
- `index.html` cache buster `v=2026081711`

---

### 2026-08-17 22:23: 扩 v9 修复覆盖 + 人工 override

**用户报**: "继续" —— 接着处理 REVIEW 1046 家 + 修埃尔法

**做了什么**:
1. _refine_v9_review.py 修 OPTIONAL_CHANGE 分支漏设 suggested_trk 的 bug (原本 suggested_trk 默认 old_trk, 应改为 v3 推荐)
2. _refine_v9_apply.py 扩展:
   - 加 `--actions` 参数: 默认 CHANGE, 可选 CHANGE,OPTIONAL_CHANGE
   - 加 `--overrides` 参数: 读 manual_overrides.json (优先级最高)
   - 统计拆分为: override 应用 / review 应用 / 跳过 / 未找到
3. _v9_manual_overrides.json 新文件: 人工 override 列表 (例: 埃尔法)
4. 埃尔法人工 override: trk=通信, sub_track=光通信, method=v9-review-override, 保留 _review_reason

**最终应用**:
- v9-review: 1357 家 (review CSV 自动)
- v9-review-override: 1 家 (人工)
- v9 原始未改: 2798 家 (主要是低置信 + 行业一致)

**trk 分布变化**:
- 供应链-电子: 7678 → 8427 (+749)
- 供应链-精密: 3253 → 3119 (-134)
- 软件/SaaS: 4981 → 5008 (+27)
- 通信: 398 → 329 (-69)  (光模块相关从通信改到供应链-电子 / 人工 override 埃尔法)

**踩坑**:
- review 脚本跑过的 companies.json 状态决定 CSV: 在改过的状态跑 review → CSV 没 CHANGE 行 → apply 不应用。所以每次 cp backup 后必须重跑 review
- OPTIONAL_CHANGE 分支漏设 suggested_trk → 上次默认 old_trk, 这次修正后能正常应用 255 家

**验证**: jsdom 加载新数据
- 埃尔法: trk=通信, sub=光通信, method=v9-review-override, _review_reason 保留 ✅
- 通信赛道 329 家
- 翻页 1/456 → 2/456 ✅
- index.html cache buster v=2026081712

### 2026-08-18: v9 分类复检 UI (4156 → 525 → 人工处理)

**问题**: v9 分类算法跑了 4156 家,1357 家已经自动改(C/OPT),剩 525 家算法拿不准(NEEDS_REVIEW 16 + INDUSTRY_FALLBACK 509),但只能对着 1.5MB 的 CSV 翻找,效率极低

**做了什么**:
- `scripts/_v9_review_to_json.py` — CSV → JSON 转换(处理 utf-8 BOM),输出 `data/v9_review.json/.js` + `v9_review_remaining.json/.js`
- `#/v9-review` 新页面:
  - 4 张统计卡(NEEDS_REVIEW / INDUSTRY_FALLBACK / 待处理 / 已处理)
  - 顶部筛选(搜索 + action: REVIEW/NEEDS/INDUSTRY_FALLBACK/CHANGE/KEEP/全部 + status: 待处理/已采纳/已跳过/已完成/全部)
  - 表格 10 列:action badge / 公司名+代码 / 行业大类 / 业务摘要 / 当前赛道(删除线)/ AI 建议 / 置信度 / 候选 chips / 状态 / 操作
  - 行操作:✅ 采纳(写入 suggested_trk)/ ⏭ 跳过 / 📝 自定义(弹窗选 14 赛道)/ ↩ 撤销
  - 批量:⚡ 采纳本页 / ⚡⚡ 采纳全部(跨页,只采纳有真改变的) / 🗑 清空决策
  - 📥 导出 overrides JSON(下载 `_v9_review_decisions_<时间戳>.json`,含 overrides + adopts)
  - 决策保存到 localStorage (`workbench-v9-review`),跨刷新保留
- `_refine_v9_apply.py` 加 `--decisions PATH` 参数,读 UI 导出的 JSON,合并 overrides + adopts,统一走同一条处理路径
- 工作台首页加 v9 复检进度 banner(只在有未处理时显示,0 进度时变成绿色"全部完成")
- jsdom 测试通过:页面渲染/采纳保存/筛选切换/导出格式全 OK
- README + cache buster `v=2026081801`

**端到端流程**:
1. 用户进 `#/v9-review`
2. 浏览 525 家 → 对每家 ✅/⏭/📝
3. 点"📥 导出 overrides"下载 JSON
4. 移动到 `scripts/_v9_review_decisions_<时间戳>.json`
5. 跑 `python3 scripts/_refine_v9_apply.py --decisions scripts/_v9_review_decisions_*.json --actions ""`
6. 备份 + 应用 + 重生成 aggregates/sub_tracks
7. Ctrl+Shift+R 强刷 workbench

**踩坑(给以后自己)**:
- **CSV utf-8 BOM**: Windows Excel 写出来的 CSV 第一字段名是 `\ufeffcode`,DictReader 会把它当成字段名的一部分,KeyError。**用 `encoding='utf-8-sig'`**
- **字段命名一致性**: `data/v9_review.json.js` 不是 `data/v9_review.js.js`,要在 `.json` 后去掉再加 `.js`。Python `os.path` 不提供这个,只能切片
- **jsdom Blob 没 `.text()`**: 测试时不能用 `blob.text()`,要用 `blob._buffer` 或别的方式
- **跨页决策保留**: 用 localStorage 而不是 state(刷新还在);筛选切换不清 decisions
- **per_page 不要太大**: 30 行/页平衡性能和操作密度(525 家 → 18 页)
- **apply 脚本默认值**: `--actions CHANGE` 是默认,意思是默认也会应用 CSV 的 1103 家 change。**纯 UI 模式必须 `--actions ""`**

**安全**:
- UI 决策只写 localStorage,**不会自动改 companies.json**
- 导出 → 用户手动跑脚本 → 备份 → 应用 → 显式可控
- decisions JSON 里有 `note: '..._refine_v9_apply.py --decisions <file>'` 提示用法

### 2026-08-18 07:30: 三圈重叠 + v9 review 加 ⭐ 按钮

**问题**: 28 家金子要点 28 次 ⭐ 才能加入清单;v9 review 决策了想拜访要回公司库找

**做了什么**:
- `#/overlap`:
  - 顶部工具栏: 进度文字 "清单中已加 X/Y 家" + 批量按钮 "⭐ 一键加入 (X/Y)" / "🗑 全部移出 (Y)" + "查看拜访清单 →" 链接
  - 表格新加 "清单" 列, 行内 ⭐/✓ 切换按钮
  - **发现数据 bug**: Overlap28 里 5 家 code 为空(主表未匹配) — 显示 ⚠ + 顶部 "⚠️ 5 家无 code" 警告;批量操作自动跳过空 code,避免污染 visits
- `#/v9-review`:
  - 每行操作列加 ⭐/✓ 按钮(独立于决策, 不影响 v9ReviewDecisions)
  - 顶部工具栏加 "⭐ 本页加清单" 批量按钮
  - 单击行 ⭐ 调 toggleVisit → 更新 badge + 重渲染
- jsdom 测试覆盖: 三圈重叠批量切换 / 单行切换 / 详情 modal 打开; v9 review 行 ⭐ / 批量本页加清单 / 决策与清单独立

**踩坑 (给以后自己)**:
- **数据完整性**: 改 UI 前先用 grep 看 data 里有没有缺字段。Overlap28 有 5 家 code 为空,如果不处理, 批量加清单会塞 5 个 "" 进 visits, 详情 modal 也跳不出来
- **空 code 渲染**: `<button data-visit-toggle="">` 空字符串属性在 jsdom 里能跑, 但 click 后 state.visits 会 push "" — 必须 hasCode 检查后渲染
- **批量按钮状态切换**: 全部加入后按钮变 "全部移出" — 用 `allInList` 标志判断, 不要 hardcode
- **决策 vs 拜访清单独立**: v9 review 里决策写 `workbench-v9-review`, 拜访清单写 `workbench-visits`。两者完全独立, 用户可同时采纳 + 加清单, 互不影响

**产物**: app.js +110 行, index.html cache buster v=2026081804

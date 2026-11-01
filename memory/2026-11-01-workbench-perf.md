# 2026-11-01

## workbench 手机端打不开 — 性能优化

### 现象
用户反馈手机端打不开 workbench。首屏 28 秒，tunnel 上 curl 30 秒超时。

### 根因链（逐层排除，别跳步）
1. **服务端不是瓶颈** — 并发 curl 11 个文件 72ms 完成，单文件读 50ms
2. **主线程不是瓶颈** — Performance 显示 TaskDuration 仅 3.5s
3. **网络传输不是主因** — 67.84MB→10.85MB 后耗时几乎没变
4. **Chrome 专属** — Node 客户端 11 并发 72ms，Chrome 并行 fetch 卡 26s
   （真因：`data-loader` 用 `cache:'force-cache'` + 11 文件同时请求，
   磁盘缓存写入成为瓶颈。改成懒加载 + 默认缓存后并行 fetch 848ms）
5. **公网链路** — tunnel 实测吞吐仅 ~300KB/s，TTFB 0.9-2.8s
   `cf-ray: ...-LAX` → Cloudflare 把国内用户路由到**洛杉矶边缘**，绕太平洋

### 最终改造
- 两阶段加载：首屏 5 个必需集，其余按路由懒加载
- companies 瘦身：addr/biz/desc → company_details.json（详情时才拉）
- 首页不需要 companies.json（链主数预计算进 aggregates.chain_role_company_count）
- v9 banner 改为数据到达后补渲染
- 快照常量改可变 + 数据到达后刷新

### 结果
| 指标 | 改造前 | 改造后 |
|---|---|---|
| 首屏传输 | 10.85 MB | **209 KB** |
| curl 并行下载 | 28 s | **2.26 s** |
| 公网进入公司库 | 打不开 | 2.9 s |
| JS 堆 | 81 MB | 4 MB |

### 关键教训
1. **CDP 的 `Network.enable` 会缓冲响应体，让性能测量失真约 20 倍**
   （20MB 响应测出 26 秒，实际 848ms）。测性能时不要开这个域，
   改用 `performance.getEntriesByType('resource')` 在页面内取。
2. **headless Chrome 首次建 profile 约 22 秒**。同一 profile 连测两次，
   第二次才是真实用户体感。`--user-data-dir` 每次新建会把这个开销算进去。
3. **Quick Tunnel (cloudflared --url) 域名每次重启都变**，URL 不固定，
   且中国访问被路由到 LAX 边缘。长期方案是固定域名 + 自己的服务器。
4. **阿里云 ECS 安全组只放行了 22**，80/443/其他全关。要直连需用户在
   控制台开端口；且国内服务器用域名需 ICP 备案。
5. `cloudflared --region apac` 起不来：阿里云内网 DNS 不解析 SRV 记录
   （`lookup _apac-v2-origintunneld._tcp.argotunnel.com: no such host`）。

### 产出脚本
- `scripts/_split_companies.py` / `_split_companies2.py` — companies 瘦身
- `scripts/_add_chain_count.py` — 预计算链主数量进 aggregates
- `scripts/_field_size.py` — 字段体积分析
- `scripts/wb-ux-measure.js` — 真实 UX 测量（不开 Network 域）
- `scripts/wb-flow-test.js` — 端到端流程验证
- `scripts/wb-navdiag.js` / `wb-quic-test.js` — 导航延迟协议层定位

### 当前公网地址
`https://sanyo-concluded-opponent-heating.trycloudflare.com/research/workbench/`
**Basic Auth: admin / wen123456**（pm2 进程 crm-auth 的参数：
`3001 3100 admin wen123456 8000`；Quick Tunnel 重启后域名会变）

---

## 第二轮：服务端 API（19:40 补）

### 问题
首屏瘦身到 209KB 后仍不可用 —— 进公司库要等 30 秒。
根因：companies.json 22,765 家瘦身后 gzip 仍有 2.19MB，公网 ~80KB/s。

### 关键实验：分片并行无效
把 companies 切成 6 片并行下载：**36 秒**（比单文件 27 秒还慢）。
6 个并发拉同一个文件：**149 秒**。带宽被瓜分，总吞吐固定。
→ 只有「减少用户实际需要的数据量」才有效，不能靠并发/分片。

### 解法：服务端 API（static-server 加了内存索引）
| 接口 | 用途 | 大小 | 公网耗时 |
|---|---|---|---|
| `/workbench/api/companies?...&page=N` | 筛选+分页，每页 50 条 | 6 KB | **0.96 s** |
| `/workbench/api/companies?code=X` | 单条（含详情） | ~1 KB | 0.8 s |
| `/workbench/api/company/<code>` | 仅 addr/biz/desc | 1 KB | 0.8 s |
| `/workbench/api/search?q=` | 服务端搜索（含地址） | ~6 KB | 3.3 s |

配套前端改造：
- 公司库 → 服务端分页（renderTableServer），本地全量作降级
- 拜访清单 / 一页通 → 按 code 单条查询
- COMPANIES 数据集彻底不再下载，所有路由依赖清空

### 缓存陷阱（重要）
1. `fetch(..., {cache:'force-cache'})` 会**跳过协商**，手机上一直跑旧版数据
   → 改 `cache:'default'`
2. 数据文件 URL 固定 + `max-age=300` → 改完数据 5 分钟内不生效
   → 加内容哈希版本戳 `?v=<md5前8位>`，由 `scripts/_stamp_versions.py` 生成
3. app.js / data-loader.js / styles.css 的 `?v=` 版本号必须手动升，
   否则浏览器直接用缓存的旧 JS（我第一轮忘了升，手机上仍是旧版）

### 最终实测（公网，正确凭证）
- 页面 1.0 s · 首屏 JSON 并行 2.3 s
- 公司库第 1 页 **0.96 s**（原 12.8 s / 2.19 MB）
- 详情 API 0.8 s（原 50 s）· 搜索 API 3.3 s
- 8 个路由渲染全部正常，零 JS 错误

### 教训
**凭证一开始就是错的**：我用了早期的 `oSty45kTwKhRgYVZYMnr`，
而 auth-proxy 实际用的是 `wen123456`。所有「公网 401」的结果都是
这个原因，不是服务挂了。**测公网前先确认凭证来源**（pm2 describe 看参数）。

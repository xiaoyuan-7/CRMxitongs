只要联网搜索，优先使用searxng skill

## 性能测量纪律（2026-11-01 踩坑总结）

- **测 Web 性能时不要开 CDP 的 `Network.enable`** —— 它会缓冲所有响应体，
  20MB 响应能测出 26 秒，实际只要 848ms。改用页面内的
  `performance.getEntriesByType('resource')` 取真实数据。
- **headless Chrome 首次建 profile 约 22 秒**，要测真实用户体感就固定
  `--user-data-dir` 连测两次，第二次才准。
- **headless Chrome 与 curl 走不同网络路径**：Chrome 走 HTTP/2/3 + IPv6 探测，
  curl 走 HTTP/1.1。同一 URL 两者能差 20 倍，别用其中一个的结论套另一个。

## 出网现状

- Cloudflare Quick Tunnel（`cloudflared --url`，pm2 进程 `crm-tunnel`）：
  - 域名每次重启都变，当前 `https://sanyo-concluded-opponent-heating.trycloudflare.com`
  - 中国访问被路由到 **LAX（洛杉矶）边缘**，绕太平洋，吞吐仅 ~80-300KB/s
  - `--region apac` 不可用（阿里云内网 DNS 不解析 SRV 记录）
  - **带宽是固定瓶颈，不能靠并发/分片绕过** —— 6 并发拉同一文件共 149 秒，
    带宽被瓜分、总吞吐不变。只能减少用户实际需要的数据量。
- 阿里云 ECS 公网 IP `47.96.177.153`，**安全组只放行 22**，80/443 全关。
  要直连必须用户在控制台开端口；用域名还需 ICP 备案。

## 凭证

- `crm-auth`（auth-proxy，3100）Basic Auth: **admin / wen123456**
  （pm2 参数 `3001 3100 admin wen123456 8000`；查凭证用 `pm2 describe crm-auth`）
- 2026-11-01 踩坑：一开始用了旧凭证 `oSty45kTwKhRgYVZYMnr`，
  导致所有公网测试返回 401，误以为是服务故障。**测公网前先确认凭证来源。**

## 静态站点缓存策略（2026-11-01 定规）

- **JS/CSS 的 `?v=` 版本号必须随改动手动升**，否则浏览器直接用缓存旧文件
- **数据文件用内容哈希版本戳** `?v=<md5前8位>`，
  由 `industry-research/workbench/scripts/_stamp_versions.py` 生成
- **不要用 `fetch(..., {cache:'force-cache'})`** —— 它跳过协商，
  数据更新后仍返回旧内容。用 `cache:'default'`
- static-server 对 JS/JSON 发 `cache-control: public, max-age=300`，ETag/304 协商正常

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
  - 中国访问被路由到 **LAX（洛杉矶）边缘**，绕太平洋，吞吐仅 ~300KB/s
  - `--region apac` 不可用（阿里云内网 DNS 不解析 SRV 记录）
- 阿里云 ECS 公网 IP `47.96.177.153`，**安全组只放行 22**，80/443 全关。
  要直连必须用户在控制台开端口；用域名还需 ICP 备案。

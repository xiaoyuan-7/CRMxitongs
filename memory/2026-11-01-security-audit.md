# 2026-11-01 系统全面安全审计

审计范围：crm-system（后端 3001 / auth-proxy 3100 / cloudflared tunnel / industry-research 静态站）+ GitHub 备份仓库 xiaoyuan-7/CRMxitongs（**public: false→实际为 public**）

## P0 严重（需立即处理）

### 1. 后端 3001 端口裸奔公网，零鉴权
- `ss` 显示 `0.0.0.0:3001`（pm2 crm-backend，env HOST=0.0.0.0）
- 公网实测 `http://47.96.177.153:3001/api/leads` → 200，直接返回 46 条线索
- `0.0.0.0:3001/` → 200，直接返回 CRM 前端页面
- 原因：`server.js` 里 14 个业务路由（leads/companies/contacts/...）**全部没有 auth 中间件**，只有 `routes/users.js` 自己校验 token
- 只有 3100 的 auth-proxy 有 Basic Auth，但 3001 端口本身绕过了它

### 2. 未授权注册 + 任意角色提权
- `POST /api/users/register` 公开，接受 `role` 字段，实测创建 admin 用户成功（id=2）
- 已清理：`DELETE FROM users WHERE username='audit_probe_xyz'`，当前只剩 admin
- 且 `POST /api/users/login` + 默认 JWT_SECRET 可伪造 admin token（见下）

### 3. JWT_SECRET 硬编码且未在 pm2 环境设置
- `routes/users.js:7` → `process.env.JWT_SECRET || 'crm-secret-key-change-in-production'`
- `pm2 env 0 | grep -i jwt` → 无输出，确认走默认弱密钥
- 实测用该密钥 sign 出 admin token，直接 `GET /api/users` 返回全部用户列表（公网 200）
- 修复：pm2 注入强随机 JWT_SECRET + 代码里去掉 fallback

### 4. SSH 私钥泄漏在公开 GitHub 仓库
- `keys/crm_upload_key`（OpenSSH 私钥）被 git 跟踪，commit `4622da3` (2026-10-31)
- 存在于 `origin/workspace-backup` 分支，已推送 GitHub
- 仓库 `xiaoyuan-7/CRMxitongs` **private: false = 公开仓库**
- 该 key 在 `/home/admin/.ssh/authorized_keys` 里是**有效登录凭据**（`crm-upload-2026-10-31`）
- 实测 `ssh -i keys/crm_upload_key admin@127.0.0.1` → `LEAKED_KEY_WORKS` 直接登录成功
- 任何人克隆该公开仓库即可拿到服务器 shell

### 5. Basic Auth 弱口令 + 密码文件入库
- `scripts/.crm-pass`（内容 `wen123456`）被 git 跟踪并推到 workspace-backup
- 密码文件同时存在于 git 历史 commit `7ff7d7a`
- 公网入口（tunnel → auth-proxy 3100）用的就是这个口令

### 6. 客户敏感数据在公开仓库
- `crm-db-backup.sql`（86KB，391 条 INSERT）在公开分支 workspace-backup
  - 含 57 家企业（含财务/授信/开票/股东等内部备注）、102 条 referrals、15 条 contacts
  - contacts 含**私人信息**：生日 `1975-01-15`、家庭状况 `已婚，有一子`、个人喜好 `喜欢喝茶、高尔夫`、礼品建议 `高档茶叶、高尔夫用品`
- `workspace-crm-backup` 分支的 `backend/crm.db`（200KB）与 `backend/crm_backup.sql` 同样公开，含真实客户名 + 内部经营备注
- 已验证可直接下载并 sqlite3 打开读取

## P1 严重

### 7. 备份脚本本身没有做脱敏/排除
`scripts/backup-all.sh` 直接 `git add -A` 全量提交，把 keys/、.crm-pass、db 都带上去了。
- 需加 `.gitignore`：`keys/`、`scripts/.crm-pass`、`*.db`、`*.db-wal`、`*.db-shm`
- 且需要 purge git 历史（git-filter-repo / BFG），因为历史里已经泄漏

### 8. 未使用的安全中间件
`middleware/security.js`（X-Frame-Options / CSP / X-Content-Type-Options）和 `middleware/validation.js` 在 server.js 里**从未被 require**。grep 确认零引用。

### 9. 备份产物混乱，仓库臃肿
- `crm-system` git 跟踪了 `crm.db` / `crm.db-shm` / `crm.db-wal` / `crm.db.backup` / `crm.db.pre_split_*` 多个陈旧副本
- `crm.db-wal` 3.1MB 单独入库（WAL 与主库不一致时恢复会出错）
- `frontend-simple/` 下 8 个 `index.html` 备份副本（.bak/.orig/.broken_*），每个 ~300KB
- `backend/server.js.bak` 也在跟踪
- `crm-system/.gitignore` 只忽略了 `git_data_backup_latest.db`（一个不存在的名字），实际生效的是 `*.log` 和 `node_modules/`
- workspace 主仓库**完全没有 .gitignore**，导致 `.gzcache/`（55MB 预压缩缓存）处于 untracked 状态
- `crm-system` 当前 checkout 在 `workspace-crm-backup` 分支，deploy-from-git.sh 依赖这个分支

## P2 中等
- `crm.db-wal` 3.1MB 而主库仅 200KB：WAL 未 checkpoint，dump 出的 SQL 正常（46 leads 一致）但 `.db` 文件直接入库不可靠
- 内存吃紧：1870MB 总内存，available 仅 411MB；测试需 `pkill -9 -f /opt/google/chrome`
- 端口 22 在公网可达（ssh-public 探测超时=端口开），SSH 仅密钥登录（PasswordAuthentication no）
- `crm-tunnel` 用 Quick Tunnel，地址每次重启会变：`https://sanyo-concluded-opponent-heating.trycloudflare.com`（当前）
- research 站 `58,367` 个手机号在 industry-research 目录里，但**未**被 git 跟踪（仅 `web/customers.js` 等被跟踪），公开仓库暂未泄漏这批数据

## 已验证正常的部分
- DB integrity_check = ok，dump 恢复后行数与线上一致（leads 46 / companies 57 / referrals 102）
- auth-proxy 的 timingSafeEqual 密码比较写法正确
- auth-proxy 有静态目录穿越防护（`filePath.startsWith(resolve(ROOT))`）
- `/research/` 路径重定向逻辑正确，JS 相对引用可解析
- tunnel → auth-proxy → 静态站 链路正常（401 提示正确）
- pm2 4 个进程全部 online
- 磁盘 37% 使用，充足

## 修复优先级
1. 立刻：把 3001 改成 127.0.0.1（`pm2 restart crm-backend` + env HOST）
2. 立刻：关掉 `/api/users/register` 或强制 role='user'
3. 立刻：生成强 JWT_SECRET 注入 pm2
4. 立刻：轮换 SSH key（公钥已泄漏）+ 改密码 + 从 authorized_keys 移除旧 key
5. 立刻：`git rm --cached` 敏感文件 + 写 .gitignore + 用 git-filter-repo 清历史
6. 立刻：把 GitHub 仓库设为 private
7. 然后：给 14 个业务路由加 auth 中间件
8. 然后：启用 security/validation 中间件
9. 然后：清理 crm-system 里的 db 副本和 html bak 文件

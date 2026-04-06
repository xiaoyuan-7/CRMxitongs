# CRM 系统部署完成 ✅

## 部署信息

**部署时间:** 2026-04-06 11:09 GMT+8  
**部署位置:** `/home/admin/.openclaw/workspace/crm-system`

## 访问地址

### 本地访问
- **前端界面:** http://localhost:3001
- **API 端点:** http://localhost:3001/api
- **健康检查:** http://localhost:3001/api/health

### 局域网访问
- **前端界面:** http://172.17.62.95:3001
- **API 端点:** http://172.17.62.95:3001/api

### 公网访问
- **前端界面:** http://47.96.177.153:3001
- **API 端点:** http://47.96.177.153:3001/api

## 系统状态

✅ **后端服务:** 运行中 (PID: 3593)  
✅ **数据库:** SQLite (WAL 模式，已开启断电保护)  
✅ **自动备份:** 已启用 (每日凌晨 2 点)  
✅ **健康状态:** 正常

## 技术栈

- **前端:** React 18, Ant Design 5, Recharts
- **后端:** Node.js, Express 4
- **数据库:** SQLite 3
- **认证:** JWT, bcrypt

## 核心功能

### 企业管理
- 企业列表展示与筛选
- 企业详情（简介、财务、行业、上下游）
- 数据导出（CSV 格式）

### 关键人管理
- 多关键人支持
- 生日自动计算（年龄、生肖、下次生日）
- 主要联系人标记

### 营销进度
- 跟进记录管理
- 跟进频率统计
- 多种跟进类型（电话、拜访、微信、邮件、会议）

### 智能提醒
- 关键人生日提醒
- 节假日送礼提醒
- 自定义提醒

### 数据报表
- 转化率分析
- 跟进趋势图
- 业绩趋势图
- 进度状态分布

### 用户权限
- 用户注册/登录
- 角色管理（管理员/普通用户）
- JWT 认证

## 使用说明

### 首次使用
1. 访问 http://172.17.62.95:3001
2. 点击"注册账号"创建管理员账户
3. 登录后即可开始使用

### 添加企业
1. 进入"企业管理"页面
2. 点击"新增企业"按钮
3. 填写企业信息并保存

### 添加关键人
1. 进入企业详情页
2. 在"关键人列表"标签页点击"添加关键人"
3. 填写关键人信息，可设置为主要联系人

### 设置提醒
1. 进入"提醒中心"页面
2. 点击"生成本年生日提醒"自动为所有关键人生成生日提醒
3. 点击"生成节假日送礼提醒"自动生成节假日送礼提醒
4. 也可手动添加自定义提醒

## 服务管理

### 查看服务状态
```bash
ps aux | grep "node server.js"
```

### 停止服务
```bash
# 找到进程 PID
ps aux | grep "node server.js"

# 停止服务（会自动备份数据库）
kill <PID>
```

### 重启服务
```bash
cd /home/admin/.openclaw/workspace/crm-system/backend
PORT=3001 HOST=0.0.0.0 node server.js &
```

### 查看日志
```bash
# 后端日志在启动终端中查看
# 或查看数据库备份
ls -lh /home/admin/.openclaw/workspace/crm-system/backend/data/backups/
```

## 数据库管理

### 数据库位置
`/home/admin/.openclaw/workspace/crm-system/backend/crm.db`

### 手动备份
```bash
cd /home/admin/.openclaw/workspace/crm-system/backend
./backup-db.sh
```

### 备份文件位置
`/home/admin/.openclaw/workspace/crm-system/backend/data/backups/`

## 安全说明

⚠️ **重要:** 默认 JWT 密钥仅用于开发环境，生产环境请修改：

1. 创建 `.env` 文件：
```bash
cd /home/admin/.openclaw/workspace/crm-system/backend
cp .env.example .env
```

2. 编辑 `.env` 文件，修改 `JWT_SECRET` 为随机字符串

3. 重启服务使配置生效

## 防火墙配置

如需从外部访问，请确保服务器防火墙允许 3001 端口：

```bash
# 如果使用 ufw
sudo ufw allow 3001/tcp

# 如果使用 firewalld
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload

# 如果使用 iptables
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
```

## 阿里云安全组 ⚠️ 重要

你的服务器 IP：**47.96.177.153**

**必须配置安全组才能从公网访问！**

请登录阿里云控制台 → 云服务器 ECS → 安全组，添加入站规则：

| 配置项 | 值 |
|--------|-----|
| 端口范围 | 3001/3001 |
| 授权对象 | 0.0.0.0/0（允许所有 IP）或指定 IP |
| 协议类型 | TCP |
| 优先级 | 1（最高） |
| 策略 | 允许 |

**验证配置：**
配置完成后，在浏览器访问 http://47.96.177.153:3001 测试

## 系统维护

### 定期维护建议
1. 每周检查数据库备份文件
2. 每月清理过期的备份文件（保留最近 3 个月）
3. 定期检查系统日志
4. 更新 Node.js 和依赖包

### 数据导出
- 进入"系统设置"页面
- 点击"导出企业数据 (CSV)"
- 数据将自动下载为 CSV 文件

## 故障排查

### 服务无法启动
1. 检查端口是否被占用：`netstat -tlnp | grep 3001`
2. 检查 Node.js 版本：`node -v`（需要 >= 14.0.0）
3. 检查依赖是否安装：`cd backend && npm install`

### 数据库错误
1. 检查数据库文件权限：`ls -lh backend/crm.db`
2. 运行数据库完整性检查
3. 从备份恢复：`cp backend/data/backups/crm_*.db backend/crm.db`

### 前端无法访问
1. 检查后端服务是否运行
2. 检查防火墙设置
3. 查看健康检查接口：`curl http://localhost:3001/api/health`

## 技术支持

如有问题，请参考项目文档：
- 项目 README: `/home/admin/.openclaw/workspace/crm-system/README.md`
- 快速开始：`/home/admin/.openclaw/workspace/crm-system/QUICKSTART.md`
- 部署指南：`/home/admin/.openclaw/workspace/crm-system/本地化部署指南.md`

---

**部署完成！** 🎉  
系统已就绪，可以开始使用。

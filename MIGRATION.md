# CRM 系统迁移指南

## 📦 系统可以迁移到其他电脑使用！

本系统采用 **Node.js + SQLite** 技术栈，完全可以迁移到其他电脑或服务器使用。

---

## 🚀 三种使用方式

### 方案一：远程访问（推荐）

**适用场景：** 云服务器部署，多台电脑通过浏览器访问

**配置步骤：**

1. **修改后端监听地址**
   ```bash
   # 编辑 /root/.openclaw/workspace/crm-system/backend/server.js
   # 将监听地址从 'localhost' 改为 '0.0.0.0'
   ```

2. **开放防火墙端口**
   ```bash
   # 阿里云/腾讯云安全组开放 3001 端口
   # 本地防火墙开放 3001 端口
   ```

3. **在其他电脑浏览器访问**
   ```
   http://<云服务器 IP>:3000
   ```

**优点：** 
- 数据集中管理
- 多设备同步访问
- 无需重复部署

**缺点：**
- 需要云服务器有公网 IP
- 需要配置网络安全组

---

### 方案二：完整打包迁移

**适用场景：** 将整个系统复制到其他电脑（Windows/Mac/Linux）

**打包步骤：**

```bash
# 1. 在云服务器上打包整个项目
cd /root/.openclaw/workspace/
tar -czf crm-system-backup.tar.gz crm-system/

# 2. 下载打包文件到本地
# 使用 SCP 或 FTP 下载 crm-system-backup.tar.gz

# 3. 在新电脑上解压
tar -xzf crm-system-backup.tar.gz
cd crm-system
```

**新电脑环境要求：**
- Node.js >= 14.0.0（推荐 v18+）
- npm >= 6.0.0

**启动步骤：**
```bash
# 1. 安装后端依赖
cd backend
npm install

# 2. 启动后端
node server.js

# 3. 新开终端，启动前端
cd ../frontend-simple
python3 -m http.server 3000

# 4. 浏览器访问 http://localhost:3000
```

**数据迁移：**
- 数据库文件：`backend/crm.db`（包含所有企业、关键人、跟进记录）
- 直接复制此文件即可迁移全部数据

**优点：**
- 完全离线使用
- 数据本地存储
- 不依赖云服务器

**缺点：**
- 每台电脑数据独立，不同步

---

### 方案三：Docker 部署（最方便）

**适用场景：** 任何支持 Docker 的系统

**创建 Dockerfile：**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/ ./backend/
COPY frontend-simple/ ./frontend-simple/

RUN cd backend && npm install

EXPOSE 3000 3001

CMD ["sh", "-c", "cd /app/backend && node server.js & cd /app/frontend-simple && python3 -m http.server 3000"]
```

**构建和运行：**
```bash
docker build -t crm-system .
docker run -d -p 3000:3000 -p 3001:3001 --name crm crm-system
```

**优点：**
- 一次构建，到处运行
- 环境隔离，无依赖冲突
- 部署简单

---

## 📊 数据备份与恢复

### 备份数据库
```bash
# 简单复制数据库文件
cp /root/.openclaw/workspace/crm-system/backend/crm.db ./crm-backup-$(date +%Y%m%d).db
```

### 恢复数据库
```bash
# 将备份文件复制回原位置
cp ./crm-backup-20260316.db /root/.openclaw/workspace/crm-system/backend/crm.db
```

### 导出全部数据（CSV 格式）
```bash
sqlite3 /root/.openclaw/workspace/crm-system/backend/crm.db <<EOF
.headers on
.mode csv
.output companies.csv
SELECT * FROM companies;
.output contacts.csv
SELECT * FROM contacts;
.output marketing_progress.csv
SELECT * FROM marketing_progress;
.output reminders.csv
SELECT * FROM reminders;
EOF
```

---

## 🔧 常见问题

### Q1: Windows 系统能运行吗？
**可以！** Windows 需要：
1. 安装 Node.js（https://nodejs.org）
2. 安装 Python（用于前端简单 HTTP 服务，或使用其他静态服务器）
3. 按方案二解压后运行

### Q2: 多台电脑数据能同步吗？
**当前版本不支持实时同步**。建议：
- 使用方案一（云服务器部署），所有电脑访问同一服务器
- 或定期手动同步数据库文件

### Q3: 迁移后数据会丢失吗？
**不会！** 只要保留 `backend/crm.db` 文件，所有数据都会完整保留。

### Q4: 可以在内网服务器部署吗？
**可以！** 只需在内网服务器部署，其他电脑通过内网 IP 访问即可。

---

## 📋 快速迁移清单

- [ ] 确认目标电脑已安装 Node.js
- [ ] 打包整个 `crm-system` 文件夹
- [ ] 复制 `backend/crm.db` 数据库文件
- [ ] 在目标电脑解压
- [ ] 运行 `npm install` 安装依赖
- [ ] 启动后端和前端服务
- [ ] 浏览器访问测试
- [ ] 验证数据完整性

---

## 💡 推荐方案

| 使用场景 | 推荐方案 |
|---------|---------|
| 单人多设备使用 | 方案一（云服务器） |
| 离线独立使用 | 方案二（打包迁移） |
| 团队多用户使用 | 方案一（云服务器） |
| 快速部署测试 | 方案三（Docker） |

---

**需要我帮您配置远程访问或打包文件吗？** 📦

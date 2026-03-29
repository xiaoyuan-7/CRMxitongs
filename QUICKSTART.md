# CRM 系统快速启动指南

## 📦 项目已准备就绪

所有代码和依赖已安装完成，可以直接启动使用。

## 🚀 启动方式

### 方式一：使用启动脚本（推荐）

```bash
cd /root/.openclaw/workspace/crm-system
./start.sh
```

### 方式二：分别启动

**终端 1 - 启动后端：**
```bash
cd /root/.openclaw/workspace/crm-system/backend
npm start
```

**终端 2 - 启动前端：**
```bash
cd /root/.openclaw/workspace/crm-system/frontend
npm start
```

## 🔐 默认登录信息

系统已创建示例数据，包括：

**管理员账户：**
- 用户名：`admin`
- 密码：`admin123`

**示例企业：** 5 家（科技有限公司、贸易公司、制造企业、咨询服务公司、零售连锁）

**示例关键人：** 每个企业 2 名关键人

## 🌐 访问地址

启动后访问：
- **前端界面：** http://localhost:3000
- **后端 API：** http://localhost:3001

## 📋 功能清单

✅ 已实现的核心功能：

1. **企业管理**
   - 企业列表（含搜索、筛选）
   - 企业详情（简介、财务、行业、上下游）
   - 增删改查操作

2. **关键人管理**
   - 多关键人支持
   - 关键人详情（生日、职位、家庭、喜好、送礼建议）
   - 主要联系人标记
   - 年龄、生肖自动计算

3. **营销进度**
   - 跟进记录管理
   - 跟进频率统计
   - 多种跟进类型

4. **智能提醒**
   - 生日提醒自动生成
   - 节假日送礼提醒
   - 今日/即将到期提醒

5. **数据报表**
   - 转化率分析
   - 跟进趋势图
   - 业绩趋势图
   - 进度分布图
   - 转化漏斗

6. **系统功能**
   - 用户注册/登录
   - 权限管理
   - 数据导出（CSV）

## 🔧 常见问题

### 端口被占用

如果 3000 或 3001 端口被占用，可以修改：
- 前端：`frontend/package.json` 中的 `proxy` 配置
- 后端：`backend/server.js` 中的 `PORT` 变量

### 数据库位置

SQLite 数据库文件位于：`backend/crm.db`

备份时请复制此文件。

### 生产环境部署

1. 构建前端：`cd frontend && npm run build`
2. 启动后端：`cd backend && npm start`
3. 访问：http://localhost:3001

## 📞 技术支持

详细文档请查看 `README.md`

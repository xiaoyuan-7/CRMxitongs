# 客户管理系统 CRM

一个功能完整的本地客户管理系统，采用 React + Node.js + SQLite 技术栈，适合轻量级本地部署。

## 📋 功能特性

### 核心功能

1. **企业管理**
   - 企业列表展示（企业名称、关键人、开户状态、代发状态、有效户、高质量、进度状态）
   - 企业详情（企业简介、财务信息、行业、上下游信息）
   - 搜索和筛选功能
   - 数据导出（CSV 格式）

2. **关键人管理**
   - 多关键人支持（每个企业可添加多个关键人）
   - 关键人详情（出生年月、职位、家庭信息、喜好、推荐送礼）
   - 主要联系人标记
   - 生日自动计算（年龄、生肖、下次生日）

3. **营销进度管理**
   - 跟进记录（日期、类型、内容、下次跟进）
   - 跟进频率统计
   - 多种跟进类型（电话、拜访、微信、邮件、会议）

4. **智能提醒**
   - 关键人生日提醒
   - 节假日送礼提醒
   - 自定义提醒
   - 今日提醒/即将到期提醒

5. **数据报表**
   - 转化率分析（开户、代发、有效户、高质量）
   - 跟进趋势图（30 天）
   - 业绩趋势图（6 个月）
   - 进度状态分布
   - 转化漏斗

6. **用户权限**
   - 用户注册/登录
   - 角色管理（管理员/普通用户）
   - JWT 认证

## 🏗️ 项目结构

```
crm-system/
├── backend/
│   ├── server.js           # 主服务器
│   ├── database.js         # 数据库配置
│   ├── routes/
│   │   ├── companies.js    # 企业 API
│   │   ├── contacts.js     # 关键人 API
│   │   ├── marketing.js    # 营销进度 API
│   │   ├── reminders.js    # 提醒 API
│   │   ├── dashboard.js    # 仪表盘 API
│   │   └── users.js        # 用户 API
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── MainLayout.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── CompanyList.js
│   │   │   ├── CompanyDetail.js
│   │   │   ├── ContactDetail.js
│   │   │   ├── Reminders.js
│   │   │   └── Settings.js
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤

#### 1. 安装后端依赖

```bash
cd /root/.openclaw/workspace/crm-system/backend
npm install
```

#### 2. 安装前端依赖

```bash
cd /root/.openclaw/workspace/crm-system/frontend
npm install
```

#### 3. 启动后端服务

```bash
cd /root/.openclaw/workspace/crm-system/backend
npm start
```

后端服务将在 http://localhost:3001 启动

#### 4. 启动前端开发服务器

```bash
cd /root/.openclaw/workspace/crm-system/frontend
npm start
```

前端将在 http://localhost:3000 启动

### 生产环境部署

#### 1. 构建前端

```bash
cd /root/.openclaw/workspace/crm-system/frontend
npm run build
```

#### 2. 启动后端（将提供静态文件）

```bash
cd /root/.openclaw/workspace/crm-system/backend
npm start
```

访问 http://localhost:3001 即可使用系统

## 📊 数据库 Schema

### 表结构

#### companies（企业表）
- id: 主键
- name: 企业名称
- introduction: 企业简介
- industry: 行业
- financial_info: 财务信息
- upstream_info: 上游信息
- downstream_info: 下游信息
- is_account_opened: 是否开户
- is_payroll_service: 是否代发
- is_active_customer: 是否有效户
- is_high_quality: 是否高质量
- progress_status: 进度状态

#### contacts（关键人表）
- id: 主键
- company_id: 企业 ID（外键）
- name: 姓名
- position: 职位
- birth_date: 出生年月
- family_info: 家庭信息
- preferences: 喜好
- gift_recommendations: 推荐送礼
- is_primary: 是否主要联系人

#### marketing_progress（营销进度表）
- id: 主键
- company_id: 企业 ID（外键）
- contact_id: 关键人 ID（外键）
- follow_up_date: 跟进日期
- follow_up_type: 跟进类型
- follow_up_content: 跟进内容
- next_follow_up_date: 下次跟进日期
- notes: 备注

#### reminders（提醒表）
- id: 主键
- user_id: 用户 ID
- contact_id: 关键人 ID（外键）
- company_id: 企业 ID（外键）
- reminder_type: 提醒类型
- reminder_date: 提醒日期
- title: 标题
- description: 描述
- is_completed: 是否完成

#### users（用户表）
- id: 主键
- username: 用户名
- password_hash: 密码哈希
- role: 角色（admin/user）

## 🔌 API 接口

### 企业 API
- `GET /api/companies` - 获取企业列表（支持搜索和筛选）
- `GET /api/companies/:id` - 获取企业详情
- `POST /api/companies` - 创建企业
- `PUT /api/companies/:id` - 更新企业
- `DELETE /api/companies/:id` - 删除企业

### 关键人 API
- `GET /api/contacts/company/:companyId` - 获取企业的关键人列表
- `GET /api/contacts/:id` - 获取关键人详情
- `GET /api/contacts/birthdays/upcoming` - 获取即将过生日的关键人
- `POST /api/contacts` - 创建关键人
- `PUT /api/contacts/:id` - 更新关键人
- `DELETE /api/contacts/:id` - 删除关键人

### 营销进度 API
- `GET /api/marketing/company/:companyId` - 获取企业的跟进记录
- `GET /api/marketing/stats/:companyId` - 获取跟进统计
- `POST /api/marketing` - 创建跟进记录
- `PUT /api/marketing/:id` - 更新跟进记录
- `DELETE /api/marketing/:id` - 删除跟进记录

### 提醒 API
- `GET /api/reminders` - 获取提醒列表
- `GET /api/reminders/today` - 获取今日提醒
- `GET /api/reminders/upcoming` - 获取即将到期的提醒
- `POST /api/reminders` - 创建提醒
- `POST /api/reminders/generate-birthday-reminders` - 生成生日提醒
- `POST /api/reminders/generate-gift-reminders` - 生成节假日送礼提醒
- `PUT /api/reminders/:id/complete` - 标记提醒为完成
- `DELETE /api/reminders/:id` - 删除提醒

### 仪表盘 API
- `GET /api/dashboard/stats` - 获取统计数据
- `GET /api/dashboard/conversion` - 获取转化率
- `GET /api/dashboard/follow-up-stats` - 获取跟进统计
- `GET /api/dashboard/performance-trend` - 获取业绩趋势
- `GET /api/dashboard/progress-distribution` - 获取进度分布
- `GET /api/dashboard/industry-distribution` - 获取行业分布

### 用户 API
- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users/me` - 获取当前用户信息
- `GET /api/users` - 获取所有用户（需管理员）
- `PUT /api/users/:id/role` - 更新用户角色（需管理员）
- `PUT /api/users/password` - 修改密码

## 💡 使用指南

### 首次使用

1. 启动系统后访问 http://localhost:3000
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

### 添加跟进记录

1. 进入企业详情页
2. 在"营销进度"标签页点击"添加跟进记录"
3. 填写跟进信息，可设置下次跟进日期

### 设置提醒

1. 进入"提醒中心"页面
2. 点击"生成本年生日提醒"自动为所有关键人生成生日提醒
3. 点击"生成节假日送礼提醒"自动生成节假日送礼提醒
4. 也可手动添加自定义提醒

### 数据导出

1. 进入"系统设置"页面
2. 点击"导出企业数据 (CSV)"
3. 数据将自动下载为 CSV 文件

## 🔒 安全说明

- 默认 JWT 密钥仅用于开发环境，生产环境请修改 `JWT_SECRET` 环境变量
- 密码使用 bcrypt 加密存储
- 建议定期备份数据库文件（backend/crm.db）

## 📝 技术栈

- **前端**: React 18, Ant Design 5, Recharts, React Router 6
- **后端**: Node.js, Express 4
- **数据库**: SQLite 3
- **认证**: JWT, bcrypt

## 📄 许可证

MIT License

## 🤝 支持

如有问题或建议，欢迎反馈。

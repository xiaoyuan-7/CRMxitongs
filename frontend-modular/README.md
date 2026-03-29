# CRM 系统 - 模块化版本

## 📁 目录结构

```
frontend-modular/
├── index.html              # 主入口 HTML
├── css/
│   └── styles.css         # 全局样式
└── js/
    ├── app.js             # 主入口 JS
    ├── utils/
    │   └── helpers.js     # 工具函数
    ├── services/
    │   └── ApiService.js  # API 服务层
    ├── managers/
    │   └── DataManager.js # 数据管理器
    └── components/
        └── UIComponents.js # UI 组件
```

## 🎯 模块说明

### utils/helpers.js
- `escapeHtml()` - XSS 防护
- `highlightText()` - 搜索高亮
- `debounce()` - 防抖函数
- `throttle()` - 节流函数
- `formatNumber()` - 数字格式化
- `storage` - 本地存储工具

### managers/DataManager.js
- 统一管理企业数据
- 观察者模式通知数据变化
- 记录历史数据计算趋势
- 提供数据统计方法

### services/ApiService.js
- `ApiCache` - API 缓存（5 分钟 TTL）
- `RequestController` - 请求取消控制
- `fetchWithCache()` - 带缓存的 API 请求
- `companyService` - 企业数据服务
- `taskService` - 任务数据服务
- `weekTaskService` - 周计划数据服务
- `leadService` - 线索数据服务

### components/UIComponents.js
- `renderTrend()` - 渲染趋势箭头
- `updateStatCard()` - 更新统计卡片
- `updateCircleProgress()` - 更新圆形进度条
- `updateProgressBar()` - 更新进度条
- `renderCompaniesTable()` - 渲染企业表格
- `renderTodoDropdown()` - 渲染待办下拉框

### app.js
- 应用入口和初始化
- 数据加载函数
- 标签页切换
- 搜索历史管理
- UI 辅助函数

## 🚀 使用方法

### 开发环境
```bash
# 使用任意静态文件服务器
npx serve frontend-modular/

# 或使用 Python
cd frontend-modular
python -m http.server 8080
```

### 生产环境
```bash
# 构建（可选，使用打包工具如 Vite/Rollup）
npm run build

# 部署到服务器
```

## 📊 优化成果

### 代码组织
- ✅ 单文件 2700+ 行 → 拆分为 6 个模块
- ✅ 全局变量 → 模块化导出
- ✅ 重复代码 → 统一工具函数

### 性能优化
- ✅ API 缓存（5 分钟）
- ✅ 请求取消（避免过期请求）
- ✅ 搜索防抖（300ms）

### 功能增强
- ✅ 趋势箭头（环比）
- ✅ 点击下钻
- ✅ 搜索高亮
- ✅ 搜索历史
- ✅ 全局 Loading

## 🔄 迁移指南

### 从单文件版本迁移
1. 备份现有 `frontend-simple/` 目录
2. 复制 `frontend-modular/` 到生产环境
3. 更新服务器配置指向新目录
4. 测试所有功能
5. 确认无误后删除旧版本

### 注意事项
- 模块版本使用 ES6 Modules，需要现代浏览器
- API 端点保持不变（`/api/*`）
- 本地存储键名保持不变
- CSS 类名保持不变

## 📝 待办事项

- [ ] 添加 TypeScript 支持
- [ ] 添加单元测试
- [ ] 添加构建配置（Vite/Rollup）
- [ ] 添加代码分割
- [ ] 添加 PWA 支持

## 📄 许可证

与主项目保持一致

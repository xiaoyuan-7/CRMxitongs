# CRM 系统 - 正式上线部署指南

## 🚀 快速部署

### 1. 启动服务

```bash
# 进入模块化版本目录
cd /root/.openclaw/workspace/crm-system/frontend-modular

# 使用 Node.js 启动（推荐）
npx serve .

# 或使用 Python
python3 -m http.server 8080

# 或使用 Nginx（生产环境）
# 配置见下方 Nginx 配置示例
```

### 2. 访问系统

打开浏览器访问：`http://localhost:3000`（或您配置的端口）

---

## 🔐 权限系统说明

### 默认账户

系统首次启动时，使用以下演示账户登录：

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 👑 管理员 | `admin` | `admin123` | 所有权限 |
| 📊 经理 | `manager` | `manager123` | 查看 + 编辑 |
| 📝 销售 | `sales` | `sales123` | 查看 + 部分编辑 |
| 👁️ 观察员 | `viewer` | `viewer123` | 只读 |

### 权限说明

**管理员（admin）：**
- ✅ 创建/编辑/删除企业
- ✅ 创建/编辑/删除任务
- ✅ 创建/编辑/删除线索
- ✅ 导出数据
- ✅ 用户管理

**经理（manager）：**
- ✅ 创建/编辑企业
- ❌ 删除企业
- ✅ 创建/编辑任务
- ✅ 创建/编辑线索
- ✅ 导出数据

**销售（sales）：**
- ✅ 编辑企业（自己负责的）
- ❌ 删除企业
- ✅ 编辑任务（自己的）
- ✅ 编辑线索（自己的）
- ❌ 导出数据

**观察员（viewer）：**
- ✅ 查看所有数据
- ❌ 创建/编辑/删除
- ❌ 导出数据

---

## 🔧 生产环境配置

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name crm.yourcompany.com;
    
    root /root/.openclaw/workspace/crm-system/frontend-modular;
    index index.html;
    
    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    # 缓存静态资源
    location ~* \.(css|js|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Service Worker 不缓存
    location = /sw.js {
        add_header Cache-Control "no-cache";
    }
    
    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### HTTPS 配置（推荐）

```bash
# 使用 Let's Encrypt 免费证书
sudo certbot --nginx -d crm.yourcompany.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📊 监控与维护

### 查看系统状态

打开浏览器控制台，查看监控日志：
- `[App]` - 应用启动日志
- `[Monitor]` - 性能监控日志
- `[SW]` - Service Worker 日志
- `[Cache]` - 缓存命中/未命中日志

### 清除缓存

用户可在控制台执行：
```javascript
// 清除所有缓存
navigator.serviceWorker.ready.then(registration => {
    registration.active.postMessage({ type: 'CLEAR_CACHE' });
});

// 清除本地存储
localStorage.clear();
```

### 数据备份

```bash
# 备份 SQLite 数据库
cp /root/.openclaw/workspace/crm-system/backend/data.db \
   /root/.openclaw/workspace/crm-system/backup/data.db.$(date +%Y%m%d)

# 备份前端配置
tar -czf /root/.openclaw/workspace/crm-system/backup/frontend.$(date +%Y%m%d).tar.gz \
    /root/.openclaw/workspace/crm-system/frontend-modular/
```

---

## 🔒 安全建议

### 1. 修改默认密码

首次登录后，立即修改默认密码：
```javascript
// 在后端实现密码修改接口
// 前端调用 authService.changePassword(oldPwd, newPwd)
```

### 2. 会话管理

- 默认会话 8 小时过期
- 登出后自动清除本地数据
- 支持强制下线（后端实现）

### 3. 数据保护

- 敏感操作（删除/导出）需要权限
- 所有 API 请求记录日志
- 支持操作审计（需后端配合）

---

## 📱 移动端支持

系统已适配移动端：
- 响应式布局
- 触摸友好交互
- 离线访问支持

---

## 🆘 故障排除

### 问题 1：无法登录

**症状：** 登录框一直显示

**解决：**
```bash
# 清除浏览器缓存
# 检查后端服务是否运行
# 查看浏览器控制台错误日志
```

### 问题 2：数据不显示

**症状：** 页面空白或显示"暂无数据"

**解决：**
```bash
# 检查 API 服务是否正常
curl http://localhost:3001/api/companies

# 清除本地缓存
localStorage.clear();
location.reload();
```

### 问题 3：Service Worker 问题

**症状：** 离线功能不工作

**解决：**
```javascript
// 在控制台执行
navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
    location.reload();
});
```

---

## 📞 技术支持

如遇到问题，请提供以下信息：
1. 浏览器版本
2. 控制台错误日志
3. 网络请求日志
4. 复现步骤

---

**祝部署顺利！** 🎉

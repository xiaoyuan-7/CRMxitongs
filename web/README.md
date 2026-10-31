# web/ · 单页应用

> **目的**: 浏览器里看所有行业研究文档 + 搜索 + 跨文档导航
> **技术栈**: 纯静态 HTML/CSS/JS,无后端,无需 build 工具链(只有一个 build.js 生成数据)

---

## 🚀 启动

### 方式 A:本地打开

```bash
cd industry-research/web
python3 -m http.server 8000
# 浏览器 http://localhost:8000/
```

**必须用 HTTP 协议** — 不要直接双击 index.html(部分浏览器对 file:// 有安全限制,搜索/快捷键会失效)

### 方式 B:VSCode Live Server

如果你用 VSCode,装 "Live Server" 插件,右键 index.html → "Open with Live Server",自动 5500 端口。

### 方式 C:部署到内网

```bash
# 任何静态服务器都 OK(Nginx / Apache / Caddy)
# 把 web/ 整个目录放到 webroot
# 注意:data.js 1MB,首次加载稍慢(~2 秒)
```

---

## 📁 文件结构

```
web/
├── index.html        # 入口 HTML(极简,只放结构)
├── styles.css        # 样式(深色/浅色模式)
├── app.js            # 核心逻辑:导航 / Markdown 渲染 / 搜索 / 快捷键
├── data.js           # ⭐ 自动生成(1MB,从 MD 文件构建)
├── build.js          # ⭐ 重建 data.js 的脚本
└── README.md         # 本文档
```

---

## 🔄 重建 data.js

**何时需要重建?**
- 改了赛道目录下的 .md 文件
- 改了 已分类/ 目录下的 .md 文件
- 加了新赛道 / 新文档
- 跑了 `_generate_industry_mds.py` 重新生成已分类 MD

**怎么重建?**

```bash
cd industry-research/web/
node build.js
```

**预期输出**:
```
📋 已分类目录扫描: 45 个企业分类文档加入
✅ data.js 已重新生成
   赛道: 6
   文档: 111
   大小: 1032.0 KB
   路径: .../data.js
```

**注意事项**:
- ⚠️ `build.js` 会扫 `industry-research/` 根目录,找到的子目录如果在 TRACKS 数组里就当作赛道
- ⚠️ 必须在 `industry-research/web/` 目录里跑(用相对路径)
- ⚠️ 需要 Node.js(随便哪个版本都行)

---

## 🎨 添加新赛道

### 步骤

1. **创建赛道目录**(在 `industry-research/` 根目录)
   ```
   mkdir industry-research/new-track/
   ```

2. **写 15 个 MD**(参考 `medical-devices/` 的 01-14.md 结构)
   - README.md(必填,build.js 会扫)
   - 01-行业地图.md
   - 02-30天学习路径.md
   - 03-代表企业清单.md
   - ... 以此类推

3. **在 `build.js` 的 TRACKS 数组里加配置**
   ```js
   {
     id: 'new-track',
     name: '新赛道名称',
     icon: '🚀',
     color: '#3b82f6',
     priority: '主攻',
     description: '一句话简介',
     docs: [
       { id: 'readme', file: 'README.md', title: '赛道说明' },
       { id: 'industry-map', file: '01-行业地图.md', title: '行业地图' },
       // ... 共 15 个
     ]
   }
   ```

4. **跑 `node build.js` 重建**

5. **刷新浏览器**

---

## 🎨 加新文档到现有赛道

直接加 .md 文件到对应赛道目录,然后跑 `node build.js`。

**示例**: 给 `medical-devices/` 加 `15-案例研究.md`

1. 创建文件 `industry-research/medical-devices/15-案例研究.md`
2. 编辑 `web/build.js` 的 medical-devices TRACKS:
   ```js
   docs: [
     // ... 现有 15 个
     { id: 'case-study', file: '15-案例研究.md', title: '案例研究' },
   ]
   ```
3. `cd web && node build.js`
4. 刷新

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl/⌘ + K` | 唤起搜索(跨所有文档) |
| `←` `→` | 上一篇 / 下一篇 |
| `Esc` | 关闭搜索框 |
| `🖨️ 打印` 按钮 | 打印当前文档(支持转 PDF) |
| `🏠 首页` 按钮 | 回到首页 |

---

## 🎨 主题

支持深色/浅色模式:看系统偏好自动切换(media query)。
强制切换:改 styles.css 的 `:root[data-theme="dark"]` 选择器。

---

## 🐛 故障排查

### Q: 浏览器打开空白页
A: 检查 console (F12),大概率是 data.js 没加载。看 Network 标签确认 data.js 状态码 200。

### Q: 改了 MD 但浏览器没变化
A: 需要 `node build.js` 重建 data.js。改 MD 后忘了 build 是最常见错误。

### Q: 搜索不到关键词
A: 搜索基于 `title + body`,MD 渲染后的纯文本参与搜索。如果关键词在表格里,可能不被命中(因为表格 HTML 结构复杂)。

### Q: data.js 太大(>2MB)
A: 加赛道会增加。建议不要加太多"00-清单.md" — 它们的客户表行数多但信息密度低。

### Q: 移动端样式乱
A: styles.css 的 `@media` 应该处理了大部分情况。如果乱,清浏览器缓存。

---

## 📊 当前数据规模

- data.js: **1056KB**(2026-07-20)
- 赛道: 6 个
- 文档: 111 个(60 深度文档 + 45 已分类 MD + 6 个其他)
- 启动加载: ~500ms(本地 HTTP)
- 搜索响应: <50ms(纯前端,无需服务器)

---

最后更新: 2026-07-20
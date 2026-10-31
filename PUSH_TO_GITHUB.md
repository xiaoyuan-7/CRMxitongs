# 推到 GitHub

本目录**已经是 git 仓库**（branch `main`，首个 commit `chore: 导入 对公行业研究系统`）。

| 项 | 值 |
|---|---|
| 追踪文件 | 430 个 |
| 原始体积 | 337 MB |
| **实际 push 体积** | **~45 MB**（已 `git gc` 压缩） |
| 远端仓库 | 默认 `industry-research`（private） |

## ⚠️ 可见性必须是 private

仓库里包含：银行对公客户名单、专精特新 5000 家名单、链主网络、G2B 政府采购中标专业户、
客户拜访跟进记录。**公开 = 数据泄露。** `push-to-github.sh` 会拒绝 `public` 参数。

## 一、先拿 PAT

1. 打开 <https://github.com/settings/tokens>
2. **Generate new token (classic)**
3. Note 随便填（比如 `industry-research`）
4. Expiration 选个长一点的
5. **勾选 `repo`** scope ← 必须
6. Generate → 复制 `ghp_...`（只显示一次）

## 二、一条命令推上去

```bash
cd "C:/Users/Administrator/Desktop/industry-research"
GH_TOKEN=ghp_你的token GH_USER=你的GitHub用户名 bash push-to-github.sh
```

脚本会：校验 token → 建私有仓库 → 设 remote → push。约 1~3 分钟。

推完链接是 `https://github.com/<你的用户名>/industry-research`。

## 没装 Git / 不想用命令行？

下载 <https://git-scm.com/download/win>，装完后在 **Git Bash** 里执行上面的命令。
注意：**不要用 PowerShell 的 `bash`**（Windows 自带的是 WSL 的 bash，路径要改成 `/mnt/c/...`）。

## 仓库里没放什么（本地保留）

- `workbench.bak-*/` — 6 份工作台历史快照，约 1.5 GB
- `*.bak-*` / `*.bad-*` — 数据文件历史版本
- `node_modules/`、`__pycache__/`
- `名单/_archive/`

详见 `.gitignore`。

## 日常使用

```bash
git add -A
git commit -m "描述"
git push
```

> 提醒：`workbench/scripts/_build_workbench_data.py` 是**数据生成器**，会冲掉手工标注；
> 改白名单/赛道定义时只动常量 + 重跑 `_import_tech_v2.py`。

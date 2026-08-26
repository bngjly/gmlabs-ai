# 部署 & 运维 & 踩坑（gmlabs.ai）

> 本文档记录部署流程与本项目特有的坑。改动前先读，避免重踩。

## 部署：只用 `git push`，别用 Vercel CLI

Vercel↔GitHub 集成已连接（bngjly/gmlabs-ai）。**`git push origin main` 即触发自动部署，约 40 秒上线**。

```bash
git fetch origin && git rebase origin/main   # KOL 工作流每小时 push，先 rebase 防冲突
git push origin main                          # 自动部署，无需手动
```

- ❌ **不要用 `vercel --prod`**：开发者在中国区，vercel.com 的 CLI API 经常 TLS socket 断开（`vercel ls` / `vercel git connect` 随机失败）。部署走 GitHub→Vercel 服务端 webhook，绕过本地不稳定通道。
- 规范域 `www.gmlabs.ai`（apex `gmlabs.ai` 308→www）。

## `git fetch`/`push` 断线（`unexpected disconnect while reading sideband packet`）→ 已根治

**根因**：remote 原来是 SSH 协议（`git@github.com:...`）。SSH 连接**不会走 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量**（那两个只代理 HTTP(S) 流量），所以 git 的大数据量传输是直连裸奔，在中国区容易被中间打断；SSH 握手包小、耗时短，能扛住，看起来像"连得上又传不动"，容易误判成"网络抖动"随缘重试。

**修复**（已在本仓库生效，一次性，不用每次重配）：
```bash
git remote set-url origin https://github.com/bngjly/gmlabs-ai.git   # SSH → HTTPS
git config http.proxy http://127.0.0.1:7890                         # 走本地代理(仓库级配置,不影响其他repo)
```
HTTPS 走代理后传输稳定；Windows 凭据管理器已缓存 GitHub 认证，切换后无需重新登录。**遇到同类断线，先诊断是不是 SSH 裸奔的问题**（`ssh -vT git@github.com` 握手能通但 `git fetch` 传不动 = 这个坑），不要直接当成"网络不好"重试了事。

## `[skip ci]` 会让 Vercel 跳过部署

Vercel 跳过 commit message 含 `[skip ci]` 的提交。
- `nightly-scores.yml`：**已移除** `[skip ci]` → 每日评分刷新自动部署进生产（SEO 正文 / home_stats 依赖最新评分）。
- `refresh-kol.yml`：**保留** `[skip ci]` → 每小时太频繁不部署；KOL Tab 走实时 API proxy，`kol_cache.json` 仅兜底。

## ⚠️ 验证陷阱：验对象，别验错层

本项目多处"看到的 ≠ 源文件"，验证生产改动必须查对层，否则会误判"已修复"：

| 改的东西 | ❌ 错误验证 | ✅ 正确验证 |
|---|---|---|
| **首页文案/标语** | `curl` 原始 HTML | 渲染后 DOM——文案由 `applyI18n()` 用 **`i18n.js`** 字典覆盖；改文案要改 `i18n.js`（如 `home.hero.sub`），不是 index.html 写死值 |
| **公司页 SEO 正文** | 看 index.html body | 公司内容在 iframe(graph.html)/JS 里，主文档对爬虫是空壳；正文由 `middleware.js` 服务端注入 `?t=TICKER` 页 |
| **任何生产改动** | 浏览器直接看（可能缓存） | 带 cache-bust：`Invoke-WebRequest "https://www.gmlabs.ai/...?_cb=$(Get-Random)" -Headers @{'Cache-Control'='no-cache'}`；改 .js（如 i18n.js）后用户需 **Ctrl+F5 硬刷新** |

## 性能：首页统计走预聚合，别拉全量

- `scores.json` 142KB，直接客户端拉会卡 2-3s"载入中"。
- 首页统计卡 + S/A 标签由 `scoring/build_home_stats.py` 预聚合成 `home_stats.json`（~1KB），`renderHomeStatsFast()` 秒出；全量 scores.json 仅供下方质量×估值矩阵后台加载。
- `home_stats.json` 在 `nightly-scores.yml` 评分刷新后自动重算。
- 数据 JSON（scores/serenity_pool/ai_exposure/kol_cache/home_stats）在 `vercel.json` 配了 CDN+浏览器缓存（部署会自动清边缘缓存保证新数据）。

## 营销分发工具

- `marketing/share_kit.py TICKER`：生成 X/小红书/TG/YouTube 多平台文案 + 带 UTM 深链。
- `marketing/UTM_CONVENTION.md`：UTM 参数字典。
- `marketing/VIDEO_SERIES_TEMPLATE.md`：测评系列固定模板 + 选题优先级。
- `marketing/scripts/`：每集配音脚本。

## 待办（本文档外的遗留问题）
- `README.md` 编码损坏（乱码）且过时（部署命令仍写 `vercel --prod`、评分维度与 `scoring/score_companies.py` 不一致：实际为 G1 AI收入纯度 / G2 护城河 / G3 成长动能 / G4 盈利质量 / G5 估值合理性 / G6 生态卡位）——需重写。

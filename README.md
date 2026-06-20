# ChainGraph · gmlabs.ai

全球 AI 产业链共建图谱 + 六维客观评分 + KOL 观点聚合平台。

## 文件结构

```
gmlabs-ai/
├── index.html          # 落地页 SPA（首页 / 图谱 / KOL 观点 / 研究笔记）
├── graph.html          # 完整交互式 AI 产业链图谱（11 层，350+ 公司，被 iframe 嵌入）
├── i18n.js             # 中英文双语字典（页面文案的真实来源，applyI18n 渲染覆盖）
├── middleware.js       # Edge Middleware：?t=TICKER 深链页注入 SEO meta + 公司正文 + OG 卡
├── scores.json         # 六维客观评分数据（GitHub Actions 每日刷新，~142KB）
├── home_stats.json     # 首页统计预聚合（~1KB，进站秒出，免拉全量 scores.json）
├── ai_exposure.json    # AI 暴露度标注（高/中/低）
├── serenity_pool.json  # Serenity 250 只公开提及标的 + 情绪标签
├── kol_cache.json      # KOL 观点缓存（每小时自动刷新，实时 API 的兜底）
├── robots.txt          # 爬虫指引（指向 sitemap）
├── api/
│   ├── analyze.js      # Serverless — Gemini AI 深度分析
│   ├── kol.js          # Serverless — KOL 观点 API 代理
│   ├── og.js           # Edge — 动态 OG 评分卡图（/api/og?t=TICKER）
│   └── sitemap.js      # Edge — 动态 sitemap.xml（读 scores.json 列全部公司深链）
├── scoring/            # 评分脚本（Python + GitHub Actions）
│   ├── score_companies.py  # 六维评分核心（权重/阈值的权威来源）
│   └── build_home_stats.py # 预聚合 home_stats.json
├── marketing/          # 内容分发工具（share_kit.py / UTM 规范 / 视频模板 / 脚本）
├── vercel.json         # Vercel 配置（rewrites + 缓存 + 安全 headers）
├── DEPLOY.md           # ⚠️ 部署纪律 + 验证陷阱 + 踩坑（改动前必读）
├── STRATEGY.md         # 评分体系 / 策略权威文档
└── README.md           # 本文件
```

## 四个 Tab

| Tab | 描述 |
|-----|------|
| 首页 | 产品介绍、S/A 级标的展示、质量×估值矩阵、Telegram 订阅引导 |
| 图谱 | 11 层 AI 产业链交互式图谱（iframe 嵌入 graph.html）|
| KOL 观点 | 著名 KOL 实时观点流 + Serenity 250 只 ticker 热力榜 |
| 研究笔记 | 本地自选管理、对公司导出、评分查看 |

## 评分体系

六维客观模型（yfinance 基本面数据，每日刷新），**总分 100，按行业动态调权**（各维满分因公司而异）：

| 维度 | 内容 |
|------|------|
| G1 AI 收入纯度 | AI 相关营收占比 |
| G2 护城河 / 壁垒 | CUDA 类生态、技术代差、市场地位 |
| G3 成长动能 | 营收/EPS 增速 |
| G4 盈利质量 | 毛利率、ROE、FCF |
| G5 估值合理性 | PEG / P/E / EV-EBITDA / FCF Yield |
| G6 生态卡位 | 在 AI 产业链的卡位完整度 |

> 等级阈值、各维权重逻辑以 `scoring/score_companies.py` 和 `STRATEGY.md` 为准。
> 补充维度 **AI 暴露度**（高 ≥ 50% / 中 15-50% / 低 < 15% AI 相关营收占比）。

## SEO / 分享深链

- **深链直达**：`gmlabs.ai/?t=TICKER` 进站自动展开该公司评分（视频/社媒引流用）。
- **动态 OG 卡**：分享到 Twitter/Telegram/Discord 时显示该公司评分卡图（`/api/og?t=TICKER`）。
- **SEO 正文**：middleware 给每个深链页服务端注入可见公司正文，解决 iframe 空壳的 thin content 问题。
- **sitemap**：`/sitemap.xml` 动态列出全部公司深链，已提交 Google Search Console。

## 营销分发

```bash
python marketing/share_kit.py NVDA        # 生成多平台文案 + 带 UTM 深链
python marketing/share_kit.py --top 5     # 今日评分 top5
```
详见 `marketing/`（UTM 规范、视频测评系列模板、逐集脚本）。

## VPS 后端

VPS 运行 `twitter_monitor` 服务：每小时轮询 KOL 观点 → Telegram 双推（私聊 + 公开频道 @yoyoaidaily），supervisor 进程管理。

## 本地预览

```bash
npx serve -s .
```

## 部署

**只用 `git push`，别用 `vercel --prod` CLI**（详细原因 + 验证陷阱见 [DEPLOY.md](DEPLOY.md)）：

```bash
git fetch origin && git rebase origin/main   # KOL 工作流每小时 push，先 rebase
git push origin main                          # GitHub→Vercel webhook 自动部署，约 40s
```

## 成本

| 项 | 费用 |
|---|---|
| Vercel Hosting | $0 |
| KOL 数据 API | $0 |
| Telegram Bot | $0 |
| 域名 gmlabs.ai | 已付 |
| **当前月成本** | **$0** |

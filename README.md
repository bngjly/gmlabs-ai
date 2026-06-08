# ChainGraph · gmlabs.ai

全球 AI 产业链共建图谱 + AI 深度分析 + KOL 观点聚合平台。

## 当前文件结构

```
gmlabs-ai/
├── index.html          # 落地页 SPA（首页 / 图谱 / KOL 观点 / 研究笔记）
├── graph.html          # 完整交互式 AI 产业链图谱（11 层 350+ 公司）
├── i18n.js             # 中英文双语支持
├── scores.json         # 六维客观评分数据（GitHub Actions 每日刷新）
├── serenity_pool.json  # Serenity 250 只公开提及标的 + 情绪标签
├── api/
│   ├── analyze.js      # Vercel Serverless — Gemini AI 深度分析
│   └── kol.js          # Vercel Serverless — MasterTicker KOL 观点代理（CORS）
├── scoring/            # 评分脚本（Python + GitHub Actions）
├── vercel.json         # Vercel 部署配置 + 安全 headers
└── README.md           # 本文件
```

## 四个 Tab

| Tab | 描述 |
|-----|------|
| 首页 | 产品介绍、S/A 级标的展示、定价、早鸟邮箱收集 |
| 图谱 | 11 层 AI 产业链交互式图谱（iframe 嵌入 graph.html） |
| **KOL 观点** | MasterTicker API 实时 KOL 观点流 + Serenity 250 只 ticker 热力榜 |
| 研究笔记 | 本地自选管理、导入/导出、评分查看 |

## KOL 观点页

- **数据源**: MasterTicker 公开 API（`/api/kol` serverless proxy 解决 CORS）
- **筛选**: 多空立场（看多/看空/中性）+ 时间范围（24h/7d/30d）
- **图谱联动**: 图谱收录的 ticker 带 📌 标记，点击跳转定位
- **自动刷新**: 每 4 小时静默拉取最新数据，失败不打断用户
- **Serenity 热力榜**: 基于 `serenity_pool.json` 的 250 只历史提及标的排名
- **Telegram 订阅**: 占位 Banner（公开频道即将上线）

## VPS 后端联动

VPS（`37.60.251.23`）运行 `twitter_monitor` 服务：
- 每 4 小时轮询 MasterTicker API
- 新观点 → Telegram 推送 + 写入 `data/opinions.jsonl`
- supervisor 进程管理，日志 `/var/log/twitter_monitor.log`

## 本地预览

```bash
npx serve -s .
```

- 「图谱」Tab 通过 iframe 嵌入 `graph.html`，本地可能因浏览器安全策略不渲染，部署后正常
- 「KOL 观点」Tab 的 API 代理在本地不可用，部署到 Vercel 后自动生效

## 部署

```bash
cd "C:\Users\86135\Desktop\WorkSpace\gmlabs-ai"
vercel --prod
```

## 成本

| 项 | 费用 | 备注 |
|---|---|---|
| Vercel Hosting | $0 | Hobby 免费档（100GB/月带宽） |
| MasterTicker API | $0 | 公开免费，无需 key |
| Telegram Bot | $0 | 复用 VPS 交易策略 bot |
| 域名 gmlabs.ai | 已付 | |
| **当前月成本** | **$0** | |

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
├── kol_cache.json      # KOL 观点缓存（每小时自动刷新）
├── api/
│   ├── analyze.js      # Vercel Serverless — Gemini AI 深度分析
│   └── kol.js          # Vercel Serverless — KOL 观点 API 代理
├── scoring/            # 评分脚本（Python + GitHub Actions）
├── vercel.json         # Vercel 部署配置 + 安全 headers
└── README.md           # 本文件
```

## 四个 Tab

| Tab | 描述 |
|-----|------|
| 首页 | 产品介绍、S/A 级标的展示、定价、早鸟邮箱收集 |
| 图谱 | 11 层 AI 产业链交互式图谱（iframe 嵌入 graph.html） |
| **KOL 观点** | 著名 KOL 实时观点流 + Serenity 250 只 ticker 热力榜 |
| 研究笔记 | 本地自选管理、导入/导出、评分查看 |

## KOL 观点页

- **实时数据**: `/api/kol` serverless proxy 实时获取，静态缓存兜底
- **筛选**: 多空立场（看多/看空/中性）+ 时间范围（24h/7d/30d）+ KOL 人物选择
- **图谱联动**: 图谱收录的 ticker 带 📌 标记，点击跳转定位
- **Serenity 热力榜**: 基于 `serenity_pool.json` 的 250 只历史提及标的排名
- **Telegram 频道**: t.me/yoyoaidaily 公开订阅

## 评分体系

六维客观模型（yfinance 基本面数据，每晚刷新）：

| 维度 | 满分 | 内容 |
|------|------|------|
| G1 增长动能 | 25 | 营收/EPS 增速 + 加速度 |
| G2 盈利质量 | 25 | 毛利/营业利润率/ROE/FCF |
| G3 财务健康 | 15 | 负债率/流动性/利息保障 |
| G4 护城河 | 20 | 毛利率持续性/市场地位/内部人持股 |
| G5 股东回报 | 10 | 分红 + 回购 − SBC 稀释 |
| G6 估值合理性 | 15 | PEG / P/E / EV-EBITDA / FCF Yield |

**等级阈值（2026-06-11 冻结，不再为个股调整）**：S ≥ 82 · A ≥ 73 · B ≥ 58 · C ≥ 43 · D < 43

补充维度：**AI 暴露度**（人工标注：高 ≥50% / 中 15-50% / 低 <15% AI 相关营收占比），与六维分离展示——同为 S 级，AI 纯度不同含金量完全不同。

## VPS 后端

VPS（`37.60.251.23`）运行 `twitter_monitor` 服务：
- 每小时轮询 KOL 观点数据
- 新观点 → Telegram 推送（私聊 + 公开频道 @yoyoaidaily）
- supervisor 进程管理

## 本地预览

```bash
npx serve -s .
```

## 部署

```bash
cd "C:\Users\86135\Desktop\WorkSpace\gmlabs-ai"
vercel --prod
```

## 成本

| 项 | 费用 |
|---|---|
| Vercel Hosting | $0 |
| KOL 数据 API | $0 |
| Telegram Bot | $0 |
| 域名 gmlabs.ai | 已付 |
| **当前月成本** | **$0** |

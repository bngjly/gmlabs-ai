# YoYo AI 日报 — Design System

「YoYo AI 日报」是一个日更短视频栏目：每天 60 秒讲清一个 AI 产业链概念（全景图谱、CoWoS、CPO、OSAT…）。本设计系统沉淀了品牌色彩、字体、logo、动效节奏和视频场景模板，目标是**日更时只换内容、不重搭样式**。

## 品牌来源
- Logo：`assets/yoyo_ai.svg` / `assets/yoyo_ai_800.png`（用户提供，戴蓝框眼镜的角色 + 金圈 + 蓝色铭牌「YoYo AI 日报」）
- 已有视频：`AIChainVideo.jsx`（全景 70s）、`TermVideoScenes.jsx`（术语模板，横竖两版）、`CoWoSv2 / CPOv2 / OSATv2`

## CONTENT FUNDAMENTALS（文案基调）
- 口吻：科普向、口语化、有比喻。每个环节配一个「人话比喻」：HBM=记忆、封装=胶水、交换芯片=数据红绿灯、数据中心=水龙头。
- 结构：编号（01–12）+ 中文名 + 英文 MONO 标签（COMPUTE / MEMORY / OPTICS…）+ 一句 meta 说明。
- 中英混排：中文为主，专业名词保留英文缩写；数字与单位用 Space Grotesk / JetBrains Mono。
- 标点：说明句里用「·」分隔短语；不用感叹号轰炸；无 emoji。
- CTA 文案：片中「截图保存 · 转发给朋友」；片尾「关注 · 点赞 · 转发」。
- 语态：第三人称陈述 +「你」直呼观众（片头/CTA）。

## VISUAL FOUNDATIONS（视觉基础）
- **双色域**：正片浅色（冷白 #EEF1F7 画布 + 白卡片），片头/片尾/封面深色（藏青 #050F1E）。一支视频最多这两种背景。
- **强调色**：亮蓝 #1A8FFF（主）、天蓝 #82CFFF（高光）、金 #F0B90B（只作点缀，如 logo 金圈、interposer）。产业链 12 环节各有一个 oklch 环节色（见 `AIChainVideo.jsx` CHAIN 表），亮度/彩度一致、只变色相。
- **字体**：Space Grotesk（数字/英文展示）、PingFang SC / Microsoft YaHei（中文）、JetBrains Mono（编号/kicker）。kicker 一律 MONO + letter-spacing ≥0.16em + 全大写。
- **卡片**：白底、1px #DCE3ED 描边、左侧 4px 环节色边、圆角 13–16px、冷调阴影 `0 10px 30px rgba(10,24,40,0.07)`。
- **动效**：入场 easeOutCubic 0.55s + 上移 14–26px；弹入 easeOutBack 0.5s（scale 0.6→1）；场景切换 0.4s 交叉淡入淡出；列表项 stagger 0.06–1.4s。数据流用循环流动圆点。
- **版式**：1920×1080 横版（左图解 / 右卡片列），1080×1920 竖版（上下堆叠）。页边距 100px（横）/ 64px（竖）。HUD：左上 logo 角标 + 栏目名，右上步进计数，下方 1px 分隔线。
- **禁用**：暖纸色背景（旧版 #f3f1ea 已废弃）、渐变堆砌、emoji。

## ICONOGRAPHY
- 不用图标库。视觉元素 = 编号 Badge（圆角方块 + MONO 数字）、几何图解（芯片/机柜/光缆均为 CSS 矩形组合）、流动圆点。
- Logo 是唯一插画资产；角标用 PNG（`assets/yoyo_ai_800.png`），44–46px。

## 视频模板（日更工作流）
1. 复制 `TermVideoScenes.jsx` 的结构（S0 标题→S1 定义→S2 原理→S3 为什么重要→S4 玩家→S5 CTA），只改 `data` 对象。
2. 片头角标 / 片尾统一用 `brand/YoYoBrand.jsx` 的 `BrandCorner` / `BrandEndcard`（或把该文件内组件拷进新视频 jsx，保持单文件自包含）。
3. 横版 1920×1080（B站/YouTube），竖版 1080×1920（抖音/视频号/小红书）。`TermVideo` 已支持 `orientation="portrait"`。
4. 结尾全景定帧 ≥5s，配「截图保存」提示。

## 索引
- `styles.css` → `tokens/colors.css`、`tokens/typography.css`
- `assets/` — logo（svg + 800px png）
- `brand/YoYoBrand.jsx` — YOYO tokens + BrandCorner + BrandEndcard（视频共享组件）
- `guidelines/` — 规范卡片（色/字/logo/动效）
- `AIChainVideo.jsx` + `AI产业链全景.dc.html` — 全景视频（70s，含品牌片尾）
- `TermVideoScenes.jsx` — 术语日更模板（横/竖）
- `design_handoff_publishing/` — Claude Code 导出 + 宣发交接包
- `SKILL.md` — 可下载给 Claude Code 用的技能说明

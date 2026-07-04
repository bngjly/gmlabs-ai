# 发布包 · CoWoS / CPO / OSAT（YoYo AI 日报 · 术语篇 第1-3期）

> 成品：`video_assets/produce/out/{CoWoS,CPO,OSAT}_final.mp4`（均含配音+50s+ 1080p30）
> 字幕：`video_assets/produce/out/{CoWoS,CPO,OSAT}.srt`（YouTube 后台「字幕」上传，别烧录）
> 合集：加入已建好的「AI 产业链科普 · YoYo AI 日报」，排在总览篇（ep00）之后，建议顺序 CoWoS → OSAT → CPO（先讲最贴近"缺芯"热点的封装，再讲测试环节，CPO 相对最技术，放后面）

---

## 第 1 期 · CoWoS（52.1s）

**标题**
- A：`为什么全世界都缺AI芯片？瓶颈其实是"怎么拼起来"| CoWoS封装科普`
- B：`一颗AI超级芯片是怎么拼出来的？CoWoS先进封装3分钟讲清`

**描述**
```
为什么全世界都缺 AI 芯片？瓶颈往往不在芯片本身，而在怎么把它拼起来——这就是 CoWoS，台积电的先进封装技术。

一颗 AI 超级芯片的拼装过程：封装基板 → 硅中介层 → GPU 裸片 → 两侧 HBM 内存堆栈 → 上千条微米级导线直连。

🔗 完整 AI 产业链全景图谱（286 家公司 · 六维评分）：
https://www.gmlabs.ai/?utm_source=youtube&utm_medium=description&utm_campaign=company_terms&utm_content=cowos_20260704

📬 每天 60 秒看懂一个 AI 产业链概念，Telegram 订阅：
https://t.me/yoyoaidaily

0:00 问题：芯片瓶颈在哪
0:06 逐层拼装：Substrate→Interposer→GPU→HBM
0:34 为什么重要：布线密度·产能瓶颈·良率
0:46 CoWoS 在产业链全景图谱中的位置

#CoWoS #先进封装 #AI芯片 #台积电 #半导体 #AI产业链
```

---

## 第 2 期 · OSAT（52.1s）

**标题**
- A：`晶圆造好芯片就能用了？还差关键两步 | OSAT封装测试科普`
- B：`芯片的"最后一公里"：切割、封装、测试分选一次讲清`

**描述**
```
台积电把晶圆造好之后，芯片就能直接用了吗？还差关键两步——这就是 OSAT，委外封装测试。

三步走：把晶圆切成裸片 → 封装给裸片穿上盔甲 → 测试分选良品放行、次品淘汰。AI 时代 OSAT 也要做 2.5D/3D 堆叠，价值量在快速上升。

🔗 完整 AI 产业链全景图谱（286 家公司 · 六维评分）：
https://www.gmlabs.ai/?utm_source=youtube&utm_medium=description&utm_campaign=company_terms&utm_content=osat_20260704

📬 每天 60 秒看懂一个 AI 产业链概念，Telegram 订阅：
https://t.me/yoyoaidaily

0:00 问题：晶圆造好就能用吗
0:06 第一步：切割裸片
0:15 第二步：封装
0:24 第三步：测试分选
0:34 为什么重要：最后一公里·良率生意
0:46 OSAT 在产业链全景图谱中的位置

#OSAT #封装测试 #AI芯片 #半导体 #AI产业链
```

---

## 第 3 期 · CPO（53.1s）

**标题**
- A：`数据中心里，电信号要走"最贵的冤枉路"| CPO共封装光学科普`
- B：`光模块要被淘汰了？CPO共封装光学3分钟讲清`

**描述**
```
数据中心里，电信号出了芯片，要先走一段最贵的冤枉路——CPO，共封装光学，把光引擎直接焊到交换芯片旁边。

传统方案光模块插在面板上，信号走一长段铜线才能转光出柜；CPO 把光引擎搬到芯片旁边，走几毫米就完成光电转换。省的是万卡集群兆瓦级的电，不过 CPO 仍在早期，生态还在磨合。

🔗 完整 AI 产业链全景图谱（286 家公司 · 六维评分）：
https://www.gmlabs.ai/?utm_source=youtube&utm_medium=description&utm_campaign=company_terms&utm_content=cpo_20260704

📬 每天 60 秒看懂一个 AI 产业链概念，Telegram 订阅：
https://t.me/yoyoaidaily

0:00 问题：电信号的冤枉路
0:06 传统方案：光模块插面板
0:17 CPO 方案：光引擎搬到芯片旁
0:28 对比：走线短了、功耗低了
0:36 为什么重要：功耗·带宽密度·早期变量
0:47 CPO 在产业链全景图谱中的位置

#CPO #共封装光学 #光模块 #AI算力 #半导体 #AI产业链
```

---

## 通用上传设置（三期一致）
- 受众：不是面向儿童 · 类别：教育
- 字幕：上传对应 `.srt`（中文-简体）
- 封面：抽取 hook 场景（3s 处）或 why 场景帧，标题文字已在画面里，直接截图即可当封面

## 同步分发
每期发布后：X + Telegram 频道各发一条，文案参考 `marketing/share_kit.py` 的风格（简短+深链+话题标签），utm_content 按上面各期填对应值。

## 归因对比
`utm_campaign=company_terms`（术语科普）vs `utm_campaign=chain_map`（总览）vs 未来的 `company_spotlight`（个股测评）——三种内容形态在 Vercel Analytics 里对比 landing→tg_click 转化率，用真实数据决定后续选题配比，而不是主观判断。

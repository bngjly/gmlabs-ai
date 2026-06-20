# UTM 追踪规范（gmlabs.ai 内容分发）

所有对外分发的链接必须带 UTM 参数，才能在 Vercel Analytics 里量化"哪个平台/哪条内容 → 带来多少访问 → 多少 TG 订阅转化"。落地页 JS 会把 UTM 存进 sessionStorage，点击 Telegram 订阅时回带（见 index.html `trackUtmAndLanding`）。

## 链接格式

```
https://www.gmlabs.ai/?t={TICKER}&utm_source={source}&utm_medium={medium}&utm_content={content}
```

不带公司直接引流首页时省略 `t=`：
```
https://www.gmlabs.ai/?utm_source={source}&utm_medium={medium}&utm_content={content}
```

## 参数字典（固定取值，别随意发明）

| 参数 | 取值 | 说明 |
|---|---|---|
| `utm_source` | `youtube` `x` `xiaohongshu` `bilibili` `telegram` `zhihu` `xueqiu` | 渠道，全小写 |
| `utm_medium` | `video` `post` `bio` `description` `pin` | 内容形态 |
| `utm_content` | `{TICKER}_{YYYYMMDD}` 或素材标识 | 建议含 ticker，便于归因到具体公司/视频 |
| `utm_campaign` | （可选）`daily_report` `company_spotlight` `chain_map` | 活动/主题，跨多条内容统计时用 |

## 示例

- YouTube 视频讲 NVDA：
  `…/?t=NVDA&utm_source=youtube&utm_medium=video&utm_content=NVDA_20260620`
- 小红书图文推台积电：
  `…/?t=TSM&utm_source=xiaohongshu&utm_medium=post&utm_content=TSM_20260620`
- X 简介挂官网：
  `…/?utm_source=x&utm_medium=bio&utm_content=profile`

## 在 Vercel Analytics 看数据

事件名：`landing`（落地，带 utm + ticker）、`tg_click`（点订阅，回带 utm）。
转化率 = 某 source/content 的 `tg_click` 数 / `landing` 数。

## 生成工具

用 `marketing/share_kit.py` 自动生成带 UTM 的多平台文案，别手拼链接（容易写错参数）。

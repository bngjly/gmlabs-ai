# 测评系列 · 数据联动流程（gmlabs-ai 仓库 ⇄ 本设计项目）

每集 = **机器给分（scores.json） + 人给观点（editorial.json）**，引擎和时间轴永远不动。

## 每集 4 步

1. **编辑稿**：复制 `ep01_NVDA.editorial.json` → `epXX_TICKER.editorial.json`，
   只写观点类内容：hook / 一句话定位 / 六维每条解说（dimNotes G1-G6）/ 未来空间 / 风险 / CTA。
2. **生成**：把 `gen_ep_data.py` 放进仓库 `gmlabs-ai/marketing/scripts/`，跑：
   `python gen_ep_data.py TICKER --ep XX --editorial epXX_TICKER.editorial.json`
   自动从仓库根 `scores.json` 取实时分数（grade / score / 六维 / 快照日期 / sector），
   score/max < 0.6 的维度自动标「短板」，输出：
   - `data/epXX_TICKER.js` — 视频引擎数据 → 拷进本项目 `data/`
   - `produce/scenes_epXX_TICKER.json` — make_video.py 场景骨架（text 填配音稿）
3. **视频**：复制 `EP01 NVDA 横版.dc.html` + `竖版.dc.html`，把逻辑里
   `import('./data/ep01_NVDA.js')` 改成新数据文件——完成。引擎 `StockVideoScenes.jsx` 不改。
4. **录制/分发**：走仓库原管线 `make_video.py`（Stage 播放条 44px、rAF 驱动，与冻结 shim 兼容）
   → `share_kit.py TICKER` 出四平台文案。

## 时间轴契约（引擎 = 配音 = scenes json 三方一致）

| 场景 | 秒 | | 场景 | 秒 |
|---|---|---|---|---|
| ① Hook | 0-15 | | ④ 六维拆解 | 70-160（每维 ~14s）|
| ② 定位 | 15-35 | | ⑤ 未来空间 | 160-210 |
| ③ 评分卡 | 35-70 | | ⑥ 风险+CTA | 210-234 · 片尾 234-240 |

改时长只改 `StockVideoScenes.jsx` 顶部 `T` 表 + gen_ep_data.py 的 `SCENE_WINDOWS`。

## 文件索引
- `StockVideoScenes.jsx`（项目根）— 系列引擎，横竖同一套
- `data/epXX_TICKER.js` — 每集数据（生成物）
- `data/epXX_TICKER.editorial.json` — 每集编辑稿（人写）
- `data/gen_ep_data.py` — 生成器（拷去仓库 marketing/scripts/）

## ⚠ 快照一致性
scores.json 每日更新，评级会漂移（如 NVDA 06-19 快照 A/80.5 → 07-11 已是 S/85.3）。
生成器写死 `snapshotDate`，片中合规行标注快照日期；**发布前重跑一次生成器**，
若等级变了需同步改 hook（editorial.json）再录音。

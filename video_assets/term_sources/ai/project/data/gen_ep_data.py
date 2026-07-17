#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_ep_data.py — 测评系列每集数据生成器（放进 gmlabs-ai/marketing/scripts/ 用）

联动流程（每集 3 步）：
  1. 写编辑稿 epXX_TICKER.editorial.json（hook/定位/六维解说/未来/风险——机器给分，人给观点）
  2. python gen_ep_data.py NVDA --ep 01 --editorial ep01_NVDA.editorial.json
     → 从仓库根 scores.json 取实时分数，合成：
        - data/ep01_NVDA.js            （视频引擎数据，拷进设计项目 data/）
        - produce/scenes_ep01_NVDA.json（make_video.py 的 TTS 场景稿骨架，text 留空待填配音稿）
  3. 视频 DC 里 import 改成新数据文件即可；录制走原 make_video.py 管线。

六维 G1-G6 命名固定映射；gradeColor 按等级映射（S红/A绿，与封面规范一致）。
"""
import argparse, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# 假设本脚本位于 gmlabs-ai/marketing/scripts/，仓库根在两级之上；可用 --repo 覆盖
DEFAULT_REPO = HERE.parent.parent

DIM_NAMES = {
    "G1": ("AI 收入纯度", "AI PURITY"),
    "G2": ("护城河", "MOAT"),
    "G3": ("成长动能", "GROWTH"),
    "G4": ("盈利质量", "PROFIT"),
    "G5": ("估值合理性", "VALUATION"),
    "G6": ("生态卡位", "ECOSYSTEM"),
}
GRADE_COLORS = {
    "S": "oklch(0.60 0.20 25)",   # 红
    "A": "oklch(0.62 0.15 152)",  # 绿
    "B": "#1A8FFF",
    "C": "#93A1B4",
    "D": "#8A6D3B",
}
# 与引擎 StockVideoScenes.jsx 的 T 时间轴保持一致
SCENE_WINDOWS = [
    ("s1_hook",   0.5, 15.0),
    ("s2_pos",   15.5, 35.0),
    ("s3_card",  35.5, 70.0),
    ("s4_dims",  70.5, 160.0),
    ("s5_future",160.5, 210.0),
    ("s6_risk",  210.5, 233.0),
    ("s7_end",   234.5, 239.5),
]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ticker")
    ap.add_argument("--ep", required=True)
    ap.add_argument("--editorial", required=True)
    ap.add_argument("--repo", default=str(DEFAULT_REPO))
    ap.add_argument("--weak-threshold", type=float, default=0.6,
                    help="score/max 低于该比例标记为「短板」")
    args = ap.parse_args()

    repo = Path(args.repo)
    scores = json.loads((repo / "scores.json").read_text(encoding="utf-8"))
    ed = json.loads(Path(args.editorial).read_text(encoding="utf-8"))
    s = scores.get(args.ticker)
    if not s or s.get("status") != "ok":
        sys.exit(f"scores.json 里没有 {args.ticker} 或 status != ok")

    dims = []
    for g in ["G1", "G2", "G3", "G4", "G5", "G6"]:
        name, en = DIM_NAMES[g]
        score, mx = s["dims"][g], s["dim_max"][g]
        d = {"name": name, "en": en, "score": score, "max": mx,
             "note": ed.get("dimNotes", {}).get(g, "")}
        if score / mx < args.weak_threshold:
            d["weak"] = True
        dims.append(d)

    data = {
        "ep": ed["ep"], "ticker": s["ticker"], "cnName": ed["cnName"],
        "category": s["sector"].upper(), "snapshotDate": s["evaluated_at"],
        "grade": s["grade"],
        "gradeLabel": s["grade_label"].split(" ", 1)[-1],
        "score": s["score"], "scoreMax": 100,
        "gradeColor": GRADE_COLORS.get(s["grade"], "#1A8FFF"),
        "hookTitle": ed["hookTitle"], "hookQuestion": ed["hookQuestion"],
        "hookSub": ed["hookSub"], "position": ed["position"],
        "cardLine": ed.get("cardLine", ""),
        "deeplink": f"gmlabs.ai/?t={s['ticker']}",
        "dims": dims, "dimsSummary": ed["dimsSummary"],
        "future": ed["future"], "risks": ed["risks"], "cta": ed["cta"],
    }

    js = ("// 自动生成：gen_ep_data.py " + s["ticker"]
          + f" · 数据快照 {s['evaluated_at']}（scores.json）\n"
          + "export default " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
    out_js = HERE / "data" / f"ep{ed['ep']}_{s['ticker']}.js"
    out_js.parent.mkdir(parents=True, exist_ok=True)
    out_js.write_text(js, encoding="utf-8")

    scenes = {
        "video": f"EP{ed['ep']}_{s['ticker']}",
        "html_rel": f"EP{ed['ep']} {s['ticker']} 横版.dc.html",
        "duration": 240.0,
        "scenes": [{"id": i, "start": a, "end": b, "text": ""} for i, a, b in SCENE_WINDOWS],
        "cta_overlay": {"text": f"gmlabs.ai/?t={s['ticker']} · 六维评分", "start": 210.5, "end": 233.0},
    }
    out_sc = HERE / "produce" / f"scenes_ep{ed['ep']}_{s['ticker']}.json"
    out_sc.parent.mkdir(parents=True, exist_ok=True)
    out_sc.write_text(json.dumps(scenes, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ {out_js}\n✓ {out_sc}（text 待填配音稿）")
    print(f"  {s['ticker']}: {s['grade']} {s['score']} · 快照 {s['evaluated_at']}")

if __name__ == "__main__":
    main()

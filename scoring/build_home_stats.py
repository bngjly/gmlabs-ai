#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_home_stats.py — 预聚合首页统计到 home_stats.json（约 2KB）

首页统计卡 + S/A 标的标签只需聚合值，但原先要拉 142KB 全量 scores.json 才能算，
导致进站 2-3s 卡"载入中"。本脚本把聚合结果预先落库成小文件，首页秒出。
全量 scores.json 仍由图谱/矩阵按需加载。

在 nightly-scores 工作流里评分刷新后自动重跑。
"""
import datetime
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return json.load(f)


def main():
    scores = load("scores.json")
    ok = [v for v in scores.values() if v.get("status") == "ok"]

    grades = {}
    for v in ok:
        grades[v.get("grade")] = grades.get(v.get("grade"), 0) + 1
    s_count, a_count = grades.get("S", 0), grades.get("A", 0)

    last_date = ""
    for v in ok:
        d = v.get("evaluated_at", "")
        if d > last_date:
            last_date = d

    top = sorted(
        [v for v in ok if v.get("grade") in ("S", "A")],
        key=lambda v: v.get("score", 0), reverse=True,
    )[:12]
    top_tags = [
        {"ticker": v["ticker"], "grade": v["grade"], "score": v["score"], "name": v.get("name", "")}
        for v in top
    ]

    # KOL 去重账号数（与前端 stat-kol 口径一致：unique account_handle）
    kol_count = 0
    try:
        kol = load("kol_cache.json")
        handles = {it.get("account_handle", "") for it in kol.get("items", []) if it.get("account_handle")}
        kol_count = len(handles)
    except Exception:
        pass

    out = {
        "companies": len(scores),
        "graded": len(ok),
        "s_count": s_count,
        "a_count": a_count,
        "kol_count": kol_count,
        "last_date": last_date,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "top_tags": top_tags,
    }

    with open(os.path.join(ROOT, "home_stats.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print("home_stats.json 已生成:", {k: out[k] for k in
          ["companies", "graded", "s_count", "a_count", "kol_count", "last_date"]})


if __name__ == "__main__":
    main()

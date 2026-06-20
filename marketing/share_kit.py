#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
share_kit.py — 分发弹药库生成器
为指定公司（或今日 top N）生成各平台可直接粘贴的文案 + 带 UTM 的深链 + OG 卡链接。

用法：
  python share_kit.py NVDA TSM AVGO          # 指定 ticker
  python share_kit.py --top 5                # 评分 top 5（S/A 优先）
  python share_kit.py --top 5 --date 20260620  # 指定 utm_content 日期后缀

UTM 规范见 marketing/UTM_CONVENTION.md。
"""
import argparse
import datetime
import json
import os
import urllib.parse

SITE = "https://www.gmlabs.ai"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DIM_NAMES = {
    "G1": "AI 收入纯度", "G2": "护城河", "G3": "成长动能",
    "G4": "盈利质量", "G5": "估值合理性", "G6": "生态卡位",
}
AI_LABEL = {"high": "高", "mid": "中", "low": "低"}
SECTOR_CN = {
    "semiconductor": "半导体", "software": "软件", "hardware": "硬件",
    "cloud": "云", "networking": "网络", "internet": "互联网",
    "ev": "电动车", "robotics": "机器人", "energy": "能源",
}


def load_json(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return json.load(f)


def ai_level_of(ticker, ai):
    for lv in ("high", "mid", "low"):
        if ticker in ai.get(lv, []):
            return lv
    return None


def deep_link(ticker, source, medium, content):
    q = {"t": ticker, "utm_source": source, "utm_medium": medium, "utm_content": content}
    return f"{SITE}/?" + urllib.parse.urlencode(q)


def top_features(sc, n=2):
    return [f.get("name", "") for f in (sc.get("features") or [])[:n] if f.get("name")]


def build_blocks(ticker, sc, ai_lv, datestr):
    name = sc.get("name", ticker)
    grade = sc.get("grade", "?")
    score = sc.get("score", "?")
    sector_cn = SECTOR_CN.get(sc.get("sector", ""), sc.get("sector", ""))
    feats = top_features(sc, 2)
    feat_str = " · ".join(feats) if feats else ""
    ai_str = f"AI 暴露度 {AI_LABEL[ai_lv]}" if ai_lv else ""
    content = f"{ticker}_{datestr}"
    og = f"{SITE}/api/og?t={ticker}"

    meta_bits = " · ".join([b for b in [f"{sector_cn} 板块", ai_str] if b])

    blocks = []
    blocks.append(f"OG 卡（社媒自动预览）: {og}")

    # X / 推特
    x_link = deep_link(ticker, "x", "post", content)
    x = (
        f"📊 ${ticker} · {name}\n"
        f"AI 产业链评分 {grade}（{score}/100）\n"
        f"{meta_bits}\n"
        + (f"🟢 {feat_str}\n" if feat_str else "")
        + f"一图看懂它在 AI 供应链的卡位 👇\n{x_link}\n"
        f"#AI #{sector_cn} #美股"
    )
    blocks.append("【X / 推特】\n" + x)

    # 小红书
    xhs_link = deep_link(ticker, "xiaohongshu", "post", content)
    xhs = (
        f"🔥 {name}（{ticker}）在 AI 产业链里到底什么位置？\n\n"
        f"✅ 六维客观评分：{grade} 级（{score}/100）\n"
        f"✅ {meta_bits}\n"
        + (f"✅ 亮点：{feat_str}\n" if feat_str else "")
        + f"\n点开看它的上下游全景图 👉 {xhs_link}\n\n"
        f"#AI产业链 #{sector_cn} #美股投资 #科技股 #AI"
    )
    blocks.append("【小红书】\n" + xhs)

    # Telegram
    tg_link = deep_link(ticker, "telegram", "post", content)
    tg = (
        f"📈 {name} ({ticker}) — AI 产业链评分 {grade}（{score}/100）\n"
        f"{meta_bits}" + (f" · {feat_str}" if feat_str else "") + "\n"
        f"图谱深链 👉 {tg_link}"
    )
    blocks.append("【Telegram】\n" + tg)

    # YouTube 视频描述
    yt_link = deep_link(ticker, "youtube", "description", content)
    yt = (
        f"本期解析 {name}（{ticker}）在 AI 产业链中的位置与六维评分（{grade} 级，{score}/100）。\n\n"
        f"🔗 在线查看 {ticker} 的产业链上下游全景：\n{yt_link}\n\n"
        f"📬 每日 AI 产业链 / KOL 观点，Telegram 订阅：https://t.me/yoyoaidaily\n\n"
        f"#AI #{ticker} #{sector_cn} #美股 #AI产业链"
    )
    blocks.append("【YouTube 视频描述】\n" + yt)

    return blocks


def main():
    ap = argparse.ArgumentParser(description="分发弹药库生成器")
    ap.add_argument("tickers", nargs="*", help="指定 ticker（空格分隔）")
    ap.add_argument("--top", type=int, default=0, help="取评分 top N（S/A 优先）")
    ap.add_argument("--date", default=datetime.date.today().strftime("%Y%m%d"),
                    help="utm_content 日期后缀，默认今天")
    args = ap.parse_args()

    scores = load_json("scores.json")
    try:
        ai = load_json("ai_exposure.json")
    except FileNotFoundError:
        ai = {}

    if args.top:
        ok = [v for v in scores.values() if v.get("status") == "ok"]
        ok.sort(key=lambda v: v.get("score", 0), reverse=True)
        tickers = [v["ticker"] for v in ok[:args.top]]
    else:
        tickers = [t.upper() for t in args.tickers]

    if not tickers:
        ap.error("请指定 ticker 或 --top N")

    for tk in tickers:
        sc = scores.get(tk)
        if not sc or sc.get("status") != "ok":
            print(f"\n⚠️  {tk}: 无评分数据，跳过\n")
            continue
        ai_lv = ai_level_of(tk, ai)
        print("\n" + "═" * 60)
        print(f"  {tk} · {sc.get('name', tk)}")
        print("═" * 60)
        for block in build_blocks(tk, sc, ai_lv, args.date):
            print("\n" + block)
        print()


if __name__ == "__main__":
    main()

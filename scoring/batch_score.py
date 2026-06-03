"""
批量评分驱动：跑 ChainGraph 所有支持的 ticker，输出 scores.json
设计：
  - 失败容错（单只票崩不影响整体）
  - 间隔限速（防止 yfinance 封 IP）
  - 增量更新（已评过 <24h 的跳过，可 --force 全跑）

用法：
    python batch_score.py            # 增量
    python batch_score.py --force    # 全跑
    python batch_score.py --limit 10 # 只跑前 10 只（测试）
"""

import json
import time
import argparse
import sys
from pathlib import Path
from datetime import datetime, timedelta

from universal_eval import evaluate

ROOT       = Path(__file__).parent
INPUT      = ROOT / "chain_tickers.json"
OUTPUT_DIR = ROOT / "output"
OUTPUT     = OUTPUT_DIR / "scores.json"

# 节流：yfinance 大概 2 秒/票 安全
SLEEP_SEC = 1.5


def load_tickers():
    if not INPUT.exists():
        print(f"❌ 未找到 {INPUT}，先运行 extract_tickers.py")
        sys.exit(1)
    data = json.loads(INPUT.read_text(encoding="utf-8"))
    return data["supported"]


def load_existing():
    if not OUTPUT.exists():
        return {}
    try:
        return json.loads(OUTPUT.read_text(encoding="utf-8"))
    except Exception:
        return {}


def is_fresh(record: dict, max_age_hours: int = 24) -> bool:
    """已评过且数据新鲜（默认 24 小时内）"""
    if not record or record.get("status") != "ok":
        return False
    try:
        evaluated = datetime.fromisoformat(record.get("evaluated_at"))
    except Exception:
        return False
    return datetime.now() - evaluated < timedelta(hours=max_age_hours)


def main():
    # Windows GBK 终端兼容
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="忽略缓存全部重跑")
    parser.add_argument("--limit", type=int, default=0, help="只跑前 N 只")
    parser.add_argument("--sleep", type=float, default=SLEEP_SEC, help="每只票之间间隔秒")
    args = parser.parse_args()

    tickers = load_tickers()
    existing = load_existing()

    if args.limit > 0:
        tickers = tickers[:args.limit]

    OUTPUT_DIR.mkdir(exist_ok=True)
    # 重要：始终基于已有结果开始（即使 --force），这样失败的票不会覆盖之前的成功记录
    # --force 只意味着重新评估每个 ticker，不意味着抛弃旧数据
    results = dict(existing)

    total = len(tickers)
    done, skipped, failed, preserved = 0, 0, 0, 0
    start = time.time()

    for i, item in enumerate(tickers, 1):
        ticker = item["ticker"]
        cn = item["cn"]

        # 增量跳过
        if not args.force and ticker in results and is_fresh(results[ticker]):
            print(f"[{i}/{total}] {ticker:14s} (新鲜跳过)")
            skipped += 1
            continue

        print(f"[{i}/{total}] {ticker:14s} {cn:20s}", end="", flush=True)
        prev = results.get(ticker, {})
        prev_ok = prev.get("status") == "ok"
        try:
            res = evaluate(ticker)
            if res and res.get("status") == "ok":
                results[ticker] = res
                done += 1
                print(f"  → {res['grade']} · {res['score']} 分 · {res['tier']}/{res['sector']}")
            else:
                # 本次失败 — 如果上次成功，保留旧结果（避免数据回退）
                if prev_ok:
                    preserved += 1
                    print(f"  ⚠️ 本次失败，保留旧 {prev.get('grade')} {prev.get('score')}")
                else:
                    results[ticker] = res or {"ticker": ticker, "status": "no_data"}
                    failed += 1
                    print(f"  ✗ 无数据")
        except Exception as e:
            if prev_ok:
                preserved += 1
                print(f"  ⚠️ 异常 {e}，保留旧 {prev.get('grade')}")
            else:
                failed += 1
                results[ticker] = {"ticker": ticker, "status": "error", "error": str(e)[:200]}
                print(f"  ✗ 异常 {e}")

        # 每 20 只票保存一次（防中断丢数据）
        if i % 20 == 0:
            OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

        time.sleep(args.sleep)

    # 最终保存
    OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    elapsed = time.time() - start
    print(f"\n══════ 完成 ══════")
    print(f"  总计:   {total}")
    print(f"  成功:   {done}")
    print(f"  跳过:   {skipped} (24h 内已评过)")
    print(f"  保留:   {preserved} (本次失败但旧成功，未回退)")
    print(f"  失败:   {failed}")
    print(f"  耗时:   {elapsed/60:.1f} 分钟")
    print(f"  输出:   {OUTPUT}")

    # 等级分布统计
    by_grade = {}
    for v in results.values():
        if v.get("status") == "ok":
            g = v.get("grade", "?")
            by_grade[g] = by_grade.get(g, 0) + 1
    print(f"  分布:   {by_grade}")


if __name__ == "__main__":
    main()

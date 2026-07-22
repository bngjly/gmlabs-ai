"""
处理「📈 选股」的评分申请队列（GitHub Issue，label=score-request）。

流程（夜任务里跑两次）：
  1. merge   —— extract_tickers.py 之后跑：把所有 open 的申请 ticker 并入 chain_tickers.json，
                这样 batch_score.py 会把它们一起评了
  2. resolve —— batch_score.py 之后跑：按 scores.json 里的结果给每个 Issue 回复+关闭
                （评分失败也关闭，不无限重试；用户可以再次搜索重新发起申请）

用法：
    python process_score_requests.py merge
    python process_score_requests.py resolve
"""

import json
import os
import re
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).parent
REPO = "bngjly/gmlabs-ai"
LABEL = "score-request"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
API = f"https://api.github.com/repos/{REPO}"
TITLE_RE = re.compile(r"^\[评分申请\]\s*(\S+)")


def _headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "ChainGraph-nightly/1.0",
    }


def list_open_requests():
    if not TOKEN:
        print("[跳过] 未配置 GITHUB_TOKEN，跳过评分申请队列")
        return []
    r = requests.get(f"{API}/issues", headers=_headers(),
                      params={"labels": LABEL, "state": "open", "per_page": 100})
    if not r.ok:
        print(f"[警告] 拉取 Issue 失败: {r.status_code} {r.text[:200]}")
        return []
    out = []
    for issue in r.json():
        m = TITLE_RE.match(issue.get("title", ""))
        if m:
            out.append((m.group(1).strip(), issue["number"]))
    return out


def merge():
    reqs = list_open_requests()
    if not reqs:
        print("没有待处理的评分申请")
        return
    path = ROOT / "chain_tickers.json"
    d = json.loads(path.read_text(encoding="utf-8"))
    existing = {t["ticker"] for t in d["supported"]}
    added = 0
    for ticker, _num in reqs:
        if ticker not in existing:
            d["supported"].append({"ticker": ticker, "cn": ""})
            existing.add(ticker)
            added += 1
    d["stats"]["total_supported"] = len(d["supported"])
    path.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] 并入 {added} 个新申请 ticker（共 {len(reqs)} 个 open 申请）")


def resolve():
    reqs = list_open_requests()
    if not reqs:
        print("没有待关闭的评分申请")
        return
    scores_path = ROOT.parent / "scores.json"
    scores = json.loads(scores_path.read_text(encoding="utf-8"))
    resolved = 0
    for ticker, num in reqs:
        rec = scores.get(ticker)
        if not rec:
            continue  # 没进这次批次（理论不该发生），留到下次夜跑
        if rec.get("status") == "ok":
            comment = (f"✅ 已收录：**{rec.get('name', ticker)}** · "
                       f"{rec.get('grade')} 级 {rec.get('score')} 分。"
                       f"现在可以在「📈 选股」里搜到并加自选了。")
        else:
            comment = (f"⚠️ 抓取失败（状态：{rec.get('status')}）。"
                       f"yfinance/akshare 都取不到这个代码的数据，可能是代码有误、已退市，"
                       f"或该交易所暂不支持。若确认代码无误，欢迎在图谱里手动补充。")
        requests.post(f"{API}/issues/{num}/comments", headers=_headers(), json={"body": comment})
        requests.patch(f"{API}/issues/{num}", headers=_headers(), json={"state": "closed"})
        print(f"[OK] 关闭 #{num} {ticker}: {rec.get('status')}")
        resolved += 1
    print(f"共处理 {resolved}/{len(reqs)} 个申请")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "merge":
        merge()
    elif mode == "resolve":
        resolve()
    else:
        print("用法: python process_score_requests.py [merge|resolve]")
        sys.exit(1)

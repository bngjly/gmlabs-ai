"""
从 ChainGraph 的 graph.html 里抽出所有 ticker 代码。
保持与图谱的实时同步：图谱新增公司 → 批量评分会自动覆盖。

用法：
    python extract_tickers.py
    → 生成 chain_tickers.json
"""

import re
import json
from pathlib import Path

GRAPH_HTML = Path(__file__).parent.parent / "graph.html"    # gmlabs-ai/graph.html
OUTPUT     = Path(__file__).parent / "chain_tickers.json"    # gmlabs-ai/scoring/chain_tickers.json

# yfinance 不支持的 ticker（未上市 / 内部代号 / 主题股）
# A 股（.SS/.SZ/.BJ）已启用：evaluator.py 走 akshare（东财+同花顺）兜底，不经 yfinance
SKIP_PATTERNS = [
    r"未上市", r"待上市", r"\(.*未上市.*\)",
]

# 中文名作为 ticker 的（数据脏）跳过
CN_NAME_AS_TICKER = re.compile(r"^[一-龥]+$")


def is_supported(ticker: str, cn_name: str = "") -> bool:
    """判断 ticker 是否在本 Sprint 支持范围内"""
    if not ticker or len(ticker) > 20:
        return False
    if CN_NAME_AS_TICKER.match(ticker):
        return False
    for pat in SKIP_PATTERNS:
        if re.search(pat, ticker):
            return False
    # 防止 ticker 撞车：cn 字段含"未上市"/"待上市"也跳过
    # 例如 EVG 在图里是 EV Group (未上市)，但 NYSE 上 EVG 是 Eaton Vance Fund
    cn_str = str(cn_name)
    if any(s in cn_str for s in ["未上市", "待上市", "未公开",
                                 "已退市", "已私有化", "已并入", "泛指", "数据缺失"]):
        return False
    return True


def extract():
    html = GRAPH_HTML.read_text(encoding="utf-8")

    # 匹配 { t: 'XXX', cn: 'YYY', ... }
    # 既匹配单引号也匹配双引号
    pattern = r"\{\s*t:\s*['\"]([^'\"]+)['\"]\s*,\s*cn:\s*['\"]([^'\"]+)['\"]"
    matches = re.findall(pattern, html)

    seen = {}
    skipped = []
    for ticker, cn in matches:
        t = ticker.strip()
        if not is_supported(t, cn):
            skipped.append({"ticker": t, "cn": cn})
            continue
        # 同一 ticker 出现多次（如 NVDA 在多层），保留首次
        if t not in seen:
            seen[t] = cn

    tickers = [{"ticker": t, "cn": cn} for t, cn in seen.items()]

    out = {
        "version": "v1",
        "supported": tickers,
        "skipped": skipped,
        "stats": {
            "total_supported": len(tickers),
            "total_skipped": len(skipped),
        }
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] Extracted {len(tickers)} supported tickers -> {OUTPUT}")
    print(f"     Skipped {len(skipped)} (A-share / private / Chinese-name)")
    print(f"     Sample: {[t['ticker'] for t in tickers[:10]]}")
    return out


if __name__ == "__main__":
    extract()

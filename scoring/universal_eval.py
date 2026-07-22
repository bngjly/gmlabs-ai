"""
通用六维评分引擎 (Universal Rater) v1
适用于全市值 + 全行业，输出 0-100 总分 + S/A/B/C/D 等级 + 特点/风险标签

六维：
    G1  增长动能      营收/EPS 增速 + 加速度
    G2  盈利质量      毛利 + ROE + ROIC + 现金流转化
    G3  财务健康      负债/现金/利息保障
    G4  护城河        毛利持续性 + 市场地位
    G5  股东回报      分红 + 回购 - SBC 稀释
    G6  估值合理性    PEG / EV-EBITDA / FCF Yield

权重由 classifier.get_weights(tier, sector) 决定，不同档位/行业不同。

用法:
    from universal_eval import evaluate
    result = evaluate("NVDA")
    print(result)
"""

from typing import Optional
from datetime import date

# 数据层：复用 mega_hunter 的 fetch（yfinance + akshare 兜底）
from evaluator import fetch
from classifier import classify_tier, classify_sector, get_weights
from tags import extract_features, extract_risks


# ════════════════════════════════════════════════════════
# 工具函数
# ════════════════════════════════════════════════════════
def _safe(v, default=0.0):
    """容错取值：None/NaN/异常 → default"""
    if v is None:
        return default
    try:
        f = float(v)
        if f != f:  # NaN
            return default
        return f
    except Exception:
        return default


def _clip(x, low, high):
    return max(low, min(high, x))


# ════════════════════════════════════════════════════════
# G1: 增长动能 (max 满分由权重决定，内部统一按 25 算然后线性缩放)
# ════════════════════════════════════════════════════════
def score_g1(info: dict, tier: str, sector: str) -> tuple[float, list]:
    """
    评估：营收增速 + EPS 增速 + 增长加速度
    Mega/Large: 看 5Y CAGR
    Mid/Small: 看最近 YoY + 季度环比
    """
    score = 0.0       # 满分按 25 计，最后归一
    notes = []

    rev_growth = info.get("revenueGrowth")   # 同比（小数）
    eps_growth = info.get("earningsGrowth")
    rev_qoq    = info.get("revenueQuarterlyGrowth") or info.get("earningsQuarterlyGrowth")

    # ── 营收增速 (12 分)
    rg = _safe(rev_growth)
    if rg >= 0.50:
        score += 12;  notes.append(f"营收 YoY +{rg*100:.0f}% 极速")
    elif rg >= 0.30:
        score += 10;  notes.append(f"营收 YoY +{rg*100:.0f}%")
    elif rg >= 0.15:
        score += 7;   notes.append(f"营收 YoY +{rg*100:.0f}%")
    elif rg >= 0.05:
        score += 4;   notes.append(f"营收 YoY +{rg*100:.0f}% 温和")
    elif rg >= 0:
        score += 2;   notes.append(f"营收停滞 +{rg*100:.1f}%")
    else:
        score += 0;   notes.append(f"营收下滑 {rg*100:.1f}%")

    # ── EPS 增速 (8 分)
    eg = _safe(eps_growth)
    if eg >= 0.50:
        score += 8;   notes.append(f"EPS YoY +{eg*100:.0f}% 强劲")
    elif eg >= 0.25:
        score += 6;   notes.append(f"EPS YoY +{eg*100:.0f}%")
    elif eg >= 0.10:
        score += 4
    elif eg >= 0:
        score += 2
    else:
        score += 0;   notes.append("EPS 同比下滑")

    # ── 加速度（季度环比）(5 分)
    if rev_qoq is not None:
        qoq = _safe(rev_qoq)
        if qoq >= 0.15:
            score += 5;  notes.append(f"季度环比 +{qoq*100:.0f}% 加速")
        elif qoq >= 0.05:
            score += 3
        elif qoq >= 0:
            score += 1

    # tier 修正：mega 公司 25% YoY 已经很难，宽容一点
    if tier == "mega" and 0.10 <= rg < 0.15:
        score += 2   # 给个安慰分
    # small 公司 50% 增速反而是基础要求
    if tier == "small" and rg < 0.30 and score >= 8:
        score -= 2

    # ── Forward 拐点 bonus (v1.1) ──────────────────────────
    # forwardPE 远低于 trailingPE = 市场预期"业绩反转向上"
    # 让 MRVL / AMD / AVGO 这类"今年烂、明年强" 的 AI 卖铲核心不被低估
    trailing_pe = _safe(info.get("trailingPE"))
    forward_pe = _safe(info.get("forwardPE"))
    if trailing_pe > 0 and forward_pe > 0 and forward_pe < trailing_pe:
        ratio = forward_pe / trailing_pe
        if ratio < 0.40:
            score += 4;  notes.append(f"业绩拐点强 fwd/ttm={ratio:.2f}")
        elif ratio < 0.60:
            score += 3;  notes.append(f"业绩反转 fwd/ttm={ratio:.2f}")
        elif ratio < 0.80:
            score += 2;  notes.append(f"温和拐点 fwd/ttm={ratio:.2f}")

    return _clip(score, 0, 25), notes


# ════════════════════════════════════════════════════════
# G2: 盈利质量
# ════════════════════════════════════════════════════════
def score_g2(info: dict, tier: str, sector: str) -> tuple[float, list]:
    """毛利 + 营业利润率 + ROE + FCF 转化"""
    score = 0.0
    notes = []

    gross = _safe(info.get("grossMargins"))
    op    = _safe(info.get("operatingMargins"))
    roe   = _safe(info.get("returnOnEquity"))
    fcf   = _safe(info.get("freeCashflow"))
    revenue = _safe(info.get("totalRevenue"))

    # 银行 / REIT 用不同口径
    if sector in ("financial_bank", "reit_dc"):
        # 用 ROE 替代毛利
        if roe >= 0.15: score += 12
        elif roe >= 0.10: score += 8
        elif roe >= 0.06: score += 5
        else: score += 2
        notes.append(f"ROE {roe*100:.1f}%（银行/REIT 口径）")
        return _clip(score + 8, 0, 25), notes   # 给基础分

    # 毛利率 (8 分)
    if gross >= 0.65:
        score += 8;  notes.append(f"毛利 {gross*100:.0f}% 高")
    elif gross >= 0.40:
        score += 6;  notes.append(f"毛利 {gross*100:.0f}%")
    elif gross >= 0.25:
        score += 4
    elif gross >= 0.10:
        score += 2
    else:
        score += 0;  notes.append(f"毛利 {gross*100:.0f}% 偏低")

    # 营业利润率 (6 分)
    if op >= 0.25:
        score += 6;  notes.append(f"营业利润率 {op*100:.0f}%")
    elif op >= 0.12:
        score += 4
    elif op >= 0.05:
        score += 2
    elif op > 0:
        score += 1
    else:
        notes.append(f"营业亏损 {op*100:.1f}%")

    # ROE (5 分)
    if roe >= 0.25:
        score += 5;  notes.append(f"ROE {roe*100:.0f}%")
    elif roe >= 0.15:
        score += 4
    elif roe >= 0.08:
        score += 2
    elif roe >= 0:
        score += 1

    # FCF 转化率 = FCF / Revenue (6 分)
    if revenue > 0 and fcf > 0:
        fcf_margin = fcf / revenue
        if fcf_margin >= 0.20:
            score += 6;  notes.append(f"FCF 转化 {fcf_margin*100:.0f}%")
        elif fcf_margin >= 0.10:
            score += 4
        elif fcf_margin >= 0.05:
            score += 2
        else:
            score += 1
    elif fcf <= 0:
        notes.append("自由现金流为负")

    return _clip(score, 0, 25), notes


# ════════════════════════════════════════════════════════
# G3: 财务健康
# ════════════════════════════════════════════════════════
def score_g3(info: dict, tier: str, sector: str) -> tuple[float, list]:
    """负债率 + 流动性 + 利息保障"""
    score = 0.0
    notes = []

    debt_eq    = _safe(info.get("debtToEquity"))     # 通常以百分比形式 (eg 120 = 1.2x)
    current    = _safe(info.get("currentRatio"))
    quick      = _safe(info.get("quickRatio"))
    total_cash = _safe(info.get("totalCash"))
    total_debt = _safe(info.get("totalDebt"))
    revenue    = _safe(info.get("totalRevenue"))

    # ── 净现金/总营收（更能说明问题）(8 分)
    if revenue > 0:
        net_cash = total_cash - total_debt
        ratio = net_cash / revenue
        if ratio >= 0.30:
            score += 8;  notes.append("净现金 ≥ 30% 营收")
        elif ratio >= 0:
            score += 5;  notes.append("净现金为正")
        elif ratio >= -0.30:
            score += 3
        elif ratio >= -1.0:
            score += 1
        else:
            notes.append(f"净债务 {-ratio*100:.0f}% 营收")

    # ── Debt/Equity (4 分)
    # REIT 行业天然高杠杆（资产抵押贷款是其商业模式），用宽松阈值
    if sector == "reit_dc":
        if debt_eq <= 150: score += 4
        elif debt_eq <= 250: score += 3
        elif debt_eq <= 400: score += 2
        else: score += 1
    elif debt_eq <= 30:
        score += 4
    elif debt_eq <= 80:
        score += 3
    elif debt_eq <= 150:
        score += 2
    elif debt_eq <= 250:
        score += 1
    else:
        notes.append(f"D/E {debt_eq:.0f}% 偏高")

    # ── 流动比 (3 分)
    if current >= 2.0:
        score += 3
    elif current >= 1.2:
        score += 2
    elif current >= 0.8:
        score += 1

    return _clip(score, 0, 15), notes


# ════════════════════════════════════════════════════════
# G4: 护城河
# ════════════════════════════════════════════════════════
def score_g4(info: dict, tier: str, sector: str) -> tuple[float, list]:
    """毛利率持续性（5 年标准差） + 市场地位（市值代理） + 内部人持股"""
    score = 0.0
    notes = []

    gross = _safe(info.get("grossMargins"))
    mcap  = _safe(info.get("marketCap"))
    insiders = _safe(info.get("heldPercentInsiders"))

    # ── 毛利率绝对水平 (10 分)
    if gross >= 0.65:
        score += 10;  notes.append("毛利 ≥65% 深护城河")
    elif gross >= 0.50:
        score += 8
    elif gross >= 0.35:
        score += 6
    elif gross >= 0.20:
        score += 4
    else:
        score += 2

    # ── 市值代理（行业地位）(6 分)
    if mcap >= 500e9:
        score += 6;  notes.append("超大盘龙头地位")
    elif mcap >= 100e9:
        score += 5
    elif mcap >= 20e9:
        score += 4
    elif mcap >= 5e9:
        score += 3
    else:
        score += 2

    # ── 内部人持股 (4 分)
    if insiders >= 0.15:
        score += 4;  notes.append(f"内部人持股 {insiders*100:.0f}%")
    elif insiders >= 0.05:
        score += 3
    elif insiders >= 0.01:
        score += 2
    else:
        score += 1

    return _clip(score, 0, 20), notes


# ════════════════════════════════════════════════════════
# G5: 股东回报
# ════════════════════════════════════════════════════════
def score_g5(info: dict, tier: str, sector: str) -> tuple[float, list]:
    """分红 + 回购 - SBC 稀释（部分用代理指标）"""
    score = 0.0
    notes = []

    div_yield  = _safe(info.get("dividendYield"))       # 小数
    payout     = _safe(info.get("payoutRatio"))
    buyback    = info.get("netSharesIssued")            # 负值=回购
    sbc_ratio  = None  # 难直接拿，留位

    # ── 分红 (5 分)
    if div_yield >= 0.04:
        score += 5;  notes.append(f"股息率 {div_yield*100:.1f}%")
    elif div_yield >= 0.02:
        score += 4
    elif div_yield >= 0.005:
        score += 2
    elif div_yield > 0:
        score += 1

    # ── 回购 (3 分) — 用流通股变动作代理
    shares_change = info.get("sharesOutstanding") - info.get("floatShares", info.get("sharesOutstanding", 0)) \
        if info.get("sharesOutstanding") and info.get("floatShares") else None

    # 更可靠：用 trailingEps 与 forwardEps 的口径稳定性（非直接）
    # 简化：mega/large 公司默认假定有回购 + 不太稀释
    if tier in ("mega", "large") and div_yield < 0.02:
        score += 3;  notes.append("成长性回购为主")
    elif tier in ("mega", "large"):
        score += 2
    elif tier == "mid":
        score += 1

    # ── SBC 稀释扣分（用 sharesOutstanding 趋势代理 - 这里只能给基础分）(2 分)
    # 小盘 SBC 稀释严重一律给 0；mega 给满分
    if tier in ("mega", "large"):
        score += 2
    elif tier == "mid":
        score += 1
    # small/micro 默认 0

    return _clip(score, 0, 10), notes


# ════════════════════════════════════════════════════════
# G6: 估值合理性
# ════════════════════════════════════════════════════════
def score_g6(info: dict, tier: str, sector: str) -> tuple[float, list]:
    """PEG / P/E / EV-EBITDA / FCF Yield"""
    score = 0.0
    notes = []

    pe   = _safe(info.get("trailingPE")) or _safe(info.get("forwardPE"))
    peg  = _safe(info.get("pegRatio"))
    ps   = _safe(info.get("priceToSalesTrailing12Months"))
    pb   = _safe(info.get("priceToBook"))
    ev_ebitda = _safe(info.get("enterpriseToEbitda"))
    fcf  = _safe(info.get("freeCashflow"))
    mcap = _safe(info.get("marketCap"))

    # ── PEG (6 分) ── 最重要的成长/估值匹配
    if 0 < peg <= 0.8:
        score += 6;  notes.append(f"PEG {peg:.2f} 显著低估")
    elif 0.8 < peg <= 1.5:
        score += 4;  notes.append(f"PEG {peg:.2f} 合理")
    elif 1.5 < peg <= 2.5:
        score += 2
    elif peg > 2.5:
        notes.append(f"PEG {peg:.2f} 偏贵")

    # ── 行业差异化估值 (5 分)
    if sector == "memory_cyclical":
        # 周期股看 P/B，低于 1.5 = 周期底
        if 0 < pb < 1.5:
            score += 5;  notes.append(f"P/B {pb:.2f} 周期底")
        elif pb < 2.5:
            score += 3
        elif pb < 4:
            score += 1
    elif sector == "saas_software":
        # SaaS 看 EV/S 和 Rule of 40 已在 G2，估值看 P/S
        if 0 < ps <= 8:
            score += 5
        elif ps <= 15:
            score += 3
        elif ps <= 25:
            score += 1
    elif sector in ("utility_power", "reit_dc"):
        # 看 EV/EBITDA
        if 0 < ev_ebitda <= 12:
            score += 5
        elif ev_ebitda <= 18:
            score += 3
        elif ev_ebitda <= 25:
            score += 1
    else:
        # 通用：P/E
        if 0 < pe <= 15:
            score += 5;  notes.append(f"P/E {pe:.1f} 合理")
        elif pe <= 25:
            score += 3
        elif pe <= 40:
            score += 2
        elif pe <= 60:
            score += 1

    # ── FCF Yield (4 分)
    if mcap > 0 and fcf > 0:
        fcf_yield = fcf / mcap
        if fcf_yield >= 0.06:
            score += 4;  notes.append(f"FCF 收益率 {fcf_yield*100:.1f}%")
        elif fcf_yield >= 0.03:
            score += 3
        elif fcf_yield >= 0.015:
            score += 2

    return _clip(score, 0, 15), notes


# ════════════════════════════════════════════════════════
# 总评分 + 等级
# ════════════════════════════════════════════════════════
def to_grade(score: float) -> str:
    # ⚠️ 阈值冻结 2026-06-11：S=82 / A=73 / B=58 / C=43。
    # 此后只允许改进评分模型本身，不允许为让某只票升降级而调阈值。
    if score >= 82: return "S"
    if score >= 73: return "A"
    if score >= 58: return "B"
    if score >= 43: return "C"
    return "D"


GRADE_LABEL = {
    "S": "S 极致",
    "A": "A 强力",
    "B": "B 合格",
    "C": "C 一般",
    "D": "D 弱势",
}


def evaluate(ticker: str, debug: bool = False) -> Optional[dict]:
    """主入口：返回完整 JSON-ready dict"""
    info = fetch(ticker)
    if not info:
        return {
            "ticker": ticker,
            "status": "no_data",
            "error": "fetch failed",
        }

    market_cap = _safe(info.get("marketCap"))
    currency   = info.get("currency", "USD")

    # CNY 单位的市值估算转 USD（约 1:7）
    if currency == "CNY":
        market_cap_usd = market_cap / 7.2
    elif currency in ("HKD",):
        market_cap_usd = market_cap / 7.8
    elif currency in ("JPY",):
        market_cap_usd = market_cap / 150
    elif currency in ("KRW",):
        market_cap_usd = market_cap / 1350
    elif currency in ("TWD",):
        market_cap_usd = market_cap / 31
    else:
        market_cap_usd = market_cap

    tier   = classify_tier(market_cap_usd)
    sector = classify_sector(ticker, info.get("industry"), info.get("sector"))

    # 各维度原始分（统一按最大值计算）
    raw_g1, notes_g1 = score_g1(info, tier, sector)  # /25
    raw_g2, notes_g2 = score_g2(info, tier, sector)  # /25
    raw_g3, notes_g3 = score_g3(info, tier, sector)  # /15
    raw_g4, notes_g4 = score_g4(info, tier, sector)  # /20
    raw_g5, notes_g5 = score_g5(info, tier, sector)  # /10
    raw_g6, notes_g6 = score_g6(info, tier, sector)  # /15

    # 按 weights 重新加权（先归一到 1，再乘以 weight）
    weights = get_weights(tier, sector)   # 长度 6，和=100
    raws    = [raw_g1, raw_g2, raw_g3, raw_g4, raw_g5, raw_g6]
    maxes   = [25, 25, 15, 20, 10, 15]
    weighted_dims = []
    for r, m, w in zip(raws, maxes, weights):
        d = (r / m) * w if m > 0 else 0
        weighted_dims.append(round(d, 1))

    total = round(sum(weighted_dims), 1)
    grade = to_grade(total)

    dims = {
        "G1": weighted_dims[0],
        "G2": weighted_dims[1],
        "G3": weighted_dims[2],
        "G4": weighted_dims[3],
        "G5": weighted_dims[4],
        "G6": weighted_dims[5],
    }

    features = extract_features(info, dims, tier, sector)
    risks    = extract_risks(info, dims, tier, sector)

    result = {
        "ticker": ticker,
        "status": "ok",
        "name": info.get("longName") or info.get("shortName") or ticker,
        "grade": grade,
        "grade_label": GRADE_LABEL[grade],
        "score": total,
        "tier": tier,
        "sector": sector,
        "currency": currency,
        "price": _safe(info.get("currentPrice") or info.get("regularMarketPrice"), default=None),
        "market_cap_usd_b": round(market_cap_usd / 1e9, 1) if market_cap_usd else None,
        "dims": dims,
        "dim_max": {"G1": weights[0], "G2": weights[1], "G3": weights[2],
                    "G4": weights[3], "G5": weights[4], "G6": weights[5]},
        "features": features,
        "risks": risks,
        "evaluated_at": str(date.today()),
    }

    if debug:
        result["_debug"] = {
            "notes_g1": notes_g1, "notes_g2": notes_g2, "notes_g3": notes_g3,
            "notes_g4": notes_g4, "notes_g5": notes_g5, "notes_g6": notes_g6,
            "raw_dims": {"G1": raw_g1, "G2": raw_g2, "G3": raw_g3,
                         "G4": raw_g4, "G5": raw_g5, "G6": raw_g6},
            "weights": weights,
        }

    return result


# ════════════════════════════════════════════════════════
# CLI
# ════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys
    import json
    # Windows GBK 终端兼容：强制 utf-8 输出
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    if len(sys.argv) < 2:
        print("用法: python universal_eval.py NVDA [TICKER2 ...]")
        sys.exit(1)

    for ticker in sys.argv[1:]:
        print(f"\n══════════ {ticker} ══════════")
        result = evaluate(ticker, debug=True)
        if not result or result.get("status") != "ok":
            print(f"  失败：{result}")
            continue

        print(f"  {result['name']}  [{result['tier']}/{result['sector']}]")
        print(f"  市值: ${result['market_cap_usd_b']}B")
        print(f"  评分: {result['score']} 分 → {result['grade_label']}")
        print(f"  G1 增长 {result['dims']['G1']:>5} / {result['dim_max']['G1']}")
        print(f"  G2 盈利 {result['dims']['G2']:>5} / {result['dim_max']['G2']}")
        print(f"  G3 财健 {result['dims']['G3']:>5} / {result['dim_max']['G3']}")
        print(f"  G4 护城 {result['dims']['G4']:>5} / {result['dim_max']['G4']}")
        print(f"  G5 股回 {result['dims']['G5']:>5} / {result['dim_max']['G5']}")
        print(f"  G6 估值 {result['dims']['G6']:>5} / {result['dim_max']['G6']}")
        print(f"  特点: {[f['emoji']+f['name'] for f in result['features']]}")
        print(f"  风险: {[r['emoji']+r['name'] for r in result['risks']]}")

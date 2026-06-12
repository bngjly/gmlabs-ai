"""
标签提取器：从公司财务和评分中自动生成"特点"和"风险"标签。

设计原则：
  - 标签必须由数据触发，不是 LLM 推测
  - 每只票最多 3 个特点 + 3 个风险
  - 标签优先级：风险 > 财务异常 > 行业属性 > 普通描述
"""

from typing import Optional


# ── 特点标签库（按触发条件）──────────────────────────────
# 每个标签：(emoji, name, priority)  priority 越大越优先展示
def extract_features(info: dict, dims: dict, tier: str, sector: str) -> list:
    """
    info: 财务原始数据
    dims: {"G1":分,"G2":分,...}
    """
    feats = []   # [(priority, emoji, name)]

    # ── 增长类 ──
    g1 = dims.get("G1", 0)
    revenue_growth = info.get("revenueGrowth")  # 同比增速（小数）
    earnings_growth = info.get("earningsGrowth")
    if revenue_growth and revenue_growth >= 0.50:
        feats.append((10, "🚀", "高速增长"))
    elif revenue_growth and revenue_growth >= 0.25:
        feats.append((8, "📈", "稳健增长"))

    # ── 盈利类 ──
    gross = info.get("grossMargins") or 0
    op_margin = info.get("operatingMargins") or 0
    roe = info.get("returnOnEquity") or 0
    fcf = info.get("freeCashflow") or 0
    revenue = info.get("totalRevenue") or 0

    if gross >= 0.65 and op_margin >= 0.25:
        feats.append((9, "🛡️", "高毛利护城河"))
    if fcf > 0 and revenue > 0:
        fcf_margin = fcf / revenue
        if fcf_margin >= 0.20:
            feats.append((9, "🐂", "现金牛"))
        elif fcf_margin >= 0.10:
            feats.append((6, "💵", "正向现金流"))

    if roe >= 0.25:
        feats.append((7, "⚡", "高 ROE"))

    # ── 龙头类（按 tier + 高分判定）──
    g4 = dims.get("G4", 0)
    if tier == "mega" and g4 >= 16:
        feats.append((9, "👑", "行业龙头"))
    elif tier == "large" and g4 >= 17:
        feats.append((8, "🏆", "细分龙头"))

    # ── 股东回报 ──
    g5 = dims.get("G5", 0)
    dividend_yield = info.get("dividendYield") or 0   # 小数（如 0.025）
    if dividend_yield >= 0.03:
        feats.append((6, "💰", "高分红"))
    if g5 >= 8:
        feats.append((5, "🔁", "积极回购"))

    # ── 行业属性 ──
    if sector == "memory_cyclical":
        # 看 P/B 判断周期位置：低 P/B → 周期底，高 → 周期顶
        pb = info.get("priceToBook") or 0
        if pb and pb < 1.3:
            feats.append((8, "📉", "周期底位"))
        elif pb and pb > 3.0:
            feats.append((7, "📊", "周期顶位"))
    if sector == "utility_power":
        feats.append((4, "🏦", "公用现金流"))
    if sector == "reit_dc":
        feats.append((4, "🏢", "数据中心 REIT"))
    if sector == "saas_software" and gross >= 0.70:
        feats.append((6, "☁️", "SaaS 高毛利"))

    # ── 估值类 ──
    g6 = dims.get("G6", 0)
    peg = info.get("pegRatio") or 0
    if 0 < peg < 1.0:
        feats.append((7, "💎", "PEG 低估"))
    if g6 >= 13:
        feats.append((5, "✨", "估值合理"))

    # ── 内部人持股 ──
    insiders = info.get("heldPercentInsiders") or 0
    if insiders >= 0.10:
        feats.append((6, "🆕", "创始人控盘"))

    # 排序取 top 3
    feats.sort(key=lambda x: x[0], reverse=True)
    return [{"emoji": e, "name": n} for _, e, n in feats[:3]]


def extract_risks(info: dict, dims: dict, tier: str, sector: str) -> list:
    """风险标签 - 数据驱动，触发即标"""
    risks = []   # [(priority, emoji, name)]

    def _num(v):
        # yfinance 偶尔返回字符串（如 'Infinity'），统一转 float，转不动归 0
        try:
            f = float(v)
            return f if f == f and f not in (float("inf"), float("-inf")) else 0.0
        except (TypeError, ValueError):
            return 0.0

    revenue = _num(info.get("totalRevenue"))
    gross = _num(info.get("grossMargins"))
    op_margin = _num(info.get("operatingMargins"))
    debt_to_eq = _num(info.get("debtToEquity"))
    fcf = _num(info.get("freeCashflow"))
    pe = _num(info.get("trailingPE")) or _num(info.get("forwardPE"))
    peg = _num(info.get("pegRatio"))
    revenue_growth = _num(info.get("revenueGrowth"))
    profit_margins = _num(info.get("profitMargins"))
    short_pct = _num(info.get("shortPercentOfFloat"))

    # ── 估值过高 ──
    if peg and peg > 3.0:
        risks.append((9, "📊", "估值过高"))
    elif pe > 60 and revenue_growth < 0.20:
        risks.append((9, "📊", "估值与增速不匹配"))

    # ── 现金流恶化 ──
    if fcf < 0:
        risks.append((10, "🏚️", "自由现金流为负"))

    # ── 高杠杆 ──
    if debt_to_eq > 200:
        risks.append((9, "🪙", "高杠杆"))
    elif debt_to_eq > 100:
        risks.append((6, "⚖️", "中等负债"))

    # ── 毛利下滑 ──
    if 0 < gross < 0.20:
        risks.append((7, "🔻", "低毛利率"))
    if op_margin < 0:
        risks.append((9, "📉", "经营亏损"))

    # ── 增长停滞 ──
    if revenue_growth is not None and revenue_growth < 0:
        risks.append((9, "🌪️", "营收下滑"))
    elif tier in ("mid", "small") and revenue_growth is not None and revenue_growth < 0.10:
        risks.append((6, "🐌", "增长放缓"))

    # ── 高做空 ──
    if short_pct >= 0.15:
        risks.append((7, "🎯", "高做空比例"))

    # ── 行业风险 ──
    if sector == "memory_cyclical":
        # 营收高速增长 + 高 P/B → 周期顶
        if revenue_growth and revenue_growth > 0.50 and (info.get("priceToBook") or 0) > 2.5:
            risks.append((8, "🌪️", "周期向下风险"))
    if sector == "biotech" and revenue < 1e8:
        risks.append((7, "🧪", "临床阶段"))
    if sector == "aerospace":
        risks.append((4, "🚨", "国防政策依赖"))
    if sector == "utility_power" and "OKLO" in str(info.get("symbol", "")):
        risks.append((6, "⏳", "商业化时间长"))

    # ── 客户集中 ──
    # yfinance 不直接给客户集中度，只能从 sector + tier 推断
    if sector in ("optical", "networking") and tier in ("mid", "small"):
        risks.append((4, "⚠️", "客户集中"))

    risks.sort(key=lambda x: x[0], reverse=True)
    return [{"emoji": e, "name": n} for _, e, n in risks[:3]]

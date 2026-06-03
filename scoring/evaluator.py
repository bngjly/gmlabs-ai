"""
千亿猎手评估模型 v1
目标：从市值 $50亿~$500亿 里找能长到千亿/万亿的公司
用法：python evaluator.py HIMS
      python evaluator.py HIMS PLTR MRVL
"""

import sys
import yfinance as yf
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional


# ──────────────────────────────────────────────
# 五维评分体系
# ──────────────────────────────────────────────
#
#  D1  收入天花板       市场空间 + 增速 + 加速度        25分
#  D2  商业模式杠杆     毛利率 + 经营杠杆 + Rule of 40  25分
#  D3  护城河方向       客户粘性 + 竞争壁垒代理指标     20分
#  D4  管理层资本配置   创始人 + 持股 + SBC稀释         15分
#  D5  估值重估空间     当前倍数 vs 成长性匹配度         15分
#
# 总分 100，附风险标记（红旗）
# ──────────────────────────────────────────────


@dataclass
class Score:
    d1_ceiling: float = 0      # 收入天花板
    d2_leverage: float = 0     # 商业模式杠杆
    d3_moat: float = 0         # 护城河方向
    d4_mgmt: float = 0         # 管理层
    d5_valuation: float = 0    # 估值重估空间
    risk_penalty: float = 0    # 风险扣分（0 ~ -15），不影响 D1-D5 显示
    red_flags: list = field(default_factory=list)
    green_flags: list = field(default_factory=list)

    @property
    def total(self):
        raw = (self.d1_ceiling + self.d2_leverage +
               self.d3_moat + self.d4_mgmt + self.d5_valuation +
               self.risk_penalty)
        return round(max(0.0, raw), 1)   # 不低于0分

    def grade(self):
        t = self.total

        # ── 维度下限：D1 或 D2 严重不足时强制降档 ──────────────────────────────
        # 逻辑：单维度极高可以拉动总分，但若天花板/商业模式本身有致命缺陷，
        #       不应入围 A/B 候选，顶多 C（人工复核再决定）
        #   D1 < 7  → 成长天花板不足（低增速或市场已饱和），无法成为多倍股
        #   D2 < 12 → 商业模式没有杠杆（低毛利或经营杠杆弱），规模化后利润难爆发
        weak_ceiling  = self.d1_ceiling  < 7
        weak_leverage = self.d2_leverage < 12
        if weak_ceiling or weak_leverage:
            reason = ("天花板不足" if weak_ceiling else "") + (
                     "商业模式杠杆不足" if weak_leverage else "")
            if t >= 48: return f"C  潜力存疑（{reason}）"
            return f"D  暂时不符合（{reason}）"

        # ── 正常评级（5档）────────────────────────────────────────────────────
        # S 层：全维度接近满分，极为罕见，直接建仓不犹豫
        # A 层：强力候选，优先研究，符合赛道则建仓
        # B 层：值得建仓，等确认信号（季报加速 / 赛道催化剂）
        # C 层：候选名单，季度复查，暂不建仓
        # D 层：不符合，排除
        if t >= 85: return "S  极致候选（立即深研）"
        if t >= 75: return "A  强力候选"
        if t >= 63: return "B  值得建仓"
        if t >= 48: return "C  候选名单"
        return      "D  暂时不符合"


# ── curl_cffi 浏览器指纹会话（绕过 Yahoo 的 Rate Limit / Bot 检测）────────
# Yahoo 限流的本质：通过 TLS 指纹 + UA 识别 Python requests，限速到几乎不可用
# 解决：用 curl_cffi 伪装 Chrome 指纹（包括 TLS / HTTP2 帧序列），Yahoo 识别为真实浏览器
_YF_SESSION = None
def _get_yf_session():
    global _YF_SESSION
    if _YF_SESSION is None:
        try:
            from curl_cffi import requests as cffi_requests
            _YF_SESSION = cffi_requests.Session(impersonate="chrome124")
        except Exception as e:
            print(f"  [警告] curl_cffi 会话创建失败，回退默认: {e}")
            _YF_SESSION = False  # 标记失败，避免反复尝试
    return _YF_SESSION if _YF_SESSION is not False else None


def _fetch_yfinance(ticker: str) -> Optional[dict]:
    """主路径：每次创建全新 requests.Session（避免 Streamlit 长期进程的 session 污染）
    诊断结论：yfinance 模块级 session 在长期进程中会被 Yahoo 累积标记为爬虫，
    必须每次新建 session 才能保证不被秒拒"""
    last_err = None
    for attempt in range(2):
        try:
            # 强制全新 session：每次调用都创建独立 cookie jar
            import requests as _req
            fresh_session = _req.Session()
            fresh_session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                              'AppleWebKit/537.36 (KHTML, like Gecko) '
                              'Chrome/120.0.0.0 Safari/537.36',
            })
            t = yf.Ticker(ticker, session=fresh_session)
            info = t.info
            price = (info.get("regularMarketPrice")
                     or info.get("currentPrice")
                     or info.get("previousClose"))
            if not info or not price:
                return None
            try:
                fin   = t.financials
                fin_q = t.quarterly_financials
                bs    = t.balance_sheet
            except Exception:
                fin, fin_q, bs = None, None, None
            info["_financials"]           = fin
            info["_quarterly_financials"] = fin_q
            info["_balance_sheet"]        = bs
            return info
        except Exception as e:
            last_err = e
            err_str = str(e)
            # 限速类错误：立即放弃，不重试（重试会让Yahoo认为是爬虫攻击）
            if "Rate" in err_str or "429" in err_str or "Too Many" in err_str:
                print(f"  [yfinance限速] 立即放弃（重试只会加剧封禁）: {err_str[:80]}")
                break
            # 纯网络超时：可以重试1次
            elif "Timeout" in err_str or "timed out" in err_str:
                if attempt == 0:
                    print(f"  [超时] 网络超时，重试1次...")
                    import time; time.sleep(2)
                    continue
                else:
                    break
            else:
                break
    print(f"  [yfinance失败] {last_err}")
    return None


def _fetch_akshare_ashare(ticker: str) -> Optional[dict]:
    """A股专用兜底：akshare 直接走东方财富/新浪，不经过 Yahoo"""
    if not (ticker.endswith(".SS") or ticker.endswith(".SZ")):
        return None
    try:
        import akshare as ak
        code = ticker.split(".")[0]   # 600584
        market = "SH" if ticker.endswith(".SS") else "SZ"

        # 实时行情
        spot = ak.stock_zh_a_spot_em()
        row = spot[spot["代码"] == code]
        if row.empty:
            print(f"  [akshare] 找不到 {code}")
            return None
        row = row.iloc[0]

        # 财务数据
        try:
            fin_abstract = ak.stock_financial_abstract_ths(symbol=code, indicator="按年度")
        except Exception:
            fin_abstract = None

        # 公司基本信息
        try:
            info_df = ak.stock_individual_info_em(symbol=code)
            info_dict = dict(zip(info_df["item"], info_df["value"]))
        except Exception:
            info_dict = {}

        price = float(row.get("最新价", 0))
        mcap_yi  = float(row.get("总市值", 0))   # 单位：元（已是元）
        # akshare 总市值单位是"元"，转USD约值用人民币原值，但 marketCap 在我们模型里
        # 是按"USD-like"使用——A股直接用原值（CNY），让模型走 currency=CNY 分支
        info = {
            "longName":    info_dict.get("股票简称") or row.get("名称") or ticker,
            "shortName":   row.get("名称") or ticker,
            "currency":    "CNY",
            "sector":      info_dict.get("行业") or "",
            "industry":    info_dict.get("行业") or "",
            "marketCap":   mcap_yi,
            "currentPrice":          price,
            "regularMarketPrice":    price,
            "previousClose":         price - float(row.get("涨跌额", 0) or 0),
            "fiftyTwoWeekHigh":      float(row.get("60日最高", 0) or price),
            "fiftyTwoWeekLow":       float(row.get("60日最低", 0) or price),
            "revenueGrowth":         None,   # akshare 不直出，留空让模型用其他通道
            "grossMargins":          None,
            "operatingMargins":      None,
            "profitMargins":         None,
            "returnOnEquity":        None,
            "priceToSalesTrailing12Months": None,
            "trailingPE":            float(row.get("市盈率-动态", 0) or 0),
            "forwardPE":             0,
            "pegRatio":              0,
            "shortPercentOfFloat":   0,
            "heldPercentInsiders":   0,
            "sharesOutstanding":     float(info_dict.get("总股本", 0) or 0),
            "totalRevenue":          0,
            "freeCashflow":          0,
            "ebitda":                0,
            "longBusinessSummary":   info_dict.get("主营业务") or "",
            "_financials":           None,
            "_quarterly_financials": None,
            "_balance_sheet":        None,
            "_source":               "akshare",   # 标记数据来源
        }
        print(f"  [akshare] 成功获取 {ticker}: {info['longName']} ¥{price}")
        return info
    except Exception as e:
        print(f"  [akshare失败] {e}")
        return None


def fetch(ticker: str) -> Optional[dict]:
    ticker = ticker.upper().strip()
    # 1) 主路径：yfinance（带浏览器指纹）
    info = _fetch_yfinance(ticker)
    if info:
        return info
    # 2) A股兜底：akshare 直连东财
    if ticker.endswith(".SS") or ticker.endswith(".SZ"):
        print(f"  [回退] yfinance 失败，尝试 akshare...")
        info = _fetch_akshare_ashare(ticker)
        if info:
            return info
    print(f"  无法获取 {ticker} 数据（所有数据源都失败）")
    return None


# ──────────────────────────────────────────────
# D1：收入天花板（25分）
# ──────────────────────────────────────────────
def score_d1(info: dict) -> tuple[float, list, list]:
    green, red = [], []
    score = 0.0

    fin   = info.get("_financials")
    fin_q = info.get("_quarterly_financials")

    # ── 营收：3年CAGR + TTM双轨 + 逐年趋势 —— 10分 ──────────────────────────
    # 问题：非12月财年公司（如CRDO：3月财年）年度数据会比TTM滞后9~11个月，
    #       导致年度增速被系统性低估。解决方案：同时计算TTM，取二者较高值。
    _rg_raw = info.get("revenueGrowth")
    rg_latest = float(_rg_raw) if _rg_raw is not None and pd.notna(_rg_raw) else 0.0
    cagr     = None
    ttm_growth = None
    yoy_list = []   # 从新到旧：[最近同比, 前一年同比, 再前一年同比]

    if fin is not None and not fin.empty and "Total Revenue" in fin.index:
        rev = fin.loc["Total Revenue"].dropna()
        # financials 列按降序排列（最新在 iloc[0]）
        if len(rev) >= 2 and rev.iloc[1] != 0:
            v = (rev.iloc[0] - rev.iloc[1]) / abs(rev.iloc[1])
            if pd.notna(v): yoy_list.append(v)
        if len(rev) >= 3 and rev.iloc[2] != 0:
            v = (rev.iloc[1] - rev.iloc[2]) / abs(rev.iloc[2])
            if pd.notna(v): yoy_list.append(v)
        if len(rev) >= 4 and rev.iloc[3] != 0:
            v = (rev.iloc[2] - rev.iloc[3]) / abs(rev.iloc[3])
            if pd.notna(v): yoy_list.append(v)
            _c = (rev.iloc[0] / rev.iloc[3]) ** (1/3) - 1
            cagr = float(_c) if pd.notna(_c) else None
        elif len(rev) >= 3 and rev.iloc[2] != 0:
            _c = (rev.iloc[0] / rev.iloc[2]) ** (1/2) - 1
            cagr = float(_c) if pd.notna(_c) else None

    # TTM（滚动12个月）：从季度数据计算，修复非12月财年的低估问题
    if fin_q is not None and not fin_q.empty and "Total Revenue" in fin_q.index:
        try:
            qrev = fin_q.loc["Total Revenue"].dropna()
            if len(qrev) >= 8:           # 需要8个季度才能算同比TTM
                ttm_now  = qrev.iloc[:4].sum()
                ttm_prev = qrev.iloc[4:8].sum()
                if ttm_prev > 0:
                    _tg = (ttm_now - ttm_prev) / ttm_prev
                    ttm_growth = float(_tg) if pd.notna(_tg) else None
        except Exception:
            pass

    # 取三个来源中最能反映当前真实增速的值
    # 优先级：TTM（最新） > CAGR（3年均值） > yfinance单点值
    # 注意：如果年度CAGR > TTM（公司在减速），用CAGR更保守；反之用TTM捕捉加速
    if cagr is not None and ttm_growth is not None:
        rg = max(cagr, ttm_growth)           # 取较高者：避免财年错位低估
        label = (f"营收TTM {ttm_growth*100:.0f}%（CAGR {cagr*100:.0f}%）"
                 if ttm_growth > cagr else f"营收3年CAGR {cagr*100:.0f}%")
    elif cagr is not None:
        rg    = cagr
        label = f"营收3年CAGR {rg*100:.0f}%"
    elif ttm_growth is not None:
        rg    = ttm_growth
        label = f"营收TTM {rg*100:.0f}%"
    else:
        rg    = rg_latest
        label = f"营收增速 {rg*100:.0f}%"

    if rg >= 0.40:
        score += 10; green.append(f"{label} 极高")
    elif rg >= 0.25:
        score += 7;  green.append(f"{label} 良好")
    elif rg >= 0.15:
        score += 4;  green.append(f"{label}")
    else:
        red.append(f"{label}，成长动能不足")

    # ── 年度增速趋势：加速 or 减速？ ────────────────────────────────────────────
    if len(yoy_list) >= 2:
        r0, r1 = yoy_list[0], yoy_list[1]
        yoy_str = "  →  ".join(f"{v*100:.0f}%" for v in reversed(yoy_list))
        if r0 > r1 * 1.2:
            green.append(f"年度增速加速（{yoy_str}）")
        elif r0 < r1 * 0.6 and r0 < 0.40:
            red.append(f"增速明显放缓（{yoy_str}）")
        elif r0 < r1 * 0.6:
            green.append(f"增速高位回落但仍强劲（{yoy_str}）")
        else:
            green.append(f"增速稳定（{yoy_str}）")

    # ── V型增速陷阱：中间年大幅低谷（需求不稳定信号）────────────────────────────
    # 逻辑：CRDO 73%→5%→126% 表面"加速"，实为需求高度集中/周期性
    #       中间年跌至 <10% 而前后年均 >50%，说明客户拉货时间高度不均匀
    if len(yoy_list) >= 3:
        min_yoy = min(yoy_list)
        max_yoy = max(yoy_list)
        if min_yoy < 0.10 and max_yoy > 0.50:
            yoy_str_all = "  →  ".join(f"{v*100:.0f}%" for v in reversed(yoy_list))
            red.append(f"增速历史波动极大（{yoy_str_all}），"
                       f"需求稳定性存疑，警惕客户拉货节奏不均或单一大客户集中")

    # ── 季度加速信号（最重要的前瞻信号）—— +4分 ──────────────────────────────
    # 逻辑：CRDO/ALAB等大涨股票在爆发前，最近一季YoY增速 > 前一季YoY增速 >= 30%
    # 这比年度数据早 2~3 个季度捕捉到拐点
    if fin_q is not None and not fin_q.empty and "Total Revenue" in fin_q.index:
        try:
            qrev = fin_q.loc["Total Revenue"].dropna()
            if len(qrev) >= 6 and qrev.iloc[4] != 0 and qrev.iloc[5] != 0:
                q_yoy0 = (qrev.iloc[0] - qrev.iloc[4]) / abs(qrev.iloc[4])  # 最新季度同比
                q_yoy1 = (qrev.iloc[1] - qrev.iloc[5]) / abs(qrev.iloc[5])  # 前一季度同比
                if not pd.notna(q_yoy0) or not pd.notna(q_yoy1):
                    raise ValueError("NaN in quarterly yoy")
                q_str  = f"{q_yoy1*100:.0f}% → {q_yoy0*100:.0f}%"
                if q_yoy0 > q_yoy1 * 1.3 and q_yoy0 > 0.20:
                    # 加速且最新同比 > 20%，确认不是低基数反弹
                    score += 4
                    green.append(f"季度增速加速（{q_str}），领先信号")
                elif q_yoy0 > q_yoy1 * 1.1 and q_yoy0 > 0.30:
                    score += 2
                    green.append(f"季度增速温和加速（{q_str}）")
                elif q_yoy0 < q_yoy1 * 0.7 and q_yoy1 > 0.30:
                    red.append(f"季度增速减速（{q_str}），动能转弱")
        except Exception:
            pass

    # ── 毛利润绝对值3年增速（反映天花板扩张）—— 5分 ──
    if fin is not None and not fin.empty and "Gross Profit" in fin.index:
        gp = fin.loc["Gross Profit"].dropna()
        if len(gp) >= 2 and gp.iloc[1] != 0:
            gp_growth = (gp.iloc[0] - gp.iloc[1]) / abs(gp.iloc[1])
            if not pd.notna(gp_growth):
                gp_growth = 0.0
            if gp_growth >= 0.35:
                score += 5; green.append(f"毛利润增速 {gp_growth*100:.0f}%（天花板在扩大）")
            elif gp_growth >= 0.20:
                score += 3
            else:
                red.append("毛利润增速慢于预期")

    # 市值是否在甜蜜区（50亿~500亿）—— 5分
    mkt = info.get("marketCap") or 0
    mkt_b = mkt / 1e9
    if 5 <= mkt_b <= 50:
        score += 5; green.append(f"市值 ${mkt_b:.1f}B，成长空间最大")
    elif 50 < mkt_b <= 500:
        score += 3; green.append(f"市值 ${mkt_b:.1f}B，仍有空间")
    else:
        red.append(f"市值 ${mkt_b:.1f}B 不在目标区间")

    # 分析师预期增速（前瞻）—— 5分
    fwd_eps_growth = info.get("earningsGrowth") or 0
    rev_fwd = info.get("revenueGrowth") or 0       # yfinance无单独前瞻营收增速，用当前代理
    analyst_target = info.get("targetMeanPrice") or 0
    current_price  = info.get("currentPrice") or info.get("regularMarketPrice") or 1
    upside = (analyst_target / current_price - 1) if analyst_target and current_price else 0
    if upside >= 0.30:
        score += 5; green.append(f"分析师目标价较现价高 {upside*100:.0f}%")
    elif upside >= 0.15:
        score += 3
    elif upside < 0:
        red.append(f"分析师目标价低于当前价格（下行预期）")

    return min(score, 25), green, red


# ──────────────────────────────────────────────
# D2：商业模式杠杆（25分）
# ──────────────────────────────────────────────
def score_d2(info: dict) -> tuple[float, list, list]:
    green, red = [], []
    score = 0.0

    # 毛利率 —— 10分
    gm = info.get("grossMargins") or 0
    if gm >= 0.70:
        score += 10; green.append(f"毛利率 {gm*100:.1f}% 顶级（软件/平台级别）")
    elif gm >= 0.55:
        score += 7;  green.append(f"毛利率 {gm*100:.1f}% 良好")
    elif gm >= 0.40:
        score += 4
    else:
        red.append(f"毛利率 {gm*100:.1f}% 偏低，商业模式杠杆有限")

    # 毛利率多年趋势（3年，扩张/稳定/收窄）—— 5分
    fin = info.get("_financials")
    if fin is not None and not fin.empty:
        try:
            rev_row = fin.loc["Total Revenue"].dropna()
            gp_row  = fin.loc["Gross Profit"].dropna()
            n = min(len(rev_row), len(gp_row), 4)
            if n >= 2:
                gm_series = [gp_row.iloc[i] / rev_row.iloc[i] for i in range(n)]
                # gm_series[0] = 最新年, gm_series[-1] = 最早年
                gm_strs = "  →  ".join(f"{v*100:.1f}%" for v in reversed(gm_series))
                delta = gm_series[0] - gm_series[1]   # 最近1年变化
                total_delta = gm_series[0] - gm_series[-1]  # 多年总变化
                if total_delta > 0.03 or delta > 0.02:
                    score += 5; green.append(f"毛利率多年扩张（{gm_strs}）")
                elif total_delta > -0.02:
                    score += 3; green.append(f"毛利率保持稳定（{gm_strs}）")
                else:
                    red.append(f"毛利率多年收窄（{gm_strs}），竞争压力或成本上升")
        except Exception:
            pass

    # Rule of 40 代理（营收增速 + 经营利润率）—— 10分
    _rg_raw2 = info.get("revenueGrowth")
    rg   = (float(_rg_raw2) if _rg_raw2 is not None and pd.notna(_rg_raw2) else 0.0) * 100
    _opm_raw = info.get("operatingMargins")
    opm  = (float(_opm_raw) if _opm_raw is not None and pd.notna(_opm_raw) else 0.0) * 100
    r40  = rg + opm
    if r40 >= 60:
        score += 10; green.append(f"Rule of 40 = {r40:.0f}（顶级效率）")
    elif r40 >= 40:
        score += 7;  green.append(f"Rule of 40 = {r40:.0f}（达标）")
    elif r40 >= 20:
        score += 4
    else:
        red.append(f"Rule of 40 = {r40:.0f}（成长/盈利均不够强）")

    # ROE 低于门槛说明高增速没有转化为股东回报（对非金融类同样重要）
    roe = info.get("returnOnEquity") or 0
    if 0 < roe < 0.08:
        red.append(f"ROE {roe*100:.1f}%（高增速未转化为股东回报，成长质量存疑）")

    return min(score, 25), green, red


# ──────────────────────────────────────────────
# D2（金融类专属）：商业模式杠杆（25分）
# 金融类毛利率失真，改用净利润率+收入多元化+监管风险
# ──────────────────────────────────────────────
def score_d2_financial(info: dict) -> tuple[float, list, list]:
    green, red = [], []
    score = 0.0

    # 净利润率（替代毛利率）—— 10分
    nm = info.get("profitMargins") or 0
    if nm >= 0.25:
        score += 10; green.append(f"净利润率 {nm*100:.1f}%（金融类顶级）")
    elif nm >= 0.15:
        score += 7;  green.append(f"净利润率 {nm*100:.1f}%（良好）")
    elif nm >= 0.08:
        score += 4
    elif nm > 0:
        score += 2
    else:
        red.append(f"净利润率 {nm*100:.1f}%（亏损）")

    # ROE（金融类核心效率指标）—— 8分
    roe = info.get("returnOnEquity") or 0
    if roe >= 0.20:
        score += 8; green.append(f"ROE {roe*100:.1f}%（高回报，资本效率强）")
    elif roe >= 0.12:
        score += 5; green.append(f"ROE {roe*100:.1f}%（合理）")
    elif roe >= 0.05:
        score += 2
    else:
        red.append(f"ROE {roe*100:.1f}%（资本效率差）")

    # 营收增速（金融类也需成长）—— 7分
    rg = (info.get("revenueGrowth") or 0) * 100
    if rg >= 40:
        score += 7; green.append(f"营收增速 {rg:.0f}%（金融类高成长）")
    elif rg >= 20:
        score += 5; green.append(f"营收增速 {rg:.0f}%")
    elif rg >= 10:
        score += 3
    else:
        red.append(f"营收增速 {rg:.0f}%（成长乏力）")

    # 监管风险提示（金融类特有）
    # PFOF 依赖通过空头比例间接反映
    short_pct = info.get("shortPercentOfFloat") or 0
    if short_pct > 0.10:
        red.append(f"空头比例 {short_pct*100:.1f}%（市场对监管/模式可持续性存疑）")

    return min(score, 25), green, red


# ──────────────────────────────────────────────
# D3：护城河方向（20分）
# ──────────────────────────────────────────────
def score_d3(info: dict) -> tuple[float, list, list]:
    green, red = [], []
    score = 0.0

    # 研发投入占比（护城河投资力度）—— 8分
    fin = info.get("_financials")
    rd_ratio = None
    if fin is not None and not fin.empty:
        try:
            rev = fin.loc["Total Revenue"].iloc[0]
            # yfinance financials 中研发科目名称不统一
            for key in ["Research And Development", "Research Development"]:
                if key in fin.index:
                    rd  = abs(fin.loc[key].iloc[0])
                    rd_ratio = rd / rev
                    break
        except Exception:
            pass

    if rd_ratio is not None:
        if rd_ratio >= 0.20:
            score += 8; green.append(f"研发占营收 {rd_ratio*100:.1f}%（护城河持续加深）")
        elif rd_ratio >= 0.12:
            score += 5; green.append(f"研发占营收 {rd_ratio*100:.1f}%")
        elif rd_ratio >= 0.06:
            score += 3
        else:
            red.append(f"研发占营收 {rd_ratio*100:.1f}%（偏低，护城河可能依赖非技术因素）")
    else:
        score += 3  # 无数据给中性分

    # 客户留存代理：用营收增速 vs 行业对比（简化）—— 6分
    # 高增速在没有大规模新产品的情况下，意味着客户在扩大购买
    _rg_d3 = info.get("revenueGrowth")
    rg = float(_rg_d3) if _rg_d3 is not None and pd.notna(_rg_d3) else 0.0
    if rg >= 0.35:
        score += 6; green.append("高增速暗示客户留存或扩购良好")
    elif rg >= 0.20:
        score += 4

    # 短期空头比例（高空头 = 市场认为护城河脆弱）—— 6分
    short_pct = info.get("shortPercentOfFloat") or 0
    if short_pct <= 0.05:
        score += 6; green.append(f"空头比例 {short_pct*100:.1f}%（低，市场不看衰）")
    elif short_pct <= 0.12:
        score += 4
    elif short_pct <= 0.20:
        score += 2
    else:
        red.append(f"空头比例 {short_pct*100:.1f}%（高，护城河被质疑）")

    # 客户集中度代理（双重检测）────────────────────────────────────────────────
    # yfinance 无直接客户数据，用两个代理信号叠加判断
    inst = info.get("heldPercentInstitutions") or 0

    # 信号1：机构持股高度集中（门槛从0.80降至0.70）+ 高增速
    if inst > 0.70 and rg >= 0.50:
        red.append(f"机构持股 {inst*100:.0f}% 高度集中且营收高速增长"
                   f"——注意核查是否存在单一大客户依赖风险")

    # 信号2：B2B 高增速小市值公司的结构性提示
    # 逻辑：B2B（非消费品）CAGR>50% 的小市值公司，绝大多数依赖少数大客户
    #       这类风险在财报里不会直接体现，但单一客户流失可致营收腰斩
    fin_d3 = info.get("_financials")
    mkt_b_d3 = (info.get("marketCap") or 0) / 1e9
    sector_d3 = info.get("sector", "")
    is_consumer = any(k in sector_d3 for k in ["Consumer", "Retail", "Healthcare"])
    if (fin_d3 is not None and not fin_d3.empty
            and "Total Revenue" in fin_d3.index
            and not is_consumer
            and mkt_b_d3 < 80):
        try:
            rev_d3 = fin_d3.loc["Total Revenue"].dropna()
            if len(rev_d3) >= 3:
                cagr_d3 = (rev_d3.iloc[0] / rev_d3.iloc[2]) ** (1/2) - 1
                if cagr_d3 > 0.50:
                    red.append(f"B2B高增速（3年CAGR {cagr_d3*100:.0f}%）小市值公司，"
                               f"通常依赖少数大客户，需核查客户集中度（10-K客户列表）")
        except Exception:
            pass

    return min(score, 20), green, red


# ──────────────────────────────────────────────
# D4：管理层与资本配置（15分）
# 核心逻辑：创始人持续持股是最强的利益对齐信号
# 权重分配：内部人持股 12 / 机构认可 2 / 回购 1
# ──────────────────────────────────────────────
def score_d4(info: dict) -> tuple[float, list, list]:
    green, red = [], []
    score = 0.0

    # ── 内部人持股（创始人信号，核心）—— 12分 ──
    # 研究表明创始人长期持股是超额回报最强预测因子之一
    insider = info.get("heldPercentInsiders") or 0
    if insider >= 0.20:
        score += 12
        green.append(f"内部人持股 {insider*100:.1f}%（创始人控制级，利益深度绑定）")
    elif insider >= 0.10:
        score += 9
        green.append(f"内部人持股 {insider*100:.1f}%（创始人仍为大股东，强绑定）")
    elif insider >= 0.05:
        score += 6
        green.append(f"内部人持股 {insider*100:.1f}%（有意义持股）")
    elif insider >= 0.02:
        score += 3
        green.append(f"内部人持股 {insider*100:.1f}%（较低，关注减持动态）")
    else:
        red.append(f"内部人持股 {insider*100:.1f}%（几乎无持股，代理人问题风险高）")

    # ── 机构持股（聪明钱认可度）—— 2分 ──
    inst = info.get("heldPercentInstitutions") or 0
    if 0.40 <= inst <= 0.85:
        score += 2; green.append(f"机构持股 {inst*100:.1f}%（聪明钱布局）")
    elif inst > 0.85:
        score += 0; red.append(f"机构持股 {inst*100:.1f}%（过度拥挤，上行空间受限）")
    else:
        score += 1; green.append(f"机构持股 {inst*100:.1f}%（尚未被充分发掘）")

    # ── 回购（资本配置信号）—— 1分 ──
    try:
        cf = yf.Ticker(info.get("symbol", "")).cashflow
        if cf is not None and not cf.empty:
            for key in ["Repurchase Of Capital Stock", "Common Stock Repurchased"]:
                if key in cf.index:
                    buyback = cf.loc[key].iloc[0]
                    if buyback and buyback < -1e8:
                        score += 1; green.append("有股票回购记录")
                    break
    except Exception:
        pass

    return min(score, 15), green, red


# ──────────────────────────────────────────────
# D5：估值重估空间（15分）
# ──────────────────────────────────────────────
def score_d5(info: dict) -> tuple[float, list, list]:
    green, red = [], []
    score = 0.0

    def _n0(v):
        """Return float(v) if v is not None/NaN, else 0.0."""
        return float(v) if v is not None and pd.notna(v) else 0.0

    ps    = _n0(info.get("priceToSalesTrailing12Months"))
    peg   = _n0(info.get("pegRatio"))
    rg    = _n0(info.get("revenueGrowth")) * 100
    gm    = _n0(info.get("grossMargins"))
    mkt_b = _n0(info.get("marketCap")) / 1e9

    # PS 合理性（考虑增速 + 毛利率质量 + 市值阶段）—— 8分
    #
    # 旧逻辑：fair_ps = rg * 0.5（对低增速公司 fair_ps 极小，任何 PS 都显得"贵"）
    # 新逻辑：
    #   base_fair_ps = max(rg*0.5, 5)    下限5x，避免低增速公司被过度惩罚
    #   quality_mult = 1.5 if gm≥60%     高毛利率公司应享受估值溢价
    #               = 1.2 if gm≥40%
    #   stage_mult   = 1.3 if mkt<$30B   小市值甜蜜区有更大成长空间，合理溢价
    #   fair_ps = base_fair_ps × quality_mult × stage_mult
    #
    # 宽容窗口也调整：ps_ratio <= 1.5（原1.2）才扣分，3.0以上才红旗（原2.0）
    # 高毛利小市值即使超3x也只给1分而非红旗（增长期权价值）
    base_fair_ps = max(rg * 0.5, 5.0)
    quality_mult = 1.5 if gm >= 0.60 else 1.2 if gm >= 0.40 else 1.0
    stage_mult   = 1.3 if 5 <= mkt_b <= 30 else 1.0
    fair_ps = base_fair_ps * quality_mult * stage_mult

    if ps > 0 and rg > 0:
        ps_ratio = ps / fair_ps
        if ps_ratio <= 0.8:
            score += 8; green.append(f"PS {ps:.1f}x vs 合理估算 {fair_ps:.0f}x（明显低估）")
        elif ps_ratio <= 1.5:
            score += 5; green.append(f"PS {ps:.1f}x 合理")
        elif ps_ratio <= 3.0:
            score += 2
        else:
            # 高毛利小市值：给1分提示，不直接红旗（有增长期权价值）
            if gm >= 0.55 and mkt_b <= 30:
                score += 1
                green.append(f"PS {ps:.1f}x 偏贵但具备高毛利小市值溢价（合理估算 {fair_ps:.0f}x）")
            else:
                red.append(f"PS {ps:.1f}x 远超合理估算 {fair_ps:.0f}x（溢价过高）")

        # 绝对估值过高警告：即使相对 fair_ps "低估"，绝对值>20x 在增速降档时
        # 仍面临较大的估值压缩风险（fair_ps 是在当前增速下估算的，一旦增速回落
        # fair_ps 会同步下移，PS 可能从"低估"变"泡沫"）
        if ps > 20 and ps_ratio < 1.5:
            red.append(f"注意：PS {ps:.0f}x 绝对值较高，若增速回落估值压缩风险显著")
    elif ps == 0:
        score += 3   # 无数据中性

    # PEG —— 4分
    if 0 < peg <= 1.0:
        score += 4; green.append(f"PEG {peg:.2f}（低于1，增长被低估）")
    elif 0 < peg <= 2.0:
        score += 2; green.append(f"PEG {peg:.2f}（可接受）")
    elif peg > 3.0:
        red.append(f"PEG {peg:.2f}（估值泡沫风险）")

    # PE 极端 & Forward/TTM 背离检查
    pe_ttm = info.get("trailingPE") or 0
    pe_fwd = info.get("forwardPE") or 0
    if pe_ttm > 200:
        red.append(f"PE {pe_ttm:.0f}x 极高（净利基数过小，估值参考意义有限）")
    if pe_ttm > 0 and pe_fwd > 0 and pe_fwd > pe_ttm * 1.3:
        red.append(f"Forward PE {pe_fwd:.0f}x > TTM PE {pe_ttm:.0f}x（市场预期盈利将下滑）")

    # 52周价格位置（趋势强度）—— 3分
    price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
    high  = info.get("fiftyTwoWeekHigh") or 1
    low   = info.get("fiftyTwoWeekLow") or 0
    rng   = high - low
    pos   = (price - low) / rng if rng > 0 else 0.5
    if pos >= 0.75:
        score += 3; green.append(f"价格在52周区间上方 {pos*100:.0f}%（强势趋势）")
    elif pos >= 0.50:
        score += 2
    else:
        score += 1; green.append(f"价格在52周区间下方（可能是低吸窗口）")

    return min(score, 15), green, red


# ──────────────────────────────────────────────
# 硬性前置过滤（不达标直接排除）
# ──────────────────────────────────────────────
HARD_FILTERS = {
    "min_gross_margin":     0.30,   # 毛利率 < 30%：代工/服务商，无规模杠杆
    "max_market_cap":       500e9,  # 市值 > 5000亿：成长空间受限
    "min_market_cap":       1e9,    # 市值 < 10亿：流动性风险
    "fin_min_net_margin":   0.05,   # 金融类豁免毛利率，改看净利润率 > 5%
    "fin_min_rev_growth":   0.15,   # 金融类仍需营收增速 > 15%
}

# 金融服务行业：会计结构导致毛利率失真，用净利润率替代
FINANCIAL_SECTORS = {"Financial Services", "Banks", "Insurance", "Capital Markets"}

# AI 基础设施硬件：毛利率天花板低，但周期拐点价值大
# 特征：制造/组装/光电子/冷却/存储，毛利率 8-45%
AI_HARDWARE_INDUSTRIES = {
    "Electronic Components", "Electronic Equipment & Parts",
    "Computer Hardware", "Semiconductor Equipment & Materials",
    "Electrical Equipment & Parts", "Communication Equipment",
    "Data Storage", "Scientific & Technical Instruments",
    "Semiconductors",   # OSAT封装/IDM制造类，靠 gm_range(5%~45%) 与 Fabless 区分
}

def is_financial(info: dict) -> bool:
    sector   = info.get("sector") or ""
    industry = info.get("industry") or ""
    return any(s in sector or s in industry for s in FINANCIAL_SECTORS)

def is_ai_hardware(info: dict) -> bool:
    """
    AI 基础设施硬件类判定：
    - 行业属于硬件制造 / 光电子 / 冷却 / 存储
    - 毛利率在 5%~45% 区间（低于软件门槛，高于纯代工）
    - 营收增速 > 10%（排除衰退型硬件）
    """
    sector   = info.get("sector")   or ""
    industry = info.get("industry") or ""
    gm       = info.get("grossMargins") or 0
    rg       = info.get("revenueGrowth") or 0

    industry_match = any(kw in industry for kw in AI_HARDWARE_INDUSTRIES)
    gm_range       = 0.05 <= gm <= 0.45
    growing        = rg >= 0.10

    return industry_match and gm_range and growing


# ──────────────────────────────────────────────
# D2（AI 硬件类专属）：商业模式杠杆（25分）
# 重点：毛利率扩张趋势 + 经营杠杆 + 周期弹性
# ──────────────────────────────────────────────
def score_d2_ai_hardware(info: dict) -> tuple[float, list, list]:
    green, red = [], []
    score = 0.0

    gm = info.get("grossMargins") or 0

    # 毛利率绝对水平（硬件标准）—— 8分
    if gm >= 0.40:
        score += 8; green.append(f"毛利率 {gm*100:.1f}%（硬件类顶级，接近轻资产）")
    elif gm >= 0.30:
        score += 6; green.append(f"毛利率 {gm*100:.1f}%（硬件类良好）")
    elif gm >= 0.20:
        score += 4; green.append(f"毛利率 {gm*100:.1f}%（制造业合理）")
    elif gm >= 0.08:
        score += 2; green.append(f"毛利率 {gm*100:.1f}%（组装级，关注扩张趋势）")
    else:
        red.append(f"毛利率 {gm*100:.1f}%（代工级，几乎无规模杠杆）")

    # 毛利率扩张趋势（比水平更重要）—— 9分
    fin = info.get("_financials")
    if fin is not None and not fin.empty:
        try:
            rv = fin.loc["Total Revenue"].dropna()
            gp = fin.loc["Gross Profit"].dropna()
            n  = min(len(rv), len(gp), 4)
            if n >= 2:
                gm_series   = [gp.iloc[i] / rv.iloc[i] for i in range(n)]
                gm_strs     = "  →  ".join(
                    f"{v*100:.1f}%" for v in reversed(gm_series))
                total_delta = gm_series[0] - gm_series[-1]
                if total_delta > 0.05:
                    score += 9
                    green.append(f"毛利率多年扩张 +{total_delta*100:.1f}pp（{gm_strs}）")
                elif total_delta > 0.02:
                    score += 6
                    green.append(f"毛利率稳步扩张（{gm_strs}）")
                elif total_delta > -0.03:
                    score += 3
                    green.append(f"毛利率基本稳定（{gm_strs}）")
                else:
                    red.append(f"毛利率持续收窄（{gm_strs}），竞争或成本压力")
        except Exception:
            pass

    # Rule of 40（营收增速 + 经营利润率）—— 8分
    rg  = (info.get("revenueGrowth")    or 0) * 100
    opm = (info.get("operatingMargins") or 0) * 100
    r40 = rg + opm
    if r40 >= 60:
        score += 8; green.append(f"Rule of 40 = {r40:.0f}（硬件公司极难达到，护城河强）")
    elif r40 >= 40:
        score += 6; green.append(f"Rule of 40 = {r40:.0f}（达标）")
    elif r40 >= 20:
        score += 3
    else:
        red.append(f"Rule of 40 = {r40:.0f}（成长与盈利均不足）")

    return min(score, 25), green, red


# ──────────────────────────────────────────────
# D4（AI 硬件类专属）：管理层与资本配置（15分）
# PE 收购后内部人持股天然偏低，不应惩罚
# ──────────────────────────────────────────────
def score_d4_ai_hardware(info: dict) -> tuple[float, list, list]:
    green, red = [], []
    score = 0.0

    # 内部人持股：硬件公司多为 PE 收购或整合后，门槛降低
    insider = info.get("heldPercentInsiders") or 0
    if insider >= 0.10:
        score += 6; green.append(f"内部人持股 {insider*100:.1f}%（硬件类创始人绑定）")
    elif insider >= 0.03:
        score += 4; green.append(f"内部人持股 {insider*100:.1f}%（尚可）")
    elif insider >= 0.01:
        score += 2
    else:
        # PE 收购型公司无大股东是正常现象，给中性分而非红旗
        score += 2
        green.append("内部人持股极低（PE/整合背景，正常现象）")

    # 机构持股（验证聪明钱布局）—— 5分
    inst = info.get("heldPercentInstitutions") or 0
    if 0.50 <= inst <= 0.90:
        score += 5; green.append(f"机构持股 {inst*100:.1f}%（充分认可）")
    elif inst > 0.90:
        score += 3; red.append(f"机构持股 {inst*100:.1f}%（过度拥挤）")
    elif inst < 0.30:
        score += 4; green.append(f"机构持股 {inst*100:.1f}%（尚未被充分发掘）")

    # 股票回购 —— 4分
    try:
        cf = yf.Ticker(info.get("symbol", "")).cashflow
        if cf is not None and not cf.empty:
            for key in ["Repurchase Of Capital Stock", "Common Stock Repurchased"]:
                if key in cf.index:
                    buyback = cf.loc[key].iloc[0]
                    if buyback and buyback < -1e8:
                        score += 4
                        green.append("有股票回购记录（管理层认为估值合理）")
                    break
    except Exception:
        pass

    return min(score, 15), green, red


def risk_penalty(info: dict) -> tuple[float, list]:
    """
    独立风险扣分层（0 ~ -15 分）
    超出红旗文字提示，实质影响总分和排名。
    只计算 yfinance 可量化的信号；审计师更换/SEC 调查等软信号需人工判断。

    扣分项：
      空头比例过高   -2 ~ -5    （市场强烈看衰，护城河被怀疑）
      SBC 稀释严重   -1 ~ -3    （股权激励占营收 >10%/20%）
      现金 runway短  -2 ~ -4    （亏损公司现金不足 18/36 个月）
      营收萎缩+高PS  -3         （叙事已破裂但估值未收缩）
    """
    penalty = 0.0
    flags: list[str] = []

    # ── 1. 空头比例 ──────────────────────────────────────────────────────────
    short_pct = info.get("shortPercentOfFloat") or 0
    if short_pct > 0.25:
        penalty -= 5
        flags.append(f"空头比例 {short_pct*100:.1f}%（极高，市场强烈做空）")
    elif short_pct > 0.15:
        penalty -= 3
        flags.append(f"空头比例 {short_pct*100:.1f}%（偏高，护城河受质疑）")
    elif short_pct > 0.10:
        penalty -= 1

    # ── 2. SBC 稀释风险 ───────────────────────────────────────────────────────
    fin = info.get("_financials")
    if fin is not None and not fin.empty:
        try:
            rv = fin.loc["Total Revenue"].dropna() if "Total Revenue" in fin.index else None
            if rv is not None and len(rv) >= 1 and rv.iloc[0] > 0:
                for key in ["Stock Based Compensation", "Share Based Compensation"]:
                    if key in fin.index:
                        sbc = abs(fin.loc[key].dropna().iloc[0])
                        ratio = sbc / rv.iloc[0]
                        if ratio > 0.20:
                            penalty -= 3
                            flags.append(f"SBC/营收 {ratio*100:.1f}%（过度稀释，损害股东价值）")
                        elif ratio > 0.10:
                            penalty -= 1
                            flags.append(f"SBC/营收 {ratio*100:.1f}%（稀释值得关注）")
                        break
        except Exception:
            pass

    # ── 3. 现金 runway（仅针对 FCF 为负的公司）──────────────────────────────
    fcf  = info.get("freeCashflow")  or 0
    cash = info.get("totalCash")     or 0
    if fcf < 0 and cash > 0:
        burn_per_year  = abs(fcf)
        runway_years   = cash / burn_per_year
        if runway_years < 1.5:
            penalty -= 4
            flags.append(f"现金 runway {runway_years:.1f}年（危险，随时面临稀释融资）")
        elif runway_years < 3.0:
            penalty -= 2
            flags.append(f"现金 runway {runway_years:.1f}年（偏短，关注融资动态）")

    # ── 4. 营收萎缩 + 高估值 = 叙事已破裂 ────────────────────────────────────
    rg = info.get("revenueGrowth") or 0
    ps = info.get("priceToSalesTrailing12Months") or 0
    if rg < -0.10 and ps > 5:
        penalty -= 3
        flags.append(f"营收萎缩 {rg*100:.0f}% + PS {ps:.1f}x（成长叙事破裂但估值未收缩）")

    return max(penalty, -15.0), flags   # 总扣分上限 -15


# ──────────────────────────────────────────────
# 硬性前置过滤（不达标直接排除）
# ──────────────────────────────────────────────
def hard_filter(info: dict) -> tuple[bool, str]:
    gm  = info.get("grossMargins") or 0
    mkt = info.get("marketCap") or 0

    if mkt > HARD_FILTERS["max_market_cap"]:
        return False, f"市值 ${mkt/1e9:.0f}B 超过上限，成长空间受限"
    if 0 < mkt < HARD_FILTERS["min_market_cap"]:
        return False, f"市值 ${mkt/1e9:.1f}B 过小，流动性风险"

    # 金融类：豁免毛利率，改用净利润率 + 营收增速双重门槛
    if is_financial(info):
        net_margin = info.get("profitMargins") or 0
        rev_growth = info.get("revenueGrowth") or 0
        if net_margin < HARD_FILTERS["fin_min_net_margin"] and net_margin != 0:
            return False, (f"[金融类] 净利润率 {net_margin*100:.1f}% < 5%"
                           f"（盈利能力不足，排除）")
        if rev_growth < HARD_FILTERS["fin_min_rev_growth"] and rev_growth != 0:
            return False, (f"[金融类] 营收增速 {rev_growth*100:.1f}% < 15%"
                           f"（成长动能不足，排除）")
        return True, ""

    # AI 硬件类：豁免 30% 毛利率，改用 8% 底线 + 增速 > 10%
    if is_ai_hardware(info):
        if gm > 0 and gm < 0.08:
            return False, (f"[AI硬件类] 毛利率 {gm*100:.1f}% < 8%"
                           f"（纯代工无附加值，排除）")
        return True, ""

    # 非金融、非硬件：毛利率过滤
    # 注意：gm = 0 表示数据缺失（yfinance无值），不过滤
    #       gm < 0 表示亏本卖产品（RIVN/-46%等），直接排除
    #       0 < gm < 30% 表示代工/硬件商，无规模杠杆，排除
    if gm < 0:
        return False, f"毛利率 {gm*100:.1f}%（负毛利，产品本身亏损，排除）"
    if 0 < gm < HARD_FILTERS["min_gross_margin"]:
        return False, f"毛利率 {gm*100:.1f}% < 30%（代工/服务商模式，无规模杠杆，排除）"

    return True, ""


# ──────────────────────────────────────────────
# 主评估函数
# ──────────────────────────────────────────────
def evaluate(ticker: str) -> Score:
    print(f"\n正在获取 {ticker} 数据...")
    info = fetch(ticker)
    if not info:
        print(f"  无法获取 {ticker} 数据")
        return Score(), {}

    # 硬性过滤
    passed, reason = hard_filter(info)
    if not passed:
        name = info.get("longName") or ticker
        mkt  = info.get("marketCap", 0) / 1e9
        print(f"  [{ticker}] 硬性过滤排除 —— {reason}")
        s = Score()
        s.red_flags = [reason]
        return s, info

    s = Score()
    if is_financial(info):
        s.d1_ceiling,  g1, r1 = score_d1(info)
        s.d2_leverage, g2, r2 = score_d2_financial(info)
        s.d3_moat,     g3, r3 = score_d3(info)
        s.d4_mgmt,     g4, r4 = score_d4(info)
    elif is_ai_hardware(info):
        s.d1_ceiling,  g1, r1 = score_d1(info)
        s.d2_leverage, g2, r2 = score_d2_ai_hardware(info)
        s.d3_moat,     g3, r3 = score_d3(info)
        s.d4_mgmt,     g4, r4 = score_d4_ai_hardware(info)
    else:
        s.d1_ceiling,  g1, r1 = score_d1(info)
        s.d2_leverage, g2, r2 = score_d2(info)
        s.d3_moat,     g3, r3 = score_d3(info)
        s.d4_mgmt,     g4, r4 = score_d4(info)
    s.d5_valuation, g5, r5 = score_d5(info)

    # ── 风险扣分层（独立于 D1~D5，最多扣 15 分）────────────────────────────
    s.risk_penalty, risk_flags = risk_penalty(info)

    s.green_flags = g1 + g2 + g3 + g4 + g5
    s.red_flags   = r1 + r2 + r3 + r4 + r5 + risk_flags

    return s, info


def print_report(ticker: str, s: Score, info: dict):
    mkt = info.get("marketCap", 0) / 1e9
    price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
    name  = info.get("longName") or ticker

    print("\n" + "═" * 58)
    print(f"  {name} ({ticker})")
    print(f"  市值: ${mkt:.1f}B    现价: ${price:.2f}")
    print("═" * 58)

    print(f"\n{'维度':<22} {'得分':>6}  {'满分':>4}")
    print(f"  {'─'*40}")
    dims = [
        ("D1  收入天花板",   s.d1_ceiling,   25),
        ("D2  商业模式杠杆", s.d2_leverage,  25),
        ("D3  护城河方向",   s.d3_moat,      20),
        ("D4  管理层配置",   s.d4_mgmt,      15),
        ("D5  估值重估空间", s.d5_valuation, 15),
    ]
    for name_d, val, mx in dims:
        bar = "█" * int(val / mx * 12)
        print(f"  {name_d:<20} {val:>5.1f}  /{mx:>2}   {bar}")
    if s.risk_penalty < 0:
        print(f"  {'风险扣分':<20} {s.risk_penalty:>5.1f}  ( max -15 )")
    print(f"  {'─'*40}")
    print(f"  {'综合总分':<20} {s.total:>5.1f}  /100")
    print(f"\n  评级：{s.grade()}")

    if s.green_flags:
        print("\n[+] 亮点")
        for g in s.green_flags:
            print(f"   * {g}")

    if s.red_flags:
        print("\n[!] 风险点")
        for r in s.red_flags:
            print(f"   * {r}")

    print("\n" + "═" * 58)


# ──────────────────────────────────────────────
# 多股对比
# ──────────────────────────────────────────────
def compare(tickers: list):
    rows = []
    for t in tickers:
        s, info = evaluate(t)
        if info:
            rows.append({
                "Ticker": t,
                "市值$B":  round(info.get("marketCap", 0) / 1e9, 1),
                "D1收入":  s.d1_ceiling,
                "D2杠杆":  s.d2_leverage,
                "D3护城河": s.d3_moat,
                "D4管理层": s.d4_mgmt,
                "D5估值":  s.d5_valuation,
                "总分":    s.total,
                "评级":    s.grade().split("  ")[1],
            })
            print_report(t, s, info)

    if len(rows) > 1:
        print("\n" + "═" * 58)
        print("  对比汇总")
        print("═" * 58)
        df = pd.DataFrame(rows).sort_values("总分", ascending=False)
        print(df.to_string(index=False))


# ──────────────────────────────────────────────
# 入口
# ──────────────────────────────────────────────
if __name__ == "__main__":
    tickers = sys.argv[1:] if len(sys.argv) > 1 else ["HIMS"]
    if len(tickers) == 1:
        s, info = evaluate(tickers[0])
        if info:
            print_report(tickers[0], s, info)
    else:
        compare(tickers)

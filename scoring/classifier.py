"""
公司分档器：市值档 + 行业分类。
不同档位的公司用不同的评分权重和阈值。

市值档（USD 等值）：
    mega   ≥ $200B    NVDA / AAPL / MSFT / TSM
    large  $50B-200B  AMD / MU / AVGO
    mid    $5B-50B    ALAB / CRDO / LITE
    small  < $5B      RCAT / OKLO / Lasertec...
    micro  < $500M    (一般跳过)

行业分类（适配评分权重 + 容忍度）：
    saas_software   高毛利 + Rule of 40
    semiconductor   周期 + 毛利波动大
    semi_equipment  ASML/AMAT/LRCX 一类
    memory_cyclical MU/SK/三星 强周期
    networking      AVGO/ANET 网络硬件
    optical         LITE/COHR 光通信
    capital_goods   GEV/ETN/VRT 重型机械配电
    utility_power   CEG/VST 公用电力
    materials       BESI/Linde 设备材料
    consumer        TSLA/AAPL
    cloud           MSFT/AMZN/GOOG/META
    fintech_payment STRIPE 等
    biotech         药企
    reit_dc         EQIX/DLR 数据中心 REIT
    energy_oil      传统能源
    aerospace       RCAT/AVAV/PLTR 国防 AI
    auto_ev         TSLA/NIO/Rivian
    industrial      通用工业
    other           其他
"""

from typing import Optional


# ── 市值档划分（USD 等值）─────────────────────────────────
def classify_tier(market_cap_usd: float) -> str:
    if not market_cap_usd or market_cap_usd <= 0:
        return "unknown"
    if market_cap_usd >= 200e9:
        return "mega"
    if market_cap_usd >= 50e9:
        return "large"
    if market_cap_usd >= 5e9:
        return "mid"
    if market_cap_usd >= 5e8:
        return "small"
    return "micro"


# ── 行业关键词映射 ────────────────────────────────────────
SECTOR_KEYWORDS = {
    "saas_software": [
        "Software—Application", "Software—Infrastructure",
        "SaaS", "cloud software", "应用软件",
    ],
    "semiconductor": [
        "Semiconductors", "Semiconductor", "Integrated Circuits", "半导体",
    ],
    "semi_equipment": [
        "Semiconductor Equipment", "Semiconductor Equipment & Materials",
        # 注意：不放 "Specialty Industrial Machinery"，避免与 capital_goods 撞车（SIEGY/CAT）
    ],
    "memory_cyclical": [
        # 单独识别 MU / SK Hynix / Samsung，先用 ticker 兜底
    ],
    "networking": [
        "Communication Equipment", "Networking",
    ],
    "optical": [
        "Communication Equipment", "Photonic",
    ],
    "capital_goods": [
        "Industrial", "Heavy Industrial", "Engineering & Construction",
        "Industrial Power", "Specialty Industrial Machinery",
        "Building Products", "Construction",
    ],
    "utility_power": [
        "Utilities", "Electricity", "Power",
        "Utilities—Renewable", "Utilities—Diversified", "Utilities—Regulated Electric",
    ],
    "materials": [
        "Chemicals", "Specialty Chemicals", "Materials",
        "Industrial Gases", "Industrial Materials",
    ],
    "consumer": [
        "Consumer", "Auto Manufacturers", "Specialty Retail",
        "Discount Stores", "Internet Retail",
    ],
    "cloud": [
        "Internet Content", "Cloud Services",
    ],
    "fintech_payment": [
        "Credit Services", "Capital Markets", "Financial Data",
    ],
    "biotech": [
        "Biotechnology", "Drug Manufacturers", "Pharma", "Pharmaceutical",
    ],
    "reit_dc": [
        "REIT—Specialty", "REIT—Diversified",
    ],
    "energy_oil": [
        "Oil & Gas", "Coal", "Pipeline",
    ],
    "aerospace": [
        "Aerospace", "Defense", "Aircraft",
    ],
    "auto_ev": [
        "Auto Manufacturers", "EV",
    ],
    "industrial": [
        "Industrial", "Machinery", "Engineering",
    ],
    "financial_bank": [
        "Banks", "Insurance", "Reinsurance",
    ],
}

# ── ticker 兜底硬编码（行业关键词识别不准的情况）───────────
TICKER_OVERRIDES = {
    # Memory cyclical
    "MU": "memory_cyclical", "000660.KS": "memory_cyclical",
    "005930.KS": "memory_cyclical", "STX": "memory_cyclical",
    "WDC": "memory_cyclical", "SNDK": "memory_cyclical",
    # Semi equipment
    "ASML": "semi_equipment", "AMAT": "semi_equipment", "LRCX": "semi_equipment",
    "KLAC": "semi_equipment", "ONTO": "semi_equipment", "CAMT": "semi_equipment",
    "BESI.AS": "semi_equipment", "ASM.AS": "semi_equipment",
    "8035.T": "semi_equipment", "TOELY": "semi_equipment",
    "6857.T": "semi_equipment", "6920.T": "semi_equipment", "TER": "semi_equipment",
    # Optical
    "LITE": "optical", "COHR": "optical", "POET": "optical",
    "IPGP": "optical", "GLW": "optical",
    # Networking + interconnect
    "ALAB": "networking", "CRDO": "networking", "MRVL": "networking",
    "AVGO": "networking", "ANET": "networking", "CSCO": "networking",
    "JNPR": "networking",
    # Capital goods / Power
    "VRT": "capital_goods", "ETN": "capital_goods", "GEV": "capital_goods",
    "MOD": "capital_goods", "HUBB": "capital_goods", "DOV": "capital_goods",
    "PH": "capital_goods", "PWR": "capital_goods", "MTZ": "capital_goods",
    "POWL": "capital_goods", "IESC": "capital_goods",
    # Utility / Nuclear
    "CEG": "utility_power", "VST": "utility_power", "TLN": "utility_power",
    "OKLO": "utility_power", "SMR": "utility_power", "NNE": "utility_power",
    "BWXT": "utility_power", "LEU": "utility_power",
    # Uranium miners → materials/energy
    "CCJ": "energy_oil", "UEC": "energy_oil",
    # Cloud / Internet
    "MSFT": "cloud", "GOOGL": "cloud", "AMZN": "cloud", "META": "cloud",
    "ORCL": "cloud", "BABA": "cloud", "9988.HK": "cloud",
    # DC REIT
    "EQIX": "reit_dc", "DLR": "reit_dc", "AMT": "reit_dc", "IRM": "reit_dc",
    # GPU/CPU
    "NVDA": "semiconductor", "AMD": "semiconductor", "INTC": "semiconductor",
    "QCOM": "semiconductor", "ARM": "semiconductor", "AAPL": "consumer",
    "TSM": "semiconductor",
    # Foundry / packaging
    "ASX": "semiconductor", "AMKR": "semiconductor", "UMC": "semiconductor",
    "GFS": "semiconductor",
    # Servers / ODM
    "SMCI": "industrial", "DELL": "industrial", "HPE": "industrial",
    "CLS": "industrial",
    # Aerospace / Defense / AI
    "RCAT": "aerospace", "AVAV": "aerospace", "KTOS": "aerospace",
    "PLTR": "aerospace",
    # EV / Robotics
    "TSLA": "auto_ev",
    # Materials / chemicals / specialty
    "MMM": "materials", "CC": "materials", "LIN": "materials", "APD": "materials",
    "CCMP": "materials",
    # Storage software
    "PSTG": "saas_software", "NTAP": "saas_software",
    # EDA
    "SNPS": "saas_software", "CDNS": "saas_software",
    # AI Software
    "NOW": "saas_software", "CRM": "saas_software", "ADBE": "saas_software",
    "AI": "saas_software", "NET": "saas_software", "FSLY": "saas_software",
    "AKAM": "saas_software",
    # Light / sensor
    "STM": "semiconductor",
    # Quantum
    "IONQ": "semiconductor", "RGTI": "semiconductor", "QBTS": "semiconductor",
    "QUBT": "semiconductor", "IBM": "industrial",
    # Power IC / SiC
    "MPWR": "semiconductor", "NVT": "semiconductor", "WOLF": "semiconductor",
    "ON": "semiconductor",
    # Storage controllers
    "SIMO": "semiconductor", "MTSI": "semiconductor",
    "SMTC": "semiconductor",
    # Battery / Energy storage
    "FLNC": "capital_goods", "STEM": "saas_software", "ENPH": "industrial",
    # Optical/connector small caps
    "AEVA": "auto_ev", "LAZR": "auto_ev", "MBLY": "auto_ev", "AMBA": "semiconductor",
    "HSAI": "auto_ev",
    # IP / SerDes
    "RMBX": "semiconductor", "AWE.L": "semiconductor", "ALAB": "networking",
    # Lasers
    "LASR": "optical",
    # Industrial cooling
    "CARR": "industrial", "JCI": "industrial", "TT": "industrial", "LII": "industrial",
    # 2026-06-03 新增 OVERRIDES：修复批跑发现的误归类
    "SIEGY": "capital_goods",    # 西门子能源（被误归 semi_equipment）
    "DASTY": "saas_software",    # 达索（PLM/CAD 软件）
    "PTC": "saas_software",      # PTC（CAD/IoT 软件）
    "CAT": "capital_goods",      # 卡特彼勒
    "CMI": "capital_goods",      # 康明斯
    "NGG": "utility_power",      # National Grid
    "IFNNY": "semiconductor",    # 英飞凌
    "NVTS": "semiconductor",     # Navitas（注意 NVT 是 nVent）
    "NVT": "capital_goods",      # nVent Electric
    "TXN": "semiconductor", "ADI": "semiconductor", "MCHP": "semiconductor",
    "POWI": "semiconductor", "VICR": "semiconductor", "AOSL": "semiconductor",
    "ACLS": "semi_equipment",    # Axcelis 离子注入设备
    "APH": "industrial",         # Amphenol 连接器
    "TEL": "industrial",         # TE Connectivity
    "FLEX": "industrial",        # Flex Ltd
    "MEI": "industrial",         # Methode Electronics
    "AAOI": "optical", "FN": "optical", "NOK": "optical",
    "AEHR": "semi_equipment", "FORM": "semi_equipment", "COHU": "semi_equipment",
    "KLIC": "semi_equipment", "TTMI": "industrial",
    "LNVGY": "industrial", "ASUUY": "industrial",
    "2376.TW": "industrial", "4938.TW": "industrial",
    "2308.TW": "industrial",     # 台达电
    # Serenity 概念股
    "AXTI": "semiconductor",     # InP/GaAs 衬底
    "XFAB": "semiconductor",     # X-Fab 代工
    "RPI.L": "semiconductor",    # Raspberry Pi
    "EWY": "other",              # ETF，会拿 no_data 但归类清晰
    "SIVE": "semiconductor",     # Sivers IMA
}


def classify_sector(ticker: str, yfinance_industry: Optional[str] = None,
                    yfinance_sector: Optional[str] = None) -> str:
    """优先使用 ticker 硬编码，否则按 yfinance industry/sector 关键词匹配"""
    if ticker in TICKER_OVERRIDES:
        return TICKER_OVERRIDES[ticker]

    text = f"{yfinance_industry or ''} {yfinance_sector or ''}".lower()
    for sector, keywords in SECTOR_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text:
                return sector

    # Sector 兜底
    if "Financial" in text or "financial" in text:
        return "financial_bank"
    if "energy" in text:
        return "energy_oil"
    if "health" in text or "biotech" in text:
        return "biotech"
    return "other"


# ── 不同 tier × sector 的评分权重表 ────────────────────────
# 总和必须 = 100
# 大盘成熟公司：G1 减权，G5/G6 加权（看股东回报 + 估值合理）
# 小盘成长：G1/G4 加权，G5 减权
# 周期股：G6 加权（估值看周期位置）
# 公用事业：G5 加权（分红股性）
WEIGHTS = {
    # tier:        [G1, G2, G3, G4, G5, G6]
    "mega":         [15, 22, 15, 22, 12, 14],
    "large":        [18, 22, 15, 20, 10, 15],
    "mid":          [22, 20, 15, 20,  8, 15],
    "small":        [24, 18, 14, 22,  6, 16],
    "micro":        [25, 18, 13, 22,  6, 16],
    "unknown":      [20, 20, 15, 20, 10, 15],   # 默认
}

# 行业修正（在 tier 权重上加减）
SECTOR_ADJUSTMENTS = {
    "memory_cyclical": [-3, +3, 0, 0, 0, 0],     # 周期股看盈利能力 vs 增长
    "utility_power":   [-5, 0, 0, 0, +5, 0],     # 公用事业看分红
    "reit_dc":         [-5, +2, +5, 0, +3, 0],   # REIT 高杠杆是行业属性，G3 加分回补
    "biotech":         [+5, -3, 0, +3, -3, -2],  # 生科看天花板 + 创始人
    "energy_oil":      [-5, +3, 0, 0, +2, 0],
    "saas_software":   [+3, -2, 0, 0, -3, +2],
    "financial_bank":  [-3, 0, +3, 0, 0, 0],
}


def get_weights(tier: str, sector: str) -> list:
    """返回 [G1..G6] 的权重，已综合 tier + sector"""
    base = WEIGHTS.get(tier, WEIGHTS["unknown"]).copy()
    adj = SECTOR_ADJUSTMENTS.get(sector, [0]*6)
    weights = [b + a for b, a in zip(base, adj)]
    # 归一化到 100（应对调整后总和≠100 的情况）
    total = sum(weights)
    if total != 100:
        weights = [round(w * 100 / total, 1) for w in weights]
    return weights


if __name__ == "__main__":
    # 自测
    for cap in [3e12, 1e11, 2e10, 2e9, 3e8]:
        print(f"  ${cap/1e9:.1f}B → {classify_tier(cap)}")
    print()
    for t in ["NVDA", "MU", "ALAB", "OKLO", "EQIX", "BESI.AS"]:
        s = classify_sector(t)
        w = get_weights("mid", s)
        print(f"  {t:10s} sector={s:18s} weights={w}")

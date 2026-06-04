"""
比对 Serenity 250 池 vs 我们图谱的覆盖情况。
输出：
- 图谱已收录了哪些
- 图谱缺哪些
- 缺的可以归到产业链哪一层（建议）
"""
import json
import re
from pathlib import Path
from collections import defaultdict

POOL_FILE  = Path(__file__).parent / "serenity_pool.json"
GRAPH_FILE = Path(__file__).parent / "graph.html"


def extract_graph_tickers():
    """从 graph.html 抽出所有 ticker"""
    html = GRAPH_FILE.read_text(encoding="utf-8")
    pattern = r"\{\s*t:\s*['\"]([^'\"]+)['\"]"
    return set(re.findall(pattern, html))


# 缺失股票的产业链归属建议（人工映射）
SUGGESTED_LAYER = {
    # 数据/云/互联网
    "RDDT": "⑩ 数据中心 / 应用层",
    "HIMS": "(不属于AI产业链，医疗)",
    "HOOD": "(金融/券商，非AI主链)",
    "PYPL": "(支付，非AI)",
    "IBKR": "(券商)",
    "UBER": "(打车/外卖)",
    "MSTR": "(比特币持仓代理)",
    "COIN": "(加密交易所)",

    # 卫星/航天/通信
    "ASTS": "🆕 卫星互联网（值得加，IoT/低轨网）",
    "RKLB": "🆕 火箭发射服务",
    "SATL": "🆕 卫星情报",
    "BKSY": "🆕 卫星情报",
    "LUNR": "🆕 月球任务",
    "RDW": "🆕 太空硬件",
    "SPCE": "🆕 太空旅游",
    "VSAT": "🆕 卫星宽带",
    "GILT": "🆕 卫星地面站",
    "IRDM": "🆕 卫星通信",  # (检查是否在)

    # 加密/矿企（与AI算力转型相关）
    "IREN": "L10b Neocloud (矿转 AI 算力)",
    "WULF": "L10b Neocloud (已有)",
    "HUT":  "L10b Neocloud",
    "RIOT": "L10b 矿企",
    "MARA": "L10b 矿企",
    "CIFR": "L10b Neocloud (已有)",
    "BITF": "L10b 矿企",
    "CLSK": "L10b 矿企",
    "HIVE": "L10b 矿企",
    "BMNR": "L10b 矿企",
    "CORZ": "L10b 矿企",
    "GLXY": "L10b 矿企",

    # 自动驾驶/机器人
    "AUR":  "L11 自动驾驶卡车",
    "AEVA": "L11e 视觉 (已有)",
    "MBLY": "L11e 视觉 (已有)",
    "OUST": "🆕 LiDAR（车载/工业）",
    "SYM":  "🆕 仓储机器人 Symbotic",
    "BZAI": "🆕 工业 AI",
    "NRGV": "(能源储能)",

    # 量子计算
    "QBTS": "L1f 量子 (已有)",
    "IONQ": "L1f 量子 (已有)",
    "RGTI": "L1f 量子 (已有)",
    "QUBT": "L1f 量子 (已有)",

    # 国防/无人机
    "AVAV": "L99 国防 (已有)",
    "DPRO": "🆕 无人机配件",
    "AIRO": "🆕 无人机",
    "ONDS": "🆕 国防通信 / 无人机网络",
    "KRKNF": "🆕 海洋机器人",
    "USAR": "🆕 国防 AI",

    # 半导体细分
    "MTSI": "L6 光通信/HBM (已有 MTSI in L5d)",
    "RMBS": "L2c 内存接口 (已有)",
    "TSEM": "L6b 硅光代工 (已有)",
    "VSH":  "L7a2 功率半导体 (已有，本次加)",
    "DIOD": "L7a2 功率半导体 (已有，本次加)",
    "AOSL": "L7a2 (已有)",
    "POWI": "L7a (已有)",
    "VICR": "L7a (已有)",
    "MPWR": "L7a (已有)",
    "NVTS": "L7a2 (已有)",
    "ACMR": "L9b 清洗设备 (已有)",
    "NVMI": "🆕 Nova 量测 (薄膜量测 + 半导体过程控制)",
    "AEIS": "🆕 Advanced Energy 半导体电源 (重要！)",
    "ONTO": "L9d (已有)",
    "FORM": "L9d (已有)",
    "TER":  "L9d (已有)",
    "CAMT": "L9d (已有)",
    "AEHR": "L7a3 (已有)",
    "ACLS": "L7a3 (已有)",
    "MKSI": "🆕 MKS Instruments 真空/激光 (重要)",
    "VECO": "🆕 Veeco 沉积设备",
    "AMAT": "L9b (已有)",
    "KLAC": "L9d (已有)",
    "LRCX": "L9c (已有)",
    "ASML": "L9a (已有)",
    "ACLS": "L7a3 (已有)",

    # 光通信 / 光子学
    "POET": "L6b CPO (已有)",
    "AAOI": "L6a (已有)",
    "LITE": "L6d CW 激光 (已有)",
    "COHR": "L6d/L6 (已有)",
    "FN":   "L6a (已有)",
    "CIEN": "L6a (已有)",
    "NOK":  "L6a (已有)",
    "LASR": "🆕 nLight 激光器",
    "LWLG": "🆕 Lightwave Logic 聚合物电光",
    "IQE":  "🆕 化合物半导体外延片",
    "VIAV": "🆕 网络测试 + 光器件",
    "OSS":  "🆕 OSS One Stop Systems (AI 加速边缘服务器)",
    "SOI":  "(查 ticker 是否是 Solaris / Stoneco)",

    # 数据中心 / 服务器
    "ANET": "L5a (已有)",
    "SMCI": "L5e (已有)",
    "DELL": "L5e (已有)",
    "CLS":  "L5e (已有)",
    "NBIS": "L10b (已有)",
    "CRWV": "L10b (已有)",
    "APLD": "L10b (已有)",
    "ORCL": "L10a (已有)",
    "VRT":  "L7 / L8 (已有)",

    # 互连器件
    "TE":   "L4g (已有 TEL)",
    "VPG":  "🆕 Vishay 精密集团 (传感器/精密电阻)",
    "AMBA": "🆕 Ambarella 视觉 SoC (已有)",
    "AMBQ": "(查 Ambiq Micro 超低功耗 MCU)",
    "INDI": "🆕 Indie Semi 汽车视觉",
    "AMBA": "L1d (已有)",
    "WATT": "🆕 Energous 无线充电",

    # 网络/CDN
    "NET":  "L10e 边缘 (已有)",
    "DDOG": "🆕 Datadog 可观测性",
    "CRWD": "🆕 CrowdStrike 安全",
    "CDNS": "L9f EDA (已有)",
    "AKAM": "L10e (已有)",
    "FN":   "L6a (已有)",
    "TWLO": "(通讯API)",

    # AI 软件/应用
    "PLTR": "L99/L10g (已有)",
    "SOUN": "🆕 SoundHound (语音 AI)",
    "AI":   "L10g (已有)",
    "U":    "🆕 Unity 游戏引擎/数字孪生",
    "PDFS": "🆕 PDF Solutions 半导体数据分析",
    "LGN":  "(查 Logan / Ligand)",
    "BZAI": "🆕 BlueZebra",

    # 核电/能源
    "OKLO": "L7b SMR (已有)",
    "NNE":  "L7b SMR (已有)",
    "SMR":  "L7b SMR (已有)",
    "NPWR": "(查)",
    "FLNC": "L7e 储能 (已有)",
    "EOSE": "🆕 EOS Energy 锌液流电池",
    "STEM": "L7e (已有)",
    "WTI":  "(W&T Offshore 海上油气，与AI关系弱)",
    "CVX":  "(石油，与AI关系弱)",

    # 材料/稀土
    "MP":   "🆕 MP Materials 稀土",
    "LAC":  "🆕 锂矿 Lithium Americas",
    "ALB":  "🆕 锂矿 Albemarle",
    "ATEYY":"🆕 Advantest (我们 6857.T 已有)",
    "AXTI": "(已有 in LS)",

    # 其他主题（可能与AI关系不大）
    "TSLA": "L1d / L11a (已有)",
    "NVO":  "(诺和诺德，糖尿病)",
    "UNH":  "(医保)",
    "BYND": "(植物肉)",
    "DKNG": "(博彩)",
    "AMC":  "(影院)",
    "SPCE": "(太空)",
    "ETH":  "(加密币本币)",
    "BTC":  "(加密币本币)",
    "USDC": "(稳定币)",
    "IBIT": "(BTC ETF)",
    "SPY":  "(SP500 ETF)",
    "EWY":  "(已有 韩国 ETF)",
    "XLU":  "(公用事业 ETF)",
    "FRMI": "(查)",

    # 待识别
    "YSS":  "(查 YS Industries 或 Yatra)",
    "WYFI": "(可能 WiFi 相关)",
    "OPTX": "(查 Syntec Optics)",
    "AIXXF":"(查)",
    "EONR": "(EON Resources 能源)",
    "EOPSF": "(查)",
    "EXALF": "(查)",
    "FEIM": "🆕 Frequency Electronics (精密时钟，定位 + 国防)",
    "FLKR": "(查)",
    "FPLSF": "(查)",
    "GHM":  "(Graham Corp 国防泵阀)",
    "GILT": "🆕 Gilat 卫星地面站",
    "POWL": "L7d HVDC (已有)",
    "SHMD": "(查)",
    "SILC": "(查)",
    "SMTOY": "(住友化学)",
    "UMC":  "L3b 中介层 (已有)",
    "UPWK": "(零工平台)",
    "UURAF": "(铀矿小盘)",
    "VLN":  "(Valens Semi 互连)",
    "WLAC": "(查)",
    "BIRD": "(查)",
    "INFQ": "(查)",
    "KULR": "🆕 KULR 热管理 (电池热管理 / SMR 配套)",
    "NMAX": "(查 Newsmax)",
    "ALNT": "🆕 Allient (电机 + 电子)",
    "INTT": "🆕 Inntron 半导体测试",
    "MTRN": "🆕 Materion 先进材料 (半导体)",
    "NEXT": "🆕 NextDecade LNG",
    "SNAP": "(社交)",
    "DSCSY":"(查)",
    "GDRZF":"(查)",
    "GPUS": "🆕 Hyperscale Data (GPU 云？)",
    "LSCC": "🆕 Lattice Semi (FPGA 小型)",
    "PLPC": "🆕 Preformed Line Products (电力线缆)",
    "SANM": "🆕 Sanmina (EMS 制造)",
    "STM":  "L7a2 (已有)",
    "BAM":  "(Brookfield Asset Mgmt)",
    "JBL":  "🆕 Jabil EMS",
    "PL":   "🆕 Planet Labs 卫星",
    "CPSH": "(查 CPS Tech)",
    "HIMX": "🆕 Himax 显示驱动",
    "SIMO": "L2f (已有)",
    "TTMI": "L3d (已有)",
    "ALMU": "(查)",
    "AMSC": "🆕 American Superconductor (超导电力)",
    "CRML": "(查 Critical Metals)",
    "ENAFF": "(查)",
    "HGRAF": "(查)",
    "KORU": "(查)",
    "LPTH": "🆕 LightPath Tech 光学",
    "SLOIF":"(查)",
    "VICR": "L7a (已有)",
    "ALOY": "(查 Alloy)",
    "BKSY": "(已上有)",
    "CAR":  "(Avis 租车)",
    "HPP":  "(Hudson Pacific 写字楼 REIT)",
    "INV":  "(查)",
    "OSCR": "(医保)",
    "SEI":  "(投资管理)",
    "SIDU": "(查 Sidus Space)",
    "VELO": "(查)",
    "VSH":  "(已有)",
    "LPK":  "(查)",
    "OPTT": "(海洋能源 OceanPower)",
    "PENG": "(查)",
    "CHGG": "(在线教育)",
    "CSCO": "L5a (已有)",
    "MOD":  "L8 (已有)",
    "SKYT": "🆕 SkyWater 美国本土晶圆代工",
    "SMTC": "L6e DSP (已有)",
    "UUUU": "(铀矿 Energy Fuels)",
    "WATT": "(已上)",
    "FN":   "(已有)",
    "XFAB": "(已有 in LS)",
    "BKKT": "(加密支付)",
    "NAKA": "(查)",
    "FIX":  "🆕 Comfort Systems USA (HVAC + 数据中心电气)",
    "MTRN": "(已上)",
    "AURG": "(查)",
    "ENPH": "L7e (已有)",
}


def main():
    pool = json.load(open(POOL_FILE, encoding="utf-8"))["pool"]
    graph_tickers = extract_graph_tickers()

    in_graph = set(pool.keys()) & graph_tickers
    missing = set(pool.keys()) - graph_tickers

    # 按 Serenity rank 排序缺失股票
    missing_sorted = sorted(missing, key=lambda t: pool[t]["rank"])

    print(f"\n═══════ Serenity Pool vs ChainGraph 覆盖审计 ═══════")
    print(f"Serenity 池总数:    {len(pool)}")
    print(f"图谱已有覆盖:       {len(in_graph)} ({len(in_graph)*100//len(pool)}%)")
    print(f"缺失（待评估）:     {len(missing)}")

    print(f"\n═══════ 缺失股票清单（按 Serenity 排名） ═══════")
    for t in missing_sorted:
        info = pool[t]
        suggested = SUGGESTED_LAYER.get(t, "❓ 待人工分类")
        marker = ""
        if suggested.startswith("🆕"):
            marker = " ⭐"
        elif "(" in suggested and ")" in suggested:
            marker = " 🚫"
        print(f"  #{info['rank']:3} {t:8} → {suggested}{marker}")


if __name__ == "__main__":
    import sys
    try: sys.stdout.reconfigure(encoding="utf-8")
    except: pass
    main()

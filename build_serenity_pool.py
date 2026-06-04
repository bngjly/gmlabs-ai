"""
从 analysissite.vercel.app/stocks 抓取的数据生成 serenity_pool.json

数据语义澄清：
- 这份名单是 Serenity（专业 AI 研究员）公开提及/讨论过的 250 只票
- 但 score / queue / sentiment 都是 analysissite 的爬虫模型对推文的算法解读
  - score: 提及频率 + 时序加权（analysissite 算法，非 Serenity 评分）
  - queue: analysissite 用模型分类（高风险偏多 / 积极观察 / 谨慎 / 观察 / 高风险观察）
  - sentiment: analysissite 模型情绪标签（看多/看空/中性）
- ONLY "ticker 在 Serenity 提及名单里" 这件事 = Serenity 的真实信号
- 其他都是第三方解读，仅供参考
"""
import json
from pathlib import Path

# 数据：ticker, queue, view, score
# 从用户提供的截图（5 张）整理：250 只票 by Serenity 分数降序
SERENITY_DATA = """
NVDA	高风险偏多	看多	261
SIVE	高风险偏多	看多	260
LITE	高风险偏多	看多	249
AAOI	高风险偏多	看多	233
IREN	谨慎	看空	213
SNDK	高风险偏多	看多	202
AMD	高风险偏多	看多	196
MRVL	高风险偏多	看多	188
ONDS	高风险观察	中性	173
POET	谨慎	看空	166
HOOD	高风险观察	中性	164
RKLB	高风险偏多	看多	160
AXTI	高风险偏多	看多	159
COHR	观察	中性	157
CRWV	高风险偏多	看多	156
GOOGL	观察	中性	155
INTC	观察	中性	154
TSLA	高风险偏多	看多	152
AMZN	积极观察	看多	151
HIMS	积极观察	看多	151
MSFT	积极观察	看多	149
META	积极观察	看多	146
MSTR	高风险观察	中性	140
MU	高风险偏多	看多	137
NBIS	高风险偏多	看多	136
SMCI	积极观察	看多	131
AAPL	观察	中性	123
TSM	高风险偏多	看多	122
CRDO	高风险观察	中性	116
KLAC	高风险偏多	看多	114
ARM	高风险偏多	看多	110
QBTS	谨慎	看空	106
AVGO	高风险偏多	看多	105
EWY	积极观察	看多	98
ASTS	高风险观察	中性	96
GFS	积极观察	看多	96
RDDT	积极观察	看多	95
OSS	高风险观察	中性	94
GLW	积极观察	看多	93
ORCL	积极观察	看多	92
ASML	高风险观察	中性	91
TSEM	高风险偏多	看多	91
SOI	积极观察	看多	88
STX	高风险偏多	看多	87
YSS	高风险偏多	看多	86
MXL	高风险观察	中性	85
BMNR	谨慎	看空	84
MTSI	高风险偏多	看多	83
NVTS	高风险观察	中性	83
WDC	高风险观察	中性	83
COIN	谨慎	看空	82
MP	高风险观察	中性	82
RIOT	高风险观察	中性	82
RGTI	高风险观察	中性	81
UBER	观察	中性	81
VPG	高风险观察	中性	79
ETH	积极观察	看多	78
CIEN	高风险观察	中性	75
DOCN	高风险偏多	看多	75
TE	高风险偏多	看多	75
ABAT	高风险观察	中性	74
FLNC	高风险观察	中性	74
LUNR	高风险观察	中性	74
PLTR	谨慎	看空	74
CIFR	高风险偏多	看多	73
IBIT	观察	中性	73
IBKR	积极观察	看多	73
OKLO	谨慎	看空	73
AEHR	高风险偏多	看多	71
AMBQ	高风险观察	中性	71
DGXX	高风险观察	中性	71
CVX	积极观察	看多	70
DDOG	高风险观察	中性	70
ASPI	高风险偏多	看多	69
SPCE	高风险观察	未知	69
WULF	高风险偏多	看多	68
ASST	谨慎	看空	67
BITF	高风险观察	中性	67
KRKNF	高风险偏多	看多	67
OUST	高风险观察	中性	67
CLSK	谨慎	看空	66
FLY	高风险观察	中性	66
PYPL	谨慎	看空	66
TER	谨慎	看空	66
ALAB	高风险观察	中性	65
AVAV	谨慎	看多	65
BTC	积极观察	看多	65
LRCX	高风险观察	中性	63
SPRB	高风险观察	中性	63
VSAT	高风险观察	中性	63
ACMR	观察	中性	62
ATEYY	高风险观察	中性	62
CAMT	高风险偏多	看多	62
DPRO	谨慎	看空	62
LYSDY	高风险观察	中性	62
MPWR	高风险偏多	看多	62
NVMI	高风险观察	中性	62
RMBS	高风险偏多	看多	62
UNH	谨慎	看空	62
AMKR	观察	中性	61
LWLG	谨慎	看空	60
HUT	高风险偏多	看多	59
NVO	观察	中性	59
SATL	高风险观察	中性	59
TRT	高风险观察	中性	59
HIVE	高风险观察	中性	58
POWI	积极观察	看多	58
UAMY	高风险观察	中性	58
UMAC	高风险偏多	看多	58
USAR	高风险观察	中性	58
WOLF	高风险观察	中性	58
FORM	积极观察	看多	57
IQE	积极观察	看多	57
LASR	高风险偏多	看多	57
SPY	观察	中性	57
AEVA	高风险偏多	看多	56
ANET	高风险偏多	看多	56
MRAM	高风险偏多	看多	56
BE	高风险观察	中性	55
ON	观察	中性	55
SLNH	谨慎	看空	55
WYFI	高风险偏多	看多	55
AEIS	积极观察	看多	54
CPSH	观察	中性	54
HIMX	谨慎	看空	54
NOK	观察	中性	54
SIMO	高风险偏多	看多	54
TTMI	观察	中性	54
ALMU	谨慎	看空	52
BAM	高风险观察	中性	52
JBL	积极观察	看多	52
PL	高风险观察	中性	52
SOUN	高风险观察	中性	52
AMSC	积极观察	看多	51
CRML	高风险偏多	看多	51
ENAFF	高风险偏多	看多	51
GLXY	高风险偏多	看多	51
HGRAF	高风险观察	中性	51
KORU	谨慎	看空	51
LPTH	高风险偏多	看多	51
ONTO	积极观察	看多	51
SLOIF	高风险偏多	看多	51
USDC	高风险偏多	看多	51
VICR	高风险偏多	看多	51
ACLS	积极观察	看多	50
ALB	观察	中性	50
ALOY	高风险观察	中性	50
AOSL	高风险观察	中性	50
BKSY	谨慎	看空	50
BZAI	高风险偏多	看多	50
CAR	高风险观察	中性	50
HPP	高风险观察	中性	50
INV	高风险观察	中性	50
MKSI	积极观察	看多	50
NRGV	高风险偏多	看多	50
OSCR	观察	中性	50
RDW	高风险观察	中性	50
SEI	观察	中性	50
SIDU	谨慎	看空	50
VELO	谨慎	看空	50
VSH	观察	中性	50
AMAT	观察	中性	48
APLD	高风险观察	中性	48
LPK	积极观察	看多	48
OPTT	高风险观察	中性	48
PENG	观察	中性	48
KLIC	积极观察	看多	47
CHGG	高风险观察	中性	46
CSCO	积极观察	看多	46
IONQ	谨慎	看空	46
LGN	观察	中性	46
MARA	高风险观察	中性	46
MOD	观察	中性	46
SKYT	观察	中性	46
SMTC	积极观察	看多	46
UUUU	高风险观察	中性	46
VIAV	积极观察	看多	46
WATT	高风险偏多	看多	46
WTI	高风险观察	中性	46
FN	积极观察	看多	45
XFAB	积极观察	看多	45
BKKT	谨慎	看空	44
CDNS	高风险偏多	看多	44
CRCL	高风险偏多	看多	44
DELL	观察	中性	44
NAKA	谨慎	看空	44
VRT	观察	中性	44
AMC	谨慎	看空	42
CLS	积极观察	看多	42
CRWD	高风险偏多	看多	42
FIX	观察	中性	42
INTT	观察	中性	42
MTRN	积极观察	看多	42
NEXT	积极观察	看多	42
OPTX	高风险观察	中性	42
SNAP	谨慎	看空	42
VECO	积极观察	看多	42
ASX	积极观察	看多	40
DSCSY	高风险观察	中性	40
GDRZF	积极观察	看多	40
GPUS	高风险观察	中性	40
CORZ	谨慎	看空	39
LSCC	高风险观察	中性	39
PLPC	积极观察	看多	39
RCAT	高风险观察	中性	39
SANM	观察	中性	39
STM	观察	中性	39
AIXXF	积极观察	看多	38
EONR	高风险偏多	看多	38
EOPSF	高风险观察	中性	38
EXALF	积极观察	看多	38
FEIM	积极观察	看多	38
FLKR	积极观察	看多	38
FPLSF	积极观察	看多	38
GHM	观察	中性	38
GILT	观察	中性	38
POWL	观察	中性	38
QCOM	观察	中性	38
SHMD	谨慎	看空	38
SILC	高风险观察	中性	38
SMTOY	观察	中性	38
TWLO	观察	中性	38
UMC	积极观察	看多	38
UPWK	积极观察	看多	38
UURAF	观察	中性	38
VLN	高风险偏多	看多	38
WLAC	积极观察	看多	38
AUR	高风险观察	中性	37
BIRD	谨慎	看空	36
INFQ	高风险偏多	看多	36
KULR	高风险观察	中性	36
NMAX	高风险观察	中性	36
PDFS	积极观察	看多	36
U	高风险观察	中性	36
ALNT	观察	中性	33
AMBA	高风险观察	中性	33
INDI	高风险观察	中性	33
NOVT	观察	中性	33
SYM	高风险观察	中性	33
XLU	谨慎	看空	33
AIRO	高风险偏多	看多	32
AKAM	观察	中性	32
BYND	高风险观察	中性	32
DKNG	谨慎	看空	32
EAF	高风险观察	中性	32
EOSE	高风险观察	中性	32
FRMI	谨慎	看空	32
LAC	积极观察	看多	32
NET	高风险偏多	看多	32
NNE	观察	中性	32
"""

def parse_data():
    pool = {}
    rank = 0
    for line in SERENITY_DATA.strip().split('\n'):
        parts = line.split('\t')
        if len(parts) < 4:
            continue
        rank += 1
        ticker, queue, view, score = parts[0].strip(), parts[1].strip(), parts[2].strip(), parts[3].strip()
        pool[ticker] = {
            "rank": rank,
            "mention_score": int(score),      # analysissite 提及频率算法分（非 Serenity 评分）
            "ai_queue": queue,                # analysissite 模型分类
            "ai_sentiment": view,             # analysissite 模型情绪标签
        }
    return pool


def main():
    pool = parse_data()
    out = {
        "version": "2026-05-28",
        "source": "analysissite.vercel.app/stocks (third-party scraper of Serenity public mentions)",
        "fact_serenity": "ticker 在此名单 = Serenity 公开提及过",
        "fact_third_party": "mention_score / ai_queue / ai_sentiment 都是 analysissite 模型解读，非 Serenity 本人观点",
        "total": len(pool),
        "pool": pool,
    }
    out_path = Path(__file__).parent / "serenity_pool.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"[OK] {len(pool)} tickers -> {out_path}")
    print(f"     Sample: {list(pool.keys())[:5]}")
    # 统计 view 分布
    from collections import Counter
    views = Counter(v['ai_sentiment'] for v in pool.values())
    print(f"     Sentiment dist (analysissite AI): {dict(views)}")
    queues = Counter(v['ai_queue'] for v in pool.values())
    print(f"     Queue dist (analysissite AI):     {dict(queues)}")


if __name__ == "__main__":
    main()

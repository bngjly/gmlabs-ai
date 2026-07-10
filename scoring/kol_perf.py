"""
kol_perf.py — KOL 战绩榜数据层

从 kol_archive/*.json 提取多空信号，按"发推次日开盘价"为基准（无前视），
计算 7/30/90 日模拟收益，聚合出每个 KOL 的战绩，输出 ../kol_perf.json。

规则（方法论页同步维护）：
- 信号 = stance ∈ {bullish, bearish} 且 mentioned_tickers 非空的推文
- 基准价 = 信号日之后第一个交易日的开盘价（可执行价，非推文瞬时价）
- 收益 = 持有至 horizon 最后一个可得收盘价；bearish 取反
- 去重 = 同一 KOL 对同一 ticker 同方向，3 天内只记第一次
- 每条推文最多取前 5 个 ticker
"""
import json
import sys
import glob
import os
from datetime import datetime, timedelta, timezone
from collections import defaultdict

import pandas as pd
import yfinance as yf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE_GLOB = os.path.join(ROOT, 'kol_archive', '*.json')
OUT_PATH = os.path.join(ROOT, 'kol_perf.json')

LOOKBACK_DAYS = 180        # 只统计最近 180 天的信号
DEDUP_DAYS = 3             # 同 KOL+ticker+方向 去重窗口
MAX_TICKERS_PER_TWEET = 5
HORIZONS = [7, 30, 90]     # 自然日

# 加密资产 + 常见口语代码映射到 yfinance 代码（其余 ticker 原样使用）
CRYPTO_MAP = {
    'BTC': 'BTC-USD', 'ETH': 'ETH-USD', 'SOL': 'SOL-USD',
    'ADA': 'ADA-USD', 'DOGE': 'DOGE-USD', 'XRP': 'XRP-USD',
    'TSMC': 'TSM',          # 口语 TSMC → ADR
    'SKHY': '000660.KS',    # SK Hynix
    'XFAB': 'XFAB.PA',      # X-Fab 巴黎
    'SIVE': 'SIVE.ST',      # Sivers 斯德哥尔摩
    'IQE': 'IQE.L',         # IQE 伦敦
    'SOI': 'SOI.PA',        # Soitec 巴黎
}


def load_signals():
    """读归档 → 过滤出信号 → 去重"""
    items = []
    for path in sorted(glob.glob(ARCHIVE_GLOB)):
        items.extend(json.load(open(path, encoding='utf-8')))

    cutoff = (datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)).isoformat()
    seen = {}   # tweet_id 去重（跨分片保险）
    for it in items:
        if it.get('created_at', '') >= cutoff and it.get('tweet_id'):
            seen[it['tweet_id']] = it

    raw = []
    for it in seen.values():
        if it.get('stance') not in ('bullish', 'bearish'):
            continue
        tickers = it.get('mentioned_tickers') or []
        for t in tickers[:MAX_TICKERS_PER_TWEET]:
            t = str(t).strip().upper()
            if not t or len(t) > 12:
                continue
            raw.append({
                'handle': it.get('account_handle', ''),
                'name': it.get('display_name', ''),
                'ticker': CRYPTO_MAP.get(t, t),
                'ticker_display': t,
                'stance': it['stance'],
                'confidence': it.get('confidence', ''),
                'at': it['created_at'],
                'tweet_id': it['tweet_id'],
            })

    # 去重：同 handle+ticker+stance，DEDUP_DAYS 内只记第一条
    raw.sort(key=lambda s: s['at'])
    kept, last_at = [], {}
    for s in raw:
        key = (s['handle'], s['ticker'], s['stance'])
        prev = last_at.get(key)
        cur = datetime.fromisoformat(s['at'].replace('Z', '+00:00'))
        if prev and (cur - prev).days < DEDUP_DAYS:
            continue
        last_at[key] = cur
        kept.append(s)
    return kept


def fetch_prices(tickers, start):
    """批量拉日线，返回 {ticker: DataFrame(Open/Close, index=date)}；失败的进 skipped"""
    prices, skipped = {}, []
    CHUNK = 50
    tickers = sorted(set(tickers))
    for i in range(0, len(tickers), CHUNK):
        chunk = tickers[i:i + CHUNK]
        try:
            df = yf.download(chunk, start=start.strftime('%Y-%m-%d'),
                             auto_adjust=True, group_by='ticker',
                             threads=True, progress=False)
        except Exception as e:
            print(f'WARN download chunk failed: {e}', file=sys.stderr)
            skipped.extend(chunk)
            continue
        for t in chunk:
            try:
                sub = df[t][['Open', 'Close']].dropna() if len(chunk) > 1 else df[['Open', 'Close']].dropna()
            except Exception:
                skipped.append(t)
                continue
            if sub.empty:
                skipped.append(t)
            else:
                sub.index = pd.to_datetime(sub.index).tz_localize(None)
                prices[t] = sub
    return prices, skipped


def compute(signals, prices):
    """逐信号计算基准价 + 各 horizon 收益"""
    now = pd.Timestamp.utcnow().tz_localize(None)
    out = []
    for s in signals:
        px = prices.get(s['ticker'])
        if px is None:
            continue
        sig_date = pd.Timestamp(datetime.fromisoformat(s['at'].replace('Z', '+00:00')).date())
        # 基准：信号日之后第一个交易日开盘（严格 > 信号日，无前视）
        after = px[px.index > sig_date]
        if after.empty:
            continue   # 信号太新，还没有次日开盘
        base_date, base_open = after.index[0], float(after.iloc[0]['Open'])
        if base_open <= 0:
            continue
        sign = 1.0 if s['stance'] == 'bullish' else -1.0

        rec = {**s, 'base_date': base_date.strftime('%Y-%m-%d'), 'base_open': round(base_open, 4)}
        latest_date, latest_close = px.index[-1], float(px.iloc[-1]['Close'])
        rec['r_live'] = round(sign * (latest_close / base_open - 1) * 100, 2)
        for h in HORIZONS:
            target = sig_date + pd.Timedelta(days=h)
            if target > now or target > latest_date:
                rec[f'r{h}'] = None      # 尚未到期
                continue
            win = px[(px.index > base_date) | (px.index == base_date)]
            win = win[win.index <= target]
            if win.empty:
                rec[f'r{h}'] = None
                continue
            rec[f'r{h}'] = round(sign * (float(win.iloc[-1]['Close']) / base_open - 1) * 100, 2)
        out.append(rec)
    return out


def aggregate(records):
    by_kol = defaultdict(list)
    for r in records:
        by_kol[r['handle']].append(r)

    kols = []
    for handle, recs in by_kol.items():
        agg = {
            'handle': handle,
            'name': recs[0]['name'],
            'n_signals': len(recs),
            'n_bullish': sum(1 for r in recs if r['stance'] == 'bullish'),
            'n_bearish': sum(1 for r in recs if r['stance'] == 'bearish'),
            'last_signal_at': max(r['at'] for r in recs),
        }
        for h in HORIZONS:
            vals = [r[f'r{h}'] for r in recs if r.get(f'r{h}') is not None]
            agg[f'n_resolved{h}'] = len(vals)
            agg[f'avg_r{h}'] = round(sum(vals) / len(vals), 2) if vals else None
            agg[f'win{h}'] = round(sum(1 for v in vals if v > 0) / len(vals) * 100, 1) if vals else None
        live = [r['r_live'] for r in recs if r.get('r_live') is not None]
        agg['avg_r_live'] = round(sum(live) / len(live), 2) if live else None
        kols.append(agg)

    # 默认排序：30 日均收益优先（样本≥5），否则 7 日，再否则 live
    def rank_key(k):
        if k['n_resolved30'] >= 5 and k['avg_r30'] is not None:
            return (0, -k['avg_r30'])
        if k['n_resolved7'] >= 5 and k['avg_r7'] is not None:
            return (1, -k['avg_r7'])
        return (2, -(k['avg_r_live'] or -999))
    kols.sort(key=rank_key)
    return kols


def main():
    signals = load_signals()
    print(f'signals after dedup: {len(signals)}')
    if not signals:
        print('no signals, abort')
        return

    min_at = min(s['at'] for s in signals)
    start = datetime.fromisoformat(min_at.replace('Z', '+00:00')) - timedelta(days=5)
    prices, skipped = fetch_prices([s['ticker'] for s in signals], start)
    if skipped:   # yfinance 批量下载偶发抖动，失败的单独重试一轮
        retry_prices, skipped = fetch_prices(skipped, start)
        prices.update(retry_prices)
    print(f'prices fetched: {len(prices)} tickers, skipped: {sorted(set(skipped))}')

    records = compute(signals, prices)
    print(f'computed records: {len(records)}')
    kols = aggregate(records)

    result = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'lookback_days': LOOKBACK_DAYS,
        'methodology': '基准=发推次日开盘价；收益=持有至各期限收盘；空头取反；同KOL同标的同方向3天去重；模拟信号收益，非实盘。',
        'kols': kols,
        'signals': sorted(records, key=lambda r: r['at'], reverse=True),
        'meta': {'skipped_tickers': sorted(set(skipped))},
    }
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'))
    print(f'wrote {OUT_PATH} | kols={len(kols)} signals={len(records)}')


if __name__ == '__main__':
    main()

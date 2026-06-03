# gmlabs-ai/scoring · gm_rater 评分引擎（部署版）

通用六维股票评分引擎（mirror of [`gm_rater/`](../../gm_rater/)），随 ChainGraph 仓库一起部署，供 GitHub Actions 定时跑批。

完整模型设计文档：见 [STRATEGY.md](../../../gm_rater/STRATEGY.md)。

## 文件

| 文件 | 作用 |
|---|---|
| `universal_eval.py` | 六维评分主引擎 |
| `classifier.py` | tier + sector + 权重 |
| `tags.py` | 特点 + 风险标签 |
| `evaluator.py` | yfinance 数据层（沿用 mega_hunter） |
| `extract_tickers.py` | 从 `../graph.html` 抽取 ticker 列表 |
| `batch_score.py` | 批量评分主驱动，输出到 `../scores.json` |
| `requirements.txt` | Python 依赖 |

## 路径约定

```
gmlabs-ai/
├── graph.html              ← extract_tickers.py 从这里抽 ticker
├── scores.json             ← batch_score.py 写到这里（前端读）
└── scoring/                ← 本目录
    ├── *.py
    ├── requirements.txt
    └── chain_tickers.json  ← 抽取结果（每跑一次更新）
```

## 本地运行

```bash
cd gmlabs-ai/scoring
pip install -r requirements.txt
python extract_tickers.py
python batch_score.py             # 增量
python batch_score.py --force     # 全量
python batch_score.py --limit 10  # 测试
```

## GitHub Actions 自动化

由 `.github/workflows/nightly-scores.yml` 触发，每天北京时间 02:00 自动运行：
1. checkout 仓库
2. setup python 3.12
3. pip install requirements
4. python extract_tickers.py
5. python batch_score.py
6. git commit scores.json + chain_tickers.json
7. git push（触发 Vercel 自动部署）

// 自动生成格式：gen_ep_data.py NVDA · 数据快照 2026-07-11（scores.json）
export default {
  ep: '01',
  ticker: 'NVDA',
  cnName: '英伟达',
  category: 'SEMICONDUCTOR',
  snapshotDate: '2026-07-11',
  grade: 'S',
  gradeLabel: '极致',
  score: 85.3,
  scoreMax: 100,
  gradeColor: 'oklch(0.60 0.20 25)',

  // ① Hook
  hookTitle: '英伟达升到了 S 级',
  hookQuestion: '满分 100 拿 85.3，唯一的短板在哪？',
  hookSub: '不报目标价 · 不给买卖建议 · 用数据说话',

  // ② 一句话定位
  position: {
    oneLiner: '英伟达是 AI 算力的「卖铲人」',
    detail: '在 AI 产业链十一层结构里，它处在最核心的算力芯片层——几乎所有训练大模型的数据中心，都绕不开它的 GPU。',
    layerIndex: 2,
    layerLabel: '算力芯片层 · COMPUTE',
  },

  // ③ 评分卡
  deeplink: 'gmlabs.ai/?t=NVDA',
  cardLine: '六个维度客观打分，不掺主观情绪——一个一个看，你就明白 S 是怎么来的、短板还剩哪一个。',

  // ④ 六维拆解（分数来自 scores.json 2026-07-11）
  dims: [
    { name: 'AI 收入纯度', en: 'AI PURITY',  score: 15,   max: 15, note: '收入几乎纯粹来自 AI 算力，没有杂质，是它最硬的地方。' },
    { name: '护城河',      en: 'MOAT',       score: 20.2, max: 22, note: 'CUDA 软件生态 + 硬件代差，对手短期很难绕过。' },
    { name: '成长动能',    en: 'GROWTH',     score: 12,   max: 15, note: '依然强劲，但高基数下增速开始显现压力。' },
    { name: '盈利质量',    en: 'PROFIT',     score: 19.8, max: 22, note: '极高的毛利率，教科书级的赚钱机器。' },
    { name: '估值合理性',  en: 'VALUATION',  score: 10.8, max: 12, note: '上一次快照它在这里丢了一半分；业绩跟上来消化了预期，扣分项修复——这就是 A 升 S 的关键。' },
    { name: '生态卡位',    en: 'ECOSYSTEM',  score: 7.5,  max: 14, weak: true, note: '算力环节绝对王者，但放到整个 AI 应用生态，卡位不算最全面——现在唯一的短板。' },
  ],
  dimsSummary: '五维接近拉满，估值扣分修复后升到 S——唯一还没补上的，是生态卡位。',

  // ⑤ 未来空间（讲逻辑，不讲点位）
  future: {
    up: [
      'AI 数据中心资本开支仍在扩张周期，算力需求天花板未到',
      'CUDA 生态越滚越大，是它最深的护城河',
    ],
    watch: [
      '大客户开始自研芯片',
      '对手追赶',
      '高位对任何风吹草动都更敏感',
    ],
  },

  // ⑥ 风险 + CTA
  risks: [
    { label: '高位波动', detail: '评级刚上调，任何不及预期都会放大波动' },
    { label: '客户自研 + 对手追赶', detail: '大客户自研芯片、竞争对手加速' },
  ],
  cta: '看完整上下游 · 每天更新的六维评分',
};

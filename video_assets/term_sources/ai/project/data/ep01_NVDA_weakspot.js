// 「软肋」系列 · EP01 NVDA — 数据快照 2026-07-11（scores.json）
export default {
  ep: '01', ticker: 'NVDA', cnName: '英伟达', snapshotDate: '2026-07-11',
  grade: 'S', score: 85.3, scoreMax: 100, gradeColor: 'oklch(0.60 0.20 25)',
  deeplink: 'gmlabs.ai/?t=NVDA',
  weakDim: { name: '生态卡位', en: 'ECOSYSTEM', score: 7.5, max: 14 },

  hook: {
    line1: '全网都在吹英伟达',
    line2: '这期只讲它唯一的软肋',
    sub: '看懂它 · 就看懂 AI 的钱下一步流向哪',
  },

  strong: {
    kicker: '30 秒讲完它为什么强',
    cards: [
      { t: '卖铲人', d: '训练大模型，绕不开它的 GPU' },
      { t: 'CUDA 生态', d: '软件护城河，对手十年难追' },
      { t: '类软件毛利', d: '硬件公司，赚软件公司的利润率' },
    ],
    tail: '硬实力几乎无解——所以这期只讲它唯一的弱点。',
  },

  weak: {
    bands: [
      { label: '应用层', note: '面向用户收钱的地方', own: false },
      { label: '模型层', note: '大模型公司', own: false },
      { label: '算力芯片层', note: '英伟达在这', own: true },
      { label: '制造 · 设备 · 材料', note: '上游供应链', own: false },
    ],
    points: [
      'AI 产业链十一层，英伟达只站住算力这一层',
      '现在钱都堆在这一层：巨头在打算力军备竞赛',
      '但最终为 AI 付钱的，是用应用的人',
      '价值早晚向上移动——模型层、应用层，它几乎没有卡位',
    ],
    punch: '它是 AI 的入口，不是终点。',
  },

  cisco: {
    kicker: '这件事历史上发生过一次',
    then: { name: '思科 · 2000', points: ['互联网的「卖铲人」', '市值全球第一', '此后 20 多年没回到当年高点'] },
    now: { name: '英伟达 · 2026', points: ['AI 的「卖铲人」', '市值全球第一', '？'] },
    diff: '关键不同：CUDA 是软件生态，粘性远高于路由器。但「卖铲人拿不到金矿」这个结构性问题，一模一样。',
  },

  proof: {
    kicker: '这个软肋正在被攻击',
    items: [
      { who: 'Google', what: 'TPU 迭代到第 7 代，自家模型基本不用英伟达' },
      { who: 'Amazon', what: 'Trainium 自研芯片大规模部署' },
      { who: 'Microsoft · Meta', what: 'Maia、MTIA 自研加速中' },
      { who: 'OpenAI', what: '联手博通，造自己的芯片' },
    ],
    tail: '它最大的客户，同时都是它潜在的对手。',
  },

  mean: {
    kicker: '看懂软肋，你得到三个判断',
    items: [
      { n: '01', t: '算力层的钱还能赚多久', d: '盯巨头的资本开支周期' },
      { n: '02', t: '下一波价值往哪移', d: '模型层和应用层的卡位者' },
      { n: '03', t: '风险信号只有一个', d: '大客户自研芯片的实际部署量' },
    ],
    compliance: '讲逻辑 · 不讲点位',
  },

  cta: {
    line: '这些判断不是拍脑袋——六维模型算出来的',
    note: '生态卡位 7.5 / 14 · 它唯一的短板',
  },
};

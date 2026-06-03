// /api/analyze.js — Vercel Serverless Function
//
// POST /api/analyze
// 入参：{ ticker, feature, company, score }
// 出参：{ ok, content, model, usage, error? }
//
// 当前实现：Gemini 2.5 Flash（免费档 1500 RPD）
// 后续扩展：按 region 路由到 Claude（海外）/ DeepSeek（大陆）

export const config = { runtime: 'nodejs' };

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ============================================================
// 特征描述 → 任务指令映射
// ============================================================
const FEATURE_TASKS = {
  swot: {
    name: 'SWOT 分析',
    instruction: '基于公司在 AI 产业链中的位置 + 评分数据，给出 SWOT 四象限分析。优势(S) / 劣势(W) / 机会(O) / 威胁(T) 各 2-3 条要点，每条结合具体数据。'
  },
  dcf: {
    name: 'DCF 估值模型',
    instruction: '基于公司当前财务状况和增长动能（G1）+ 盈利质量（G2），给出简化 DCF 估值推演。说明关键假设（增长率、WACC、永续增长），给出每股估值区间，对比当前市值。'
  },
  comp: {
    name: '同业对标',
    instruction: '基于公司行业（sector）和市值档位（tier），找 2-3 个对标公司，从规模/增长/估值/护城河四个维度做表格对比，给出"是否更值得买"的客观结论。'
  },
  catalyst: {
    name: '12 个月催化剂时间表',
    instruction: '列出未来 12 个月内可能推动股价的 3-5 个具体催化剂事件，按时间顺序，标注重要性（高/中/低）。每个催化剂说明：触发条件、潜在影响幅度、监测信号。'
  },
  earnings: {
    name: '财报关键指标解读',
    instruction: '基于最新可得财务数据，提取 5-8 个关键指标（营收增速、毛利率、自由现金流、资本开支等），逐项点评趋势和异常，最后给"财报质量综合评价"。'
  },
  risk: {
    name: '黑天鹅风险扫描',
    instruction: '扫描该公司可能面临的极端风险事件（监管、地缘、技术替代、客户集中、供应链等），按发生概率和潜在影响幅度排序，给出 3-5 个具体风险场景。'
  },
};

// ============================================================
// 构建 Prompt
// ============================================================
function buildPrompt({ ticker, feature, company, score }) {
  const task = FEATURE_TASKS[feature] || { name: feature, instruction: '做深度分析' };

  const companyBlock = company
    ? `## 公司在 ChainGraph 产业链图谱中的位置
- 股票代码: ${company.t}
- 名称: ${company.cn || ''}
- 角色描述: ${company.role || '未标注'}
- 所属层级: ${company.layer_name || '未知层'}
- 标签: ${(company.flag || '').split(/\s+/).join(' | ')}`
    : `## 公司信息\n仅有股票代码: ${ticker}`;

  const scoreBlock = (score && score.status === 'ok')
    ? `## gm_rater 客观评分（六维 + 自动标签）
- 总分: ${score.score} / 100  · 等级: ${score.grade}
- 市值档: ${score.tier}  · 行业: ${score.sector}  · 市值: $${score.market_cap_usd_b}B
- G1 增长动能: ${score.dims.G1} / ${score.dim_max.G1}
- G2 盈利质量: ${score.dims.G2} / ${score.dim_max.G2}
- G3 财务健康: ${score.dims.G3} / ${score.dim_max.G3}
- G4 护城河:   ${score.dims.G4} / ${score.dim_max.G4}
- G5 股东回报: ${score.dims.G5} / ${score.dim_max.G5}
- G6 估值合理: ${score.dims.G6} / ${score.dim_max.G6}
- 特点标签: ${(score.features || []).map(f => f.emoji + f.name).join(' / ') || '无'}
- 风险标签: ${(score.risks || []).map(r => r.emoji + r.name).join(' / ') || '无'}`
    : `## gm_rater 评分\n本标的暂无客观评分数据（A 股 / 未上市 / yfinance 限速）`;

  return `你是一位资深美股投研分析师，专注 AI 产业链与小盘科技股发掘。你的方法论是"卖铲人理论"——在 AI 算力、HBM、CoWoS 封装、光通信、电力等环节挖掘卡脖子龙头。

# 任务
为 ${ticker} 做 **${task.name}**。

${task.instruction}

${companyBlock}

${scoreBlock}

# 输出要求
1. 600-900 字结构化中文报告，**严禁套话**，每段必须含**具体数据/数字/事实**
2. 用 Markdown 格式，包含 2-4 个清晰小节（## 子标题）
3. 紧密围绕"产业链位置 + 评分客观信号"展开，不脱离上下文
4. **不写**"建议买入/卖出"等明确投资指令
5. 末尾另起一行加 disclaimer：\`> 本分析仅供研究参考，非投资建议\`
6. 直接输出报告正文，不要重复任务描述`;
}

// ============================================================
// 调 Gemini
// ============================================================
async function callGemini(prompt, apiKey) {
  const url = `${GEMINI_URL}?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 2048,
        topP: 0.9,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  const data = await resp.json();
  if (data.error) {
    throw new Error(`Gemini API: ${data.error.message || JSON.stringify(data.error)}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini 返回空内容: ' + JSON.stringify(data).slice(0, 200));
  }
  return {
    content: text,
    usage: data.usageMetadata || null,
  };
}

// ============================================================
// 主入口
// ============================================================
export default async function handler(req, res) {
  // CORS（同源就不用，但留着方便测试）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Only POST' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: 'GEMINI_API_KEY 未配置。请在 Vercel Dashboard → Settings → Environment Variables 中添加。',
    });
  }

  let body = req.body;
  // Vercel 一般会自动解析 JSON，但兜底处理一下
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }
  }

  const { ticker, feature, company, score } = body || {};
  if (!ticker || !feature) {
    return res.status(400).json({
      ok: false,
      error: '缺少必传参数 ticker / feature',
    });
  }
  if (!FEATURE_TASKS[feature]) {
    return res.status(400).json({
      ok: false,
      error: `未知 feature: ${feature}，支持的：${Object.keys(FEATURE_TASKS).join(', ')}`,
    });
  }

  try {
    const prompt = buildPrompt({ ticker, feature, company, score });
    const t0 = Date.now();
    const { content, usage } = await callGemini(prompt, apiKey);
    const elapsed = Date.now() - t0;

    return res.status(200).json({
      ok: true,
      ticker,
      feature,
      feature_name: FEATURE_TASKS[feature].name,
      content,
      model: GEMINI_MODEL,
      usage,
      elapsed_ms: elapsed,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e.message || e),
    });
  }
}

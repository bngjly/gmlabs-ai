/**
 * /api/contribute — 社区首提公示通道
 *
 * POST { ticker, layer, reason, handle, website }
 * → 在 GitHub 仓库开公开 Issue（时间戳公证 + 全程可见 + 可讨论）
 * → 返回 { ok, issue_url, issue_number }
 *
 * 采纳流程：管理员审核 Issue → 收录进 graph.html（节点带 by 署名）→
 *          登记 community_calls.json（首提日基准价，夜任务追踪战绩）
 *
 * 需要 Vercel 环境变量 GH_CONTRIB_TOKEN（fine-grained token，仅 Issues:write 权限）。
 * 未配置时返回 503，前端降级为仅邮件通道。
 *
 * 注意：邮箱等 PII 一律不进公开 Issue（邮件通道单独走 formsubmit）。
 */

const REPO = 'bngjly/gmlabs-ai';
const LABEL = 'community-contribution';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }

  const token = process.env.GH_CONTRIB_TOKEN;
  if (!token) { res.status(503).json({ ok: false, error: 'not_configured' }); return; }

  const { ticker, layer, reason, handle, website } = req.body || {};

  // 蜜罐：正常用户看不到 website 字段，被填了 = 机器人
  if (website) { res.status(200).json({ ok: true, issue_url: null }); return; }

  const t = String(ticker || '').trim().toUpperCase().slice(0, 16);
  const lay = String(layer || '').trim().slice(0, 60);
  const why = String(reason || '').trim().slice(0, 2000);
  const who = String(handle || '').trim().replace(/^@/, '').slice(0, 40);

  if (!/^[A-Z0-9][A-Z0-9.\-]{0,15}$/.test(t)) {
    res.status(400).json({ ok: false, error: 'invalid ticker' }); return;
  }
  if (why.length < 10) {
    res.status(400).json({ ok: false, error: 'reason too short' }); return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const title = `[首提] ${t}${who ? ` — by @${who}` : ''}`;
  const body = [
    `| 字段 | 内容 |`,
    `|---|---|`,
    `| 标的 | **${t}** |`,
    `| 建议层级 | ${lay || '(未指定)'} |`,
    `| 首提人 | ${who ? '@' + who : '(匿名)'} |`,
    `| 首提日期 | ${today} |`,
    `| 状态 | ⏳ 待审核 |`,
    ``,
    `### 首提逻辑`,
    ``,
    why,
    ``,
    `---`,
    `> 采纳后将收录进 [gmlabs.ai](https://www.gmlabs.ai) 产业链图谱并为首提人署名，`,
    `> 以本 Issue 创建日为基准日追踪该标的后续表现（模拟收益，非投资建议）。`,
  ].join('\n');

  try {
    const create = (payload) => fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ChainGraph/1.0 (gmlabs.ai)',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    let gh = await create({ title, body, labels: [LABEL] });
    if (gh.status === 422) {
      // label 不存在等 422 → 降级重试（不带 label 也要把公示开出来）
      gh = await create({ title, body });
    }
    if (!gh.ok) {
      const detail = await gh.text();
      console.error('github issue create failed:', gh.status, detail.slice(0, 300));
      res.status(502).json({ ok: false, error: `github ${gh.status}` });
      return;
    }
    const issue = await gh.json();
    res.status(200).json({ ok: true, issue_url: issue.html_url, issue_number: issue.number });
  } catch (e) {
    console.error('contribute error:', e);
    res.status(502).json({ ok: false, error: 'github unreachable' });
  }
}

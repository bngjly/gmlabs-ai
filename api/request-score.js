/**
 * /api/request-score — 「📈 选股」搜不到时的评分申请通道
 *
 * POST { ticker }
 * → 在 GitHub 仓库开公开 Issue（label: score-request），去重（同票不重复开）
 * → 夜任务读取所有 open 的 score-request Issue，合并进评分队列，评完关闭 Issue
 *
 * 需要 Vercel 环境变量 GH_CONTRIB_TOKEN（与 /api/contribute 共用同一枚 fine-grained token）。
 * 未配置时返回 503，前端提示"稍后重试"（不是致命错误，只是这一批申请没提交上）。
 */

const REPO = 'bngjly/gmlabs-ai';
const LABEL = 'score-request';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }

  const token = process.env.GH_CONTRIB_TOKEN;
  if (!token) { res.status(503).json({ ok: false, error: 'not_configured' }); return; }

  const t = String((req.body || {}).ticker || '').trim().toUpperCase().slice(0, 20);
  // 允许美股/港股(.HK)/A股(.SS/.SZ) 常见代码格式
  if (!/^[A-Z0-9][A-Z0-9.\-]{0,19}$/.test(t)) {
    res.status(400).json({ ok: false, error: 'invalid ticker' }); return;
  }

  const ghHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'ChainGraph/1.0 (gmlabs.ai)',
    'Content-Type': 'application/json',
  };

  try {
    // 去重：同一票已有 open 的申请就不重复开 Issue
    const searchQ = encodeURIComponent(`repo:${REPO} is:issue is:open label:${LABEL} in:title "${t}"`);
    const search = await fetch(`https://api.github.com/search/issues?q=${searchQ}`, { headers: ghHeaders });
    if (search.ok) {
      const sd = await search.json();
      const existing = (sd.items || []).find(i => i.title === `[评分申请] ${t}`);
      if (existing) {
        res.status(200).json({ ok: true, issue_url: existing.html_url, duplicate: true });
        return;
      }
    }

    const create = (payload) => fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST', headers: ghHeaders, body: JSON.stringify(payload),
    });
    const title = `[评分申请] ${t}`;
    const body = [
      `用户在「📈 选股」里搜索了 **${t}**，评分池暂未收录。`,
      ``,
      `夜任务会自动拉取所有 open 的 \`${LABEL}\` Issue 并评分，成功后本 Issue 会自动关闭。`,
      `如果连续多天未关闭，可能是该代码 yfinance/akshare 都取不到数据（退市/代码有误/交易所不支持）。`,
    ].join('\n');

    let gh = await create({ title, body, labels: [LABEL] });
    if (gh.status === 422) gh = await create({ title, body }); // label 不存在时降级

    if (!gh.ok) {
      const detail = await gh.text();
      console.error('request-score issue create failed:', gh.status, detail.slice(0, 300));
      res.status(502).json({ ok: false, error: `github ${gh.status}` });
      return;
    }
    const issue = await gh.json();
    res.status(200).json({ ok: true, issue_url: issue.html_url, issue_number: issue.number });
  } catch (e) {
    console.error('request-score error:', e);
    res.status(502).json({ ok: false, error: 'github unreachable' });
  }
}

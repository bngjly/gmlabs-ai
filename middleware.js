// Edge Middleware — 给 ?t=TICKER 深链页面动态注入 SEO 内容 + OG/Twitter Card meta
//
// 三个用途：
//  1) SEO meta：每个 ?t=TICKER 是独立可索引落地页——注入含公司名/评级/板块的
//     title + description、自指 canonical（规范化到首页深链）、BreadcrumbList 结构化数据。
//  2) SEO 正文：注入一段【对用户和爬虫都可见】的真实公司详情（六维评分/亮点/AI暴露度），
//     解决"公司内容都在 iframe/JS 里、主文档对爬虫是空壳 → thin content 排不上"的命门问题。
//     内容真实可见、非隐藏，不构成 cloaking。
//  3) 社媒分享：Twitter/Telegram/Discord 解析链接时展示该公司动态评分卡（/api/og?t=TICKER）。
export const config = { matcher: ['/', '/graph'] };

const TICKER_RE = /^[A-Za-z0-9.\-]{1,12}$/;
const SITE = 'https://www.gmlabs.ai';

// 六维评分维度中文名（与 scoring/score_companies.py 一致）
const DIM_NAMES = {
  G1: 'AI 收入纯度', G2: '护城河 / 壁垒', G3: '成长动能',
  G4: '盈利质量', G5: '估值合理性', G6: '生态卡位',
};
const TIER_LABEL = { mega: '超大盘', large: '大盘', mid: '中盘', small: '小盘', micro: '微盘' };
const AI_LABEL = { high: '高', mid: '中', low: '低' };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const ticker = url.searchParams.get('t');
  if (!ticker || !TICKER_RE.test(ticker)) return;

  const t = ticker.toUpperCase();
  const sourcePath = url.pathname === '/graph' ? '/graph.html' : '/index.html';

  const [upstream, scoresRes, aiRes] = await Promise.all([
    fetch(new URL(sourcePath, url.origin)),
    fetch(new URL('/scores.json', url.origin)).catch(() => null),
    fetch(new URL('/ai_exposure.json', url.origin)).catch(() => null),
  ]);
  if (!upstream.ok) return;
  let html = await upstream.text();

  let sc = null;
  try {
    if (scoresRes && scoresRes.ok) {
      const scores = await scoresRes.json();
      sc = scores[t] || null;
    }
  } catch (e) { /* 取数失败走简化文案 */ }

  let aiLevel = null;
  try {
    if (aiRes && aiRes.ok) {
      const ai = await aiRes.json();
      for (const lv of ['high', 'mid', 'low']) {
        if ((ai[lv] || []).includes(t)) aiLevel = lv;
      }
    }
  } catch (e) { /* 忽略 */ }

  const ogImage = `${SITE}/api/og?t=${encodeURIComponent(t)}`;
  // 规范落地页统一为首页深链，把 /graph?t= 的权重也归并到 /?t=
  const canonical = `${SITE}/?t=${encodeURIComponent(t)}`;

  let title, desc;
  if (sc && sc.status === 'ok') {
    const sector = (sc.sector || '').replace(/_/g, ' ');
    title = `${sc.name} (${t}) · AI 产业链评分 ${sc.grade} | gmlabs.ai`;
    desc = `${sc.name}（${t}）在 AI 产业链中评级 ${sc.grade}（${sc.score}/100），${sector} 板块。查看其六维评分、AI 暴露度与供应链层级 — gmlabs.ai 286 家公司 AI 产业链图谱。`;
  } else {
    title = `${t} · AI 产业链评分卡 | gmlabs.ai`;
    desc = `查看 ${t} 在 AI 供应链中的位置、六维评分与 AI 暴露度 — gmlabs.ai`;
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AI 产业链图谱', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: sc && sc.name ? `${sc.name} (${t})` : t },
    ],
  };
  const ldJson = JSON.stringify(breadcrumb).replace(/</g, '\\u003c');

  const head = `
<link rel="canonical" href="${canonical}">
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImage}">
<script type="application/ld+json">${ldJson}</script>
`;

  // 清除源页默认 og/twitter/canonical/description，避免与上面注入的 ticker 专属标签重复
  html = html.replace(/\s*<meta (?:property="og:|name="twitter:)[^>]*>\n?/g, '');
  html = html.replace(/\s*<link rel="canonical"[^>]*>\n?/g, '');
  html = html.replace(/\s*<meta name="description"[^>]*>\n?/g, '');
  html = html.replace('</head>', head + '</head>');
  html = html.replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`);

  // 注入对用户和爬虫都可见的公司详情正文（落地页底部）
  if (sc && sc.status === 'ok') {
    html = html.replace('</body>', buildBrief(t, sc, aiLevel) + '</body>');
  }

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

// 生成公司详情正文（真实可见，非隐藏）——这是该页能被搜索引擎排名的独特内容
function buildBrief(t, sc, aiLevel) {
  const sector = esc((sc.sector || '').replace(/_/g, ' '));
  const tier = TIER_LABEL[sc.tier] || sc.tier || '';
  const name = esc(sc.name);
  const aiTxt = aiLevel ? `AI 暴露度：${AI_LABEL[aiLevel]}` : '';

  const dims = sc.dims || {};
  const dimMax = sc.dim_max || {};
  const dimRows = Object.keys(DIM_NAMES).map(k => {
    const v = dims[k];
    if (v == null) return '';
    return `<li style="margin:4px 0"><span style="color:#9aa5b1">${DIM_NAMES[k]}</span>：<strong style="color:#e6e6e6">${v}</strong> / ${dimMax[k] || '?'}</li>`;
  }).filter(Boolean).join('');

  const feats = (sc.features || []).map(f =>
    `<li style="margin:4px 0">${esc(f.emoji || '•')} ${esc(f.name)}</li>`
  ).join('');

  const metaLine = [
    `综合评级 <strong style="color:#4fc3f7">${esc(sc.grade_label || sc.grade)}</strong>`,
    `${sc.score}/100`,
    sector ? `${sector} 板块` : '',
    tier,
    aiTxt,
  ].filter(Boolean).join(' · ');

  return `
<section id="company-seo-detail" style="max-width:880px;margin:28px auto 48px;padding:24px 28px;background:#141a22;border:1px solid #2a3548;border-radius:12px;color:#cfd5dc;font-family:-apple-system,'PingFang SC','Microsoft YaHei','Segoe UI',sans-serif;line-height:1.75">
  <h1 style="font-size:24px;color:#e6e6e6;margin:0 0 6px">${name}（${t}）AI 产业链评分</h1>
  <p style="color:#9aa5b1;margin:0 0 16px">${metaLine}</p>
  <p style="margin:0 0 16px">${name}（股票代码 ${t}）是 gmlabs.ai AI 产业链图谱收录的 286 家公司之一，位于 ${sector || 'AI 供应链'} 环节。在六维 AI 价值评分体系中获得 ${esc(sc.grade_label || sc.grade)} 评级，综合得分 ${sc.score}/100，反映其在 AI 产业链中的卡位、成长性与盈利质量。</p>
  ${dimRows ? `<h2 style="font-size:16px;color:#e6e6e6;margin:20px 0 8px">六维评分明细</h2><ul style="margin:0;padding-left:20px">${dimRows}</ul>` : ''}
  ${feats ? `<h2 style="font-size:16px;color:#e6e6e6;margin:20px 0 8px">核心亮点</h2><ul style="margin:0;padding-left:20px">${feats}</ul>` : ''}
  <p style="margin:20px 0 0">
    <a href="/?t=${encodeURIComponent(t)}" style="color:#4fc3f7;text-decoration:none">▸ 在 AI 产业链图谱中查看 ${t} 的上下游关系</a><br>
    <a href="https://t.me/yoyoaidaily" style="color:#4fc3f7;text-decoration:none">▸ Telegram 订阅每日 AI 产业链 / KOL 观点</a>
  </p>
  ${sc.evaluated_at ? `<p style="color:#6b7785;font-size:13px;margin:14px 0 0">评估日期：${esc(sc.evaluated_at)} · 数据来源 gmlabs.ai AI 产业链图谱</p>` : ''}
</section>`;
}

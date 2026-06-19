// Edge Middleware — 给 ?t=TICKER 深链页面动态注入 SEO + OG/Twitter Card meta
//
// 两个用途：
//  1) SEO：每个 ?t=TICKER 是一个独立可索引落地页——注入含公司名/评级/板块的
//     title + description、自指 canonical（规范化到首页深链）、BreadcrumbList 结构化数据。
//  2) 社媒分享：Twitter/Telegram/Discord 解析链接时展示该公司动态评分卡（/api/og?t=TICKER）。
export const config = { matcher: ['/', '/graph'] };

const TICKER_RE = /^[A-Za-z0-9.\-]{1,12}$/;
const SITE = 'https://www.gmlabs.ai';

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

  const [upstream, scoresRes] = await Promise.all([
    fetch(new URL(sourcePath, url.origin)),
    fetch(new URL('/scores.json', url.origin)).catch(() => null),
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

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

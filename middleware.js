// Edge Middleware — 给 ?t=TICKER 深链页面动态注入 OG/Twitter Card meta 标签
// 让 Twitter/Telegram/Discord 在解析分享链接（如 gmlabs.ai/?t=NVDA）时，
// 展示该公司的动态评分卡图片（/api/og?t=NVDA）而不是站点默认卡片。
export const config = { matcher: ['/', '/graph'] };

const TICKER_RE = /^[A-Za-z0-9.\-]{1,12}$/;

export default async function middleware(req) {
  const url = new URL(req.url);
  const ticker = url.searchParams.get('t');
  if (!ticker || !TICKER_RE.test(ticker)) return;

  const t = ticker.toUpperCase();
  const sourcePath = url.pathname === '/graph' ? '/graph.html' : '/index.html';
  const upstream = await fetch(new URL(sourcePath, url.origin));
  if (!upstream.ok) return;
  let html = await upstream.text();

  const ogImage = `${url.origin}/api/og?t=${encodeURIComponent(t)}`;
  const title = `${t} · AI 产业链评分卡 | gmlabs.ai`;
  const desc = `查看 ${t} 在 AI 供应链中的位置、六维评分与 AI 暴露度 — gmlabs.ai`;

  const metaTags = `
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${ogImage}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ogImage}">
`;

  // 去掉源页面里的默认 og:/twitter: 标签，避免与上面注入的 ticker 专属标签重复
  html = html.replace(/\s*<meta (?:property="og:|name="twitter:)[^>]*>\n?/g, '');
  html = html.replace('</head>', metaTags + '</head>');
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

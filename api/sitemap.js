// /api/sitemap.js — 动态生成 sitemap.xml
// 经 vercel.json rewrite，对外暴露为 https://www.gmlabs.ai/sitemap.xml
// 读取 scores.json，为每家已评分公司生成深链落地页 URL（/?t=TICKER），
// 公司集合随每日评分刷新自动同步，无需手动维护。

export const config = { runtime: 'edge' };

const SITE = 'https://www.gmlabs.ai';

// 主页面（home / graph / kol），profile 为个人页不收录
const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/graph', priority: '0.9', changefreq: 'daily' },
  { loc: '/kol', priority: '0.7', changefreq: 'hourly' },
];

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export default async function handler(req) {
  const { origin } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);

  let tickers = [];
  try {
    const res = await fetch(`${origin}/scores.json`);
    if (res.ok) {
      const scores = await res.json();
      tickers = Object.values(scores)
        .filter(v => v && v.status === 'ok' && v.ticker)
        .map(v => v.ticker)
        .sort();
    }
  } catch (e) {
    // 取数失败时仍输出主页面，保证 sitemap 可用
  }

  const urls = [];
  for (const p of STATIC_PAGES) {
    urls.push(`  <url><loc>${SITE}${p.loc}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`);
  }
  for (const t of tickers) {
    const loc = `${SITE}/?t=${encodeURIComponent(t)}`;
    urls.push(`  <url><loc>${xmlEscape(loc)}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

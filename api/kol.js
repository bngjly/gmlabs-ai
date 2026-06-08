/**
 * Vercel Serverless Proxy — MasterTicker KOL Opinions
 *
 * 前端直接 fetch MasterTicker 跨域可能被 CORS 拦截，
 * 通过 /api/kol?limit=60 走服务端代理绕过。
 * 同时可做缓存（Cache-Control），减少对上游的请求频次。
 */
export default async function handler(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 60, 100);
  const url = `https://masterticker.com/api/twitter/opinions/latest?limit=${limit}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'ChainGraph/1.0 (gmlabs.ai)',
        'Accept': 'application/json',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `upstream ${upstream.status}` });
      return;
    }

    const data = await upstream.json();

    // 缓存 10 分钟（CDN edge）+ 允许 stale 30 分钟
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (e) {
    console.error('kol proxy error:', e);
    res.status(502).json({ error: 'upstream unreachable' });
  }
}

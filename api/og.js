// /api/og.js — 公司评分卡动态 OG 图（用于视频/社媒分享预览）
// GET /api/og?t=NVDA  → 1200x630 PNG，展示六维评分 + 等级 + AI 暴露度
//
// 设计上不引入中文字体（satori 默认字体不含 CJK，加载 CJK 字体会显著拖慢冷启动），
// 卡片本身只用 ticker / 等级 / 数字 / G1-G6 代号，足够作为分享缩略图。

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const GRADE_BG = {
  S: 'linear-gradient(135deg, #ef4444, #f59e0b)',
  A: '#22c55e',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#6b7785',
};
const GRADE_FG = { S: '#fff', A: '#06150c', B: '#fff', C: '#06150c', D: '#fff' };
const DIM_KEYS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
const AI_LABEL = { high: 'AI Exposure: High', mid: 'AI Exposure: Mid', low: 'AI Exposure: Low' };

function h(type, props = {}, ...children) {
  return { type, props: { ...props, children: children.flat().filter(c => c !== null && c !== undefined && c !== false) } };
}

export default async function handler(req) {
  const { searchParams, origin } = new URL(req.url);
  const ticker = (searchParams.get('t') || '').toUpperCase().trim();

  let sc = null;
  let aiLevel = null;
  try {
    const [scoresRes, aiRes] = await Promise.all([
      fetch(`${origin}/scores.json`),
      fetch(`${origin}/ai_exposure.json`),
    ]);
    if (scoresRes.ok) {
      const scores = await scoresRes.json();
      sc = scores[ticker] || null;
    }
    if (aiRes.ok) {
      const ai = await aiRes.json();
      for (const level of ['high', 'mid', 'low']) {
        if ((ai[level] || []).includes(ticker)) aiLevel = level;
      }
    }
  } catch (e) {
    // 数据加载失败时走兜底卡片
  }

  const card = (sc && sc.status === 'ok')
    ? buildScoreCard(ticker, sc, aiLevel)
    : buildFallbackCard(ticker || 'gmlabs.ai');

  return new ImageResponse(card, {
    width: 1200,
    height: 630,
    headers: { 'Cache-Control': 'public, immutable, no-transform, max-age=86400' },
  });
}

function truncate(s, max) {
  s = s || '';
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function buildScoreCard(ticker, sc, aiLevel) {
  const dims = sc.dims || {};
  const dimMax = sc.dim_max || {};

  const bars = DIM_KEYS.map(k => {
    const v = dims[k] || 0;
    const m = dimMax[k] || 1;
    const pct = Math.max(0, Math.min(100, Math.round((v / m) * 100)));
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' } },
      h('div', { style: { display: 'flex', width: '36px', fontSize: '20px', color: '#9aa5b1', fontWeight: 700 } }, k),
      h('div', { style: { flex: 1, height: '14px', background: '#1c2632', borderRadius: '7px', display: 'flex', overflow: 'hidden' } },
        h('div', { style: { display: 'flex', width: `${pct}%`, height: '100%', background: '#4fc3f7', borderRadius: '7px' } }),
      ),
      h('div', { style: { display: 'flex', width: '70px', fontSize: '18px', color: '#cfd5dc', textAlign: 'right' } }, `${v.toFixed(1)}/${m}`),
    );
  });

  return h('div', {
    style: {
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f1419 0%, #1c2632 100%)',
      padding: '56px', fontFamily: '"sans-serif"', color: '#e6e6e6',
    },
  },
    // 顶部品牌行
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' } },
      h('div', {
        style: {
          width: '44px', height: '44px', borderRadius: '10px',
          background: 'linear-gradient(135deg,#4fc3f7,#3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', color: '#000', fontWeight: 700,
        },
      }, '⚡'),
      h('div', { style: { display: 'flex', fontSize: '28px', fontWeight: 700, color: '#4fc3f7' } }, 'gmlabs.ai'),
      h('div', { style: { display: 'flex', fontSize: '22px', color: '#6b7785', marginLeft: '8px' } }, 'AI Supply Chain Score Card'),
    ),
    // 主体：左侧 ticker+name+bars，右侧 grade
    h('div', { style: { display: 'flex', flex: 1, gap: '48px' } },
      h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: '10px' } },
        h('div', { style: { display: 'flex', height: '92px', alignItems: 'center' } },
          h('div', { style: { display: 'flex', fontSize: '80px', fontWeight: 800, letterSpacing: '2px' } }, ticker),
        ),
        h('div', { style: { display: 'flex', height: '44px', alignItems: 'center', overflow: 'hidden' } },
          h('div', { style: { display: 'flex', fontSize: '28px', color: '#9aa5b1', whiteSpace: 'nowrap' } }, truncate(sc.name, 38)),
        ),
        h('div', { style: { display: 'flex', gap: '12px', marginBottom: '4px' } },
          h('div', { style: { padding: '6px 16px', borderRadius: '8px', background: '#243245', fontSize: '20px', display: 'flex' } }, (sc.sector || '').replace(/_/g, ' ')),
          h('div', { style: { padding: '6px 16px', borderRadius: '8px', background: '#243245', fontSize: '20px', display: 'flex' } }, (sc.tier || '').toUpperCase()),
          aiLevel && h('div', { style: { padding: '6px 16px', borderRadius: '8px', background: '#2d3a55', color: '#8b5cf6', fontSize: '20px', display: 'flex' } }, AI_LABEL[aiLevel]),
        ),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, ...bars),
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', width: '300px' } },
        h('div', {
          style: {
            width: '220px', height: '220px', borderRadius: '50%',
            background: GRADE_BG[sc.grade] || '#6b7785', color: GRADE_FG[sc.grade] || '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '120px', fontWeight: 800,
          },
        }, sc.grade || '?'),
        h('div', { style: { fontSize: '40px', fontWeight: 700, display: 'flex' } }, `${sc.score} / 100`),
      ),
    ),
    // 底部 footer
    h('div', {
      style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid #2a3548', paddingTop: '24px', marginTop: '24px',
        fontSize: '22px', color: '#6b7785',
      },
    },
      h('div', { style: { display: 'flex' } }, '286 companies · 11-layer AI supply chain map'),
      h('div', { style: { display: 'flex', color: '#4fc3f7' } }, 'Telegram @yoyoaidaily'),
    ),
  );
}

function buildFallbackCard(label) {
  return h('div', {
    style: {
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '24px',
      background: 'linear-gradient(135deg, #0f1419 0%, #1c2632 100%)',
      color: '#e6e6e6', fontFamily: '"sans-serif"',
    },
  },
    h('div', {
      style: {
        width: '64px', height: '64px', borderRadius: '14px',
        background: 'linear-gradient(135deg,#4fc3f7,#3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '34px', color: '#000', fontWeight: 700,
      },
    }, '⚡'),
    h('div', { style: { fontSize: '56px', fontWeight: 800, display: 'flex' } }, 'gmlabs.ai'),
    h('div', { style: { fontSize: '28px', color: '#9aa5b1', display: 'flex' } }, `AI Supply Chain Map — ${label}`),
    h('div', { style: { fontSize: '22px', color: '#4fc3f7', display: 'flex' } }, 'Telegram @yoyoaidaily'),
  );
}

// YoYo AI 日报 — 视频品牌共享组件
// 纯展示组件：不依赖任何 Stage/Timeline 上下文，调用方把 useTime() 的值作为 time 传入。
// 用法（在任意 animations 视频 jsx 中）：
//   <x-import> 或 script 加载后：const { YOYO, BrandCorner, BrandEndcard } = window.YoYoBrand;
//   <BrandCorner time={time} at={0.3} />
//   <Sprite start={64} end={70}><BrandEndcard time={time} t0={64} W={1920} H={1080} /></Sprite>

const YOYO = {
  navy: '#050F1E', navy2: '#0A1828',
  blue: '#1A8FFF', sky: '#82CFFF', gold: '#F0B90B',
  bg: '#EEF1F7', card: '#FFFFFF', line: '#DCE3ED',
  ink: '#050F1E', mute: '#46586E', faint: '#93A1B4',
  darkInk: '#EEF0F8', darkMute: '#8FA2B8', darkLine: '#1B2B40',
  shadowCard: '0 10px 30px rgba(10,24,40,0.07)',
  shadowPill: '0 6px 18px rgba(10,24,40,0.06)',
  disp: "'Space Grotesk','PingFang SC','Microsoft YaHei',sans-serif",
  cjk: "'PingFang SC','Microsoft YaHei','Space Grotesk',sans-serif",
  mono: "'JetBrains Mono',ui-monospace,monospace",
  logo: 'assets/yoyo_ai_800.png',
  name: 'YoYo AI 日报',
  tagline: '每天 60 秒 · 看懂 AI 产业链',
};

const _clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _outCubic = (t) => (--t) * t * t + 1;
const _outBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function _reveal(time, at, dur = 0.55, dist = 18) {
  const t = _clamp((time - at) / dur, 0, 1); const e = _outCubic(t);
  return { opacity: e, y: (1 - e) * dist };
}
function _pop(time, at, dur = 0.5) {
  const t = _clamp((time - at) / dur, 0, 1);
  return { opacity: _clamp(t * 1.6, 0, 1), scale: 0.6 + 0.4 * _outBack(t) };
}

// 角标：左上角 logo + 名称。dark=true 用于深色背景。
function BrandCorner({ time, at = 0.3, x = 100, y = 52, size = 46, dark = false, showName = true }) {
  const rv = _reveal(time, at, 0.6, 0);
  return (
    <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 14, opacity: rv.opacity, pointerEvents: 'none' }}>
      <img src={YOYO.logo} alt="" style={{ width: size, height: size, display: 'block' }} />
      {showName ? (
        <div style={{ fontFamily: YOYO.cjk, fontSize: size * 0.43, fontWeight: 700, color: dark ? YOYO.darkInk : YOYO.ink, letterSpacing: '0.01em' }}>{YOYO.name}</div>
      ) : null}
    </div>
  );
}

// 片尾：藏青全屏 · logo 弹入 · 名称 + tagline + 关注引导。t0 = 片尾起始秒。
function BrandEndcard({ time, t0, W = 1920, H = 1080, tagline = YOYO.tagline, cta = '关注 · 点赞 · 转发', handle = '' }) {
  const lg = _pop(time, t0 + 0.2, 0.6);
  const nm = _reveal(time, t0 + 0.6, 0.55, 16);
  const tg = _reveal(time, t0 + 1.0, 0.55, 14);
  const ct = _reveal(time, t0 + 1.6, 0.55, 12);
  const portrait = H > W;
  const logoSize = portrait ? 380 : 300;
  return (
    <div style={{ position: 'absolute', inset: 0, background: YOYO.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: portrait ? 34 : 26 }}>
      <img src={YOYO.logo} alt="" style={{ width: logoSize, height: logoSize, opacity: lg.opacity, transform: `scale(${lg.scale})`, willChange: 'transform,opacity' }} />
      <div style={{ fontFamily: YOYO.cjk, fontSize: portrait ? 72 : 60, fontWeight: 700, color: YOYO.darkInk, letterSpacing: '0.01em', opacity: nm.opacity, transform: `translateY(${nm.y}px)` }}>{YOYO.name}</div>
      <div style={{ fontFamily: YOYO.cjk, fontSize: portrait ? 34 : 28, color: YOYO.sky, opacity: tg.opacity, transform: `translateY(${tg.y}px)` }}>{tagline}</div>
      <div style={{ marginTop: portrait ? 22 : 14, display: 'inline-flex', alignItems: 'center', gap: 16, background: YOYO.blue, color: YOYO.navy, borderRadius: 999, padding: portrait ? '20px 46px' : '16px 38px', opacity: ct.opacity, transform: `translateY(${ct.y}px)` }}>
        <div style={{ fontFamily: YOYO.cjk, fontSize: portrait ? 30 : 25, fontWeight: 700 }}>{cta}</div>
        {handle ? <div style={{ fontFamily: YOYO.mono, fontSize: portrait ? 26 : 21, fontWeight: 700 }}>{handle}</div> : null}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: portrait ? 60 : 44, textAlign: 'center', fontFamily: YOYO.mono, fontSize: 15, letterSpacing: '0.22em', color: YOYO.darkMute, opacity: ct.opacity }}>YOYO AI DAILY</div>
    </div>
  );
}

module.exports = { YOYO, BrandCorner, BrandEndcard };
window.YoYoBrand = { YOYO, BrandCorner, BrandEndcard };

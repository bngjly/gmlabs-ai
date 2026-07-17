// ════════════════════════════════════════════════════════════════════════
//  StockVideoScenes.jsx — 「个股六维测评」系列引擎（gmlabs.ai 配套）
//  场景结构沿用 TermVideoScenes：Hook → 定位 → 评分卡 → 六维拆解 → 未来空间 → 风险+CTA → 品牌片尾
//  时间轴与配音脚本对齐：0-15 / 15-35 / 35-70 / 70-160 / 160-210 / 210-234 / 234-240
//  用法： <x-import component="StockVideo" from="./StockVideoScenes.jsx"
//                   data="{{ epData }}" orientation="landscape" hint-size="100%,100%">
// ════════════════════════════════════════════════════════════════════════

const Easing = {
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeOutBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const TimelineContext = React.createContext({ time: 0, duration: 10 });
const useTime = () => React.useContext(TimelineContext).time;

function Sprite({ start = 0, end = Infinity, children }) {
  const { time } = React.useContext(TimelineContext);
  if (time < start || time > end) return null;
  return children;
}

function Stage({ width, height, duration, background, persistKey, children }) {
  const [time, setTime] = React.useState(() => {
    try { const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0'); return isFinite(v) ? clamp(v, 0, duration) : 0; } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(true);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  React.useEffect(() => { try { localStorage.setItem(persistKey + ':t', String(time)); } catch {} }, [time, persistKey]);

  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44;
      const s = Math.min(el.clientWidth / width, (el.clientHeight - barH) / height);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [width, height]);

  React.useEffect(() => {
    if (!playing) { lastTsRef.current = null; return; }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => { let next = t + dt; if (next >= duration) next = next % duration; return next; });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = null; };
  }, [playing, duration]);

  const ctxValue = React.useMemo(() => ({ time, duration }), [time, duration]);
  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const mm = Math.floor(time / 60), ss = Math.floor(time % 60);

  return (
    <div ref={stageRef} style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', background:'#0a0a0a', fontFamily:'system-ui, sans-serif' }}>
      <div style={{ flex:1, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', minHeight:0 }}>
        <div style={{ width, height, background, position:'relative', transform:`scale(${scale})`, transformOrigin:'center', flexShrink:0, boxShadow:'0 20px 60px rgba(0,0,0,0.4)', overflow:'hidden' }}>
          <TimelineContext.Provider value={ctxValue}>{children}</TimelineContext.Provider>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px', background:'rgba(20,20,20,0.92)', width:'100%', maxWidth:680, alignSelf:'center', borderRadius:8, flexShrink:0 }}>
        <button onClick={() => setPlaying(p => !p)} style={{ width:28, height:28, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, background:'rgba(255,255,255,0.06)', color:'#f6f4ef', cursor:'pointer' }}>{playing ? '❚❚' : '▶'}</button>
        <div style={{ flex:1, height:22, position:'relative', cursor:'pointer' }}
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTime(clamp((e.clientX - r.left)/r.width,0,1)*duration); }}>
          <div style={{ position:'absolute', left:0, right:0, top:9, height:4, background:'rgba(255,255,255,0.12)', borderRadius:2 }} />
          <div style={{ position:'absolute', left:0, top:9, width:`${pct}%`, height:4, background:'#1A8FFF', borderRadius:2 }} />
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'#93A1B4', flexShrink:0 }}>{mm}:{String(ss).padStart(2,'0')}</div>
      </div>
    </div>
  );
}

// ── YoYo brand tokens（与 brand/YoYoBrand.jsx 一致，单文件自包含） ────────
const YOYO = {
  navy:'#050F1E', blue:'#1A8FFF', sky:'#82CFFF', gold:'#F0B90B',
  bg:'#EEF1F7', card:'#FFFFFF', line:'#DCE3ED',
  ink:'#050F1E', mute:'#46586E', faint:'#93A1B4',
  darkInk:'#EEF0F8', darkMute:'#8FA2B8', darkLine:'#1B2B40',
  disp:"'Space Grotesk','PingFang SC','Microsoft YaHei',sans-serif",
  cjk:"'PingFang SC','Microsoft YaHei','Space Grotesk',sans-serif",
  mono:"'JetBrains Mono',ui-monospace,monospace",
  logo:'assets/yoyo_ai_800.png',
  name:'YoYo AI 日报',
  tagline:'每天 60 秒 · 看懂 AI 产业链',
};
const { navy, blue, sky, gold } = YOYO;
const INK=YOYO.ink, MUTE=YOYO.mute, FAINT=YOYO.faint, BG=YOYO.bg, CARD=YOYO.card, LINE=YOYO.line;
const DISP=YOYO.disp, CJK=YOYO.cjk, MONO=YOYO.mono;

function reveal(time, at, { dur=0.55, dist=22 } = {}) {
  const t = clamp((time-at)/dur,0,1); const e = Easing.easeOutCubic(t);
  return { opacity:e, y:(1-e)*dist };
}
function pop(time, at, dur=0.5) {
  const t = clamp((time-at)/dur,0,1); const s = Easing.easeOutBack(t);
  return { opacity: clamp(t*1.6,0,1), scale: 0.6+0.4*s };
}
function SceneFade({ start, end, children }) {
  const time = useTime();
  const fin = clamp((time-start)/0.4,0,1);
  const fout = 1 - clamp((time-(end-0.45))/0.45,0,1);
  return <div style={{ position:'absolute', inset:0, opacity:Math.min(fin,fout) }}>{children}</div>;
}
function Kicker({ text, color, time, at }) {
  const rv = reveal(time, at, { dist:14 });
  return (
    <div style={{ opacity:rv.opacity, transform:`translateY(${rv.y}px)`, display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
      <div style={{ width:10, height:10, borderRadius:6, background:color }} />
      <div style={{ fontFamily:MONO, fontSize:15, letterSpacing:'0.2em', color:MUTE, textTransform:'uppercase' }}>{text}</div>
    </div>
  );
}
function GradeBadge({ data, size=120, popSt }) {
  return (
    <div style={{ opacity:popSt.opacity, transform:`scale(${popSt.scale})`, width:size, height:size, borderRadius:size*0.22, background:data.gradeColor, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 14px 40px rgba(10,24,40,0.25)' }}>
      <div style={{ fontFamily:DISP, fontWeight:700, fontSize:size*0.58, color:'#fff', lineHeight:1 }}>{data.grade}</div>
    </div>
  );
}

// ── 分段时间轴（与配音脚本一致） ─────────────────────────────────────────
const T = {
  hook:[0,15], pos:[15,35], card:[35,70], dims:[70,160],
  future:[160,210], risk:[210,234], end:[234,240], DUR:240,
};

// ── HUD（正片浅色场景通用） ──────────────────────────────────────────────
function Hud({ data, contentX, isPortrait }) {
  const time = useTime();
  const rv = reveal(time, T.pos[0]+0.3, { dist:0, dur:0.5 });
  return (
    <div style={{ position:'absolute', inset:0, opacity:rv.opacity, pointerEvents:'none' }}>
      <div style={{ position:'absolute', left:contentX, top:isPortrait?50:46, display:'flex', alignItems:'center', gap:12 }}>
        <img src={YOYO.logo} alt="" style={{ width:44, height:44, display:'block' }} />
        <div style={{ fontFamily:CJK, fontSize:isPortrait?18:19, fontWeight:700, color:INK }}>{YOYO.name}</div>
      </div>
      <div style={{ position:'absolute', right:contentX, top:isPortrait?62:58, fontFamily:MONO, fontSize:isPortrait?13:14, color:FAINT, letterSpacing:'0.14em' }}>GMLABS.AI · EP {data.ep} · {data.ticker}</div>
      <div style={{ position:'absolute', left:contentX, right:contentX, top:isPortrait?112:106, height:1, background:LINE }} />
    </div>
  );
}

// ── ① Hook（深色封面） ───────────────────────────────────────────────────
function SceneHook({ data, W, isPortrait }) {
  const time = useTime();
  const tag = reveal(time, 0.4, { dist:12 });
  const badge = pop(time, 1.0, 0.6);
  const sc = reveal(time, 1.6, { dist:16 });
  const t1 = reveal(time, 2.4, { dist:20 });
  const t2 = reveal(time, 3.4, { dist:20 });
  const sub = reveal(time, 4.6, { dist:12 });
  const scoreT = Easing.easeOutCubic(clamp((time-1.6)/1.4,0,1));
  const scoreVal = (scoreT * data.score).toFixed(1);
  return (
    <div style={{ position:'absolute', inset:0, background:navy, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
      <div style={{ opacity:tag.opacity, transform:`translateY(${tag.y}px)`, display:'inline-flex', alignItems:'center', gap:12, border:`1px solid ${YOYO.darkLine}`, borderRadius:999, padding:'8px 22px' }}>
        <img src={YOYO.logo} alt="" style={{ width:26, height:26 }} />
        <div style={{ fontFamily:MONO, fontSize:isPortrait?14:15, letterSpacing:'0.18em', color:YOYO.darkMute }}>EP {data.ep} · {data.ticker} · 六维测评</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:isPortrait?28:34, marginTop:isPortrait?54:44 }}>
        <GradeBadge data={data} size={isPortrait?150:132} popSt={badge} />
        <div style={{ textAlign:'left', opacity:sc.opacity, transform:`translateY(${sc.y}px)` }}>
          <div style={{ fontFamily:DISP, fontWeight:700, fontSize:isPortrait?86:78, color:YOYO.darkInk, lineHeight:1 }}>{scoreVal}</div>
          <div style={{ fontFamily:CJK, fontSize:isPortrait?22:21, color:YOYO.darkMute, marginTop:8 }}>{data.grade} {data.gradeLabel} · 满分 {data.scoreMax}</div>
        </div>
      </div>
      <div style={{ opacity:t1.opacity, transform:`translateY(${t1.y}px)`, fontFamily:CJK, fontWeight:700, fontSize:isPortrait?52:58, color:YOYO.darkInk, marginTop:isPortrait?60:48, lineHeight:1.35, maxWidth:W*0.86 }}>{data.hookTitle}</div>
      <div style={{ opacity:t2.opacity, transform:`translateY(${t2.y}px)`, fontFamily:CJK, fontWeight:700, fontSize:isPortrait?40:44, color:sky, marginTop:16, lineHeight:1.4, maxWidth:W*0.86 }}>{data.hookQuestion}</div>
      <div style={{ opacity:sub.opacity, transform:`translateY(${sub.y}px)`, fontFamily:MONO, fontSize:isPortrait?15:16, letterSpacing:'0.14em', color:YOYO.darkMute, marginTop:isPortrait?46:38 }}>{data.hookSub}</div>
    </div>
  );
}

// ── ② 一句话定位 ─────────────────────────────────────────────────────────
function ScenePosition({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = T.pos[0]+0.5;
  const big = reveal(time, t0+0.5, { dist:22 });
  const det = reveal(time, t0+1.4, { dist:18 });
  const chainRv = reveal(time, t0+2.6, { dist:16 });
  const layers = 11;
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="一句话定位 · POSITIONING" color={blue} time={time} at={t0} />
      <div style={{ opacity:big.opacity, transform:`translateY(${big.y}px)`, fontFamily:CJK, fontSize:isPortrait?40:46, fontWeight:700, color:INK, lineHeight:1.5, textWrap:'pretty' }}>{data.position.oneLiner}</div>
      <div style={{ opacity:det.opacity, transform:`translateY(${det.y}px)`, fontFamily:CJK, fontSize:isPortrait?23:25, color:MUTE, lineHeight:1.65, marginTop:24, textWrap:'pretty' }}>{data.position.detail}</div>
      <div style={{ opacity:chainRv.opacity, transform:`translateY(${chainRv.y}px)`, marginTop:isPortrait?54:46, background:CARD, border:`1px solid ${LINE}`, borderRadius:16, padding:'26px 28px', boxShadow:'0 10px 30px rgba(10,24,40,0.07)' }}>
        <div style={{ fontFamily:MONO, fontSize:13, letterSpacing:'0.18em', color:FAINT, marginBottom:16 }}>AI 产业链 · 11 层结构</div>
        <div style={{ display:'flex', gap:6 }}>
          {Array.from({ length: layers }).map((_, i) => {
            const on = i === data.position.layerIndex;
            const st = pop(time, t0+2.8+i*0.08, 0.4);
            return <div key={i} style={{ flex:1, height:on?54:40, alignSelf:'flex-end', borderRadius:8, background:on?blue:'#E2E9F3', border:`1px solid ${on?blue:LINE}`, opacity:st.opacity, transform:`scale(${st.scale})`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:MONO, fontSize:13, fontWeight:700, color:on?'#fff':FAINT }}>{String(i+1).padStart(2,'0')}</div>;
          })}
        </div>
        <div style={{ marginTop:14, fontFamily:CJK, fontSize:isPortrait?19:20, fontWeight:700, color:blue }}>▲ {data.position.layerLabel}</div>
      </div>
    </div>
  );
}

// ── ③ 评分卡总览 ─────────────────────────────────────────────────────────
function SceneCard({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = T.card[0]+0.5;
  const url = reveal(time, t0+0.4, { dist:14 });
  const cardRv = reveal(time, t0+1.0, { dist:24 });
  const scoreT = Easing.easeOutCubic(clamp((time-(t0+1.6))/1.6,0,1));
  const scoreVal = (scoreT * data.score).toFixed(1);
  const badge = pop(time, t0+2.2, 0.55);
  const note = reveal(time, t0+3.4, { dist:14 });
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="评分卡 · SCORECARD" color={blue} time={time} at={t0} />
      <div style={{ opacity:url.opacity, transform:`translateY(${url.y}px)`, display:'inline-flex', alignItems:'center', gap:12, background:CARD, border:`1px solid ${LINE}`, borderRadius:999, padding:'12px 24px' }}>
        <div style={{ width:9, height:9, borderRadius:5, background:data.gradeColor }} />
        <div style={{ fontFamily:MONO, fontSize:isPortrait?19:20, color:INK, fontWeight:700 }}>{data.deeplink}</div>
      </div>
      <div style={{ opacity:cardRv.opacity, transform:`translateY(${cardRv.y}px)`, marginTop:26, background:CARD, border:`1px solid ${LINE}`, borderLeft:`4px solid ${data.gradeColor}`, borderRadius:16, padding:isPortrait?'34px 34px':'36px 44px', boxShadow:'0 10px 30px rgba(10,24,40,0.07)', display:'flex', flexDirection:isPortrait?'column':'row', alignItems:isPortrait?'flex-start':'center', gap:isPortrait?26:44 }}>
        <div>
          <div style={{ fontFamily:MONO, fontSize:15, letterSpacing:'0.16em', color:FAINT }}>{data.ticker} · {data.category}</div>
          <div style={{ fontFamily:CJK, fontSize:isPortrait?40:44, fontWeight:700, color:INK, marginTop:8 }}>{data.cnName}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:isPortrait?24:30, marginLeft:isPortrait?0:'auto' }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:DISP, fontWeight:700, fontSize:isPortrait?84:92, color:INK, lineHeight:1 }}>{scoreVal}</div>
            <div style={{ fontFamily:MONO, fontSize:14, color:FAINT, marginTop:6 }}>/ {data.scoreMax} · 六维客观评分</div>
          </div>
          <GradeBadge data={data} size={isPortrait?104:112} popSt={badge} />
        </div>
      </div>
      <div style={{ opacity:note.opacity, transform:`translateY(${note.y}px)`, marginTop:22, fontFamily:CJK, fontSize:isPortrait?21:22, color:MUTE, lineHeight:1.6 }}>{data.cardLine || `六个维度客观打分，不掺主观情绪——一个一个看，你就明白为什么是 ${data.grade}。`}</div>
    </div>
  );
}

// ── ④ 六维逐项拆解 ───────────────────────────────────────────────────────
function SceneDims({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = T.dims[0]+0.5;
  const span = (T.dims[1]-T.dims[0]-6) / data.dims.length; // 每维讲解窗口
  const sumRv = reveal(time, t0 + data.dims.length*span + 0.8, { dist:16 });
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="六维拆解 · SIX DIMENSIONS" color={blue} time={time} at={t0} />
      <div style={{ display:'flex', flexDirection:'column', gap:isPortrait?14:12 }}>
        {data.dims.map((d, i) => {
          const at = t0 + 0.6 + i*span;
          const rv = reveal(time, at, { dist:20 });
          const active = time >= at && time < at + span;
          const done = time >= at + span;
          const fillT = Easing.easeOutCubic(clamp((time-(at+0.3))/1.2,0,1));
          const pct = fillT * (d.score/d.max) * 100;
          const accent = d.weak ? gold : blue;
          return (
            <div key={i} style={{ opacity: rv.opacity * (done && !active ? 0.62 : 1), transform:`translateY(${rv.y}px)`, background:CARD, border:`1px solid ${active?accent:LINE}`, borderLeft:`4px solid ${accent}`, borderRadius:14, padding:isPortrait?'16px 20px':'14px 22px', boxShadow: active?'0 10px 30px rgba(10,24,40,0.10)':'none', transition:'border-color 0.3s' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:14 }}>
                <div style={{ fontFamily:MONO, fontSize:13, color:FAINT, width:22 }}>{i+1}</div>
                <div style={{ fontFamily:CJK, fontSize:isPortrait?21:22, fontWeight:700, color:INK }}>{d.name}</div>
                <div style={{ fontFamily:MONO, fontSize:13, letterSpacing:'0.12em', color:FAINT }}>{d.en}</div>
                {d.weak ? <div style={{ fontFamily:CJK, fontSize:13, fontWeight:700, color:gold, border:`1px solid ${gold}`, borderRadius:999, padding:'2px 10px' }}>短板</div> : null}
                <div style={{ marginLeft:'auto', fontFamily:DISP, fontSize:isPortrait?22:23, fontWeight:700, color:INK }}>{(fillT*d.score).toFixed(1)}<span style={{ fontFamily:MONO, fontSize:14, color:FAINT, fontWeight:400 }}> /{d.max}</span></div>
              </div>
              <div style={{ marginTop:10, height:8, background:'#E7EDF5', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:accent, borderRadius:4 }} />
              </div>
              {active ? <div style={{ marginTop:10, fontFamily:CJK, fontSize:isPortrait?17:18, color:MUTE, lineHeight:1.5 }}>{d.note}</div> : null}
            </div>
          );
        })}
      </div>
      <div style={{ opacity:sumRv.opacity, transform:`translateY(${sumRv.y}px)`, marginTop:isPortrait?18:16, fontFamily:CJK, fontSize:isPortrait?20:21, fontWeight:600, color:INK, lineHeight:1.6 }}>{data.dimsSummary}</div>
    </div>
  );
}

// ── ⑤ 未来空间 ───────────────────────────────────────────────────────────
function SceneFuture({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = T.future[0]+0.5;
  const blocks = [
    { tag:'往上看 · UPSIDE', color:blue, items:data.future.up, at:t0+0.6 },
    { tag:'变量 · WATCH', color:gold, items:data.future.watch, at:t0+2.4 },
  ];
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="未来空间 · 讲逻辑 不讲点位" color={blue} time={time} at={t0} />
      <div style={{ display:'flex', flexDirection:isPortrait?'column':'row', gap:20 }}>
        {blocks.map((b, bi) => {
          const rv = reveal(time, b.at, { dist:22 });
          return (
            <div key={bi} style={{ flex:1, opacity:rv.opacity, transform:`translateY(${rv.y}px)`, background:CARD, border:`1px solid ${LINE}`, borderTop:`4px solid ${b.color}`, borderRadius:16, padding:'26px 28px', boxShadow:'0 10px 30px rgba(10,24,40,0.07)' }}>
              <div style={{ fontFamily:MONO, fontSize:14, letterSpacing:'0.16em', color:b.color, fontWeight:700, marginBottom:18 }}>{b.tag}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {b.items.map((it, i) => {
                  const st = reveal(time, b.at + 0.5 + i*0.6, { dist:14 });
                  return (
                    <div key={i} style={{ opacity:st.opacity, transform:`translateY(${st.y}px)`, display:'flex', gap:12, alignItems:'flex-start' }}>
                      <div style={{ width:8, height:8, borderRadius:4, background:b.color, marginTop:10, flexShrink:0 }} />
                      <div style={{ fontFamily:CJK, fontSize:isPortrait?20:21, color:INK, lineHeight:1.55 }}>{it}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ⑥ 风险 + CTA ─────────────────────────────────────────────────────────
function SceneRisk({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = T.risk[0]+0.5;
  const cta = pop(time, t0+3.2, 0.55);
  const comp = reveal(time, t0+4.0, { dist:10 });
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="核心风险 · RISKS" color={gold} time={time} at={t0} />
      <div style={{ display:'flex', flexDirection:isPortrait?'column':'row', gap:16 }}>
        {data.risks.map((r, i) => {
          const rv = reveal(time, t0+0.6+i*0.8, { dist:20 });
          return (
            <div key={i} style={{ flex:1, opacity:rv.opacity, transform:`translateY(${rv.y}px)`, background:CARD, border:`1px solid ${LINE}`, borderLeft:`4px solid ${gold}`, borderRadius:14, padding:'20px 24px' }}>
              <div style={{ fontFamily:CJK, fontSize:isPortrait?22:23, fontWeight:700, color:INK }}>{r.label}</div>
              <div style={{ fontFamily:CJK, fontSize:isPortrait?17:18, color:MUTE, marginTop:8, lineHeight:1.5 }}>{r.detail}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:isPortrait?54:44, textAlign:'center' }}>
        <div style={{ opacity:cta.opacity, transform:`scale(${cta.scale})`, display:'inline-flex', alignItems:'center', gap:14, background:navy, color:'#fff', borderRadius:999, padding:isPortrait?'18px 30px':'18px 36px' }}>
          <div style={{ fontFamily:CJK, fontSize:isPortrait?21:23, fontWeight:600 }}>{data.cta}</div>
          <div style={{ fontFamily:MONO, fontSize:isPortrait?19:21, color:sky }}>→ {data.deeplink}</div>
        </div>
        <div style={{ opacity:comp.opacity, marginTop:20, fontFamily:MONO, fontSize:13, letterSpacing:'0.1em', color:FAINT }}>不报目标价 · 不构成投资建议 · 数据快照 {data.snapshotDate}</div>
      </div>
    </div>
  );
}

// ── 品牌片尾 ─────────────────────────────────────────────────────────────
function BrandEndcard({ t0, W, H }) {
  const time = useTime();
  const portrait = H > W;
  const lg = pop(time, t0+0.2, 0.6);
  const nm = reveal(time, t0+0.6, { dist:16 });
  const tg = reveal(time, t0+1.0, { dist:14 });
  const ct = reveal(time, t0+1.6, { dist:12 });
  const logoSize = portrait ? 380 : 300;
  return (
    <div style={{ position:'absolute', inset:0, background:navy, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:portrait?34:26 }}>
      <img src={YOYO.logo} alt="" style={{ width:logoSize, height:logoSize, opacity:lg.opacity, transform:`scale(${lg.scale})` }} />
      <div style={{ fontFamily:CJK, fontSize:portrait?72:60, fontWeight:700, color:YOYO.darkInk, opacity:nm.opacity, transform:`translateY(${nm.y}px)` }}>{YOYO.name}</div>
      <div style={{ fontFamily:CJK, fontSize:portrait?34:28, color:sky, opacity:tg.opacity, transform:`translateY(${tg.y}px)` }}>{YOYO.tagline}</div>
      <div style={{ marginTop:portrait?22:14, display:'inline-flex', alignItems:'center', gap:16, background:blue, color:navy, borderRadius:999, padding:portrait?'20px 46px':'16px 38px', opacity:ct.opacity, transform:`translateY(${ct.y}px)` }}>
        <div style={{ fontFamily:CJK, fontSize:portrait?30:25, fontWeight:700 }}>关注 · 点赞 · 转发</div>
      </div>
      <div style={{ position:'absolute', left:0, right:0, bottom:portrait?60:44, textAlign:'center', fontFamily:MONO, fontSize:15, letterSpacing:'0.22em', color:YOYO.darkMute, opacity:ct.opacity }}>GMLABS.AI × YOYO AI DAILY</div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────
function StockVideo({ data, orientation }) {
  if (!data) return null;
  const isPortrait = orientation === 'portrait';
  const W = isPortrait ? 1080 : 1920;
  const H = isPortrait ? 1920 : 1080;
  const contentW = isPortrait ? 940 : 1240;
  const contentX = (W - contentW) / 2;
  const topPad = isPortrait ? 170 : 150;

  return (
    <Stage width={W} height={H} duration={T.DUR} background={BG} persistKey={`sv-${data.ticker}-${orientation}`}>
      <Sprite start={T.pos[0]} end={T.risk[1]}><Hud data={data} contentX={contentX} isPortrait={isPortrait} /></Sprite>
      <Sprite start={T.hook[0]} end={T.hook[1]}><SceneFade start={T.hook[0]} end={T.hook[1]}><SceneHook data={data} W={W} isPortrait={isPortrait} /></SceneFade></Sprite>
      <Sprite start={T.pos[0]} end={T.pos[1]}><SceneFade start={T.pos[0]} end={T.pos[1]}><ScenePosition data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={T.card[0]} end={T.card[1]}><SceneFade start={T.card[0]} end={T.card[1]}><SceneCard data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={T.dims[0]} end={T.dims[1]}><SceneFade start={T.dims[0]} end={T.dims[1]}><SceneDims data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={T.future[0]} end={T.future[1]}><SceneFade start={T.future[0]} end={T.future[1]}><SceneFuture data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={T.risk[0]} end={T.risk[1]}><SceneFade start={T.risk[0]} end={T.risk[1]}><SceneRisk data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={T.end[0]} end={T.DUR}><SceneFade start={T.end[0]} end={T.DUR}><BrandEndcard t0={T.end[0]} W={W} H={H} /></SceneFade></Sprite>
    </Stage>
  );
}

module.exports = { StockVideo };
window.StockVideo = StockVideo;

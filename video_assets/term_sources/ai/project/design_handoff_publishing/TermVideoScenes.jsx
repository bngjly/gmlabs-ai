
// ════════════════════════════════════════════════════════════════════════
//  TermVideoScenes.jsx — 通用「术语科普短视频」引擎
//  由 animations.jsx 核心 + 数据驱动的通用分镜组成。
//  用法： <x-import component="TermVideo" from="./TermVideoScenes.jsx"
//                    data="{{ termData }}" orientation="landscape" hint-size="100%,100%">
// ════════════════════════════════════════════════════════════════════════

// ── Easing (same as animations.jsx starter) ────────────────────────────────
const Easing = {
  linear: (t) => t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInCubic: (t) => t * t * t,
  easeOutBack: (t) => { const c1=1.70158, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); },
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

  return (
    <div ref={stageRef} style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', background:'#0a0a0a', fontFamily:'Inter, system-ui, sans-serif' }}>
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
          <div style={{ position:'absolute', left:0, top:9, width:`${pct}%`, height:4, background:'oklch(72% 0.12 250)', borderRadius:2 }} />
        </div>
      </div>
    </div>
  );
}

// ── shared visual tokens ────────────────────────────────────────────────
const INK='#050F1E', MUTE='#46586E', FAINT='#93A1B4', BG='#EEF1F7', CARD='#ffffff', LINE='#DCE3ED';
const DISP="'Space Grotesk','PingFang SC','Microsoft YaHei',sans-serif";
const CJK="'PingFang SC','Microsoft YaHei','Space Grotesk',sans-serif";
const MONO="'JetBrains Mono',ui-monospace,monospace";

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

// ── HUD ──────────────────────────────────────────────────────────────────
function Hud({ data, contentX, isPortrait }) {
  const time = useTime();
  const rv = reveal(time, 0.3, { dist:0, dur:0.5 });
  return (
    <div style={{ position:'absolute', inset:0, opacity:rv.opacity, pointerEvents:'none' }}>
      <div style={{ position:'absolute', left:contentX, top: isPortrait?56:50, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:11, height:11, borderRadius:6, background:data.color }} />
        <div style={{ fontFamily:MONO, fontSize:isPortrait?13:14, letterSpacing:'0.12em', color:MUTE }}>{data.category}</div>
      </div>
      <div style={{ position:'absolute', right:contentX, top: isPortrait?56:50, fontFamily:MONO, fontSize:isPortrait?13:14, color:FAINT, letterSpacing:'0.14em' }}>GMLABS.AI</div>
      <div style={{ position:'absolute', left:contentX, right:contentX, top: isPortrait?90:84, height:1, background:LINE }} />
    </div>
  );
}

// ── S0 Title ─────────────────────────────────────────────────────────────
function SceneTitle({ data, contentX, contentW, isPortrait }) {
  const time = useTime();
  const chip = reveal(time, 0.5, { dist:14 });
  const en = pop(time, 1.0, 0.6);
  const cn = reveal(time, 1.6, { dist:20 });
  const hook = reveal(time, 2.3, { dist:14 });
  const ln = clamp((time-2.1)/0.6,0,1);
  return (
    <div style={{ position:'absolute', left:contentX, top:0, width:contentW, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
      <div style={{ opacity:chip.opacity, transform:`translateY(${chip.y}px)`, display:'inline-flex', alignItems:'center', gap:10, background:CARD, border:`1px solid ${LINE}`, borderRadius:999, padding:'8px 20px' }}>
        <div style={{ width:9, height:9, borderRadius:5, background:data.color }} />
        <div style={{ fontFamily:CJK, fontSize:isPortrait?16:17, color:MUTE, fontWeight:600 }}>{data.category}</div>
      </div>
      <div style={{ opacity:en.opacity, transform:`scale(${en.scale})`, fontFamily:DISP, fontWeight:700, fontSize:isPortrait?96:120, color:INK, letterSpacing:'-0.02em', marginTop:isPortrait?42:36 }}>{data.enName}</div>
      <div style={{ width:ln*(isPortrait?260:320), height:3, background:data.color, margin:'22px auto 0', borderRadius:2 }} />
      <div style={{ opacity:cn.opacity, transform:`translateY(${cn.y}px)`, fontFamily:CJK, fontWeight:700, fontSize:isPortrait?38:44, color:INK, marginTop:26 }}>{data.cnName}</div>
      <div style={{ opacity:hook.opacity, transform:`translateY(${hook.y}px)`, fontFamily:CJK, fontSize:isPortrait?24:27, color:MUTE, marginTop:20, lineHeight:1.5, maxWidth:contentW*0.86 }}>{data.hook}</div>
    </div>
  );
}

function Kicker({ text, color, time, at, topPad }) {
  const rv = reveal(time, at, { dist:14 });
  return (
    <div style={{ opacity:rv.opacity, transform:`translateY(${rv.y}px)`, display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
      <div style={{ width:10, height:10, borderRadius:6, background:color }} />
      <div style={{ fontFamily:MONO, fontSize:15, letterSpacing:'0.2em', color:MUTE, textTransform:'uppercase' }}>{text}</div>
    </div>
  );
}

// ── S1 Definition ────────────────────────────────────────────────────────
function SceneDefinition({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = 6.0;
  const kick = reveal(time, t0, { dist:14 });
  const def = reveal(time, t0+0.5, { dist:20 });
  const met = reveal(time, t0+1.4, { dist:20 });
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <div style={{ opacity:kick.opacity, transform:`translateY(${kick.y}px)` }}>
        <Kicker text="是什么 · WHAT IS IT" color={data.color} time={time} at={t0} />
      </div>
      <div style={{ opacity:def.opacity, transform:`translateY(${def.y}px)`, fontFamily:CJK, fontSize:isPortrait?32:38, fontWeight:600, color:INK, lineHeight:1.6, textWrap:'pretty' }}>
        {data.definition}
      </div>
      <div style={{ opacity:met.opacity, transform:`translateY(${met.y}px)`, marginTop:isPortrait?48:44, background:CARD, border:`1px solid ${LINE}`, borderLeft:`4px solid ${data.color}`, borderRadius:14, padding:'22px 28px' }}>
        <div style={{ fontFamily:CJK, fontSize:isPortrait?21:23, color:MUTE, lineHeight:1.6, fontStyle:'italic' }}>「{data.metaphor}」</div>
      </div>
    </div>
  );
}

// ── S2 How it works (flow or compare) ───────────────────────────────────
function StepChip({ label, sub, color, st, w }) {
  return (
    <div style={{ opacity:st.opacity, transform:`scale(${st.scale})`, transformOrigin:'center', width:w, background:CARD, border:`1px solid ${LINE}`, borderTop:`4px solid ${color}`, borderRadius:14, padding:'18px 20px', textAlign:'center', boxShadow:'0 8px 24px rgba(10,24,40,0.06)' }}>
      <div style={{ fontFamily:CJK, fontSize:20, fontWeight:700, color:INK }}>{label}</div>
      {sub ? <div style={{ fontFamily:CJK, fontSize:14, color:MUTE, marginTop:6, lineHeight:1.4 }}>{sub}</div> : null}
    </div>
  );
}
function Arrow({ vertical, color, opacity }) {
  return vertical ? (
    <div style={{ opacity, display:'flex', justifyContent:'center', padding:'6px 0' }}>
      <div style={{ fontFamily:MONO, fontSize:22, color }}>↓</div>
    </div>
  ) : (
    <div style={{ opacity, display:'flex', alignItems:'center', padding:'0 6px' }}>
      <div style={{ fontFamily:MONO, fontSize:22, color }}>→</div>
    </div>
  );
}
function SceneHow({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = 18.0;
  const items = data.flow || (data.compare ? [] : []);
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="怎么运作 · HOW IT WORKS" color={data.color} time={time} at={t0} />
      {data.flow ? (
        <div style={{ display:'flex', flexDirection: isPortrait ? 'column' : 'row', alignItems:'center', gap:0, flexWrap:'wrap' }}>
          {data.flow.map((step, i) => {
            const st = pop(time, t0 + 0.6 + i*0.55, 0.5);
            const arrowOp = clamp((time - (t0 + 1.0 + i*0.55)) / 0.4, 0, 1);
            return (
              <React.Fragment key={i}>
                <StepChip label={step.label} sub={step.sub} color={data.color} st={st} w={isPortrait ? contentW : (contentW-3*40)/4} />
                {i < data.flow.length - 1 ? <Arrow vertical={isPortrait} color={FAINT} opacity={arrowOp} /> : null}
              </React.Fragment>
            );
          })}
        </div>
      ) : null}
      {data.compare ? (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {[{ tag:data.compare.beforeLabel, steps:data.compare.before, dim:true },
            { tag:data.compare.afterLabel, steps:data.compare.after, dim:false }].map((block, bi) => {
            const st = reveal(time, t0 + 0.6 + bi*1.8, { dist:20 });
            return (
              <div key={bi} style={{ opacity:st.opacity, transform:`translateY(${st.y}px)`, marginBottom: bi===0 ? 18 : 0 }}>
                <div style={{ fontFamily:CJK, fontSize:16, fontWeight:700, color: block.dim ? FAINT : data.color, marginBottom:10, letterSpacing:'0.02em' }}>
                  {block.dim ? '传统方案' : '新方案'} · {block.tag}
                </div>
                <div style={{ display:'flex', flexDirection: isPortrait ? 'column' : 'row', gap:10, flexWrap:'wrap' }}>
                  {block.steps.map((s, si) => (
                    <div key={si} style={{ flex: isPortrait ? 'none' : 1, background: block.dim ? '#E7EDF5' : CARD, border:`1px solid ${LINE}`, borderTop:`3px solid ${block.dim ? FAINT : data.color}`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                      <div style={{ fontFamily:CJK, fontSize:isPortrait?18:17, fontWeight:600, color: block.dim ? MUTE : INK }}>{s}</div>
                    </div>
                  ))}
                </div>
                {bi===0 ? <div style={{ textAlign:'center', margin:'16px 0', fontFamily:MONO, fontSize:20, color:data.color }}>⇩ 变为</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ── S3 Why it matters ────────────────────────────────────────────────────
function SceneWhy({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = 34.0;
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="为什么重要 · WHY IT MATTERS" color={data.color} time={time} at={t0} />
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {data.whyMatters.map((pt, i) => {
          const rv = reveal(time, t0 + 0.6 + i*0.9, { dist:22 });
          return (
            <div key={i} style={{ opacity:rv.opacity, transform:`translateY(${rv.y}px)`, display:'flex', gap:16, background:CARD, border:`1px solid ${LINE}`, borderRadius:14, padding:'18px 22px', alignItems:'flex-start' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:data.color, color:'#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:MONO, fontWeight:700, fontSize:16 }}>{i+1}</div>
              <div>
                <div style={{ fontFamily:CJK, fontSize:isPortrait?21:22, fontWeight:700, color:INK }}>{pt.label}</div>
                <div style={{ fontFamily:CJK, fontSize:isPortrait?17:18, color:MUTE, marginTop:6, lineHeight:1.5 }}>{pt.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── S4 Players ────────────────────────────────────────────────────────────
function SceneWho({ data, contentX, contentW, isPortrait, topPad }) {
  const time = useTime();
  const t0 = 46.0;
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="谁在做 · WHO'S BUILDING IT" color={data.color} time={time} at={t0} />
      <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
        {data.players.map((p, i) => {
          const st = pop(time, t0 + 0.5 + i*0.18, 0.45);
          return (
            <div key={i} style={{ opacity:st.opacity, transform:`scale(${st.scale})`, transformOrigin:'center', background:CARD, border:`1px solid ${LINE}`, borderRadius:999, padding:'12px 22px', fontFamily:CJK, fontSize:isPortrait?18:19, fontWeight:600, color:INK, boxShadow:'0 4px 14px rgba(10,24,40,0.05)' }}>{p}</div>
          );
        })}
      </div>
    </div>
  );
}

// ── S5 CTA ────────────────────────────────────────────────────────────────
function SceneCTA({ data, contentX, contentW, isPortrait, W }) {
  const time = useTime();
  const t0 = 52.0;
  const tag = reveal(time, t0, { dist:14 });
  const cta = pop(time, t0 + 0.5, 0.55);
  return (
    <div style={{ position:'absolute', left:0, top:0, width:W, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
      <div style={{ opacity:tag.opacity, transform:`translateY(${tag.y}px)`, fontFamily:CJK, fontSize:isPortrait?20:22, color:MUTE }}>
        这只是 <span style={{ color:data.color, fontWeight:700 }}>AI 产业链全景图谱</span> 的一个环节
      </div>
      <div style={{ opacity:cta.opacity, transform:`scale(${cta.scale})`, marginTop:28, display:'inline-flex', alignItems:'center', gap:14, background:INK, color:'#fff', borderRadius:999, padding: isPortrait ? '18px 30px' : '18px 36px' }}>
        <div style={{ fontFamily:CJK, fontSize:isPortrait?22:24, fontWeight:600 }}>查看完整图谱</div>
        <div style={{ fontFamily:MONO, fontSize:isPortrait?20:22, color:'oklch(0.78 0.13 255)' }}>→ gmlabs.ai</div>
      </div>
      <div style={{ opacity:cta.opacity, marginTop:26, fontFamily:MONO, fontSize:14, color:FAINT, letterSpacing:'0.12em' }}>{data.category}</div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────
function TermVideo({ data, orientation }) {
  const isPortrait = orientation === 'portrait';
  const W = isPortrait ? 1080 : 1920;
  const H = isPortrait ? 1920 : 1080;
  const contentW = isPortrait ? 900 : 1160;
  const contentX = (W - contentW) / 2;
  const topPad = isPortrait ? 150 : 140;
  const DUR = 57;

  return (
    <Stage width={W} height={H} duration={DUR} background={BG} persistKey={`tv-${data.enName}-${orientation}`}>
      <Hud data={data} contentX={contentX} isPortrait={isPortrait} />
      <Sprite start={0} end={6.0}><SceneFade start={0} end={6.0}><SceneTitle data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} /></SceneFade></Sprite>
      <Sprite start={6.0} end={18.0}><SceneFade start={6.0} end={18.0}><SceneDefinition data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={18.0} end={34.0}><SceneFade start={18.0} end={34.0}><SceneHow data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={34.0} end={46.0}><SceneFade start={34.0} end={46.0}><SceneWhy data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={46.0} end={52.0}><SceneFade start={46.0} end={52.0}><SceneWho data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} topPad={topPad} /></SceneFade></Sprite>
      <Sprite start={52.0} end={DUR}><SceneFade start={52.0} end={DUR}><SceneCTA data={data} contentX={contentX} contentW={contentW} isPortrait={isPortrait} W={W} /></SceneFade></Sprite>
    </Stage>
  );
}

module.exports = { TermVideo };
window.TermVideo = TermVideo;


// ════════════════════════════════════════════════════════════════════════
//  V2 术语科普引擎 — 共享部分（Stage + 章节骨架 + YoYoAI 标识）
// ════════════════════════════════════════════════════════════════════════
const Easing = {
  linear: (t) => t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInCubic: (t) => t * t * t,
  easeInOutCubic: (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2,
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
    <div ref={stageRef} style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', background:'#0a0a0a' }}>
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

// ── tokens ──────────────────────────────────────────────────────────────
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
function slide(time, at, { dur=0.7, from=80 } = {}) {
  const t = clamp((time-at)/dur,0,1); const e = Easing.easeInOutCubic(t);
  return { opacity: clamp(t*2,0,1), off: (1-e)*from };
}
function SceneFade({ start, end, children }) {
  const time = useTime();
  const fin = clamp((time-start)/0.4,0,1);
  const fout = 1 - clamp((time-(end-0.45))/0.45,0,1);
  return <div style={{ position:'absolute', inset:0, opacity:Math.min(fin,fout) }}>{children}</div>;
}
function FlowDots({ x, y, len, vertical, time, color, count=5, speed=1.5, size=8 }) {
  return (
    <div style={{ position:'absolute', left:x, top:y }}>
      {Array.from({length:count}).map((_,i)=>{
        const p = ((time*speed)+i/count)%1;
        return <div key={i} style={{ position:'absolute', left:vertical?0:p*len, top:vertical?p*len:0, width:size, height:size, borderRadius:size, background:color, opacity:0.25+0.75*Math.sin(p*Math.PI) }} />;
      })}
    </div>
  );
}

// ── YoYoAI logo (auto-swaps to yoyoai-logo.png when the file exists) ────
function YoyoLogo({ size = 30 }) {
  const [imgOk, setImgOk] = React.useState(true);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
      {imgOk
        ? <img src="assets/yoyo_ai_800.png" alt="" onError={()=>setImgOk(false)} style={{ height:size, display:'block' }} />
        : <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:size, height:size, borderRadius:size*0.32, background:INK, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:DISP, fontWeight:700, fontSize:size*0.44 }}>yo</div>
            <div style={{ fontFamily:DISP, fontWeight:700, fontSize:size*0.6, color:INK, letterSpacing:'-0.01em' }}>YoYoAI</div>
          </div>}
    </div>
  );
}

// ── chrome: HUD + progress chapters ─────────────────────────────────────
function Hud({ term, chapters }) {
  const time = useTime();
  const rv = reveal(time, 0.3, { dist:0, dur:0.5 });
  let active = 0;
  chapters.forEach((c,i)=>{ if (time >= c.at) active = i; });
  return (
    <div style={{ position:'absolute', inset:0, opacity:rv.opacity, pointerEvents:'none' }}>
      <div style={{ position:'absolute', left:90, top:48 }}><YoyoLogo /></div>
      <div style={{ position:'absolute', right:90, top:52, fontFamily:MONO, fontSize:14, color:FAINT, letterSpacing:'0.14em' }}>YOYO AI 日报 · {term.enName}</div>
      <div style={{ position:'absolute', left:90, right:90, top:96, height:1, background:LINE }} />
      {/* chapter dots bottom */}
      <div style={{ position:'absolute', left:0, right:0, bottom:38, display:'flex', justifyContent:'center', gap:26 }}>
        {chapters.map((c,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, opacity: i===active?1:0.4 }}>
            <div style={{ width:9, height:9, borderRadius:5, background: i===active?term.color:FAINT }} />
            <div style={{ fontFamily:CJK, fontSize:15, fontWeight:i===active?700:400, color: i===active?INK:MUTE }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── S0 hook — a provocative question ────────────────────────────────────
function SceneHook({ term }) {
  const time = useTime();
  const q = reveal(time, 0.5, { dist:26 });
  const en = pop(time, 1.6, 0.6);
  const ans = reveal(time, 2.4, { dist:16 });
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
      <div style={{ opacity:q.opacity, transform:`translateY(${q.y}px)`, fontFamily:CJK, fontSize:58, fontWeight:700, color:INK, lineHeight:1.35, maxWidth:1280, letterSpacing:'-0.01em', textWrap:'pretty' }}>{term.hookQ}</div>
      <div style={{ opacity:en.opacity, transform:`scale(${en.scale})`, marginTop:44, display:'flex', alignItems:'baseline', gap:20 }}>
        <div style={{ fontFamily:DISP, fontSize:96, fontWeight:700, color:term.color, letterSpacing:'-0.02em' }}>{term.enName}</div>
        <div style={{ fontFamily:CJK, fontSize:36, fontWeight:700, color:INK }}>{term.cnName}</div>
      </div>
      <div style={{ opacity:ans.opacity, transform:`translateY(${ans.y}px)`, marginTop:24, fontFamily:CJK, fontSize:26, color:MUTE }}>{term.hookA}</div>
    </div>
  );
}

// ── chapter title strip (left) ──────────────────────────────────────────
function ChapterHead({ time, at, no, title, color }) {
  const rv = reveal(time, at, { dist:14 });
  return (
    <div style={{ position:'absolute', left:90, top:136, opacity:rv.opacity, transform:`translateY(${rv.y}px)`, display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ fontFamily:MONO, fontSize:15, color:'#fff', background:color, borderRadius:8, padding:'4px 10px', fontWeight:700 }}>{no}</div>
      <div style={{ fontFamily:CJK, fontSize:34, fontWeight:700, color:INK, letterSpacing:'-0.01em' }}>{title}</div>
    </div>
  );
}

// ── takeaway scene — 3 numbers/points ───────────────────────────────────
function SceneWhy({ term, t0 }) {
  const time = useTime();
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <ChapterHead time={time} at={t0} no="03" title="为什么重要" color={term.color} />
      <div style={{ position:'absolute', left:90, right:90, top:300, display:'flex', gap:28 }}>
        {term.why.map((w,i)=>{
          const st = pop(time, t0+0.5+i*0.7, 0.55);
          return (
            <div key={i} style={{ flex:1, opacity:st.opacity, transform:`scale(${st.scale})`, transformOrigin:'center', background:CARD, border:`1px solid ${LINE}`, borderTop:`5px solid ${term.color}`, borderRadius:18, padding:'34px 34px 30px', boxShadow:'0 12px 34px rgba(10,24,40,0.07)' }}>
              <div style={{ fontFamily:DISP, fontSize:56, fontWeight:700, color:term.color, letterSpacing:'-0.02em', lineHeight:1 }}>{w.stat}</div>
              <div style={{ fontFamily:CJK, fontSize:24, fontWeight:700, color:INK, marginTop:16 }}>{w.label}</div>
              <div style={{ fontFamily:CJK, fontSize:18, color:MUTE, marginTop:10, lineHeight:1.55 }}>{w.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CTA ─────────────────────────────────────────────────────────────────
function SceneCTA({ term, t0 }) {
  const time = useTime();
  const tag = reveal(time, t0+0.2, { dist:14 });
  const cta = pop(time, t0+0.8, 0.55);
  const lg = reveal(time, t0+1.4, { dist:10 });
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
      <div style={{ opacity:tag.opacity, transform:`translateY(${tag.y}px)`, fontFamily:CJK, fontSize:26, color:MUTE }}>
        <span style={{ color:term.color, fontWeight:700 }}>{term.enName}</span> 只是 AI 产业链全景图谱的一环
      </div>
      <div style={{ opacity:cta.opacity, transform:`scale(${cta.scale})`, marginTop:30, display:'inline-flex', alignItems:'center', gap:16, background:INK, color:'#fff', borderRadius:999, padding:'20px 42px' }}>
        <div style={{ fontFamily:CJK, fontSize:28, fontWeight:600 }}>关注 · 点赞 · 转发</div>
        <div style={{ fontFamily:MONO, fontSize:26, color:'oklch(0.78 0.13 255)' }}>→ YoYo AI 日报</div>
      </div>
      <div style={{ opacity:lg.opacity, transform:`translateY(${lg.y}px)`, marginTop:40 }}><YoyoLogo size={26} /></div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════
//  CPO v2 — 机理动画：可插拔光模块 vs 共封装光学 对比
// ════════════════════════════════════════════════════════════════════════
const TERM = {
  enName:'CPO', cnName:'共封装光学', color:'oklch(0.60 0.15 245)',
  hookQ:'数据中心里，电信号出了芯片\n要先走一段“最贵的冤枉路”',
  hookA:'Co-Packaged Optics · 把光引擎焊到交换芯片旁边',
  why:[
    { stat:'-30%+', label:'互联功耗', detail:'省掉长距离电走线和信号补偿，端口功耗可显著下降——万卡集群省的是兆瓦级的电' },
    { stat:'更高密度', label:'带宽塞得更满', detail:'不再受面板插槽限制，同样体积能引出更多光通道，适配 1.6T/3.2T 时代' },
    { stat:'仍在早期', label:'产业正在押注', detail:'交换芯片巨头已发布 CPO 交换机，但可维护性和生态仍在磨合——是图谱上的关键变量' },
  ],
};
const CHAPTERS = [
  { at:0, label:'问题' }, { at:6, label:'传统方案' }, { at:17, label:'CPO 方案' }, { at:28, label:'对比' }, { at:36, label:'为什么重要' }, { at:47, label:'查看图谱' },
];

// a switch board diagram, mode = 'pluggable' | 'cpo'
function SwitchBoard({ mode, time, t0, y, dim }) {
  const isCPO = mode==='cpo';
  const color = isCPO ? TERM.color : FAINT;
  const asic = pop(time, t0+0.4, 0.55);
  const traceT = clamp((time-(t0+1.2))/1.0, 0, 1);
  const modT = pop(time, t0+2.0, 0.5);
  const flowOn = time >= t0+2.6;
  const boardX = 160, boardW = 1180, asicX = boardX+ (isCPO? 430 : 60), asicW = 220;
  const heat = !isCPO && flowOn ? clamp((time-(t0+3.0))/1.0,0,1) : 0;
  return (
    <div style={{ position:'absolute', left:0, top:y, width:1920, height:300, opacity:dim?0.45:1 }}>
      {/* board */}
      <div style={{ position:'absolute', left:boardX, top:60, width:boardW, height:180, background:'#e7ecdf', border:'3px solid #7a8a6a', borderRadius:16 }} />
      <div style={{ position:'absolute', left:boardX+18, top:74, fontFamily:MONO, fontSize:13, letterSpacing:'0.12em', color:'#66755a' }}>
        {isCPO ? 'CPO SWITCH' : 'TRADITIONAL SWITCH'}
      </div>
      {/* ASIC */}
      <div style={{ position:'absolute', left:asicX, top:110, width:asicW, height:90, opacity:asic.opacity, transform:`scale(${asic.scale})`,
        background:'#F7FAFD', border:`3px solid ${isCPO?TERM.color:'#8a8578'}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:DISP, fontSize:26, fontWeight:700, color:INK }}>交换 ASIC</div>
      {isCPO ? (
        <>
          {/* light engines flanking asic */}
          {[asicX-96, asicX+asicW+16].map((x,i)=>(
            <div key={i} style={{ position:'absolute', left:x, top:122, width:80, height:66, opacity:modT.opacity, transform:`scale(${modT.scale})`,
              background:TERM.color, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:CJK, fontSize:14, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1.25 }}>光引擎</div>
          ))}
          {/* fibers out */}
          {flowOn ? <>
            <div style={{ position:'absolute', left:boardX-120, top:150, width:asicX-96-(boardX-120), height:4, background:`linear-gradient(90deg, transparent, ${TERM.color})`, borderRadius:2 }} />
            <div style={{ position:'absolute', left:asicX+asicW+96, top:150, width:boardX+boardW+120-(asicX+asicW+96), height:4, background:`linear-gradient(90deg, ${TERM.color}, transparent)`, borderRadius:2 }} />
            <FlowDots x={asicX+asicW+96} y={148} len={boardX+boardW+110-(asicX+asicW+96)} time={time} color={TERM.color} count={6} speed={2.2} size={8} />
          </> : null}
          <div style={{ position:'absolute', left:boardX+boardW+40, top:180, fontFamily:CJK, fontSize:17, fontWeight:700, color:TERM.color, opacity:flowOn?1:0 }}>直接出光纤</div>
        </>
      ) : (
        <>
          {/* long copper trace to panel module */}
          <div style={{ position:'absolute', left:asicX+asicW, top:150, width:traceT*(boardW-asicW-260), height:5, background:'#c07840', borderRadius:3 }} />
          {/* pluggable module at panel */}
          <div style={{ position:'absolute', left:boardX+boardW-160, top:118, width:130, height:74, opacity:modT.opacity, transform:`scale(${modT.scale})`,
            background:'#4a463c', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:CJK, fontSize:14, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1.3 }}>可插拔<br/>光模块</div>
          {/* weak electric dots along copper */}
          {flowOn ? <FlowDots x={asicX+asicW} y={148} len={boardW-asicW-280} time={time} color={'#c07840'} count={7} speed={0.7} size={8} /> : null}
          {/* heat + loss badges */}
          <div style={{ position:'absolute', left:asicX+asicW+220, top:80, opacity:heat, display:'flex', gap:12 }}>
            <div style={{ background:'oklch(0.62 0.19 25)', color:'#fff', borderRadius:9, padding:'6px 14px', fontFamily:CJK, fontSize:16, fontWeight:700 }}>信号衰减</div>
            <div style={{ background:'oklch(0.7 0.16 65)', color:'#fff', borderRadius:9, padding:'6px 14px', fontFamily:CJK, fontSize:16, fontWeight:700 }}>发热 · 耗电</div>
          </div>
          <div style={{ position:'absolute', left:asicX+asicW+90, top:196, fontFamily:CJK, fontSize:17, color:'#a06430', opacity:flowOn?1:0 }}>电信号走很长的铜线，一路衰减，还要芯片补偿</div>
        </>
      )}
    </div>
  );
}

function SceneOld({ t0 }) {
  const time = useTime();
  const cap = reveal(time, t0+3.6, { dist:16 });
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <ChapterHead time={time} at={t0} no="02" title="传统方案 · 光模块插在机箱面板上" color={'#8a8578'} />
      <SwitchBoard mode="pluggable" time={time} t0={t0} y={330} dim={false} />
      <div style={{ position:'absolute', left:160, top:720, width:1500, opacity:cap.opacity, transform:`translateY(${cap.y}px)`, fontFamily:CJK, fontSize:30, fontWeight:600, color:INK, lineHeight:1.6 }}>
        芯片到光模块之间这段铜线，成了 800G 之后<span style={{ color:'oklch(0.55 0.19 25)', fontWeight:700 }}>最耗电、最难跑通</span>的一段路
      </div>
    </div>
  );
}
function SceneNew({ t0 }) {
  const time = useTime();
  const cap = reveal(time, t0+3.6, { dist:16 });
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <ChapterHead time={time} at={t0} no="03" title="CPO · 把光引擎搬到芯片旁边" color={TERM.color} />
      <SwitchBoard mode="cpo" time={time} t0={t0} y={330} dim={false} />
      <div style={{ position:'absolute', left:160, top:720, width:1500, opacity:cap.opacity, transform:`translateY(${cap.y}px)`, fontFamily:CJK, fontSize:30, fontWeight:600, color:INK, lineHeight:1.6 }}>
        电信号<span style={{ color:TERM.color, fontWeight:700 }}>几毫米内就转成光</span>——衰减、补偿、发热的问题一起消失
      </div>
    </div>
  );
}
function SceneCompare({ t0 }) {
  const time = useTime();
  const lab1 = reveal(time, t0+0.3, { dist:12 });
  const lab2 = reveal(time, t0+1.0, { dist:12 });
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <ChapterHead time={time} at={t0} no="04" title="放在一起看" color={TERM.color} />
      <div style={{ position:'absolute', left:160, top:212, fontFamily:CJK, fontSize:20, fontWeight:700, color:MUTE, opacity:lab1.opacity }}>传统 · 可插拔</div>
      <SwitchBoard mode="pluggable" time={time} t0={t0-2.4} y={240} dim={true} />
      <div style={{ position:'absolute', left:160, top:590, fontFamily:CJK, fontSize:20, fontWeight:700, color:TERM.color, opacity:lab2.opacity }}>CPO · 共封装</div>
      <SwitchBoard mode="cpo" time={time} t0={t0-2.0} y={618} dim={false} />
    </div>
  );
}

function TermRoot() {
  return (
    <Stage width={1920} height={1080} duration={53} background={BG} persistKey="cpo-v2">
      <Hud term={TERM} chapters={CHAPTERS} />
      <Sprite start={0} end={6}><SceneFade start={0} end={6}><SceneHook term={TERM} /></SceneFade></Sprite>
      <Sprite start={6} end={17}><SceneFade start={6} end={17}><SceneOld t0={6} /></SceneFade></Sprite>
      <Sprite start={17} end={28}><SceneFade start={17} end={28}><SceneNew t0={17} /></SceneFade></Sprite>
      <Sprite start={28} end={36}><SceneFade start={28} end={36}><SceneCompare t0={28} /></SceneFade></Sprite>
      <Sprite start={36} end={47}><SceneFade start={36} end={47}><SceneWhy term={TERM} t0={36} /></SceneFade></Sprite>
      <Sprite start={47} end={53.1}><SceneFade start={47} end={53.2}><SceneCTA term={TERM} t0={47} /></SceneFade></Sprite>
    </Stage>
  );
}
module.exports = { CPOV2: TermRoot };
window.CPOV2 = TermRoot;

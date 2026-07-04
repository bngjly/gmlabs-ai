
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
//  CoWoS v2 — 机理动画：逐层堆叠 Chip-on-Wafer-on-Substrate
// ════════════════════════════════════════════════════════════════════════
const TERM = {
  enName:'CoWoS', cnName:'芯粒堆叠封装', color:'oklch(0.64 0.19 35)',
  hookQ:'为什么全世界都缺 AI 芯片？\n瓶颈往往不在芯片本身，而在“怎么把它拼起来”',
  hookA:'Chip on Wafer on Substrate · 台积电的先进封装技术',
  why:[
    { stat:'≈10×', label:'布线密度', detail:'硅中介层的走线远比普通电路板致密，GPU 和 HBM 之间才能有上千条数据通道' },
    { stat:'产能瓶颈', label:'决定出货量', detail:'旗舰 AI GPU 都要排队等 CoWoS 产能——芯片造好了，封不出来也白搭' },
    { stat:'一步报废', label:'高风险高价值', detail:'封装失误报废的是整颗昂贵裸片，良率是这门生意的生命线' },
  ],
};
const CHAPTERS = [
  { at:0,  label:'问题' }, { at:6, label:'逐层拼装' }, { at:34, label:'为什么重要' }, { at:46, label:'查看图谱' },
];

// layered assembly: substrate → interposer → GPU + HBM → data flow
function SceneAssembly({ t0 }) {
  const time = useTime();
  const cx = 620, baseY = 700;      // assembly center
  // step times
  const tSub = t0 + 0.8, tInt = t0 + 4.2, tGpu = t0 + 8.2, tHbm = t0 + 11.2, tWire = t0 + 15.5, tFlow = t0 + 18.0;
  const sub = slide(time, tSub, { from:120 });
  const intp = slide(time, tInt, { from:-160 });
  const gpu  = slide(time, tGpu, { from:-200 });
  const wireOp = clamp((time - tWire) / 0.8, 0, 1);
  const flowOn = time >= tFlow;
  const captions = [
    { at:tSub,  text:'① 封装基板 Substrate — 一切的地基',                          color:'#3f7a4f' },
    { at:tInt,  text:'② 铺上一层“硅中介层” Interposer — 纳米级布线的立交桥',        color:'#8a7a3e' },
    { at:tGpu,  text:'③ GPU 裸片放上去（Chip on Wafer）',                           color:'oklch(0.55 0.19 25)' },
    { at:tHbm,  text:'④ 两侧放 HBM 内存堆栈 — 一层层 DRAM 垂直堆起来',              color:'oklch(0.6 0.16 65)' },
    { at:tWire, text:'⑤ 中介层里上千条微米级导线，把 GPU 和 HBM 直连',              color:'oklch(0.5 0.15 250)' },
    { at:tFlow, text:'= 一颗 AI 超级芯片。这就是 CoWoS', color:'#050F1E', big:true },
  ];
  // active caption = last started
  let cap = null;
  for (const c of captions) if (time >= c.at) cap = c;

  const hbmLayer = (side, i) => {   // stacked DRAM layers appearing one by one
    const at = tHbm + 0.5 + i*0.35;
    const st = reveal(time, at, { dist:30, dur:0.4 });
    return (
      <div key={side+'-'+i} style={{ position:'absolute', left: side==='l' ? cx-338 : cx+188, top: baseY-176-i*34, width:150, height:28,
        opacity:st.opacity, transform:`translateY(${st.y}px)`,
        background: i===0 ? 'oklch(0.55 0.12 65)' : 'oklch(0.78 0.11 65)', border:'2px solid oklch(0.5 0.13 65)', borderRadius:6,
        display:'flex', alignItems:'center', justifyContent:'center', fontFamily:MONO, fontSize:11, color: i===0?'#fff':'#6b5322' }}>
        {i===0?'逻辑层':'DRAM'}
      </div>
    );
  };

  return (
    <div style={{ position:'absolute', inset:0 }}>
      <ChapterHead time={time} at={t0} no="02" title="一颗超级芯片是怎么拼出来的" color={TERM.color} />

      {/* assembly area */}
      <div style={{ position:'absolute', left:0, top:0, width:1240, height:1080 }}>
        {/* substrate */}
        <div style={{ position:'absolute', left:cx-430, top:baseY, width:860, height:74, opacity:sub.opacity, transform:`translateY(${sub.off}px)`,
          background:'#dde8d8', border:'3px solid #3f7a4f', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:CJK, fontSize:22, fontWeight:700, color:'#2e5c3a' }}>封装基板 Substrate</div>
        {/* solder balls under substrate */}
        <div style={{ position:'absolute', left:cx-400, top:baseY+80, display:'flex', gap:26, opacity:sub.opacity }}>
          {Array.from({length:16}).map((_,i)=><div key={i} style={{ width:22, height:14, borderRadius:'50%', background:'#b9b2a2' }} />)}
        </div>
        {/* interposer */}
        <div style={{ position:'absolute', left:cx-380, top:baseY-58, width:760, height:50, opacity:intp.opacity, transform:`translateY(${intp.off}px)`,
          background:'#efe7d4', border:'3px solid #b09a4a', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:CJK, fontSize:19, fontWeight:700, color:'#8a7a3e', overflow:'hidden' }}>
          硅中介层 Interposer
          {/* internal wires GPU↔HBM */}
          <div style={{ position:'absolute', left:0, right:0, top:0, bottom:0, opacity:wireOp }}>
            {Array.from({length:9}).map((_,i)=>(
              <div key={i} style={{ position:'absolute', left:70+i*8, right:70+((8-i)*8), top:8+i*3.5, height:2, background:'oklch(0.5 0.15 250 / 0.55)' }} />
            ))}
          </div>
        </div>
        {/* GPU die */}
        <div style={{ position:'absolute', left:cx-170, top:baseY-286, width:340, height:220, opacity:gpu.opacity, transform:`translateY(${gpu.off}px)`,
          background:'#F7FAFD', border:`3px solid ${TERM.color}`, borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
          boxShadow:'0 12px 34px rgba(180,80,40,0.15)' }}>
          <div style={{ fontFamily:DISP, fontSize:52, fontWeight:700, color:INK }}>GPU</div>
          <div style={{ fontFamily:MONO, fontSize:13, color:MUTE, letterSpacing:'0.08em' }}>LOGIC DIE</div>
        </div>
        {/* HBM stacks (2 sides × 5 layers) */}
        {Array.from({length:5}).map((_,i)=>hbmLayer('l',i))}
        {Array.from({length:5}).map((_,i)=>hbmLayer('r',i))}
        {/* HBM group labels */}
        <div style={{ position:'absolute', left:cx-338, top:baseY-330, width:150, textAlign:'center', fontFamily:MONO, fontSize:14, fontWeight:700, color:'oklch(0.55 0.14 65)', opacity:clamp((time-(tHbm+2.2))/0.4,0,1) }}>HBM</div>
        <div style={{ position:'absolute', left:cx+188, top:baseY-330, width:150, textAlign:'center', fontFamily:MONO, fontSize:14, fontWeight:700, color:'oklch(0.55 0.14 65)', opacity:clamp((time-(tHbm+2.2))/0.4,0,1) }}>HBM</div>
        {/* data flow dots inside interposer */}
        {flowOn ? <>
          <FlowDots x={cx-300} y={baseY-38} len={280} time={time} color={'oklch(0.5 0.15 250)'} count={5} speed={1.6} size={7} />
          <FlowDots x={cx+20}  y={baseY-26} len={280} time={time} color={'oklch(0.5 0.15 250)'} count={5} speed={1.6} size={7} />
        </> : null}
      </div>

      {/* right rail: caption */}
      <div style={{ position:'absolute', left:1240, top:300, width:590 }}>
        {cap ? (
          <div key={cap.text} style={{ background:CARD, border:`1px solid ${LINE}`, borderLeft:`5px solid ${cap.color}`, borderRadius:16, padding:'26px 30px',
            boxShadow:'0 10px 30px rgba(10,24,40,0.07)' }}>
            <div style={{ fontFamily:CJK, fontSize:cap.big?34:27, fontWeight:cap.big?700:600, color:INK, lineHeight:1.5, whiteSpace:'pre-line' }}>{cap.text}</div>
          </div>
        ) : null}
        {/* mini comparison after flow */}
        <div style={{ marginTop:30, opacity:clamp((time-(tFlow+2.0))/0.6,0,1) }}>
          <div style={{ fontFamily:CJK, fontSize:19, color:MUTE, lineHeight:1.65 }}>
            如果走普通电路板，GPU 到内存是「跨城快递」；<br/>
            走硅中介层，是「同一栋楼里递文件」——<br/>
            <span style={{ color:TERM.color, fontWeight:700 }}>距离短百倍，通道多十倍。</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermRoot() {
  return (
    <Stage width={1920} height={1080} duration={52} background={BG} persistKey="cowos-v2">
      <Hud term={TERM} chapters={CHAPTERS} />
      <Sprite start={0} end={6}><SceneFade start={0} end={6}><SceneHook term={TERM} /></SceneFade></Sprite>
      <Sprite start={6} end={34}><SceneFade start={6} end={34}><SceneAssembly t0={6} /></SceneFade></Sprite>
      <Sprite start={34} end={46}><SceneFade start={34} end={46}><SceneWhy term={TERM} t0={34} /></SceneFade></Sprite>
      <Sprite start={46} end={52.1}><SceneFade start={46} end={52.2}><SceneCTA term={TERM} t0={46} /></SceneFade></Sprite>
    </Stage>
  );
}
module.exports = { CoWoSV2: TermRoot };
window.CoWoSV2 = TermRoot;

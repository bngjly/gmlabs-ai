
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
//  OSAT v2 — 机理动画：晶圆 → 切割 → 封装 → 测试分选
// ════════════════════════════════════════════════════════════════════════
const TERM = {
  enName:'OSAT', cnName:'委外封装测试', color:'oklch(0.70 0.16 80)',
  hookQ:'台积电把晶圆造好之后，\n芯片就能直接用了吗？——还差关键两步',
  hookA:'Outsourced Semiconductor Assembly & Test · 封装 + 测试的专业外包',
  why:[
    { stat:'后道工序', label:'芯片的“最后一公里”', detail:'再先进的裸片，不经封装测试就无法装上任何设备——这一环谁也绕不开' },
    { stat:'技术升级', label:'从打包到先进封装', detail:'AI 时代 OSAT 也要做 2.5D/3D 堆叠，技术含量和价值量都在快速上升' },
    { stat:'良率生意', label:'筛出每一颗次品', detail:'测试环节把不合格芯片拦在出厂前，良率每提高一点都是真金白银' },
  ],
};
const CHAPTERS = [
  { at:0, label:'问题' }, { at:6, label:'切割' }, { at:15, label:'封装' }, { at:24, label:'测试分选' }, { at:34, label:'为什么重要' }, { at:46, label:'查看图谱' },
];

// ── stage A: wafer + dicing ─────────────────────────────────────────────
function SceneDice({ t0, tEnd }) {
  const time = useTime();
  const wafer = pop(time, t0+0.5, 0.7);
  const cutT = clamp((time-(t0+2.6))/1.6, 0, 1);       // saw progress
  const sepT = Easing.easeInOutCubic(clamp((time-(t0+4.6))/1.2, 0, 1)); // dies separating
  const N = 6, cell = 64, gapBase = 6;
  const gap = gapBase + sepT*16;
  const gridW = N*cell + (N-1)*gap;
  const cap1 = reveal(time, t0+0.7, { dist:16 });
  const cap2 = reveal(time, t0+2.8, { dist:16 });
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <ChapterHead time={time} at={t0} no="02" title="第一步 · 把晶圆切成裸片" color={TERM.color} />
      <div style={{ position:'absolute', left:280, top:270, width:600, height:600, opacity:wafer.opacity, transform:`scale(${wafer.scale})`, transformOrigin:'center' }}>
        {/* wafer circle */}
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#e8e3d5', border:'3px solid #b9b2a2', boxShadow:'0 16px 44px rgba(10,24,40,0.1)' }} />
        {/* die grid */}
        <div style={{ position:'absolute', left:(600-gridW)/2, top:(600-gridW)/2, width:gridW, height:gridW, display:'grid',
          gridTemplateColumns:`repeat(${N},${cell}px)`, gap:`${gap}px` }}>
          {Array.from({length:N*N}).map((_,i)=>{
            const r = Math.floor(i/N), c = i%N;
            const corner = (r===0||r===N-1)&&(c===0||c===N-1);
            return <div key={i} style={{ width:cell, height:cell, borderRadius:4, opacity:corner?0.25:1,
              background:'#F7FAFD', border:`2px solid ${TERM.color}` }} />;
          })}
        </div>
        {/* saw lines */}
        {cutT>0 && sepT<1 ? Array.from({length:N-1}).map((_,i)=>(
          <React.Fragment key={i}>
            <div style={{ position:'absolute', left:(600-gridW)/2 + (i+1)*(cell+gap) - gap/2 -1, top:300-cutT*280, width:2, height:cutT*560, background:'oklch(0.6 0.2 25)', opacity:0.8 }} />
            <div style={{ position:'absolute', top:(600-gridW)/2 + (i+1)*(cell+gap) - gap/2 -1, left:300-cutT*280, height:2, width:cutT*560, background:'oklch(0.6 0.2 25)', opacity:0.8 }} />
          </React.Fragment>
        )) : null}
      </div>
      <div style={{ position:'absolute', left:1020, top:330, width:800 }}>
        <div style={{ opacity:cap1.opacity, transform:`translateY(${cap1.y}px)`, fontFamily:CJK, fontSize:32, fontWeight:600, color:INK, lineHeight:1.6 }}>
          晶圆厂交付的是一整片晶圆——<br/>上面有几百颗一模一样的“裸片”
        </div>
        <div style={{ opacity:cap2.opacity, transform:`translateY(${cap2.y}px)`, marginTop:36, background:CARD, border:`1px solid ${LINE}`, borderLeft:`5px solid ${TERM.color}`, borderRadius:16, padding:'24px 30px' }}>
          <div style={{ fontFamily:CJK, fontSize:24, color:MUTE, lineHeight:1.6 }}>OSAT 的第一刀：金刚石刀片 / 激光<br/>沿着切割道把裸片一颗颗分离出来</div>
        </div>
      </div>
    </div>
  );
}

// ── stage B: packaging one die ──────────────────────────────────────────
function ScenePack({ t0 }) {
  const time = useTime();
  const cx = 560, cy = 560;
  const die = slide(time, t0+0.4, { from:-140 });
  const subT = slide(time, t0+1.6, { from:100 });
  const wireOp = clamp((time-(t0+3.0))/0.8, 0, 1);
  const moldT = Easing.easeInOutCubic(clamp((time-(t0+4.8))/1.2, 0, 1));
  const cap = reveal(time, t0+0.6, { dist:16 });
  const cap2 = reveal(time, t0+4.9, { dist:16 });
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <ChapterHead time={time} at={t0} no="03" title="第二步 · 封装：给裸片穿上盔甲" color={TERM.color} />
      <div style={{ position:'absolute', left:0, top:0, width:1100, height:1080 }}>
        {/* substrate */}
        <div style={{ position:'absolute', left:cx-320, top:cy+60, width:640, height:56, opacity:subT.opacity, transform:`translateY(${subT.off}px)`,
          background:'#dde8d8', border:'3px solid #3f7a4f', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:CJK, fontSize:18, fontWeight:700, color:'#2e5c3a' }}>基板</div>
        {/* die */}
        <div style={{ position:'absolute', left:cx-110, top:cy-90, width:220, height:130, opacity:die.opacity, transform:`translateY(${die.off}px)`,
          background:'#F7FAFD', border:`3px solid ${TERM.color}`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:DISP, fontSize:30, fontWeight:700, color:INK }}>裸片</div>
        {/* bond wires */}
        <svg style={{ position:'absolute', left:cx-330, top:cy-100, opacity:wireOp }} width="660" height="230" viewBox="0 0 660 230">
          {[0,1,2].map(i=>(
            <path key={'l'+i} d={`M ${222-i*4} ${88+i*14} Q ${140-i*26} ${30+i*10} ${70-i*18} 170`} fill="none" stroke="#c9a227" strokeWidth="3" />
          ))}
          {[0,1,2].map(i=>(
            <path key={'r'+i} d={`M ${438+i*4} ${88+i*14} Q ${520+i*26} ${30+i*10} ${590+i*18} 170`} fill="none" stroke="#c9a227" strokeWidth="3" />
          ))}
        </svg>
        {/* mold cover descending */}
        <div style={{ position:'absolute', left:cx-320, top:cy-160 - (1-moldT)*160, width:640, height:216, opacity:moldT*0.96,
          background:'#4a463c', borderRadius:'18px 18px 4px 4px', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:14,
          fontFamily:MONO, fontSize:15, color:'#cfc9ba', letterSpacing:'0.14em' }}>MOLDED PACKAGE</div>
      </div>
      <div style={{ position:'absolute', left:1100, top:330, width:720 }}>
        <div style={{ opacity:cap.opacity, transform:`translateY(${cap.y}px)`, fontFamily:CJK, fontSize:30, fontWeight:600, color:INK, lineHeight:1.65 }}>
          裸片脆弱得像蛋黄：<br/>要固定到基板、接好金线、再用塑封料整个包起来
        </div>
        <div style={{ opacity:cap2.opacity, transform:`translateY(${cap2.y}px)`, marginTop:34, background:CARD, border:`1px solid ${LINE}`, borderLeft:`5px solid ${TERM.color}`, borderRadius:16, padding:'24px 30px' }}>
          <div style={{ fontFamily:CJK, fontSize:23, color:MUTE, lineHeight:1.6 }}>你见过的每一颗黑色芯片，<br/>都是封装之后的样子</div>
        </div>
      </div>
    </div>
  );
}

// ── stage C: test & sort ────────────────────────────────────────────────
function SceneTest({ t0 }) {
  const time = useTime();
  const beltY = 560;
  const tester = pop(time, t0+0.4, 0.55);
  const cap = reveal(time, t0+0.6, { dist:16 });
  // chips moving right along belt; every 4th fails and drops
  const chips = Array.from({length:7}).map((_,i)=>{
    const born = t0 + 1.0 + i*1.0;
    const age = time - born;
    if (age < 0) return null;
    const x = 120 + age*230;
    const fail = (i%4===2);
    const pastTester = x > 900;
    let y = beltY, op = 1;
    if (pastTester && fail) { const d=(x-900)/230; y = beltY + d*d*260; op = clamp(1.4-d,0,1); }
    if (x > 1750) op = 0;
    return { x: Math.min(x, fail?1400:1780), y, op, fail, pastTester, key:i };
  }).filter(Boolean);
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <ChapterHead time={time} at={t0} no="04" title="第三步 · 测试：良品放行，次品淘汰" color={TERM.color} />
      {/* belt */}
      <div style={{ position:'absolute', left:100, top:beltY+64, width:1720, height:10, background:'#d8d2c2', borderRadius:5 }} />
      {/* tester gate */}
      <div style={{ position:'absolute', left:860, top:beltY-90, width:160, height:150, opacity:tester.opacity, transform:`scale(${tester.scale})`,
        background:CARD, border:`3px solid ${TERM.color}`, borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
        boxShadow:'0 12px 30px rgba(160,120,30,0.15)' }}>
        <div style={{ fontFamily:CJK, fontSize:20, fontWeight:700, color:INK }}>测试机</div>
        <div style={{ fontFamily:MONO, fontSize:12, color:MUTE }}>ATE</div>
      </div>
      {/* chips */}
      {chips.map(c=>(
        <div key={c.key} style={{ position:'absolute', left:c.x, top:c.y, width:64, height:44, opacity:c.op,
          background:'#4a463c', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
          border: c.pastTester ? `3px solid ${c.fail?'oklch(0.6 0.2 25)':'oklch(0.6 0.16 150)'}` : '3px solid transparent',
          fontFamily:MONO, fontSize:18, color:'#fff' }}>
          {c.pastTester ? (c.fail?'✗':'✓') : ''}
        </div>
      ))}
      {/* labels */}
      <div style={{ position:'absolute', left:1500, top:beltY-60, fontFamily:CJK, fontSize:20, fontWeight:700, color:'oklch(0.5 0.14 150)', opacity:clamp((time-(t0+3.5))/0.5,0,1) }}>良品 → 出厂</div>
      <div style={{ position:'absolute', left:1330, top:beltY+220, fontFamily:CJK, fontSize:20, fontWeight:700, color:'oklch(0.55 0.19 25)', opacity:clamp((time-(t0+4.5))/0.5,0,1) }}>次品 ↓ 淘汰</div>
      <div style={{ position:'absolute', left:100, top:270, width:1000, opacity:cap.opacity, transform:`translateY(${cap.y}px)`, fontFamily:CJK, fontSize:30, fontWeight:600, color:INK, lineHeight:1.6 }}>
        每一颗芯片都要过电性测试——不合格的当场拦下
      </div>
    </div>
  );
}

function TermRoot() {
  return (
    <Stage width={1920} height={1080} duration={52} background={BG} persistKey="osat-v2">
      <Hud term={TERM} chapters={CHAPTERS} />
      <Sprite start={0} end={6}><SceneFade start={0} end={6}><SceneHook term={TERM} /></SceneFade></Sprite>
      <Sprite start={6} end={15}><SceneFade start={6} end={15}><SceneDice t0={6} /></SceneFade></Sprite>
      <Sprite start={15} end={24}><SceneFade start={15} end={24}><ScenePack t0={15} /></SceneFade></Sprite>
      <Sprite start={24} end={34}><SceneFade start={24} end={34}><SceneTest t0={24} /></SceneFade></Sprite>
      <Sprite start={34} end={46}><SceneFade start={34} end={46}><SceneWhy term={TERM} t0={34} /></SceneFade></Sprite>
      <Sprite start={46} end={52.1}><SceneFade start={46} end={52.2}><SceneCTA term={TERM} t0={46} /></SceneFade></Sprite>
    </Stage>
  );
}
module.exports = { OSATV2: TermRoot };
window.OSATV2 = TermRoot;

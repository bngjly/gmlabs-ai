// ════════════════════════════════════════════════════════════════════════
//  WeakSpotScenes.jsx — 「软肋」系列引擎（gmlabs.ai 配套）
//  叙事：Hook(反共识) → 30秒共识 → 软肋本体(价值上移) → 思科前车之鉴
//        → 证据(客户反水) → 三个判断 → 评分卡CTA(10s背书) → 品牌片尾
//  cut='long' 全场景 ~3.6min；cut='short' 砍掉共识/三判断 ~85s
//  用法：<x-import component="WeakSpotVideo" from="./WeakSpotScenes.jsx"
//         data="{{ epData }}" orientation="landscape" cut="long" hint-size="100%,100%">
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
      const s = Math.min(el.clientWidth / width, (el.clientHeight - 44) / height);
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

// ── YoYo brand tokens ────────────────────────────────────────────────────
const YOYO = {
  navy:'#050F1E', blue:'#1A8FFF', sky:'#82CFFF', gold:'#F0B90B',
  bg:'#EEF1F7', card:'#FFFFFF', line:'#DCE3ED',
  ink:'#050F1E', mute:'#46586E', faint:'#93A1B4',
  darkInk:'#EEF0F8', darkMute:'#8FA2B8', darkLine:'#1B2B40', darkCard:'#0B1830',
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

// ── 时间轴（长/短两版） ──────────────────────────────────────────────────
// 2026-07-17 收紧：原窗口按预估配音设计（DUR 218），实测 TTS 短很多，
// 场景尾部最长干等 20s。按实测音频时长+1.5s 呼吸位重排（DUR 180）。
const LONG = {
  hook:[0,13], strong:[13,36.5], weak:[36.5,73], cisco:[73,103.5],
  proof:[103.5,126.5], mean:[126.5,151.5], cta:[151.5,172], end:[172,180], DUR:180,
};
const SHORT = {
  hook:[0,8], weak:[8,34], cisco:[34,52], proof:[52,66],
  cta:[66,78], end:[78,85], DUR:85,
};

function Hud({ data, contentX, isPortrait, T }) {
  const time = useTime();
  const rv = reveal(time, (T.strong?T.strong[0]:T.weak[0])+0.3, { dist:0, dur:0.5 });
  return (
    <div style={{ position:'absolute', inset:0, opacity:rv.opacity, pointerEvents:'none' }}>
      <div style={{ position:'absolute', left:contentX, top:isPortrait?50:46, display:'flex', alignItems:'center', gap:12 }}>
        <img src={YOYO.logo} alt="" style={{ width:44, height:44, display:'block' }} />
        <div style={{ fontFamily:CJK, fontSize:isPortrait?18:19, fontWeight:700, color:INK }}>{YOYO.name}</div>
      </div>
      <div style={{ position:'absolute', right:contentX, top:isPortrait?62:58, fontFamily:MONO, fontSize:isPortrait?13:14, color:FAINT, letterSpacing:'0.14em' }}>软肋系列 · EP {data.ep} · {data.ticker}</div>
      <div style={{ position:'absolute', left:contentX, right:contentX, top:isPortrait?112:106, height:1, background:LINE }} />
    </div>
  );
}

// ── ① Hook：共识墙 + 一道金色裂缝 ───────────────────────────────────────
function SceneHook({ data, W, isPortrait, T }) {
  const time = useTime();
  const short = T.DUR < 120;
  const k = short ? 0.55 : 1;
  const tag = reveal(time, 0.3*k, { dist:12 });
  const l1 = reveal(time, 0.9*k, { dist:20 });
  const strike = clamp((time-1.8*k)/0.7, 0, 1);
  const l2 = reveal(time, 2.6*k, { dist:24 });
  const sub = reveal(time, 3.8*k, { dist:12 });
  return (
    <div style={{ position:'absolute', inset:0, background:navy, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
      <div style={{ opacity:tag.opacity, transform:`translateY(${tag.y}px)`, display:'inline-flex', alignItems:'center', gap:12, border:`1px solid ${YOYO.darkLine}`, borderRadius:999, padding:'8px 22px' }}>
        <img src={YOYO.logo} alt="" style={{ width:26, height:26 }} />
        <div style={{ fontFamily:MONO, fontSize:isPortrait?14:15, letterSpacing:'0.18em', color:YOYO.darkMute }}>软肋系列 · EP {data.ep} · {data.ticker}</div>
      </div>
      <div style={{ position:'relative', marginTop:isPortrait?70:56, opacity:l1.opacity, transform:`translateY(${l1.y}px)` }}>
        <div style={{ fontFamily:CJK, fontWeight:700, fontSize:isPortrait?58:66, color:YOYO.darkMute, lineHeight:1.3 }}>{data.hook.line1}</div>
        <div style={{ position:'absolute', left:'-2%', top:'52%', width:`${strike*104}%`, height:5, background:gold, borderRadius:3 }} />
      </div>
      <div style={{ opacity:l2.opacity, transform:`translateY(${l2.y}px)`, fontFamily:CJK, fontWeight:700, fontSize:isPortrait?62:74, color:YOYO.darkInk, marginTop:isPortrait?34:26, lineHeight:1.35, maxWidth:W*0.88 }}>{data.hook.line2}</div>
      <div style={{ opacity:sub.opacity, transform:`translateY(${sub.y}px)`, fontFamily:CJK, fontSize:isPortrait?24:26, color:sky, marginTop:isPortrait?40:32 }}>{data.hook.sub}</div>
      <div style={{ opacity:sub.opacity, fontFamily:MONO, fontSize:isPortrait?14:15, letterSpacing:'0.14em', color:YOYO.darkMute, marginTop:isPortrait?44:34 }}>不报目标价 · 不给买卖建议 · 用数据说话</div>
    </div>
  );
}

// ── ② 30秒共识（仅长版） ────────────────────────────────────────────────
function SceneStrong({ data, contentX, contentW, isPortrait, topPad, T }) {
  const time = useTime();
  const t0 = T.strong[0]+0.5;
  const tail = reveal(time, t0+5.6, { dist:14 });
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text={data.strong.kicker} color={blue} time={time} at={t0} />
      <div style={{ display:'flex', flexDirection:isPortrait?'column':'row', gap:18 }}>
        {data.strong.cards.map((c, i) => {
          const rv = reveal(time, t0+0.7+i*1.5, { dist:22 });
          return (
            <div key={i} style={{ flex:1, opacity:rv.opacity, transform:`translateY(${rv.y}px)`, background:CARD, border:`1px solid ${LINE}`, borderTop:`4px solid ${blue}`, borderRadius:16, padding:'28px 30px', boxShadow:'0 10px 30px rgba(10,24,40,0.07)' }}>
              <div style={{ fontFamily:MONO, fontSize:13, letterSpacing:'0.16em', color:FAINT }}>{String(i+1).padStart(2,'0')}</div>
              <div style={{ fontFamily:CJK, fontSize:isPortrait?30:32, fontWeight:700, color:INK, marginTop:10 }}>{c.t}</div>
              <div style={{ fontFamily:CJK, fontSize:isPortrait?20:21, color:MUTE, marginTop:12, lineHeight:1.55 }}>{c.d}</div>
            </div>
          );
        })}
      </div>
      <div style={{ opacity:tail.opacity, transform:`translateY(${tail.y}px)`, marginTop:isPortrait?40:34, fontFamily:CJK, fontSize:isPortrait?24:26, fontWeight:700, color:INK }}>{data.strong.tail}</div>
    </div>
  );
}

// ── ③ 软肋本体：价值上移图 ──────────────────────────────────────────────
function SceneWeak({ data, contentX, contentW, isPortrait, topPad, T }) {
  const time = useTime();
  const t0 = T.weak[0]+0.5;
  const win = T.weak[1]-T.weak[0];
  const stag = (win-8) / data.weak.points.length;
  const arrowT = Easing.easeOutCubic(clamp((time-(t0+stag*2))/(win*0.4),0,1));
  const punch = reveal(time, T.weak[1]-5, { dist:16 });
  const bandH = isPortrait ? 92 : 88;
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text="唯一的软肋 · 生态卡位" color={gold} time={time} at={t0} />
      <div style={{ display:'flex', flexDirection:isPortrait?'column':'row', gap:isPortrait?30:44 }}>
        <div style={{ flex:isPortrait?'none':'0 0 46%', position:'relative' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {data.weak.bands.map((b, i) => {
              const rv = reveal(time, t0+0.6+i*0.5, { dist:16 });
              const up = i < 2; // 上层：价值流向的目的地
              const lit = up && arrowT > (i===0 ? 0.75 : 0.45);
              return (
                <div key={i} style={{ opacity:rv.opacity, transform:`translateY(${rv.y}px)`, height:bandH, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 26px',
                  background: b.own ? blue : (lit ? '#FFF7DF' : CARD),
                  border: `1px solid ${b.own ? blue : (lit ? gold : LINE)}`,
                  boxShadow: b.own ? '0 12px 32px rgba(26,143,255,0.25)' : 'none', transition:'background 0.5s, border-color 0.5s' }}>
                  <div>
                    <div style={{ fontFamily:CJK, fontSize:isPortrait?23:24, fontWeight:700, color: b.own ? '#fff' : INK }}>{b.label}</div>
                    <div style={{ fontFamily:CJK, fontSize:15, color: b.own ? 'rgba(255,255,255,0.75)' : FAINT, marginTop:3 }}>{b.note}</div>
                  </div>
                  {b.own ? <div style={{ fontFamily:MONO, fontSize:14, fontWeight:700, color:'#fff', border:'1px solid rgba(255,255,255,0.5)', borderRadius:999, padding:'4px 14px' }}>NVDA</div> : null}
                  {lit ? <div style={{ fontFamily:CJK, fontSize:14, fontWeight:700, color:gold }}>没有卡位</div> : null}
                </div>
              );
            })}
          </div>
          <div style={{ position:'absolute', right:isPortrait?-6:-30, top:`${(1-arrowT)*52+8}%`, opacity:arrowT>0.02?1:0, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ fontFamily:DISP, fontSize:34, color:gold, lineHeight:1 }}>↑</div>
            <div style={{ writingMode:'vertical-rl', fontFamily:CJK, fontSize:14, fontWeight:700, color:gold, letterSpacing:'0.2em' }}>钱的流向</div>
          </div>
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:isPortrait?16:20, justifyContent:'center' }}>
          {data.weak.points.map((p, i) => {
            const at = t0 + 1.6 + i*stag;
            const rv = reveal(time, at, { dist:18 });
            const active = time >= at && time < at + stag;
            return (
              <div key={i} style={{ opacity:rv.opacity * (active||time<at+stag ? 1 : 0.85), transform:`translateY(${rv.y}px)`, display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ fontFamily:MONO, fontSize:15, fontWeight:700, color:active?gold:FAINT, marginTop:6, flexShrink:0 }}>{String(i+1).padStart(2,'0')}</div>
                <div style={{ fontFamily:CJK, fontSize:isPortrait?23:25, color:active?INK:MUTE, fontWeight:active?700:400, lineHeight:1.55, textWrap:'pretty', transition:'color 0.3s' }}>{p}</div>
              </div>
            );
          })}
          <div style={{ opacity:punch.opacity, transform:`translateY(${punch.y}px)`, marginTop:6, fontFamily:CJK, fontSize:isPortrait?28:32, fontWeight:700, color:INK, borderLeft:`5px solid ${gold}`, paddingLeft:18 }}>{data.weak.punch}</div>
        </div>
      </div>
    </div>
  );
}

// ── ④ 思科前车之鉴 ──────────────────────────────────────────────────────
function SceneCisco({ data, contentX, contentW, isPortrait, topPad, T }) {
  const time = useTime();
  const t0 = T.cisco[0]+0.5;
  const win = T.cisco[1]-T.cisco[0];
  const cols = [
    { c: data.cisco.then, color:FAINT, at:t0+0.7 },
    { c: data.cisco.now, color:blue, at:t0+0.7+win*0.28 },
  ];
  const diff = reveal(time, t0+win*0.62, { dist:16 });
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text={data.cisco.kicker} color={gold} time={time} at={t0} />
      <div style={{ display:'flex', flexDirection:isPortrait?'column':'row', gap:20, alignItems:'stretch' }}>
        {cols.map((col, ci) => {
          const rv = reveal(time, col.at, { dist:24 });
          return (
            <div key={ci} style={{ flex:1, opacity:rv.opacity, transform:`translateY(${rv.y}px)`, background:CARD, border:`1px solid ${LINE}`, borderTop:`4px solid ${ci===0?FAINT:blue}`, borderRadius:16, padding:'28px 32px', boxShadow:'0 10px 30px rgba(10,24,40,0.07)' }}>
              <div style={{ fontFamily:CJK, fontSize:isPortrait?30:32, fontWeight:700, color:INK }}>{col.c.name}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:20 }}>
                {col.c.points.map((p, i) => {
                  const st = reveal(time, col.at+0.5+i*1.2, { dist:12 });
                  const isQ = p === '？';
                  return (
                    <div key={i} style={{ opacity:st.opacity, transform:`translateY(${st.y}px)`, display:'flex', gap:12, alignItems:'baseline' }}>
                      <div style={{ width:8, height:8, borderRadius:4, background:ci===0?FAINT:blue, flexShrink:0, alignSelf:'center' }} />
                      <div style={{ fontFamily:CJK, fontSize:isQ?(isPortrait?36:40):(isPortrait?21:22), fontWeight:isQ?700:400, color:isQ?gold:INK, lineHeight:1.5 }}>{p}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ opacity:diff.opacity, transform:`translateY(${diff.y}px)`, marginTop:isPortrait?30:26, background:'#FFF7DF', border:`1px solid ${gold}`, borderRadius:14, padding:'22px 28px', fontFamily:CJK, fontSize:isPortrait?21:23, color:INK, lineHeight:1.65, textWrap:'pretty' }}>{data.cisco.diff}</div>
    </div>
  );
}

// ── ⑤ 证据：客户反水 ────────────────────────────────────────────────────
function SceneProof({ data, contentX, contentW, isPortrait, topPad, T }) {
  const time = useTime();
  const t0 = T.proof[0]+0.5;
  const win = T.proof[1]-T.proof[0];
  const stag = (win-6) / data.proof.items.length;
  const tail = reveal(time, T.proof[1]-4, { dist:14 });
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text={data.proof.kicker} color={gold} time={time} at={t0} />
      <div style={{ display:'grid', gridTemplateColumns:isPortrait?'1fr':'1fr 1fr', gap:16 }}>
        {data.proof.items.map((it, i) => {
          const at = t0+0.6+i*stag;
          const rv = reveal(time, at, { dist:20 });
          const active = time >= at && time < at+stag;
          return (
            <div key={i} style={{ opacity:rv.opacity, transform:`translateY(${rv.y}px)`, background:CARD, border:`1px solid ${active?gold:LINE}`, borderLeft:`4px solid ${gold}`, borderRadius:14, padding:'20px 24px', boxShadow:active?'0 10px 30px rgba(10,24,40,0.10)':'none', transition:'border-color 0.3s' }}>
              <div style={{ fontFamily:DISP, fontSize:isPortrait?24:26, fontWeight:700, color:INK }}>{it.who}</div>
              <div style={{ fontFamily:CJK, fontSize:isPortrait?18:19, color:MUTE, marginTop:8, lineHeight:1.55 }}>{it.what}</div>
            </div>
          );
        })}
      </div>
      <div style={{ opacity:tail.opacity, transform:`translateY(${tail.y}px)`, marginTop:isPortrait?32:28, fontFamily:CJK, fontSize:isPortrait?26:30, fontWeight:700, color:INK, borderLeft:`5px solid ${gold}`, paddingLeft:18 }}>{data.proof.tail}</div>
    </div>
  );
}

// ── ⑥ 三个判断（仅长版） ────────────────────────────────────────────────
function SceneMean({ data, contentX, contentW, isPortrait, topPad, T }) {
  const time = useTime();
  const t0 = T.mean[0]+0.5;
  const comp = reveal(time, t0+7.5, { dist:10 });
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <Kicker text={data.mean.kicker} color={blue} time={time} at={t0} />
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {data.mean.items.map((m, i) => {
          const rv = reveal(time, t0+0.7+i*2.2, { dist:20 });
          return (
            <div key={i} style={{ opacity:rv.opacity, transform:`translateY(${rv.y}px)`, display:'flex', alignItems:'center', gap:24, background:CARD, border:`1px solid ${LINE}`, borderRadius:16, padding:'24px 30px', boxShadow:'0 10px 30px rgba(10,24,40,0.07)' }}>
              <div style={{ fontFamily:DISP, fontSize:isPortrait?34:38, fontWeight:700, color:blue, flexShrink:0 }}>{m.n}</div>
              <div>
                <div style={{ fontFamily:CJK, fontSize:isPortrait?26:28, fontWeight:700, color:INK }}>{m.t}</div>
                <div style={{ fontFamily:CJK, fontSize:isPortrait?19:20, color:MUTE, marginTop:6 }}>{m.d}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ opacity:comp.opacity, marginTop:26, fontFamily:MONO, fontSize:15, letterSpacing:'0.18em', color:FAINT }}>{data.mean.compliance}</div>
    </div>
  );
}

// ── ⑦ 评分卡 CTA（10 秒背书） ───────────────────────────────────────────
function SceneCta({ data, contentX, contentW, isPortrait, topPad, T }) {
  const time = useTime();
  const t0 = T.cta[0]+0.5;
  const line = reveal(time, t0, { dist:16 });
  const cardRv = reveal(time, t0+1.0, { dist:22 });
  const badge = pop(time, t0+1.6, 0.55);
  const barT = Easing.easeOutCubic(clamp((time-(t0+2.0))/1.2,0,1));
  const cta = pop(time, t0+3.6, 0.55);
  const comp = reveal(time, t0+4.4, { dist:10 });
  const d = data.weakDim;
  return (
    <div style={{ position:'absolute', left:contentX, top:topPad, width:contentW }}>
      <div style={{ opacity:line.opacity, transform:`translateY(${line.y}px)`, fontFamily:CJK, fontSize:isPortrait?30:34, fontWeight:700, color:INK, lineHeight:1.45, textWrap:'pretty' }}>{data.cta.line}</div>
      <div style={{ opacity:cardRv.opacity, transform:`translateY(${cardRv.y}px)`, marginTop:28, background:CARD, border:`1px solid ${LINE}`, borderLeft:`4px solid ${data.gradeColor}`, borderRadius:16, padding:isPortrait?'30px 32px':'32px 40px', boxShadow:'0 10px 30px rgba(10,24,40,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:isPortrait?22:30, flexWrap:'wrap' }}>
          <div style={{ opacity:badge.opacity, transform:`scale(${badge.scale})`, width:92, height:92, borderRadius:20, background:data.gradeColor, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontFamily:DISP, fontWeight:700, fontSize:54, color:'#fff' }}>{data.grade}</div>
          </div>
          <div>
            <div style={{ fontFamily:CJK, fontSize:isPortrait?26:28, fontWeight:700, color:INK }}>{data.cnName} · 综合 {data.score}/{data.scoreMax}</div>
            <div style={{ fontFamily:MONO, fontSize:14, color:FAINT, marginTop:6 }}>六维客观评分 · 每天更新</div>
          </div>
          <div style={{ marginLeft:isPortrait?0:'auto', minWidth:isPortrait?'100%':300 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
              <div style={{ fontFamily:CJK, fontSize:18, fontWeight:700, color:INK }}>{d.name}</div>
              <div style={{ fontFamily:CJK, fontSize:13, fontWeight:700, color:gold, border:`1px solid ${gold}`, borderRadius:999, padding:'2px 10px' }}>唯一短板</div>
              <div style={{ marginLeft:'auto', fontFamily:DISP, fontSize:20, fontWeight:700, color:INK }}>{(barT*d.score).toFixed(1)}<span style={{ fontFamily:MONO, fontSize:13, color:FAINT, fontWeight:400 }}> /{d.max}</span></div>
            </div>
            <div style={{ marginTop:8, height:8, background:'#E7EDF5', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${barT*(d.score/d.max)*100}%`, height:'100%', background:gold, borderRadius:4 }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop:isPortrait?40:34, textAlign:'center' }}>
        <div style={{ opacity:cta.opacity, transform:`scale(${cta.scale})`, display:'inline-flex', alignItems:'center', gap:14, background:navy, color:'#fff', borderRadius:999, padding:isPortrait?'18px 30px':'18px 36px' }}>
          <div style={{ fontFamily:CJK, fontSize:isPortrait?21:23, fontWeight:600 }}>完整评分卡 · 每天更新</div>
          <div style={{ fontFamily:MONO, fontSize:isPortrait?19:21, color:sky }}>→ {data.deeplink}</div>
        </div>
        <div style={{ opacity:comp.opacity, marginTop:18, fontFamily:MONO, fontSize:13, letterSpacing:'0.1em', color:FAINT }}>不报目标价 · 不构成投资建议 · 数据快照 {data.snapshotDate}</div>
      </div>
    </div>
  );
}

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
function WeakSpotVideo({ data, orientation, cut }) {
  if (!data) return null;
  const isPortrait = orientation === 'portrait';
  const T = cut === 'short' ? SHORT : LONG;
  const W = isPortrait ? 1080 : 1920;
  const H = isPortrait ? 1920 : 1080;
  const contentW = isPortrait ? 940 : 1420;
  const contentX = (W - contentW) / 2;
  const topPad = isPortrait ? 170 : 150;
  const common = { data, contentX, contentW, isPortrait, topPad, T };
  const sc = (key, Comp) => T[key] ? (
    <Sprite start={T[key][0]} end={T[key][1]}>
      <SceneFade start={T[key][0]} end={T[key][1]}>
        <Comp {...common} />
      </SceneFade>
    </Sprite>
  ) : null;
  return (
    <Stage width={W} height={H} duration={T.DUR} background={BG} persistKey={`ws-${data.ticker}-${orientation}-${cut}`}>
      <Sprite start={(T.strong||T.weak)[0]} end={T.cta[1]}><Hud data={data} contentX={contentX} isPortrait={isPortrait} T={T} /></Sprite>
      <Sprite start={T.hook[0]} end={T.hook[1]}><SceneFade start={T.hook[0]} end={T.hook[1]}><SceneHook data={data} W={W} isPortrait={isPortrait} T={T} /></SceneFade></Sprite>
      {sc('strong', SceneStrong)}
      {sc('weak', SceneWeak)}
      {sc('cisco', SceneCisco)}
      {sc('proof', SceneProof)}
      {sc('mean', SceneMean)}
      {sc('cta', SceneCta)}
      <Sprite start={T.end[0]} end={T.DUR}><SceneFade start={T.end[0]} end={T.DUR}><BrandEndcard t0={T.end[0]} W={W} H={H} /></SceneFade></Sprite>
    </Stage>
  );
}

module.exports = { WeakSpotVideo };
window.WeakSpotVideo = WeakSpotVideo;

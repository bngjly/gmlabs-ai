// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx
// Reusable animation starter: Stage, Timeline, Sprite, easing helpers.
// Exports (to window): Stage, Sprite, PlaybackBar, TextSprite, ImageSprite, RectSprite,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
// Usage (in an HTML file that loads React + Babel):
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <MyScene />
//   </Stage>
//
// <Stage> auto-scales to the viewport and provides the scrubber, play/pause,
// ←/→ seek, space, and 0-to-reset controls, and persists the playhead.
// Inside <Stage>, any child can call useTime() to read the current
// playhead (seconds). Or wrap content in <Sprite start={1} end={4}>...</Sprite>
// to only render during that window -- children receive a `localTime` and
// `progress` via the useSprite() hook. Use Easing + interpolate()/animate()
// for tweens; TextSprite / ImageSprite / RectSprite have built-in entry/exit.
// Build YOUR scenes by composing Sprites inside a Stage.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

const SpriteContext = React.createContext({ localTime: 0, progress: 0, duration: 0 });
const useSprite = () => React.useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children, keepMounted = false }) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration)
    ? clamp(localTime / duration, 0, 1)
    : 0;

  const value = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}

// ── Sample sprite components ────────────────────────────────────────────────

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0, y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em',
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let ty = 0;

  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }

  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity',
    }}>
      {text}
    </div>
  );
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0, y = 0,
  width = 400, height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null, // {label: string} for striped placeholder
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }

  const content = placeholder ? (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {placeholder.label || 'image'}
    </div>
  ) : (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
  );

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity',
    }}>
      {content}
    </div>
  );
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive — takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0, y = 0,
  width = 100, height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render, // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const { localTime, duration } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }

  const overrides = render ? render(spriteCtx) : {};

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides,
    }} />
  );
}


function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children,
}) {
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try { localStorage.setItem(persistKey + ':t', String(time)); } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(
        el.clientWidth / width,
        (el.clientHeight - barH) / height
      );
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = React.useMemo(
    () => ({ time: displayTime, duration, playing, setTime, setPlaying }),
    [displayTime, duration, playing]
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area — vertically centered in remaining space */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div
          ref={canvasRef}
          style={{
            width, height,
            background,
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <TimelineContext.Provider value={ctxValue}>
            {children}
          </TimelineContext.Provider>
        </div>
      </div>

      {/* Playback bar — stacked below canvas, never overlapping */}
      <PlaybackBar
        time={displayTime}
        actualTime={time}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying(p => !p)}
        onReset={() => { setTime(0); }}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);

  const onTrackMove = (e) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',

      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor"/>
            <rect x="8" y="2" width="3" height="10" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
          </svg>
        )}
      </IconButton>

      {/* Current time: fixed width so it doesn't thrash */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'right',
        color: '#f6f4ef',
      }}>
        {fmt(time)}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: 0, width: `${pct}%`, height: 4,
          background: 'oklch(72% 0.12 250)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: `${pct}%`, top: '50%',
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          background: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}/>
      </div>

      {/* Duration: fixed width */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'left',
        color: 'rgba(246,244,239,0.55)',
      }}>
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({ children, onClick, title }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}


Object.assign(window, {
  Easing, interpolate, animate, clamp,
  TimelineContext, useTime, useTimeline,
  Sprite, SpriteContext, useSprite,
  TextSprite, ImageSprite, RectSprite,
  Stage, PlaybackBar,
});



// ════════════════════════════════════════════════════════════════════════
//  AI 产业链全景图谱 — 60s 科普视频  (light, minimal, info-dense)
// ════════════════════════════════════════════════════════════════════════

const INK   = '#050F1E';
const MUTE  = '#46586E';
const FAINT = '#93A1B4';
const BG    = '#EEF1F7';
const CARD  = '#ffffff';
const LINE  = '#DCE3ED';
const NAVY  = '#050F1E';
const BLUE  = '#1A8FFF';
const SKY   = '#82CFFF';
const LOGO  = 'assets/yoyo_ai_800.png';
const DISP  = "'Space Grotesk','PingFang SC','Microsoft YaHei',sans-serif";
const CJK   = "'PingFang SC','Microsoft YaHei','Space Grotesk',sans-serif";
const MONO  = "'JetBrains Mono',ui-monospace,monospace";

const CHAIN = [
  { n:'01', name:'算力芯片 GPU / XPU',        en:'COMPUTE',      meta:'大脑 · 执行矩阵乘法 / 张量运算',         color:'oklch(0.63 0.19 25)'  },
  { n:'02', name:'HBM / 存储',                en:'MEMORY',       meta:'记忆 · 贴在 GPU 旁的高带宽内存',         color:'oklch(0.72 0.16 65)'  },
  { n:'03', name:'先进封装 / 中介层',          en:'PACKAGING',    meta:'胶水 · 把 GPU 和 HBM 焊在一块硅片上',    color:'oklch(0.76 0.15 100)' },
  { n:'04', name:'机柜内互联 Retimer / AEC',   en:'INTERCONNECT', meta:'信号放大器 · 铜缆走 PCIe 6.0 必须有它',  color:'oklch(0.68 0.16 150)' },
  { n:'05', name:'网络交换芯片 / DPU',         en:'SWITCH·DPU',   meta:'数据红绿灯 · 万卡集群的路由器',          color:'oklch(0.66 0.12 195)' },
  { n:'06', name:'光通信 / 光模块',            en:'OPTICS',       meta:'出柜必须换光 · 800G → 1.6T → 3.2T',     color:'oklch(0.62 0.15 240)' },
  { n:'07', name:'电力 / 配电',                en:'POWER',        meta:'每个 GB200 机柜 130kW · 电网是新瓶颈',   color:'oklch(0.56 0.16 290)' },
  { n:'08', name:'液冷 / 散热',                en:'COOLING',      meta:'风冷已死 · 液冷是 B200 之后唯一选择',    color:'oklch(0.64 0.17 350)' },
  { n:'09', name:'上游设备 / 材料',            en:'EQUIPMENT',    meta:'挖矿不如卖铲 · 卖铲不如卖矿镐',          color:'oklch(0.58 0.035 70)' },
  { n:'10', name:'数据中心 / 云客户',          en:'DATACENTER',   meta:'产业链的“水龙头” · 他们花钱，全链吃饭',  color:'oklch(0.60 0.14 255)' },
];
const APPS = [
  { n:'11', name:'机器人 / 具身智能',          en:'ROBOTICS',     meta:'GPT 是大脑，机器人是身体 · TSLA Optimus 2026 量产是临界点', color:'oklch(0.63 0.19 25)'  },
  { n:'12', name:'卫星 / 航天 / 国防通信',     en:'SPACE·DEFENSE',meta:'低轨卫星互联网 + 火箭发射 + 卫星情报 + 月球任务',          color:'oklch(0.62 0.15 240)' },
];

// ── timing helpers ───────────────────────────────────────────────────────
function reveal(time, at, { dur=0.55, dist=22, out=null, outDur=0.4 } = {}) {
  const ti = clamp((time - at) / dur, 0, 1);
  const e  = Easing.easeOutCubic(ti);
  let opacity = e, y = (1 - e) * dist;
  if (out != null) {
    const to = clamp((time - out) / outDur, 0, 1);
    const eo = Easing.easeInCubic(to);
    opacity *= (1 - eo); y += eo * -10;
  }
  return { opacity, y };
}
function pop(time, at, dur = 0.5) {
  const t = clamp((time - at) / dur, 0, 1);
  const s = Easing.easeOutBack(t);
  return { opacity: clamp(t * 1.6, 0, 1), scale: 0.6 + 0.4 * s };
}

// ── reusable bits ────────────────────────────────────────────────────────
function SceneWrap({ start, end, children }) {
  const time = useTime();
  const fin  = clamp((time - start) / 0.4, 0, 1);
  const fout = 1 - clamp((time - (end - 0.45)) / 0.45, 0, 1);
  return (
    <div style={{ position:'absolute', inset:0, opacity: Math.min(fin, fout) }}>
      {children}
    </div>
  );
}

function Badge({ item, size = 38 }) {
  return (
    <div style={{
      width:size, height:size, flexShrink:0, borderRadius:11,
      background:item.color, color:'#fff',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:MONO, fontSize:size*0.42, fontWeight:700, letterSpacing:'0.02em',
    }}>{item.n}</div>
  );
}

function MetaCard({ item, rv, w = 800 }) {
  return (
    <div style={{
      position:'absolute', width:w,
      opacity:rv.opacity, transform:`translateY(${rv.y}px)`, willChange:'transform,opacity',
      background:CARD, border:`1px solid ${LINE}`, borderLeft:`4px solid ${item.color}`,
      borderRadius:16, padding:'18px 26px',
      boxShadow:'0 10px 30px rgba(10,24,40,0.06)',
      display:'flex', flexDirection:'column', gap:9,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <Badge item={item} />
        <div style={{ fontFamily:CJK, fontSize:30, fontWeight:700, color:INK, letterSpacing:'-0.01em' }}>{item.name}</div>
        <div style={{ marginLeft:'auto', fontFamily:MONO, fontSize:13, color:FAINT, letterSpacing:'0.08em' }}>{item.en}</div>
      </div>
      <div style={{ fontFamily:CJK, fontSize:20, color:MUTE, lineHeight:1.4 }}>{item.meta}</div>
    </div>
  );
}

function SectionHead({ time, at, kicker, title, color }) {
  const rv = reveal(time, at, { dist:16 });
  return (
    <div style={{ position:'absolute', left:1004, top:150, opacity:rv.opacity, transform:`translateY(${rv.y}px)` }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:12, height:12, borderRadius:7, background:color }} />
        <div style={{ fontFamily:MONO, fontSize:15, letterSpacing:'0.18em', color:MUTE, textTransform:'uppercase' }}>{kicker}</div>
      </div>
      <div style={{ fontFamily:CJK, fontSize:46, fontWeight:700, color:INK, marginTop:14, letterSpacing:'-0.015em' }}>{title}</div>
    </div>
  );
}

function ChipBox({ label, sub, w, h, x, y, color, st }) {
  return (
    <div style={{
      position:'absolute', left:x, top:y, width:w, height:h,
      opacity:st.opacity, transform:`scale(${st.scale||1})`, transformOrigin:'center', willChange:'transform,opacity',
      background:'#F7FAFD', border:`2px solid ${color}`, borderRadius:14,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4,
      boxShadow:`0 8px 24px ${color.replace(')',' / 0.18)').replace('oklch','oklch')}`,
    }}>
      <div style={{ fontFamily:DISP, fontSize:Math.min(w,h)*0.26, fontWeight:700, color:INK }}>{label}</div>
      {sub ? <div style={{ fontFamily:MONO, fontSize:12, color:MUTE, letterSpacing:'0.06em' }}>{sub}</div> : null}
    </div>
  );
}

// little row of "pins" along the bottom of a chip
function Pins({ x, y, n = 8, opacity = 1, color = '#C3CEDD' }) {
  return (
    <div style={{ position:'absolute', left:x, top:y, display:'flex', gap:7, opacity }}>
      {Array.from({ length:n }).map((_, i) => (
        <div key={i} style={{ width:5, height:14, background:color, borderRadius:2 }} />
      ))}
    </div>
  );
}

// flowing dots along a vertical or horizontal path
function FlowDots({ x, y, len, vertical, time, color, count = 5, speed = 1.6, size = 9 }) {
  return (
    <div style={{ position:'absolute', left:x, top:y }}>
      {Array.from({ length:count }).map((_, i) => {
        const p = ((time * speed) + i / count) % 1;
        const off = p * len;
        return (
          <div key={i} style={{
            position:'absolute',
            left: vertical ? 0 : off, top: vertical ? off : 0,
            width:size, height:size, borderRadius:size, background:color,
            opacity: 0.25 + 0.75 * Math.sin(p * Math.PI),
          }} />
        );
      })}
    </div>
  );
}

// ════════ HUD ════════
function Hud() {
  const time = useTime();
  const rv = reveal(time, 5, { dist:0, dur:0.6 });
  const revs = [[6.2,1],[7.6,2],[9.0,3],[16.2,4],[17.6,5],[19.0,6],[27.4,7],[28.8,8],[30.2,9],[38.6,10],[47.6,11],[49.6,12]];
  let step = 0;
  for (const [t,n] of revs) if (time >= t) step = n;
  if (time >= 55) step = 12;
  const ns = String(step).padStart(2,'0');
  return (
    <div style={{ position:'absolute', inset:0, opacity:rv.opacity, pointerEvents:'none' }}>
      <div style={{ position:'absolute', left:100, top:64, display:'flex', alignItems:'center', gap:14 }}>
        <img src={LOGO} alt="" style={{ width:46, height:46, display:'block' }} />
        <div style={{ fontFamily:CJK, fontSize:20, fontWeight:700, color:INK, letterSpacing:'0.01em' }}>YoYo AI 日报</div>
        <div style={{ fontFamily:MONO, fontSize:13, color:FAINT, letterSpacing:'0.16em', marginTop:2 }}>AI 产业链全景图谱</div>
      </div>
      <div style={{ position:'absolute', right:100, top:54, textAlign:'right' }}>
        <div style={{ fontFamily:MONO, fontSize:13, color:MUTE, letterSpacing:'0.18em' }}>STEP · 环节</div>
        <div style={{ fontFamily:DISP, fontSize:40, fontWeight:700, color:INK, lineHeight:1, marginTop:4 }}>
          {ns}<span style={{ color:FAINT, fontSize:24 }}> / 12</span>
        </div>
      </div>
      <div style={{ position:'absolute', left:100, right:100, top:108, height:1, background:LINE }} />
    </div>
  );
}

// ════════ S1 — TITLE ════════
function SceneTitle() {
  const time = useTime();
  const k  = reveal(time, 0.4, { dist:14 });
  const t1 = reveal(time, 0.9, { dist:26 });
  const t2 = reveal(time, 1.5, { dist:20 });
  const ln = clamp((time - 1.3) / 0.7, 0, 1);
  const chip = pop(time, 0.6, 0.7);
  const pulse = 1 + 0.04 * Math.sin(time * 2.4);
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <div style={{
        position:'absolute', left:960, top:300, transform:`translate(-50%,-50%) scale(${chip.scale*pulse})`,
        opacity:chip.opacity*0.9,
      }}>
        <div style={{
          width:120, height:120, borderRadius:22, background:'#F7FAFD',
          border:'2px solid oklch(0.60 0.14 255)', boxShadow:'0 16px 40px rgba(60,80,160,0.16)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:DISP, fontSize:34, fontWeight:700, color:INK,
        }}>AI</div>
      </div>
      <div style={{ position:'absolute', left:960, top:470, transform:'translateX(-50%)', textAlign:'center' }}>
        <div style={{ opacity:k.opacity, transform:`translateY(${k.y}px)`, fontFamily:MONO, fontSize:18, letterSpacing:'0.34em', color:MUTE, textTransform:'uppercase' }}>
          GMLABS · INDUSTRY MAP
        </div>
        <div style={{ opacity:t1.opacity, transform:`translateY(${t1.y}px)`, fontFamily:CJK, fontSize:108, fontWeight:700, color:INK, letterSpacing:'-0.02em', marginTop:22 }}>
          AI 产业链全景
        </div>
        <div style={{ width: ln*520, height:3, background:'oklch(0.60 0.14 255)', margin:'26px auto 0', borderRadius:2 }} />
        <div style={{ opacity:t2.opacity, transform:`translateY(${t2.y}px)`, fontFamily:CJK, fontSize:34, fontWeight:500, color:MUTE, marginTop:26 }}>
          12 个环节，一次看懂 — 从一块芯片到机器人与卫星
        </div>
      </div>
    </div>
  );
}

// ════════ S2 — 芯片三件套 ════════
function SceneChip() {
  const time = useTime();
  const gpu = pop(time, 5.5, 0.6);
  const hbmL = reveal(time, 6.6, { dist:-60, dur:0.6 }); // slide from left
  const hbmR = reveal(time, 6.6, { dist:60,  dur:0.6 });
  const sub  = reveal(time, 8.0, { dist:-40, dur:0.6 });
  const lab  = reveal(time, 9.4, { dist:14 });
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <SectionHead time={time} at={5.4} kicker="UPSTREAM · 01–03" title="算力的心脏 · 芯片三件套" color={CHAIN[0].color} />

      {/* assembly */}
      <div style={{ position:'absolute', left:300, top:300, width:560, height:520 }}>
        {/* substrate */}
        <div style={{ position:'absolute', left:30, top:300, width:420, height:64,
          opacity:sub.opacity, transform:`translateX(${sub.y}px)`,
          background:'#efe7d4', border:`2px solid ${CHAIN[2].color}`, borderRadius:14,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:CJK, fontSize:18, fontWeight:600, color:'#8a7a3e' }}>先进封装 · 中介层</div>
        {/* HBM left */}
        <ChipBox label="HBM" w={80} h={210} x={30}  y={80} color={CHAIN[1].color} st={{opacity:hbmL.opacity, scale:1, }} />
        {/* HBM right */}
        <ChipBox label="HBM" w={80} h={210} x={350} y={80} color={CHAIN[1].color} st={{opacity:hbmR.opacity}} />
        {/* GPU */}
        <ChipBox label="GPU" sub="XPU" w={210} h={210} x={130} y={80} color={CHAIN[0].color} st={gpu} />
        {/* superchip label */}
        <div style={{ position:'absolute', left:30, top:392, width:420, textAlign:'center',
          opacity:lab.opacity, transform:`translateY(${lab.y}px)` }}>
          <div style={{ fontFamily:MONO, fontSize:15, letterSpacing:'0.14em', color:MUTE }}>= 1× SUPERCHIP</div>
        </div>
      </div>

      <SceneCards items={[CHAIN[0],CHAIN[1],CHAIN[2]]} times={[6.2,7.6,9.0]} time={time} />
    </div>
  );
}

// generic right column cards
function SceneCards({ items, times, time, top = 330 }) {
  return (
    <div style={{ position:'absolute', left:1004, top, width:816, height:600 }}>
      {items.map((it, i) => {
        const rv = reveal(time, times[i], { dist:24 });
        return (
          <div key={it.n} style={{ position:'absolute', left:0, top:i*146 }}>
            <MetaCard item={it} rv={rv} w={816} />
          </div>
        );
      })}
    </div>
  );
}

// ════════ S3 — 连接 ════════
function SceneConnect() {
  const time = useTime();
  const rack = pop(time, 15.6, 0.6);
  const cu   = reveal(time, 16.4, { dist:0, dur:0.6 });
  const beam = clamp((time - 18.4) / 0.6, 0, 1);
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <SectionHead time={time} at={15.6} kicker="MIDSTREAM · 04–06" title="让万卡协同 · 互联与光" color={CHAIN[3].color} />
      {/* rack */}
      <div style={{ position:'absolute', left:330, top:300, width:300, height:520,
        opacity:rack.opacity, transform:`scale(${rack.scale})`, transformOrigin:'center',
        background:'#F7FAFD', border:`2px solid ${LINE}`, borderRadius:18, padding:18,
        boxShadow:'0 14px 40px rgba(10,24,40,0.08)' }}>
        {Array.from({length:6}).map((_,i)=>(
          <div key={i} style={{ height:64, marginBottom:12, borderRadius:8,
            background: i%2? '#E7EDF5':'#F2F6FB', border:`1px solid ${LINE}`,
            display:'flex', alignItems:'center', paddingLeft:14, gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:6, background: i<3?CHAIN[4].color:CHAIN[3].color }} />
            <div style={{ fontFamily:MONO, fontSize:12, color:MUTE }}>{i<3?'GPU TRAY':'DPU SWITCH'}</div>
          </div>
        ))}
        {/* copper lines */}
        <div style={{ position:'absolute', left:-2, top:60, width:24, height:380, opacity:cu.opacity }}>
          {Array.from({length:3}).map((_,i)=>(
            <div key={i} style={{ position:'absolute', left:i*8, top:0, width:3, height:'100%',
              background:CHAIN[3].color, borderRadius:2, opacity:0.5 }} />
          ))}
        </div>
        <FlowDots x={4} y={64} len={372} vertical time={time} color={CHAIN[4].color} count={4} speed={0.8} size={7} />
      </div>
      {/* light beams leaving rack */}
      <div style={{ position:'absolute', left:632, top:430, width:260, height:120, opacity:beam }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{ position:'absolute', left:0, top:i*34, width:`${beam*100}%`, height:8, borderRadius:6,
            background:`linear-gradient(90deg, ${CHAIN[5].color}, transparent)` }} />
        ))}
        <div style={{ position:'absolute', left:0, top:118, fontFamily:MONO, fontSize:14, color:CHAIN[5].color, letterSpacing:'0.08em' }}>
          800G → 1.6T → 3.2T
        </div>
      </div>
      <SceneCards items={[CHAIN[3],CHAIN[4],CHAIN[5]]} times={[16.2,17.6,19.0]} time={time} />
    </div>
  );
}

// ════════ S4 — 基建 ════════
function SceneInfra() {
  const time = useTime();
  const rack = pop(time, 26.6, 0.55);
  const bolt = pop(time, 27.6, 0.5);
  const loop = reveal(time, 28.8, { dist:0, dur:0.6 });
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <SectionHead time={time} at={26.6} kicker="INFRA · 07–09" title="喂饱算力 · 电力与液冷" color={CHAIN[6].color} />
      <div style={{ position:'absolute', left:330, top:300, width:320, height:520 }}>
        {/* rack */}
        <div style={{ position:'absolute', left:30, top:0, width:230, height:500,
          opacity:rack.opacity, transform:`scale(${rack.scale})`, transformOrigin:'center',
          background:'#F7FAFD', border:`2px solid ${LINE}`, borderRadius:18, padding:16,
          boxShadow:'0 14px 40px rgba(10,24,40,0.08)' }}>
          {Array.from({length:7}).map((_,i)=>(
            <div key={i} style={{ height:54, marginBottom:8, borderRadius:7,
              background:i%2?'#E7EDF5':'#F2F6FB', border:`1px solid ${LINE}` }} />
          ))}
        </div>
        {/* power bolt badge */}
        <div style={{ position:'absolute', left:0, top:20, opacity:bolt.opacity, transform:`scale(${bolt.scale})`,
          background:CHAIN[6].color, color:'#fff', borderRadius:12, padding:'8px 14px',
          fontFamily:MONO, fontSize:18, fontWeight:700, boxShadow:'0 8px 20px rgba(90,60,150,0.25)' }}>⚡130kW</div>
        {/* cooling loop */}
        <div style={{ position:'absolute', left:255, top:60, width:60, height:400, opacity:loop.opacity }}>
          <div style={{ position:'absolute', left:0, top:0, width:46, height:400, border:`6px solid ${CHAIN[7].color}`,
            borderRadius:24, opacity:0.55 }} />
          <FlowDots x={17} y={6} len={388} vertical time={time} color={CHAIN[7].color} count={6} speed={1.1} size={10} />
        </div>
      </div>
      <SceneCards items={[CHAIN[6],CHAIN[7],CHAIN[8]]} times={[27.4,28.8,30.2]} time={time} />
    </div>
  );
}

// ════════ S5 — 数据中心 / 水龙头 ════════
function SceneFaucet() {
  const time = useTime();
  const t  = reveal(time, 37.5, { dist:16 });
  const dc = pop(time, 38.0, 0.6);
  const card = reveal(time, 39.0, { dist:24 });
  const fan = clamp((time - 40.0) / 1.0, 0, 1);
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <div style={{ position:'absolute', left:100, top:150, opacity:t.opacity, transform:`translateY(${t.y}px)` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:12, height:12, borderRadius:7, background:CHAIN[9].color }} />
          <div style={{ fontFamily:MONO, fontSize:15, letterSpacing:'0.18em', color:MUTE }}>THE FAUCET · 10</div>
        </div>
        <div style={{ fontFamily:CJK, fontSize:50, fontWeight:700, color:INK, marginTop:14 }}>数据中心 · 产业链的“水龙头”</div>
      </div>

      {/* cloud capex source */}
      <div style={{ position:'absolute', left:660, top:300, width:600, textAlign:'center', opacity:dc.opacity }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:CARD, border:`1px solid ${LINE}`,
          borderRadius:999, padding:'10px 24px', boxShadow:'0 8px 24px rgba(10,24,40,0.06)' }}>
          <div style={{ fontFamily:CJK, fontSize:22, fontWeight:600, color:INK }}>云客户 · 资本开支</div>
          <div style={{ fontFamily:MONO, fontSize:20, color:CHAIN[9].color, fontWeight:700 }}>¥</div>
        </div>
      </div>
      {/* money stream down */}
      <div style={{ position:'absolute', left:957, top:360, width:6, height:120, opacity:dc.opacity }}>
        <div style={{ position:'absolute', left:0, top:0, width:3, height:'100%', background:LINE }} />
        <FlowDots x={-4} y={0} len={110} vertical time={time} color={CHAIN[9].color} count={5} speed={1.4} size={11} />
      </div>
      {/* datacenter building */}
      <div style={{ position:'absolute', left:760, top:480, width:400, height:230,
        opacity:dc.opacity, transform:`scale(${dc.scale})`, transformOrigin:'top center',
        background:'#F7FAFD', border:`2px solid ${CHAIN[9].color}`, borderRadius:16, padding:20,
        display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12,
        boxShadow:'0 18px 50px rgba(50,70,140,0.12)' }}>
        {Array.from({length:5}).map((_,i)=>(
          <div key={i} style={{ background:'#E7EDF5', border:`1px solid ${LINE}`, borderRadius:8 }} />
        ))}
        <div style={{ position:'absolute', left:0, right:0, bottom:-34, textAlign:'center',
          fontFamily:CJK, fontSize:18, color:MUTE }}>AI 数据中心</div>
      </div>
      {/* fan-out arrows feeding the whole chain */}
      <div style={{ position:'absolute', left:660, top:780, width:600, opacity:fan, transform:`translateY(${(1-fan)*12}px)` }}>
        <div style={{ fontFamily:CJK, fontSize:24, fontWeight:600, color:INK, textAlign:'center', marginBottom:14 }}>
          他们花钱 → <span style={{ color:CHAIN[9].color }}>全产业链吃饭</span>
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:9 }}>
          {CHAIN.slice(0,9).map((c,i)=>(
            <div key={i} style={{ width:30, height:30, borderRadius:8, background:c.color,
              opacity: clamp((time - (40.4 + i*0.08)) / 0.3, 0, 1),
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:MONO, fontSize:11, color:'#fff', fontWeight:700 }}>{c.n}</div>
          ))}
        </div>
      </div>

      <div style={{ position:'absolute', left:100, top:340, width:520, opacity:card.opacity, transform:`translateY(${card.y}px)` }}>
        <MetaCard item={CHAIN[9]} rv={{opacity:1,y:0}} w={520} />
        <div style={{ marginTop:26, fontFamily:CJK, fontSize:21, color:MUTE, lineHeight:1.6 }}>
          越往上游，越是“卖铲子”的生意；<br/>越往下游，越靠近真实需求与现金流。
        </div>
      </div>
    </div>
  );
}

// ════════ S6 — 应用前线 ════════
function RobotIcon({ color }) {
  return (
    <div style={{ position:'relative', width:140, height:160 }}>
      <div style={{ position:'absolute', left:67, top:0, width:6, height:20, background:color, borderRadius:3 }} />
      <div style={{ position:'absolute', left:62, top:-8, width:16, height:16, borderRadius:9, background:color }} />
      <div style={{ position:'absolute', left:30, top:22, width:80, height:62, borderRadius:18, background:'#F7FAFD', border:`3px solid ${color}` }} />
      <div style={{ position:'absolute', left:48, top:46, width:14, height:14, borderRadius:8, background:color }} />
      <div style={{ position:'absolute', left:78, top:46, width:14, height:14, borderRadius:8, background:color }} />
      <div style={{ position:'absolute', left:38, top:92, width:64, height:64, borderRadius:16, background:'#F7FAFD', border:`3px solid ${color}` }} />
    </div>
  );
}
function SatIcon({ color }) {
  return (
    <div style={{ position:'relative', width:180, height:140 }}>
      <div style={{ position:'absolute', left:74, top:40, width:44, height:64, borderRadius:12, background:'#F7FAFD', border:`3px solid ${color}` }} />
      <div style={{ position:'absolute', left:0,  top:48, width:62, height:46, borderRadius:8, border:`3px solid ${color}`,
        background:`repeating-linear-gradient(90deg, ${color} 0 2px, transparent 2px 14px)`, opacity:0.9 }} />
      <div style={{ position:'absolute', left:118, top:48, width:62, height:46, borderRadius:8, border:`3px solid ${color}`,
        background:`repeating-linear-gradient(90deg, ${color} 0 2px, transparent 2px 14px)`, opacity:0.9 }} />
      <div style={{ position:'absolute', left:84, top:6, width:24, height:24, borderRadius:14, border:`3px solid ${color}`, background:'#F7FAFD' }} />
    </div>
  );
}
function SceneApps() {
  const time = useTime();
  const t   = reveal(time, 47.0, { dist:16 });
  const tileL = pop(time, 47.6, 0.6);
  const tileR = pop(time, 49.6, 0.6);
  const tiles = [
    { item: APPS[0], st: tileL, icon: <RobotIcon color={APPS[0].color} /> },
    { item: APPS[1], st: tileR, icon: <SatIcon color={APPS[1].color} /> },
  ];
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <div style={{ position:'absolute', left:100, top:150, opacity:t.opacity, transform:`translateY(${t.y}px)` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:12, height:12, borderRadius:7, background:APPS[0].color }} />
          <div style={{ fontFamily:MONO, fontSize:15, letterSpacing:'0.18em', color:MUTE }}>FRONTIER · 11–12</div>
        </div>
        <div style={{ fontFamily:CJK, fontSize:50, fontWeight:700, color:INK, marginTop:14 }}>应用前线 · AI 下半场</div>
      </div>
      <div style={{ position:'absolute', left:100, top:330, right:100, display:'flex', gap:40 }}>
        {tiles.map((tl,i)=>(
          <div key={i} style={{ flex:1, opacity:tl.st.opacity, transform:`scale(${tl.st.scale})`, transformOrigin:'center',
            background:CARD, border:`1px solid ${LINE}`, borderTop:`5px solid ${tl.item.color}`, borderRadius:22,
            padding:'44px 48px', height:560, boxShadow:'0 18px 50px rgba(10,24,40,0.07)',
            display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <Badge item={tl.item} size={44} />
              <div style={{ fontFamily:MONO, fontSize:14, color:FAINT, letterSpacing:'0.1em' }}>{tl.item.en}</div>
            </div>
            <div style={{ fontFamily:CJK, fontSize:42, fontWeight:700, color:INK, marginTop:24, letterSpacing:'-0.01em' }}>{tl.item.name}</div>
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>{tl.icon}</div>
            <div style={{ fontFamily:CJK, fontSize:23, color:MUTE, lineHeight:1.55 }}>{tl.item.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════ S7 — 全景一图流 ════════
function SceneMap() {
  const time = useTime();
  const t = reveal(time, 55.2, { dist:16 });
  const cta = reveal(time, 58.4, { dist:14 });
  const all = [...CHAIN, ...APPS];
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <div style={{ position:'absolute', left:0, right:0, top:150, textAlign:'center', opacity:t.opacity, transform:`translateY(${t.y}px)` }}>
        <div style={{ fontFamily:MONO, fontSize:15, letterSpacing:'0.22em', color:MUTE }}>THE FULL MAP · 12</div>
        <div style={{ fontFamily:CJK, fontSize:52, fontWeight:700, color:INK, marginTop:12 }}>这就是 AI 产业链全景</div>
      </div>
      {/* group labels */}
      <div style={{ position:'absolute', left:130, top:300, fontFamily:CJK, fontSize:18, fontWeight:600, color:MUTE }}>产业链纵深 · 供应链上下游</div>
      <div style={{ position:'absolute', left:130, top:300, width:1660, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:18, marginTop:0 }}>
        <div style={{ gridColumn:'1 / -1', height:30 }} />
        {CHAIN.map((c,i)=>{
          const st = pop(time, 55.6 + i*0.06, 0.5);
          return <PillCard key={c.n} item={c} st={st} />;
        })}
      </div>
      <div style={{ position:'absolute', left:130, top:580, fontFamily:CJK, fontSize:18, fontWeight:600, color:MUTE }}>应用前线 · AI 下游场景</div>
      <div style={{ position:'absolute', left:130, top:616, width:1660, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:18 }}>
        {APPS.map((c,i)=>{
          const st = pop(time, 56.4 + i*0.1, 0.5);
          return <PillCard key={c.n} item={c} st={st} wide />;
        })}
      </div>
      <div style={{ position:'absolute', left:0, right:0, top:790, textAlign:'center', opacity:cta.opacity, transform:`translateY(${cta.y}px)` }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:14, background:INK, color:'#fff',
          borderRadius:999, padding:'16px 34px' }}>
          <div style={{ fontFamily:CJK, fontSize:24, fontWeight:600 }}>一张图看懂 AI 产业链</div>
          <div style={{ fontFamily:MONO, fontSize:22, color:SKY }}>截图保存 · 转发给朋友</div>
        </div>
      </div>
    </div>
  );
}
function PillCard({ item, st, wide }) {
  return (
    <div style={{ gridColumn: wide ? 'span 2' : 'auto',
      opacity:st.opacity, transform:`scale(${st.scale})`, transformOrigin:'center',
      background:CARD, border:`1px solid ${LINE}`, borderLeft:`4px solid ${item.color}`, borderRadius:13,
      padding:'14px 16px', boxShadow:'0 6px 18px rgba(10,24,40,0.05)', minHeight:84 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <Badge item={item} size={26} />
        <div style={{ fontFamily:CJK, fontSize:18, fontWeight:700, color:INK }}>{item.name}</div>
      </div>
      <div style={{ fontFamily:CJK, fontSize:13.5, color:MUTE, marginTop:7, lineHeight:1.35 }}>{item.meta}</div>
    </div>
  );
}

// ════════ S8 — 品牌片尾 ════════
function SceneEnd() {
  const time = useTime();
  const t0 = 64.4;
  const lg = pop(time, t0+0.2, 0.6);
  const nm = reveal(time, t0+0.6, { dist:16 });
  const tg = reveal(time, t0+1.0, { dist:14 });
  const ct = reveal(time, t0+1.6, { dist:12 });
  return (
    <div style={{ position:'absolute', inset:0, background:NAVY, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:26 }}>
      <img src={LOGO} alt="" style={{ width:300, height:300, opacity:lg.opacity, transform:`scale(${lg.scale})`, willChange:'transform,opacity' }} />
      <div style={{ fontFamily:CJK, fontSize:60, fontWeight:700, color:'#EEF0F8', letterSpacing:'0.01em', opacity:nm.opacity, transform:`translateY(${nm.y}px)` }}>YoYo AI 日报</div>
      <div style={{ fontFamily:CJK, fontSize:28, color:SKY, opacity:tg.opacity, transform:`translateY(${tg.y}px)` }}>每天 60 秒 · 看懂 AI 产业链</div>
      <div style={{ marginTop:14, display:'inline-flex', alignItems:'center', gap:16, background:BLUE, color:NAVY, borderRadius:999, padding:'16px 38px', opacity:ct.opacity, transform:`translateY(${ct.y}px)` }}>
        <div style={{ fontFamily:CJK, fontSize:25, fontWeight:700 }}>关注 · 点赞 · 转发</div>
      </div>
      <div style={{ position:'absolute', left:0, right:0, bottom:44, textAlign:'center', fontFamily:MONO, fontSize:15, letterSpacing:'0.22em', color:'#8FA2B8', opacity:ct.opacity }}>YOYO AI DAILY</div>
    </div>
  );
}

// ════════ ROOT ════════
function AIChainVideo() {
  return (
    <Stage width={1920} height={1080} duration={70} background={BG} persistKey="aichain">
      <Hud />
      <Sprite start={0}    end={5.0}>  <SceneWrap start={0}    end={5.0}>  <SceneTitle />   </SceneWrap></Sprite>
      <Sprite start={5.0}  end={15.2}> <SceneWrap start={5.0}  end={15.2}> <SceneChip />    </SceneWrap></Sprite>
      <Sprite start={15.2} end={26.2}> <SceneWrap start={15.2} end={26.2}> <SceneConnect /> </SceneWrap></Sprite>
      <Sprite start={26.2} end={37.2}> <SceneWrap start={26.2} end={37.2}> <SceneInfra />   </SceneWrap></Sprite>
      <Sprite start={37.2} end={46.4}> <SceneWrap start={37.2} end={46.4}> <SceneFaucet />  </SceneWrap></Sprite>
      <Sprite start={46.4} end={55.0}> <SceneWrap start={46.4} end={55.0}> <SceneApps />    </SceneWrap></Sprite>
      <Sprite start={55.0} end={64.4}> <SceneWrap start={55.0} end={64.4}> <SceneMap />     </SceneWrap></Sprite>
      <Sprite start={64.4} end={70.1}> <SceneWrap start={64.4} end={70.2}> <SceneEnd />     </SceneWrap></Sprite>
    </Stage>
  );
}

module.exports = { AIChainVideo };
window.AIChainVideo = AIChainVideo;

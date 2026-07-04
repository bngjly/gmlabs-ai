#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_video.py — Claude Design HTML 动画 → YouTube 成品 MP4 + SRT
流程:
  1. TTS：scenes.json 每场景 → MP3（edge-tts XiaoxiaoNeural，复用 BTC 管线参数）
  2. 录制：Playwright 打开 HTML。难点：页面加载时长不可控、动画 autoplay，
     录出的 webm 里"动画 t=0"位置未知会导致配音错位。方案：注入 shim 冻结
     requestAnimationFrame 把动画卡在第 0 帧 + 页面角落放洋红标记；就绪后
     撤标记并放行动画（同一帧内），后期检测标记消失帧 = 动画 t=0。
  3. 合成：检测 t=0 → ffmpeg 裁播放条 + 从 t=0 截取 → 按场景时间轴混配音 → MP4
  4. 字幕：按场景时间轴生成 SRT（YouTube 上传用，不烧录）

用法:
  python make_video.py --scenes scenes.json --html "path/to/xxx.dc.html" --name OutputName [--skip-tts] [--skip-record]

默认（不传 --scenes/--html/--name）走全景视频这套，向后兼容旧调用。
"""
import argparse
import asyncio
import http.server
import json
import subprocess
import sys
import threading
from pathlib import Path

BASE = Path(__file__).resolve().parent
DEFAULT_HTML = BASE.parent / "design_handoff_publishing" / "AI产业链全景图谱视频.html"
DEFAULT_SCENES = BASE / "scenes.json"
DEFAULT_NAME = "AI产业链全景图谱"

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "+10%"

W, H, BAR = 1920, 1080, 44  # Stage 画布 + 播放条高度
FPS = 30

FREEZE_SHIM = """
(() => {
  const realRaf = window.requestAnimationFrame.bind(window);
  let frozen = true, queue = [];
  window.__releaseAnim = () => {
    frozen = false;
    const q = queue; queue = [];
    q.forEach(cb => realRaf(cb));
  };
  window.requestAnimationFrame = (cb) => {
    if (!frozen) return realRaf(cb);
    queue.push(cb);
    return 0;
  };
})();
"""

MARKER_JS = """
(() => {
  const d = document.createElement('div');
  d.id = '__t0marker';
  d.style.cssText = 'position:fixed;left:0;top:0;width:80px;height:80px;background:#FF00FF;z-index:2147483647;';
  document.body.appendChild(d);
})();
"""

RELEASE_JS = """
(() => {
  document.getElementById('__t0marker').remove();
  window.__releaseAnim();
})();
"""


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenes", default=str(DEFAULT_SCENES))
    ap.add_argument("--html", default=str(DEFAULT_HTML))
    ap.add_argument("--name", default=DEFAULT_NAME)
    ap.add_argument("--skip-tts", action="store_true")
    ap.add_argument("--skip-record", action="store_true")
    return ap.parse_args()


def load_scenes(scenes_path):
    return json.loads(Path(scenes_path).read_text(encoding="utf-8"))


def paths_for(name):
    audio = BASE / "audio" / name
    raw = BASE / "raw" / name
    out = BASE / "out"
    audio.mkdir(parents=True, exist_ok=True)
    raw.mkdir(parents=True, exist_ok=True)
    out.mkdir(exist_ok=True)
    return audio, raw, out


# ── 1. TTS ────────────────────────────────────────────────────────────
async def tts(scenes_path, name):
    import edge_tts
    data = load_scenes(scenes_path)
    audio_dir, _, _ = paths_for(name)
    for sc in data["scenes"]:
        out = audio_dir / f"{sc['id']}.mp3"
        await edge_tts.Communicate(sc["text"], voice=VOICE, rate=RATE).save(str(out))
        r = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(out)], capture_output=True, text=True,
            encoding="utf-8", errors="replace")
        dur = float(r.stdout.strip())
        window = sc["end"] - sc["start"]
        flag = "!! 超窗" if dur > window else "OK"
        print(f"[TTS] {sc['id']:14s} {dur:5.2f}s / 窗口 {window:5.2f}s  {flag}")


def _start_http_server(serve_dir):
    """.dc.html 靠 x-import fetch() 加载 jsx，file:// 协议下会被 CORS 挡住，
    需要本地 HTTP server 才能正常渲染（全景视频那种自包含 bundle 不需要）。"""
    handler = lambda *a, **kw: http.server.SimpleHTTPRequestHandler(*a, directory=str(serve_dir), **kw)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd, port


# ── 2. 录制 ───────────────────────────────────────────────────────────
def record(html_path, scenes_path, name):
    from playwright.sync_api import sync_playwright
    _, raw_dir, _ = paths_for(name)
    data = load_scenes(scenes_path)
    total = data["duration"]
    html = Path(html_path).resolve()
    needs_server = ".dc.html" in html.name

    httpd = None
    if needs_server:
        httpd, port = _start_http_server(html.parent)
        url = f"http://127.0.0.1:{port}/{html.name}"
    else:
        url = html.as_uri()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            ctx = browser.new_context(
                viewport={"width": W, "height": H + BAR},
                record_video_dir=str(raw_dir),
                record_video_size={"width": W, "height": H + BAR},
            )
            ctx.add_init_script(FREEZE_SHIM)
            page = ctx.new_page()
            page.goto(url)
            page.evaluate(MARKER_JS)
            page.wait_for_timeout(9000)             # 等 bundle 完全加载（动画被冻结，等多久都不跑）
            page.evaluate(RELEASE_JS)               # 撤标记 + 放行动画 = t0
            page.wait_for_timeout(int((total + 1.5) * 1000))
            video_path = page.video.path()
            ctx.close()
            browser.close()
    finally:
        if httpd:
            httpd.shutdown()

    raw_out = raw_dir / "capture.webm"
    Path(video_path).replace(raw_out)
    print(f"[REC] {raw_out} ({raw_out.stat().st_size/1e6:.1f} MB)")


# ── 3. 检测 t0（洋红标记最后出现的帧）─────────────────────────────────
def detect_t0(raw_dir):
    # 注意：movie= 里 Windows 盘符冒号会被 lavfi 当参数分隔符，必须用相对路径（cwd 切到 raw_dir）
    r = subprocess.run(
        ["ffprobe", "-f", "lavfi",
         "-i", "movie=capture.webm,crop=80:80:0:0,signalstats",
         "-show_entries", "frame=pts_time:frame_tags=lavfi.signalstats.SATAVG",
         "-of", "csv=p=0", "-v", "quiet"],
        capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=str(raw_dir))
    last_marker = 0.0
    for line in r.stdout.splitlines():
        parts = line.strip().split(",")
        if len(parts) >= 2 and parts[0] and parts[1]:
            try:
                pts, sat = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            if sat > 80:          # 洋红帧
                last_marker = pts
    t0 = last_marker + 1.0 / 60   # 标记消失后第一帧
    print(f"[T0] 标记最后帧 {last_marker:.3f}s → 动画起点 {t0:.3f}s")
    return t0


# ── 4. 合成 ───────────────────────────────────────────────────────────
def mux(scenes_path, name):
    audio_dir, raw_dir, out_dir = paths_for(name)
    data = load_scenes(scenes_path)
    total = data["duration"]
    raw = raw_dir / "capture.webm"
    t0 = detect_t0(raw_dir)

    inputs, delays = [], []
    for i, sc in enumerate(data["scenes"]):
        inputs += ["-i", str(audio_dir / f"{sc['id']}.mp3")]
        ms = int(sc["start"] * 1000)
        delays.append(f"[{i+1}:a]adelay={ms}|{ms}[a{i}]")
    n = len(data["scenes"])
    amix = "".join(f"[a{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0[aout]"
    filter_a = ";".join(delays + [amix])

    out_mp4 = out_dir / f"{name}_final.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-ss", f"{t0:.3f}", "-i", str(raw), *inputs,
        "-filter_complex",
        f"[0:v]crop={W}:{H}:0:0,fps={FPS}[vout];{filter_a}",
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-t", str(total),
        str(out_mp4),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print(r.stderr[-1500:])
        sys.exit(1)
    print(f"[MUX] {out_mp4} ({out_mp4.stat().st_size/1e6:.1f} MB)")


# ── 5. SRT ────────────────────────────────────────────────────────────
def fmt_ts(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((t % 1)*1000):03d}"


def srt(scenes_path, name):
    _, _, out_dir = paths_for(name)
    data = load_scenes(scenes_path)
    lines = []
    for i, sc in enumerate(data["scenes"], 1):
        lines.append(f"{i}\n{fmt_ts(sc['start'])} --> {fmt_ts(sc['end'])}\n{sc['text']}\n")
    out = out_dir / f"{name}.srt"
    out.write_text("\n".join(lines), encoding="utf-8-sig")
    print(f"[SRT] {out}")


if __name__ == "__main__":
    args = parse_args()
    if not args.skip_tts:
        asyncio.run(tts(args.scenes, args.name))
    if not args.skip_record:
        record(args.html, args.scenes, args.name)
    mux(args.scenes, args.name)
    srt(args.scenes, args.name)
    print(f"\n[DONE] {args.name} 成品在 out/ 目录")

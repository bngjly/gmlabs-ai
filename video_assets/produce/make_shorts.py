#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_shorts.py — 横版成片 → 竖版 Shorts（1080×1920）

方案：模糊放大背景填充 + 原片居中 + 顶部两行大标题 + 底部 gmlabs.ai 标。
原生竖版需在 Claude Design 用 portrait 模板重做动画；本脚本是横转竖的
标准过渡方案，让现有横版立刻能投 Shorts（<3min 竖版即入 Shorts 推荐池）。

用法:
  python make_shorts.py chain_map cowos osat cpo   # 可多个
  python make_shorts.py --all
"""
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
OUT = BASE / "out"
FONT = "C\\:/Windows/Fonts/msyhbd.ttc"

W, H = 1080, 1920          # Shorts 画布
FG_H = 607                 # 1080*(1080/1920) 原片等比缩放后高度

SHORTS = {
    "chain_map": {
        "src": "AI产业链全景图谱_final.mp4",
        "title1": "60秒看懂",
        "title2": "AI产业链全景",
    },
    "cowos": {
        "src": "CoWoS_final.mp4",
        "title1": "全世界都缺AI芯片",
        "title2": "瓶颈是CoWoS封装",
    },
    "osat": {
        "src": "OSAT_final.mp4",
        "title1": "晶圆造好就能用？",
        "title2": "还差OSAT封测两步",
    },
    "cpo": {
        "src": "CPO_final.mp4",
        "title1": "电信号最贵的冤枉路",
        "title2": "CPO共封装光学",
    },
}


def make_one(key):
    v = SHORTS[key]
    src = OUT / v["src"]
    if not src.exists():
        print(f"[错误] 找不到 {src}", file=sys.stderr)
        return False
    dst = OUT / f"{key}_short.mp4"

    # 背景：放大裁切+重模糊+压暗；前景：等比缩放居中；文字：顶部两行标题+底部官网
    filter_complex = (
        f"[0:v]split=2[bg][fg];"
        f"[bg]scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},boxblur=luma_radius=40:luma_power=2,"
        f"eq=brightness=-0.15[bgv];"
        f"[fg]scale={W}:-2[fgv];"
        f"[bgv][fgv]overlay=(W-w)/2:(H-h)/2,"
        f"drawtext=fontfile='{FONT}':text='{v['title1']}':fontsize=72:fontcolor=white:"
        f"x=(w-tw)/2:y=280:box=1:boxcolor=black@0.35:boxborderw=18,"
        f"drawtext=fontfile='{FONT}':text='{v['title2']}':fontsize=72:fontcolor=#4fc3f7:"
        f"x=(w-tw)/2:y=400:box=1:boxcolor=black@0.35:boxborderw=18,"
        f"drawtext=fontfile='{FONT}':text='gmlabs.ai · AI产业链图谱':fontsize=40:fontcolor=white@0.85:"
        f"x=(w-tw)/2:y=h-320:box=1:boxcolor=black@0.4:boxborderw=14[vout]"
    )
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        str(dst),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print(r.stderr[-1200:], file=sys.stderr)
        return False
    print(f"[OK] {dst.name} ({dst.stat().st_size/1e6:.1f} MB)")
    return True


def main():
    args = [a.lower() for a in sys.argv[1:]]
    if not args:
        print(__doc__)
        sys.exit(0)
    keys = list(SHORTS.keys()) if "--all" in args else [a for a in args if a in SHORTS]
    if not keys:
        print(f"[错误] 未知 key，可选: {', '.join(SHORTS)}", file=sys.stderr)
        sys.exit(1)
    ok = all(make_one(k) for k in keys)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
notify_tg.py — YouTube 视频发布后推送到 @yoyoaidaily

与每日 BTC/ETH 策略报告→上传 VPS→VPS 用真实凭证发送 的思路一致：
本地不持有任何 Telegram token，SSH 远程调用 VPS 上 twitter_monitor 已有的
send_telegram()（读 VPS 本地的 config.py，那里的 TELEGRAM_CHANNEL 就是
@yoyoaidaily）。跟 KOL/Serenity 的自动抓取推送共用同一个 bot，但这里只
负责"视频上线播报"这一类消息，互不干扰。

用法：
  python notify_tg.py --title "标题" --url "https://youtu.be/xxx" --desc "一句话简介"
"""
import argparse
import subprocess
import sys

VPS = "root@37.60.251.23"
REMOTE_DIR = "/root/twitter_monitor"


def send(title: str, url: str, desc: str = "") -> bool:
    text = (
        f"🎬 <b>新视频上线</b> | YoYo AI 日报\n\n"
        f"{title}\n"
        + (f"\n{desc}\n" if desc else "")
        + f"\n▶️ {url}\n\n"
        f"🗺 完整交互式 AI 产业链图谱：https://www.gmlabs.ai/?utm_source=telegram&utm_medium=post&utm_campaign=video_notify"
    )
    # 用 heredoc 把消息传给远端 python，避免本地拼 shell 引号转义问题
    remote_py = (
        "import sys; sys.path.insert(0, '.'); "
        "import main; "
        "msg = sys.stdin.read(); "
        "ok = main.send_telegram(msg); "
        "print('SENT_OK' if ok else 'SENT_FAIL')"
    )
    try:
        r = subprocess.run(
            ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10", VPS,
             f"cd {REMOTE_DIR} && python3 -c \"{remote_py}\""],
            input=text, capture_output=True, text=True, encoding="utf-8", timeout=20,
        )
    except subprocess.TimeoutExpired:
        print("[FAIL] SSH 超时", file=sys.stderr)
        return False

    if "SENT_OK" in r.stdout:
        print("[OK] 已通过 VPS 推送到 @yoyoaidaily")
        return True
    print(f"[FAIL] stdout={r.stdout[:300]} stderr={r.stderr[:300]}", file=sys.stderr)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True)
    ap.add_argument("--url", required=True)
    ap.add_argument("--desc", default="")
    args = ap.parse_args()
    ok = send(args.title, args.url, args.desc)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

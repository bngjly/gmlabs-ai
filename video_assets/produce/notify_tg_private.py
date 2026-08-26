#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
notify_tg_private.py — 视频+X素材私聊推送（YoYoBTCBot → 用户私聊）

与 notify_tg.py（推公开频道 @yoyoaidaily，走VPS SSH）完全独立的第二条通道：
这里用 btc/mtf_dryrun_vps.py 里"BTC"标签bot的token，直接本地发送到用户
私聊（chat_id=487404692），不碰VPS、不经SSH——因为这个bot的token本地就是
真实值（不像twitter_monitor/config.py那份是VPS专属空占位）。

用途：视频发布后，把面向用户自己审阅的草稿素材（文案/短视频/配图）推
到私聊，不进公开频道（公开频道只放给订阅用户看的正式通知）。

用法：
  python notify_tg_private.py --text "消息"
  python notify_tg_private.py --photo path.png --caption "说明"
  python notify_tg_private.py --video path.mp4 --caption "说明"
  python notify_tg_private.py --doc path.md --caption "说明"
"""
import argparse
import sys
from pathlib import Path

import requests

BTC_DIR = Path(r"C:\Users\86135\Desktop\WorkSpace\btc")
sys.path.insert(0, str(BTC_DIR))
from mtf_dryrun_vps import TG_BOT_TOKEN, TG_CHAT_ID  # noqa: E402

API = f"https://api.telegram.org/bot{TG_BOT_TOKEN}"


def send_text(text: str) -> bool:
    r = requests.post(f"{API}/sendMessage",
                      json={"chat_id": TG_CHAT_ID, "text": text, "parse_mode": "HTML"},
                      timeout=15)
    return _check(r)


def send_photo(path: str, caption: str = "") -> bool:
    with open(path, "rb") as f:
        r = requests.post(f"{API}/sendPhoto",
                          data={"chat_id": TG_CHAT_ID, "caption": caption},
                          files={"photo": f}, timeout=30)
    return _check(r)


def send_video(path: str, caption: str = "") -> bool:
    with open(path, "rb") as f:
        r = requests.post(f"{API}/sendVideo",
                          data={"chat_id": TG_CHAT_ID, "caption": caption},
                          files={"video": f}, timeout=60)
    return _check(r)


def send_document(path: str, caption: str = "") -> bool:
    with open(path, "rb") as f:
        r = requests.post(f"{API}/sendDocument",
                          data={"chat_id": TG_CHAT_ID, "caption": caption},
                          files={"document": f}, timeout=30)
    return _check(r)


def _check(r) -> bool:
    if r.status_code == 200:
        return True
    print(f"[FAIL] {r.status_code}: {r.text[:300]}", file=sys.stderr)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text")
    ap.add_argument("--photo")
    ap.add_argument("--video")
    ap.add_argument("--doc")
    ap.add_argument("--caption", default="")
    args = ap.parse_args()

    ok = True
    if args.text:
        ok = send_text(args.text)
    elif args.photo:
        ok = send_photo(args.photo, args.caption)
    elif args.video:
        ok = send_video(args.video, args.caption)
    elif args.doc:
        ok = send_document(args.doc, args.caption)
    else:
        print(__doc__)
        sys.exit(0)
    print("[OK] 已发送私聊" if ok else "[FAIL] 发送失败")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

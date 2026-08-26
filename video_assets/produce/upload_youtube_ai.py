#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
upload_youtube_ai.py — 上传 AI 产业链科普视频到 YouTube（ai_ecosystem 播放列表）

与 crypto 内容完全隔离：
  - 播放列表: ai_ecosystem（youtube_playlists.json）
  - TG 引导: @yoyoaidaily（AI 频道，绝不用 yoyocryptodaily）
  - UTM: utm_campaign 区分 chain_map / company_terms

复用 btc/ 的 OAuth 凭证（同一 YouTube 账号）。
用法:
  python upload_youtube_ai.py chain_map          # 上传全景视频
  python upload_youtube_ai.py cowos osat cpo     # 上传术语篇（可多个）
  python upload_youtube_ai.py --all              # 全部 4 个按顺序
"""
import json
import subprocess
import sys
import time
from pathlib import Path

import httplib2
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_httplib2 import AuthorizedHttp
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

sys.path.insert(0, str(Path(__file__).resolve().parent))
import notify_tg
import notify_tg_private

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

BTC = Path(r"C:\Users\86135\Desktop\WorkSpace\btc")
OUT = Path(__file__).resolve().parent / "out"
X_CLIPS = Path(__file__).resolve().parents[2] / "marketing" / "x_clips"
TOKEN_FILE = BTC / "youtube_token.json"
PLAYLIST_FILE = BTC / "youtube_playlists.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube",
          "https://www.googleapis.com/auth/youtube.force-ssl"]
PROXY_INFO = httplib2.ProxyInfo(httplib2.socks.PROXY_TYPE_HTTP, "127.0.0.1", 7890)

SITE = "https://www.gmlabs.ai"
TG = "https://t.me/yoyoaidaily"
DISCLAIMER = "⚠️ 内容仅供科普学习参考，不构成任何投资建议。"

VIDEOS = {
    "chain_map": {
        "file": "AI产业链全景图谱_final.mp4",
        "hook_end": 5.0,
        "srt": "AI产业链全景图谱.srt",
        "thumbnail": "封面_全景一图流.png",
        "title": "60秒看懂AI产业链全景：12个环节，从一块芯片到机器人与卫星",
        "utm": "utm_source=youtube&utm_medium=description&utm_campaign=chain_map&utm_content=chain_map_20260704",
        "chapters": (
            "0:00 AI 产业链全景\n"
            "0:05 芯片三件套：GPU · HBM · 先进封装\n"
            "0:15 互联与光：Retimer · 交换芯片 · 光模块\n"
            "0:26 基建：电力 · 液冷 · 上游设备\n"
            "0:37 数据中心：产业链的水龙头\n"
            "0:46 应用前线：机器人 · 卫星\n"
            "0:55 全景一图流"
        ),
        "intro": (
            "60 秒把 AI 产业链一次讲清：算力芯片、HBM、先进封装、互联、交换、光模块、"
            "电力、液冷、上游设备、数据中心，再到应用前线的机器人与卫星——12 个环节，一张图看懂。"
        ),
        "tags": ["AI", "AI产业链", "AI supply chain", "GPU", "HBM", "CoWoS", "光模块",
                 "optical module", "液冷", "liquid cooling", "英伟达", "NVIDIA", "台积电",
                 "TSMC", "半导体", "semiconductor", "科技投资", "机器人", "robotics",
                 "人工智能", "artificial intelligence", "数据中心", "data center",
                 "AI芯片", "AI chip", "算力", "YoYo AI日报", "AI科普"],
    },
    "cowos": {
        "file": "CoWoS_final.mp4",
        "hook_end": 6.0,
        "srt": "CoWoS.srt",
        "thumbnail": None,
        "title": "为什么全世界都缺AI芯片？瓶颈其实是“怎么拼起来”| CoWoS封装科普",
        "utm": "utm_source=youtube&utm_medium=description&utm_campaign=company_terms&utm_content=cowos_20260704",
        "chapters": (
            "0:00 问题：芯片瓶颈在哪\n"
            "0:06 逐层拼装：Substrate→Interposer→GPU→HBM\n"
            "0:34 为什么重要：布线密度·产能瓶颈·良率\n"
            "0:46 CoWoS 在产业链全景图谱中的位置"
        ),
        "intro": (
            "为什么全世界都缺 AI 芯片？瓶颈往往不在芯片本身，而在怎么把它拼起来——"
            "这就是 CoWoS，台积电的先进封装技术。一颗 AI 超级芯片的拼装过程："
            "封装基板 → 硅中介层 → GPU 裸片 → 两侧 HBM 内存堆栈 → 上千条微米级导线直连。"
        ),
        "tags": ["CoWoS", "先进封装", "advanced packaging", "AI芯片", "AI chip", "台积电",
                 "TSMC", "半导体", "semiconductor", "AI产业链", "AI supply chain", "HBM",
                 "GPU", "chiplet", "芯粒", "封装技术", "英伟达", "NVIDIA",
                 "YoYo AI日报", "AI科普"],
    },
    "osat": {
        "file": "OSAT_final.mp4",
        "hook_end": 6.0,
        "srt": "OSAT.srt",
        "thumbnail": None,
        "title": "晶圆造好芯片就能用了？还差关键两步 | OSAT封装测试科普",
        "utm": "utm_source=youtube&utm_medium=description&utm_campaign=company_terms&utm_content=osat_20260704",
        "chapters": (
            "0:00 问题：晶圆造好就能用吗\n"
            "0:06 第一步：切割裸片\n"
            "0:15 第二步：封装\n"
            "0:24 第三步：测试分选\n"
            "0:34 为什么重要：最后一公里·良率生意\n"
            "0:46 OSAT 在产业链全景图谱中的位置"
        ),
        "intro": (
            "台积电把晶圆造好之后，芯片就能直接用了吗？还差关键两步——这就是 OSAT，委外封装测试。"
            "三步走：把晶圆切成裸片 → 封装给裸片穿上盔甲 → 测试分选良品放行、次品淘汰。"
            "AI 时代 OSAT 也要做 2.5D/3D 堆叠，价值量在快速上升。"
        ),
        "tags": ["OSAT", "封装测试", "packaging test", "AI芯片", "AI chip", "半导体",
                 "semiconductor", "AI产业链", "AI supply chain", "芯片封装",
                 "chip packaging", "良率", "yield", "台积电", "TSMC",
                 "YoYo AI日报", "AI科普"],
    },
    "cpo": {
        "file": "CPO_final.mp4",
        "hook_end": 6.0,
        "srt": "CPO.srt",
        "thumbnail": None,
        "title": "数据中心里，电信号要走“最贵的冤枉路”| CPO共封装光学科普",
        "utm": "utm_source=youtube&utm_medium=description&utm_campaign=company_terms&utm_content=cpo_20260704",
        "chapters": (
            "0:00 问题：电信号的冤枉路\n"
            "0:06 传统方案：光模块插面板\n"
            "0:17 CPO 方案：光引擎搬到芯片旁\n"
            "0:28 对比：走线短了、功耗低了\n"
            "0:36 为什么重要：功耗·带宽密度·早期变量\n"
            "0:47 CPO 在产业链全景图谱中的位置"
        ),
        "intro": (
            "数据中心里，电信号出了芯片，要先走一段最贵的冤枉路——CPO，共封装光学，"
            "把光引擎直接焊到交换芯片旁边。传统方案光模块插在面板上，信号走一长段铜线才能转光出柜；"
            "CPO 走几毫米就完成光电转换，省的是万卡集群兆瓦级的电。"
        ),
        "tags": ["CPO", "共封装光学", "co-packaged optics", "光模块", "optical module",
                 "AI算力", "AI compute", "半导体", "semiconductor", "数据中心",
                 "data center", "交换芯片", "switch chip", "AI产业链",
                 "YoYo AI日报", "AI科普"],
    },
    "ep01_nvda": {
        "file": "EP01_NVDA_final.mp4",
        "hook_end": 13.0,
        "srt": "EP01_NVDA.srt",
        "thumbnail": None,
        "title": "全网都在吹英伟达，我讲它唯一的弱点 | 软肋系列EP01",
        "utm": "utm_source=youtube&utm_medium=description&utm_campaign=weakspot&utm_content=nvda_ws_20260717",
        "chapters": (
            "0:00 反着来：只讲它唯一的软肋\n"
            "0:14 30秒讲完它为什么强\n"
            "0:40 软肋本体：价值上移，它没卡位\n"
            "1:35 思科2000：卖铲人拿不到金矿\n"
            "2:15 客户反水：谷歌/亚马逊/微软/OpenAI全在自研\n"
            "2:50 三个判断\n"
            "3:18 数据背书：六维模型 S级 85.3，生态卡位唯一短板"
        ),
        "intro": (
            "英伟达，全网都在吹，好像没有弱点。这期反着来：只讲它唯一的软肋——生态卡位。"
            "AI 产业链十一层，它只站住算力层；2000 年的思科就是前车之鉴：互联网越来越大，"
            "钱却被上层赚走。而且谷歌、亚马逊、微软、Meta、OpenAI 全在自研芯片。"
            "看懂这个软肋，你就看懂 AI 的钱下一步流向哪。"
        ),
        "tags": ["英伟达", "NVDA", "NVIDIA", "英伟达软肋", "AI芯片", "AI chip", "思科",
                 "Cisco", "CUDA", "生态卡位", "AI产业链", "AI supply chain", "半导体",
                 "semiconductor", "美股", "科技股", "TPU", "自研芯片",
                 "YoYo AI日报", "软肋系列"],
    },
    "ep02_skhynix": {
        "file": "EP02_SKHYNIX_final.mp4",
        "hook_end": 7.3,
        "srt": "EP02_SKHYNIX.srt",
        "thumbnail": None,
        "title": "六维模型说：AI产业链评分最高的不是英伟达 | 软肋系列EP02",
        "utm": "utm_source=youtube&utm_medium=description&utm_campaign=weakspot&utm_content=skhynix_ws_20260825",
        "chapters": (
            "0:00 反共识：打分最高的不是它\n"
            "0:07 30秒共识：GPU依然是核心\n"
            "0:22 反转本体：HBM从配件变卡脖子技术\n"
            "0:50 类比：ASML对台积电的议价权\n"
            "1:13 数据证据：SK海力士S/90.1分 高于 英伟达S/85.3分\n"
            "1:36 三个判断\n"
            "2:01 数据背书：护城河23/25接近拉满"
        ),
        "intro": (
            "都在追捧造 GPU 的，但六维模型说：现在打分最高的，不是它。"
            "HBM 本来只是贴在 GPU 旁边喂数据的内存条，但现在它成了整条产业链的瓶颈——"
            "内存厂商开始把运算能力嵌进芯片里，从搬运工变成有技术壁垒的协作者。"
            "SK 海力士六维评分 90.1，S 级，比英伟达的 85.3 还高；三星 85.5，也是 S 级；"
            "但美光只有 80.1，A 级——不是所有内存厂商都吃到这波溢价。"
        ),
        "tags": ["SK海力士", "SK Hynix", "000660", "内存", "HBM", "DRAM", "半导体",
                 "semiconductor", "护城河", "三星", "Samsung", "美光", "Micron",
                 "ASML", "台积电", "TSMC", "AI供应链", "AI supply chain",
                 "AI产业链", "软肋系列", "YoYo AI日报", "六维评分"],
    },
}


def build_description(v):
    # 链接放最前——YouTube 折叠态只显示前 1-2 行，链接放在 intro 后面等于没曝光
    desc = (
        f"🔗 完整 AI 产业链图谱 + 286 家公司六维评分：{SITE}/?{v['utm']}\n\n"
        f"{v['intro']}\n\n"
        f"📬 每天 60 秒看懂一个 AI 产业链概念，Telegram 订阅：\n{TG}\n\n"
        f"章节：\n{v['chapters']}\n\n"
        f"{DISCLAIMER}\n\n"
        + " ".join(f"#{t.replace(' ', '')}" for t in v["tags"][:15])
    )
    # YouTube API 硬性拒收含 < > 的描述（invalidDescription），别等上传报错才发现
    bad = [c for c in ("<", ">") if c in desc]
    if bad:
        raise ValueError(f"描述含 YouTube 禁用字符 {bad}，改用「高于/低于/大于」等文字表达")
    return desc


def build_pinned_comment(v):
    return (
        f"👇 视频里提到的 AI 产业链交互图谱在这，286 家公司 + 六维客观评分，点开每家公司都能看详情：\n"
        f"{SITE}/?{v['utm']}\n\n"
        f"想每天追更，Telegram 订阅：{TG}"
    )


def make_x_clip(key, v):
    """截 Hook 场景当 X 短视频素材——视频+X宣发绑在一起，不再靠事后手动补。
    失败不影响主上传流程（X素材缺了可以补录，视频发布不能因为这个卡住）。"""
    hook_end = v.get("hook_end")
    if not hook_end:
        return None
    video_path = OUT / v["file"]
    if not video_path.exists():
        return None
    X_CLIPS.mkdir(parents=True, exist_ok=True)
    clip_path = X_CLIPS / f"{key}_hook_{hook_end:g}s.mp4"
    cmd = [
        "ffmpeg", "-y", "-v", "quiet", "-i", str(video_path),
        "-t", str(hook_end),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        str(clip_path),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not clip_path.exists():
        print(f"  [警告] X 素材剪辑失败: {r.stderr[-300:]}", file=sys.stderr)
        return None
    print(f"  已生成 X 素材: {clip_path}", file=sys.stderr)
    return clip_path


def authenticate():
    creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds.valid and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    authed_http = AuthorizedHttp(creds, http=httplib2.Http(proxy_info=PROXY_INFO))
    return build("youtube", "v3", http=authed_http)


def upload_one(service, key):
    v = VIDEOS[key]
    video_path = OUT / v["file"]
    if not video_path.exists():
        print(f"[错误] 找不到 {video_path}", file=sys.stderr)
        return None

    body = {
        "snippet": {
            "title": v["title"],
            "description": build_description(v),
            "tags": v["tags"],
            "categoryId": "27",  # Education
            "defaultLanguage": "zh-Hans",
        },
        "status": {"privacyStatus": "public", "selfDeclaredMadeForKids": False},
    }
    media = MediaFileUpload(str(video_path), mimetype="video/mp4",
                            resumable=True, chunksize=10 * 1024 * 1024)
    print(f"[上传] {v['file']} ...", file=sys.stderr)
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  进度: {int(status.progress()*100)}%", file=sys.stderr)
    video_id = response["id"]
    url = f"https://youtu.be/{video_id}"
    print(f"[完成] {key}: {url}", file=sys.stderr)

    # 加入 AI 专属播放列表（与 crypto_daily 隔离）
    playlists = json.loads(PLAYLIST_FILE.read_text(encoding="utf-8"))
    pl = playlists.get("ai_ecosystem")
    if pl:
        try:
            service.playlistItems().insert(part="snippet", body={
                "snippet": {"playlistId": pl,
                            "resourceId": {"kind": "youtube#video", "videoId": video_id}},
            }).execute()
            print(f"  已加入 ai_ecosystem 播放列表", file=sys.stderr)
        except Exception as e:
            print(f"  [警告] 加播放列表失败: {e}", file=sys.stderr)

    # 中文字幕
    srt = OUT / v["srt"]
    if srt.exists():
        try:
            service.captions().insert(part="snippet", body={
                "snippet": {"videoId": video_id, "language": "zh-Hans",
                            "name": "中文", "isDraft": False},
            }, media_body=MediaFileUpload(str(srt), mimetype="application/octet-stream")).execute()
            print(f"  已上传中文字幕", file=sys.stderr)
        except Exception as e:
            print(f"  [警告] 字幕上传失败: {e}", file=sys.stderr)

    # 封面
    if v.get("thumbnail"):
        thumb = OUT / v["thumbnail"]
        if thumb.exists():
            try:
                service.thumbnails().set(videoId=video_id,
                                         media_body=MediaFileUpload(str(thumb))).execute()
                print(f"  已设置封面", file=sys.stderr)
            except Exception as e:
                print(f"  [警告] 封面设置失败(账号可能未验证自定义封面权限): {e}", file=sys.stderr)

    # 置顶评论——YouTube API 不支持程序化置顶，发完评论需手动在 Studio 点一下"置顶"
    try:
        service.commentThreads().insert(part="snippet", body={
            "snippet": {"videoId": video_id,
                        "topLevelComment": {"snippet": {"textOriginal": build_pinned_comment(v)}}},
        }).execute()
        print("  已发评论（YouTube API 不支持程序化置顶，去 Studio 手动点一下「置顶」）", file=sys.stderr)
    except Exception as e:
        print(f"  [警告] 发评论失败: {e}", file=sys.stderr)

    # TG 推送到 @yoyoaidaily（与 KOL/Serenity 自动抓取的推送完全独立，同一个 bot）
    try:
        notify_tg.send(v["title"], url, v["intro"][:80])
    except Exception as e:
        print(f"  [警告] TG 推送失败: {e}", file=sys.stderr)

    # X 短视频素材（Hook场景剪辑）——每次上传自动生成，视频+X宣发绑在一起
    clip_path = None
    try:
        clip_path = make_x_clip(key, v)
    except Exception as e:
        print(f"  [警告] X 素材生成失败: {e}", file=sys.stderr)

    # 私聊推送草稿素材（BTC标签bot，不进公开频道）——视频发了就同步给用户审阅
    try:
        notify_tg_private.send_text(f"🎬 <b>{v['title']}</b>\n\n{url}\n\n下面是配套 X 短视频素材：")
        if clip_path:
            notify_tg_private.send_video(str(clip_path), f"{key}·X短视频素材（Hook场景）")
    except Exception as e:
        print(f"  [警告] 私聊推送失败: {e}", file=sys.stderr)

    return url


def main():
    args = [a.lower() for a in sys.argv[1:]]
    if not args:
        print(__doc__)
        sys.exit(0)
    keys = list(VIDEOS.keys()) if "--all" in args else [a for a in args if a in VIDEOS]
    if not keys:
        print(f"[错误] 未知视频 key，可选: {', '.join(VIDEOS)}", file=sys.stderr)
        sys.exit(1)
    service = authenticate()
    results = {}
    for i, k in enumerate(keys):
        results[k] = upload_one(service, k)
        if i < len(keys) - 1:
            time.sleep(5)
    print("\n=== 上传结果 ===")
    for k, u in results.items():
        print(f"{k}: {u}")


if __name__ == "__main__":
    main()

# ChainGraph 路 gmlabs.ai

鍏ㄧ悆 AI 浜т笟閾惧叡寤哄浘璋?+ AI 娣卞害鍒嗘瀽 + KOL 瑙傜偣鑱氬悎骞冲彴銆?

## 褰撳墠鏂囦欢缁撴瀯

```
gmlabs-ai/
鈹溾攢鈹€ index.html          # 钀藉湴椤?SPA锛堥椤?/ 鍥捐氨 / KOL 瑙傜偣 / 鐮旂┒绗旇锛?
鈹溾攢鈹€ graph.html          # 瀹屾暣浜や簰寮?AI 浜т笟閾惧浘璋憋紙11 灞?350+ 鍏徃锛?
鈹溾攢鈹€ i18n.js             # 涓嫳鏂囧弻璇敮鎸?
鈹溾攢鈹€ scores.json         # 鍏淮瀹㈣璇勫垎鏁版嵁锛圙itHub Actions 姣忔棩鍒锋柊锛?
鈹溾攢鈹€ serenity_pool.json  # Serenity 250 鍙叕寮€鎻愬強鏍囩殑 + 鎯呯华鏍囩
鈹溾攢鈹€ kol_cache.json      # KOL 瑙傜偣缂撳瓨锛堟瘡灏忔椂鑷姩鍒锋柊锛?
鈹溾攢鈹€ api/
鈹?  鈹溾攢鈹€ analyze.js      # Vercel Serverless 鈥?Gemini AI 娣卞害鍒嗘瀽
鈹?  鈹斺攢鈹€ kol.js          # Vercel Serverless 鈥?KOL 瑙傜偣 API 浠ｇ悊
鈹溾攢鈹€ scoring/            # 璇勫垎鑴氭湰锛圥ython + GitHub Actions锛?
鈹溾攢鈹€ vercel.json         # Vercel 閮ㄧ讲閰嶇疆 + 瀹夊叏 headers
鈹斺攢鈹€ README.md           # 鏈枃浠?
```

## 鍥涗釜 Tab

| Tab | 鎻忚堪 |
|-----|------|
| 棣栭〉 | 浜у搧浠嬬粛銆丼/A 绾ф爣鐨勫睍绀恒€佸畾浠枫€佹棭楦熼偖绠辨敹闆?|
| 鍥捐氨 | 11 灞?AI 浜т笟閾句氦浜掑紡鍥捐氨锛坕frame 宓屽叆 graph.html锛?|
| **KOL 瑙傜偣** | 钁楀悕 KOL 瀹炴椂瑙傜偣娴?+ Serenity 250 鍙?ticker 鐑姏姒?|
| 鐮旂┒绗旇 | 鏈湴鑷€夌鐞嗐€佸鍏?瀵煎嚭銆佽瘎鍒嗘煡鐪?|

## KOL 瑙傜偣椤?

- **瀹炴椂鏁版嵁**: `/api/kol` serverless proxy 瀹炴椂鑾峰彇锛岄潤鎬佺紦瀛樺厹搴?
- **绛涢€?*: 澶氱┖绔嬪満锛堢湅澶?鐪嬬┖/涓€э級+ 鏃堕棿鑼冨洿锛?4h/7d/30d锛? KOL 浜虹墿閫夋嫨
- **鍥捐氨鑱斿姩**: 鍥捐氨鏀跺綍鐨?ticker 甯?馃搶 鏍囪锛岀偣鍑昏烦杞畾浣?
- **Serenity 鐑姏姒?*: 鍩轰簬 `serenity_pool.json` 鐨?250 鍙巻鍙叉彁鍙婃爣鐨勬帓鍚?
- **Telegram 棰戦亾**: t.me/yoyoaidaily 鍏紑璁㈤槄

## 璇勫垎浣撶郴

鍏淮瀹㈣妯″瀷锛坹finance 鍩烘湰闈㈡暟鎹紝姣忔櫄鍒锋柊锛夛細

| 缁村害 | 婊″垎 | 鍐呭 |
|------|------|------|
| G1 澧為暱鍔ㄨ兘 | 25 | 钀ユ敹/EPS 澧為€?+ 鍔犻€熷害 |
| G2 鐩堝埄璐ㄩ噺 | 25 | 姣涘埄/钀ヤ笟鍒╂鼎鐜?ROE/FCF |
| G3 璐㈠姟鍋ュ悍 | 15 | 璐熷€虹巼/娴佸姩鎬?鍒╂伅淇濋殰 |
| G4 鎶ゅ煄娌?| 20 | 姣涘埄鐜囨寔缁€?甯傚満鍦颁綅/鍐呴儴浜烘寔鑲?|
| G5 鑲′笢鍥炴姤 | 10 | 鍒嗙孩 + 鍥炶喘 鈭?SBC 绋€閲?|
| G6 浼板€煎悎鐞嗘€?| 15 | PEG / P/E / EV-EBITDA / FCF Yield |

**绛夌骇闃堝€硷紙2026-06-11 鍐荤粨锛屼笉鍐嶄负涓偂璋冩暣锛?*锛歋 鈮?82 路 A 鈮?73 路 B 鈮?58 路 C 鈮?43 路 D < 43

琛ュ厖缁村害锛?*AI 鏆撮湶搴?*锛堜汉宸ユ爣娉細楂?鈮?0% / 涓?15-50% / 浣?<15% AI 鐩稿叧钀ユ敹鍗犳瘮锛夛紝涓庡叚缁村垎绂诲睍绀衡€斺€斿悓涓?S 绾э紝AI 绾害涓嶅悓鍚噾閲忓畬鍏ㄤ笉鍚屻€?

## VPS 鍚庣

VPS锛坄37.60.251.23`锛夎繍琛?`twitter_monitor` 鏈嶅姟锛?
- 姣忓皬鏃惰疆璇?KOL 瑙傜偣鏁版嵁
- 鏂拌鐐?鈫?Telegram 鎺ㄩ€侊紙绉佽亰 + 鍏紑棰戦亾 @yoyoaidaily锛?
- supervisor 杩涚▼绠＄悊

## 鏈湴棰勮

```bash
npx serve -s .
```

## 閮ㄧ讲

```bash
cd "C:\Users\86135\Desktop\WorkSpace\gmlabs-ai"
vercel --prod
```

## 鎴愭湰

| 椤?| 璐圭敤 |
|---|---|
| Vercel Hosting | $0 |
| KOL 鏁版嵁 API | $0 |
| Telegram Bot | $0 |
| 鍩熷悕 gmlabs.ai | 宸蹭粯 |
| **褰撳墠鏈堟垚鏈?* | **$0** |


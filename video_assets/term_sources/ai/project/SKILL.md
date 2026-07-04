---
name: yoyo-ai-daily-design
description: Use this skill to generate well-branded videos, covers, and assets for the "YoYo AI 日报" daily AI-industry video channel. Contains brand colors, type, logo assets, motion timing rules, and reusable video scene templates for daily production.
user-invocable: true
---

Read the readme.md file within this skill, and explore the other available files.

Key facts:
- Brand: 「YoYo AI 日报」— daily 60s explainer videos on the AI industry chain.
- Palette: navy #050F1E, blue #1A8FFF, sky #82CFFF, gold #F0B90B (accent only), light canvas #EEF1F7. Light body scenes, navy intro/endcard/covers.
- Fonts: Space Grotesk (display/en), PingFang SC / Microsoft YaHei (cjk), JetBrains Mono (numbers/kickers).
- Logo: assets/yoyo_ai_800.png (corner badge 44–46px; endcard 300px).
- Motion: easeOutCubic 0.55s reveals, easeOutBack 0.5s pops, 0.4s crossfades, 0.06s stagger.
- New videos: clone TermVideoScenes.jsx structure, swap the `data` object only; reuse BrandCorner/BrandEndcard from brand/YoYoBrand.jsx; landscape 1920×1080 + portrait 1080×1920.
- For export + publishing automation, follow design_handoff_publishing/README.md.

If the user invokes this skill without other guidance, ask what today's topic is, then produce the video from the term template.

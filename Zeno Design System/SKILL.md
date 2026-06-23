---
name: zeno-design
description: Use this skill to generate well-branded interfaces and assets for Zeno, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation
- **Brand:** Zeno — "all your subscriptions, one calm view," plus lightweight budgeting. Calm, confident, friendly fintech.
- **Tokens:** link `styles.css` to get every CSS custom property. Signature color is **Zeno Green `#00C26E`** with **dark ink text** (never white-on-green). Warm-white paper `#F8F8F6`, cool ink neutrals, 8-color category palette, full dark theme under `[data-theme="dark"]`.
- **Type:** Space Grotesk (display) · Hanken Grotesk (UI/body) · JetBrains Mono (all money values, tabular). Loaded from Google Fonts CDN via `tokens/fonts.css`.
- **Icons:** Lucide (2px stroke), via CDN `https://unpkg.com/lucide@latest`. No emoji.
- **Components:** `components/core/*.jsx` — Button, IconButton, Card, Badge, CategoryTag, ServiceAvatar, Input, Switch, ProgressBar, ListRow, AmountDisplay, SegmentedControl, Icon. Each has a `.prompt.md` with usage.
- **UI kit:** `ui_kits/app/` — interactive iOS app (onboarding → dashboard → detail → budgets → add). `ui_kits/app/_primitives.jsx` is a standalone copy of the components so a mock can run without the compiled bundle.
- **Slides:** `slides/*.card.html` — 1280×720 templates (title, big number, content, comparison, quote).

## Building a quick mock (HTML artifact)
1. Copy `styles.css`, `tokens/`, and `assets/` you need into your output folder.
2. For components, copy `ui_kits/app/_primitives.jsx` (self-contained) and load React 18 + Babel + Lucide, then `<script type="text/babel" src="_primitives.jsx">`; components attach to `window`.
3. Follow the README's CONTENT FUNDAMENTALS for copy and VISUAL FOUNDATIONS for layout.

## Voice cheat-sheet
Sentence case. Second person ("you"/"your"). Benefit first, never alarmist. Show the dollar figure. One short sentence. No emoji.

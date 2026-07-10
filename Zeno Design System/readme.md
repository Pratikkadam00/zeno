# Zeno Design System

**Zeno** is a mobile-first app that brings every subscription a person pays for into **one calm view**, with lightweight budgeting on top. Netflix, Spotify, iCloud, ChatGPT, the gym — Zeno tracks them all together, warns you before anything renews, and shows what's left to spend this month.

This repository is the design system: brand, foundations (color, type, spacing, motion), reusable React UI primitives, a full iOS app UI kit, and a branded slide template.

> **Sources:** Zeno is a greenfield brand created for this design system — there is no prior codebase, Figma file, or external brand reference. Everything here was designed from the product brief: *"manage your subscriptions from all your apps in one place, plus lightweight budgeting."* If a real Zeno codebase or Figma exists, link it here and reconcile.

---

## Brand in one line
**All your subscriptions, one calm view.** Confident but never anxious. Zeno is the steady hand on your money — modern fintech that feels light, honest, and a little bit relieving.

---

## THE HONEST LEDGER — committed design direction (v2)

**Direction exploration:** three candidates were written — *The Honest Ledger* (app as a typeset financial document), *Subscription Radar* (dark instrument, sweep/blip motion — killed as aestheticized surveillance, wrong for a privacy brand), and *Modern Fintech Mint* (killed: the generic clone; fails the logo-removal test by definition). **Committed: The Honest Ledger** — the brand ethic (honesty, receipts, accountability) IS the aesthetic. Mono-for-money is weaponized app-wide.

**Named signature elements** (each on 3+ screens — see `guidelines/signatures.card.html`):
1. **The Ledger Line** — dotted leader connecting label ↔ tabular-mono amount. (Home, Subs, Detail history, Budget, Paywall pricing, Family, Recap.)
2. **The Zeno Stamp** — inked, rotated, double-ruled stamp; thunks down on verified moments. The app's ONE celebration — no confetti anywhere. (Cancel-verified, recap, Wrapped, paywall success, onboarding beat 3.)
3. **Column Heads** — caps-mono table headers structuring lists (SERVICE … AMOUNT). (Subs, Detail history, scan receipt.)
4. **Print-in** — rows print top-to-bottom (45ms stagger, transform+opacity only); scan results arrive as a tear-edge receipt. (Onboarding, lists, Discover, Wrapped.)

**Motion in one sentence:** *"Everything settles like paper — rows print in, stamps thunk down."* Tokens + keyframes + Reanimated/haptics map live in `tokens/motion.css`. Reduced motion collapses to fades.

**Surfaces:** warm paper `#FAF9F5`, hairline rules (`--rule`) replace card chrome (delete-a-card test applied); ink is navy-cast (`#14161F`, panels `#10131F` from brand `#0A0F2C`); primary buttons are INK — green (`--accent`) is reserved for money-positive/verified moments only. Dark mode is art-directed ("the ledger at 11pm"): navy-black desk, lit-paper cards, luminous green ink.

**Taste risks (defended):** dotted leaders everywhere (the most information-dense honest pattern in typography); ALL-CAPS mono micro-labels as the only section headers (editorial, ownable); a skeuomorphic stamp in a flat era (physical proof-of-work); ink CTAs in a category addicted to green buttons.

**Truthfulness rails (legally reviewed — do not undo):** no "100% on-device"/"we never see your data"/"auto-discovery" claims; required phrasings kept verbatim ("No bank login required"; the Settings privacy pull-quote; coach consent + "General information, not financial advice."). Paywall sells ONLY real Pro gates (unlimited past 10 free, category budgets, envelopes) and lists the free tier first. No dark patterns: equal-weight consent buttons, plain "Not now", one-tap account cancel.

---

## CONTENT FUNDAMENTALS — how Zeno talks

**Voice:** A calm, capable friend who's good with money and never makes you feel bad about it. Plain-spoken, warm, lightly optimistic. Never corporate, never finance-jargon, never alarmist.

- **Person:** Second person — "**you**", "your subscriptions". Zeno refers to itself as "**Zeno**" or "**we**" sparingly. Talk *to* the user, about *their* money.
- **Casing:** Sentence case everywhere — buttons, titles, nav, headings. Never Title Case or ALL CAPS for content. The only uppercase is small overline/eyebrow labels with wide letter-spacing (e.g. `PREFERENCES`, `THE PROBLEM`).
- **Tone:** Friendly and a little smart. Reassurance over instruction. Lead with the benefit to the user, not the system event.
- **Numbers:** Money is concrete and front-and-center. Always show the figure ("$40 under budget", not "within budget"). Tabular mono numerals so columns line up.
- **Emoji:** No. Zeno uses Lucide icons, never emoji, in product or brand.
- **Length:** Short. A reminder is one sentence. A screen title is 1–3 words. Empty states get one friendly line, not a paragraph.

**Examples**

| We say | Not |
|---|---|
| You're $40 under budget this month. | Budgetary surplus detected. |
| 3 renewals coming up. Want a heads-up? | You have 3 pending billing events. |
| Nice — that's one less subscription. | Subscription successfully terminated. |
| All your subscriptions, one calm view. | The complete subscription management platform. |
| Never get surprise-charged. | Avoid unexpected recurring transactions. |

Microcopy patterns: CTAs are verb-first ("Add subscription", "Get started", "Pause subscription"). Reminders frame time helpfully ("renews Jun 28", "2 days ahead"). Budget states are encouraging when healthy, factual when over.

---

## VISUAL FOUNDATIONS

**Overall feel:** Warm-white paper, deep ink type, one confident green. High legibility, generous spacing, hairline structure. Premium-but-friendly — the polish of a fintech app without the cold.

### Color
- **Signature accent — Zeno Green `#00C26E` (`--green-500`).** Used for the primary action, positive/active states, and brand moments. **Always paired with dark ink text, never white-on-green** — that black-on-green pairing *is* the Zeno look. Full 50–900 scale available.
- **Ink neutrals** — a slightly cool near-black scale (`--ink-900` text → `--ink-100/200` borders → `--ink-50` sunken) on a **warm white paper `#F8F8F6`**. Cards are pure white to lift off the paper.
- **Category palette** — 8 stable colors (violet, blue, coral, amber, teal, green, pink, slate) that map to subscription categories and keep tags + charts in sync.
- **Semantic** — success (green), warning (amber), danger (rose `#F43F5E`), info (blue); each has a soft tint for backgrounds.
- **Dark theme** — full token re-mapping under `[data-theme="dark"]` (ink `#0B0D11` bg, brighter green). Toggle by setting `data-theme="dark"` on `<html>`.

### Type
- **Display — Space Grotesk** (600/700): headlines, balances, big moments. Tight tracking (`-0.02 to -0.03em`).
- **UI & Body — Hanken Grotesk** (400–800): everything in-product. Humanist, warm, very legible. Body is 15px.
- **Mono — JetBrains Mono** (tabular): **every money value**, percentages, dates-as-figures, and overline codes. Cents render smaller and lighter so dollars read first.

### Spacing & layout
- **4px base scale** (`--space-1…20`). Mobile gutter 16px. iOS tap targets ≥ 44px.
- Layout is calm and roomy: clear section rhythm, full-width grouped lists, no cramped data tables.

### Shape, elevation, borders
- **Corners:** balanced — cards `16px` (`--radius-lg`), buttons/inputs `12px`, sheets `28px`, chips & toggles fully pill. Nothing sharp, nothing bubbly.
- **Cards:** white surface + **1px hairline border** (`--border-subtle`) + `--shadow-xs`. That hairline-plus-whisper-shadow is the resting state. Interactive cards lift to `--shadow-md` and `translateY(-2px)` on hover.
- **Shadows:** soft, low, cool-tinted (xs → xl). The only "glow" is `--shadow-accent` (green), reserved for the primary CTA / FAB.
- The hero total card and section/quote slides use solid **ink `#12151B`** surfaces for contrast moments.

### Motion
- Quick and settled. `--dur` 220ms, `--ease-out` for most transitions; a gentle **spring** (`--ease-spring`) for toggles and the FAB press. Hover = subtle bg shift / lift; press = scale down ~0.92–0.98. No long, looping, or decorative animation. Respect `prefers-reduced-motion`.

### Imagery & backgrounds
- Mostly **flat color** — paper or ink. No photography in the core UI. Brand moments use a soft, blurred green radial **glow** behind content (low opacity) — used sparingly on the onboarding hero and title slide. No gradients-as-fills, no purple, no texture/noise.
- Subscription brands are represented by **ServiceAvatars**: rounded-square tiles in the real brand color with the service's initial (or its logo image when available).

### Transparency & blur
- Used only for the **tab bar** (translucent surface + `backdrop-filter: blur`) so content scrolls under it. Everything else is opaque.

---

## ICONOGRAPHY

- **Icon set: [Lucide](https://lucide.dev)** — 2px stroke, round caps/joins, 24px grid. This is Zeno's single icon language: clean, friendly, neutral. It pairs naturally with the grotesk type and reads well at small sizes.
- **Delivery:** loaded from CDN (`<script src="https://unpkg.com/lucide@latest"></script>`). The `Icon` component renders any Lucide name; cards and the UI kit call `lucide.createIcons()`. *(Substitution note: Lucide is used as the canonical set; if Zeno ever ships a bespoke icon font, replace the CDN link and the `Icon` component internals.)*
- **Sizing:** 16px in dense rows, 20px inline UI, 23–24px in the tab/nav bar. Color via `currentColor` — tint with text or accent tokens.
- **In settings/detail lists**, icons sit in small colored rounded-square tiles (category color or ink). Inline icons are bare stroke.
- **Emoji:** never. **Unicode glyphs:** only tiny trend arrows (▲▼) inside badges/amounts.
- **Logo:** the Zeno mark is a geometric **Z stroke inside a faint ring** (nods to *zen* + *zero*). Assets in `assets/`: `zeno-mark.svg` (currentColor — set `color`, or `filter:brightness(0) invert(1)` for white on dark), `zeno-wordmark.svg`, `zeno-app-icon.svg` (green tile).

---

## FONTS — substitution flag
All three families load from **Google Fonts CDN** (see `tokens/fonts.css`), not self-hosted binaries. They are the intended typefaces, not stand-ins. To self-host (offline / production), drop woff2 files in `assets/fonts/` and swap the `@import` for `@font-face` rules. **Ask the user if licensed/self-hosted font files should replace the CDN link.**

---

## INDEX / manifest

**Root**
- `styles.css` — global entry point (consumers link this one file). `@import` list only.
- `readme.md` — this file.
- `SKILL.md` — Agent-Skills-compatible wrapper.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadows.css`, `motion.css`, `fonts.css`, `base.css`.
- `assets/` — `zeno-mark.svg`, `zeno-wordmark.svg`, `zeno-app-icon.svg`.

**Components** — `components/core/` (React, `window.ZenoDesignSystem_<id>` namespace once compiled)
- Layout/action: `Button`, `IconButton`, `Card`
- Data/money: `AmountDisplay`, `ListRow`, `ProgressBar`
- Metadata: `Badge`, `CategoryTag`, `ServiceAvatar`
- Forms: `Input`, `Switch`, `SegmentedControl`
- `Icon` (Lucide wrapper)
- Card specimens: `buttons / surfaces / forms / data` `.card.html`

**Foundations** — `guidelines/*.card.html` (Design System tab): brand & neutral & semantic & category colors, display/body/mono type, spacing/radius/elevation, logo, voice.

**UI kit** — `ui_kits/app/` (iOS app, interactive `index.html`)
- Screens: `Onboarding`, `Dashboard`, `SubscriptionDetail`, `Budget`, `Calendar` (upcoming), `Settings`, `AddSubscription`
- `Chrome.jsx` (status bar / tab bar / header), `data.js` (sample data), `_primitives.jsx` (auto-generated self-contained copy of the components so the kit runs standalone).

**Slides** — `slides/*.card.html` (1280×720): `01-title` (dark), `02-bignumber`, `03-content`, `04-comparison`, `05-quote` (green).

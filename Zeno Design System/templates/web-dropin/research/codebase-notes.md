# Zeno website rebuild — codebase notes (verified from zeno/apps/web, July 2026)

SCOPE: apps/web ONLY. Do not touch apps/mobile, apps/api, next.config.ts (CSP/headers/redirects), src/api/*.
OUTPUT MEDIUM: I cannot write into the mounted local folder — rebuilt files are authored in THIS project under `website/apps-web/` mirroring exact repo paths, delivered as a drop-in folder + PORTING.md. Build/test gates run on the user's machine.

## Stack (apps/web/package.json)
- Next 16.2.6 App Router, React 19.2.3, TS. `"type":"module"`.
- Tailwind v4 via @tailwindcss/postcss + tw-animate-css. shadcn-style bits: CVA, clsx, tailwind-merge, @base-ui/react, lucide-react (self-hosted icons ✓ CSP).
- motion ^12 (`motion/react`, `m.` components + MotionProvider — likely LazyMotion; verify before using APIs).
- Workspaces: @zeno/shared, @zeno/service-catalog (`services`, `findServiceBySlug`; real count 509 — ALWAYS `services.length`, never hardcode; brief's "~600" is wrong, code comment confirms 509).
- Scripts: build = workspace builds + next build; test = vitest from repo root (`--root ../..`); typecheck; lint.

## CSP (next.config.ts — DO NOT TOUCH, design within)
default-src 'self'; script-src 'self' 'unsafe-inline' (+eval dev only); style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src none. No nonce/strict-dynamic (deliberate, documented — keeps SSG on 500+ cancel pages). External LINKS are fine; external FETCHES/fonts/images are not.

## Fonts (layout.tsx)
- Currently `next/font/google`: Bricolage_Grotesque(display) / Hanken_Grotesk(body) / JetBrains_Mono — vars --font-display/--font-body/--font-mono, display:swap. next/font SELF-HOSTS at build time → CSP-compliant mechanism; keep it, swap Bricolage_Grotesque → Space_Grotesk (weights 500/600/700) to match DS trio.
- html className=`dark ${vars}` — dark is HARDCODED (dark-first site, no theme toggle). Rebuild: art-direct both; default LIGHT (paper) with `.dark` = "ledger at 11pm"; add a small no-flash inline theme script? CSP allows inline scripts ('unsafe-inline') ✓. Respect prefers-color-scheme + persisted choice (localStorage key: keep simple `zeno-theme`).

## Metadata / SEO (KEEP mechanisms)
- metadataBase https://zeno.app, canonical "/", OG /og.png 1200×630, twitter card. JSON-LD: Organization + WebSite in layout; FAQPage on home (FAQS from faq-data with entity decode); HowTo + BreadcrumbList on each cancel guide. robots.ts + sitemap.ts exist (keep; sitemap covers cancel slugs).
- Copy in metadata uses "subscription radar" — REPLACE with ledger voice, keep title pattern "Zeno — Know what you pay. Cancel before it charges."

## Current homepage (app/page.tsx) — the thing to beat
Structure IS the banned template: ScrollProgress + Nav + Hero → Features(4 rows w/ mock visuals) → HowItWorks(3 steps, dangerouslySetInnerHTML for entities — remove) → Stats band → AnalyticsTeaser (flag-gated: isPublicAnalyticsEnabled from lib/analytics-flag) → Pricing → FAQ → FinalCTA → Footer. home.module.css: mesh gradient blobs, gradText, phone 3D tilt, magnetic buttons, emoji icons (🔒⚠️🔔), CountUp stats. All replaced by concept — keep the flag gate + FAQPage JSON-LD + section ids (#features #how #pricing #faq likely nav anchors — verify Nav).

## Hero contracts worth keeping (reinvent form, keep instincts)
- Interactive cancel-toggle recomputing monthly total (BASE_SPEND 107.46, SUBS Netflix/Adobe/Midjourney/Spotify) — the "feel cancelling" instinct.
- a11y bar: sr-only live region announcing mockup state (polite), mount guards to skip first render; reduced-motion stops auto-cycle; slide dots keyboard accessible. MATCH OR EXCEED.
- Waitlist beats: "SOON — launching on iOS & Android", checks row. NOTE: current "Scanned on-device" copy — align to shipped app framing ("read on this phone", "scans only when you tap scan"); banned: "100% on-device", auto-discovery claims.

## Truthfulness watch-list found in current code
- Stats band `$219 avg wasted / person / year` — unsourced marketing stat → DROP or replace with product-true figures (rails: real numbers only).
- "subscription radar" identity language → ledger voice.
- AnalyticsTeaser fake KPIs ($183k MRR etc) — page + teaser must keep explicit "sample data" labels (analytics page reportedly labels it; teaser copy says "shown here with sample data" ✓ keep that phrase).
- features/open-banking page: keep "Planned · not available today" framing.
- Pricing (from brief, verify against sections.tsx pricing block when restyling): Free (track up to 10) / Pro $3.99/mo or $29.99/yr / Lifetime $79.99 once / Family $6.99/mo; Pro gates ONLY unlimited + category budgets + envelopes.

## Cancel guide template (app/cancel/[slug]/page.tsx) — KEEP ALL MECHANISMS
generateStaticParams over services; generateMetadata (canonical /cancel/[slug], OG article); HowTo JSON-LD from cancellationGuideSteps; BreadcrumbList JSON-LD (Home → Cancellation guides → name); difficulty badge (easy/medium/hard/dark_pattern via content.module.css badge classes); numbered steps <ol>; optional external cancellationUrl anchor (target _blank noopener); related = same raw catalog category, 6 max; back link; wrapped in ContentShell(eyebrow/title/lead). Restyle ContentShell + content.module.css + cancel-hub.module.css only; keep util-page weight light (no heavy motion).
Also: app/cancel/page.tsx + CancelHubBrowser.tsx (client browser/filter over 509 services).

## Waitlist (KEEP contract + tests)
- WaitlistForm: POST /api/waitlist JSON {email}; client regex validation; states idle/loading/done/error; role=alert error w/ aria-describedby; success swap panel. Restyle in ledger language (success = a quiet printed receipt line, NOT a stamp — stamps are earned verified moments only).
- app/api/waitlist/route.ts + route.test.ts (rate-limited; don't break). src/api/backend.ts + test = backend status util (untouched).

## Routes to restyle (all exist)
/, /cancel + /cancel/[slug]×509, /compare/{rocket-money-alternative, ynab-alternative, monarch-alternative, no-bank-login, budget-app-no-bank-sync} (+compare.module.css, ComparisonTable, ComparePageCta — competitor pricing keeps "verified July 2026" footnotes), /features/{family-vault, spend-twin, widgets-watch, business, open-banking}, /developers, /partners, /analytics (Dashboard + charts + analytics-data, SAMPLE DATA label, layout.tsx, module.css), /legal/{privacy, terms, cookies} (+legal layout+module — chrome only, LEGAL COPY UNTOUCHED).
Shared: Nav, Footer, ContentShell, JsonLd (keep), MotionProvider, ScrollProgress (kill or reinvent per concept), primitives (Reveal/CountUp/Magnetic/StaggerGroup — replace with ledger motion set), sections, faq-data (copy source), components/ui/* (button/badge/card/separator/switch — restyle to ledger), lib/utils, lib/analytics-flag (keep).

## DS tokens to wire (from Zeno Design System/, mirrored in repo root too)
paper #FAF9F5 / navy ink #14161F / ink-panel #10131F / rules #E5E3D9 · #C9C7BA / green #00C26E (+dark #1ED47F) / stamp verified #0B8A54, alert #C63B49 / dark bg #0A0C13, card #141721. Signatures: LedgerLine (dotted leader ↔ mono amount), Stamp (earned only), ColumnHeads, print-in. Motion: "everything settles like paper" — zn keyframes in tokens/motion.css; port as web module (globals.css + motion primitives on motion/react). Money ALWAYS JetBrains Mono tabular.

## Build-phase checklist (per page: slop audit 3-liner)
1. globals.css rewrite → DS tokens both themes + Tailwind v4 @theme mapping (keep semantic var names the ui/* components consume: --background/--foreground/--primary/etc → remap to ledger values so shadcn bits restyle for free).
2. layout.tsx: Space Grotesk swap, default light + theme script, metadata copy pass.
3. Shared: Nav, Footer, primitives(ledger motion: PrintIn, TallyNumber web, RuleWipe, StampIn), ui/*.
4. Homepage per committed concept + centerpiece (reduced-motion + no-JS fallback = server-rendered static ledger).
5. ContentShell + content/cancel-hub/compare/legal css → ledger chrome for utility pages (light animation budget).
6. Feature pages ×5, developers, partners, analytics chrome (labels intact), pricing/FAQ/final sections.
7. PORTING.md: file map, npm run build/test expectations, font notes (next/font self-host), CWV/a11y reasoning, "unmistakably Zeno" review.

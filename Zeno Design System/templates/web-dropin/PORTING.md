# Zeno website rebuild — PORTING GUIDE
**Concept: "The Audit."** The site performs an audit of the subscription industry in front of the visitor — every number computed from the real catalog or typed by the visitor — then offers them the auditor. Full rationale: `research/blueprint.md` (next to this file).

## 1 · Install
Copy everything under `apps-web/` (next to this file) over `zeno/apps/web/` (paths mirror exactly). **18 files — 14 rewritten, 4 new:**

```
app/globals.css                      REWRITTEN  ledger tokens (+ --desk/--baseline), both themes, --z-* aliases, zn keyframes
app/layout.tsx                       REWRITTEN  Space Grotesk swap, light default + theme script (now also arms html.js), metadata copy
app/page.tsx                         REWRITTEN  Audit section order; exhibits computed server-side; mounts the pen chrome
app/home.module.css                  REWRITTEN  full ledger stylesheet — "The Pen Pass": ruled paper/desk bands, hero CSS entrance, cancel-flow log, tally chip, torn footer
app/cancel/cancel-hub.module.css     REWRITTEN  evidence-library styling + one load-settle (class names preserved)
app/compare/compare.module.css       REWRITTEN  side-by-side audit table + one load-settle (class names preserved)
app/legal/legal.module.css           REWRITTEN  document chrome + header load-settle — LEGAL COPY UNTOUCHED
components/site/content.module.css   REWRITTEN  utility-page chrome + header load-settle for 509 guides + features (names preserved)
components/site/Nav.tsx              REWRITTEN  + theme toggle, seal wordmark, Cancel-guides link
components/site/Footer.tsx           REWRITTEN  torn page edge + document index (all routes), honest blurb
components/site/Hero.tsx             REWRITTEN  "Run your own audit" + INLINE CANCEL FLOW (traps declined, verify beat) under the rows
components/site/sections.tsx         REWRITTEN  TheCase/Method/Refusal/Pricing/FAQ/FinalCTA/AnalyticsTeaser — pen-pass motion; pricing is a printed bill (no toggle)
components/site/WaitlistForm.tsx     REWRITTEN  same API/route contract; receipt-line success
components/site/faq-data.ts          REWRITTEN  truth-checked copy (see §4)
components/site/ledger.tsx           NEW        server-safe signature marks (LedgerLine, Stamp, TickTag…)
components/site/primitives.tsx       REWRITTEN  pen-pass motion kit (PrintIn/PenHead/WordsIn/MaskLines/Odometer/DrawBar/PenLedgerLine/Tally) + back-compat exports
components/site/pen.tsx              NEW        the pen chrome: PenRule (progress), MarginIndex (≥1360 scroll-spy), RunningTally (the chip — see §6)
components/site/sample-ledger.ts     NEW        hero sample rows + inline cancel-flow scripts + LEDGER_EVENT (shared by Hero ↔ chip)
```

**Deliberately untouched:** `next.config.ts` (CSP/headers/redirects), `app/api/waitlist/*` (+ tests), `src/api/*` (+ tests), `robots.ts`, `sitemap.ts`, `JsonLd.tsx`, `MotionProvider.tsx`, `ContentShell.tsx`, `CancelHubBrowser.tsx`, `ComparisonTable.tsx`, `ComparePageCta.tsx`, all `app/cancel|compare|features|legal|developers|partners|analytics` page.tsx files, `components/ui/*`, `lib/*`. They restyle through three mechanisms: (a) preserved class names in the rewritten module css, (b) semantic vars (`--background`, `--primary`…) remapped to ledger values for `components/ui/*`, (c) `--z-*` aliases in globals.css for anything else (analytics module included). `ScrollProgress.tsx` is now unimported — delete or leave, either is safe.

## 2 · Gates
```bash
npm run build --workspace @zeno/web    # SSG incl. 509 cancel guides — the gate
npm run test  --workspace @zeno/web    # waitlist route + backend + utils tests (untouched)
npm run typecheck --workspace @zeno/web
```
Notes: `Space_Grotesk` downloads at build time via next/font exactly as Bricolage did (self-hosted output → `font-src 'self'` holds). No new deps, no config changes, no `next/image` usage added. The inline theme script relies on `script-src 'unsafe-inline'`, which the CSP already grants for Next's own hydration inlines.

## 3 · Core Web Vitals reasoning (homepage budget: LCP <2.5s · CLS <0.1 · INP <200ms)
- **LCP** — the hero is server-rendered text + a static ledger document; no hero image. The audit's totals render their REAL values in the HTML (tweens start *from* the server value — no $0 flash, no hydration swap). Hero entrance choreography is **CSS-only, gated on `html.js`** (armed by the layout inline script before paint): no-JS and crawlers get the finished page, hydration is not on the critical path, and the headline is fully painted by ~0.9s. Fonts: next/font preload + `display: swap`.
- **CLS** — nothing repositions on hydration: sticky (in-flow) nav, fixed-height switches, `both`-filled transform/opacity keyframes, fixed-position pen chrome (rule/chip/margin index) that never enters flow; the inline flow log and accordion are the only height animations (both user-initiated).
- **INP / JS weight** — the service catalog (509 entries) never ships to the client: exhibits and FAQ copy are computed in Server Components and passed as props. Scroll listeners (pen rule, chip) are passive + rAF-throttled and write via refs (no React re-render per frame); in-view triggers fire once. The chip's cross-component link to the hero is one CustomEvent — no store, no context re-renders.
- **Utility pages** — one CSS-only load-settle of the header chrome (no listeners, no IO, `html.js`-gated); guides remain pure SSG with unchanged metadata, HowTo + BreadcrumbList JSON-LD, canonicals and sitemap.

## 4 · Truthfulness diff (rails enforced)
- **Removed:** the unsourced "$219 wasted/year" stat (Stats band + pricing lead + FAQ); "subscription radar" identity language; "Most popular" pricing badge (pre-launch popularity = invented); Pro FAQ claim that gated "full discovery and analytics".
- **Corrected:** Pro's gates are exactly unlimited subscriptions + category budgets + envelope budgeting — everything else stated free; discovery framed as "scans run when you tap scan" (no background/auto-discovery implication); "Scanned on-device" check replaced with "Discovery you control".
- **Kept verbatim/mechanism:** open-banking "Planned · not available today"; analytics "sample data" labels (+ hollow SAMPLE DATA tick in the teaser); compare pages' "verified July 2026" pricing footnotes; waitlist truth ("Launching on iOS & Android"); SERVICE_COUNT always computed (`services.length`).
- **Added honesty:** hero centerpiece footnote — "SAMPLE LEDGER … IN THE APP, A CANCELLATION IS ONLY MARKED VERIFIED AFTER YOUR NEXT RECEIPT OR STATEMENT SHOWS NO CHARGE."; exhibits cite their source (the catalog) inline; the inline cancel-flow scripts are sample walkthroughs (marked in `sample-ledger.ts`) — shapes mirror documented guides, figures are the sample rows'.
- **Pricing presentation:** the billing toggle (and its computed "−37%" chip) is gone — a bill doesn't have modes. Both figures print plainly: "BILLED $29.99/YR · OR $3.99 MONTHLY".

## 5 · Accessibility
Focus-visible ring (green, 2px, offset) global; skip link kept; hero switches are `role="switch"` with amount-bearing labels, disabled only while their own flow plays, and a polite live region narrates the whole sequence (cancelling → cancelled + totals → verified) with a mount guard; FAQ accordion keeps aria-expanded/controls + region labels; mobile menu keeps Escape-close + scroll lock + aria-expanded; theme toggle is a labeled button; the margin index is duplicate nav — aria-hidden with links removed from tab order; the running-tally chip is a labeled link back to the ledger, hidden without JS and absent entirely under reduced motion; WCAG AA contrast — ink #14161F on paper #FAF9F5 ≈ 15:1, ink-2 ≈ 6.4:1, green-text #057A46 on paper ≈ 5.6:1 (dark theme equivalents chosen to the same bar); reduced motion: every primitive collapses to opacity or none, tweens jump to final values, cancel flows skip straight to their result.

## 6 · "Unmistakably Zeno" review — where each signature lives
- **Ledger Line** (dotted leader ↔ mono value): hero totals · Refusal privacy lines (drawn in: dots rule, verdict prints) · analytics teaser KPIs · waitlist success receipt · (available to every utility page via `ledger.tsx`).
- **The verified moment:** EARNED, inside the hero ledger — flip a switch and the cancel flow performs under the row (fee check, retention traps struck through and DECLINED), the row reads CANCELLED — VERIFYING, and only after a beat does VERIFIED CANCELLED print with a green wash. No standalone stamp on the homepage: a stamp for scrolling would cheapen the one you work for. (`Stamp` in `ledger.tsx` stays for utility pages.)
- **The Pen Pass (motion identity):** the pen rule tracks scroll; section heads rule themselves in; headlines print word by word; exhibit digits roll like counter wheels; vertical bars draw top-down; the page ends torn, with the footer on the sheet beneath.
- **The Running Tally (signature moment):** a chip rides the pen tip and adds the sample bill up as each section passes (+ $15.99 …), carrying the visitor's OWN hero edits — cancel Adobe up top and the chip logs "CANCELLED · $0.00" in verified green when its section passes. By pricing it reads the full committed monthly next to Zeno's $2.50. Click returns to the ledger.
- **Column Heads:** hero ledger ("SERVICE … MONTHLY / KEEP") · pricing bill ("PLAN … PRICE") · compare tables · cancel-hub category heads.
- **Print-in:** exhibits, method steps, pricing rows (45ms family stagger); utility-page headers settle once on load; the tween/tally on all money.
- **Mono-for-money:** every figure on the site (`.money`, tabular numerals) — prices, totals, exhibit values, the chip.
- **Ink CTAs, green = money-only:** all buttons ink/paper; green appears only on verified/savings values, the kicker tick, and focus rings.
- Logo-removal test: cover the wordmark — dotted leaders + the inline verify beat + caps-mono column heads + ruled paper/desk bands + the tally chip still say Zeno. Same-app test: it is visibly the app's sibling (same tokens, same signatures, same voice).

## 7 · Per-page slop audits (3-liners)
- **Home** — Zeno: a ledger you operate as the hero; exhibits with citations; the honest bill. Tempted by: keeping the tilt-phone + stats band. Lazy version: hero/3-cards/logo-wall/pricing-table template (what it replaced).
- **Cancel guides** — Zeno: difficulty as tick-tags, steps as ruled rows with leading-zero numerals, zero animation. Tempted by: card-ifying 509 pages. Lazy: leaving blue-gradient chips on paper.
- **Compare** — Zeno: audit-table with mono column heads, horizontal rules only, footnotes kept. Tempted by: ✓/✗ emoji grid. Lazy: bootstrap-style striped table.
- **Legal** — Zeno: document chrome, green-ruled note blocks, copy untouched. Tempted by: "friendlifying" reviewed legal text. Lazy: default prose on white.
- **Features/developers/partners** — Zeno: exhibit chrome via ContentShell restyle, honest status tags intact. Tempted by: bespoke heroes per page. Lazy: leaving them dark-blue while the rest went paper.

## 8 · Known follow-ups (optional)
1. `app/analytics/analytics.module.css` inherits via --z-* aliases — a dedicated ledger pass on the dashboard would tighten it further.
2. `components/site/ContentShell.tsx` has a stale "dark-brand" comment (behavior fine).
3. `ScrollProgress.tsx` unused — superseded by `pen.tsx`'s PenRule; delete when convenient.
4. `public/og.png` — regenerated (seal + wordmark on ruled paper); ships in `apps-web/public/`. Source: `research/og-source.html`.

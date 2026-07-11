# Zeno website — blueprint (deliverables 1–3)

## 1 · Reference analysis
*Method note: Anthropic Glasswing + OpenAI GPT-5.6 analyzed from fetched page content (text/structure — layout inferred); Apple + Resend from design knowledge, not fetched. Limitation acknowledged: composition observations are directional, not pixel-verified.*

**Anthropic — Project Glasswing** (fetched)
Take: ① One idea held for an entire page — it reads as a dated ANNOUNCEMENT (chaptered H2s, an appendix, footnotes), not a funnel; the document format itself signals seriousness. ② Evidence over adjectives — three concrete vulnerability stories (27-year OpenBSD bug, 16-year FFmpeg line, kernel chain) do the persuading; numbers carry the argument. ③ Restraint in chrome — logos and quotes presented plainly; authority comes from density and disclosure (they even footnote the project's name).
Zeno differently: Glasswing is institutional navy-black with partner logo walls and executive quotes — Zeno is pre-launch consumer warmth on paper, and our honesty rails BAN borrowed authority. Our "evidence" must be computed from our own catalog or typed by the visitor.

**OpenAI — GPT-5.6** (fetched)
Take: ① Chaptered pacing with a TOC — each section is one claim backed by one chart cluster; nothing floats unanchored. ② Disclosure as style — giant eval tables that include rows where competitors WIN, plus 8 footnotes; credibility through printing the unflattering number. ③ Every quote carries a metric — specificity is the voice.
Zeno differently: it's a reference manual at corporate scale with quote carousels; Zeno needs ONE narrative scroll, no third-party quotes (none exist), and our only table that matters is the visitor's own money.

**Apple product pages** (design knowledge)
Take: ① One idea per viewport — scroll is chapters, type is enormous, sections breathe. ② Motion advances comprehension (the thing assembles as the copy explains it), never decorates. ③ Whitespace is the structure — almost no boxes, no cards.
Zeno differently: Apple's beauty shot is hardware glamour; Zeno's is a DOCUMENT (the ledger itself). And Apple tolerates scroll-jacking; our CWV budget and honesty-about-motion do not.

**Resend** (design knowledge)
Take: ① One ownable centerpiece interaction, then a calm page around it — the hero does the brand's whole job. ② Developer-grade terseness — mono details, short sections, zero fluff. ③ Polish lives in micro-interactions, not section count.
Zeno differently: Resend is dark-first for developers; Zeno is paper-first for people who feel ripped off — the centerpiece must make a visitor FEEL money coming back, not admire an animation.

## 2 · Concept exploration — three, kill one, commit

**A. "The Receipt"** — the homepage is one continuous receipt that prints as you scroll; hero = your month printing; footer = the total. Motion: scroll-scrubbed print-in.
→ **KILLED.** It's the brief's own first seed and the app's metaphor replayed 1:1 — the default instinct. It also makes the site a skin, not a story: a receipt has no argument, no villain, no reason to exist as a MARKETING site.

**B. "The Audit"** — the site performs an audit of the subscription industry in front of you, then offers you the auditor. Every number is either computed from the real 509-service catalog or typed/toggled by the visitor. The industry's dark patterns are the antagonist; Zeno's refusal of them is the protagonist. Thread line: **"The subscription industry counts on you not counting."**
→ **COMMITTED.** Rationale: (1) it's a story only Zeno can tell — our catalog literally rates cancellation difficulty and documents dark-pattern steps, so the indictment is sourced from our own shipped data, not invented stats; (2) it gives every page class a role in one narrative — compare pages are side-by-side audits, the 509 cancel guides are the evidence library, features are exhibits, pricing is the honest bill; (3) honesty stops being a disclaimer and becomes the aesthetic — exhibits, footnotes, verified dates; (4) tone rail: the audit indicts SERVICES, never the visitor — calm, not guilt.

**C. "The Ledger Opens"** — the site as a physical ledger book: index-tab nav, pages that turn as you scroll.
→ Not killed for taste but for mechanics: page-turn pagination fights natural scroll, threatens CLS/INP, and 509 utility pages don't belong in a "book." Its best part — index-tab nav language — is absorbed into B's chrome.

**Motion metaphor (extends "everything settles like paper"):** *exhibits are laid on the desk* — sections settle in like documents placed in front of you; rules wipe in like a pen ruling a line; money tallies; ONE stamp on the whole homepage (the verify beat). Nothing floats, bounces, or scroll-jacks. All entrance motion = transform+opacity, ≤400ms, whileInView once, disabled under prefers-reduced-motion.

## 3 · Narrative map — homepage storyboard (one idea per viewport)

**Nav** — paper bar, hairline rule, wordmark; index-tab links (Features · Compare · Cancel guides · Pricing · FAQ) with the app's overline-tick active state; ink "Join waitlist" button. No blur, no glass.

**Beat 1 · THE OPENING STATEMENT + CENTERPIECE.** H1 "Know what you pay. Cancel before it charges." Sub: "The honest way to take back your subscriptions — no bank login required." Waitlist form + "LAUNCHING ON IOS & ANDROID" tick row. Centerpiece beside/below: **"Run your own audit"** — an interactive ledger DOCUMENT (not a phone): five sample subscriptions as LedgerLines with cancel switches; the monthly total (giant mono) tallies down live; a "back in your pocket /yr" line accumulates; a cancelled row gets a drawn strike-through, then a small VERIFIED tick lands a beat later (the app's promise, felt). SSR fallback = static ledger with base total (works no-JS); reduced motion = values jump, no tally. Motion: total tallies on load (with the settle-failsafe pattern from the app), rows print in 45ms stagger.
*Slop audit: distinctly Zeno — the hero is a document you operate, money in tabular mono, strike-and-verify. Tempted by — keeping the 3D-tilt phone. Lazy version — gradient headline + app screenshot + two CTAs.*

**Beat 2 · THE CASE (exhibits).** "The industry counts on you not counting." Three exhibits as printed ledger entries, ALL computed at build from the catalog: EXHIBIT A — "509 services indexed" (services.length); EXHIBIT B — "N of them rate cancellation hard — or use documented dark patterns" (count of difficulty ∈ {hard, dark_pattern}); EXHIBIT C — one verbatim dark-pattern step quoted from a real guide (e.g. Adobe retention flow), cited "Zeno cancellation catalog, July 2026". No invented $-wasted stats (the old $219 band is dropped).

**Beat 3 · THE METHOD.** How the audit works, as three ruled sections: 01 Discover — "email receipts you scan, statements you import — Zeno scans only when you tap scan"; 02 Warn — 7-day / 3-day / day-of, quiet hours; 03 Cancel & verify — guided steps, then the charge is checked before anything is called cancelled. The homepage's ONE stamp lands here (VERIFIED CANCELLED specimen).

**Beat 4 · THE REFUSAL (privacy).** "Built for people who refuse to hand a bank login to an app." Ledger lines: Bank login ……… NEVER / Your credentials ……… NOT ASKED FOR / Discovery ……… ON YOUR COMMAND. Link → /compare/no-bank-login.

**Beat 5 · THE HONEST BILL (pricing).** A plain price ledger: "Free forever" items printed FIRST (track 10, alerts, guides+verification, insights & coach), then Pro $3.99/mo · $29.99/yr (unlimited, category budgets, envelopes — the only gates), Lifetime $79.99 ONCE ("pay once. we're not ironic about it."), Family $6.99/mo. Dotted leaders, no "most popular" badge, no urgency.

**Beat 6 · FAQ + CLOSE.** FAQ as ruled Q&A (FAQPage JSON-LD kept). Close: "The audit is free. The waitlist is open." + form. Footer = full document index (all routes, the 509-guide hub, legal), no social links pretending traction we don't claim.

## Page-class treatments
- **ContentShell** (cancel/legal wrapper): document chrome — caps-mono breadcrumb kicker, display title, rule, ledger prose. Cancel guides: difficulty as tick-tag, steps as numbered ruled rows, external cancel-page link as ink button, related guides as ledger list. Animation budget ≈ zero (509 SSG pages stay fast).
- **Compare ×5**: "the audit, side by side" — ComparisonTable with column heads + tick marks; competitor pricing keeps "verified July 2026" footnotes verbatim.
- **Features ×5**: one exhibit each (kicker "EXHIBIT — FAMILY VAULT" etc.); open-banking keeps "Planned · not available today" as a hollow tick-tag up top.
- **Analytics**: dashboard restyled in ledger chrome; "SAMPLE DATA" tick-tag banner stays pinned.
- **Developers / Partners**: quiet single-column documents.
- **Legal**: chrome only; copy untouched.

## Build order
globals.css tokens (both themes art-directed) → layout.tsx (Space Grotesk swap via next/font, light default + theme script) → ledger primitives (PrintIn, Tally, LedgerLine, SectionHead, TickTag, Stamp, RuleWipe) → ui/* restyle → Nav/Footer → homepage (Hero+Audit centerpiece, sections) → ContentShell + content/cancel css → compare css/table → features/developers/partners/analytics chrome → PORTING.md + reviews.

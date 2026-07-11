# Zeno web — motion & atmosphere plan: "THE PEN PASS"

One sentence: **a pen works through the page as you scroll — ruling lines, printing rows, tallying totals, and stamping the one thing that's proven.** Extends the app's "everything settles like paper"; nothing floats, bounces, pins, or hijacks scroll.

## Rails (non-negotiable)
- transform + opacity only; 200–450ms; settle ease `cubic-bezier(.22,.8,.26,1)`; thunk `(.34,1.3,.5,1)` reserved for the stamp.
- IntersectionObserver, fire ONCE, disconnect. No scroll-scrubbing, no parallax, no pinned sections.
- `prefers-reduced-motion` → fully static page. No-JS → fully rendered page (animations only ever start FROM rendered state or hide via JS itself).
- CLS 0 (entrances never change layout; FAQ animates inside its own box). LCP untouched (hero text paints immediately; its entrance is ≤300ms transform/opacity).
- Every number that animates gets the tally **failsafe** (timeout forces final value — same pattern as the app).

## Atmosphere — the "no background" fix (still no gradients, no noise)
- **A1 Ruled paper**: faint horizontal baseline rules (1px, ~4% ink, 44px rhythm) behind the hero and the Refusal section — the page IS ledger paper. CSS repeating-linear-gradient, zero assets.
- **A2 Margin index**: at ≥1200px, section numbers (01 THE CASE … 05 QUESTIONS) printed in the left margin in caps-mono — document chrome, not decoration.
- **A3 Desk alternation**: alternate sections sit on the sunken paper tone (light #F3F3F1 / dark #10121B) split by hairlines — depth without a single gradient.
- **A4 Grain**: deliberately skipped. Texture comes from rules + mono, not noise.

## Beats (top → bottom)
1. **Nav ruling line** — a 2px ink rule draws across the top edge as you read the page (the pen ruling the sheet). Replaces the generic scroll-progress bar; green only in dark mode.
2. **Hero** — H1 lines rise in 2 staggered steps; ledger rows print in (45ms stagger); the monthly total tallies up once with failsafe. Switch strike-then-verify beat stays.
3. **Section heads** — the hairline rule wipes out from the label (scaleX, 300ms); label fades in first.
4. **Exhibits** — A tallies 0→509, B tallies to its computed count; C's indictment quote gets a pen-underline draw and its red margin rule draws top→down.
5. **Method** — three columns print in staggered; **the stamp thunks onto column 03** at 50% visibility (✅ shipped in this fix).
6. **Refusal ledger** — per line: leader dots draw left→right (scaleX), then the verdict (NEVER / NOT ASKED FOR…) prints; 5 lines, 60ms stagger.
7. **Pricing** — plan rows print in; the Pro row's green edge rules in top→bottom.
8. **FAQ** — answers unfold 220ms (grid-template-rows trick, no jank).
9. **Final CTA** — kicker tick draws, form settles up 8px. Footer: nothing — the document just ends.

## Slop audit (plan level)
① Distinctly Zeno: pen/print/tally/stamp — the app's exact motion vocabulary on the web. ② Tempted by: mesh-gradient glow, parallax phone, pinned scroll-jacked chapters, particles. ③ Lazy version: AOS fade-up on every section + a gradient hero.

## Porting map (preview → Next.js drop-in)
Preview implements with IO + CSS classes (no deps). Drop-in maps 1:1: beats 2/5/6/7 → `PrintIn`/`StaggerGroup`, tallies → `TallyNumber` (failsafe included), rule wipes → `RuleWipe`, stamp → `StampIn` (motion/react `whileInView`, `viewport:{once:true}`), nav rule → scroll-linked scaleX on a single element (Motion `useScroll`), atmosphere A1–A3 → globals.css only. Files touched: primitives.tsx, sections.tsx, Hero.tsx, Nav.tsx, globals.css — CSP-safe, no new packages.

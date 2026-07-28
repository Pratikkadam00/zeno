# Zeno Delivery Plan — web first, then mobile (2026-07-11)

Replaces `LAUNCH_READINESS_PLAN.md` (deleted this commit; full history in git). That plan's
P0–P4 are **done** (data integrity, correctness, legal/claims, security hardening,
performance/architecture — commits `833983c`…`c88e8d0`). Everything still open is carried
into this plan. `docs/ENGINEERING_STANDARDS.md` remains binding for every change.

## Inputs (source of truth — all versioned)
- `Zeno Design System/` — The Honest Ledger v2: tokens, motion system, signatures,
  23 app screen mockups (complete set), `Ledger.jsx` kit.
- `Zeno Design System/templates/web-dropin/` — production drop-in for `apps/web`
  (concept **"The Audit"**), with `PORTING.md` (install map, gates, CWV reasoning,
  truthfulness diff, a11y) and `research/` (blueprint, codebase notes, motion plan).
- `Zeno Design System/Website Preview v3 (Ledger Book).html` + `website-v3-book.js` —
  the committed LATEST website presentation: the Audit content wrapped in a
  feature-detected leafable-book engine; degrades to the v2 "Pen Pass" document when
  JS/WAAPI/motion aren't available. Build order therefore: drop-in first (baseline),
  book layer second (progressive enhancement).
- `Zeno Design System/Splash Animations.html` — mobile splash spec.
- Fact corrections adopted from the design research: service catalog count is **509**
  (`services.length`, computed — never hardcoded).

## Standing quality gates — the "0 bugs, 0 security issues" policy
Every phase ends with ALL of the following green before its commit; a phase with a known
open defect does not close (it gets fixed or a dated deferral note here):
1. `npm run typecheck && npm run lint && npx vitest run` across the repo; web phases add
   `npm run build --workspace @zeno/web` (509 SSG guides are the gate).
2. **Behavioral verification** — web: drive the site in the browser pane (console/network
   clean, both themes, reduced-motion, no-JS degradation, waitlist flow); mobile: drive
   the flow on the emulator (local `expo run:android`; NO EAS cloud build without owner
   confirmation of quota).
3. **Adversarial review** — after each major phase, a multi-agent review (correctness/
   regression, truthfulness-rails, a11y+performance) with findings fixed before close
   (this caught a real consent leak in P2 — it stays mandatory).
4. **Truthfulness sweep** — grep the diff for banned claims (no "100% on-device", "we
   never see your data", auto/background discovery, "no Plaid ever", E2E-sync claims,
   invented stats/user counts; the unsourced "$219/yr" stat stays dead). Required
   phrasings and "sample data" / "verified July 2026" / "Planned" labels preserved.
5. **Security check** — no CSP/header changes on web (design within `next.config.ts` as
   is), no new external requests, no secrets in code/logs, `npm audit` reviewed;
   `/security-review` on the diff at the end of each track.
6. Per-phase commit; push when the phase is green.

---

## Track W — Website (FIRST)

### W0 — Handoff intake ✅ (done 2026-07-11)
Handoff bundle synced into the tracked design system and committed; v2/v3 relationship
verified (drop-in = Audit baseline; v3 book = enhancement layer with built-in fallback).

### W1 — Install the drop-in (the Audit baseline)
- Pre-port drift audit: diff each of the 18 drop-in files against current `apps/web`
  (the design was researched against July-2026 main, but Hero/sections/faq-data carry
  P2 legal edits — confirm every rail survives via PORTING §4's diff, item by item).
- Copy the 18 files exactly per `PORTING.md` §1 (14 rewritten, 4 new: `ledger.tsx`,
  `pen.tsx`, `sample-ledger.ts`, new `og.png`). Deliberately untouched files stay
  untouched (`next.config.ts`, waitlist API + tests, robots/sitemap, JsonLd, all
  page.tsx files, `components/ui/*`, `lib/*`).
- Follow-ups from §8 while in there: delete unused `ScrollProgress.tsx`; fix the stale
  ContentShell comment. Font swap Bricolage_Grotesque → Space_Grotesk stays inside
  next/font (self-hosted at build → `font-src 'self'` holds).
- Gates (§2): web build (509 guides), tests, typecheck, lint.

### W2 — Behavioral verification of the baseline
- Browser-pane pass: homepage (hero inline cancel flow + verify beat, pen rule, running
  tally chip, odometer exhibits), nav/theme toggle (light default + dark "ledger at
  11pm"), footer torn edge; spot-check each page class — cancel hub + one guide, one
  compare page (footnotes intact), legal (copy untouched), features ("Planned" tag
  intact), developers, analytics (SAMPLE DATA labels), waitlist success receipt.
- Reduced-motion pass (everything collapses to opacity/none; tally chip absent) and
  no-JS pass (`html.js` gating: finished page, no entrance choreography).
- A11y verification of PORTING §5 claims: switch roles + live region narration, FAQ
  aria, skip link, focus rings, menu escape/scroll-lock, AA contrast both themes.
- CWV sanity per §3 reasoning: no hero image, server-rendered real values (no $0
  flash), catalog never ships to client, passive rAF-throttled listeners; verify no
  hydration mismatch warnings and no layout shift on load.

### W3 — The v3 "Ledger Book" layer (the committed latest)
- Port the book engine (`Website Preview v3 (Ledger Book).html` + `website-v3-book.js`)
  into the homepage as a **progressive enhancement**: `html.book` set only when
  `prefers-reduced-motion` is off AND WAAPI + IntersectionObserver exist; sheet
  fold-over on scroll/swipe/keys/pager; transform+opacity only.
- Fallback IS the W1 baseline (v2 Pen Pass document) — no-JS, reduced-motion, and
  crawler experiences unchanged; SSG/SEO unaffected (book is presentation-only).
- Utility pages stay normal documents (blueprint's own ruling — 509 guides don't
  belong in a book).
- Re-run all W2 verification in book mode + fallback mode; CLS/INP re-check (page-turn
  must not scroll-jack: in-page scrolling wins, per the v3 prototype's rails).

### W4 — Review, security, close
- Adversarial review workflow (regression vs old site routes/SEO, truthfulness rails,
  a11y+CWV) — fix all findings.
- §8.1 follow-up: dedicated ledger pass on `analytics.module.css` (currently inherits
  via `--z-*` aliases).
- Security close: CSP/headers untouched, no external requests added, `/security-review`
  of the whole web diff, `npm audit` review. Push.
- OWNER: deploy is blocked on A1 (domain) and Render/Vercel choice for the site —
  code will be deploy-ready.

---

## Track M — Mobile (AFTER web)

### M0 — P5 Testing & CI depth (carried over; runs before the port as its safety net)
- **P5.1** RN component-test infra — `@testing-library/react-native` under vitest if it
  works cleanly, else an isolated jest project (DECISION as before). Infra + 1 smoke
  test now; screen tests land per port phase (never written against the old UI).
- **P5.2** Store tests: add/update/delete persistence, renewal roll-forward, cap
  enforcement, settings + `coachAiConsent` hydration.
- **P5.3** api/client tests: the `ApiResult` taxonomy — offline / 401 / 500 / malformed
  envelope (family + coach paths).
- **P5.4** Notification-plan gap-fill: quiet-hours boundaries, keyless pre-upgrade
  migration in the diff reconcile.
- **P5.5** Coverage floor at current level; ratchet as port phases land.

**M0 status — landed 2026-07-11 (P5.2/P5.3/P5.4 done; P5.1 sequenced into M2):**
- **P5.3 — DONE.** New `apps/mobile/src/api/client.test.ts` (30 tests) covers the full
  `ApiResult` taxonomy on the coach + family paths: network-throw→`offline`,
  401→`auth`, 404→`not_found`, 5xx→`server`, and a 200 with a malformed/empty
  envelope→`server` (never a false success). Also pins the two truthfulness-critical
  behaviours: `getHousehold`'s "200 but no household" → `not_found` (a disbanded
  household, distinct from a server error), and `deleteAccountOnServer` returning
  `false` on any non-2xx / offline (failure must NOT be swallowed into a success, or
  the app would tell the user their account is gone while server data survives). Auth
  header attaches only when signed in; `recordFunnelEvent` stays anonymous (no auth
  header even when signed in) and never throws. Plaid paths intentionally excluded
  (kept as code only while Plaid is in dev). `client.ts` coverage 0 → 76% (the
  uncovered lines are exactly the Plaid + open-banking helpers).
- **P5.4 — DONE.** Quiet-hours boundaries were already covered thoroughly; added the one
  missing branch — the keyless pre-upgrade migration in `rescheduleAllNotifications`
  (pre-key pending reminders are all cancelled and re-created WITH keys, a one-time
  migration that then settles to zero writes). `notificationService.test.ts` 18 → 19.
- **P5.2 — DONE.** add/update/delete (`subscription-mutations.test.ts`), renewal
  roll-forward (`subscription-ui.test.ts`), and free-cap enforcement (`applyFreeCap` in
  `discovery-helpers.test.ts`) were already thoroughly covered. The remaining piece —
  `coachAiConsent`/settings **hydration** — was inline in `subscription-store.tsx`'s
  effect (untestable without SQLite/React); extracted it to a pure module
  `subscription-hydration.ts` (behavior-preserving; the store now calls the helpers) and
  covered it in `subscription-hydration.test.ts` (18 tests). This locks the DATA-layer
  contract, which is **stable across the M3 UI rewrite**, so it was worth doing now
  rather than deferring: corrupt/legacy/missing rows never crash boot, `homeCurrency` is
  enum-validated, notification settings backfill so no sub reads `undefined`, price
  history seeds a baseline — and, privacy-critically, a corrupt/legacy consent value is
  **never** read as `granted` (stays `unset`, so the coach re-prompts instead of
  silently transmitting). Full mobile suite 24 files / 279 tests green (refactor
  behavior-preserving).
- **P5.1 — DECIDED: defer the component-test infra to M2 (isolated jest project).**
  Evidence, not a guess: `react-native` does not parse under the current node-env Vitest
  (every existing mobile test mocks it to a stub), so `@testing-library/react-native`
  cannot render under Vitest without a full RN-preset transform overhaul. A throwaway
  smoke test against the *old* kit under a fragile config de-risks nothing (the hard
  parts — Reanimated 4, gorhom bottom-sheet, SVG — arrive with the ported components).
  So the infra is stood up in **M2** as an isolated jest project with the RN preset,
  validated against the FIRST real Honest Ledger component we're keeping.
- **P5.5 — baseline established; hard CI ratchet deferred to M7 (as the plan states).**
  Mobile suite: 23 files / 261 tests green. A global threshold set now would break the
  moment M1–M6 add new screen files before their tests land; M7 owns the ratchet.

### M1 — Honest Ledger foundation (was D0)
Tokens to `src/theme/tokens.ts` (navy-cast ink scale, paper #FAF9F5, rule/rule-strong/
ink-panel/stamp tokens, art-directed dark); verify the RN font trio matches the DS trio
(Space Grotesk / Hanken Grotesk / JetBrains Mono) — the app currently loads a different
display font if the web audit is any guide, so VERIFY; `src/theme/motion.ts` (durations,
45ms stagger, settle d22/s260, thunk d14/s420, reduced-motion via AccessibilityInfo) +
`src/theme/haptics.ts`; install `expo-haptics` + `@gorhom/bottom-sheet`; **splash port
from `Splash Animations.html`** + app icon (OWNER DECISION: green/navy/paper candidate)
wired into app.config.ts. Emulator eyeball after the token shift.

**M1 status — 2026-07-27: code landed (`a544541`, `b37da11`); emulator verification partially done.**
- **Verified on emulator-5554**: the Honest Ledger tokens render correctly on-device — warm
  paper `#FAF9F5` background, navy-cast ink text, green accent; onboarding truthfulness
  copy intact. The **Navy app icon + native splash** now show the Zeno coin on `#0A0F2C`.
- **BUG FOUND AND FIXED during that verification** (exactly why gate #2 exists): the app was
  still launching with the OLD orbital icon. Cause — `apps/mobile/android/` is gitignored
  but persists locally, so `expo run:android` reuses it and does **not** regenerate
  `android/app/src/main/res/**` (`ic_launcher*`, `splashscreen_logo.png`) from changed
  `assets/*.png`. Fix: `npx expo prebuild --platform android --no-install`, then rebuild.
  **No repo change was needed** (a clean checkout has no `android/`, so prebuild runs and
  produces the correct icon) — but anyone with an existing local `android/` MUST prebuild
  after an icon/splash asset change. Re-confirm on a clean build before store assets (M7/A6).
- **STILL OPEN**: the "Tear" splash animation was only partially observed (the navy cover
  frame was captured; the tear + page reveal were not). A black-screen period was seen
  after the splash but its cause is **unresolved** — the app sat in uninterruptible I/O
  wait (`D` state, ~40% iowait) on a thrashing emulator, and `AppErrorBoundary` was ruled
  out (its error screen shows white text, the frames were blank), so a stalled compositor
  is the leading explanation, not a confirmed app defect. This machine's emulator is too
  slow to screenshot this dev build reliably. **Carry into M7**: confirm the splash plays
  end-to-end and that no black frame appears, on a faster device/emulator.

### M2 — Core kit (was D1)
Update Card (hairline --rule) / Button (ink primary; green = money-positive only) /
Badge / ListRow; new RN components from `Ledger.jsx`: LedgerLine, SectionHead/
ColumnHeads, Stamp (thunk spring + Success haptic), TearEdge/SheetShell, SkeletonRow
(Reanimated shimmer), BottomSheet (gorhom; option-list + confirm-destructive), CodeBoxes,
print-in stagger helper (FlatList-safe, transform/opacity only). Component smoke tests.

**M2 status — DONE 2026-07-28** (`5b9b3b6`, `5cde459`, `3fca959`, `f3f82f5`):
- **Ledger signature kit** (new `Ledger.tsx`): LedgerLine (dotted leader), SectionHead /
  ColumnHeads, Stamp (thunk spring + Success haptic, verified/alert/neutral), TearEdge,
  SkeletonRow (opacity pulse — no gradient lib, no layout measurement), CodeBoxes.
- **Button** is now solid **ink** primary (was green); green survives only as the new
  `money` variant; `danger` is outlined; press = stamp-down 0.97 + Medium haptic.
  **Card** is a document: hairline `rule`, radius md, NO resting shadow (only `elevated`
  lifts), press darkens the rule instead of raising a shadow.
  Added the `textOnInk` token — this caught a regression the refresh would otherwise have
  shipped: dashboard's two "Discover" buttons passed a `textOnAccent` (dark) icon that
  would have been invisible on the new dark ink button.
- **LedgerSheet** (@gorhom): option-list + `ConfirmSheet` destructive variant, tear edge,
  DS sheet spring, tap/pan-to-close. Also wired **GestureHandlerRootView at the app root**,
  which was missing — without it every gesture-handler surface silently gets no touches.
  M4 uses this to replace the `Alert.alert` pickers (closing the P4 debt).
- **AmountDisplay `animate`** — the DS TallyNumber count-up, added to the existing
  component rather than duplicating the money typography; reduced-motion renders final
  immediately and a failsafe timer guarantees the ledger never sits at $0.00 if rAF is
  throttled/suspended.
- **P5.1 RTL infra (carried from M0) — DONE.** Isolated jest project (`jest.config.js`),
  disjoint from vitest by extension (`*.rntest.tsx` vs `*.test.ts(x)`), plus 8 smoke tests
  rendering the real kit through the real theme provider. Required pins, each a hard
  failure not a guess: jest **29** (jest-expo@56 is built on 29; jest 30 throws
  `clearMocksOnScope is not a function`), react-test-renderer **19.2.3** (RTL pulls 19.2.8
  whose react peer rejects 19.2.3), and `resolver: react-native-worklets/jest/resolver.js`
  (Reanimated 4's worklets `.native` entry throws under jest; Reanimated's own `mock.js`
  does NOT work — it re-imports the real index).
- Gates: mobile typecheck + lint clean; vitest repo-wide **53 files / 498 tests**; jest RN
  **8/8**. On-device eyeball of the ink/hairline shift folds into M7 (see the M1 note).

### M3 — Hot screens (was D2)
Chrome/tab bar, Dashboard, Subscriptions (PRESERVE P4 FlatList/memo/debounce),
SubscriptionDetail, AddSubscription. Emulator-verify each.

**M3 status — DONE 2026-07-28** (`5ecac39`, `5fcb914`, `e2f7e4c`, `6600d85`, `f6e3382`):
Each screen ported against its DS mockup's own "slop audit", so the defining move
in every case was a DELETION:
- **Chrome**: paper tab bar under a hairline; the active tab is an OVERLINE TICK
  (green rule growing in from the left) with the icon going ink, not green; the
  center action is an INK SEAL, not a green pill; caps-mono labels; Home → Ledger.
  New `Masthead` / `ScreenHeader` primitives.
- **Dashboard**: the dark floating hero card and the budget card are gone. A
  typographic statement on paper — dateline masthead, "COMMITTED THIS MONTH" over
  an adding-machine total, a category rule-bar driven by the store's fx-aware
  byCategory (so it excludes exactly what the total excludes), charged/still-to-
  renew ledger lines, and budget as ONE honest line (over / left / on pace, or
  "SET ONE"). Attention rows use colored MARGIN TICKS instead of tinted tiles.
  Empty state is "PAGE 1 — BLANK".
- **Subscriptions**: pill chips and the card-wrapped list both deleted. Text-tab
  filters with underline ticks, real ColumnHeads, rows on the paper, verified
  cancellations carrying a mini STAMP and still-charging rows stating the amount
  in alert ink. **P4 perf preserved exactly** (memoized row, 200ms debounced query
  driving the filter, stable useCallback, FlatList windowing props untouched).
- **Detail**: the stat-card trio deleted → LedgerLines; charge history is a real
  ledger table (ColumnHeads + entry count + the "estimated from your billing
  cycle" caveat kept); a verified cancellation lands the STAMP with its annual
  saving and strikes the amount through. Honest empty copy verbatim: "…honest
  history, not sample data." All handlers/edit modal/verification lifecycle
  untouched; 13 orphaned style keys removed.
- **Add**: category chip-grid → caps-mono text ticks; column heads restyled.
- Gates each phase: typecheck + lint clean, vitest 279, RN component tests 8.
- **NOT yet eyeballed on device** — same constraint as M1 (this machine's emulator
  wedges on screenshots). These are large visual changes verified structurally
  only; M7's emulator drive is where they get confirmed.

### M4 — Flows (was D3)
Discover (scanline + tear-edge receipt results), CancelFlow + the Stamp verified-cancel
celebration (the app's ONE celebration — no confetti anywhere), Paywall, Onboarding +
splash handoff, Calendar, Insights, Budget, BudgetRecap, Settings (Alert.alert pickers →
BottomSheet — closes the P4 debt). Truthfulness copy verbatim. Emulator drive per flow.

**M4 status — IN PROGRESS 2026-07-28** (`0c38e56`, `614b977`):
- **Cancel + Stamp — DONE.** The success state is now the Stamp (neutral "Pending",
  thunk + Success haptic) over ledger lines printing what comes back monthly and
  yearly; card is paper, not green-tinted. **Bug fixed while porting**: the
  celebration was never visible — `handleConfirmedCancel` fired a ToastAndroid +
  `router.replace("/dashboard")` (Android) or an Alert whose OK replaced (iOS), so
  the success view rendered for at most a frame. The stamp now lands and stays;
  the user dismisses with Done. The outcome the toast carried is preserved for
  screen readers via a polite live region.
- **Settings pickers — DONE (closes the P4 Alert.alert debt).** Home currency and
  quiet window are LedgerSheets showing the CURRENT value with a check — something
  a system alert cannot do.
- **Paywall — truthfulness swept, one issue FOUND (not yet fixed, owner call):**
  no banned claims present, and it correctly sells only the three real Pro
  unlocks. BUT `VALUE_PROPS` item 4 "No bank login, ever" / "On-device &
  encrypted — your data stays yours" is **not a Pro unlock** — free users get it
  too — while the list's own comment states "every item here is gated behind
  `plan === 'pro'` … sell what's real (standards §14)". Listing it implies the
  core promise is paid. Suggested fix: move it out of VALUE_PROPS to a footer
  line so it still reads as Zeno's differentiator without being sold as Pro.
  Deliberately left for owner review since this is legally-reviewed copy.
- **Not yet ported**: Discover, Paywall visuals, Onboarding, Calendar, Insights,
  Budget, BudgetRecap.

### M5 — Coach + Family; retire the legacy kit (was D4)
Port the CoachScreen/FamilyScreen mockups; migrates the last screens off legacy
`src/components/ui` (Surface/PrimaryButton). Consent + "General information, not
financial advice." copy preserved VERBATIM.

### M6 — The 7 new screens (designs delivered 2026-07-11)
Port LoginScreen (age/consent gate semantics preserved — 16+ checkbox enables all
methods), SecurityScreen + LockOverlay (PIN via CodeBoxes, biometric, lockout state),
NotificationsScreen, WrappedScreen (coverage-honesty line verbatim), SpendTwinScreen
(static-benchmark honesty), WidgetsScreen ("Preview only" notice meaning kept),
ProfileScreen. Also removes the last screens on the old theming system
(the deferred P4.2 consolidation completes here).

### M7 — Final mobile verification & close
Full emulator drive of every flow; dark-mode + reduced-motion + a11y passes; coverage
ratchet (P5.5); adversarial review; MASVS spot re-check (`/security-review` on the
track's diff); store screenshots from `Zeno Design System/app_store/` (OWNER);
EAS preview build ONLY after owner confirms quota (memory says it reset 2026-07-01 —
confirm before building).

---

## Carried over — deferred work (unchanged)

### Phase 6 — Sync, done right (defer until after launch prep; ~3 days when scheduled)
Sync is server-complete but dead code; its conflict logic is unsound; P2.4 stopped
advertising it. When scheduled: **P6.1** client-side encryption before upload (unlocks
re-advertising as E2E); **P6.2** real vector-clock comparison (component-wise concurrent
detection, deterministic merge, never `sum(clock)`), idempotent push keyed by change IDs,
per-user cursor; **P6.3** app wiring behind explicit opt-in ("Encrypted backup") for
signed-in users, local-only untouched; **P6.4** conflict tests (two-device concurrent
edits, replayed pushes, cursor resume).

### Owner actions (outside the codebase)
- **A1** Buy a domain you control; then a small PR swaps `zeno.app` for one `SITE_URL`
  constant (legal links, sitemap, SEO). (zeno.app verified parked/for-sale.)
- **A2** Trademark search for "Zeno" in app-store categories before spending on branding.
- **A3** Keys when ready: RevenueCat (products + "pro" entitlement), Resend domain
  verification, Google OAuth client IDs, Sentry DSN — via EAS/Render env, never the repo.
- **A4** Google OAuth verification + CASA security assessment before Gmail scanning
  exceeds 100 test users (weeks of lead time — start early).
- **A5** Render: attach Postgres, set `DATABASE_URL`, redeploy `main` (live build is
  behind and in-memory).
- **A6** Store assets when builds exist: screenshots (app_store kit is ready), privacy
  questionnaire (answers derive from the privacy policy), Play data-safety form.
- **A7** US export self-classification (the app declares `usesNonExemptEncryption: true`):
  annual BIS/NSA self-classification report under the mass-market exemption (ECCN
  5D992.c) before shipping; add Apple's `ITSEncryptionExportComplianceCode` to
  app.config.ts when issued.
- **A8** Quarterly competitor-pricing re-check: compare pages cite prices with a
  "verified July 2026" footnote — re-verify and bump the date (or soften) every quarter.
- **A9** (new) App icon decision: green / navy / paper candidate
  (`Zeno Design System/assets/app-icons/`) — blocks M1's asset wiring.
- **A10** (new) Website deploy target (blocked on A1): site is deploy-ready at the end
  of Track W.

## Execution order & definition of done
**W1 → W2 → W3 → W4, then M0 → M7.** Each phase: code + tests + all six standing gates
green + one commit per logical change + push. A phase is done when every item has landed
or carries a dated re-scope note in this file. Nothing ships with a known bug: found
defects are fixed inside the phase that found them.

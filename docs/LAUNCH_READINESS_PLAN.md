# Zeno Launch Readiness Plan

Source: full five-dimension audit (business, legal, performance, best practices, adversarial bug hunt) of 2026-07-09, with findings adversarially verified (live reproduction against the deployed API/EAS + line-level source confirmation). Every confirmed finding is mapped to exactly one phase below. Standards referenced: `docs/ENGINEERING_STANDARDS.md`.

**Explicitly deferred by owner (not in any phase):** RevenueCat SDK keys, Resend sender verification, Google OAuth client IDs, Render Postgres + redeploy — owner adds these later. **Plaid:** code stays in the repo untouched; user-facing entry points are disabled/commented (P2.7) until further instructions.

**Decisions pre-made** (owner delegated): each phase lists its decisions inline, marked `DECISION`. Where the law is not strict, the choice optimizes for honest-but-simple over legally-maximal.

---

## Phase 0 — Data-integrity blockers (do first, ~half a day)

The two bugs that silently destroy user data or lock users out. Nothing else matters if these ship.

- **P0.1 Fix the setState-capture persistence bug** — `apps/mobile/src/data/subscription-store.tsx`.
  `applyChange` (and `deleteSubscription`'s settings write, `addSubscription`'s settings write) capture values out of React state updaters; React skips eager updater evaluation whenever the fiber already has a pending update, so: price edits never persist (old price returns on restart), and deleting a subscription persists `{}` over the whole notification-settings table (wipes every subscription's reminder prefs).
  Fix pattern (per standards §10): compute `next` from current state *outside* the updater, then `setX(next)` + `persist(next)`. Apply to every mutation in the store; audit all `let x; setState(...)` captures repo-wide.
  Regression tests: price edit persists; delete preserves other subs' settings (requires the P5.1 testing infra — write the tests as pure store-logic tests against extracted reducer functions if infra isn't ready yet; extracting mutation logic into pure functions is the preferred fix shape anyway).
- **P0.2 Fix the re-lock-on-every-mutation bug** — `apps/mobile/app/_layout.tsx` + `src/security/lock-store.ts`.
  The effect calling `hydrateLock()` re-runs on every store recompute (deps include fresh-identity aggregates), and `hydrate()` unconditionally sets `locked: enabled` — so PIN users get the lock overlay after every add/edit/delete.
  Fix: split the effect — hydrate the lock **once** per cold start (empty-dep effect or an `useRef` guard); keep notification rescheduling in its own effect with its own deps; `hydrate()` should also not re-lock if already hydrated (make it idempotent: only set `locked: enabled` on first hydration).
- **P0.3 Verify on emulator**: set PIN → add/edit/delete subs → no re-lock; edit price → force-stop → relaunch → new price persisted; delete one sub → other subs' notification settings intact.

## Phase 1 — Correctness bugs users will hit (~1–2 days)

- **P1.1 CSV: stop counting refunds as charges** — `packages/shared/src/csv/recurring.ts:90` uses `Math.abs(amount)`. DECISION: negative amounts are excluded from recurring-charge detection entirely (a refund is not a charge; netting them against charges is a later feature). Add tests: charge+refund pair must not create a candidate; payroll credits must not appear.
- **P1.2 CSV: drop exact-duplicate rows** (same date+merchant+amount) before detection so re-imported/overlapping statements don't break cadence detection. Test with an overlapping two-statement import.
- **P1.3 Gmail amount parsing** — `apps/mobile/src/discovery/emailScanner.ts:569-596`: accept thousand separators (`$1,299.00`) and `€`/`£` symbols + `EUR/GBP/INR/CAD/AUD` codes, mapping to the currency enum. "Total: $1,299.00" must parse as 129900 minor units, not 100. Tests for each format.
- **P1.4 Renewal-date timezone bug** — `apps/mobile/app/subscription/[id].tsx:198` (and any other `T09:00:00` construction): store the chosen renewal *day* as a UTC date (`new Date(dateStr + "T00:00:00Z")` semantics or plain `YYYY-MM-DD` handling), aligning with the UTC-day consumers (`rollRenewalForward`, trial guardian, notification triggers). Sydney (UTC+10..+14) test: picking Jul 15 must not produce Jul 14 anywhere.
- **P1.5 Quiet hours must not push "renews today" past the renewal** — shift the day-of reminder to the quiet-window *end on the same day*; if that's impossible (window covers the whole day), fire at window end regardless. Test the boundary.
- **P1.6 Weekly-cycle reminder spam** — 7-day + 3-day + day-of for a weekly sub fires three overlapping reminders every week. DECISION: for weekly cycles only day-of reminders are scheduled; for monthly+ cycles the full ladder stays.
- **P1.7 Wrapped honesty** — copy claims "spent over the last 12 months" but history starts when the sub was added to Zeno. DECISION: change copy to "since you started tracking" (with the tracking-start date shown); no fake backfill.
- **P1.8 Currency display honesty** — converted totals sometimes render a hardcoded `$` and hide exclusions. Use the home-currency symbol everywhere a converted total renders, and show the existing "N subscriptions in other currencies not included" disclosure on every aggregate that skips items (dashboard, analytics, coach).
- **P1.9 Category budget benchmarks** — benchmarks are USD cents compared against home-currency minor units. DECISION: benchmarks only render when home currency is USD until converted benchmarks exist (small honest scope cut).
- **P1.10 iOS notification cap** — iOS holds max 64 pending local notifications; 3/sub means ~21 subs max. Schedule only the nearest ~55 triggers (sorted by fire date) and re-fill on each reschedule. (The reschedule-debounce perf work is P4.1; this item is just the cap-aware selection.)

## Phase 2 — Legal & claims alignment (~1–2 days, mostly copy + small code)

Rule applied throughout (standards §14): the copy must describe what the code does today.

- **P2.1 Rewrite absolute privacy claims** — everywhere: mobile onboarding (`app/index.tsx` beats), web hero/sections, store-listing copy, COMPLIANCE.md.
  DECISION on wording: "No bank login. Ever." **stays** (true — Plaid entry points are disabled in P2.7). "We never see your data" / "100% on-device" becomes: **"Your subscriptions live on your device, encrypted. Nothing leaves your phone unless you turn on a cloud feature — and we ask first."** Feature-level qualifiers on coach/family screens.
- **P2.2 Coach consent moment** — `app/coach.tsx` currently auto-transmits the full subscription list on mount, including for local-only users. Add a one-time consent screen (what is sent, to whom, toggle to decline → deterministic on-device insights only). Store the consent flag; never transmit before it. DECISION: consent is per-account, revocable in Settings → Privacy.
- **P2.3 Gmail Limited Use compliance** — Gmail-derived data must not flow to third-party AI (Google API Services User Data Policy, Limited Use). DECISION: coach payload filters out subscriptions whose `source` is Gmail-derived; the consent screen states this. (Server keeps zero Gmail data regardless — scanning is on-device.) Add the CASA/verification requirement to the pre-launch checklist (owner action A4).
- **P2.4 Stop advertising E2E sync** — capabilities endpoint, COMPLIANCE.md, and any UI copy that says cloud backup is end-to-end encrypted. DECISION: remove "sync/backup" from advertised capabilities entirely until P6 implements client-side encryption — the endpoints stay but are undocumented.
- **P2.5 Cookie policy** — promises an analytics consent prompt; no analytics exist. DECISION: rewrite the cookie policy to the truth (no analytics, no ad cookies; only strictly-necessary storage), delete the prompt promise.
- **P2.6 AI-coach disclaimer** — one line on the coach screen: "General information, not financial advice." plus the same line in Terms.
- **P2.7 Plaid gating (owner instruction: keep code, comment entry points)** — comment out/feature-flag the navigation entries to the open-banking screen (settings row, any dashboard/discover link) so no user path reaches it; leave `apps/api` Plaid routes and mobile screen code untouched. Also remove/soften the web "Open Banking" feature page CTA (page can stay as "coming soon" — DECISION: mark it "Planned", remove claims it exists today).
- **P2.8 "No Plaid, ever" copy** — with P2.7 done, soften to "No bank login required" everywhere the absolute form appears (web compare pages, feature pages). Absolute "ever" promises are deleted (they contradict the shipped-but-dormant code).
- **P2.9 Paywall truthfulness** — remove "Ongoing auto-discovery — automatic repeat scans" from the paywall value props (feature doesn't exist), and re-check each listed Pro feature against what `plan === "pro"` actually gates; anything free today is either gated or removed from the paywall list. DECISION: don't build background scanning now; sell what exists (unlimited subs, price-hike radar depth, family, verified cancel).
- **P2.10 Paywall prices** — render live store prices via `getPackagePrice` with the hardcoded strings only as offline fallback (they already exist as fallbacks — make the live path primary).
- **P2.11 Privacy policy completeness** — add: named processors (Render, Resend, Groq, RevenueCat, Sentry — listed as "when these features are enabled"), server-side retention (account data until deletion; magic-link tokens ≤15 min; logs ≤30 days), international transfer sentence (processors in the US, SCCs where applicable), family-sharing data category, crash reporting disclosure (inert until DSN set — say so).
- **P2.12 iOS export compliance** — DECISION: set `usesNonExemptEncryption` handling to the accurate posture: the app uses standard encryption (SQLCipher/OpenSSL/TLS) for data protection → declare encryption use with the mass-market/standard-algorithms exemption in App Store Connect, and add the annual self-classification note to the release checklist. Remove the blanket `false` from `app.config.ts` (replace with documented exemption declaration at submission time).
- **P2.13 Metrics/marketing numbers** — competitor pricing claims on compare pages get a "verified <date>" footnote and a quarterly re-check entry in the release checklist; remove competitor names from store keyword fields (App Store rejection risk).

## Phase 3 — Security hardening (~1 day)

- **P3.1 `/metrics`** — require the token in production (refuse to boot without it, matching the JWT-key pattern), constant-time compare (`crypto.timingSafeEqual` over equal-length buffers).
- **P3.2 Magic-link error sanitization** — map Resend failures to a generic 502 envelope; log the detail server-side only.
- **P3.3 Per-account rate budgets** — audit every email-sending/AI route for per-account (not just per-IP) limits; add where missing (coach: N/day/account; magic-link: N/hour/email).
- **P3.4 Home-currency validation on DB read** — parse through the currency enum with fallback to USD instead of an unchecked cast.
- **P3.5 Security headers on web** — add standard headers via `next.config.ts` (CSP report-only to start, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS at the host).
- **P3.6 npm-audit gate policy** — keep audit in CI as a report step; move the *blocking* audit to the release workflow so unrelated PRs don't redden on new upstream advisories (standards §11).

## Phase 4 — Performance & architecture (~2–3 days)

- **P4.1 Notification pipeline** — debounce `rescheduleAllNotifications` (single trailing run per burst), diff against currently-scheduled IDs instead of cancel-all+reschedule, and split the `_layout` effect so store recomputes don't re-run app-lifecycle work (pairs with P0.2's effect split). Includes P1.10's cap-aware selection.
- **P4.2 Store fan-out** — expose granular selector hooks from the subscription store (subscriptions, aggregates, settings as separate memoized slices) so a mutation stops re-rendering every screen; memoize `widgetSnapshot` and the notification-input arrays with stable identities.
- **P4.3 Virtualize the subscriptions list** — `FlatList` with memoized row + `keyExtractor`; debounce the search filter.
- **P4.4 Memoize hot-screen derivations** — dashboard's `generateInsights`/`getTotalSavingOpportunity`/`computeBudgetForecast` behind `useMemo`; `profile.tsx` styles via the standard `useMemo(createStyles)` pattern.
- **P4.5 Break the authStore ↔ api/client require cycle** — extract shared token-access into a third module (the codebase already models this pattern elsewhere).
- **P4.6 api/client error taxonomy** — replace swallow-to-`null` with the discriminated result of standards §7; update call sites to render true states (offline vs error vs empty). (Biggest single UX-quality lever in the app.)
- **P4.7 Production logger config** — explicit level from env, pretty-print off, redaction list reviewed.

## Phase 5 — Testing & CI depth (~2 days)

- **P5.1 React-Native testing infra** — add `@testing-library/react-native` + jest-expo or vitest-compatible RN preset (evaluate; DECISION: stay on vitest if the RN preset works cleanly, else isolated jest project for RN component tests only).
- **P5.2 Store tests** — the Phase 0 regression tests plus: add/update/delete persistence, renewal roll-forward, cap enforcement, settings hydration.
- **P5.3 api/client tests** — the new error taxonomy: offline, 401, 500, malformed envelope.
- **P5.4 Notification-plan tests** — quiet-hours boundaries (P1.5), weekly ladder (P1.6), iOS cap selection (P1.10).
- **P5.5 Coverage ratchet** — set a floor at current coverage; raise as phases land.

## Phase 6 — Sync, done right (defer until after launch prep; ~3 days when scheduled)

Currently sync is server-complete but dead code (nothing calls `syncPush`/`syncPull`), and its conflict logic is unsound. P2.4 already stops advertising it. When scheduled:
- **P6.1** Client-side encryption before upload (server stores opaque blobs) — this is what unlocks re-advertising it as E2E.
- **P6.2** Real vector-clock comparison (component-wise concurrent detection; deterministic merge; never `sum(clock)`), idempotent push keyed by change IDs, per-user cursor (not the global watermark).
- **P6.3** Wire into the app behind an explicit opt-in ("Encrypted backup") for signed-in users; local-only mode untouched.
- **P6.4** Conflict tests: concurrent two-device edits, replayed pushes, cursor resume.

---

## Owner actions (outside the codebase — checklist)

- **A1** Buy a domain you control; then a small PR swaps `zeno.app` for a single config constant (`SITE_URL`) used by legal links, sitemap, SEO. (zeno.app verified parked/for-sale — all current legal links are broken-by-ownership.)
- **A2** Trademark search for "Zeno" in app-store categories before spending on branding (unverified risk — cheap to check now).
- **A3** Keys, when ready: RevenueCat (products + entitlement "pro"), Resend domain verification, Google OAuth client IDs, Sentry DSN — each lands via EAS env / Render env, never the repo.
- **A4** Google OAuth verification + CASA security assessment scheduling before Gmail scanning goes beyond 100 test users (restricted-scope requirement; lead time is weeks — start early).
- **A5** Render: attach Postgres, set `DATABASE_URL`, redeploy current `main` (live build is days behind and in-memory).
- **A6** Store assets when builds exist: screenshots, privacy questionnaire (answers derive from the P2 privacy policy), data-safety form on Play.
- **A7** US export self-classification (P2.12): the app now declares `usesNonExemptEncryption: true` (SQLCipher/OpenSSL AES-256 at rest). File the annual self-classification report to BIS/NSA under the mass-market exemption (ECCN 5D992.c) before shipping; once App Store Connect issues an `ITSEncryptionExportComplianceCode`, add it to `app.config.ts` infoPlist to skip the per-submission questionnaire.
- **A8** Quarterly competitor-pricing re-check (P2.13): the compare pages (YNAB, Monarch) cite competitor prices with a "verified July 2026" footnote. Re-verify each competitor's public pricing page every quarter and bump the footnote date, or soften the claim, so no stale price ships.

## Execution order & definition of done

P0 → P1 → P2 → P3 → P4 → P5 (P6 scheduled separately). Each phase: code + tests + `npm run typecheck && npm run lint && npx vitest run` green + emulator verification of touched flows + one commit per logical fix. A phase is done when every item has either landed or been explicitly re-scoped in this file with a dated note.

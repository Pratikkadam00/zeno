# U1 · The state matrix: 27 screens × every state

**Date:** 2026-10-09. Each cell names the test that proves it, so a cell is a claim with
an address, not a tick. Files are under `apps/mobile/src/`; `__screens__/x.rntest.tsx` is
written `x`. The suite runs in CI (jest, 571 tests before this pass, 614 after).

**Legend.** `—` the state cannot exist on that screen (a static page has no "many"; a
screen that fetches nothing has no "offline"). A cell with no file is a gap and says so.

## The states

| Column | What it means |
|---|---|
| **empty** | nothing tracked yet, or the screen's own list is empty |
| **one / many** | one subscription, and the ordinary handful (the 5-item seed) |
| **cap 10 / 200** | the free plan's cap, and a ledger far past it |
| **loading** | the in-flight state: a request, a scan, a purchase, a hydration |
| **error / offline** | the request failed, the server disagreed, or a rate is missing |
| **hostile text** | a 120-character name, emoji, Japanese, Hindi, Arabic (RTL), combining marks |
| **currency** | the six supported currencies, and an amount in one with no rate |

## The matrix

| # | Screen | empty | one / many | cap 10 / 200 | loading | error / offline | hostile text | currency |
|---|---|---|---|---|---|---|---|---|
| 1 | `index` (onboarding) | — (fixed sample) | `onboarding` | — | — | — | — | — |
| 2 | `login` | — | — | — | `login` | `login` | — | — |
| 3 | `(tabs)/dashboard` | `dashboard` | `dashboard` | `dashboard` / `state-matrix` | `dashboard` (count-up) | `dashboard` (plan check fails) | `state-matrix` | `dashboard` (no rate) · `state-matrix` |
| 4 | `(tabs)/subscriptions` | `subscriptions` | `subscriptions` | `state-matrix` / `state-matrix` | `subscriptions` (search debounce) | `subscriptions` (unknown status) | `state-matrix` | `state-matrix` (all six) |
| 5 | `(tabs)/calendar` | `calendar` | `calendar` | — / `state-matrix` | — | `calendar` (unreadable date) | `state-matrix` | `calendar` (no rate) |
| 6 | `(tabs)/analytics` | `analytics` | `analytics` | — / `state-matrix` | — | `analytics` (no rate) | `state-matrix` | `analytics` |
| 7 | `(tabs)/discover` | `discover` | `discover` | `discover` (cap, over cap) | `discover` (scan progress) | `discover` (scan, picker, inbox all fail) | — (results are parsed, not typed) | `discover` |
| 8 | `budget` | `budget` (no forecast, no envelopes) | `budget` | `budget` (free plan locked) | — | `budget` (zero cap) | `state-matrix` | `budget` (other currencies counted) |
| 9 | `budget-recap` | `budget-recap` (no budget) | `budget-recap` | — | — | `budget-recap` (over cap) | `state-matrix` | — |
| 10 | `coach` | `coach` (nothing tracked) | `coach` | — | `coach` (asking) | `coach` (no summary) | `state-matrix` | `coach` (counted, not guessed) |
| 11 | `family` | `family` (start or join) | `family` | `family` (member cap) | `family` (request running) | `family` (wrong code, unreachable, store fails) | — (names come from the server) | `family` (mixed not summed) |
| 12 | `notifications` | `notifications` | `notifications` | `notifications` (at most 12) | — | `notifications` (phone blocks them) | `state-matrix` | — |
| 13 | `paywall` | — | `paywall` | — | `paywall` (buying) | `paywall` (store closed, failed, no plan) | — | `paywall` (localized store price) |
| 14 | `profile` | `profile` (local-only) | `profile` | — | — | `profile` (no email) | `state-matrix` | — |
| 15 | `settings` | `settings` (local-only) | `settings` | — | — | `settings` (server can't confirm, partial erase) | `state-matrix` | `settings` (home currency) |
| 16 | `security` | `security-screen` | — | — | — | `security-screen` (lockout) | — | — |
| 17 | `subscription/add` | `subscription-add` (custom, no amount) | `subscription-add` | — | — | `subscription-add` (bad amount, no name) | `subscription-add` (custom names) | `subscription-add` |
| 18 | `subscription/[id]` | `subscription-detail` (not found) | `subscription-detail` | — | `subscription-detail` (cold start) | `subscription-detail` (bad date, zero price) | `state-matrix` (each kind) | `subscription-detail` (cycles) |
| 19 | `subscription/cancel/[id]` | `subscription-cancel` (not found, not in catalog) | `subscription-cancel` | — | — | `subscription-cancel` (page won't open) | — | `subscription-cancel` (yearly figures) |
| 20 | `wrapped` | `wrapped` (nothing to rank) | `wrapped` | — | — | — | `state-matrix` | `wrapped` (counted, not guessed) |
| 21 | `spend-twin` | `more-screens` | `more-screens` | — | — | — | `state-matrix` | — |
| 22 | `widgets` | `more-screens` (no next renewal) | `more-screens` | — | — | — | `state-matrix` | — |
| 23 | `business` | — (static) | — | — | — | — | `state-matrix` | — |
| 24 | `partners` | — (static) | — | — | — | — | `state-matrix` | — |
| 25 | `public-api` | — (static) | — | — | — | — | `state-matrix` | — |
| 26 | `backend` | — | `more-screens` (dev) | — | `more-screens` (before the answer) | `more-screens` (release: no call) | — | — |
| 27 | `open-banking` | — | `more-screens` (dev) | — | `more-screens` (working) | `more-screens` (release: not in this version) | — | — |

## U1.8 · no placeholder text, "undefined" or a raw key

`state-matrix.rntest.tsx` renders 14 screens (every one that runs on the standard fakes)
empty and with subscriptions, walks the rendered tree, and collects every text node plus
every `accessibilityLabel`, `accessibilityHint`, `accessibilityValue` and `placeholder`
prop. It fails on any of: the word "undefined", `NaN`, a stringified object, a broken
amount, an unfilled `{{slot}}`, "lorem ipsum", a TODO/FIXME/TBD, the word "placeholder",
a raw dotted key, or a bare "null". A control case proves the sweep catches a planted
`"Next renewal: undefined"` and passes the same line with a real date.

The other 13 screens need their own module fakes (the store SDK, the auth store, the
AI client, Google sign-in, the document picker), so the sweep cannot mount them in one
file; each is covered by its own file, which asserts its real copy string by string.

## What this pass added

Before it, the per-screen files already drove each screen's own empty, loading and error
states — the columns above are mostly theirs. Three cells had nothing anywhere:

- **200 subscriptions** (`U1.3`). The ledger counts and totals all 200 and draws a window
  of them: the list virtualises, so a 200-row mount would be the defect, not the fix. The
  drawn rows are the first ones in order and every one is a real row, none invented.
- **Hostile text** (`U1.6`). Eight names, one of each kind, on the ledger, the subscription
  page, the calendar, the insights and Wrapped. Also the two extreme amounts
  ($999,999.99 and $0.01), which must stay money.
- **Every currency on a screen** (`U1.7`). `format.behavior.test.ts` already pinned the six
  symbols; this renders a row in each and asserts it reads exactly as the formatter writes
  it, so no screen re-derives a currency sign of its own.

## Not covered, and why

- **Offline as a device state** (aeroplane mode) is not simulated in jest. What the app
  does without a network is covered as the failure of each thing it fetches: the FX rate
  (every screen that converts), the plan check, the AI answer, the household, the account
  deletion. A real offline run belongs to U5 (devices).
- **Right-to-left layout** (the whole UI mirrored under an RTL locale) is not tested. The
  matrix proves Arabic *text* renders in a left-to-right layout, which is what an Arabic
  service name does today. Mirroring the layout is only needed if Zeno ships an RTL
  locale, and it ships none.

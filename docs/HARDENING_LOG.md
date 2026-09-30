# Zeno — Hardening Log

Live tracker and findings log for `docs/PRODUCTION_HARDENING_PLAN.md`.
Every entry records **what was done, the command that proved it, what was found, and
what still needs fixing**. Nothing here is estimated: if a line says "verified", the
evidence is next to it.

Legend: `[x]` done and verified · `[~]` in progress · `[ ]` not started · `[!]` blocked (reason given)

---

## Tracker

- [x] **P0 — Foundations: CI hardening, secret scan, coverage scope** (P0.6 waits on the owner)
  - [x] P0.1 Coverage scope: exclude generated `.next/**`; guard against unexplained `v8 ignore`
  - [x] P0.2 Secret scan: gitleaks over full git history (local) + CI job on every push/PR
  - [x] P0.3 Static analysis (SAST): CodeQL workflow + semgrep with zero-findings gate
  - [x] P0.4 Workflow hygiene: SHA-pinned actions, least-privilege `permissions`, `concurrency`, audit gate blocking in CI
  - [x] P0.5 Dependabot (npm + GitHub Actions) + SBOM on release
  - [!] P0.6 Branch protection on `main` (owner action — documented; `main` verified UNPROTECTED)
  - [x] P0 gate: all standing gates green locally; new CI jobs green on GitHub
- [~] **P1 — Tier 1 logic to 100 % coverage** (order = risk; each sub closes the findings named)
  - [x] P1.1 `apps/api/src/server.ts` (0 %) — boot, env matrix, logger; **fixes F9** (tokens in request logs)
  - [x] P1.2 `apps/mobile/src/security/*` — secure-store, lock-store (48 %), app-lock; **fixes F13** (Gmail SecureStore key)
  - [x] P1.3 `apps/mobile/src/discovery/*` (emailScanner 48 %, csvParser, helpers) + shared receipts — untrusted email/CSV input; **fixes F12, F17, F20**
  - [x] P1.4 `apps/mobile/src/auth/authStore.ts` (51 %) — token lifecycle; **fixes F10, F23, F24** (with the API side); F11 stays open (P3)
  - [x] P1.5 `apps/mobile/src/storage/database.ts` (59 %) + `subscription-repository.ts` (0 %) — on a REAL SQLite engine
  - [x] P1.6 `apps/mobile/src/billing/revenueCat.ts` (55 %)
  - [x] P1.7 `packages/service-catalog/src/services.ts` (0 %) — catalog invariants for all 509 entries; **fixes F22**, raises F25
  - [x] P1.8 React providers under jest with their own coverage floor
    - [x] P1.8a jest coverage floor wired into CI; the four files moved from Vitest's scope to jest's
    - [x] P1.8b `budget-store.tsx` — **fixes F26** (lost updates)
    - [x] P1.8c `theme-provider.tsx`
    - [x] P1.8d `subscription-store.tsx` — **finishes F26** (the `setQuietHours` stale merge)
    - [x] P1.8e `LockOverlay.tsx` — **fixes F28** (a keychain error wedged the lock screen)
    - [x] P1.8f "erase everything from this device" as one tested function — **fixes F27**
  - [~] P1.9 every remaining Tier 1 gap (since 2026-09-30, per the owner's choice, split across 5 parallel agents, each in its own git worktree with disjoint files; I merge, gate, push and verify each): 48 files, with 532 statements / 530 branches / 98 functions uncovered (measured 2026-09-30, `gaps.cjs` over `coverage-final.json`)
    - [~] P1.9a API (`app.ts` + `routes/auth.ts` by me; the rest by a parallel agent): `app.ts` ✅ (everything except the Plaid-configured paths, which are P1.10; **fixes F30, F31, F32, F33**), `routes/auth.ts` ✅ (0 uncovered lines / functions; 5 defensive branches), `coach.ts`, `billing.ts`, `family.ts`, `sync.ts`, `config.ts`, `storage/pg.ts`
    - [~] P1.9b mobile logic (two parallel agents): **part 1 ✅** (`api/client.ts`, `notificationService.ts`, `notificationHandlers.ts` at 100 / 100 / 100; fixes F38–F42); part 2 still running: `api/client.ts`, `notificationService.ts` + `notificationHandlers.ts` (0 %), `subscription-ui.ts` (51 %), `calendarUtils.ts`, `insightsEngine.ts`, `finance/budget.ts`, `format.ts`, `api/config.ts`, `seed-subscriptions.ts`, `open-banking.ts` (+ F18 note)
    - [~] P1.9c shared package (parallel agent): 14 files (csv parse-utils, spend history / coach / twin / year-in-review / price-radar, renewal-plan, widget snapshot, public-api keys, business, trial-guardian, family vault, analytics, open-banking)
    - [x] P1.9d thin config, theme and web files: all 13 at 0 uncovered statements, branches and functions (`motion.ts` and `useZenoTokens.ts` moved to jest with 100 % floors). **Fixes F35, F36, F37**
  - [x] P1.10 `apps/api/src/plaid.ts` (was 21 %; now 0 uncovered lines / functions, 1 defensive branch) and the Plaid routes in `app.ts` (now 100 %). Plaid's HTTP is faked, with no Plaid or sandbox calls, by standing instruction. **Fixes F34**
  - [ ] P1.11 gate: Tier 1 at 100 % lines / statements / functions, ≥ 95 % branches; jest floor; green on GitHub
- [ ] **P2 — API on real Postgres, authorization matrix, fuzzing**
- [ ] **P3 — Mobile hardening (MASVS) + tests for all 29 screens**
- [ ] **P4 — Website component tests, Playwright, CSP, DAST**
- [ ] **P5 — Mobile end-to-end (Maestro on the emulator)**
- [ ] **P6 — Mutation + property-based testing**
- [ ] **P7 — Security verification v2 with evidence**
- [ ] **P8 — Infrastructure and operations (owner-driven)**

---

## Open findings / fixes needed

Items found during the work that are not yet fixed. Each has an owner and the phase
that closes it.

| # | Finding | Severity | Owner | Closes in |
|---|---|---|---|---|
| F1 | `apps/mobile/components/subscriptions/ServiceAutocomplete.tsx` (RN component, also exports `servicePriceLabel`) has no test in any runner | Test gap | me | P3 (screen/component tests) |
| F2 | **Production API likely ran with per-client rate limiting broken** from the 2026-09-29 deploy of `9eb4721` until `064fc52` deploys: Fastify 5.12.5 made the numeric `trustProxy: 1` trust nobody, so every visitor shared the load balancer's rate-limit bucket (one noisy client could 429 everyone, incl. login). Render auto-deploys `main` and starts with `tsx` (no typecheck), so the type break did not stop the deploy. **Fixed in code**; the owner should confirm the Render deploy of `064fc52`+ is live. | High (availability of auth) | owner: confirm deploy | P0.2 (fixed) |
| F3 | Whether the address Render's load balancer appends is the real client or a Cloudflare edge is unverified (Render staff, May 2021: "we set the first IP in the list to the real client IP"). With 1 trusted hop, request.ip is the LAST appended address. Check in Render logs: the pino request log's `remoteAddress` for your own request should equal your public IP. If it shows a Cloudflare IP, set `TRUST_PROXY_HOPS=2`. | Medium (rate-limit granularity) | owner: one log check | P8 |
| F4 | Render builds with `npm install` (not `npm ci`) and deploys every push to `main` regardless of CI status (`autoDeploy: true`), and the start command (`tsx`) never typechecks. A red CI does not stop a deploy. | High (process) | **fixed in `render.yaml` (P0.4)**; owner: confirm the Render service is Blueprint-managed so the change applies (if it was created by hand, set "Auto-Deploy: After CI checks pass" in the dashboard) | P0.4 |
| F5 | CI ran **Node 20, end-of-life since 2026-04-30**. Production was worse-defined: Render reads `engines`, and per Render's docs an unbounded range like our `>=20.11.0` "always resolves to the latest release" — whatever Node major is newest, not an LTS. | High (unpatched / unpinned runtime) | **fixed (P0.4)**: `.node-version` = 24 (Render reads it before `engines`), engines `>=24 <25`, CI via `node-version-file` | P0.4 |
| F7 | **`main` is not protected** (GitHub API: `protected: false`, required checks `[]`): force-push and branch deletion are allowed, and nothing requires checks before code lands. | High (integrity of the deploy branch) | owner: the P0.6 steps below | P0.6 |
| F8 | GitHub's own free protections for public repos are not verifiable without owner auth: secret-scanning **push protection** (rejects a push that contains a secret, server-side), Dependabot **alerts** and **security updates**. | Medium | owner: enable in Settings → Code security | P0.6 |
| F9 | **FIXED in P1.1.** ~~Magic-link login tokens are written to production logs.~~ Fastify's default request log includes `req.url` with the query string, and `GET /api/v1/auth/verify?token=…` carries the raw token. Verified by a probe with the exact production logger config: the log line held `"url":"/api/v1/auth/verify?token=PROBE-SECRET-MAGIC-TOKEN-123"`. Single-use limits it, but a verify that fails before consuming the token (e.g. 429) leaves a working login token in Render's logs. | High (credential in logs) | me | P1 (`server.ts`) |
| F14 | The PIN lockout window is measured with the device clock, so someone holding the unlocked phone can move the clock forward past the 15-minute lockout (each cycle still costs 10 attempts and a trip to Settings). No trusted time source on-device; rollback detection is possible. | Low | me | P3 (MASVS) |
| F15 | `checkStatus` trusts the server's plan but falls back to the client's RevenueCat view when the server is unreachable. Client-only features are bypassable by any modified client regardless; what matters is that PAID SERVER features (coach, family, sync) check entitlement server-side. | Medium (to confirm) | me | P2 (authz matrix) |
| F16 | Local DB encryption is configured (`useSQLCipher: true` in app.config; `expo.sqlite.useSQLCipher=true` in the generated gradle.properties), but never PROVEN at runtime: needs `PRAGMA cipher_version` on a device, or a check that the file header of `zeno.db` is not the plaintext "SQLite format 3". | Medium (unverified claim) | me | P3 (on device) |
| F10 | **FIXED in P1.4** (server + app). ~~Google sign-in: a nonce is sent to Google but NOT to our API (`/auth/google` gets only the token), so the server cannot bind the ID token to this sign-in (replay of a stolen token). Apple sign-in requests no nonce at all. Needs the server side read in full before a verdict. | Medium (to confirm) | me | P1 (`authStore.ts`) + P2 |
| F11 | Google sign-in uses the implicit ID-token flow returned to the custom scheme `zeno://auth/google`, and Gmail connect also uses expo-auth-session. **Google's own native-app guide, verbatim: "Custom URI schemes are no longer supported on Android and Chrome apps."** So on Android these flows are likely REJECTED by Google, not just weaker. Cannot be confirmed at runtime without the real Google client IDs (A3). Likely fix: Google's native Credential Manager / Sign in with Google SDK, or App Links redirects. | **High (likely broken on Android)** | owner: client IDs (A3); me: migrate | P3 |
| F12 | **FIXED in P1.3** (revocation, label); sender-spoofing part ACCEPTED as low with evidence (see P1.3). ~~Gmail: disconnect revokes with the token in the URL query (`…/revoke?token=`); the fallback account label embeds the first 8 characters of the access token; known billing senders are trusted from the spoofable `From` header alone (no DKIM/SPF check). | Low–Medium | me | P1 (`emailScanner.ts`) |
| F13 | **FIXED in P1.2.** ~~Gmail connect fails on every real device.~~ Tokens are stored under `zeno.oauth.gmail.acct.<address>`, but expo-secure-store 56.0.4 rejects keys outside `/^[\w.-]+$/` (source: `ensureValidKey` in `build/SecureStore.js`, applied to get/set/delete), and an address contains `@`. The existing tests pass only because their fake SecureStore does not enforce that rule. | High (feature broken on device) | me | P1.2 |
| F17 | **FIXED in P1.3.** ~~Store receipts: the app name ran across line breaks and kept heading words ("App Store receipt
Netflix (Monthly)" → "Store receipt Netflix"), so a real Netflix App Store receipt matched nothing.~~ | Medium (correctness) | me | P1.3 |
| F18 | CSV import labels every detection USD. Correct for the five US bank formats it recognises; a "Generic" CSV from a non-US bank would be mislabelled (engineering standards: currency honesty). | Medium | me | P1.9 (with the shared money parser) |
| F19 | Wells Fargo CSV: detected by a first row of 5 cells with ≥2 `*`, and that first row is then dropped as a "header". If real WF exports have no header row, the first transaction is silently lost; if their placeholder cells differ, the format is not detected at all. Needs a REAL (redacted) Wells Fargo export to verify. | Medium (unverified assumption) | owner: one sample file | P1.9 |
| F20 | **FIXED in P1.3.** ~~CSV merchant cleanup stripped ANY last word of 2+ letters ("APPLE MUSIC" → "Apple", "DISNEY PLUS" → "Disney"): distinct subscriptions merged into one group with an averaged amount, and groups whose amounts then differed were dropped.~~ | High (wrong / missing detections) | me | P1.3 |
| F21 | `Date.parse` is lenient: "02/30/2026" becomes 2 March, "February 31, 2026" becomes 3 March. Receipt/CSV dates can silently shift. | Low (correctness) | me | P6 (property tests) |
| F22 | **FIXED in P1.7.** ~~A stale compiled `packages/service-catalog/src/services.js` (tracked, last changed 2026-06-14) SHADOWS `services.ts`.~~ `index.ts` exports from `"./services.js"`; a probe proved Vitest loads the `.js` file (a different module instance from `services.ts`). Data is identical today (probe: 0 differences over 509 entries, same exports), but any edit to `services.ts` is silently ignored wherever the `.js` wins, and coverage measured the wrong file (why `services.ts` showed 0 %). The `.js` may be load-bearing for Metro, which does not map `./x.js` to `x.ts`, so removal must be verified per consumer (Vitest, Next build, Metro bundle, API dist). | Medium (silent-edit trap) | me | P1.7 |
| F23 | **FIXED in P1.4.** ~~Apple/Google routes put the CLIENT-SENT email into the session record and our signed access token (`parsed.data.email ?? verified.email`). No consumer reads that claim today, so it was latent, but our own token vouched for an unverified address.~~ | Medium (latent) | me | P1.4 |
| F24 | **FIXED in P1.4.** ~~All three production-guard security tests were VACUOUS: with each guard removed they still passed. The OAuth tests set a client id, so the "unverified tokens" flag they claimed to test was never consulted; the demo test posted to a route that does not exist (`/auth/demo`), with no email and a 7-char password.~~ Lesson for P6: security tests must be mutation-tested first. | High (false assurance) | me | P1.4 / P6 |
| F25 | **305 of the 509 catalog entries (60 %) carry UNRESEARCHED data shown as fact:** a generated cancel link (`<website>/account`, not verified to exist), a default difficulty of "medium", and generic cancel steps. The app opens that link as "Open cancellation page" and shows the difficulty; the website publishes 305 cancel-guide pages stating "difficulty: medium". 204 entries are curated. Conflicts with the project's truthfulness rules (no invented facts). Needs a product decision on presentation, e.g. an "unrated / general steps, not yet verified" label and a link to the homepage instead of a guessed path, or noindex until curated. | High (honesty, public pages) | owner: decide the presentation | P3 (app) + P4 (web) |
| F26 | **FIXED — budget store in P1.8b, `setQuietHours` in P1.8d.** ~~Budget store loses updates.~~ Every action computes the next state from the `config` its render captured, so two actions before a re-render (a fast double-tap on "add envelope", or two edits in one event) start from the same stale state and the second write erases the first. The code's own comment fixes the duplicate-ID half of exactly this double-tap, not the lost write. `subscription-store` solved this with refs, but its `setQuietHours` has the same stale merge. | Medium (silent data loss) | me | P1.8b / P1.8d |
| F27 | **FIXED in P1.8f.** ~~"Cancel my Zeno account" promises it "erases everything from this device", but leaves connected Gmail OAuth tokens in the keychain (not revoked at Google), the app-lock PIN hash and lockout state, and quiet hours / home currency / cached FX rates / theme.** Gmail access tokens expire within about an hour, which limits the impact, but the promise is false.~~ The inventory in P1.8f also found the home-screen widget snapshot (it names the next renewal) and the stored push token. | High (privacy promise) | me | P1.8f |
| F28 | **FIXED in P1.8e.** ~~A keychain error wedges the lock screen.~~ The PIN check reads and writes SecureStore, and nothing between SecureStore and the overlay caught an error. A rejected `tryPin` skipped `setBusy(false)`, so the PIN field stayed read-only until the app restarted; the user could only sign out. It failed closed (still locked, not a bypass), plus an unhandled rejection. A throwing biometric attempt was also unhandled. | Medium (availability; fails closed) | me | P1.8e |
| F29 | Settings' "Connected inboxes" row is hard-coded to **"None connected"** (`app/settings.tsx`), even with Gmail inboxes connected. A false statement in the UI. | Low (truthfulness) | me | P4 (UI truthfulness) |
| F30 | **FIXED in P1.9a.** ~~A request from a disallowed CORS origin got HTTP **500**, not a quiet refusal.~~ The CORS origin callback passed an `Error`, so every such request, preflight included, went through the error handler as a server error: an error log plus a monitoring-webhook POST each time. Any web page could make visitors' browsers flood the logs and the alert channel. Verified by a probe: GET 500, preflight 500. | Medium (alert flooding; wrong status) | me | P1.9a |
| F31 | **FIXED in P1.9a.** ~~Upstream error text reached the client.~~ When the AI provider failed, the coach 502 carried up to 200 characters of the provider's raw error body, which can name the provider account (e.g. an organization id in a rate-limit message). Billing and Plaid 502s echoed their `error.message` too. The text now goes to the server log (`warn`), and the client gets a fixed message. The app reads only the status. | Medium (information disclosure) | me | P1.9a |
| F32 | **FIXED in P1.9a.** ~~The API claimed `serverStoresFinancialData: false`~~ on `/account`, `/capabilities`, `/business/summary` and both sync routes, but the server stores each household member's monthly spend (family) and whatever sync payload a client pushes (not end-to-end encrypted yet, per the capabilities comment). No client reads the flag, so it is removed rather than reworded. This is the machine-readable form of the banned "we never see your data". | Medium (truthfulness) | me | P1.9a |
| F33 | **FIXED in P1.9a.** ~~Every Fastify client error became a 500 plus an alert.~~ The error handler treated anything without the rate-limit envelope as a server error, so malformed JSON (should be 400), a body over the limit (413) and an unsupported content type (415) all returned **500 INTERNAL**, logged at error level and paged the webhook. Verified by a probe on all three. A retrying client would also retry these. 4xx errors now keep their status and a fixed message. | Medium (alert flooding; wrong status) | me | P1.9a |
| F34 | **FIXED in P1.10 (dev-only feature).** ~~Plaid transactions were normalized wrongly.~~ `Math.abs(amount)` turned every deposit and refund into a charge, although Plaid documents "positive values when money moves out of the account; negative values when money moves in". A paycheck could then look like a recurring subscription to the detector. Separately, `iso_currency_code ?? "USD"` labelled unofficial currencies (Plaid sets `iso_currency_code` to null for them) as USD, and `× 100` assumed every currency has 2 decimals (JPY has 0, KWD has 3). Now the sign is kept, unofficial currencies are skipped, and the exponent comes from ICU. The app only reads the count today, so nothing downstream breaks. | Low (dev-only today; data integrity once enabled) | me | P1.10 |
| F35 | **FIXED in P1.9d.** ~~`useReducedMotion` leaked an unhandled promise rejection~~ whenever React Native's accessibility module rejected `isReduceMotionEnabled()` (unavailable native module, or an iOS-side error). Only `.then()` was chained, so every animated component that mounted in that state leaked one. Now `.catch()` keeps the default (motion on), and the change listener still applies later toggles. | Low | me (agent) | P1.9d |
| F36 | **FIXED in P1.9d.** ~~The website's CSP added `'unsafe-eval'` for ANY non-production NODE_ENV.~~ `next build` / `next start` keep a pre-set NODE_ENV ("test" silently, anything else with a warning), so a real server started under e.g. `staging` shipped the relaxed dev policy. It is now keyed on `NODE_ENV === "development"` (the dev server only), so it fails closed. | Low (Vercel runs with production) | me (agent) | P1.9d |
| F37 | **FIXED in P1.9d.** ~~The public `/analytics` page, which shows SYNTHETIC sample KPIs, was on for any non-production NODE_ENV~~, for the same reason as F36. A staging server would have shown fake business metrics to real visitors, which breaks the invented-statistics rule. It is now on only for the dev server, or when `SHOW_PUBLIC_ANALYTICS` is exactly `"1"`. Look-alike values ("true", " 1", "01", "") stay off. | Low (truthfulness) | me (agent) | P1.9d |
| F38 | **FIXED in P1.9b.** ~~Account deletion accepted ANY 2xx as confirmed~~ (`deleteAccountOnServer`). Settings wipes the device and says the account is gone whenever this returns true, so a proxy page, captive portal or wrong base URL answering 200 counted as deleted. It now requires the API's own confirmation, `data.deleted === true` (`app.ts` returns exactly `ok({ deleted: true })`). | Medium (privacy promise) | me (agent) | P1.9b |
| F39 | **FIXED in P1.9b.** ~~A malformed 2xx on `getHousehold` deleted the user's household link.~~ A 2xx without a household mapped to `not_found`, and `family.tsx:66-69` then deletes the stored household pointer. The API never answers that way: `GET /family/:id` returns 404 for a missing household. It is now `server`, so the pointer survives. | Low–Medium | me (agent) | P1.9b |
| F40 | **FIXED in P1.9b.** ~~A notification tap spliced an unchecked id into the route.~~ `data.subscriptionId` (untrusted: a remote push to the device's Expo token can carry anything) went straight into `router.push`, including `../../settings`, `a/b` and `sub_1?next=/paywall`. Only `^[A-Za-z0-9_-]{1,128}$` is accepted now, which covers every id the app creates. | Low | me (agent) | P1.9b |
| F41 | **FIXED in P1.9b.** ~~`registerForPushNotifications` could reject, and its only caller (`_layout.tsx:207`) fires it with a bare `void`.~~ A token-fetch (network), keychain or permission-API failure became an unhandled rejection. It now always resolves to `{ ok, token } | { ok: false, reason }`. | Low | me (agent) | P1.9b |
| F42 | **FIXED in P1.9b.** ~~Reminders could be scheduled twice and the duplicates were never cleaned up.~~ The debounced data effect and the foreground listener each start a reconcile; two overlapping runs both read the queue before either scheduled, giving 12 pending notifications for 6 wanted. The diff also KEPT every copy whose key matched. Reconciles now run one at a time (a failed run does not block the next), and extra copies are cancelled. | Low–Medium (duplicate reminders) | me (agent) | P1.9b |
| F43 | **FIXED (P1.9 follow-up).** ~~A token refresh that fails for ANY reason signs the user out. `authStore.refreshToken()` (lines 298-301) clears the stored session in its catch, including when offline, on a timeout, or on a 502/503 while Render's free tier wakes up. Opening the app offline more than 15 minutes after the last token refresh therefore deletes the 30-day refresh token. Only a definitive server rejection (401) should end the session.~~ Now only a 401 or 400 ends it; offline, timeouts, 429 and 5xx keep the session and retry. | Medium (availability of sign-in) | me | P1.9 follow-up |
| F44 | **OPEN, verified by grep.** Banned "automatic discovery" copy: `app/open-banking.tsx:45` says "auto-discovers recurring charges" (it also claims "we only receive transactions", although the server holds the Plaid access token), and `app/(tabs)/discover.tsx:655` says "automatically discover what you pay for". Both violate the standing truthfulness rails. | Medium (truthfulness) | me | next slice after the P1.9 merges (exact wording shown to the owner) |
| F6 | My earlier session reports said "all gates green" from LOCAL runs only; GitHub CI had been red for 13 pushes (since `9eb4721`). From now on a gate counts as green only when the GitHub run for that commit is green. | Process | me | — (rule adopted) |

---

## Log

### Baseline (before P0) — main @ `f01ba09`, 2026-09-30

Measured, from `PRODUCTION_HARDENING_PLAN.md` §1:

| Gate | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors |
| vitest | 550 / 550 tests, 60 files |
| RN (jest-expo) | 22 / 22 tests, 2 files |
| Coverage (Tier 1) | lines 63.55 %, statements 62.86 %, functions 63.01 %, branches 55.95 % |
| Web build | OK, 509 guides |
| Audit gate | PASS |

Tooling on this machine: `gitleaks`, `semgrep`, `docker`, `go`, `gh` absent;
`winget`, `pip` 24.0, `npm` 11.12.1 (has `npm sbom`) present.

### P0.1 — Coverage scope + ignore guard — DONE 2026-09-30

**What was wrong (found by listing every file in the coverage summary):**
- Two generated Next.js files (`apps/web/.next/types/validator.ts`,
  `apps/web/.next/dev/types/validator.ts`, 23 lines each, 0 %) were counted in the
  Tier 1 scope. The scope therefore changed depending on whether `next dev` had run.
- `apps/mobile/components/subscriptions/ServiceAutocomplete.tsx` (a React Native UI
  component, 20 lines, 0 %) escaped the existing `apps/mobile/src/components/**`
  exclusion because it lives outside `src/`. It cannot run under vitest's node
  environment; it belongs to Tier 2 (tracked as F1).
- Nothing stopped anyone from reaching the floor by hiding code: zero ignore comments
  existed (`grep -rnE '(v8|istanbul|c8) ignore'` → none), but no rule governed them.

**What was done:**
- `vitest.config.ts`: excluded `**/.next/**` and `apps/mobile/components/**`, each with
  a comment giving the reason. Config files (`next.config.ts`, which builds the CSP and
  security headers, and `app.config.ts`) deliberately stay in scope.
- New `scripts/coverage-ignore-guard.test.ts`: every `v8|c8|istanbul|node:coverage
  ignore` comment in `apps/`, `packages/`, `scripts/` must read
  `ignore next|start -- <reason, 15+ chars>`; `ignore file` is banned outright
  (scope changes belong in the config). 6 self-tests prove the rule; 1 repo scan.

**Evidence:**
- Probe (temporary files, removed): under the installed `@vitest/coverage-v8`, an
  `ignore next -- reason` line and an `ignore start -- reason … stop` block both
  dropped out of the report, while an un-ignored control line was still reported
  uncovered (`Uncovered Line #s: 16`). So the required format is one the tool honours.
- Bite test: appending `/* v8 ignore next */` to `apps/web/lib/utils.ts` made the guard
  fail with `apps/web/lib/utils.ts:8 missing a reason`; file restored byte-identical
  (`git diff --quiet`).
- Full run: 61 files / 557 tests pass. Scope 90 → 87 files.

| Coverage | Before | After | Covered count |
|---|---:|---:|---|
| Lines | 63.55 % | 64.64 % | 2,501 → 2,501 (unchanged) |
| Statements | 62.86 % | 63.95 % | 2,656 → 2,656 |
| Functions | 63.01 % | 63.72 % | 564 → 564 |
| Branches | 55.95 % | 56.43 % | 1,569 → 1,569 |

The rise is **only** the removal of 66 uncovered lines that were never ours to test,
not new testing. The ratchet wrote the new floors into `vitest.config.ts`.

### P0.2 — Secret scan (gitleaks) — and the CI outage it uncovered — 2026-09-30

**Tool:** gitleaks 8.30.1, installed with `winget install --id Gitleaks.Gitleaks --scope user`
(official package: publisher Gitleaks LLC, MIT; winget verified the installer hash).

**Full-history scan (every commit, every ref):**
`gitleaks git --log-opts="--all" --redact` → 253 commits, 6.19 MB, **2 findings**, both
rule `generic-api-key`. Each was read at its commit, not judged from the rule name:

| Finding | What the line really is | Verdict |
|---|---|---|
| `apps/api/src/storage/pg.test.ts:5` @ `9bd56ae` | the constant `TEST_KEY`, whose value is the sequential hex 0011…ccddeeff repeated twice: a throwaway AES key for the encryption round-trip test | False positive |
| `apps/mobile/src/data/subscription-store.tsx:73` @ `788b30a` | the constant `quietHoursMetaKey`, whose value is the text notification.quietHours.v1: the name of a local SQLite row | False positive |

Both are allowlisted in the new `.gitleaksignore` by **exact fingerprint**
(commit:path:rule:line) with the reason, so any other line — or a new secret on
the same line later — still fails. Re-scan: **no leaks found**, exit 0. Also clean:
uncommitted changes (`--pre-commit`) and the untracked design-handoff folder
(`gitleaks dir`, 1.24 MB) in case it is ever committed by accident.

**Bite test:** a throwaway repo in the scratchpad with a randomly generated
GitHub-token-shaped string → `leaks found: 1`. Repo deleted.

**CI job:** new `secret-scan` job in `ci.yml` — full-history checkout
(`fetch-depth: 0`, `persist-credentials: false`), gitleaks 8.30.1 downloaded and
verified against the SHA-256 from the release's official checksums file
(`551f6fc8…70eb`; verified locally: `sha256sum --check` → OK, archive holds the
`gitleaks` binary at its root), then the same redacted full-history scan.

#### Incident found while checking CI: GitHub CI red on 13 consecutive pushes

Reading the GitHub API (the repo is public) showed CI **failing on every push
since `9eb4721` (2026-09-29)**, while my local runs said green. Step: Typecheck,
6 errors in `apps/api/src/app.ts`.

- **Root cause (code):** `9eb4721` moved fastify 5.8.5 → 5.12.5. In 5.12 a
  numeric `trustProxy` is fail-closed at runtime (`lib/request.js`: "Hop-count-only
  trust cannot validate the immediate peer. Fail closed") and the types dropped
  `number`. Our production default was the number `1`.
- **Root cause (why local was green):** `tsc -b` trusts `.tsbuildinfo` and does
  not notice upgraded `node_modules`; `tsc -b --force` reproduced CI's 6 errors
  exactly. Every installed package matched the lockfile (1,573 checked, 0 drift).
- **Security impact (reproduced by test before the fix):** in production mode
  `request.ip` was the load balancer (`10.20.30.40`) for every visitor, and a
  second client got `429` after the first exhausted the limit → finding F2.
- **Fix `064fc52`:** explicit hop function `(addr, hop) => hop < N` (the
  semantics production ran before the upgrade), strict `TRUST_PROXY_HOPS` parsing
  (digits only, max 5). No code reads `request.host`/`protocol`, so trusting the
  proxy hop opens no host-header path (grep-verified). `typecheck:refs` now uses
  `tsc -b --force` (+1.5 s). New `trust-proxy.test.ts`: 9 tests, 5 of which
  failed on the old code.
- **Second defect found by a fresh-clone run (`253016e`):** a Windows clone
  (`core.autocrlf=true`) checked `scripts/audit-gate.mjs` out with CRLF (66 CR
  bytes; git blob 0) and vitest could not import it — 10 tests silently dropped.
  Converting to LF → 10/10 pass. Fixed with `.gitattributes` (`* text=auto
  eol=lf`, binaries explicit); `git add --renormalize .` changed no stored content.
- **Fresh clone + `npm ci`, every CI step:** typecheck 0 · lint 0 · vitest
  566/566 · RN 22/22 · coverage floor PASS · web build OK · audit gate PASS.

**P0.2 closed:** GitHub run `36717148673` @ `b2e6ea3`: both jobs green (build, secret
scan). The first CI run of the job (`c8cdba2`) had failed on a finding in THIS log (it
quoted the flagged assignment); reproduced in a fresh GitHub clone with CI's exact
command, allowlisted by fingerprint, reworded. Rule adopted: scan after committing,
before pushing.

### P0.3 — Static analysis (semgrep + CodeQL) — 2026-09-30

**semgrep 1.178.0** (isolated venv in the scratchpad), packs: OWASP Top 10, Node,
JavaScript, TypeScript, React, Next.js, GitHub Actions. First run over `apps packages
scripts` (291 files): **2 findings**, both in `apps/api/src/storage/pg.ts`, both read in
full before judging:

| Finding | What it really is | Resolution |
|---|---|---|
| `bypass-tls-verification` pg.ts:48 | Postgres TLS with `rejectUnauthorized: false` for EVERY host | **Accepted for Render's internal URL, fixed everywhere else.** Render docs, verbatim: "Because these certificates are self-signed, internal connections do not support sslmode=verify-ca or sslmode=verify-full." `render.yaml` wires the internal connection string. New explicit `DATABASE_SSL` modes: `require` (default, Render internal), `verify` (full verification, optional `DATABASE_CA_CERT`), `disable` (local). A typo resolves to `verify` (never weaker) and is FATAL at production boot (`config.ts`). Inline `nosemgrep` with the reason; `--disable-nosem` proves the suppression is what hides it. |
| `gcm-no-tag-length` pg.ts:187 | AES-256-GCM decipher without `authTagLength`: Node accepts tags down to 4 bytes | **Fixed:** tag length pinned to 16 on cipher and decipher; envelopes shorter than iv+tag+1 rejected. Honest note: not exploitable before, because the fixed 16-byte slice mixed tag and ciphertext, so a short tag never authenticated. The spy test `pg-gcm.test.ts` asserts the option and FAILS when it is removed (bite-checked). |

- 4 semgrep parse errors are a semgrep JSX limitation (a literal `&` in page text:
  discover.tsx, legal/cookies, legal/privacy, legal/terms); partial parsing still scans
  the rest of each file. CodeQL parses them fully.
- Scanning `.` also covered the workflows: **4 × `github-actions-mutable-action-tag`**
  (`@v4` in ci.yml / release.yml). Fixed here so the gate goes live green: pinned to
  `actions/checkout@d23441a4… # v6.1.0` and `actions/setup-node@24997072… # v6.5.0`
  (SHAs from `git ls-remote`; manifests read at those commits: both `using: node24`).
- `.semgrepignore`: tests (they contain the patterns they assert against), design
  mockups, generated output. Final local scan: **0 results, 271 files, exit 0**.
- CI: `sast-semgrep` job (image `semgrep/semgrep:1.178.0@sha256:32e45996…`, `--error`).
- **CodeQL** (`.github/workflows/codeql.yml`): `github/codeql-action@2892aa5e… # v4.38.2`,
  `security-extended`, build-mode none, weekly schedule; least-privilege permissions.
  CodeQL never fails a job on findings by itself and the Security tab needs write
  access, so new `scripts/sarif-gate.mjs` prints each result as a run annotation and
  exits 1 on any; it refuses to pass when no SARIF exists. 11 tests.
- Tests added: TLS modes (5), GCM (3 + spy), config validation (3). Local gates:
  typecheck 0 · lint 0 · vitest 589/589 (64 files) · lines 64.97 %.

#### CodeQL's first run: 6 findings (gate failed the job, as designed)

GitHub run `36717800798` @ `a3fd4a7`: CI green (build, secret scan, semgrep); CodeQL's
analysis succeeded and **the SARIF gate failed on 6 results**, read from the run
annotations. Each was read in the code before judging:

| Rule | Where | What it really was | Fix |
|---|---|---|---|
| `js/log-injection` ×2 + `js/tainted-format-string` ×2 | pg.ts persist/delete failure logs | **Real, and a privacy leak.** The key went into the FIRST `console.error` argument. Keys are raw **email addresses** (`auth_legacy`), client-chosen sync record ids, and RevenueCat user ids from webhook payloads, so a DB outage would write emails into production logs; a client could also forge log lines with CR/LF or garble them with `%s`/`%o`. | Constant message + `{ op, namespace, keyRef }`, where `keyRef` = first 12 hex of SHA-256(key): correlatable, not the key. Same treatment for the clear-failure log. Test plants an email + newline + `%s %o %c` key: only the constant message and hash are logged. **Bite-checked:** the old log line fails both tests. |
| `js/user-controlled-bypass` | auth-guard.ts:60 | `token ? verifyAccessToken(token) : null`: whether verification RAN depended on the client. Not a bypass (both paths end in 401), but the pattern is the one real bypasses use. | Verify unconditionally: `verifyAccessToken(readBearer(h) ?? "")`; `verifyAccessToken("")` returns null at its first check (existing test). New `auth-guard.test.ts` (12 tests): 10 malformed header shapes incl. `alg: none` all return the SAME 401 body; an unknown route stays a 404. Confirmed from Fastify's source that the guard's public check uses the server-registered route pattern (`config.url = prefix + path`), and the 404 context has none. |
| `js/bad-tag-filter` | emailScanner.ts:536 | The `<script>` stripper missed `</script >`, `</SCRIPT` + newline + `>`, `</script foo>`. Output is only parsed (no WebView/innerHTML in the app), so no XSS, but surviving script text fed the amount parser. | End tags with whitespace/attributes; comments stripped first. Test: three hidden `$0.99` in a spaced-end-tag script no longer outvote the real `$15.49`. **Bite-checked:** 4 new tests fail on the old regexes. |

Tooling note learned the hard way: backslash escapes typed into a Bash command are
collapsed by the tool layer (`\n` arrived as a real newline; `\b` as a backspace), which
twice broke an edit and once silently voided a bite check. Scripts with backslashes are
now written with the file-write tool.

Local gates after the fixes: typecheck 0 · lint 0 · vitest 609/609 (65 files) · RN
22/22 · lines 65.11 % · semgrep 0 results over 273 files.

**P0.3 closed:** GitHub runs @ `ba5d7e3`: CI `36719137562` success (build, secret scan,
semgrep); CodeQL `36719137564` success (**0 findings**: the scanner itself accepts all
six fixes, including the hashed log reference).

### P0.4 — Workflow hygiene, Node runtime, deploy gating — 2026-09-30

- **Actions pinned by SHA** (done in P0.3 so the SAST gate went live green); semgrep's
  `github-actions` pack now enforces it on every run.
- **Least privilege:** `permissions: contents: read` at workflow level in `ci.yml` and
  `release.yml` (CodeQL already job-scoped: `contents: read`, `security-events: write`,
  `actions: read`). No job writes to the repo.
- **Concurrency:** `ci-${{ github.ref }}`; a newer push to the same PR cancels the stale
  run; `main` runs are never cancelled, so every main commit gets a full verdict.
- **Timeouts:** build 25 min, secret scan 10, semgrep 15, CodeQL 30, release 25 (a hung
  job can no longer burn the default 6 hours).
- **Audit gate BLOCKING in CI** (was report-only). Reason: `main` now deploys once checks
  pass, so a report-only audit would let a known high/critical ship. Exceptions stay
  reviewed + expiring in `.audit-allowlist.json`.
- **Node 24 everywhere (F5):** new `.node-version` = `24`; `engines` `>=24 <25` in the
  root and `apps/api` (bounded, per Render's docs); CI, release and CodeQL read
  `node-version-file: .node-version`. The lockfile change is metadata only
  (`npm install --package-lock-only`: two `engines` fields, no package versions).
- **Deploy gating (F4):** `render.yaml` `autoDeploy: true` → `autoDeployTrigger:
  checksPass` (Render blueprint spec: "Trigger a deploy only if the linked branch's CI
  checks pass"); build `npm install` → `npm ci` (exact lockfile; same dev-dependency
  behaviour, and the build already needs `tsc` from dev dependencies).
- semgrep over the edited workflows + `render.yaml` (github-actions + OWASP packs): 0.

**P0.4 closed:** GitHub @ `cb7cc53`: CI `36719796423` success (build, secret scan,
semgrep) and CodeQL `36719796450` success. The build job's annotations no longer carry
GitHub's "Node.js 20 is deprecated" warning (Node 24 from `.node-version` took effect).
Fresh-clone + `npm ci` on Node 24 before the push: every CI step exit 0.

### P0.5 — Dependabot + SBOM — 2026-09-30

- **`.github/dependabot.yml`** (npm at the root, which covers every workspace through the
  single lockfile; github-actions). Design decisions, each from GitHub's options
  reference rather than memory:
  - **No `ignore` rules at all:** "the `ignore` option applies to both version and
    security updates", so ignoring the Expo packages would also block their security
    fixes. Instead the 34 Expo/React-Native-coupled packages are **grouped**
    (`expo-sdk` minor+patch, `expo-sdk-major`), so an SDK move arrives as ONE PR, which
    CI verifies and a human checks with `npx expo install --check`.
  - **`cooldown` 7 days** (14 for majors) on version updates only; security updates are
    never delayed. semgrep's `dependabot-missing-cooldown` rule (OWASP pack) rejected my
    first draft's 5 days; raised to 7.
  - Validated against the SchemaStore dependabot-2.0 JSON schema: 0 errors. Whether
    GitHub accepts it is confirmed only when Dependabot runs (first scheduled Monday).
- **SBOM:** `npm sbom --sbom-format cyclonedx` (CycloneDX 1.5) generated on the runner
  and uploaded as an artifact in CI (30 days) and in the release gate (90 days).
  **Found while building it:** `npm sbom --omit dev` silently DROPS shipped packages
  here: `expo` and `react-native` are absent, though `npm ls expo --omit dev` shows
  them in the production tree through `@zeno/mobile`. The full SBOM (1,268 components
  locally) includes them and marks dev-only packages with
  `cdx:npm:package:development=true`; the 126 lockfile names it lacks locally are other
  platforms' optional binaries (`@esbuild/darwin-*`, …) not installed on Windows. So
  the full SBOM is the complete, honest inventory.
- `sbom.cdx.json` added to `.gitignore`.
- Runner OS pinned to `ubuntu-24.04` in all jobs: GitHub's run notice says
  `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19; an image change under the build
  should be a deliberate upgrade, not a surprise red CI.

**P0.5 closed:** GitHub @ `dad71a2`: CI `36720317959` success, every job on
`ubuntu-24.04` (label confirms the pin); CodeQL `36720317989` success; artifact
`sbom-cyclonedx` uploaded (236,973 bytes, expires 2026-10-30). **Dependabot accepted
the config and ran at once**, opening two grouped PRs:

- [Pratikkadam00/zeno#1](https://github.com/Pratikkadam00/zeno/pull/1): actions
  group, `actions/checkout` v6.1.0 → v7.0.1 and `actions/setup-node` v6.5.0 → v7.0.0.
  Confirms Dependabot rewrites SHA pins AND their `# vX` comments. Both are MAJOR
  bumps: review the changelogs before merging (not merged).
- [Pratikkadam00/zeno#2](https://github.com/Pratikkadam00/zeno/pull/2): the Expo
  group, 9 updates, including **react-native 0.85.3 → 0.87.1** labelled "minor".
  React Native minors are breaking and Expo SDK 56 pins 0.85, so merging it would
  break the app. **Config flaw found by the first real run; fixed:** the Expo/RN
  group is now `expo-sdk-patch` (patch only, routine) and `expo-sdk-upgrade` (minor +
  major together: an SDK upgrade done deliberately with `npx expo install --fix`,
  never merged as-is). Schema 0 errors, semgrep 0. Do not merge #2.

### P0 gate — DONE 2026-09-30 (P0.6 owner-blocked)

| Gate | Local | GitHub |
|---|---|---|
| Typecheck (forced), lint | 0 / 0 | green |
| vitest | 609 / 609 (65 files) | green |
| RN (jest) | 22 / 22 | green |
| Coverage floor | lines 65.11 % | green |
| Web build (509 guides) | OK | green |
| Audit gate (now blocking) | PASS | green |
| Secret scan, full history | 0 leaks, 3 reviewed fingerprints | green |
| semgrep (7 packs) | 0 results, 273 files | green |
| CodeQL security-extended | — | green, 0 findings |
| SBOM | 1,268 components | artifact uploaded |

Found and fixed during P0: CI red for 13 pushes (F6); per-client rate limiting
broken in production by a dependency bump (F2); Postgres TLS unverified for every
host; unpinned GCM tag length; PII and log injection in storage logs; a bypass-shaped
auth check; an incomplete script-tag filter; Windows CRLF dropping a test suite;
Node 20 EOL / unbounded production Node; deploys not waiting for CI (F4); Dependabot
grouping that would have shipped a breaking React Native bump.

Found and queued for P1 (not yet fixed): magic-link tokens in production request
logs (F9, verified by probe); Gmail connect broken on every device (F13); OIDC nonce
and implicit-flow questions (F10, F11); Gmail token handling (F12).

### P0.6 — Branch protection — OWNER ACTION (verified state + exact steps)

Verified 2026-09-30 via `GET /repos/Pratikkadam00/zeno/branches/main`: **`protected:
false`**, required checks `[]` (F7). I will not change repository security settings
with the credentials on this machine; this is yours. Steps (github.com → the repo):

1. **Settings → Rules → Rulesets → New ruleset → New branch ruleset.** Name `main`,
   Enforcement **Active**, Target branches → **Include default branch**.
2. Tick **Restrict deletions** and **Block force pushes** (no workflow change).
3. Tick **Require status checks to pass**, add: `typecheck & test`,
   `secret scan (gitleaks, full history)`, `SAST (semgrep, zero findings)`,
   `CodeQL (javascript-typescript, security-extended)`. Note: this makes direct pushes
   to `main` impossible (checks run after a push), so work moves to pull requests,
   merged only when green. Recommended; your call.
4. **Settings → Code security:** enable **Secret scanning → Push protection**,
   **Dependabot alerts**, **Dependabot security updates** (F8).

When you have done it, tell me and I will re-read the API to confirm `protected: true`.

---

## P1 — Tier 1 logic to 100 %

Baseline at P1 start (`c23e336`): lines 65.11 %, statements 64.34 %, functions
63.89 %, branches 57.15 % over 87 files; 23 files at 0 %.

### P1.1 — API process entry (`server.ts`) + F9 — 2026-09-30

**Problem:** `server.ts` (0 % covered) did all its work at import time (config check,
build, storage, timers, signal handlers, listen), so nothing in it could be tested
without a real process and port. Reading it for coverage surfaced F9.

**F9, fixed:** the production logger's request serializer logged `req.url` WITH the
query string. A probe with the exact production config logged
`"url":"/api/v1/auth/verify?token=PROBE-SECRET-MAGIC-TOKEN-123"` on the "incoming
request" line. New `server-options.ts`: `serializeRequest` mirrors Fastify 5's default
`req` serializer field for field (read from `node_modules/fastify/lib/logger-pino.js`)
except that `url` is the path only; custom serializers override the defaults per
`lib/logger-factory.js:126`. The redaction list is unchanged and now lives beside it.

**Restructure (behaviour unchanged):** `start.ts` holds the lifecycle with injected
dependencies (process, timers, storage, app builder, console); `server.ts` is a
3-line entry point (`dotenv/config` + `startServer()`).

**Tests (30 new):**
- `server-options.test.ts` (8): `pathOnly` edge cases; serializer fields; logger levels
  (info in production, debug elsewhere, `LOG_LEVEL` wins); redaction list; and the
  **end-to-end F9 regression**: the real app with the production logger config, a
  GET with `?token=`, and a POST carrying a query secret, a bearer header and a body
  token. None of the four secrets appear in any log line; the path does.
- `start.test.ts` (21): boot order; readiness line both ways; single-instance warning
  (on / acknowledged / off); sweeper interval + unref; SIGTERM and SIGINT graceful
  shutdown (close → storage → clear backstop → exit 0, second signal ignored);
  failing close → exit 1; hung drain → hard-exit backstop → exit 1; unhandled
  rejection logged without exit; uncaught exception → graceful shutdown; listen
  failure → exit 1; `listenAddress` precedence; real `defaultDeps` wiring.
- `server.test.ts` (1): the entry point starts the server exactly once.

**Bite check:** with the new serializer removed, the F9 tests fail (3 of 8); restored,
8/8 pass.

**Coverage:** `server.ts`, `start.ts`, `server-options.ts` all **100 %** lines,
branches, functions, statements. Tier 1 overall: lines 65.11 % → 66.28 %.

Gates: typecheck 0 (forced) · lint 0 · vitest 631/631 (68 files) · semgrep 0 over
275 files.

### P1.2 — Mobile security modules + F13 — 2026-09-30

Measured gaps first (per-line JSON coverage): `secure-store.ts` native path, legacy
theme mappings, account removal, index parsing; `lock-store.ts` lockNow, enableWithPin,
every failure/lockout path, biometrics; `app-lock.ts` 4 branches.

**F13, fixed:** SecureStore rejects any key outside `/^[\w.-]+$/` in get/set/delete
(expo-secure-store 56.0.4 `build/SecureStore.js`, `ensureValidKey`), and the Gmail
token key embedded the raw address (`@`, often `+`), so connecting Gmail threw on every
phone. The old tests passed because they all mock `Platform.OS = "web"` with a lenient
fake. New `secureStoreKeySegment`: `[A-Za-z0-9.-]` pass through; every other UTF-16
unit, including `_` itself, becomes `_` + 4 hex, which is injective and always valid.
No migration: no key of the old form could ever have been written on a device.

**Other changes:**
- `app-lock.ts`: the four-field check now yields a typed tuple, which removes three
  unreachable `?? ""` fallbacks instead of ignoring them.
- `secure-store.ts`: `deleteItem` needs no sensitivity flag. On web it removes the key
  from both stores. The old non-sensitive delete branch had no caller.

**Tests (+27):**
- New `secure-store.native.test.ts` (12). The fake enforces the real library's key
  rule, copied from its source, and a test proves the fake rejects exactly what the
  library rejects. Covers: key encoding (2,000 generated inputs, always valid, zero
  collisions, plus hand-picked near-collisions); the F13 regression on iOS and Android
  (connect, list, read, remove, re-save, with `+` and mixed case); device-only storage
  options and no biometric prompt; corrupt, non-array and mixed indexes; the database
  key created once; PIN hash and lock state round trips; theme mapping on native.
- Web suite (+2): no `window` at all; delete clears both stores.
- `app-lock` (+3): every malformed v3 field; the wrong field count; a wrong PIN against
  legacy v1 (not upgraded).
- `lock-store` (+10): lockNow; enableWithPin; wrong PIN with remaining count and
  singular; the 10th failure starts a persisted 15-minute lockout; the correct PIN is
  refused, unchecked, during a lockout; after expiry a wrong PIN re-locks at once and
  the right PIN clears everything; hydrate restores a lockout; biometrics refused during
  a lockout (no prompt), failure keeps the lock, success resets.

**Bite check (F13):** with the raw-address key restored, 4 of the new tests fail
("Invalid key provided to SecureStore"). With the fix, 12/12 pass.

**Coverage:** `app-lock.ts`, `lock-store.ts`, `secure-store.ts`: **0 uncovered lines,
branches or functions.** Tier 1 lines 66.28 % → 67.22 %.

Gates: typecheck 0 · lint 0 · vitest 658/658 (69 files) · RN 22/22 · semgrep 0.
New findings recorded while reading: F14 (clock-based lockout), F15 (paid features
must check the plan on the server), F16 (SQLCipher configured but not proven on a
device).

### P1.3 — Discovery (Gmail, CSV, receipts): untrusted input — 2026-09-30

Scope grew from `emailScanner.ts` to the whole discovery folder plus the shared receipt
module: every file there parses untrusted input (emails, bank exports).

**Measured start:** emailScanner 48 % (the whole Gmail network flow untested),
csvParser with ~22 uncovered lines, helpers 4 branches, shared receipts 6.

**Fixes:**
- **F12 (token handling):** revocation now `POST https://oauth2.googleapis.com/revoke`
  with the token in a form-encoded BODY (Google's documented endpoint; RFC 7009 §2.1),
  not a GET with `?token=` on the legacy endpoint. The fallback account label is random
  (`inbox-<uuid8>`), not the token's first 8 characters.
- **F12 (sender spoofing) ACCEPTED as low, with evidence:** detections are opt-in (a
  checkbox per result; only selected ones are added, `discover.tsx`), and the cancel
  link ever opened comes from OUR catalog (`service.cancellationUrl`, `cancel/[id].tsx`),
  never from the email. A forged "netflix.com" mail can show a misleading suggestion, not
  plant a link. DKIM/DMARC parsing deferred: the header format can't be verified against
  real Gmail here.
- **F17:** `extractStoreAppName` (packages/shared): name words separated by spaces/tabs
  only (a name no longer crosses lines), and a stray leading "store" is noise. Found by
  PROBING the real functions rather than assuming.
- **F20:** CSV merchant cleanup strips only a trailing US state/territory code (explicit
  list) and/or US/USA. "APPLE MUSIC" now matches the catalog's `apple-music`.
- **Dead code removed, not ignored:** `csvParser` credit block (null on both paths) and
  an unreachable `amount <= 0`; `emailScanner` three `?? ""`/digit checks that could never
  fire; a redundant id lookup (id === slug for all 509 entries, now PINNED by a catalog
  invariant test); an unreachable re-check in `exchangeAuthorizationCode` (typed to the
  success variant instead); the helpers median `?? 0` after an empty-list guard.

**My own mistake, caught:** adding `expo-crypto` to the scanner broke the OLD test file
(it didn't mock that module; the real one pulls in React Native, which Flow-parse fails).
My check had filtered for `Tests ` and hid the "1 failed" line on `Test Files`. Fixed
with the mock; every check now shows `Test Files`.

**Tests (+95):** `emailScanner.flow.test.ts` (28; fake Gmail API: connect incl. PKCE and
no-code error, registry, paging + 400 cap, sender/subject gate, per-message failure
isolation, id encoding, every MIME body shape, UTF-8/Latin-1/invalid base64, date
fallbacks, progress across inboxes, revocation per RFC 7009, revoke-failure still forgets
locally); `emailScanner.parse.test.ts` (21); `csvParser.more.test.ts` (25; every bank
format, every row-rejection reason, all four cadences, merchant cleanup, dedupe both
ways, ordering); shared receipts (+11); helpers (+2); catalog invariant (+1).

**Bite checks:** F12 → 2 tests fail on the old code; F17 → 2 fail; F20 → 6 fail. All pass
with the fixes.

**Coverage:** emailScanner, csvParser, discovery-helpers, shared email-receipts: **0
uncovered lines, branches or functions.** Tier 1 lines 67.22 % → **71.20 %**.

Gates: typecheck 0 · lint 0 · vitest 746/746 (72 files) · RN 22/22 · semgrep 0.

### P1.4 — Auth: mobile token lifecycle + the API's social sign-in — 2026-09-30

**Verdicts on the questions raised in P1.** Each server function was read in full
(`routes/auth.ts` verifyRemoteJwt, both social routes, issueSession, every reader of the
email claim) and each library behaviour was taken from its source: expo passes `nonce`
straight to Apple's request (`request.nonce = options.nonce`); `digestStringAsync`
defaults to hex.

- **F10 confirmed, then fixed.** No nonce was verified anywhere: the app generated one
  for Google but never sent it to the API, Apple requested none, and the verifier had no
  nonce check. A leaked or intercepted ID token (plausible given F11) meant a session.
  Fix: the app makes a random 32-hex raw nonce and gives the provider only
  `sha256(raw)` (lowercase hex, lowercased explicitly). The API requires the raw value
  (16–256 chars, Apple always, Google whenever an idToken is sent). The verifier requires
  `payload.nonce === sha256(raw)`, compared as fixed-length digests with
  `timingSafeEqual`. An interceptor has the token but not the raw nonce.
- **F23 found and fixed:** the session email came from the request body before the
  verified token. Only `verified.email` is used now, with a synthetic address when the
  token has none. The app no longer sends an email for Apple, or the Google access token
  and server code for Google (least privilege: our API never calls Google as the user).
- **F24 found and fixed:** all three production-guard tests passed with their guards
  REMOVED (proved by bite checks). The OAuth tests set an audience, so the flag was never
  reached; the demo test used a nonexistent route and an invalid body. Rewritten: no
  audience configured, schema-valid nonces, the real `/auth/demo-login` route, plus a
  positive control proving the request succeeds outside production. Each now FAILS with
  its guard removed.
- **F11 stays open** (P3): Google no longer supports custom URI schemes on Android; a
  migration to the native SDK needs the real client IDs.

**Tests (+66):**
- New `auth-social.test.ts` (30): real RS256 tokens from a local RSA key via a mocked
  JWKS; the first suite ever to verify a correctly signed social token. Covers: valid
  Apple/Google with the token's email winning over a hostile body email; synthetic email;
  missing nonce (400, no JWKS fetch); replayed token; no nonce claim; raw instead of hash;
  13 malformed/forged tokens (expired, no exp/sub/iss/aud, wrong iss/aud, other key,
  `alg: none`, HS256, no kid, 2 parts, tampered payload); audience arrays; no client id;
  both Google issuers; JWKS caching, rotation refetch-once, outage fails closed.
- New `authStore.flows.test.ts` (33): every store flow, the nonce split (with an
  UPPERCASE digest mock to prove the lowercasing), de-duplicated concurrent refresh,
  logout that still clears when revocation fails, envelope errors, and the web
  in-memory path.
- `auth-prod-guards.test.ts`: 3 rewritten, +1 positive control.

**Bite checks:** nonce comparison disabled → 4 server tests fail; body email restored → 2
fail; production guards disabled → each rewritten guard test fails; raw nonce not sent by
the app → 2 app tests fail.

**Coverage:** `authStore.ts` **0 uncovered lines, branches, functions** (was 51 %).
Tier 1 lines 71.20 % → **74.82 %**.

Gates: typecheck 0 · lint 0 · vitest 810/810 (74 files) · RN 22/22 · semgrep 0.

### P1.5 — Local database + repository on a real SQLite engine — 2026-09-30

**Approach:** mocks would accept any SQL string, so these tests run the app's real
migrations and queries on Node 24's built-in SQLite (`node:sqlite`) through a small
adapter exposing the four expo-sqlite methods the code calls
(`sqlite-adapter.testutil.ts`, excluded from coverage as test infrastructure).
Stated plainly: this engine has no SQLCipher, so `PRAGMA key` is ignored here. The
tests prove the key statement is ISSUED correctly; on-device proof of encryption remains
F16 (P3).

**Tests (+15):**
- `database.real.test.ts` (8): the full v1 schema from an empty FILE (all 8 tables,
  `user_version = 1`, `journal_mode = wal`); idempotent re-run keeps data; the upgrade
  of a pre-lifecycle install (no `cancellation_*` columns) adds them and keeps its rows;
  the lost race of two concurrent migrations (a duplicate-column ALTER) is caught; a
  missing `user_version` row counts as 0; `app_meta` read-missing / write / overwrite;
  hostile keys and values stay data (bound parameters); `PRAGMA key` is the FIRST
  statement, with the secure-store key and every `'` doubled.
- `subscription-repository.test.ts` (7): exact round trip, minimal and with every
  optional field (absent optionals come back `undefined`, not `null`); an upsert never
  rewrites `created_at` or `device_id`; ordering by renewal date then name, with undated
  rows FIRST (SQLite sorts NULL first ascending; whether the UI relies on this order is
  checked in P1.8); soft delete stamps `deleted_at` / `updated_at` and bumps the version;
  "Delete all data" hard-deletes everything, soft-deleted rows included; hostile text
  stays data.
- The typecheck caught an invalid `valueRating: "worth_it"` hidden behind a cast in my
  first draft; the cast is gone.

**Coverage:** `database.ts` and `subscription-repository.ts`: **0 uncovered lines,
branches or functions** (were 59 % and 0 %). Tier 1 lines 74.82 % → **75.28 %**.

Gates: typecheck 0 · lint 0 · vitest 825/825 (76 files) · RN 22/22 · semgrep 0.

### P1.6 — Billing (RevenueCat) — 2026-09-30

Plan mapping (`getPlanFromCustomerInfo`) was already well tested; the untested part
was the SDK lifecycle, the failure modes, and the client/server trust decision.

**Tests (+23, `revenueCat.flows.test.ts`, a fresh module per test because
`initRevenueCat` caches its state):** never configured on web or on a platform
without a key (incl. macOS); configured ONCE under concurrent and repeated calls; the
per-platform key, with env winning over app config; no double configure when the native
SDK already is; a throwing `isConfigured` treated as "not configured"; identify with the
Zeno account id (what the server verifies against), skipping an empty id and an
unconfigured SDK, swallowing failures; reset only when configured; offerings: empty
when unconfigured, package lookup by product id with the offering's own
monthly/annual/lifetime as fallbacks, `zeno_pro` / current / `zeno_family` lookups;
price fallback; family purchase by package (+ funnel event); annual pro by store product
when no package exists; the default period; a missing store product is a clear error
with NO funnel event; the setup hint when unconfigured; restore.

**F15, the client/server rule, now pinned:** a client that CLAIMS pro is overridden by
the server's "free"; the client view is used only when server billing is unconfigured,
returns nothing, or is unreachable. Whether paid SERVER features check the plan
server-side is still P2's authorization matrix.

**Coverage:** `revenueCat.ts` **0 uncovered lines, branches, functions** (was 55 %).
Tier 1 lines 75.28 % → **76.43 %**.

Gates: typecheck 0 · lint 0 · vitest 848/848 (77 files) · semgrep 0.

### P1.7 — Service catalog + F22 — 2026-09-30

**F22, proved and fixed per consumer.** Deleting the stale `src/services.js` alone made
the **Next.js production build FAIL** ("Module not found: Can't resolve './services.js'"):
Turbopack resolves `@zeno/service-catalog` from SOURCE (tsconfig paths) and does not
map `./x.js` to `x.ts`. So the website (and, by the same resolution, the app) had been
SHIPPING the hand-regenerated `.js`, not `services.ts`: a catalog edit reached users only
if someone also rebuilt that file. Fix: `index.ts` exports `"./services"`
(extensionless), the pattern `packages/shared` already uses, and the stale file is
deleted. Verified in every consumer:
- Vitest: 848/848 pass, and coverage now measures `services.ts` itself.
- Forced typecheck: 0 errors. Next.js production build: compiles.
- API, exactly as Render runs it (`tsx` + compiled `dist/`): 509 entries load and
  `GET /api/v1/services/netflix` returns 200.
- Metro: a real Android production bundle (`expo export`, 12 MB Hermes, 72 s). The
  bundle contains the catalog's Netflix cancel steps, a product id and a catalog entry.

**Data finding F25** (above): 305 of 509 entries are generated, not researched.

**Data fix:** Things Cloud (a free sync service) had a default monthly price of `0`,
which the Add form prefilled as a "$0.00" subscription. The new invariant caught it on its
first run. It is now `null` (no known subscription price). Whether a free service belongs
in the catalog is left to the owner, since removing it changes the published 509 count.

**Dead code removed:** a `?? logoColors[0]` after a modulo index; a redundant
`query.length < 1`; an unreachable `wholeText = ""` default (a sound tuple cast instead).
The row parsers and `uniqueBySlug` are exported (`@internal`) so their guards are
testable.

**Tests (+24, `services.test.ts`):**
- Invariants over all 509 entries: count; kebab slugs, unique, equal to ids; https-only
  links with real hostnames and no credentials; valid difficulty and category enums;
  prices null or positive with at most 2 decimals; non-empty guides; palette colours;
  every record converts; every "popular" id exists.
- Parsers: malformed curated and expansion rows throw; price parsing; guide overrides;
  blank lines skipped; first-wins de-duplication.
- Search: empty query and limits; exact over prefix over substring over fuzzy;
  case-insensitive; no match; default limits 15 and 10; equal scores sorted
  alphabetically.
- Lookups, category mapping, record optional fields (support contact parts, free-trial
  days 0), exact minor units, and leading-dot and negative prices.

**My own mistake, caught:** my first tie-break test ended in `|| true`, so it could
never fail: the same hollowness as F24. Rewritten as a real check, it fails when the
tie-break is reversed. A repo-wide scan found no other always-true assertion.

**Coverage:** `services.ts` and `index.ts` **0 uncovered lines, branches or functions**
(`services.ts` was 0 %, because the tests had been running the stale `.js`). Tier 1 lines
76.43 % → **78.98 %**.

Gates: typecheck 0 · lint 0 · vitest 872/872 (78 files) · RN 22/22 · web build OK ·
semgrep 0.

#### CI incident, 2026-09-30 (P1.7 push `ad84b2f`): secret-scan job red — a download, not a leak

CI `36729421285`: build and semgrep green, **secret scan failed after 6 s** with
annotation "Process completed with exit code 22". Exit 22 is curl's `-f` HTTP-error code:
the gitleaks release download from GitHub failed transiently. Not a leak: a fresh clone
from GitHub WITH all 12 Dependabot branches, scanned with CI's exact command, found 0.
Fix: the download now uses `curl --retry 3 --retry-delay 5 --retry-all-errors` (the
checksum check still runs on whatever arrives), so a transient CDN error no longer
reddens CI.

**CI fix verified:** GitHub @ `d670bc4`: CI `36729975314` and CodeQL `36729975425` both
success, including the secret-scan job with the retrying download.

### P1.8a + P1.8b — jest coverage floor + budget store (F26) — 2026-09-30

**P1.8a, the floor:** `apps/mobile/jest.config.js` now collects coverage for the four
React files only this runner can render (`collectCoverageFrom`), with a per-file 100 %
floor in `coverageThreshold` as each file's tests land (budget-store first). New scripts:
`test:rn:coverage` (mobile and root); both workflows run it instead of `test:rn`. The four
files are EXCLUDED from Vitest's Tier 1 scope with the reason stated in
`vitest.config.ts`: moved, not dropped. **Bite check:** a partial run (`-t hydration`)
fails with 4 threshold messages and exit 1; the full run exits 0.

Honesty note on the numbers: Vitest's line coverage jumped 78.98 % → 86.83 %, but its
covered count is UNCHANGED (3,100 lines). The rise is the move of 355 mostly-untested
lines into jest's scope, where they are measured separately. Right now that is
budget-store 100 %, theme-provider 63 %, subscription-store 0 %, LockOverlay 0 %.

**P1.8b, the budget store and F26:** a `configRef` mirror, the same pattern
`subscription-store` already uses. Every action derives its next state from the ref, so
two actions in one event both land. Tests (`budget-store.rntest.tsx`, 14, through the
real hook and provider):
- Hydration: the stored config merged over defaults; nothing stored; corrupt JSON warns
  and keeps defaults; database down means in-memory only and nothing written; unmounting
  before the open resolves, or while the stored value is read, applies nothing.
- Every action and exactly what it persists (cap, income, envelopes add/log/remove,
  category caps replace-or-append).
- **F26: four actions in ONE `act()` all land.**
- `reset` erases everything, including the income figure (sensitive), and persists it.
- A failed write keeps state and warns; the hook throws outside its provider; on web
  there is no database (isolated module registry with `Platform.OS = "web"`, using the
  renderer's `pure` entry).

**Bite check (F26):** with the old `budget-store.tsx` swapped back in, the F26 test fails
(1 of 14); restored, 14/14.

Gates: typecheck 0 · lint 0 · vitest 872/872 · jest 36/36 with the floor met · semgrep 0.

### P1.8c — Theme provider — 2026-09-30

`theme-provider.rntest.tsx` (9 tests): defaults; a current id plus the dark scheme
restored; each legacy id (`pulse`/`clarity`/`command`) migrated AND rewritten in storage;
unknown ids and schemes ignored (not rewritten); unreadable storage falls back to
defaults; `setScheme`, `toggleScheme` both ways, `setThemeId` (stored; the look is
unchanged by design), each persisted; the guard outside the provider.

A test-isolation bug of my own: a permanent `mockRejectedValue` on AsyncStorage's
`getItem` (already a `jest.fn` in the package's mock) leaked into later tests, and
`restoreAllMocks` cannot undo it. Now it rejects exactly the provider's two reads.

`theme-provider.tsx`: **100 %** on every metric (was 63 %), with its per-file floor
added. jest 45/45, both floors met.

### P1.8d — Subscription store — 2026-09-30

`subscription-store.rntest.tsx` (31 tests) drives the real provider and hook. The fakes
sit at the module boundary only: an in-memory `app_meta` map and row map in place of
SQLite, plus FX fetch, notifications and `randomUUID`. The hydration normalizers,
mutation helpers, shared aggregates and the catalog are all the real code.

- **Hydration:** first launch seeds the 5 demo rows once and marks the DB seeded; a
  seeded DB loads as-is; quiet hours, home currency, AI consent, cached rates and
  notification settings are all restored; a DB that won't open falls back to in-memory
  seed data and still hydrates; unmounting mid-open, mid-read, or before a late failure
  applies nothing.
- **FX:** fetch and persist when there is no cache; a fresh cache means no fetch; a stale
  cache refetches; a null fetch changes nothing; a failed persist only warns.
- **Every mutation:** add (defaults, settings, price history), two adds in one event,
  update (each field, version bump, a price point only on a real change), unknown id,
  delete, the four status transitions, `requestCancellation` (the next renewal, or
  now + 34 days without one), and `runCancellationVerification` across 7 cases
  (charged → attention, clean → cancelled, a charge before the request → cancelled, no
  request date → attention, not due, no verify-by, not pending).
- **Settings, wipe and failures:** notification settings, quiet hours, currency and
  consent persist. `clearAllData` wipes rows and meta, resets consent and cancels
  notifications, and carries on past each failing step. Every failed write only warns.
  With no database, everything works in memory and writes nothing.
- **Derived values and guards:** native vs converted monthly totals, and an unknown rate
  is skipped (never a guessed number); `upcoming` (active, dated, not trials, soonest
  first, max 5); an overdue renewal rolls forward for display but not on disk;
  suggestions; the web path; the hook guard.

**F26, the second half:** `setQuietHours` now merges into a `quietHoursRef` mirror (set
at hydration too) instead of the render-captured value.
**Bite check:** with the old store swapped back in, exactly one test fails, the F26
test (30/31); restored, 31/31.

Two small refactors, found because 100 % branch coverage flagged them:
- **The price-history rule moved into a pure helper,** `withPriceChange` in
  `subscription-mutations.ts`, with 3 Vitest tests. Its "no history yet → current price
  as the baseline" fallback can't be reached through the store (every path that creates
  a subscription seeds its history), but it is the helper's real contract, so it is now
  tested directly instead of left as an untestable branch.
- **The `upcoming` sort's dead `?? ""` became a type-guarded filter.**

My own test bug: `mounted()` did not reset the fake rows between two mounts in one
test, so a 3100 vs 3000 total mismatch was leftover data, not a store bug.

`subscription-store.tsx`: **100 %** on every metric (was 0 % under jest), with its
per-file floor added. Gates: typecheck 0 · lint 0 · vitest 78 files / 875 tests (ratchet
86.05 / 79.57 / 87.5 / 86.84) · jest 5 suites / 76 tests, all 3 floors met ·
semgrep 0 findings.

### P1.8e — Lock screen overlay — 2026-09-30

`LockOverlay.rntest.tsx` (17 tests) renders the real overlay. The lock store is a real
zustand store with test-controlled state, and the PIN and biometric checks are stubs (the
checks themselves are covered in `lock-store.test.ts` and the app-lock tests).

- **Before the store is ready:** a neutral cover only: no PIN prompt, no content, no
  biometric attempt. It switches to the prompt once ready, and only then attempts
  biometrics.
- **Automatic biometrics:** never without hardware (no button, no AppState listener).
  While active, exactly once, and not again on a later return to active. Mounted in the
  background, it waits and attempts once on becoming active, and unmount removes the
  listener. The button retries on demand.
- **PIN entry:** digits only, capped at 8, and never rendered in clear (only dots). It
  auto-submits at 4. A wrong PIN shows the store's message, or falls back to "Incorrect
  PIN.", and clears the entry; the next keystroke clears the error. While a check is in
  flight the field is read-only, and a second submit is ignored, both through the field
  and by calling the handler directly. The done key submits 4+ digits and ignores fewer.
  The field opts out of password autofill and suggestions. Tapping the code boxes
  focuses the hidden field.
- **Sign out** logs out.

**F28 (new, fixed):** `submit` is now try/catch/finally, so a throwing check leaves the
app still locked, shows "Couldn't check your PIN. Try again.", clears the entry, and
re-enables the field. No attempt is counted, since none was checked. Both biometric
calls catch too, with "Couldn't use biometrics. Enter your PIN."
**Bite check:** with the old overlay swapped back in, exactly the 2 F28 tests fail
(15/17); restored, 17/17.

**Mutation check of the other properties** (each break applied alone, then restored):
dropping the active-state guard, the once-only guard, the busy guard, the 8-digit cap,
the autofill opt-out, tap-to-focus, or clearing the PIN after a failure: each is caught
by at least one test. The busy guard first **survived**, because RNTL's `fireEvent`
already refuses events on an `editable={false}` field. The test now also calls the
handler directly, and the mutation is caught.

My own test mistakes (the tests were fixed, not the code):
- One test never enabled biometrics.
- One test assumed the entry stays after a failed check (the overlay clears it).
- An early focus test asserted nothing. It now spies the TextInput mock's prototype
  `focus`, where the RN jest preset puts instance methods.
- The RN preset stubs `AppState.currentState` as a function, so the tests give it a real
  value and restore the stub afterwards.

`LockOverlay.tsx`: **100 %** on every metric (was 0 %), with its per-file floor added.
All four jest-measured files are now at 100 / 100 / 100 / 100. Gates: typecheck 0 ·
lint 0 · vitest 78 / 875 · jest 6 suites / 93 tests, all 4 floors met · semgrep 0.

### P1.8f — Erasing the device (F27) — 2026-09-30

**First, an inventory of every place the app stores data on the device** (by grep, not
from memory):
- **SQLCipher `app_meta`:** 7 subscription keys plus the budget config.
- **SecureStore:** the database key, the legacy v1 theme, the PIN hash, the lock state,
  the Gmail index and per-inbox tokens, the session tokens, the local-only flag, and the
  Expo push token.
- **AsyncStorage:** theme v2, the colour scheme, and the widget snapshot.

Two leftovers were missing from F27: the **widget snapshot**, which names the next
renewal and is not rewritten after sign-out, and the **stored push token**.

**`src/security/erase-device.ts`** is one function for both Settings wipes. Every step
runs even when one fails, and it returns `{ failed: [labels] }`.
- **`"data"`, "Delete all my data":** Gmail inboxes (revoked at Google, then forgotten),
  subscriptions, price history and reminder settings, budgets, and the widget snapshot.
  The user stays signed in, and the app lock and appearance are kept.
- **`"account"`, "Cancel my Zeno account"** (only after the server confirmed deletion):
  all of the above, plus the app lock PIN, appearance (the v2 keys and the legacy v1
  key, as separate steps), and the push token. Then sign-out clears the session tokens
  and the local-only flag.
- **Kept on purpose (not user data), and documented in the module:** the database and
  its key (the rows are deleted and the database is reused), the "demo already seeded"
  flag (otherwise the demo subscriptions would return), and the cached public
  exchange-rate table.

The pieces that could not report a failure before now can:
- **`clearAllData` swallowed every storage error and resolved,** so a failed wipe looked
  successful. It now attempts every step, then **rejects** naming what failed. It also
  resets quiet hours and home currency, in memory and on disk.
- **The budget `reset()` was fire-and-forget.** It now awaits its write and rejects on
  failure.
- **New helpers that reject on failure:** the theme provider's `resetPreferences()`,
  `disconnectAllGmailAccounts()`, `clearWidgetSnapshot()`, `clearStoredPushToken()` and
  `clearThemePreference()`.
- **`disconnectAllGmailAccounts` runs one inbox at a time:** `removeGmailAccount`
  read-filter-writes the shared index, so parallel removal would race and resurrect an
  address.

**Settings:** both flows call `eraseDeviceData`, and a partial failure shows an alert
naming what is still on the device. Copy made true:
- The delete-data dialog now lists what goes and what stays (it said "subscription
  records" only).
- The row now reads "Erase all your data from this device" (the lock and appearance are
  kept by design).

**Tests:**
- `erase-device.test.ts` (7): each scope's steps and their order, labels, failures don't
  stop the rest, exact failure list, a synchronous throw.
- `widgetBridge.test.ts` (6, new, and the file is now 100 %).
- Gmail (4, including a faithful racy index fake).
- The push token (2) and the legacy theme key (1).
- The subscription store (every step then rejects; one failure; preferences reset).
- The budget store (reset rejects; reset + edit in one event; no-database reset).
- The theme provider (reset; reset rejects).

**Bite checks, 7 mutations, each applied alone and then restored, and each caught:**
- parallel Gmail removal
- the erase stopping at the first failure
- the account erase skipping the PIN
- `clearAllData` swallowing failures (the old behaviour)
- `clearAllData` leaving quiet hours
- the budget reset not awaiting its write (the old behaviour)
- the theme reset leaving its keys

The per-file jest floor also caught one untested branch while I was writing (the
no-database budget reset); it now has a test.

**Not verified here:** the two Settings handlers themselves are only type-checked. A
screen test belongs to P5 (Tier 2), and an on-device run needs the emulator.

**New finding F29:** the "Connected inboxes" row is hard-coded to "None connected".
Logged for P4, not fixed here.

Gates: typecheck 0 · lint 0 · vitest 80 files / 895 tests (ratchet 86.23 / 79.83 /
87.85 / 87.04) · jest 6 suites / 98 tests, all 4 files at 100 % · semgrep 0 findings.

**P1.8 is complete:** all four React files that only jest can render are at 100 / 100 /
100 / 100 with per-file floors in CI. Findings fixed along the way: F26, F27, F28.

### P1.9a (part 1) — `apps/api/src/app.ts` — 2026-09-30

**Measured first:** `gaps.cjs` over `coverage-final.json` lists every Tier 1 file with an
uncovered statement, branch or function. That is 48 files (532 / 530 / 98), now split into
P1.9a–d in the tracker. `app.ts` had the most: 80 statements, 67 branches and 10
functions uncovered.

**Four real bugs, each confirmed by a probe before any fix (F30–F33 above):**
- A disallowed CORS origin got a 500 plus an alert.
- Provider error text reached clients.
- A false "server stores no financial data" flag.
- Fastify's 400/413/415 client errors became 500s plus alerts.

**Fixes:**
- **F30:** CORS answers with `callback(null, allowed)`; a disallowed origin gets no
  CORS headers.
- **F31:** an `upstreamFailure()` helper (log `warn`, fixed 502 message) replaces all 6
  upstream catch blocks.
- **F32:** the flag is removed from all five responses.
- **F33:** the error handler passes Fastify 4xx statuses through, with fixed messages
  (400 / 413 / 415), no error log and no alert.

**Dead defensive branches removed** (the 100 % branch target flagged them; each was
checked unreachable):
- Fastify always gives an object for `request.query` and `request.params`, so the
  `typeof`/`?? ""` guards went.
- `isHouseholdMember` no longer takes `undefined` (every caller is behind the auth
  guard).
- `clampInt` no longer has a number branch (query values are strings).
- `parseBody` uses `safeParse`, so there is no unreachable non-Zod catch.
- The coach limiter's key is a named, exported `accountRateLimitKey`, so its
  defensive IP fallback is tested directly.

**`app.routes.test.ts`** (21 tests). The only fakes are coach and billing
(configured-ness and the upstream call), the storage ping, and ioredis.
- **CORS:** an allow-listed origin is echoed; a disallowed one is served without CORS
  headers (GET and preflight both under 500); localhost is allowed in dev, a lookalike
  host is refused, and localhost is refused in production.
- **Client errors:** 400 / 413 / 415, with no error log and no webhook.
- **Server errors:** a 500 posts the route pattern and message only (a secret in the
  query string never appears in the alert body), and a failing webhook is swallowed. A
  non-Error throw is reported as its string; an error before routing reports route
  `unknown`; there is no webhook without a URL.
- **Redis:** a fail-fast client, errors logged, and **a Redis outage degrades open**
  (requests still served).
- **Readiness:** 503 when the database is down.
- **Branches:** validation, not-found and not-configured branches for events, services,
  open banking, family, sync pull, and the billing webhook. **All 4 Plaid routes answer
  503 when unconfigured**, which is the production state.
- **Upstreams:** the coach and billing success paths, and failures carrying a fake
  `org_…` / `sk_live_…` string that must not appear in the response.
- **Informational routes:** each carries no F32 flag.
- `app.test.ts`: the sync test now asserts the flag is absent.

**Bite checks** (each fix reverted alone, then restored; all caught):
- F30 → 2 tests fail
- F31 → 2 tests fail
- F33 → 1 test fails
- F32 → 1 test fails

`app.ts` has **0 uncovered** statements, branches or functions outside the
Plaid-configured handlers (lines 625–688). Those are P1.10: route wiring with the Plaid
module faked, no network, and no sandbox runs, per the standing instruction.

Gates: typecheck 0 · lint 0 · vitest 81 files / 916 tests (ratchet 87.71 / 81.74 / 89.12 /
88.4) · semgrep on `apps/api`: 0 findings, 0 errors.

### P1.9a (part 2) — `apps/api/src/routes/auth.ts` — 2026-09-30

**Before:** 84 % of statements, 64 statements and 65 branches uncovered, including all of
`sweepExpiredAuth`, the boot hydrators, and real Resend delivery.

**A test gap worth naming (not a code bug):** our own access-token verifier checks the
issuer and the audience *after* the signature. The existing tamper tests change the
payload, so they stop at the signature and never reach either check. **Removing the
issuer check or the audience check failed no test.** The new tests sign VALID tokens with
a test key (loaded through `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` with escaped newlines) and
check each rejection.

**`auth-internals.test.ts`** (19 tests). Each test gets a fresh module graph, because
auth.ts reads its keys, issuer and redirect at import time.
- **Tokens:** right issuer and audience (a string or a list) are accepted. Wrong issuer,
  wrong audience or list, no audience, no subject, no expiry and garbage are all
  rejected. Issued sessions carry the configured key id, or the default id without
  `JWT_KEY_ID`.
- **Keys:** production refuses ephemeral keys.
- **Hydration:** only unexpired refresh sessions, links and codes are restored; a
  hydrated session refreshes. A stored code from before `wrongAttempts` existed counts
  wrong guesses from 0, and one wrong guess does not destroy it.
- **The sweep:** reclaims rotated sessions immediately, and expired links, codes and
  sessions after their TTL.
- **Account deletion:** revokes that account's pending link, code and refresh token, and
  no one else's.
- **Resend:** one email to the normalized address; the link is HTML-escaped in `href`;
  no code or link in the response. A Resend 500 is a generic 502, and the log never
  names the recipient. Production without a key is a 502 with no dev code.
- **Demo login:** off without a password, when disabled, and always in production; the
  5/min route limit is real. Wrong email or password is 401; a mixed-case email
  normalizes.
- **Validation:** 400s on every route; the legacy request route; an unknown token is 401;
  an empty logout succeeds.
- **The dev-only unverified-OAuth flag:** accepted in dev; in production it is refused,
  with the warning only when the flag is set.

**Mutation check** (each break alone, then restored; all caught): the issuer check removed,
the audience check removed, the sweep keeping rotated sessions, account deletion leaving
pending links, and the Resend link not escaped.

**Cleanups:**
- `parseRequest` uses `safeParse`.
- `reply.sent ? undefined : …` went: the verify helpers never send, so the ternary was
  dead.
- Demo login reads one `demoLoginPassword(): string | null`, which removes an unreachable
  "enabled without a password" throw.

**Branches left on purpose (5):** `?? ""` fallbacks after zod `.refine()` guarantees
(lines 288, 324, 332), which TypeScript cannot see; `String(error)` for a non-Error
delivery failure (458); and one env-read fallback (943). This fits the P1.11 gate's
≥ 95 % branch allowance.

Gates: typecheck 0 · lint 0 · vitest 82 files / 935 tests · semgrep `apps/api` 0 / 0.

### P1.10 — Plaid, the pure parts and our route handlers (F34) — 2026-09-30

**How I read the standing instruction** ("don't test Plaid, it's in dev, keep the code
only"): no Plaid or sandbox calls, no live integration testing, and no code deleted. The
adapter's own logic and our route handlers are tested with Plaid's HTTP (or the whole
`./plaid` module) faked at the boundary. This matches the plan's P1.10 line. If the
owner meant "no Plaid tests at all", the two new test files can be dropped without
affecting anything else.

**F34 (above), confirmed against Plaid's API docs** (the `/transactions/sync` field
definitions), not assumed. Bite check: with the old `plaid.ts`, exactly the 2 F34 tests
fail (9/11); restored, 11/11.

**`plaid.test.ts`** (11 tests):
- Configured-ness; the base URL per `PLAID_ENV`.
- Request shape: credentials from env, and the account id as `client_user_id`.
- Response mapping. Error text uses the Plaid error code, else the message, else
  "unknown"; it reaches the server log only (F31).
- The kept sign; ICU exponents (JPY, KWD); unofficial and unknown codes skipped; the
  merchant name preferred.
- Cursor pagination, and the 10-page cap.
- Storage: in memory without an encryption key; persisted **only sealed** with one
  (never a plaintext `accessToken`).
- Hydration: decryptable rows restored; undecryptable rows counted in one warning;
  wrong-shape and null rows ignored.

**`app.plaid-routes.test.ts`** (8 tests), with Plaid configured and the module faked:
- The link token uses the TOKEN's account, whatever the body claims.
- The exchange validates the public token (≤ 512) and **returns only the item id,
  never the bank access token**.
- Transactions: 409 without a linked bank; reads with the caller's OWN access token
  only (one user cannot reach another's item).
- Sandbox minting is refused outside sandbox.
- Every upstream failure is a fixed 502 with no Plaid code in the body.

**Mutation check** (all caught): the exchange returning the access token, the link
token trusting a body `userId`, and sandbox minting allowed in any environment.

`app.ts` is now **100 %** on every metric. `plaid.ts` keeps one defensive branch: the
`?? null` that TypeScript's lib forces on `maximumFractionDigits`.

Gates: typecheck 0 · lint 0 · vitest 84 files / 954 tests (ratchet 90.95 / 85.6 / 90.72 /
91.66) · semgrep `apps/api` 0 / 0.

### P1.9 — two unassigned files (done by me) — 2026-09-30

- **`mobile/src/fx/rates.ts`: 100 %.** New test: a successful response in which no
  supported currency has a usable rate (only XAU, a negative EUR, a null GBP) returns
  `null`, not `{}`. An empty table would read as "rates available" to the store.
  Bite check: with the `length > 0` guard removed, the test fails; restored.
  **Observation, not fixed:** `fetchLatestRates` uses a bare `fetch` with no deadline,
  unlike the rest of the app (`timedFetch`). The store fires it best-effort and never
  awaits it on the UI path, so a hang only leaves one pending promise. Worth moving to
  `timedFetch` in P3.
- **`mobile/src/config/site.ts`:** the only open branch is `split("/")[0] ?? ""`. A
  `split` always yields at least one element, but the `??` is required by
  `noUncheckedIndexedAccess`. It is unreachable and left as is (within the ≥ 95 %
  branch allowance).

### P1.9d — thin config, theme and web files (agent, verified by me) — 2026-09-30

**Done by a parallel agent** in its own worktree (branch `worktree-agent-a230e74683c69c759`,
6 commits on `fe783c5`), then **merged and verified by me in `main`**. I did not take the
report on trust:
- **Read every changed source line.** The three are `motion.ts` (+`.catch`), and
  `next.config.ts` and `analytics-flag.ts` (a one-line rule each).
- **Scanned every new test for weak assertions** (`|| true`, `expect(true)`, bare
  `toBeTruthy`/`toBeDefined`, `.skip`/`.only`): none.
- **Read the two security-relevant tests in full.** `next.config.test.ts` pins the
  exact production CSP and every security header. `app.config.test.ts` first proves
  its scan finds the API's real secrets, then sets every API env var to a marker and
  asserts that no marker appears anywhere in the shipped Expo config.
- **Re-ran all three bite checks myself in `main`.** The old CSP rule fails 2 tests,
  the old analytics rule fails 3, and removing the `.catch` fails 1. All restored.

**Coverage:** haptics, fonts, zeno, colors / spacing / typography, `next.config.ts`,
`app.config.ts`, `analytics-flag.ts` and web `utils.ts` are all at 0 uncovered
(statements / branches / functions) under Vitest. `motion.ts` and `useZenoTokens.ts`
need React Native rendering, so they moved to jest: they are in `collectCoverageFrom`
with 100 % floors, and excluded in `vitest.config.ts` (I applied the two exclude lines).

**Tests added** (8 files, 129 tests):
- **Haptics:** each entry calls the right expo-haptics function per platform; a
  rejected haptic is swallowed.
- **Fonts:** each maps to a real file.
- **Tokens:** every legacy theme id resolves to the one brand. The WCAG claims in the
  token comments are asserted in both schemes.
- **Typography:** only fonts that are actually loaded, and weights match.
- **Expo config:** no server secret, and https on the release profiles.
- **Website config:** CSP and headers; www → apex redirect.
- **Analytics flag:** fails closed.
- **`cn()`:** conditional classes, flattening, and a later Tailwind utility winning.
- **`printIn` and `useReducedMotion`** (jest).
- **`useZenoTokens`** (jest): identity is stable until the scheme changes.

**Observations from the agent** (not changed; left for the owner or later phases):
- **`src/theme/colors.ts` is dead code** (only `theme/index.ts` re-exports it, and
  nothing imports that barrel). It is also saved as Windows-1252. A candidate for P1.9
  cleanup or P3.
- **Contrast, for design review:** `textTertiary` is 3.45:1 on paper and
  `stampVerified` is 4.17:1. The tokens claim AA for neither.
- **`app.config.ts`** falls back to `http://127.0.0.1` when `PUBLIC_API_BASE_URL` is
  unset. The release profiles set https, and that is now tested.
- **The production CSP still allows `'unsafe-inline'` scripts.** This was already
  known, and nonce-based CSP is P4 work.
- **Worktree note:** `@react-native-async-storage/async-storage` exists only in the main
  checkout's `apps/mobile/node_modules`. The agent worked around it without installing
  anything, and I re-ran everything in `main`.

**Gates in `main` after the merge:** typecheck 0 · lint 0 · vitest 92 files / 1069 tests
(ratchet 92.16 / 86.32 / 93.76 / 92.79) · jest 8 suites / 113 tests, all 6
jest-measured files at 100 % · semgrep (web + theme + app.config) 0 findings (3
pre-existing parse warnings in the legal pages).

### P1.9b (part 1) — mobile API client and notifications (agent, verified by me) — 2026-09-30

**Done by a parallel agent** (branch `worktree-agent-ae9e186c6b66577cd`, 3 commits), then
**merged and verified by me in `main`**:
- **Read every changed source line** in `client.ts`, `notificationHandlers.ts` and
  `notificationService.ts`.
- **Checked each bug claim against the code it depends on.** `app.ts` returns
  `ok({ deleted: true })`, and `GET /family/:id` returns 404. `family.tsx:66-69` deletes
  the stored household on `not_found`. The only caller of `registerForPushNotifications`
  (`_layout.tsx:207`) ignores the new return value.
- **Reviewed the 2 edits to existing tests.** Both had pinned behaviour the API does
  not have: a bare `200 {}` "deletion", and "200 without a household = not_found".
  Nothing was loosened: each still asserts one exact value.
- **Re-ran all bite checks myself in `main`,** each alone and then restored:
  - deletion accepting any 2xx → 1 test fails
  - malformed 2xx meaning `not_found` → 2 fail
  - an unchecked tap id → 9 fail
  - registration rejecting → 3 fail
  - overlapping reconciles → 1 fails
  - duplicate copies kept → 1 fails

**Coverage** (statements / branches / functions):
- `api/client.ts` → 81/81, 45/45, 22/22
- `notificationHandlers.ts` → 20/20, 16/16, 5/5 (was 0 %)
- `notificationService.ts` → 99/99, 65/65, 24/24

**Tests:**
- **`client.edges.test.ts` (35):** the deletion contract, family status mapping,
  request shapes (retries only on GETs), and the open-banking intent paths.
- **`notificationHandlers.test.ts` (20):** routing, and 10 hostile ids refused.
- **`notificationService.effects.test.ts` (30),** against a fake OS pending queue:
  registration on every platform and permission state, scheduling, quiet hours,
  reconcile, and duplicates.

**Observations from the agent** (recorded, not changed here):
- **Android push:** there is no `googleServicesFile`, so the Expo token fetch likely
  fails on Android. F41 makes that harmless, but push itself needs FCM config (P3/P8).
- **A tap that cold-starts the app may be missed:** the listener is registered in an
  effect, so `getLastNotificationResponse` should be checked at launch (P3).
- **`deleteAccountOnServer` is still a boolean,** so a 401 shows "couldn't reach the
  server". The result needs reasons (P3).
- **Family 409 / 403 / 400 map to "try again".**
- **`createOpenBankingIntentViaApi` has no callers** and no timeout (Plaid-adjacent, left
  alone). `recordFunnelEvent` has no timeout.
- **A 2xx with the wrong data shape passes as success** (§1 wants validation). This goes
  to P2/P3.
- **Two more findings came from this report, both verified by me and logged as open:**
  F43 (sign-out on any refresh failure) and F44 (banned "automatic discovery" copy).

**Gates in `main` after both merges:** typecheck 0 · lint 0 · vitest 95 files / 1154
tests (ratchet 93.81 / 88.19 / 95.91 / 94.51) · jest 8 suites / 113 tests at 100 % ·
semgrep (`mobile/src/api`, `notifications`) 0 / 0.

### F43 — a failed token refresh no longer signs the user out — 2026-09-30

**The bug:** verified by reading `authStore.refreshToken()`. Its catch cleared the stored
session on ANY error. `timedFetch` throws on no network or a timeout, and Render's free
tier answers 502/503 while it wakes up. Opening the app offline more than 15 minutes
after the last token refresh therefore deleted a valid 30-day refresh token.

**The fix** (`apps/mobile/src/auth/authStore.ts`):
- `readEnvelope` throws an `AuthHttpError` carrying the HTTP status.
- `isDefinitiveRejection` is true only for 401 (invalid, expired or already rotated)
  and 400 (the stored value is not a well-formed token).
- On anything else the session is **kept**: the error is recorded (shown only on the
  login screen, and `setAnonymous` clears it), and the 14-minute refresh timer is
  started so it retries on its own.
- `getValidAccessToken` never returns an EXPIRED token after a failed refresh. It
  returns `null` until a refresh succeeds.

**Tests** (`authStore.flows.test.ts`, +9):
- Six transient failures each keep the stored session and the signed-in state: offline,
  timeout, a 503 HTML page, a 502 envelope, a 429 and a 500.
- A 400 still ends the session. The existing 401 test is unchanged and still passes.
- Offline, `getValidAccessToken` returns `null`, never the expired token, and returns a
  fresh token once online.
- After a transient failure, the timer alone recovers the session 14 minutes later.

**Bite check:** with the old `authStore.ts`, 8 of the new tests fail (47 / 55). The 400
test passes on both versions, as it should, because both end the session on a 400.
Restored: 55 / 55, and `authStore.ts` is at 100 / 100 / 100.

Gates: typecheck 0 · lint 0 · vitest 95 files / 1163 tests (ratchet 93.83 / 88.22 / 95.92 /
94.53) · semgrep `mobile/src/auth` 0 / 0.

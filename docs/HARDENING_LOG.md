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
- [x] **P1 — Tier 1 logic to 100 % coverage** (gate passed 2026-09-30; evidence in the P1.11 entry) (order = risk; each sub closes the findings named)
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
  - [x] P1.9 every remaining Tier 1 gap (48 files; split across 5 parallel agents in their own worktrees, each branch merged and verified by me in `main`)
    - [x] P1.9a API: `app.ts` and `routes/auth.ts` (me), plus `coach`, `billing`, `family`, `sync`, `config` and `storage/pg` (agent, verified by me), all at 0 uncovered lines and functions. **Fixes F30-F33, F46-F53**
    - [x] P1.9b mobile logic (two parallel agents, both verified by me): **part 1** (`api/client.ts`, `notificationService.ts`, `notificationHandlers.ts`; fixes F38-F42) and **part 2** (`subscription-ui`, `calendarUtils`, `insightsEngine`, `budget`, `format`, `api/config`, `seed-subscriptions`, `open-banking`; fixes F65-F73), all at 100 % except one defensive branch in insightsEngine
    - [x] P1.9c shared package: all 14 files at 0 uncovered statements, branches and functions (agent, verified by me, with one regression found and corrected by me). **Fixes F55-F63**; F64 open
    - [x] P1.9d thin config, theme and web files: all 13 at 0 uncovered statements, branches and functions (`motion.ts` and `useZenoTokens.ts` moved to jest with 100 % floors). **Fixes F35, F36, F37**
  - [x] P1.10 `apps/api/src/plaid.ts` (was 21 %; now 0 uncovered lines / functions, 1 defensive branch) and the Plaid routes in `app.ts` (now 100 %). Plaid's HTTP is faked, with no Plaid or sandbox calls, by standing instruction. **Fixes F34**
  - [x] P1.11 gate: Tier 1 at 100 % statements / functions / lines and 99.61 % branches (≥ 95 %); jest floors at 100 %; green on GitHub (CI 36744248345, CodeQL 36744248343)
- [x] **P2 — API on real Postgres, authorization matrix, fuzzing** (gate passed again 2026-10-01 after P2.9 closed the two half-done plan items; F90 waits on the owner) (inline, one item at a time; no parallel agents from here on, by the owner's instruction)
  - [x] P2.1 real Postgres in tests (PGlite locally, a `postgres` server in CI, proven by a server-mode test): schema from empty, upsert, a restart round trip for every store, account deletion leaves no row, the refresh race, concurrent sync replays; **fixes F75** (green: CI 36763417730, CodeQL 36763417620 on `229e114`)
  - [x] P2.2 authorization matrix (table-driven from the LIVE route list; 40 routes, 11 token attacks, cross-household), **fixes F76** (green: CI 36764785079, CodeQL 36764784910 on `8d4b5f0`); F77 open for the owner
  - [x] P2.3 rate limits per route (table-driven from the live routes; window, key, 429 envelope, Retry-After); **fixes F78, F79** (green: CI 36765749331, CodeQL 36765749502 on `73766ff`)
  - [x] P2.4 property-based fuzzing of every route (fast-check; 200 runs per route in CI, 10 000 nightly); prototype poisoning pinned at the parser (green: CI 36767472709, CodeQL 36767472774 on `eea3f24`)
  - [x] P2.5 error and log hygiene: the production logger config under real traffic carrying marked secrets; error bodies carry the request id and no internals (green: CI 36768319235, CodeQL 36768319305 on `d5716ed`)
  - [x] P2.6 auth flows: enumeration-safe magic link, 10-minute expiry, single use, production refusals; **fixes F80** (the 6-digit code could be brute-forced) **and F81** (expired sign-in rows kept in Postgres for good) (green: CI 36770819652, CodeQL 36770819744 on `f9f9540`)
  - [x] P2.7 outbound-call inventory: every call site listed and checked by a source scan, each run against its host with a deadline, the one request-derived URL part guarded; **fixes F82** (the 5xx alert was unbounded), **F83** (anyone could force a JWKS re-fetch per request), **F84** (a coach request could run about 3.5 minutes) (green: CI 36773329340, CodeQL 36773328872 on `70fa1e5`)
  - [x] P2.8 the RevenueCat webhook: replay, duplicates, out-of-order retries, auth, malformed bodies, durability; **fixes F85** (the payload was trusted and arrival order mattered), **F86** (the secret compare leaked its length), **F87** (a lookup in flight re-cached an older answer, or re-created a deleted user's billing row) (green: CI 36775230680, CodeQL 36775230616 on `d0cfc0c`)
  - [x] P2.9 the plan gaps found by checking P2 against `PRODUCTION_HARDENING_PLAN.md` line by line: **F88** (no same-code-path / timing test for unknown vs revoked tokens, plan P2.2) and **F89** (the fuzz never generates schema-valid input to check the expected status, plan P2.4); closing F89 found and **fixed F91** (`/events` counted inherited names like `toString`, and `constructor` with a label was a 500) (green: CI 36823714811, CodeQL 36823714765 on `7a9ea77`)
  - [x] P2 gate (passed again on `7a9ea77` after P2.9; first pass on `d0cfc0c`): route-inventory test green (40 routes); real-PG suite green locally (PGlite, 13 tests) and in CI (a Postgres 18 server, proven by the server-mode test) on `d0cfc0c`; nightly fuzz configuration green locally (first scheduled run pending)
- [~] **P3 — Mobile hardening (MASVS) + tests for all 29 screens** (inline, one item at a time, in the plan's order)
  - [~] P3.1 build hardening in `app.config.ts`: no Auto Backup, no cleartext, R8 minify + resource shrink with keep rules; then prebuild, release APK, verify by bytes, full on-device smoke; **F92** (Auto Backup on), **F93** (release not shrunk or obfuscated)
  - [ ] P3.2 release console stripping (keep `error`/`warn`); `captureError` never carries tokens or emails
  - [ ] P3.3 Sentry `beforeSend` scrub; `sendDefaultPii` false
  - [ ] P3.4 PIN: salt, derivation, lockout with backoff, nothing in logs; the honest threat model
  - [ ] P3.5 deep links: every `zeno://` route validates its parameters; `Linking.openURL` only `https:`/`mailto:` on an allowlist
  - [ ] P3.6 no secret in the bundle: `extra` and every `EXPO_PUBLIC_*` on the public-by-design allowlist
  - [ ] P3.7 screen capture blocked on the lock overlay and PIN entry (app-wide `FLAG_SECURE` is the owner's call)
  - [ ] P3.8 screen tests for all 29 screens, with a jest floor over `app/**` and `src/components/**`
  - [ ] P3.9 static scan of the release APK (MobSF, else apkleaks + manifest review)
  - [ ] P3 gate: hardened release APK verified on the emulator (every flow in `DEVICE_TEST_FINDINGS.md`); jest floor in CI; MASVS checklist with evidence per control
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
| F44 | **FIXED (P1.9 follow-up).** ~~Banned "automatic discovery" copy: `app/open-banking.tsx:45` says "auto-discovers recurring charges" (it also claims "we only receive transactions", although the server holds the Plaid access token), and `app/(tabs)/discover.tsx:655` says "automatically discover what you pay for". Both violate the standing truthfulness rails.~~ Both are reworded (exact text in the log entry below). | Medium (truthfulness) | me | P1.9 follow-up |
| F45 | **OPEN: owner decision.** The paywall (`app/paywall.tsx:257`) says "…and we never see your bank." That is true in production today, where bank connect is dev-only, but it becomes false the day Plaid ships, because the server then stores the Plaid access token and fetches transactions. Suggested wording: "…and no bank login required." (the required phrase), or keep it and reword when Plaid ships. Not changed: it is paywall marketing copy. | Low now, High if Plaid ships (truthfulness) | owner | P4 or before Plaid ships |
| F46 | **FIXED in P1.9a.** ~~A RETIRED encryption key sealed new data.~~ With `STORAGE_ENCRYPTION_KEY` unset or malformed and a valid `STORAGE_ENCRYPTION_KEYS_PREVIOUS`, `sealValue` used `keyring()[0]`, a previous key (possibly retired because it leaked). Meanwhile `config.ts` told the operator the tokens stayed in memory. Only the primary key seals and counts as "configured" now; previous keys only open old rows. | Medium | me (agent) | P1.9a |
| F47 | **FIXED in P1.9a.** ~~One malformed row stopped every later store from loading at boot.~~ Hydrators run in order (auth, plaid, billing, sync, family); one throwing left all later namespaces empty. Each namespace is now isolated, and a failure is logged by namespace name only (never keys or values). | Medium-Low | me (agent) | P1.9a |
| F48 | **FIXED in P1.9a.** ~~A sync push was acked "accepted" even when its database write failed.~~ `kvPersistAwait` now reports whether the row landed. A failed write counts as rejected and undoes the in-memory write, but only if no newer change for the same item landed meanwhile. | Medium (latent: no sync client yet) | me (agent) | P1.9a |
| F49 | **FIXED in P1.9a.** ~~Turning off auto-renew or pausing showed a PAYING user as Free.~~ `CANCELLATION` and `SUBSCRIPTION_PAUSED` webhooks cached "free", although RevenueCat removes access only on `EXPIRATION` (and says of PAUSED: "Don't revoke access on this event"). The app trusts the server's plan, so for up to 10 minutes these users saw Free. The cached answer is now dropped, so the next read re-verifies with RevenueCat. | Medium | me (agent) | P1.9a |
| F50 | **FIXED in P1.9a.** ~~Webhook auth failed if the configured secret included "Bearer "~~ (only "Bearer Bearer <secret>" then matched). It failed closed. The prefix is now optional on both sides, and a bare "Bearer " matches nothing. | Low | me (agent) | P1.9a |
| F51 | **FIXED in P1.9a.** ~~`expiration_at_ms: 0` was read as "never expires"~~ (a truthiness check). Only an absent value means no expiry. | Low | me (agent) | P1.9a |
| F52 | **FIXED in P1.9a.** ~~AI-coach model output reached the app unvalidated.~~ Recommendations were filtered on title and detail, then passed through as-is. An object `estimatedMonthlySavingsLabel` would crash `coach.tsx` ("Objects are not valid as a React child"), and invented fields reached the client. Each recommendation is now rebuilt from its string fields. | Low-Medium | me (agent) | P1.9a |
| F53 | **FIXED in P1.9a.** ~~The coach labelled an amount in a currency Intl cannot format as dollars.~~ It now prints the amount with its currency code. (Unreachable through the route today: the schema allows six codes.) | Low | me (agent) | P1.9a |
| F54 | **FIXED (P1.9 follow-up).** ~~The billing webhook rejected RevenueCat's documented nulls, and an absurd timestamp crashed it.~~ RevenueCat's docs: `expiration_at_ms` "can be null for non-subscription purchases or lifetime products"; `entitlement_ids` "can be null if the product_id is not mapped to any entitlements". Our schema answered both with a **400**, so every LIFETIME purchase webhook was refused and never granted Pro server-side. An `expiration_at_ms` of 9e15 or more passed validation and then threw a `RangeError` in `toISOString()`, giving a **500**. The schema now accepts both nulls and caps the timestamp at the largest instant a JS Date can hold (8.64e15). | Medium (lifetime purchases not recognised by the webhook) | me | P1.9 follow-up |
| F55 | **FIXED in P1.9c (+ my correction).** ~~A quote in the middle of an unquoted CSV field swallowed the rest of the file.~~ An unquoted `BEST BUY 55" TV` opened a quoted section, so every later row landed in one cell: silent data loss on import. The agent's fix (a quote opens a section only as a field's first character) **regressed** the common `a, "Netflix, Inc.", 15.49` shape (a space after the comma), splitting the name and shifting the amount column. I confirmed this by running the old and new parsers side by side. My correction: a quote also opens a section when only spaces or tabs precede it, and that padding is dropped. | Medium (import data loss) | me (agent + me) | P1.9c |
| F56 | **FIXED in P1.9c.** ~~CSV amounts lost their sign.~~ `$-15.49`, `USD -15.49`, `15.49-`, `−15.49` (U+2212) and `$(15.49)` all parsed as positive. The importer reads negative as a charge, so these real charges were dropped. | Medium | me (agent) | P1.9c |
| F57 | **FIXED in P1.9c.** ~~CSV amount parsing invented numbers.~~ `"Rs. 499"` parsed as 0.50 (the abbreviation dot became a decimal point). Letters between digits were stripped and the digits glued together (`1.5E+2` became 1.52, `10 USD 50` became 1050); these now return null. A leading BOM stayed in the first header cell. | Medium | me (agent) | P1.9c |
| F58 | **FIXED in P1.9c.** ~~`canUseScope` failed OPEN on an unparseable key expiry~~ (`NaN <= now` is false, so the key was valid forever). It now fails closed. | Low now (no caller); High if it ever gates access | me (agent) | P1.9c |
| F59 | **FIXED in P1.9c.** ~~Spend Twin invented comparisons when a rate was missing.~~ The $10 USD burrito was reused as ₹10, so ₹1,900 read as "190 burritos". Reachable before the first FX fetch. There are now no comparisons without a rate, and the summary says a rate is missing. | Medium (truthfulness) | me (agent) | P1.9c |
| F60 | **FIXED in P1.9c.** ~~Spend-coach insights compared or printed amounts in the wrong currency.~~ USD benchmarks were read as raw home-currency minor units ("the profile benchmark is ₹34.00"; it is ₹3,230). The burrito fell back to ₹10. Non-USD or mixed totals were printed as "$". An unparseable last-charge date gave "NaN days old". This text also feeds the AI coach. Benchmarks are now converted, or skipped without a rate, and the insights run only with a single known currency. | Medium (truthfulness) | me (agent) | P1.9c |
| F61 | **FIXED in P1.9c.** ~~The widget snapshot added raw minor units across currencies and always printed "$"~~ (₹499 showed as "$499.00"; $10 + ₹499 as "$509.00"). It also silently left out subscriptions with no rate, and could pick an unparseable renewal date as "next" ("Name NaNd"). It now shows one total per currency, counts the exclusions, and skips bad dates. | Medium (truthfulness) | me (agent) | P1.9c |
| F62 | **FIXED in P1.9c.** ~~The business and family-vault summaries added raw minor units across currencies without rates and labelled the sum with the target currency~~ ($10 + ₹499 = "₹509"). Other currencies are now excluded and counted (`excludedCurrencyCount`). | Low (no screen reads these yet) | me (agent) | P1.9c |
| F63 | **FIXED in P1.9c.** ~~An unparseable or empty `nextRenewalDate` silently dropped annual and quarterly charges from spend history~~ (a NaN month matched nothing, which also shrank Wrapped's total). It now falls back to `createdAt`, as it already did for a missing date. | Low | me (agent) | P1.9c |
| F64 | **FIXED.** ~~The root of several currency findings.~~ `subscription-store.tsx` passes `fx = undefined` until exchange rates load (first launch, offline). Until then `createSpendSummary`, `createAnalyticsSnapshot`, `buildMonthlySpendHistory`, `buildYearInReview`, the calendar, budget and insights totals, and the store's own `totalMonthlyMinor` all add different currencies' raw minor units and label the result with the home currency. Flagged independently by two agents (P1.9b and P1.9c). Suggested fix: always pass `{ homeCurrency, rates: exchangeRates ?? {} }`, so same-currency amounts count and the rest are excluded with a disclosed count. Done: `fx` is now always a context, with an empty table until rates load. | Medium (currency honesty) | me | P1.9 follow-up |
| F65 | **FIXED in P1.9b.** ~~Every trial-ending insight said "Cancel now to avoid being charged $0".~~ The amount came from the monthly-equivalent figure, which is 0 for trials by definition; the live output read "...charged ₹0." It now shows the stored price, or no amount when the price is 0. | Medium-High (truthfulness, on every trial) | me (agent) | P1.9b |
| F66 | **FIXED in P1.9b.** ~~The calendar's projected annual spend treated every billing cycle as monthly.~~ A $30 quarterly plan projected $240, a $5 weekly plan $40, and an unknown-cycle plan $79.92 of invented spend. It now uses the shared monthly-equivalent rule, counts a trial's conversion charge once (only if it lands this year), and adds 0 for "unknown". | Medium (a number on screen) | me (agent) | P1.9b |
| F67 | **FIXED in P1.9b.** ~~The high-spend insight called a fixed constant an "Average"~~ ("Average is around $40/mo"), which is an invented statistic. It now reads "Zeno's benchmark for this category is $40/mo." | Medium (truthfulness) | me (agent) | P1.9b |
| F68 | **FIXED in P1.9b.** ~~Calendar and insights did day arithmetic in DEVICE-local time.~~ An 8-day gap became 7 across a US DST change (putting a renewal in "this week"), a 7-day trial became 8 and dropped out of the insights, week buckets disagreed with the screen's own countdown west of UTC, and a Jan 1 annual renewal was counted in the previous year. All are now whole UTC days (standards section 10). | Low-Medium | me (agent) | P1.9b |
| F69 | **FIXED in P1.9b.** ~~Budget charge dates lost the anchor day for good~~ (each step started from the previous, already-clamped date: Jan 31 → Feb 28 → Mar 28 → Apr 28, so Feb 29 never came back), and a 200-step walk dropped anchors more than about 4 years (weekly) or 17 years (monthly) away. Each charge is now computed from the anchor, jumping straight to the window. | Low-Medium | me (agent) | P1.9b |
| F70 | **FIXED in P1.9b.** ~~`rollRenewalForward` gave up after 1000 steps~~, so a date more than about 19 years (weekly) or 83 years (monthly) overdue, such as an epoch-0 or spreadsheet zero-date import, came back still in the past and showed "TODAY" forever. It now jumps directly, with no cap needed. | Low | me (agent) | P1.9b |
| F71 | **FIXED in P1.9b.** ~~Insights mixed currencies or stated unknowns.~~ A USD benchmark was printed with the home symbol ("₹40/mo" for $40) when no rate existed; the duplicate "high" bar was a bare 10 home-currency units (₹10, about 12 US cents); a cancelled subscription with an unparseable date claimed access "continues until the renewal date"; and the copy read "Two ai tools tools". | Low | me (agent) | P1.9b |
| F72 | **FIXED in P1.9b.** ~~A blank `apiBaseUrl` became relative URLs, and a trailing slash produced `.../v1//billing/...`.~~ It is now normalised like `config/site.ts`. Latent: the current eas.json values are well-formed. | Low | me (agent) | P1.9b |
| F73 | **FIXED in P1.9b.** ~~The demo Duolingo subscription pointed at `duolingo-super`, which is not in the catalog~~, so its detail and cancel screens found no service. It now points at `duolingo-plus`; I confirmed by lookup that it exists and the old slug does not. | Low | me (agent) | P1.9b |
| F74 | **FIXED.** ~~A new CRITICAL Next.js advisory, GHSA-vcvr-r3jv-pc5j ("Remote Code Execution in next/og ImageResponse", CVSS 9.5), turned CI red.~~ Affected: `>=16.2.0 <16.3.6`; we ran 16.3.3. Per the advisory, exploiting it requires the Node.js `ImageResponse` from `next/og` with attacker-controlled values in SVG content, attributes or styles. **Our website does not import `next/og` at all** (grep: no `next/og`, `ImageResponse` or OG-image routes), so it was not exploitable here, but the vulnerable code shipped in the dependency. Upgraded to **16.3.6**, the minimum fixed version, published 2026-09-22 and so past the repo's 7-day supply-chain cooldown. 16.3.8 is the latest, but it was published today, so we waited. | Critical upstream; not exploitable in our app | me | this slice |
| F75 | **FIXED in P2.1.** ~~`DELETE /api/v1/account` said "deleted" before the data was gone, and could not finish a failed deletion.~~ Four of its five steps (entitlement, bank token, sync rows, households) were fire-and-forget, so the answer could arrive while Alice's rows were still in Postgres. Proven against real Postgres by making the unawaited writes slow: at the moment of `{ deleted: true }`, her billing, family, plaid and sync rows were all still there, and a crash then would restore them on the next boot. Separately, every failed delete was swallowed (the route still said deleted), and a retry could not find the rows again, because deletion was driven from memory, which had already forgotten them. Now: every step is awaited and reports whether it is durable; any refusal answers **503** (the app then keeps its data and does not tell the user it is done); and sessions and sync rows are deleted **in SQL by the owning account** (`value->>'accountId'` / `'userId'`), so a retry finds whatever is left. Households are JSON documents to rewrite, so a refused rewrite puts the in-memory household back and the retry redoes it. | High (the account-deletion promise; App Store requirement) | me | P2.1 |
| F76 | **FIXED in P2.2.** ~~A DELETED account's access tokens kept working, and could re-create its data.~~ Access tokens are stateless 15-minute JWTs with no revocation. Proven with a probe: right after `DELETE /account` answered 200, the same token pushed a sync change (`accepted: 1`), pulled it back, and created a household, all persisted, for an account the user had just been told was deleted. The existing app test had even pinned this, with a comment saying the token "still verifies (stateless JWT, no revocation list)". Now, as the LAST step of a durable deletion, a per-account cut-off is persisted first (key = SHA-256 of the id, value = a timestamp only, so it is not a row of the user), then applied in memory. The auth check rejects any token for that account with `iat` at or before it; a token with no `iat` fails closed. It survives restarts, is swept after the 15-minute token lifetime, and is not set if the save is refused, so the user's token can still retry. | High (account deletion; data re-created after "deleted") | me | P2.2 |
| F77 | **OPEN: owner decision.** Logout revokes the REFRESH token at once, but the stateless ACCESS token keeps working until it expires (at most 15 minutes). The matrix pins this as a named known gap. Options: (a) a session-id claim plus a server-side denylist checked by the auth guard (the mobile logout would also send the access token); (b) a shorter access-token life, e.g. 5 minutes, at the cost of more refreshes; (c) accept it as the standard stateless-JWT trade-off and document it. Account DELETION is already covered (F76). | Low-Medium | owner (decision), then me | P2 follow-up |
| F78 | **FIXED in P2.3.** ~~Requests WITHOUT a token were never rate-limited on any protected route.~~ The auth guard was an app-level `onRequest` hook and the per-route limits are route-level `onRequest` hooks; app-level runs first, so an unauthenticated request got its 401 before any limiter counted it. Proven: 20 unauthenticated `DELETE /account` (limit 5) were all 401, never 429. Each one still cost an RSA signature check, so this was an unlimited, cheap-to-send load. The guard now runs in `preParsing`: after every limiter, still before the body is read. The AI coach had a second gap: its account-keyed limit ran after the guard, so unauthenticated coach floods were limited by nothing at all. A stacked second limiter does not work, because the plugin applies only the FIRST limiter per request (`req[rateLimitRan]`). The coach now has ONE limiter keyed per request: by account for a valid token, by IP otherwise. | Medium (DoS / cost) | me | P2.3 |
| F79 | **FIXED in P2.3.** ~~The auth routes did not use the API's error handler.~~ `setErrorHandler` was called at the END of `buildApp`, but the awaited auth plugin had already built its routes with the handler that existed THEN, Fastify's default. Proven: a 429 on `/auth/magic-link` was Fastify's `{"statusCode":429,"error":"Too Many Requests",...}`, not our envelope, and malformed JSON on `/auth/refresh` returned `FST_ERR_CTP_INVALID_JSON_BODY` with the framework message. The F33 client-error mapping, the fixed 500 message and the 5xx monitoring alert therefore all bypassed every sign-in route. The handler is now set FIRST, before any plugin registers routes. | Medium (error hygiene on the auth surface) | me | P2.3 |
| F80 | **FIXED in P2.6.** ~~The 6-digit sign-in code could be brute-forced by anyone who knows the address.~~ Its 5-guess cap was per CODE, and every new request sent a new code with a fresh cap. The per-recipient send cap allows 5 codes per 15 minutes, so a caller rotating nothing but the request could make 25 guesses per 15 minutes: about 2,400 a day from ONE IP (the per-IP limits, 5 requests and 10 verifies a minute, both allow it). That is roughly a 0.24 % chance a day, about 7 % a month, of signing in as the account. Proven on the old code: after 10 wrong guesses across two codes, the right third code still signed in. Now a per-ADDRESS budget of 10 wrong codes per 24 hours spans every code sent; once spent, no code is taken, not even the right one. It is persisted (else the free tier's idle spin-down would refill it), keyed by a hash of the address, swept when its window ends, and deleted with the account. Links (256-bit tokens) are unaffected; no current client signs in by code (mobile uses the link). | High (account takeover, slow but unattended) | me | P2.6 |
| F81 | **FIXED in P2.6.** ~~Expired sign-in rows stayed in Postgres indefinitely.~~ On boot the auth hydrators SKIPPED expired records, and the sweep only walks memory, so a record that expired while the process was down (the free tier sleeps when idle) was never deleted. Every refresh session of a user who stops using the app kept its email and account id in `kv_store` until the account was deleted; an unused magic link kept the email and its (expired) code. The four hydrators that drop expired records (`auth_refresh`, `auth_magic`, `auth_legacy`, `auth_code_fail`) now delete their rows. Proven on real Postgres: seeded expired rows are gone after a boot and the live one loads. | Low (data retention; the records were already refused on use) | me | P2.6 |
| F82 | **FIXED in P2.7.** ~~The 5xx alert webhook had no deadline and no bound.~~ It was the only outbound call on a raw `fetch`, with no deadline of ours; undici's own defaults wait 300 s for headers (checked in Node 24's bundled undici 7.24.4). It fired once per 5xx, so during an outage (every request failing) a slow or hung collector held one socket per failed request. Each alert now has a 3 s deadline, and at most 5 are in flight; the rest are dropped (every 5xx is still logged at error level). | Medium (an outage amplifier) | me | P2.7 |
| F83 | **FIXED in P2.7.** ~~Any caller could make the API fetch Apple's or Google's signing keys on every request.~~ A token with an unknown key id forced a JWKS re-fetch (meant for real key rotation) with no limit. A JWT-shaped string with a made-up `kid` is enough, and needs no account, so at 10 a minute per IP from many IPs our address could be throttled by the provider. Once the one-hour cache expired, every real social sign-in would then fail. Proven: 5 such requests made 6 fetches. A forced refresh now waits 30 s after the last fetch of that URL (as jose's JWKS cooldown does), so a rotated key is still picked up at most 30 s late (tested with a genuinely rotated, signed Google token). Also, a malformed 200 (no `keys` list) used to be cached for an hour, failing every sign-in; it is now refused and not cached. | Medium (availability of social sign-in) | me | P2.7 |
| F84 | **FIXED in P2.7.** ~~One coach request could run for about 3.5 minutes.~~ The Anthropic SDK's 30 s timeout is per ATTEMPT. It retries twice and honours a `Retry-After` of up to 60 s in between (read in the installed SDK 0.69.0), so a 429 could hold the request for 30 + 59 + 30 + 59 + 30 s. The app gives up at 35 s and shows its local insights. Proven with the real SDK: at 30 s the old code was still waiting. One 30 s deadline now covers the whole provider call: it aborts the request and answers 502, and the SDK's pending retry sees the abort and sends nothing more. | Low (wasted server work, held connections) | me | P2.7 |
| F85 | **FIXED in P2.8.** ~~The billing webhook trusted its payload, in arrival order.~~ Each event's claimed plan was written straight into the entitlement cache. RevenueCat retries a failed delivery up to 5 times over about 2.5 hours and may deliver twice, and its own docs recommend calling `GET /subscribers` after any webhook. So an old event arriving late overwrote newer state. Proven: a user who had just bought Pro read as free after an 80-minute-late retry of an old EXPIRATION. Worse, the header is a static secret, not a signature over the body, so anyone holding it could grant any plan to any account (proven: a forged INITIAL_PURCHASE made a free user Pro). Now a webhook reads only `app_user_id` and drops that user's cached entitlement, durably before RevenueCat hears 200 (a refused delete answers 503, so RevenueCat retries). The next read asks RevenueCat. This is idempotent and order-independent by construction, which a property test checks over random runs of events, duplicates and orders. The unread fields are no longer validated: a value we rejected (an event type over 64 characters, say) made RevenueCat retry and then drop the event. | High (entitlement integrity; the secret alone granted paid plans) | me | P2.8 |
| F86 | **FIXED in P2.8.** ~~The webhook secret compare leaked the secret's length.~~ `timingSafeEqual` needs equal lengths, so a guess of the wrong length returned early. It now compares SHA-256 digests of both sides: one 32-byte compare for every guess (checked for 6 lengths). | Low (a timing side channel on a shared secret) | me | P2.8 |
| F87 | **FIXED in P2.8.** ~~A RevenueCat lookup in flight could put an older answer back.~~ If a webhook or an account deletion dropped a user's cached entitlement while a lookup was in flight, the lookup cached its older answer when it landed. After a deletion, that re-created the deleted user's billing row (an F75-class gap). Proven on real Postgres: a `billing` row existed after `DELETE /account` had answered. Every drop now bumps the user's generation, and a lookup caches only if its generation is still current. Another user's lookup is unaffected. | Medium (deletion completeness; stale plans) | me | P2.8 |
| F88 | **FIXED in P2.9.** ~~No test for the token path's sameness.~~ The plan (P2.2) asks that unknown and revoked tokens take "the same code path" with "no timing leak on the token path". No test checked this, and I had not said so. Measured first: every rejected token takes 28–29 µs (the RSA verify dominates), revoked vs unknown-signer 0.8 µs apart; only a non-JWT string is faster (7.9 µs), which tells its sender nothing. `token-path.test.ts` now pins identical status, body AND headers for six kinds of rejected token, and the timing within 25 %. | Test gap (plan item not done) | me | P2.9 |
| F89 | **FIXED in P2.9.** ~~The fuzz never sent schema-valid input.~~ The plan (P2.4) says the fuzz is "driven by each zod schema: valid ⇒ expected status". `fuzz.test.ts` sends arbitrary bodies and checks only "never a 500, always the envelope, no internals"; it never builds a known-valid body and checks the success status. Half the item; I had not said so. `schema-valid.test.ts` now generates input from each of the 18 routes' own zod schemas and checks the exact status each handler's rule gives it; it found F91. | Test gap (plan item half done) | me | P2.9 |
| F90 | **OPEN: owner decision.** The plan (P2.6) says demo login, wildcard CORS and `http://` URLs "all refuse to boot" in production. P2.6 made only an `http://` `MAGIC_LINK_REDIRECT_URL` fatal; a set `DEMO_LOGIN_PASSWORD`, a `*` or `http://` CORS origin and an `http://` alert or coach URL are **warnings**. Why: `main` auto-deploys to Render, each of these is already blocked at request time (tested), and a new boot refusal on a dashboard value nobody can see from the repo could take the API down. To follow the plan literally, confirm none of these is set in the Render dashboard and say so; they become fatal in one small change. | Deviation from plan (owner's call) | owner | P2.9 or P8 |
| F91 | **FIXED in P2.9.** ~~`POST /api/v1/events` (public) mishandled names every object inherits.~~ `recordProductEvent` looked the event up on a plain object literal, so inherited names were "found". Proven on the old code: `toString`, `valueOf` and `__proto__` answered 200 and became their own series in `/metrics` (outside the allowlist); `constructor` or `hasOwnProperty` with a label answered **500** (`.includes` called on a function), and each 500 also pages the alert webhook. The P2.4 fuzz missed it: random strings never hit those exact names. Now only the allowlist's own keys count (`Object.hasOwn`). Swept the API for the same pattern: the only other keyed object literal (`guideOverrides[slug]` in the catalog) is keyed by the catalog's own static slugs, not request data. | Medium (an anonymous 500 and metric pollution on a public route) | me | P2.9 |
| F92 | **FIXED in P3.1** (`android.allowBackup: false`; the compiled manifest reads `allowBackup=false`). ~~Android Auto Backup was ON.~~ `app.config.ts` never sets `android.allowBackup`, and Expo's default is `true` (`@expo/config-plugins` `getAllowBackup`: `config.android?.allowBackup ?? true`); the generated manifest has `android:allowBackup="true"`. `expo-secure-store`'s `configureAndroidBackup` only EXCLUDES SecureStore's own data, so a Google backup or device transfer carries the rest: the plaintext AsyncStorage file, including the widget snapshot (monthly spend, the active count, the next renewal's name and amount, `src/widgets/widgetBridge.ts`), and the SQLCipher database WITHOUT its key (the key lives in SecureStore). What the app does on a device restored that way is not verified. | Medium (financial details leave the device in plaintext) | me | P3.1 |
| F93 | **FIXED in P3.1** (R8 minify + resource shrinking on; 82 % of DEX classes obfuscated; APK 74.8 → 64.1 MB). ~~The release build was not shrunk or obfuscated.~~ `android/app/build.gradle` reads `android.enableMinifyInReleaseBuilds`, default `false`, and nothing sets it, so R8 never runs (`minifyEnabled false`, no resource shrinking), and `proguard-rules.pro` holds only two keep rules. | Low (reverse engineering made easy; a larger APK) | me | P3.1 |
| F94 | **OPEN: observed once, not reproduced.** On the first R8 run, the Settings → Home currency sheet drew translucent: the Settings rows showed through the currency list (two captures, 4 s apart, so not mid-animation). The sheet's content sits on `c.surfaceCard`, which is opaque white (`palette.white`). It did NOT reproduce in 5 later attempts: the same R8 build 3 times (persisted state, a fresh install, and the exact first path: onboarding → Sign in → typed email → Add → Settings), once without R8, once with minify only. So it is not an R8 regression; the cause is unknown. Watch for it in P3.8's screen tests and P5's end-to-end runs. | Unknown (visual; once) | me | P3.8 / P5 |
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

### F44 — banned "automatic discovery" copy removed — 2026-09-30

**Scan:** a script (not a hand-typed grep; the Bash tool had mangled the first
attempt's `$` escape, and the empty result was suspicious) checked every `.ts` / `.tsx`
in the app, the website and the shared package for each banned phrase. There were 10
hits:

| Hit | Verdict |
|---|---|
| `app/open-banking.tsx:45` | Banned: fixed |
| `app/(tabs)/discover.tsx:655` | Banned: fixed |
| `app/paywall.tsx:257` | Borderline: owner decision, logged as F45 |
| `app/profile.tsx:95`, "We never see your bank login." | True: kept |
| Website FAQ / sections ("not in the background", "Background scanning: NONE", "no most-popular badge") | Truthful negations: kept |
| 2 code comments in `LockOverlay.tsx` | Not copy |

**The exact changes:**
- **`open-banking.tsx`**
  - Before: "Optional. A read-only connection that auto-discovers recurring charges.
    Zeno never sees your bank login — Plaid handles it, and we only receive
    transactions."
  - After: "Optional. A read-only bank connection through Plaid. You sign in to your
    bank on Plaid's screen, never Zeno's, and Zeno's server keeps the access token
    Plaid issues so it can fetch your recent transactions."
  - Why: "auto-discovers" is banned. "We only receive transactions" hid that the server
    holds the Plaid access token. The screen today only reads a transaction count, so
    even "finds recurring charges" would overclaim.
- **`discover.tsx`**
  - Before: "Connect Gmail or import a bank statement to automatically discover what
    you pay for."
  - After: "Connect Gmail or import a bank statement to find what you pay for."
  - Why: the scan runs when you connect or import, not automatically.

**Checks:**
- **Lint caught my first version:** raw apostrophes in JSX text trip
  `react/no-unescaped-entities`. They are now `&apos;`, as used in 18 other places in
  the app.
- lint 0 · typecheck 0.
- No test pinned the old text (grep).
- **Not verified on a device.** It is a two-line text change, and the emulator run is P5.

### P1.9a (part 3) — API remainder (agent, verified by me) — 2026-09-30

**Done by a parallel agent** (branch `worktree-agent-a85b38a9e67e7385f`, 5 commits), then
**merged and verified by me in `main`**:
- **Read every changed source line** in `pg.ts`, `sync.ts`, `billing.ts`, `coach.ts` and
  `family.ts` (a comment correction only).
- **Read the sync rollback in context:** `existing` is captured before the write, and the
  undo runs only if the stored record is still this one.
- **Re-ran all 10 bite checks myself in `main`** (8 bugs, 2 of them in two parts), each
  alone and then restored:

  | Mutation | Tests failing |
  |---|---|
  | retired key seals | 1 |
  | configured with only a retired key | 1 |
  | one bad namespace blocks the rest | 2 |
  | a non-durable push acked | 3 |
  | the rollback clobbering a newer change | 1 |
  | CANCELLATION caching Free | 3 |
  | "Bearer " in the configured secret | 2 |
  | expiry 0 meaning "never" | 1 |
  | model recommendations passed through | 2 |
  | "$" for a non-Intl currency | 1 |

**Coverage:** all six files at 100 % statements, branches and functions (before: coach
70 %, billing 72 %, family 90 %, sync 87 %, config 79 %, pg 93 % of statements).

**Tests added** (122):
- **Coach:** provider selection, and the exact request sent to each provider (only
  schema-allowed fields, data fences stripped).
- **Billing:** RevenueCat mapping and the cache boundary.
- **Family:** share-code generation with scripted random bytes; the owner leaving,
  handover and disbanding.
- **Sync:** last-writer-wins, per-user isolation, the cap, and durability.
- **Persistence:** a restart round trip for billing, family and sync.

**Reported by the agent, not fixed here** (checked by reading, and assigned):
- **The `app.ts` webhook schema** rejects RevenueCat's documented
  `expiration_at_ms: null` (lifetime) and `entitlement_ids: null` with a 400, and a
  timestamp of 9e15 or more reaches a 500 through a date error. `app.ts` is my file, so I
  will verify and fix it as F54 in the next slice.
- **Sync compares vector clocks by their SUM,** against standards section 10 ("never
  collapsed to a scalar"). Concurrent edits are then decided by the larger total, or by
  arrival order on a tie. The agent pinned this with an honestly named test. It belongs
  in the P2 design.
- **Sync, smaller points:** the global sequence counter leaks the write count across
  users; "rejected" cannot tell "lost to a newer write" from "not saved"; and two
  concurrent pushes can land in Postgres out of order. All P2.
- **`pg` at boot with the database unreachable** logs "in-memory only", but writes still
  go to Postgres against empty memory. Making it truly memory-only would drop logout and
  revocation writes. **Owner decision, P2/P8.**
- **Coach config:**
  - A mistyped `COACH_PROVIDER` silently falls back to picking by key.
  - `render.yaml` pins `COACH_PROVIDER=anthropic` while calling Groq the free fallback.
  - The section 14 processor list names Groq but not Anthropic, the default provider.

  All go to the owner and the docs (P8).
- **Coach logs:** V8's JSON-parse error message includes about 20 characters of the
  model's output, logged at warn level. A small section 6 leak, for P2.
- **Billing webhooks are applied as the WHOLE entitlement state,** though each event
  covers one product. For example, the old Pro expiring after an upgrade to Family caches
  Free for up to 10 minutes. P2.

**Gates in `main` after the merge:** typecheck 0 · lint 0 · vitest 100 files / 1285
tests (ratchet 95.86 / 90.69 / 97.04 / 96.21) · semgrep `apps/api` 0 / 0.

### P1.9c — the shared package (agent, verified and corrected by me) — 2026-09-30

**Done by a parallel agent** (branch `worktree-agent-a7916dff8a0bbd31e`, 13 commits), then
**merged, verified and corrected by me in `main`**.

**What I checked:**
1. **Read every changed source line in all 10 source files.** The new required
   `excludedCurrencyCount` fields on the business and vault summaries are only produced
   by these functions, and the full typecheck confirms every caller.
2. **Found a regression that the agent's tests did not cover.** The new CSV quote rule
   ("a quote opens a section only as a field's first character") broke `a, "Netflix,
   Inc.", 15.49`, a space after the comma. I proved it by running the OLD and NEW
   parsers side by side on three shapes: the new one split the name at its comma and
   shifted the amount column. I corrected the rule so that spaces or tabs before the
   quote still open a section, with that padding dropped, and added 2 tests.
   - The agent's parser fails my padding test.
   - The pre-agent parser fails both new tests: it kept the leading space, and a
     literal quote swallowed the file.
   - Restored: 44 / 44.
3. **File-level bite checks myself.** Each fixed file, put back to its pre-agent version
   alone, fails its new tests: parse-utils 10 (including my 2), keys 1, twin 2, coach 8,
   snapshot 5, business 3, vault 3, history 1. The 2 refactor-only files
   (`renewal-plan`, `price-radar`), put back the same way, still PASS every new test.
   That proves their dead-branch removals did not change behaviour.

**Coverage:** all 14 files at 0 uncovered statements, branches and functions.
**Tests:** 142 in 14 new `*.more.test.ts` files, plus my 2 CSV tests. They cover:
- CSV: CRLF / LF / CR, quoting, BOM, formula-looking cells kept verbatim, a
  1,000,000-character field, sign forms, separators and rounding.
- Currency honesty across coach, twin, widget, business, vault, history, and year in
  review.
- UTC date walks.
- Key previews that cannot leak a secret or hash.

**Reported by the agent, not fixed here:**
- **F64 (above)**, the store passing no `fx` until rates load. This is the root of
  several currency issues.
- **Lenient `Date.parse` (F21) confirmed at every site:** `"2026-02-30"` becomes 2 March,
  and non-ISO strings are read as local time. Only NaN results were guarded. A strict
  shared parser is P6.
- **Renewal-plan quiet hours (latent: the store passes no preferences):** an equal start
  and end reads as a 24-hour window; minutes are ignored; `"22abc"` is accepted.
- **Price radar:** `PriceHistoryEntry` has no currency, so a currency change looks like a
  huge hike.
- **Unused exports:** `normalizeMerchant` has no caller; `canUseScope` is used only in
  tests.
- **CSV limits:** comma-only delimiter (EU semicolon exports read as one column); no
  CR/DR suffix handling; `"-0.00"` returns -0.
- **Screen follow-ups:** `spend-twin.tsx` shows the empty state when only the rate is
  missing; `widgets.tsx` should show `excludedCurrencyCount`.
- **Pre-existing type error:** `analytics.test.ts` uses `"JPY"`, which is not a
  `CurrencyCode`.

**Gates in `main` after the merge and my correction:** typecheck 0 (this also rebuilds
the shared `dist` that jest reads) · lint 0 · vitest 114 files / 1429 tests (ratchet
96.85 / 94.0 / 97.4 / 97.15) · jest 8 suites / 113 tests at 100 % · semgrep
`packages/shared` 0 / 0 · **website production build OK**, since the website consumes
the shared package.

### P1.9b (part 2) — mobile logic utilities (agent, verified by me) — 2026-09-30

**Done by a parallel agent** (branch `worktree-agent-a11af566efdfe4993`, 8 commits), then
**merged and verified by me in `main`**.

**What I checked:**
- **Read every changed source line** in `subscription-ui`, `calendarUtils`,
  `insightsEngine` (270 lines), `budget`, `api/config` and `seed-subscriptions`.
- **Checked the new `rollRenewalForward` loop.** Its starting candidate is in today's
  month or earlier, so the uncapped `while` runs at most once, and a NaN date falls
  straight through.
- **Checked the removed `.slice(0, 8)` in `generateInsights`.** The loop returns at 8,
  so fewer than 8 always remain after it: the old slice was a no-op.
- **Confirmed the seed slug by an actual catalog lookup,** not a grep (a first grep
  missed it because slugs are generated from names): `duolingo-plus` returns "Duolingo
  Plus" and `duolingo-super` returns null.
- **File-level bite checks myself:** each fixed file, put back to its pre-agent version
  alone, fails exactly its bug tests: subscription-ui 3, calendarUtils 7,
  insightsEngine 13, budget 4, api/config 2, seed 1. All restored.
- **Ran the mobile and shared suites under `TZ=UTC`** (what CI uses) as well as local
  time (+05:30): 82 files / 1019 tests pass.

**Coverage:** 7 files at 100 / 100 / 100. `insightsEngine.ts` is at 100 % statements and
functions and 99.4 % branches; the one open branch is `insight.subscriptionIds ?? []`, a
defensive default the `Insight` type requires.

**Tests:** 125 in new files: `subscription-ui.behavior`, `calendarUtils.behavior`,
`insightsEngine.behavior`, `budget.behavior`, `format.behavior`, `api/config`,
`seed-subscriptions` and `open-banking`. Timezone cases switch `process.env.TZ` and
restore it by name.

**Reported by the agent, not fixed here:**
- **The same root currency issue as F64:** the store passes no `fx` until rates load, and
  `calendar.tsx` sums on its own. It is the next slice.
- **F21 lenient date parsing confirmed:** `"2026-02-30"` becomes 2 March, and non-Z
  strings are read as local time. This belongs to the strict shared parser (P6).
- **Dates are displayed in device time while countdowns use UTC days,** so the two can
  differ by a day. The add screen saves `toISOString()` straight from a device-time
  picker, so both must change together. P3.
- **Dark mode gets the light accent colours:** `zenoLight` and `zenoDark` share `id:
  "millennial"`. A design call.
- **`detectUnused` can never fire:** nothing sets `lastUsedDate`.
- **Remaining "$0" figures** for trial and unknown-cycle plans in duplicate,
  cancellation and summary copy. A copy decision.
- **Database rows are not validated on read** (`subscription-repository` `mapRow`): a
  malformed currency code would make Intl throw during render. P3.
- **A production build without `PUBLIC_API_BASE_URL` falls back to cleartext
  `http://127.0.0.1`.** The release profiles set https (now tested in P1.9d), but the
  fallback remains. P3.
- **Copy nits:** "Trial ends in 1 days", "across 1 subscriptions", sentences starting
  in lowercase.

**Gates in `main` after the merge:** typecheck 0 · lint 0 · **vitest 122 files / 1554
tests: statements 100 %, branches 99.61 %, functions 100 %, lines 100 %** · jest 8 suites
/ 113 tests at 100 % · UTC run 1019 / 1019 · semgrep `apps/mobile/src` 0 findings (1
pre-existing parse warning in `emailScanner.ts`).

### F54 — the billing webhook accepts RevenueCat's nulls — 2026-09-30

**Reported by the P1.9a agent; verified by me before any change:**
- **Read RevenueCat's own field docs** (quotes in the F54 row).
- **Wrote the test first and ran it on the current code:** a lifetime event
  (`expiration_at_ms: null`) got **400**.

**The fix** (`app.ts` `revenueCatWebhookSchema`): `.nullable()` on `entitlement_ids` and
`expiration_at_ms`, plus `.max(8_640_000_000_000_000)` on the timestamp. `billing.ts`
already handles null in both places (`?? []`, and the `typeof === "number"` check from
F51).

**Test** (`app.routes.test.ts`, "F54: ..."):
- A `NON_RENEWING_PURCHASE` with a null expiry returns 200 **and** caches Pro, active,
  with `expiresAt: null`.
- An `INITIAL_PURCHASE` with null entitlements returns 200 and stays free.
- A timestamp of 9e15 returns 400.

**Bite checks, both halves separately:**
- The old schema: the test fails (400 instead of 200).
- Nulls fixed but no upper bound: the test fails with **500** instead of 400.

Both restored. Gates: typecheck 0 · lint 0 · vitest 122 files / 1555 tests at 100 % /
99.61 % / 100 % / 100 %.

### F74 — a critical Next.js advisory blocked CI; upgraded to 16.3.6 — 2026-09-30

**What happened:** CI went red on `f9fc575` (the P1.9b part 2 merge) and `0356474` (F54),
although every local gate had passed. I read the failed job on GitHub instead of
assuming.
- The ONLY failing step was **"Dependency audit (blocking, with expiring
  allowlist)"**.
- It is the job's LAST step. Every earlier step passed on GitHub for those commits:
  Typecheck, Lint, Test, the jest floor, the coverage floor, Build web and SBOM. So the
  code in those commits is CI-verified; only the new advisory failed the run.
- Reproduced locally: `node scripts/audit-gate.mjs` reported
  `BLOCK CRITICAL next GHSA-vcvr-r3jv-pc5j`.

**Assessment, from the advisory itself:** exploitation needs the Node.js `ImageResponse`
from `next/og` with attacker-controlled SVG values. The Edge runtime is not affected.
There is no use of `next/og` anywhere in `apps/web`, so this was not exploitable in our
app. The upgrade is still the right fix, because the vulnerable code shipped with the
dependency.

**The upgrade:** `next` 16.3.3 → **16.3.6** (`apps/web/package.json` floor `^16.3.6`).
The lockfile diff touches only `next` and its own `@next/*` platform packages, all
16.3.3 → 16.3.6. I chose 16.3.6 over the newer 16.3.8 because 16.3.8 was published
today, inside the repo's 7-day cooldown, and 16.3.6 is the minimum fixed version.

**Verified:**
- The audit gate passes: 0 critical; the 1 remaining high is the already-accepted,
  expiring `image-size` build-time entry.
- Web typecheck 0 · web lint 0 · web tests 7 files / 64.
- `next build` on 16.3.6: compiled, 532 / 532 static pages.

### F64 — the store always passes an FX context — 2026-09-30

**The bug:** flagged independently by two agents (P1.9b and P1.9c), then confirmed by me
in `subscription-store.tsx`. `fx` was `undefined` until the first exchange-rate table
loaded (first launch, offline). Every consumer then took its "no fx" branch and added
different currencies' raw minor units under the home currency's symbol: $10 + ₹999 read
as "$1,009.00". The consumers were `createSpendSummary`, analytics, history, Year in
Review, calendar, budget, insights, and the store's own `totalMonthlyMinor`.

**The fix:** `fx` is always `{ homeCurrency, rates: exchangeRates ?? {} }`, and the type
narrowed from `FxContext | undefined` to `FxContext`. `convertMinor` is the identity for
the same currency even with no rates, so home-currency amounts count as before, and any
other currency returns `null` and is excluded and counted.
`exchangeRatesAvailable` still reports whether real conversion is possible (Settings
uses it). Every screen that reads the count (dashboard, analytics, calendar, budget,
coach) already renders "N subscription(s) in other currencies not included", so the
disclosure now appears before the first rate fetch too, and it is true. The now-unused
`monthlyAmount` import was removed.

**Test** (`subscription-store.rntest.tsx`, "F64: ..."), for a USD home currency with a
$10 plan and a ₹999 plan and no rate table:
- `fx` is `{ homeCurrency: "USD", rates: {} }`, and `exchangeRatesAvailable` is false.
- `totalMonthlyMinor` is 1000, not 100900.
- `spendSummary.totalMonthlyMinor` is 1000, with `excludedCurrencyCount` 1.

**Bite check:** with the old store, the test fails (`fx` is `undefined`); restored,
33 / 33 at 100 %.

Gates: typecheck 0 · lint 0 · vitest 122 files / 1555 tests at 100 / 99.61 / 100 / 100 ·
jest 114 / 114, all floors at 100 %.

### P1.11 — the P1 gate — 2026-09-30 — PASSED

| Gate | Required | Measured | Evidence |
|---|---|---|---|
| Tier 1 statements | 100 % | **100 %** (3947 / 3947) | `npx vitest run --coverage`, and the ratchet in `vitest.config.ts` now enforces it in CI |
| Tier 1 functions | 100 % | **100 %** (807 / 807) | same |
| Tier 1 lines | 100 % | **100 %** (3671 / 3671) | same |
| Tier 1 branches | ≥ 95 % | **99.61 %** (2604 / 2614) | same; the 10 open branches are listed below |
| jest-owned files | 100 % per-file floors | **100 %** on all 6 (budget-store, subscription-store, theme-provider, LockOverlay, motion, useZenoTokens) | `npm run test:rn:coverage`, 114 tests |
| GitHub | green | **CI and CodeQL success** on `1a99ce9` | CI run 36744248345, CodeQL run 36744248343 |

**The 10 open branches, all defensive and documented where they are:**
- `routes/auth.ts`, 7 arms on lines 288, 324, 332, 458 and 943: `?? ""` fallbacks after
  zod `.refine()` guarantees, a non-Error `String(error)`, and one env-read fallback.
- `plaid.ts:132`: `?? null` forced by TypeScript's lib on `maximumFractionDigits`.
- `config/site.ts:29`: `split("/")[0] ?? ""` under `noUncheckedIndexedAccess`.
- `insightsEngine.ts:392`: `insight.subscriptionIds ?? []`, a default the `Insight` type
  requires.

**What P1 found and fixed:** F9, F10, F12, F13, F17, F20, F22, F23, F24 and F26-F74, apart
from those still open. Each fix has a test that fails on the old code (bite-checked),
and each merged agent branch was re-verified by me in `main`.

**Still open, carried to later phases or to the owner:**
- **Owner:** F2 and F3 (confirm the Render deploy and the client IP), F7 and F8 (branch
  protection and GitHub security settings), F45 (the paywall's "we never see your
  bank"), F25 (how to present catalog `/account` links).
- **P2:** sync vector-clock semantics, the pg boot-time memory-only question,
  per-product webhook semantics, coach log hygiene.
- **P3:** F11 (Google on Android), F14, F16, dates shown in device time vs UTC, DB row
  validation on read, push FCM config, the cold-start notification tap.
- **P4 / P6:** F1 and F15, F21 (a strict date parser), CSP nonces.

**A note on CI going red today.** Two runs (`f9fc575`, `0356474`) failed ONLY at the
last step, the dependency audit, because a new critical Next.js advisory was published
today. Every code step passed on GitHub. It was fixed in F74 (Next 16.3.6), and CI has
been green since.

### P2.1 — the API against a real Postgres (F75) — 2026-10-01

**The database, chosen after checking the machine.** No Docker, `psql` or `pg_ctl` here,
so:
- **Locally: PGlite** (`@electric-sql/pglite` 0.5.8), which is PostgreSQL 18.3 compiled
  to WebAssembly, behind its wire-protocol server (`@electric-sql/pglite-socket`
  0.2.11, `maxConnections: 16`), on an ephemeral port.
- **In CI: a real `postgres:18-alpine` server** as a service container, pinned by digest
  (`sha256:77f585...1873`) and on the runner's loopback with trust auth, so no password
  string is in the repo. The job exports `TEST_DATABASE_URL`.

Either way the API uses its OWN `pg` pool and SQL through an ordinary `DATABASE_URL`;
nothing of `storage/pg.ts` is mocked. Before relying on it, I proved it with a probe:
port 0 reports the real port, and 5 concurrent upserts through the real pool leave 1
row.

**Supply chain:** both packages are from ElectricSQL, Apache-2.0, last published
2026-08-26 (past the 7-day cooldown), and dev-only. The lockfile also gained PGlite's own
extension packages (age, pgvector, pgtap, and others): all Apache-2.0, all from the npm
registry, all dev-only.

**`storage/real-pg.test.ts`** (10 tests). Every "restart" is a fresh module graph that
rebuilds ONLY from the database, as a deploy does.
1. **In CI it asserts a real SERVER** (`kind: "server"`, and `version()` without
   "PGlite"), so a green CI run proves the server path ran. Faked locally with
   `CI=true`, it fails: "expected 'pglite' to be 'server'".
2. **Schema from an EMPTY database:** the table, the column types and nullability, and
   the `(namespace, key)` primary key. A second boot is idempotent.
3. **Upsert:** 5 concurrent writes of one key leave one row, and a raw duplicate insert
   is rejected.
4. **Restart round trip for every store:** a refresh session, a household, a sync
   record, an entitlement, and the bank token, which is stored ONLY sealed (no
   plaintext in the row).
5. **Account deletion:** once `DELETE /account` answers, **no row of the user remains
   in any namespace** (all 7 were checked populated first). The other user keeps their
   session, sync row, and the shared household, which is now theirs.
6. **F75, slow database:** the unawaited writes take 500 ms, and the rows are checked
   the instant the API answers.
7. **F75, refused sync delete:** 503, logged without the account id; the retry removes
   rows memory had already forgotten.
8. **F75, refused household rewrite:** 503, memory is put back, and the retry removes the
   user.
9. **The refresh-token race:** two concurrent refreshes of one token, exactly one 200.
   After a restart the replayed token is 401 and the winner works.
10. **Concurrent sync replays:** one entity, one row, one version, before and after a
    restart.

**Bite checks** (each alone, then restored):
- The old fire-and-forget route: test 6 fails (billing, family, plaid and sync rows
  left).
- Sync deletion driven from memory, key by key: test 7's retry leaves rows.
- The household restore removed: test 8 fails.

**The fix, file by file:**
- `pg.ts`: `kvDeleteAwait` returns a boolean, and a new `kvDeleteByValueField` does one
  parameterised `DELETE ... WHERE namespace = $1 AND value->>$2 = $3`.
- `billing` / `plaid` deletes are awaited.
- `sync` deletes by `userId` in SQL.
- `auth` revocation deletes by `accountId` in SQL, per namespace.
- `family` awaits, and undoes on refusal.
- The route awaits all five steps and answers 503 on any refusal.

**Tests I rewrote** because they pinned the old per-key, fire-and-forget calls. None was
loosened; each now asserts the new durable call AND the resulting table state:
- The billing, family, sync and plaid persistence fakes gained the durable functions.
- The auth-internals revoke test now asserts one by-field delete per namespace.
- The sync test gained a retry-finds-orphan-rows case.

**Unit tests for the new branches:**
- `kvDeleteAwait` true or false.
- `kvDeleteByValueField`: no database, the exact SQL and params, and failure for an
  Error and a non-Error, never logging the value.
- Family: all durable; a refused shared rewrite restores and the retry succeeds; a
  refused solo delete brings the household and its share code back; a household
  replaced mid-write is not overwritten by the stale copy.

**Checks:**
- The real-PG suite: 10 / 10, run three times locally.
- Gates: typecheck 0 · lint 0 · vitest 123 files / 1570 tests at 100 % / 99.61 % /
  100 % / 100 % · jest 114 / 114 · semgrep (API + workflows) 0 · audit gate PASS.

**Open:** P2.1 is marked done only after CI passes with the server-mode assertion.

### P2.1 — done — 2026-10-01

**CI went red once, and it was my own process slip.** The first P2.1 push (`cfdcd77`)
failed CI's **Typecheck** on the server-mode test I added: under
`noUncheckedIndexedAccess`, `const [{ version }] = ...` can be `undefined`. I had added
that test after my last full local typecheck and then only ran Vitest. It was fixed in
`229e114`.

**The rule since then:** every gate is re-run after the final edit, with
`tsc -b --force`. This caught two more problems before the F76 commit (below). The rule
is also saved in memory.

**Green on GitHub:** CI 36763417730 and CodeQL 36763417620 on `229e114`. That run
includes the server-mode assertion, so it proves the real-PG suite ran against a real
`postgres:18-alpine` server in CI.

### P2.2 (part 1) — F76: a deleted account's access tokens are revoked — 2026-10-01

**Found while designing the authorization matrix** (a "revoked token" row). Proven with a
probe BEFORE any change: after `DELETE /account` answered 200, the same access token
could still:
- `sync/push`, which returned 200 and `accepted: 1`;
- `sync/pull`, which returned the pushed change;
- `family/create`, which returned 200.

All of that was persisted, for an account just deleted, and it stays possible for the
token's remaining lifetime (up to 15 minutes).

**The fix** (`routes/auth.ts`, `app.ts`):
- **The cut-off:** `revokeAccessTokensForAccount` persists a cut-off
  `{ revokedAtSeconds }` under `sha256(accountId)`, and only then applies it in memory.
- **The check:** `verifyAccessToken` rejects a token for that account whose `iat` is at
  or before the cut-off. A token with no `iat` is treated as issued at 0, so it fails
  closed. A token issued later is accepted, for example the same email signing up
  again.
- **Order inside `DELETE /account`:** the cut-off is set only AFTER every data step is
  durable. My first version set it inside the session revocation, and the F75 retry
  tests caught that it locked the user out of retrying after a 503. A refused save of
  the cut-off also answers 503 and changes nothing.
- **Restart and sweep:** a hydrator restores cut-offs on boot, and the sweep removes
  each one once `accessTokenTtlSeconds` have passed.

**Tests:**
- **Unit tests** (`auth-internals.test.ts`, +4):
  - Rejected: at the cut-off, in the same second, with no `iat`. Another account is
    unaffected, and a later token works.
  - The record is a 64-hex key holding a timestamp only, with no account id.
  - A refused save returns false, and the old token still works (the retry path).
  - The cut-off survives a restart (garbage rows ignored). A sweep KEEPS it while
    older tokens could be live, and deletes it after 16 minutes.
- **Real Postgres:**
  - After deletion, the old token gets 401, and exactly one `auth_revoked` row exists
    with a hex key and `{ revokedAtSeconds }`.
  - **After a restart** the old token still gets 401 on `sync/push`, and no sync row is
    written.
- **`app.test.ts`:** the test that pinned the bug now asserts 401 on pull, push and
  family create for the deleted account, and checks the stores directly to confirm the
  data is gone.

**A test that proved nothing, caught by the bite check.** With the verify check
removed, the real-PG restart test still PASSED. The cause: without `JWT_PRIVATE_KEY`,
each boot generated an ephemeral key pair, so after a "restart" every old token failed
on its signature, revoked or not. The suite now sets fixed signing keys, as production
does. Re-bitten with the check removed: the restart test and the no-row-remains test
both fail (2 / 11); restored, 11 / 11. The other restart tests were unaffected, because
they use refresh tokens, which are random values, not JWTs.

**Bite check (whole API suite):** with the verify check removed, 4 tests fail (the app
test, 2 unit tests, the real-PG deletion test); restored, 428 / 428.

**Gates after the final edit** caught two more problems, both fixed before committing:
- A nested destructure that `noUncheckedIndexedAccess` rejects.
- Branches fell to 99.58 %, below the ratchet, because the sweep's "keep" arm was
  untested; that test is now added.

Final: `tsc -b --force` 0 · lint 0 · vitest 123 files / 1576 tests at 100 % / 99.62 % /
100 % / 100 % · jest 114 / 114 · semgrep `apps/api` 0 / 0.

**Still open (P2.2):** the matrix itself, every protected route against every token
attack. Logout does not revoke the ACCESS token (only the refresh token, at once); that
is the stateless design, and closing it would need a `sid` claim or a denylist. It will
be a row in the matrix, with a decision for the owner.

### P2.2 (part 2) — the authorization matrix — 2026-10-01

**`apps/api/src/authz-matrix.test.ts`** (20 tests), table-driven from the LIVE routes. It
parses Fastify's `printRoutes()` tree: 40 routes, with HEAD and the CORS `*` excluded (corrected from "38" in the P2 gate entry).
Adding the `onRoute` hook after `buildApp()` saw nothing (the routes were already
registered), and parsing the tree avoided changing production code for a test.
1. **Inventory in both directions:** every registered route has an `ACCESS` row
   (`public` / `own-auth` / `token`), and every row is still registered. A new route
   cannot ship without deciding who may call it, and it is then covered by everything
   below automatically.
2. **Deny by default:** every `token` route gets 401 with no credentials.
3. **Eleven attacks × every token route** (18 routes), each 401 with ONE identical body
   (`UNAUTHORIZED` / "Missing or invalid access token."), so nothing reveals which
   check failed:
   - no header, an empty bearer, the wrong scheme (Basic), garbage;
   - expired, wrong issuer, wrong audience;
   - `alg: none`, HS256 signed with the server's PUBLIC key, a foreign RSA key;
   - a DELETED account's token (F76).
4. **Positive control:** a genuinely valid token is never rejected by the guard on any
   token route.
5. **Public routes** answer without a token.
6. **The webhook** rejects no secret, a wrong secret, and a USER token (not its
   credential), and accepts the real secret.
7. **Metrics** are open outside production, and 401 in production without
   `METRICS_TOKEN`.
8. **Households:** a stranger gets 403 on read, spend and leave, with identical bodies,
   and the household is untouched. An unknown id is 404.
9. **Sync** is scoped to the token's account.
10. **Logout, the KNOWN GAP F77,** is pinned by name: the refresh token dies, the access
    token lives until expiry.

**Bite checks on the matrix** (each alone, then restored; re-run after a refactor, same
result):
- A new route with no row: the inventory fails.
- A token route made public (`/api/v1/account` added to `PUBLIC_ROUTES`): 12 fail.
- A different body for a missing header: that attack fails.
- The household membership check dropped: the household test fails.

**My own mistakes, caught before commit:**
- The empty `onRoute` inventory.
- The sign-in route's own 5/min limit throttling the suite; each sign-in now uses a fresh
  instance (the stores are shared, the limiter is not).
- The Bash tool collapsing a `\n`.
- `inject()` option types that only `tsc` caught (Vitest does not typecheck), fixed with
  one typed request helper.

**Not covered here, on purpose:** timing. The guard always runs `verifyAccessToken`,
whatever was sent (the CodeQL-driven design), so there is no separate fast path to time.

Gates after the final edit: `tsc -b --force` 0 · lint 0 · vitest 124 files / 1596 tests
at 100 / 99.62 / 100 / 100 · jest 114 / 114 · semgrep `apps/api` 0.

### P2.2 — done — 2026-10-01

Green on GitHub: CI 36764785079 and CodeQL 36764784910 on `8d4b5f0` (the matrix).

### P2.3 — rate limits per route (F78, F79) — 2026-10-01

**`apps/api/src/rate-limits.test.ts`** (43 tests), table-driven from the LIVE routes. The
route-tree parser now lives in `route-inventory.testutil.ts`, shared with the matrix.
- **Inventory:** every registered route has a `LIMITS` row, and every row is
  registered.
- **The strictest limit (5/min)** belongs exactly to sign-in (`magic-link`, its legacy
  twin, demo login, logout) and account deletion.
- **Each of the 39 IP-keyed routes** (on a fresh app, so each has its own limiter):
  - the declared maximum is served;
  - the next request is **429** with our envelope (`RATE_LIMITED`, `data: null`), a
    positive `Retry-After`, and `x-ratelimit-limit` equal to the declared maximum;
  - another IP is unaffected.
- **The coach:**
  - Keyed by ACCOUNT: 10 requests from 10 different IPs, then the 11th from yet
    another IP is 429; another account from the same IP is unaffected.
  - An unauthenticated flood is limited per IP: ten 401s, then 429 with our envelope;
    another IP is unaffected.

**What the table found:** building it exposed F78 and F79 (above). Both were probed
before any change.

**The fixes:**
- **F78:** the auth guard moved from `onRequest` to `preParsing`; the hook now returns
  `payload`.
- **F78, the coach:** `accountRateLimitKey` verifies the bearer itself: its account when
  the token is valid, otherwise the IP. The limiter runs in `onRequest`. My first
  attempt stacked a second, per-IP limiter on the route; the account test caught that
  the plugin then silently SKIPS the second one (it applies only one per request), so
  it was replaced by the single per-request key.
- **F79:** `app.setErrorHandler(...)` moved to directly after `Fastify()` is created.

**New tests:**
- F79: malformed JSON on `/auth/refresh` returns exactly our 400 envelope with no
  `FST_` text. An unexpected error thrown inside `/auth/logout` returns our 500
  envelope, never its message, and posts one monitoring alert.
- The key function: no token, a forged token, or the wrong scheme → keyed by the IP.
  The valid-token → account path is covered by the coach account test.
- The matrix now gives each test its own client IP. Rate limits now count
  unauthenticated requests (F78), and that suite is about authorization.

**Bite checks** (each alone, then restored):
- The guard back in `onRequest`: 19 fail (every token route's 429).
- The coach back on the after-auth account limit: 1 fails (the unauthenticated flood).
- The error handler set after the auth routes: 11 fail (the auth routes' 429 envelope,
  and both F79 tests).

**Per instance, not global:** without `REDIS_URL` every limit is per API process. The
app limiter cannot replace an edge limiter or WAF in front of the API at scale; that is
recorded for P8 (owner).

**Observation, not changed:** the RevenueCat webhook is limited to 30/min per source IP.
Every event from RevenueCat shares its IPs, so at real volume legitimate events could
be refused. RevenueCat retries them, and the entitlement read also re-verifies. Size it
before launch (P8).

Gates after the final edit: `tsc -b --force` 0 · lint 0 · vitest 125 files / 1641 tests
at 100 / 99.62 / 100 / 100 · jest 114 / 114 · semgrep `apps/api` 0.

### P2.3 — done — 2026-10-01

Green on GitHub: CI 36765749331 and CodeQL 36765749502 on `73766ff`.

### P2.4 — property-based fuzzing of every route — 2026-10-01

**Dependency:** `fast-check` 4.10.2 (MIT, by its author; published 2026-09-19, past the
7-day cooldown) and its own `pure-rand`. Both are dev-only.

**`apps/api/src/fuzz.test.ts`** (4 tests) runs over the LIVE route inventory (40 routes; corrected from "38" in the P2 gate entry):
1. **Arbitrary input:** JSON values of any shape and depth, including hostile keys and
   binary strings; random query strings; with or without a valid token (signed directly
   with a fixed test key, so the fuzz reaches the handlers behind the guard).
2. **The properties checked on every answer:**
   - the server **never answers 500**;
   - every answer is the API's envelope (`data`, `error`, `meta.requestId`), with
     Prometheus text accepted only for authorised `/metrics`;
   - no answer contains internals: framework `FST_` codes, stack frames,
     `node_modules`, `ZodError`, or Postgres's own error phrasing.
3. **Every client IP is unique,** so rate limits never mask a handler.
4. **Prototype poisoning** (`__proto__`, `constructor.prototype`, a nested `__proto__`)
   is rejected **at the parser** on every body route: 400 "Malformed request.", before
   any handler, and `Object.prototype` is never touched. This is pinned explicitly
   with `onProtoPoisoning: "error"` / `onConstructorPoisoning: "error"` in `buildApp`.
   Those are Fastify's defaults today; stating them means a future default change
   cannot silently remove the protection.
5. **Unusual input:** JSON nested 10 000 levels deep, null bytes, RTL overrides and
   emoji on every body route never produce a 500 or a leak.

**Reach:** a status tally (`FUZZ_STATS=<file>`) confirmed the fuzz gets past the guard
and validator. 16 routes answered 2xx, alongside 400s, 401s and 503s (the unconfigured
upstreams).

**Runs:** `FUZZ_RUNS` sets runs per route: 200 in every CI run (about 4 s), and
**10 000 nightly** in the new `.github/workflows/nightly-fuzz.yml` (SHA-pinned actions,
read-only permissions, a 45-minute timeout). Locally, 10 000 per route (about 380 000
requests) passed in 2 min 49 s. `FAST_CHECK_SEED` replays a failure exactly: two runs
with seed 12345 and a planted failing check reported the identical seed and path.

**The one failure it produced was MY detector, and was investigated, not dismissed:**
- **What happened:** one run failed. I had not saved its output, so I looped the suite
  (up to 40 runs) until it failed again, on run 3.
- **The counterexample:** fast-check shrank it to the account id `" pG "`. `/account`
  legitimately echoes that id, and every envelope contains an `"error"` key, so my
  loose `/\bpg\b.*error/i` pattern matched harmless user data.
- **The fix:** leak patterns now match Postgres's actual error phrasing, and fuzz
  account ids come from a plain alphabet, so an echoed id cannot imitate a pattern.
- **Afterwards:** 26 more clean runs.

**Bite checks, planted bugs** (each alone, then restored):
- A crash on one input shape (an array body with 2+ items on `/events`): caught, with
  the shrunk counterexample `[["",0],...]` answering 500.
- A stack trace leaked in a 400: caught (`node_modules` in the body).
- A naive merge that pollutes `Object.prototype`: **not reachable**, because the parser
  already rejects the payload. So the test now asserts the parser-level rejection
  itself. With the protection turned off (`"ignore"`), the poison reaches the handler
  and the test fails.

Gates after the final edit (which caught a duplicated `headers` key that only `tsc`
flags): `tsc -b --force` 0 · lint 0 · vitest 126 files / 1645 tests at 100 / 99.62 /
100 / 100 · jest 114 / 114 · semgrep (API + workflows) 0 · audit gate PASS.

### P2.4 — done — 2026-10-01

Green on GitHub: CI 36767472709 and CodeQL 36767472774 on `eea3f24`. The nightly
workflow first runs at 03:17 UTC; its result is checked in a later session.

### P2.5 — error and log hygiene — 2026-10-01

**`apps/api/src/log-hygiene.test.ts`** (3 tests) runs the **production** logger options
(`buildLoggerOptions({ NODE_ENV: "production" })`, the exact ones `start.ts` passes, at
debug level so more lines are written). Every JSON line goes into memory, and every
`console.*` call made meanwhile is captured.
1. **Every secret a client can send carries a unique `MARK` marker:**
   - a valid bearer (with a marker inside its payload) and a forged bearer;
   - a cookie;
   - a magic-link token and code in the query string;
   - a refresh token, and a correct and a wrong demo password, in the body;
   - the correct and a wrong webhook secret;
   - a server error thrown while a bearer and a query secret are in flight.

   **No marker appears in any pino line or console call.** The test also checks the
   logger really wrote lines (more than 10).
2. **Requests are logged by path only:** the "incoming request" lines hold only the path
   (no query string, no search term), and the 500 is logged at error level with its
   `reqId`.
3. **Error bodies:** a 401, a 400 from validation, a 404 from the route, a 404 from the
   not-found handler, a 400 from the parser, and a 500 whose error carries a fake stack
   and file path. Each one's `meta.requestId` equals its `x-request-id` header, and none
   contains the stack, a module path, or the internal message.

**Bite checks** (each alone, then restored):
- The request line logging the full URL (the old F9 bug): 2 fail.
- Headers logged with the redaction list emptied: the bearer is caught.
- A handler logging its own body (`request.log.info({ body })` in demo login): the
  password is caught.

**Nothing leaked on the current code.** The P1 fixes (F9 query-string logging, F31
upstream text, F33 client errors, F79 the auth routes' error handler) hold under the
real production configuration. No new finding in P2.5.

Gates after the final edit: `tsc -b --force` 0 · lint 0 · vitest 127 files / 1648 tests
at 100 / 99.62 / 100 / 100 · jest 114 / 114.

### P2.5 — done — 2026-10-01

Green on GitHub: CI 36768319235 and CodeQL 36768319305 on `d5716ed`.

### P2.6 — auth flows (F80, F81) — 2026-10-01

**1. Production refusals (`apps/api/src/config.ts`, 3 new tests in `config.test.ts`)**
- **Fatal in production:** an `http://` `MAGIC_LINK_REDIRECT_URL`. The link carries a
  one-time login token, so it must never travel in cleartext. `render.yaml` sets
  `zeno://auth/verify` (checked), so this cannot stop the current deploy.
- **Warnings in production:** a set `DEMO_LOGIN_PASSWORD`, `ALLOW_UNVERIFIED_OAUTH_TOKENS=true`,
  a `*` or `http://` CORS origin, and an `http://` `MONITORING_WEBHOOK_URL`. These are
  warnings, not refusals, because each is already enforced at request time (demo login
  is off in production, and the OAuth flag is ignored there; both tested in P1). `main`
  auto-deploys, and a new boot refusal on a dashboard value nobody can see from the repo
  could take the API down for no security gain.
- Outside production none of these is flagged; `https://`, the `zeno://` scheme, and
  unset values are silent.

**2. Magic-link flow (`routes/auth-internals.test.ts`)**
- **Enumeration safety:** with real delivery configured (`RESEND_API_KEY`, `fetch`
  faked), an address that already has an account and a never-seen address get the same
  status and the same body (minus the request id). Each gets exactly one email. By
  construction there is no lookup to leak: the account id is derived from the address.
- **Expiry:** at 10 minutes and 1 second, both the link and its code answer 401.
- **Single use:** a link signs in once; the second use is 401.

**3. What the flow review found**
- **F80 (High, fixed): the 6-digit code could be brute-forced.** Each new code reset the
  5-guess cap: 25 guesses per 15 minutes from one IP, about 2,400 a day. The fix is a
  persisted per-address budget, 10 wrong codes per 24 hours across every code sent.
  4 tests pin it:
  - 9 wrong guesses leave the right code working; the 10th spends the budget. Then even
    the right code is refused. The link still works, and another address is untouched.
  - The budget row is keyed by a 64-hex hash (no address), holds only
    `accountId`/`count`/`reset`, survives a restart, and an ended window is not revived.
  - After 24 hours it refills even before a sweep: the next wrong guess opens a new window
    at 1, not 11. The sweep keeps an open window and deletes an ended one.
  - Account deletion removes it from memory and from the database, and leaves another
    account's part-spent budget alone.

  The real-Postgres deletion test now includes a wrong guess: Alice's `auth_code_fail`
  row is gone once `DELETE /account` answers.
- **F81 (Low, fixed): expired sign-in rows were never deleted.** They were skipped at
  boot and never seen by the sweep. The four hydrators now delete them. This is pinned in
  the unit hydration test (exactly the 3 stale keys are deleted, the live ones are not),
  in the F80 restart test, and on real Postgres (seeded expired rows in all four
  namespaces are gone after a boot; the live refresh row stays).
- Observed, no change: the per-recipient send cap (5 per 15 minutes) lets anyone delay a
  victim's NEW link for up to 15 minutes. The links those 5 requests sent are valid and
  went to the victim, and Apple and Google sign-in are unaffected. This is kept as the
  email-bomb guard, and noted for P8's edge limiter.
- Observed, no change: loading an EXPIRED budget into memory has no visible effect,
  because the window check ignores it. What is visible, and pinned, is that its row is
  deleted.

**Bite checks** (each mutation alone, then restored): 29 in all; 28 caught. The one
NOT caught was loading an expired budget into memory (explained above). It cannot be
seen through the API; only the row deletion that F81 added can be, and that is pinned.
- **F80 (13):**
  - the budget never checked;
  - `>` instead of `>=`;
  - a budget of 9;
  - wrong codes never recorded;
  - the budget not persisted;
  - the hydrator dropping live rows;
  - an ended window still counting;
  - the window never restarting;
  - the sweep never deleting the row;
  - deletion leaving the memory entry;
  - deletion leaving the database row (caught by 2 unit tests, and separately on real
    Postgres);
  - deletion clearing EVERY account's budget.
- **F81 (4):** each hydrator's delete removed, one at a time. Every one is caught by a
  unit test and by the real-Postgres test.
- **Flows (5):**
  - never-seen addresses get no email;
  - known addresses get a different `channel`;
  - link expiry not checked;
  - code expiry not checked;
  - the link kept after use.
- **Config (6):** each of the fatal check and the five warnings removed.

Gates after the final edit: `tsc -b --force` and every workspace typecheck 0 · lint 0 ·
vitest 127 files / 1659 tests at 100 / 99.62 / 100 / 100 (the same 10 documented
defensive branches) · jest 114 / 114.

### P2.6 — done — 2026-10-01

Green on GitHub: CI 36770819652 and CodeQL 36770819744 on `f9f9540`.

### P2.7 — outbound-call inventory (F82, F83, F84) — 2026-10-01

**The inventory:** every call the API makes to another host. Here "fixed" means the host
is a constant in the code, "operator" means it comes from an environment variable set on
the server (never from a request), and "request-derived" means part of it comes from the
caller.

| Call site | Host | Request-derived part of the URL | Deadline | Retries |
|---|---|---|---|---|
| Resend, the magic-link email (`routes/auth.ts`) | `api.resend.com`, fixed | none (the recipient is in the body) | 8 s | none: a failure is a 502, and the user asks again |
| Apple signing keys (`routes/auth.ts`) | `appleid.apple.com`, fixed | none | 5 s | none. Cached for 1 hour; a forced refresh is allowed at most once per 30 s (F83) |
| Google signing keys (`routes/auth.ts`) | `www.googleapis.com`, fixed | none | 5 s | the same as Apple |
| RevenueCat (`billing.ts`) | `api.revenuecat.com`, fixed | the caller's account id: our own signed subject, one path segment, now guarded | 8 s | none |
| Plaid (`plaid.ts`) | `sandbox` / `development` / `production.plaid.com`, chosen by `PLAID_ENV` | none (fixed paths) | 10 s | none |
| Groq or another OpenAI-compatible host (`coach.ts`) | operator's `COACH_BASE_URL` (default `api.groq.com`) | none | the 30 s coach deadline (F84) | none |
| Anthropic, through the SDK (`coach.ts`) | `api.anthropic.com` (the SDK default) | none | 30 s per attempt and 30 s overall (F84) | the SDK's 2 |
| 5xx alert (`app.ts`) | operator's `MONITORING_WEBHOOK_URL` | none | 3 s (F82) | none; at most 5 in flight |
| Rate-limit store (`app.ts`) | operator's `REDIS_URL` | none | 500 ms to connect | 1 per command; no offline queue |
| Postgres (`storage/pg.ts`) | operator's `DATABASE_URL` | none | 5 s to connect, 10 s per statement | pool of at most 5 connections |

No value from a request ever picks a host. The only request-derived part of any URL is
the RevenueCat account id.

**`apps/api/src/outbound.test.ts`** (19 tests):
1. **The source scan.** It reads every non-test file in `apps/api/src` and counts each
   `fetch(`, `fetchWithTimeout(`, `new Anthropic(`, `new Redis(` and `new Pool(`. The
   result must equal the inventory table in the test, so a new call site fails CI until
   it is reviewed and listed. The only direct `fetch` is inside `fetchWithTimeout`
   itself. On the old code this failed: `app.ts` held a raw `fetch` (F82).
2. **Each call site, run with `fetch` faked.** There is no real network, and no Plaid or
   sandbox call, by standing instruction. For each of the eight HTTP call sites, every
   request is https, goes only to its expected host, and carries an `AbortSignal`. The
   Anthropic case runs the real SDK.
3. **The RevenueCat account id, fuzzed** (fast-check, 300 runs, including dots, `%` and
   `/`). The rule: either the id is refused before any call, or the URL is exactly
   `/v1/subscribers/<that id>`. The old code broke it: the id `.` was fetched as
   `/v1/subscribers/`. `encodeURIComponent` leaves dots alone, and the URL parser resolves
   `.`, `..` and `%2e%2e` segments, so `..` would have sent our secret key to `/v1/`.
   It was not reachable (ids are our own signed `acct_` + base64url subjects), but the
   rule is now enforced where the URL is built: an id must match `[A-Za-z0-9_-]{1,128}`.
4. **F82:**
   - each alert gets `AbortSignal.timeout(3000)`;
   - with a collector that never answers, 8 failures send 5 alerts and drop 3;
   - once those settle, alerts resume.
5. **F83:**
   - 5 made-up key ids make 1 fetch (the old code made 6);
   - none at 29.999 s, one forced refresh at 30 s, and none straight after;
   - a real key rotation still signs in: a token signed with a newly published key gets
     a 200 once the cached set is 30 s old;
   - a malformed key set is not cached.
6. **F84:**
   - the real SDK, answered with a 429 carrying `Retry-After: 59` every time: still
     pending at 29.999 s, and the deadline at 30 s;
   - one attempt only, even 3 minutes later;
   - Groq that never answers: cut off at 30 s, with its request aborted;
   - a provider that answers in time is unaffected, and no timer is left behind.

**Two existing tests pinned the old behaviour and were updated, not weakened:**
- `auth-social.test.ts`: the forced-refetch test now advances 30 s, and also asserts that
  a second unknown key id straight after does not refetch. The outage test now advances
  past the cooldown and asserts the failing fetch was attempted, so it cannot pass on a
  cached answer.
- `billing.test.ts`: the old test sent `acct/../other?x=1#y` to RevenueCat. That id is now
  refused before any call, and a real-shaped id is fetched exactly.

**Also:**
- **The `http.ts` comment was wrong:** it said Node's fetch has "NO default timeout".
  Undici's defaults are 300 s for headers and 300 s between body chunks (read from the
  bundled undici 7.24.4 source), which is still far too long. Corrected.
- **A new production warning:** an `http://` `COACH_BASE_URL` would send the provider's
  API key in cleartext (bite-checked). It is a warning, not a refusal, on the same
  reasoning as P2.6: `render.yaml` leaves it unset.
- **Observed, no change:** fetch follows redirects (its default). Every host is fixed or
  set by the operator, so a redirect could only come from the provider itself.

**Bite checks** (each mutation alone, then restored; 17 in all, every one caught, re-run
after the last code change):
- **F82 (4):**
  - raw `fetch` again (caught by the scan, the host table and the deadline test);
  - an 8 s deadline;
  - no in-flight cap;
  - the in-flight count never released.
- **F83 (4):**
  - no cooldown;
  - the fetch time never recorded;
  - `<=` at the boundary;
  - the malformed key set cached.
- **F84 (6):**
  - no overall deadline;
  - the signal not passed to the SDK (a second attempt is then sent at 59 s);
  - the signal not passed to Groq;
  - the deadline never aborting;
  - the timer not cleared;
  - a 35 s deadline.
- **RevenueCat (2):** the guard removed; the guard letting dots through.
- **Config (1):** the `COACH_BASE_URL` warning removed.

Gates after the final code edit: `tsc -b --force` and every workspace typecheck 0 ·
lint 0 · vitest 128 files / 1679 tests at 100 / 99.62 / 100 / 100 (the same 10
documented defensive branches) · jest 114 / 114.

### P2.7 — done — 2026-10-01

Green on GitHub: CI 36773329340 and CodeQL 36773328872 on `70fa1e5`.

### P2.8 — the RevenueCat webhook (F85, F86, F87) — 2026-10-01

**What RevenueCat guarantees**, read from its docs
(https://www.revenuecat.com/docs/integrations/webhooks):
- A failed delivery is retried "up to 5 times", at 5, 10, 20, 40 and 80 minutes. Any
  status other than 200 counts as a failure.
- Delivery is "at least once", so an event can arrive more than once.
- They recommend calling `GET /subscribers` after receiving any webhook.
- Nothing is promised about order.

Billing is not live yet (`REMAINING_WORK.md`: products and the webhook are still
unconfigured), and `render.yaml` declares both `REVENUECAT_SECRET_KEY` and
`REVENUECAT_WEBHOOK_AUTH`. So the recommended design could be adopted with no production
risk.

**The design now:**
- A webhook is authenticated (a constant-time compare), then parsed for `app_user_id`
  only.
- It then drops that user's cached entitlement, in memory and in Postgres, before
  answering 200. A refused database delete answers 503, so RevenueCat retries.
- The next read asks RevenueCat.
- A lookup that started before a drop does not cache its answer (per-user generation).
- The payload-to-plan mapping (`applyWebhookEvent`) is gone.

**`apps/api/src/webhook.test.ts`** (11 tests) runs the route end to end with RevenueCat's
REST API faked, answering from a per-user "truth":
- **F85, proven on the old code:**
  - a forged INITIAL_PURCHASE made a free user Pro;
  - an 80-minute-late EXPIRATION retry made a paying user free;
  - after a PRODUCT_CHANGE the old code served its own guess, not RevenueCat's family plan;
  - a property test (60 runs: random claimed types and ids, duplicates, order, and a warm
    or cold cache) failed on its first run;
  - a far-future time, a null list or a new event type got a 400;
  - a refused delete still answered 200.
- **F86:** each of 6 guesses (1 character, off by one, right, 500 characters, and with or
  without the prefix) makes exactly one compare of two 32-byte digests. On the old code a
  1-character guess made no compare at all.
- **F87:**
  - a read racing a webhook is not cached;
  - a lookup in flight during `DELETE /account` does not bring the entitlement back;
  - another user's lookup is not cut off (this one is a regression guard, passing on both
    old and new code).
- **Regression guard, passing on both:** a wrong secret is 401 and a malformed body is 400
  (empty, numeric, or over-long `app_user_id`), and neither touches the cache.

**On real Postgres** (`real-pg.test.ts`): a new F87 test holds a RevenueCat lookup open
across `DELETE /account`, then checks that no `billing` row exists. Bite-checked: with the
generation check removed, the deleted user's row was back.

**25 existing tests pinned the payload design and were ported, not dropped:**
- The cache behaviours they covered are now seeded the only way the server caches an
  entitlement, a verified RevenueCat lookup (faked). These behaviours are:
  - the 10-minute TTL;
  - never serving a grant past its own expiry;
  - a lifetime purchase;
  - per-user deletion;
  - what is persisted, and a restart keeping the original cache time.

  The files are `billing.test.ts`, `billing.persistence.test.ts` and `app.test.ts`.
- The seven payload-mapping tests in `billing.test.ts` were removed: the payload is no longer read, and the
  new property test covers every claimed type. The REST mapping (`planFromEntitlements`,
  family over pro, expiry) keeps its own tests.
- **F54's test** now checks that RevenueCat's documented nulls and an out-of-range time
  are a 200 (none is read) and that nothing the payload claims is cached.
- **The real-Postgres suite** seeds entitlements by a verified read. Its restart test now
  also asserts no second RevenueCat lookup happened: the faked "Pro" answer could
  otherwise hide a broken hydration.

**Also:** a new production warning when `REVENUECAT_WEBHOOK_AUTH` is set without
`REVENUECAT_SECRET_KEY`, because entitlements cannot be verified and every user reads as
free (bite-checked).

**Bite checks** (each mutation alone, then restored; 10 in all, every one caught):
- **F85 (4):**
  - the webhook not dropping the cache;
  - a refused delete answering 200;
  - validating an unread field again;
  - accepting an empty `app_user_id`.
- **F86 (1):** the raw compare with its length short-circuit.
- **F87 (4):**
  - the generation never checked (caught by 2 route tests, and separately on real
    Postgres);
  - the generation never bumped;
  - one generation shared by everyone.
- **Config (1):** the new warning removed.

Gates after the final code edit: `tsc -b --force` and every workspace typecheck 0 ·
lint 0 · vitest 129 files / 1685 tests at 100 / 99.62 / 100 / 100 (the same 10
documented defensive branches) · jest 114 / 114.

### P2 gate — 2026-10-01

**Correction.** P2.2 and P2.4 said the live route inventory had 38 routes. It has 40:
18 GET, 21 POST and 1 DELETE. The count is taken from the `ACCESS` table, which the
matrix test asserts equals the de-duplicated live route list. It had 40 entries at
`8d4b5f0` too, so no route was added; the number was wrong. Corrected above.

**The nightly fuzz, run locally with the nightly configuration** (`FUZZ_RUNS=10000`, the
workflow's own command): 4 / 4 passed, 10 000 runs per route over all 40 routes, in 165 s.
The scheduled run (03:17 UTC) has not happened yet; GitHub shows 0 scheduled runs. The
main property had a fixed 600 s timeout, which a CI runner about 3.6 times slower than
this machine would hit on the clock alone. It now scales with the run count
(`max(600 s, runs × 150 ms)`, which is 25 minutes at 10 000, inside the job's
45-minute limit). The workflow also has `workflow_dispatch`, so the owner can start it
by hand from the Actions tab.

**Gate evidence:**
- **Route inventory:** `authz-matrix.test.ts` asserts that the live route list equals the
  40-entry `ACCESS` table. `rate-limits.test.ts` and `fuzz.test.ts` run over the same live
  list. All green.
- **Real Postgres:** `real-pg.test.ts` has 13 tests. Locally they run on PGlite
  (Postgres 18.3). In CI they run against a `postgres:18-alpine` server; the suite's first
  test fails under CI unless it is talking to a server. Green in CI 36775230680 on
  `d0cfc0c` (the "typecheck & test", semgrep and gitleaks jobs), with CodeQL 36775230616.
- **Every P2 sub-item is green on GitHub:**
  - P2.1 `229e114`
  - P2.2 `8d4b5f0`
  - P2.3 `73766ff`
  - P2.4 `eea3f24`
  - P2.5 `d5716ed`
  - P2.6 `f9f9540`
  - P2.7 `70fa1e5`
  - P2.8 `d0cfc0c`
- **Coverage:** Tier 1 holds at 100 / 99.62 / 100 / 100 (the same 10 documented defensive
  branches); jest 114 / 114.

**P2 in one line:** 13 findings, F75 to F87, 12 fixed and each bite-checked. F77 (logout
does not revoke the 15-minute access token) stays open as an owner decision.

**Next: P3, mobile hardening (MASVS) and tests for all 29 screens.** It starts with an
inventory of the screens and of the mobile storage, network and platform surfaces.

### Self-audit of P2 against the plan — 2026-10-01

Asked by the owner to check "everything is according to plan and nothing is guessing",
I read `PRODUCTION_HARDENING_PLAN.md` § P2 and checked each line against the code and
tests as they are now (not against this log). Result:

- **Done as written:** P2.1 (real Postgres), P2.3 (rate-limit table equals the live 40
  routes), P2.5 (log and error hygiene), P2.7 (outbound inventory; the open-banking
  "intents" are a mock adapter with no outbound call, checked in
  `packages/shared/src/finance/open-banking.ts`). P2.2's named token attacks are all in
  the matrix; "revoked `jti`" is covered by a deleted account's token, as the API has no
  `jti`. P2.4's 413 and 415 are tested in `app.routes.test.ts`.
- **Not done, and not reported as missing:** F88 (P2.2's timing / same-code-path test)
  and F89 (P2.4's schema-valid property). Both are now P2.9.
- **Met by a different design, documented at the time:** P2.8 asks that a replayed event
  id be ignored. The webhook no longer applies payloads at all (F85), so a replay can only
  cause one extra RevenueCat lookup; no event id is tracked. The property test sends
  duplicates and checks the outcome. Left as is.
- **Deviations that are the owner's call:** F90 (warnings instead of boot refusals), and
  the webhook's 30/min limit not being among the strictest (plan P2.3), already logged for
  P8 sizing.
- **Numbers re-traced to a source:** undici's 300 s default (bundled source), the SDK
  retry worst case (`client.js`), RevenueCat's retry schedule (its docs), and 0.24 %/day
  (2 400 guesses ÷ 1 000 000 codes). Earlier wrong numbers (38 routes, 22 tests, "no
  default timeout") were already corrected.

### P2.9 — the plan gaps (F88, F89) and what closing them found (F91) — 2026-10-01

**F88: the token path (plan P2.2).** Read first: `verifyAccessToken` rejects every token
by returning `null`, and the guard turns `null` into one 401. A bad signature stops after
the RSA verify; an expired genuine token right after it; a revoked one goes on to one
SHA-256 of `sub` and a map lookup. Measured before writing any test (3 000 interleaved
samples per kind, after warm-up):

| Token | Median | p10–p90 |
|---|---|---|
| live (accepted) | 29.1 µs | 28.7–30.3 |
| revoked (F76) | 28.9 µs | 28.6–30.1 |
| expired | 28.5 µs | 27.9–29.9 |
| foreign signing key | 28.1 µs | 27.7–29.3 |
| not a JWT at all | 7.9 µs | 6.5–8.9 |

Revoked vs unknown-signer: 0.8 µs (about 3 %), inside the spread and far below network
jitter. The one fast path is a string that is not shaped like a JWT, which tells its
sender nothing they did not know. `apps/api/src/token-path.test.ts` (2 tests):
1. Six kinds of rejected token (revoked, expired, foreign key, wrong audience, not a JWT,
   none) get the same status, body (minus the request id) and response headers (minus
   the id, the date and the length). The matrix already checked status and body; headers
   are new.
2. The timing of revoked, expired, unknown-signer and live tokens, round-robin, 1 000
   samples each: every median within 25 % of the revoked one. Ran 3 times in a row:
   green. Its limit, stated plainly: it catches a difference above 25 % (about 7 µs
   here), not a subtler one.

**Bite checks:** extra work on the revoked branch only (caught by the timing test); the
guard sending a `WWW-Authenticate` header only when a token was presented (caught by the
headers check). A third mutation, throwing inside the revoked branch, changed nothing the
caller can see (the function's own `try/catch` returns `null`), so there was nothing to
catch.

**F89: schema-valid input (plan P2.4).** `apps/api/src/schema-valid.test.ts` (19 tests):
- Input is generated from `z.toJSONSchema()` of each route's own schema (the 15 request
  schemas in `app.ts` and `routes/auth.ts`, now exported, plus the two shared sync
  schemas), with the edges (minimum and maximum lengths, numbers and array sizes) weighted
  in, then filtered through the schema's own `safeParse`, so every input is valid by the
  real schema's definition (the Google `.refine` included). Probed first: every schema
  converts, using only object, string, integer, array, enum, pattern, email and default;
  any other keyword throws, so a new schema cannot be silently half-tested.
- The expected status is each handler's rule, read from the handler and named in the test:
  events 200 only for an allowlisted event and label, else 400; household create 200 until
  5 per owner, then 409; join 200 only when the trimmed, upper-cased code is a real one,
  else 404; spend on your own household 200; coach (no provider) 200; webhook 200; Plaid
  exchange (unconfigured) 503; sync pull and push 200 (a body over the 1 MiB limit 413);
  magic link 200, and the 6th for one address within 15 minutes 429; verify, legacy
  verify, Apple, Google and refresh 401; demo login (off) 404; logout 200.
- A guard test scans the route code for every schema-parsing call site and fails if one
  has no entry (bite-checked by adding a route).
- 200 runs per route in CI, 10 000 nightly (added to `nightly-fuzz.yml`). Measured at
  10 000: 58 s for all 19, the slowest route 10.2 s; the per-test timeout is
  `max(120 s, runs × 60 ms)`.

**Bite checks** (each alone, then restored): a handler rejecting input its schema
accepts; the household cap 5 → 4; join no longer normalising the code; a valid boundary
(spend at the maximum) crashing the handler; a new schema-parsed route with no entry; the
per-address magic-link cap 5 → 4. All caught, but the last only after a fix: at first it
was NOT caught, because random addresses never repeat, so the cap was never reached. The
magic-link generator now draws often from a small pool of addresses (with case variants,
as the server lower-cases them).

**Also corrected in my own test before it counted:** I first asserted a `success` field
on the response envelope; the envelope (`packages/shared/src/api.ts`) is
`{ data, error, meta }`. Fixed to check `error` is `null` on a 200 and set otherwise.

**F91, found by the F89 property test on its 3rd generated case** (fast-check: "failed after 3 tests"): `{"event":"toString"}` answered
`recorded: true`. Probed further: see the F91 row. Two regression tests in
`metrics.test.ts` (every inherited name × three labels never recorded and never a throw;
the route answers 400 for them), plus the property test: all 3 fail on the old lookup.

**Coverage moved up, and why:** branches 99.62 % → 99.66 % (9 uncovered, from 10; the
ratchet in `vitest.config.ts` rose with it). The newly covered branch is
`routes/auth.ts:419`, `idToken ?? accessToken ?? serverAuthCode ?? ""`. Its arm counts
are now `[224, 47, 5, 0]`, and the property test's Google bodies carrying only a
`serverAuthCode` reach the third arm. Its last arm (`""`) is unreachable: the schema's
`.refine` requires one of the three.

Gates after the final code edit: `tsc -b --force` and every workspace typecheck 0 · lint 0 ·
vitest 131 files / 1708 tests at 100 / 99.66 / 100 / 100 · jest 114 / 114.

### P2.9 — done; P2 gate passed again — 2026-10-01

Green on GitHub: CI 36823714811 (typecheck & test, semgrep, gitleaks) and CodeQL
36823714765 on `7a9ea77`.

**Every plan P2 item, as of `7a9ea77`:**
- **Done as written:** 1 (real Postgres), 2 (the matrix, now with the same-code-path and
  timing check), 3 (rate limits), 4 (fuzzing, now with schema-valid input and the expected
  status), 5 (log and error hygiene), 7 (outbound inventory).
- **Met by a different design, recorded:** 8's "same event id twice ignored". The webhook
  never applies a payload (F85), so a replay can only cause one extra RevenueCat lookup.
- **The owner's call:** F90, 6's boot refusals (warnings today); and 3's webhook limit
  sizing (P8).

**The nightly fuzz has not run yet.** Read from GitHub at 06:14 UTC: the workflow is
`active`, registered on `main` since 2026-09-30 19:41 UTC, with a valid
`cron: "17 3 * * *"`, yet it shows 0 runs, so the 03:17 UTC run on 2026-10-01 never
happened. The cause is not visible from here. GitHub documents that scheduled runs can
be delayed, or dropped under load. Its configuration passed locally (fuzz 165 s; the
schema-valid properties 58 s). The owner can start it from the Actions tab
(`workflow_dispatch`); otherwise it is checked again after the next 03:17 UTC.

### P3.1 — build hardening — started 2026-10-01

**Read first** (the generated `apps/mobile/android/` is gitignored, so it was read in
place):
- Manifest: `android:allowBackup="true"`, with SecureStore's backup-exclusion rules
  (F92). The release manifest has no `usesCleartextTraffic`; only
  `src/debug/AndroidManifest.xml` sets it, to `true`, for Metro.
- `app/build.gradle`: `minifyEnabled` follows `android.enableMinifyInReleaseBuilds`,
  default `false`; `shrinkResources` follows its own property (F93).
- `expo-build-properties` 56.0.22 is installed and already used (a `libcrypto.so`
  packaging fix). Its types list `enableMinifyInReleaseBuilds`,
  `enableShrinkResourcesInReleaseBuilds`, `extraProguardRules` and `usesCleartextTraffic`.
- `allowBackup` is not a build property: it is `android.allowBackup` in the Expo config.

**What changed** (`apps/mobile/app.config.ts`, pinned by a new test in `app.config.test.ts`
that fails without it):
- `android.allowBackup: false` (F92);
- `expo-build-properties`: `enableMinifyInReleaseBuilds: true`,
  `enableShrinkResourcesInReleaseBuilds: true` (F93), and `usesCleartextTraffic: false`
  (explicit; the debug manifest still allows cleartext for Metro).

`expo prebuild --platform android --no-install` applied all three. The generated manifest
reads `allowBackup="false"` and `usesCleartextTraffic="false"`, and `gradle.properties`
sets both R8 properties to `true`.

**The hardened release APK, verified by bytes** (single-ABI x86_64, the documented loop):
- **Build:** successful. R8 wrote no `missing_rules.txt` (it writes one only when
  classes are missing). Its 683 warnings all come from one jar, `amazon-appstore-sdk`
  3.0.5. Gradle traces it to `react-native-purchases` → `purchases-hybrid-common` →
  `purchases-store-amazon`, RevenueCat's Amazon Appstore path, not used for Google Play.
  The warning is a bytecode-format notice ("Expected stack map table... in later
  versions of R8 the method may be assumed not reachable"), so it is a future R8 risk on
  that path only. The one manifest warning is benign: Expo's file-system provider is
  tagged `replace` with nothing to replace.
- **Compiled manifest** (`aapt2 dump xmltree`): `allowBackup=false`,
  `usesCleartextTraffic=false`, no `debuggable`. Target SDK 36.
- **DEX** (`dexdump`): 26 618 classes, 21 842 (82 %) with 1–2 character names. What keeps
  its name fits each library's reflection and JNI needs: the 3 app entry points the
  manifest names, RevenueCat's public API (its own consumer rules), and 1 170 React Native
  classes. A 69.6 MB `mapping.txt` was produced.
- **Size:** 64.1 MB with R8, 74.8 MB for the same build without it.

**No extra keep rules were added.** The plan lists keep rules for RN, Hermes, Sentry,
RevenueCat and SQLCipher. None was needed on the evidence: no missing classes, and the
smoke below passes. Each library's AAR ships its own consumer rules. **Not proven by this
smoke:** Sentry and RevenueCat are inert without their keys (no DSN, no SDK keys), so
their code paths under R8 have not run. Re-run the smoke once those keys exist (owner,
P8). And since Sentry auto-upload is disabled, the R8 `mapping.txt` is not uploaded, so a
release crash would be obfuscated in Sentry until it is (P3.3 / P8).

**The full on-device smoke** (emulator-5554, hardened APK, `pm clear`, every step tapped
from the accessibility tree):
1. **Onboarding:** three screens render, with their fonts and layout intact.
2. **Login, the 16+ gate:** unticked, `Send sign-in link`, `Continue with Apple` and
   `Continue with Google` are all `enabled=false`. Ticked, Apple and Google are enabled;
   the magic link also waits for an email address (checked by typing one), then is enabled.
3. **Add:** search "spotify" → the prefill reads Spotify, 10.00, Monthly, renews
   Oct 31, 2026 → save → the dashboard goes from **$107.46 to $117.46**, **5/10 to 6/10**
   free, and **5 to 6** renewals. This exercises the SQLCipher write path under R8.
4. **Settings → Home currency:** USD `selected=true`, all six currencies listed, the
   currency-honesty footnote present. (F94 was seen here once.)
5. **Cancel:**
   - the Netflix guide's saving is **$185.88/yr** ($15.49 × 12);
   - "Open cancellation page" hands off to Chrome (focus `ChromeTabbedActivity`);
   - on returning, the app asks "Did you cancel it?" → "Yes, I cancelled" → the
     **PENDING · REPORTED OCT 1** stamp, with +$15.49 a month and +$185.88 a year;
   - Done → the dashboard's still-to-renew is **$101.97** ($117.46 − $15.49), Netflix
     has left Upcoming, and renewals are 6 → 5.

   A dark bar seen across one line of text was a mid-animation frame of the stamp; it was
   gone once the screen settled.

The app's pid stayed 14487 from launch to the end (no restart). The app logged zero
`FATAL`, `ClassNotFound`, `NoSuchMethod` or `NoSuchField` lines. The crash buffer's one
entry is the emulator's own Bluetooth stack (`droid.bluetooth`, pid 10292), a system
process. The emulator was shut down after the run (`emu kill`; no `qemu` left).

**Mistakes of mine caught on the way:**
- Git Bash rewrote `/sdcard/...` into a Windows path (fixed with `MSYS_NO_PATHCONV=1`).
- My accessibility-tree parser crashed on nodes without an attribute (made tolerant).
- I called the translucent sheet an "R8 regression" after one A/B build. Rebuilding and
  re-testing showed it does not reproduce on the R8 build (F94).


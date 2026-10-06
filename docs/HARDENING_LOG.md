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
- [x] **P3 — Mobile hardening (MASVS) + tests for all 29 screens** (gate passed 2026-10-02; evidence in the "P3 gate" entry) (inline, one item at a time, in the plan's order)
  - [x] P3.1 build hardening in `app.config.ts`: no Auto Backup, no cleartext, R8 minify + resource shrink with keep rules; then prebuild, release APK, verify by bytes, full on-device smoke; **F92** (Auto Backup on), **F93** (release not shrunk or obfuscated) (green: CI 36826726239, CodeQL 36826726322 on `aea3587`)
  - [x] P3.2 release console stripping (keep `error`/`warn`); `captureError` never carries tokens or emails (green: CI 36828700036, CodeQL 36828699880 on `87ac086`, which contains P3.2's `68c9fcf`; again on `47211fe`)
  - [x] P3.3 Sentry `beforeSend` scrub (emails, tokens, auth headers, amounts); `sendDefaultPii` false, asserted (green: CI 36834676134, CodeQL 36834676176 on `a74417c`; its own push `3553165` went red on two older intermittent API tests, see "CI on `3553165`")
  - [x] P3.4 PIN: salt, derivation, lockout with backoff, nothing in logs; the honest threat model; **fixes F98** (Settings checked the PIN with no attempt limit) and adds the backoff; F14 corrected and handed to the owner (green: CI 36840438554, CodeQL 36840438566 on `2d6a752`, which contains P3.4's `844b49a`; two runs went red in jest on a cold-cache timeout, F99, fixed)
  - [x] P3.5 deep links: every `zeno://` route validates its parameters; `Linking.openURL` only `https:`/`mailto:` on an allowlist; **fixes F100** (anyone's sign-in link signed the phone into their account, and a junk one signed the user out); CI on the way found and fixed **F102** (explaining F97) (green: CI 36847517276, CodeQL 36847517287 on `3b8be1e`, which contains P3.5's `44791e7`)
  - [x] P3.6 no secret in the bundle: `extra` and every `EXPO_PUBLIC_*` on the public-by-design allowlist (none found in the bundle, the config or the built APK; guards added) (green: CI 36849676333, CodeQL 36849676314 on `1801e8d`)
  - [x] P3.7 screen capture blocked on the lock overlay and PIN entry (app-wide `FLAG_SECURE` is the owner's call); proven on the emulator; **fixes F105** (the locked app stayed readable to accessibility services); F104 and F106 logged (green: CI 36854703994, CodeQL 36854704080 on `39c9c46`)
  - [x] P3.8 screen tests for all 29 screens, with a jest floor over `app/**` and `src/components/**` (split into steps; each raises the floor); done 2026-10-01, every `app/` line covered, F107-F154
    - [x] P3.8a the floor itself: directory floors at the measured baseline (12.75 % of 1842 lines) (green: CI 36858191877, CodeQL 36858191900 on `89c3428`; P3.8a's own push `9a2f1a8` went red on F103)
    - [x] P3.8b shared components (`src/components/**`, `components/**`), incl. F1 `ServiceAutocomplete`: every file at 100 % lines; **fixes F1, F107** (green: CI 36860084512, CodeQL 36860084509 on `f78b449`)
    - [x] P3.8c the tab screens and the tab layout
      - [x] P3.8c-1 Ledger, Subscriptions, Calendar, Insights and the tab bar; **fixes F108, F109, F110, F111**; F112 to check on the device (green: CI 36863386995, CodeQL 36863387142 on `6d08eb4`)
      - [x] P3.8c-2 Discover (the scan, CSV import and Gmail connect); **fixes F113**; F114 to the owner (green: CI 36865715523, CodeQL 36865715509 on `bcf81aa`)
    - [x] P3.8d subscription detail, cancel, add
      - [x] P3.8d-1 the subscription detail page; **fixes F115, F116, F117, F118** (green: CI 36869210309, CodeQL 36869210211 on `c6422f8`)
      - [x] P3.8d-2 the cancel guide and Add subscription; **fixes F119, F120, F121, F122, F123**, F117 extended (green: CI 36875048540, CodeQL 36875048572 on `3b82e24`)
    - [x] P3.8e settings (incl. F29's screen use), profile, notifications, login, paywall, onboarding
      - [x] P3.8e-1 Settings, Profile, Notifications; **fixes F124, F125, F126, F128, F129, F130, F131**, F127 in part (rest to the owner); F29's screen use covered (green: CI 36883987644, CodeQL 36883987826 on `9edfe26`)
      - [x] P3.8e-2 login, paywall, onboarding; **fixes F132, F133, F134, F135, F136, F137, F138** (F134 and F138 each with an owner part) (green: CI 36886091140, CodeQL 36886091373 on `696e6c6`)
    - [x] P3.8f the rest (budget, recap, family, coach, wrapped, widgets, spend-twin, open-banking, backend, business, partners, public-api) and the root layout
      - [x] P3.8f-1 budget, budget recap, coach; **fixes F139, F141, F142, F143, F144, F145**; F140 to the owner (green: CI 36891888873, CodeQL 36891888831 on `d1bfa19`)
      - [x] P3.8f-2 family, wrapped, the preview screens, open-banking (rendered with the API faked; no Plaid call); **fixes F146-F153** (green: CI 36894599444, CodeQL 36894599463 on `396a5cc`)
      - [x] P3.8f-3 the root layout; **fixes F154**; every `app/` line covered (green: CI 36897664162, CodeQL 36897664295 on `5e4e85f`)
  - [x] P3.9 static scan of the release APK (manifest, permissions, signing, secrets; MobSF/apkleaks unavailable, see the entry); **fixes F155** (green: CI 36967460539, CodeQL 36967460518 on `6d8a9cb`; P3.9's own push `58d2fb9` went red on a new `node-forge` advisory, accepted with expiry in `6d8a9cb`)
  - [x] P3 gate: hardened release APK verified on the emulator (every flow in `DEVICE_TEST_FINDINGS.md`); jest floor in CI; MASVS checklist with evidence per control (`docs/MASVS_CHECKLIST.md`); **fixes F156-F160**, closes F16 and F112
- [x] **FX — fix pass before P4** (complete 2026-10-02) (2026-10-02; the owner asked for every open item of mine to be fixed before P4; owner-only items go to their own file at the end)
  - [x] FX.1 F21: strict UTC day parsing for CSV and receipt dates; UTC next-renewal arithmetic; F16 and F112 rows closed
  - [x] FX.2 F147's cause: history counts each subscription up to its cancellation date (already recorded on every cancel path); F163 found
  - [x] FX.3 F162: the sheet is its own window, so screen readers can't reach behind it (verified on the emulator with TalkBack)
  - [x] FX.4 F103: the website's three fonts self-hosted (the same 13 files); the site builds with the network blocked
  - [x] FX.5 F94 and F106: three measured attempts each, neither reproduced; closed as not reproduced (not claimed fixed), P5 keeps watching
  - [x] FX.6 F163: pause periods recorded (migration v2); history skips only the months inside a pause; verified as a real upgrade on the emulator; F164 found
  - [x] FX.7 F164: Insights' monthly chart read by a screen reader, each month with its amount (verified with TalkBack)
  - [ ] then the owner-only file (everything that needs the owner, nothing else)
- [x] **P4 — Website component tests, Playwright, CSP, DAST** (gate passed 2026-10-03; evidence in the "P4 gate" entry)
  - [x] P4.1 component and page tests (vitest + jsdom + Testing Library), split into steps; each adds a floor
    - [x] P4.1a the test setup, and the shared components (`components/ui/**` was dead code, removed); **fixes F165, F167, F168, F169**; F166 found (green: CI 37032423384, CodeQL 37032423356 on `62faef2`)
    - [x] P4.1b every page renders: metadata, canonical, JSON-LD, breadcrumbs, internal links, the sitemap, the 509 cancel guides; **fixes F170** (green: CI 37035441547, CodeQL 37035441551 on `b4b0b3d`)
    - [x] P4.1c the truthfulness rail as a test (banned phrases never rendered, required ones are), and every factual claim on the site checked against the app's code; **fixes F166, F171-F176**; D13 and three account checks to the owner (green: CI 37040621945, CodeQL 37040621963 on `d624f74`)
  - [x] P4.2 Playwright on every route: the homepage book, theme, waitlist, cancel hub and guide, compare, legal, 404; security headers, zero console errors, zero outside requests, axe clean
    - [x] P4.2a every route, desktop and phone, light and dark: 200, the security headers, no console error, nothing from another host, axe clean (WCAG 2.2 AA); in CI; **fixes F177**, F178 logged (green: CI 37042604157, CodeQL 37042604027 on `1903ee3`; the Playwright step ran 2 min on the runner's Chrome)
    - [x] P4.2b the behaviours: the homepage book, no-JS, reduced motion, theme persistence, the waitlist end to end, the hub and guides, the book-mode nav links; **fixes F179** (green: CI 37043864957, CodeQL 37043865051 on `e0e6b31`)
    - [x] P4.2c Core Web Vitals budgets (LCP, CLS, INP) under Lighthouse's mobile throttling, measured in Chrome; **fixes F180**
  - [x] P4.3 CSP: no `'unsafe-inline'` scripts (hashes for the fixed inline scripts) or a written, measured reason; the other headers verified. **Done with per-page hashes**: each page's own inline scripts allowed by sha256, an injected one blocked (proven in Chrome); headers checked against OWASP's set; **fixes F183**, F184 and F185 logged
  - [x] P4.4 build-output secret scan: no non-public env value in `.next`. **Done as a canary build in CI**: every non-public name the repository knows (49) set to a random value, all of `.next` searched as written and base64, unreadable file kinds fail; **fixes F186** (Turbopack's cache stored the build environment)
  - [x] P4.5 DAST: OWASP ZAP baseline against `next start` and the API, nightly; no medium+ alerts. **Done**: three scans nightly, gated by `scripts/zap-gate.mjs`; first run's two Mediums resolved (a guide step read as SQL, reworded; `style-src 'unsafe-inline'` accepted by alertRef until 2027-03-31 with measured reasons) (green: DAST 37104160285, CI 37104160223, CodeQL 37104160276 on `36f1bb0`)
  - [x] P4 gate: Playwright green in CI; CSP without `'unsafe-inline'` scripts (or a written reason); axe clean on every route (all 509 guides too, light and dark: 1,018 views, 0 violations)
- [x] **P5 — Mobile end-to-end (Maestro on the emulator)** (watch for F94 and F106, closed as not reproduced in FX.5). **Done**: 13 flows and the 17-screen accessibility-tree audit, green on the local emulator and on GitHub's (green: Mobile end-to-end 37205579950, CI 37205579972, CodeQL 37205579957 on `5dbddd7`); fixes F178, F184, F185, F188-F190, F192-F198, F201, F202; F191, F199, F200 logged
- [ ] **P6 — Mutation + property-based testing**
  - [x] P6.1 Stryker on the shared packages (`packages/shared`, `packages/service-catalog`): measure the mutation score, kill the survivors that matter, floor at 85 %. **Done**: 82.35 % to **92.44 %**, floor set at 92 % in `stryker.config.mjs`; **fixes F205, F206, F207** (green: CI 37254557059, CodeQL 37254557078 on `f2ec20d`)
  - [x] P6.2 Stryker on the API (`apps/api/src`), security and money paths first. **Done**: **88.95 %** over the whole API (2,752 of 3,094), floor 88 % in `stryker.api.config.mjs`; the sign-in routes 81.31 % to 84.53 %, the smaller security files 89.03 % to 95.69 %, coach/storage/startup 88.71 % to 92.80 %, the main routes 82.26 % to 83.52 %; **fixes F208-F211** (missing tests; no code was wrong)
  - [x] P6.3 Stryker on the app's logic (`apps/mobile/src`, outside screens and components). **Done**: **89.74 %** (4,566 of 5,088), floor 89 % in `stryker.mobile.config.mjs`; **fixes F212-F214**
  - [x] P6.4 fast-check properties: money math (rounding, minor units), UTC date math (DST, leap days), the email and CSV parsers (never throw, never over-match), the catalog (per-entry invariants), sync (idempotent, ordered). **Done**: 23 properties (24 tests) in four files, bite-checked with 7 deliberate breaks, all caught (the generated-input ones on three repeat runs)
  - [x] P6.5 CI: the mutation floor nightly, and on pull requests for changed files. **Done** (`.github/workflows/mutation.yml`): nightly, all three suites held to their floors; pull requests, the changed source files scored in the job summary, not enforced (reason below). First nightly result: to be read
  - [ ] P6 gate: the floor enforced in CI and green on GitHub
- [ ] **P7 — Security verification v2 with evidence**
  - [x] P7.1 Threat model: the system and its trust boundaries (data-flow diagram), STRIDE per surface (phone, API, database, website, outside services) and per route (all 40), each threat with its evidence or marked open with an owner. **Done**: `docs/THREAT_MODEL.md`
  - [x] P7.2 ASVS 5.0 Level 2 checklist, every control with its evidence (test, CI job or config line) or "open, owned by"; control text taken from OWASP's repository, not memory. **Done 2026-10-05**: all 253 assessed (158 met, 79 N/A, 12 partial, 4 open; every partial and open one is the owner's: host settings (P8) or a decision in `OWNER_ACTIONS.md` D17); **fixes F216 to F222**, plus the security-event log
  - [x] P7.3 MASVS checklist refreshed with P4-P6 (every row's evidence re-pointed at a test name). **Done 2026-10-05**: 41 tests named, held by `scripts/masvs-checklist.test.ts`
  - [x] P7.4 `docs/SECURITY_AUDIT_2026-10.md` replacing the July audit; a residual-risk register, each risk with an owner and a date. **Done 2026-10-05**: 31 risks, held by `scripts/security-audit.test.ts`
  - [x] P7 gate: no control marked "believed": each is "tested by …" or "open, owned by …". **Passed 2026-10-05** on GitHub (CI 37320819545 and CodeQL 37320819681, both green on `4f2f10d`): ASVS rows held by `scripts/asvs-checklist.test.ts` (only met, partial, open or N/A; met with evidence that exists, partial and open with an owner), MASVS rows by `scripts/masvs-checklist.test.ts` (every named test exists), residual risks by `scripts/security-audit.test.ts` (owner and date on each)
- [ ] **P8 — Infrastructure and operations (owner-driven)**
  - [x] P8.1 (me) Runbooks: signing-key swap without downtime (new: `JWT_PUBLIC_KEY_PREVIOUS`, tested), storage-key and webhook-secret rotation, an exposed secret, the backup and restore drill, uptime alerts (`docs/RUNBOOKS.md`). Done 2026-10-05
  - [x] P8.2 (me) Uptime check on `/health/ready` (`.github/workflows/uptime.yml`, `scripts/uptime-check.mjs`, tested), a manual check and backstop; the alert itself is an outside monitor (owner, `RUNBOOKS.md` §6), because GitHub's schedule fired twice in ~11 hours here. Done 2026-10-05, corrected 2026-10-06
  - [x] P8.3 (me) Disclosure contact: `/.well-known/security.txt` (RFC 9116, tested, served by the production build) and `SECURITY.md` on the real domain. Done 2026-10-05; mail delivery is F223 (owner)
  - [x] P8.4 (me) DNS measured (CAA, DNSSEC, SPF, DKIM, DMARC, MX); the records to add are in `OWNER_ACTIONS.md`. Done 2026-10-05
  - [ ] P8.5 (owner) `main` protected (F7), GitHub push protection and Dependabot alerts (F8), exposed keys rotated, the 3072-bit key swap, mail for the contact addresses (F223), CAA, DNSSEC, DMARC `p=reject`
  - [ ] P8.6 (owner) `zeno-db` on a paid plan before 2026-11-03, then the restore drill (`RUNBOOKS.md` §5)
  - [ ] P8.7 (owner, then me) Edge rate limiting and WAF (Cloudflare in front of Render), then F3's log check
  - [ ] P8.8 (owner) A third-party penetration test, booked
  - [~] P8.9 (owner, me to draft) Store data-safety forms and the iOS privacy manifest, drafted from the code. **Play draft done 2026-10-06** (`docs/STORE_DATA_SAFETY.md`, held by `scripts/store-data-safety.test.ts`); the owner submits it. The iOS privacy manifest needs an iOS build

---

## Open findings / fixes needed

Items found during the work that are not yet fixed. Each has an owner and the phase
that closes it.

| # | Finding | Severity | Owner | Closes in |
|---|---|---|---|---|
| F1 | **FIXED in P3.8b.** ~~`ServiceAutocomplete.tsx` had no test.~~ 8 jest tests against the real bundled catalog; the file is held at 100 % lines. Original: `apps/mobile/components/subscriptions/ServiceAutocomplete.tsx` (RN component, also exports `servicePriceLabel`) has no test in any runner | Test gap | me | P3 (screen/component tests) |
| F2 | **Production API likely ran with per-client rate limiting broken** from the 2026-09-29 deploy of `9eb4721` until `064fc52` deploys: Fastify 5.12.5 made the numeric `trustProxy: 1` trust nobody, so every visitor shared the load balancer's rate-limit bucket (one noisy client could 429 everyone, incl. login). Render auto-deploys `main` and starts with `tsx` (no typecheck), so the type break did not stop the deploy. **Fixed in code**; the owner should confirm the Render deploy of `064fc52`+ is live. | High (availability of auth) | owner: confirm deploy | P0.2 (fixed) |
| F3 | Whether the address Render's load balancer appends is the real client or a Cloudflare edge is unverified (Render staff, May 2021: "we set the first IP in the list to the real client IP"). With 1 trusted hop, request.ip is the LAST appended address. Check in Render logs: the pino request log's `remoteAddress` for your own request should equal your public IP. If it shows a Cloudflare IP, set `TRUST_PROXY_HOPS=2`. | Medium (rate-limit granularity) | owner: one log check | P8 |
| F4 | Render builds with `npm install` (not `npm ci`) and deploys every push to `main` regardless of CI status (`autoDeploy: true`), and the start command (`tsx`) never typechecks. A red CI does not stop a deploy. | High (process) | **fixed in `render.yaml` (P0.4)**; owner: confirm the Render service is Blueprint-managed so the change applies (if it was created by hand, set "Auto-Deploy: After CI checks pass" in the dashboard) | P0.4 |
| F5 | CI ran **Node 20, end-of-life since 2026-04-30**. Production was worse-defined: Render reads `engines`, and per Render's docs an unbounded range like our `>=20.11.0` "always resolves to the latest release" — whatever Node major is newest, not an LTS. | High (unpatched / unpinned runtime) | **fixed (P0.4)**: `.node-version` = 24 (Render reads it before `engines`), engines `>=24 <25`, CI via `node-version-file` | P0.4 |
| F7 | **`main` is not protected** (GitHub API: `protected: false`, required checks `[]`): force-push and branch deletion are allowed, and nothing requires checks before code lands. | High (integrity of the deploy branch) | owner: the P0.6 steps below | P0.6 |
| F8 | GitHub's own free protections for public repos are not verifiable without owner auth: secret-scanning **push protection** (rejects a push that contains a secret, server-side), Dependabot **alerts** and **security updates**. | Medium | owner: enable in Settings → Code security | P0.6 |
| F9 | **FIXED in P1.1.** ~~Magic-link login tokens are written to production logs.~~ Fastify's default request log includes `req.url` with the query string, and `GET /api/v1/auth/verify?token=…` carries the raw token. Verified by a probe with the exact production logger config: the log line held `"url":"/api/v1/auth/verify?token=PROBE-SECRET-MAGIC-TOKEN-123"`. Single-use limits it, but a verify that fails before consuming the token (e.g. 429) leaves a working login token in Render's logs. | High (credential in logs) | me | P1 (`server.ts`) |
| F14 | **OPEN: owner decision (P3.4); CORRECTED 2026-10-01.** After the first 10 wrong PINs the counter is kept, so each clock-forward cycle wins ONE guess, not 10 (existing test: "after the lockout has elapsed, a wrong PIN re-locks at once"). The options are in `OPEN_ITEMS.md`. The uptime clock expo-device offers stops counting during sleep (Android `SystemClock.uptimeMillis()`, iOS `systemUptime`, read in its native source), so it cannot tell a moved clock from a sleeping phone. Original: The PIN lockout window is measured with the device clock, so someone holding the unlocked phone can move the clock forward past the 15-minute lockout (each cycle still costs 10 attempts and a trip to Settings). No trusted time source on-device; rollback detection is possible. | Low | me | P3 (MASVS) |
| F15 | **RESOLVED 2026-10-01 (confirmed, no change needed): no paid feature runs on the server.** Every Pro unlock (unlimited subscriptions, category budgets, envelope budgeting; the paywall's own list) runs only on the device, and the AI coach is free, so the server holds nothing paid to gate. The gap this exposed is F96. Original: `checkStatus` trusts the server's plan but falls back to the client's RevenueCat view when the server is unreachable. Client-only features are bypassable by any modified client regardless; what matters is that PAID SERVER features (coach, family, sync) check entitlement server-side. | Medium (to confirm) | me | P2 (authz matrix) |
| F16 | **CLOSED in the P3 gate (2026-10-02).** ~~Local DB encryption is configured but never PROVEN at runtime.~~ Proven: with root on emulator-5554, the app's data directory was pulled; `zeno.db` begins with random bytes, not `SQLite format 3\0`, and the subscription names and amounts appear in none of its 31 files (WAL included). The one plaintext copy was the widget snapshot (F161). | Medium (unverified claim) | me | P3 gate |
| F10 | **FIXED in P1.4** (server + app). ~~Google sign-in: a nonce is sent to Google but NOT to our API (`/auth/google` gets only the token), so the server cannot bind the ID token to this sign-in (replay of a stolen token). Apple sign-in requests no nonce at all. Needs the server side read in full before a verdict. | Medium (to confirm) | me | P1 (`authStore.ts`) + P2 |
| F11 | Google sign-in uses the implicit ID-token flow returned to the custom scheme `zeno://auth/google`, and Gmail connect also uses expo-auth-session. **Google's own native-app guide, verbatim: "Custom URI schemes are no longer supported on Android and Chrome apps."** So on Android these flows are likely REJECTED by Google, not just weaker. Cannot be confirmed at runtime without the real Google client IDs (A3). Likely fix: Google's native Credential Manager / Sign in with Google SDK, or App Links redirects. | **High (likely broken on Android)** | owner: client IDs (A3); me: migrate | P3 |
| F12 | **FIXED in P1.3** (revocation, label); sender-spoofing part ACCEPTED as low with evidence (see P1.3). ~~Gmail: disconnect revokes with the token in the URL query (`…/revoke?token=`); the fallback account label embeds the first 8 characters of the access token; known billing senders are trusted from the spoofable `From` header alone (no DKIM/SPF check). | Low–Medium | me | P1 (`emailScanner.ts`) |
| F13 | **FIXED in P1.2.** ~~Gmail connect fails on every real device.~~ Tokens are stored under `zeno.oauth.gmail.acct.<address>`, but expo-secure-store 56.0.4 rejects keys outside `/^[\w.-]+$/` (source: `ensureValidKey` in `build/SecureStore.js`, applied to get/set/delete), and an address contains `@`. The existing tests pass only because their fake SecureStore does not enforce that rule. | High (feature broken on device) | me | P1.2 |
| F17 | **FIXED in P1.3.** ~~Store receipts: the app name ran across line breaks and kept heading words ("App Store receipt
Netflix (Monthly)" → "Store receipt Netflix"), so a real Netflix App Store receipt matched nothing.~~ | Medium (correctness) | me | P1.3 |
| F18 | **FIXED 2026-10-01.** ~~CSV import labelled every detection USD.~~ The five US bank formats stay USD; a Generic file takes the currency its own amount cells show; bare numbers take the user's home currency (`parseCSV`'s fallback is now required). Original: CSV import labels every detection USD. Correct for the five US bank formats it recognises; a "Generic" CSV from a non-US bank would be mislabelled (engineering standards: currency honesty). | Medium | me | P1.9 (with the shared money parser) |
| F19 | Wells Fargo CSV: detected by a first row of 5 cells with ≥2 `*`, and that first row is then dropped as a "header". If real WF exports have no header row, the first transaction is silently lost; if their placeholder cells differ, the format is not detected at all. Needs a REAL (redacted) Wells Fargo export to verify. | Medium (unverified assumption) | owner: one sample file | P1.9 |
| F20 | **FIXED in P1.3.** ~~CSV merchant cleanup stripped ANY last word of 2+ letters ("APPLE MUSIC" → "Apple", "DISNEY PLUS" → "Disney"): distinct subscriptions merged into one group with an averaged amount, and groups whose amounts then differed were dropped.~~ | High (wrong / missing detections) | me | P1.3 |
| F21 | **FIXED in FX.1.** ~~`Date.parse` is lenient: "02/30/2026" becomes 2 March, "February 31, 2026" becomes 3 March. Receipt/CSV dates can silently shift.~~ Measured again before fixing: it also read every non-ISO form as LOCAL time, so on a UTC+5:30 phone "Feb 28, 2026" was stored as 27 Feb 18:30Z, the previous day. And `calculateNextRenewal` did its month arithmetic in local time, which on a UTC-5 device turned Jan 31 into "1 March" instead of 28 Feb (measured with Node's TZ set to New York). Now one strict parser, `parseDay` (`src/utils/day-text.ts`), reads a CSV or receipt date as a real UTC day or rejects it, and the next-renewal arithmetic is UTC. Receipts' ISO and day-first dates ("15 Jan 2026") are read too; they used to fall back to "today". | Low → Medium (every imported charge date was a day early for UTC+ users) | me | FX.1 |
| F22 | **FIXED in P1.7.** ~~A stale compiled `packages/service-catalog/src/services.js` (tracked, last changed 2026-06-14) SHADOWS `services.ts`.~~ `index.ts` exports from `"./services.js"`; a probe proved Vitest loads the `.js` file (a different module instance from `services.ts`). Data is identical today (probe: 0 differences over 509 entries, same exports), but any edit to `services.ts` is silently ignored wherever the `.js` wins, and coverage measured the wrong file (why `services.ts` showed 0 %). The `.js` may be load-bearing for Metro, which does not map `./x.js` to `x.ts`, so removal must be verified per consumer (Vitest, Next build, Metro bundle, API dist). | Medium (silent-edit trap) | me | P1.7 |
| F23 | **FIXED in P1.4.** ~~Apple/Google routes put the CLIENT-SENT email into the session record and our signed access token (`parsed.data.email ?? verified.email`). No consumer reads that claim today, so it was latent, but our own token vouched for an unverified address.~~ | Medium (latent) | me | P1.4 |
| F24 | **FIXED in P1.4.** ~~All three production-guard security tests were VACUOUS: with each guard removed they still passed. The OAuth tests set a client id, so the "unverified tokens" flag they claimed to test was never consulted; the demo test posted to a route that does not exist (`/auth/demo`), with no email and a 7-char password.~~ Lesson for P6: security tests must be mutation-tested first. | High (false assurance) | me | P1.4 / P6 |
| F25 | **305 of the 509 catalog entries (60 %) carry UNRESEARCHED data shown as fact:** a generated cancel link (`<website>/account`, not verified to exist), a default difficulty of "medium", and generic cancel steps. The app opens that link as "Open cancellation page" and shows the difficulty; the website publishes 305 cancel-guide pages stating "difficulty: medium". 204 entries are curated. Conflicts with the project's truthfulness rules (no invented facts). Needs a product decision on presentation, e.g. an "unrated / general steps, not yet verified" label and a link to the homepage instead of a guessed path, or noindex until curated. | High (honesty, public pages) | owner: decide the presentation | P3 (app) + P4 (web) |
| F26 | **FIXED — budget store in P1.8b, `setQuietHours` in P1.8d.** ~~Budget store loses updates.~~ Every action computes the next state from the `config` its render captured, so two actions before a re-render (a fast double-tap on "add envelope", or two edits in one event) start from the same stale state and the second write erases the first. The code's own comment fixes the duplicate-ID half of exactly this double-tap, not the lost write. `subscription-store` solved this with refs, but its `setQuietHours` has the same stale merge. | Medium (silent data loss) | me | P1.8b / P1.8d |
| F27 | **FIXED in P1.8f.** ~~"Cancel my Zeno account" promises it "erases everything from this device", but leaves connected Gmail OAuth tokens in the keychain (not revoked at Google), the app-lock PIN hash and lockout state, and quiet hours / home currency / cached FX rates / theme.** Gmail access tokens expire within about an hour, which limits the impact, but the promise is false.~~ The inventory in P1.8f also found the home-screen widget snapshot (it names the next renewal) and the stored push token. | High (privacy promise) | me | P1.8f |
| F28 | **FIXED in P1.8e.** ~~A keychain error wedges the lock screen.~~ The PIN check reads and writes SecureStore, and nothing between SecureStore and the overlay caught an error. A rejected `tryPin` skipped `setBusy(false)`, so the PIN field stayed read-only until the app restarted; the user could only sign out. It failed closed (still locked, not a bypass), plus an unhandled rejection. A throwing biometric attempt was also unhandled. | Medium (availability; fails closed) | me | P1.8e |
| F29 | **FIXED 2026-10-01.** ~~Settings said "None connected" even with Gmail connected.~~ `useConnectedInboxesLabel` reads the real list on every focus. Original: Settings' "Connected inboxes" row is hard-coded to **"None connected"** (`app/settings.tsx`), even with Gmail inboxes connected. A false statement in the UI. | Low (truthfulness) | me | P4 (UI truthfulness) |
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
| F45 | **OPEN: owner decision.** (P3.8e-1: the same question covers Settings' "We never ask for your bank login" and Profile's "We never see your bank login".) The paywall (`app/paywall.tsx:257`) says "…and we never see your bank." That is true in production today, where bank connect is dev-only, but it becomes false the day Plaid ships, because the server then stores the Plaid access token and fetches transactions. Suggested wording: "…and no bank login required." (the required phrase), or keep it and reword when Plaid ships. Not changed: it is paywall marketing copy. | Low now, High if Plaid ships (truthfulness) | owner | P4 or before Plaid ships |
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
| F88 | **FIXED in P2.9. CORRECTED 2026-10-01: the CI gap was not the leak I named** (see "CI on `3553165`" below). It was OpenSSL rejecting a forged signature at or above the modulus before any RSA arithmetic, which the sender can see from the public key. The code change (same work after the signature check) and its deterministic test stand; the timing test now forges an in-range signature. Earlier text: **FIXED in P2.9, and in CODE after CI caught a real gap** (see the P2.9 timing entry below). ~~No test for the token path's sameness.~~ The plan (P2.2) asks that unknown and revoked tokens take "the same code path" with "no timing leak on the token path". No test checked this, and I had not said so. Measured first: every rejected token takes 28–29 µs (the RSA verify dominates), revoked vs unknown-signer 0.8 µs apart; only a non-JWT string is faster (7.9 µs), which tells its sender nothing. `token-path.test.ts` now pins identical status, body AND headers for six kinds of rejected token, and the timing within 25 %. | Test gap (plan item not done) | me | P2.9 |
| F89 | **FIXED in P2.9.** ~~The fuzz never sent schema-valid input.~~ The plan (P2.4) says the fuzz is "driven by each zod schema: valid ⇒ expected status". `fuzz.test.ts` sends arbitrary bodies and checks only "never a 500, always the envelope, no internals"; it never builds a known-valid body and checks the success status. Half the item; I had not said so. `schema-valid.test.ts` now generates input from each of the 18 routes' own zod schemas and checks the exact status each handler's rule gives it; it found F91. | Test gap (plan item half done) | me | P2.9 |
| F90 | **OPEN: owner decision.** The plan (P2.6) says demo login, wildcard CORS and `http://` URLs "all refuse to boot" in production. P2.6 made only an `http://` `MAGIC_LINK_REDIRECT_URL` fatal; a set `DEMO_LOGIN_PASSWORD`, a `*` or `http://` CORS origin and an `http://` alert or coach URL are **warnings**. Why: `main` auto-deploys to Render, each of these is already blocked at request time (tested), and a new boot refusal on a dashboard value nobody can see from the repo could take the API down. To follow the plan literally, confirm none of these is set in the Render dashboard and say so; they become fatal in one small change. | Deviation from plan (owner's call) | owner | P2.9 or P8 |
| F91 | **FIXED in P2.9.** ~~`POST /api/v1/events` (public) mishandled names every object inherits.~~ `recordProductEvent` looked the event up on a plain object literal, so inherited names were "found". Proven on the old code: `toString`, `valueOf` and `__proto__` answered 200 and became their own series in `/metrics` (outside the allowlist); `constructor` or `hasOwnProperty` with a label answered **500** (`.includes` called on a function), and each 500 also pages the alert webhook. The P2.4 fuzz missed it: random strings never hit those exact names. Now only the allowlist's own keys count (`Object.hasOwn`). Swept the API for the same pattern: the only other keyed object literal (`guideOverrides[slug]` in the catalog) is keyed by the catalog's own static slugs, not request data. | Medium (an anonymous 500 and metric pollution on a public route) | me | P2.9 |
| F92 | **FIXED in P3.1** (`android.allowBackup: false`; the compiled manifest reads `allowBackup=false`). ~~Android Auto Backup was ON.~~ `app.config.ts` never sets `android.allowBackup`, and Expo's default is `true` (`@expo/config-plugins` `getAllowBackup`: `config.android?.allowBackup ?? true`); the generated manifest has `android:allowBackup="true"`. `expo-secure-store`'s `configureAndroidBackup` only EXCLUDES SecureStore's own data, so a Google backup or device transfer carries the rest: the plaintext AsyncStorage file, including the widget snapshot (monthly spend, the active count, the next renewal's name and amount, `src/widgets/widgetBridge.ts`), and the SQLCipher database WITHOUT its key (the key lives in SecureStore). What the app does on a device restored that way is not verified. | Medium (financial details leave the device in plaintext) | me | P3.1 |
| F93 | **FIXED in P3.1** (R8 minify + resource shrinking on; 82 % of DEX classes obfuscated; APK 74.8 → 64.1 MB). ~~The release build was not shrunk or obfuscated.~~ `android/app/build.gradle` reads `android.enableMinifyInReleaseBuilds`, default `false`, and nothing sets it, so R8 never runs (`minifyEnabled false`, no resource shrinking), and `proguard-rules.pro` holds only two keep rules. | Low (reverse engineering made easy; a larger APK) | me | P3.1 |
| F94 | **CLOSED, NOT REPRODUCED (not claimed fixed), FX.5.** 8 attempts in all (5 earlier, 3 in FX.5: every capture as opaque as the reference), and since FX.3 the sheet is drawn in its own window, not over Settings. P5 keeps watching. Original: On the first R8 run, the Settings → Home currency sheet drew translucent: the Settings rows showed through the currency list (two captures, 4 s apart, so not mid-animation). The sheet's content sits on `c.surfaceCard`, which is opaque white (`palette.white`). It did NOT reproduce in 5 later attempts: the same R8 build 3 times (persisted state, a fresh install, and the exact first path: onboarding → Sign in → typed email → Add → Settings), once without R8, once with minify only. So it is not an R8 regression; the cause is unknown. Watch for it in P3.8's screen tests and P5's end-to-end runs. | Unknown (visual; once) | me | P3.8 / P5 |
| F95 | **FIXED 2026-10-01** (found while fixing F18). ~~Amounts written `CA$` were detected as Australian dollars.~~ The currency detector's AUD rule `/A\$/` matched inside `CA$`, and its CAD rule `/C\$/` did not match `CA$` at all, so `CA$12.00` (the way the app itself writes CAD) read as AUD, in email receipts and CSV imports alike. `CA$` now counts as CAD and is subtracted from the `A$` count (no regex lookbehind, for Hermes). Bite-checked: the old rules fail 3 tests. | Medium (currency honesty) | me | open-items pass |
| F96 | **OPEN: owner decision.** The paywall sells a Family plan ("up to 5 members, $6.99/mo"), but household sharing with up to 5 members is free to everyone: `app/family.tsx` checks no plan, and the server's 5-member cap applies regardless of plan. So the Family plan gives nothing beyond Pro while its label implies it does. Either gate the Family Vault behind the plan (the server must then check entitlement on create and join), or reword the plan. | Medium (truthfulness of what is sold) | owner | before billing ships |
| F102 | **FIXED 2026-10-01 (found through F97).** ~~Postgres writes to one row could land out of order.~~ `pg.ts` sent every query straight to a 5-connection pool, and on a real server each connection finishes in its own time. So a fire-and-forget upsert issued just before an account deletion could land AFTER the delete. The API answered "deleted" while the row (a Plaid bank token, an entitlement, a household) was back in Postgres, and the next boot loaded it again: F75's promise broken. Likewise two quick upserts of one key could leave the OLDER value. PGlite runs one connection in order, which is why only CI's server showed it. Now operations on one row run in the order they were issued, and a delete-by-field (account deletion's sync purge) or a namespace clear first waits for every write already in flight in that namespace. Bite-checked on PGlite, no timing involved: the old `pg.ts` fails 2 tests (the deleted user's Plaid row survives; the stale `{v:1}` beats `{v:2}`), and removing the namespace wait fails a third. | High (deleted data resurrected) | me | P3.5 (found in CI) |
| F103 | **FIXED in FX.4: the three fonts are self-hosted, and the site builds with all network blocked.** Earlier: **OPEN (mine), likely cause found 2026-10-01, fix scheduled for P4.** It recurred on CI 36857434988 (`9a2f1a8`), and the new annotation showed the build failing in `next/font/google`: the font files that its generated CSS (`hanken_grotesk_….module.css`) references were "module not found". `apps/web/app/layout.tsx` loads Space Grotesk, Hanken Grotesk and JetBrains Mono through `next/font/google`, which downloads them from Google Fonts at BUILD time, the build's only network step. So the likely cause is that download failing on the runner (unproven: the annotation held only the last 40 lines, so it now also carries the first error lines). The fix is to self-host the fonts so the build is offline. Measured first: the site serves 13 variable `woff2` files (179 KB) split by character range, and the TTFs the mobile packages already have are about 5x heavier, so the right files are the current `woff2`s with their exact `unicode-range`s (read from the build's CSS). That changes how the site loads fonts and needs a visual check, so it goes in P4. Earlier text: **OPEN (mine): one CI-only web build failure, no detail yet.** CI 36845816550 (`44791e7`) failed "Build web" with only "exit code 1". The same build passes here, and that commit changed nothing under `apps/web`. The next run failed earlier (F97), so the build step has not run since. The step now posts its last 40 log lines as an annotation on failure, so a recurrence explains itself. | Low until explained | me | the next occurrence |
| F107 | **FIXED in P3.8b (found by its own test).** ~~Reduce-motion users still saw the first animation of a component.~~ `useReducedMotion` started at "motion on" and learned the OS setting asynchronously, so every animated component's FIRST effect ran as if motion were allowed. A `Stamp` mounted under reduce-motion still sprang in from 1.7x and fired its haptic, and the spring kept going after the setting arrived. Now the last answer known in the app run is kept, so every component mounting after the first read starts from it. The launch splash makes that first read, long before any stamp appears. The splash itself still starts before the answer, but its effect re-runs and jumps to the static frame. Bite-checked: removing the cache fails 2 tests. | Medium (accessibility: motion for users who turned it off) | me | P3.8b |
| F108 | **FIXED in P3.8c.** ~~The dashboard showed a "Ways to save" heading over an empty section.~~ The section appeared whenever the insights engine returned anything, but the only insight the seed data produces is the spend summary, which the dashboard deliberately does not preview. Seen on the emulator too (the heading straight above the buttons). Now it appears only with a saving to show or an insight to preview. | Low | me | P3.8c |
| F109 | **FIXED in P3.8c.** ~~Screen readers heard a subscription row without its price or date.~~ On the Subscriptions tab each row's trailing column (price, next date, "PAUSED", "!", the Verified stamp) is a custom node, and ListRow's derived name covers only the title and subtitle. VoiceOver/TalkBack read "Netflix, ENTERTAINMENT" while sighted users saw "$15.49, OCT 2". The row's name now follows what is shown. | Medium (accessibility) | me | P3.8c |
| F110 | **FIXED in P3.8c.** ~~Insight cards showed savings 100x too small.~~ `analytics.tsx` passed `insight.savingAmount`, which is in WHOLE currency units (the engine's `monthlyDollars`), to `formatMoney`, which takes MINOR units: "Save $0.22/mo" for a $22 saving. The header pill and the dashboard used the whole-unit value correctly. Checked that the engine's own titles are right: it has its own local `formatMoney` in whole units. | Medium (money shown wrong) | me | P3.8c |
| F111 | **FIXED in P3.8c.** ~~West of UTC, the calendar's day panel was headed with the day BEFORE the one tapped.~~ The tapped key ("2026-10-02") is a local day, but `formatDateHeader` parsed it with `new Date(key)`, which reads a date-only string as UTC midnight. Measured: rendered in America/New_York or America/Los_Angeles that is "Thursday, October 1"; London and Kolkata are unaffected, which is why it was never seen here. The key is now read as a local date. The test bites on this machine (UTC+5:30); on CI's UTC runner both readings coincide. | Medium (the date shown to most US users was wrong) | me | P3.8c |
| F113 | **FIXED in P3.8c-2.** ~~Editing a scan result's amount or date was broken, and clearing the date crashed the app.~~ Discover's edit sheet drove both fields from the PARSED value. Measured in the test, typing key by key: "9.99" became "999", because "9." was re-rendered as "9", so a $9.99 subscription would be saved as $999. A partial date was rewritten to a different one: "2026-1" becomes 2025-12-31 (measured with Node). And deleting one character ("2026-10-0") or clearing the field made `new Date(text).toISOString()` throw `RangeError: Invalid time value` inside the change handler, which crashes the app. The sheet now keeps the typed text, takes a value only when it is complete and valid (an amount with at most 2 decimals; a real calendar day, so "2026-02-30" is refused), shows a hint otherwise, and disables Save until both are valid. Bite-checked: the committed version fails 3 tests. | High (a crash, and money saved 100x too large) | me | P3.8c-2 |
| F114 | **OPEN: owner decision (copy).** The Gmail card promises "Scanned on your device — nothing leaves your phone". Checked in `emailScanner.ts`: email content goes only from Google to the phone and is parsed there (it calls only gmail.googleapis.com and Google's OAuth endpoints, never Zeno's API). But "nothing leaves your phone" is absolute. After an import the screen sends a funnel event ("import_completed", source "email", no content), and a signed-in user with sync on uploads encrypted copies of the subscriptions saved. It sits close to the banned "100% on-device" wording. A truthful option: "Scanned on your device — your emails never reach Zeno's servers". | Medium (truthfulness) | owner | before release |
| F115 | **FIXED in P3.8d.** ~~The subscription page's edit form saved an impossible typed date as a different day.~~ It validated the renewal date with a pattern plus `Date.parse`, which is lenient (F21): measured in Node, "2026-02-30" parses as 2 March, "2026-02-29" as 1 March, "2026-04-31" as 1 May, and each was saved without a word. A shared `isIsoDay` (`src/utils/iso-day.ts`, 14 unit tests) accepts a day only if it survives the round trip unchanged; Discover's edit sheet uses it too. | Medium (data entered wrong) | me | P3.8d |
| F116 | **FIXED in P3.8d.** ~~The estimated charge history was wrong for anything billed on the 29th to 31st.~~ Each step back was built from the previous step with `Date.UTC(y, m - 1, d)`, so "31 February" rolled into 3 March and every later entry kept the 3rd. Measured: from 31 March it listed 31 Mar, 3 Mar, 3 Feb, 3 Jan. Each step is now counted from the original charge, with the day clamped to the month: 31 Mar, 28 Feb, 31 Jan. | Low (dates shown wrong) | me | P3.8d |
| F117 | **FIXED in P3.8d.** ~~The subscription page invented a yearly figure for an unknown or trial cycle.~~ `formatAnnualEquivalent` multiplied every cycle that was not annual, weekly or quarterly by 12, so an UNKNOWN cycle got a confident "Per year". A verified cancellation of one said "You're saving $X/yr" and stamped "SAVED $X/YR". That contradicts the app's own rule: @zeno/shared's `monthlyAmount` gives trial and unknown cycles no recurring amount. Those cycles now show "—" ("NO SET CYCLE"), and no saving is claimed. **P3.8d-2:** the cancel guide did the same ("Cancelling saves you $X/yr", "you keep $X a year", "Every year +$X") for an unknown or trial cycle; its `getAnnualAmountMinor` now returns null for them and none of the three is shown. | Medium (truthfulness of money) | me | P3.8d |
| F119 | **FIXED in P3.8d-2.** ~~The cancel guide's success card labelled every price "Every month".~~ The stored price is per billing cycle, so a cancelled $99 annual plan read "Every month +$99.00 · Every year +$99.00", and a $5 weekly one "Every month +$5.00". The line is now labelled by the cycle (Every week / month / quarter / year, "Each charge" when unknown), and an annual plan gets no second, duplicate "Every year" line. | Medium (truthfulness of money) | me | P3.8d-2 |
| F120 | **FIXED in P3.8d-2.** ~~Add subscription's three reminder switches did nothing.~~ The form showed "7-day reminder", "3-day reminder" and "Charge day alert" switches, but `addSubscription` always stored all three ON, so a reminder the user had just switched off was scheduled anyway. The store now takes the form's choice (default all on, as before, for every other caller). | Medium (a control that lies) | me | P3.8d-2 |
| F121 | **FIXED in P3.8d-2.** ~~A note typed on Add subscription was thrown away.~~ The form had a notes field; the save never passed it, and the store had no way to take one. Now saved (trimmed; an empty note saves none). | Low | me | P3.8d-2 |
| F122 | **FIXED in P3.8d-2.** ~~Add subscription read the amount with `parseFloat`.~~ "1,99" saved as $1.00, "9.99.9" as $9.99, "1e3" as $1,000. The amount must now be digits with at most 2 decimals and more than zero, or Save stays disabled. The rule is Discover's (F113), moved to `src/utils/amount-text.ts` and shared. | Medium (truthfulness of money) | me | P3.8d-2 |
| F123 | **FIXED in P3.8d-2.** ~~Add subscription started every amount at $9.99.~~ A custom service, or a catalog one with no price (Substack, Steam…), was saved at $9.99 unless the user noticed a price they never typed; and picking an unpriced service after a priced one kept the old price. The amount now starts empty (Save waits for one), and an unpriced pick clears it. | Medium (invented figure) | me | P3.8d-2 |
| F124 | **FIXED in P3.8e-1.** ~~Settings' "Push notifications" switch did nothing.~~ It was held in the screen's own state: switching it off changed nothing and was forgotten on leaving. It is now the design's "Renewal reminders" master switch (`ui_kits/app/SettingsScreen.jsx`): persisted (`notification.enabled.v1`, default on, reset by a wipe), and while off the root layout hands the scheduler an empty list, which cancels every pending reminder. Each subscription's own switches are kept for when it is turned back on. | Medium (a control that lies) | me | P3.8e-1 |
| F125 | **FIXED in P3.8e-1.** ~~Settings and Profile showed the account id as the user's email.~~ Both displayed `accountId` (an internal `acct_…` id) where the email belongs, and the made-up "you@example.com" when it was missing. The auth store now keeps the email from the session's own access token (every token the API issues carries it) and clears it on sign-out, local-only and a rejected refresh; with none, the screens say "Signed in". Profile still shows the id, labelled ACCOUNT ID. | Low (truthfulness) | me | P3.8e-1 |
| F126 | **FIXED in P3.8e-1.** ~~Settings showed "Version 1.0.0", hard-coded.~~ The build is 0.1.0 (`app.config.ts`). It now reads `Constants.expoConfig.version`. | Low | me | P3.8e-1 |
| F127 | **PART FIXED in P3.8e-1; the rest is an owner decision.** ~~"Export my data — Download everything as CSV" left out the user's notes.~~ Notes are now a column (formula-guarded like the name). The row now says "Your subscriptions and notes, as CSV", which is what the file holds. The design promises "EVERYTHING, AS CSV" (budgets and price history aren't in the file); whether the export grows to that is in OPEN_ITEMS. | Low (truthfulness) | owner (scope) | P3.8e-1 |
| F128 | **FIXED in P3.8e-1.** ~~Profile said the app lock was "On · Face ID + PIN" on every device.~~ That included phones with no biometrics enrolled, and Android, which has no Face ID. It now says "On · PIN + biometrics" or "On · PIN", from the lock store's `biometricAvailable`. Settings' Security row says "App lock · PIN + biometrics". | Low (truthfulness) | me | P3.8e-1 |
| F129 | **FIXED in P3.8e-1.** ~~The Notifications screen's "Upcoming reminders" were not the reminders the phone would show.~~ It listed `createRenewalReminderPlan` from @zeno/shared, called with no preferences, while the phone schedules from `buildRenewalTriggers`. So it listed reminders the user had switched off; it ignored quiet hours; it showed a trial as 7 / 3 / 0 days when the scheduler fires 2 / 1 / 0; and it worked in UTC days, not the scheduler's 9 AM local. The scheduler's own list is now one function (`upcomingReminders`, the first half of the reconcile), and the screen lists exactly that, by each notification's real title. The store's unused `reminderPlan` and the now-unused `notificationLabel` were removed. | Medium (a schedule that isn't the schedule) | me | P3.8e-1 |
| F130 | **FIXED in P3.8e-1.** ~~A price rise always read "/mo".~~ The price history holds the price per billing cycle, so a yearly plan going from $99 to $119 read "$99.00 → $119.00/mo". It now ends in the plan's own cycle. | Low (truthfulness of money) | me | P3.8e-1 |
| F131 | **FIXED in P3.8e-1.** ~~The subscription page labelled an unknown cycle's price "/month".~~ The same class as F117: a cycle the app doesn't know was presented as monthly. The suffix is now shared (`src/utils/billing-label.ts`), and an unknown cycle has none. | Low (truthfulness of money) | me | P3.8e-1 |
| F132 | **FIXED in P3.8e-2.** ~~Android showed "Continue with Apple", which could only fail there.~~ The store's `loginWithApple` throws "Sign in with Apple is only available on supported Apple devices" when Apple's API is unavailable, which on Android is always. The button is now iOS-only. | Low | me | P3.8e-2 |
| F133 | **FIXED in P3.8e-2.** ~~The paywall promised "we'll remind you before it [the trial] ends".~~ Nothing in the app schedules a reminder for Zeno's own trial. The line now reads "No charge until the trial ends · cancel anytime". | Medium (a promise nothing keeps) | me | P3.8e-2 |
| F134 | **FIXED in P3.8e-2.** ~~The paywall always said "Start 7-day free trial · No charge until trial ends".~~ It did so with no store configured, for a product without a trial, and for a returning user who no longer qualifies, who was then charged at once after being told "no charge". A trial is now promised only when the store offers this user one (`src/billing/free-trial.ts`). On iOS that means the product's intro price is free and RevenueCat's `checkTrialOrIntroductoryPriceEligibility` says ELIGIBLE; its docs say to show non-intro pricing on UNKNOWN. On Android it means the default option (what `purchasePackage` buys) has a free phase; Google Play leaves a new-customer offer out when the user isn't eligible (RevenueCat's Google Play offers guide). The trial's length is the store's own. Otherwise the button says "Subscribe for $X/yr" and "Charged today". Store setup is an owner check (OPEN_ITEMS). | High (money: charged after "no charge") | me + owner (store setup) | P3.8e-2 |
| F135 | **FIXED in P3.8e-2.** ~~Closing the store's purchase sheet showed an error ("Purchase was cancelled.").~~ RevenueCat marks it with code "1" (PURCHASE_CANCELLED_ERROR); it is now silent. Real failures still show. | Low | me | P3.8e-2 |
| F136 | **FIXED in P3.8e-2.** ~~Buying Family showed "Welcome to Pro".~~ The success screen now names the plan bought. | Low | me | P3.8e-2 |
| F137 | **FIXED in P3.8e-2.** ~~A purchase that left no active plan still said "Zeno Pro is active".~~ When the store completes a purchase but RevenueCat reports the free plan (for example an entitlement not attached to the product), the screen announced success and showed "Welcome to Pro". It now says Pro isn't active yet and points to Restore purchases. | Medium (a false confirmation of something paid for) | me | P3.8e-2 |
| F138 | **FIXED in P3.8e-2 (scope to the owner).** ~~Every new user's ledger started with 5 subscriptions that weren't theirs.~~ The store wrote the sample rows (Adobe, Midjourney, Netflix, Disney+ Family, Super Duolingo) into every database on first launch, release builds too. A new user saw $107.46/mo committed, got renewal reminders for services they may never have had, and started with 5 of the free plan's 10 slots used. Onboarding says "your ledger starts empty", and the design's Home has a first-discovery empty state. The samples are now written only in development builds (`__DEV__`); a release build starts, and hydrates, empty. Whether a release should offer a clearly labelled sample is in OPEN_ITEMS. | High (invented data in the user's own records) | me + owner (scope) | P3.8e-2 |
| F139 | **FIXED in P3.8f-1.** ~~The budget's "get back under" list priced everything as monthly.~~ Each candidate read "$X/mo · $(12X)/yr", so a $99 yearly plan showed "$99.00/mo · $1,188.00/yr". It now shows the price with its own cycle, plus a year of it when that is a different figure. The list was also ordered by the raw per-cycle price, which put a $99/yr plan ($8.25 a month) after a $10/mo one; it is now ordered by monthly cost, as the coach does. A trial or unknown cycle, which has no monthly charge, is no longer offered as a cut. The yearly rule is shared with the cancel guide (`annualAmountMinor` in `src/utils/billing-label.ts`). | Low (truthfulness of money) | me | P3.8f-1 |
| F140 | **OPEN: owner decision.** Envelopes, one of the three features the paywall sells as Pro, can't be set up. "Add envelope" always makes one named "New envelope" funded with $100, and the only action is "Log $5". There is no name, no funding amount, and no other spend. The store already takes a name and an amount. The design shows envelopes only as a locked row, so the editor was never designed, and I haven't invented one ("port, don't redesign"). | Medium (a paid feature that doesn't work as sold) | owner | before selling Pro |
| F141 | **FIXED in P3.8f-1.** ~~The budget showed a "Pro" badge on "Ask the Spend Coach".~~ The coach checks no plan (`app/coach.tsx`) and the paywall lists it as free. The badge is gone. | Low (truthfulness) | me | P3.8f-1 |
| F142 | **FIXED in P3.8f-1.** ~~The coach told users to "Add an AI key on the server to unlock personalized coaching."~~ That is a developer's instruction, and it was also shown when the phone was just offline. It now says personalized coaching isn't available right now, and that the insights shown are computed on the device. | Low | me | P3.8f-1 |
| F143 | **FIXED in P3.8f-1.** ~~The budget recap invented a streak and called an estimate "Actually spent".~~ The recap's history is rebuilt from today's subscription list (each one assumed charged since it was added to Zeno, none once cancelled), and every complete month was compared with TODAY's cap. A new user's past months are $0, so installing the app and setting a budget gave "Under cap", a 5-month streak, and "Share my 5-month streak": "I've stayed under my subscription budget for 5 months straight." The budget now records when the cap was set (`capSetAt`; an older undated cap counts from now). Only complete months that began after it count, for the recap, the streak and the share (`budgetRecap` in `src/finance/budget.ts`), and the figure is labelled "Estimated spend". | High (an invented claim the app offers to share) | me | P3.8f-1 |
| F144 | **FIXED in P3.8f-1.** ~~The budget's setup cap started at $5, not the suggested cap.~~ It was seeded once on the first render, before the subscriptions load, when the forecast is $0 (the same pattern as F118). "Use suggested · $155" was shown beside a $5 cap, and "Start tracking" saved $5. The cap now follows the suggestion until the user changes it. | Medium | me | P3.8f-1 |
| F145 | **FIXED in P3.8f-1.** ~~The coach said cancelling its picks would "get under" the budget when they didn't.~~ It took the cheapest subscriptions until their savings covered the overage, but when every subscription together saved less, it still ended "…and get under." It says that only when the cuts cover the overage; otherwise "That alone won't get you under this month." | Medium (advice about money that was false) | me | P3.8f-1 |
| F146 | **FIXED in P3.8f-2 (the feature itself is the owner's call).** ~~The budget recap said "Budget adherence rolls into your Year in Review", with a Pro badge.~~ Year in Review (`app/wrapped.tsx`) reads no budget and checks no plan, so both halves were false. The row is gone. The design says "Every closed month is stamped into your Year in Review", a feature that doesn't exist; whether to build it is in OPEN_ITEMS. | Low (truthfulness) | me + owner | P3.8f-2 |
| F147 | **FIXED in P3.8f-2 (the wording) and FX.2 (the cause): a cancelled subscription now counts up to the day it was cancelled.** ~~Year in Review said "You spent $X" and shared "I spent $X".~~ The figure is `buildYearInReview`'s history: what the subscriptions tracked TODAY add up to over the window, each assumed charged every cycle since it was added. A subscription since cancelled counts $0, even for months it was paid, so the more you cancel the lower "spent" reads. The design calls it "TOTAL COMMITTED … across N tracked subscriptions". The screen and every share now say "committed on the N subscriptions you track now", and the busiest month says "due", not "charged". Counting cancelled subscriptions up to their cancellation needs a cancellation date on every cancel path, and it changes the dashboard's and Insights' charts too: in OPEN_ITEMS (mine). | Medium (truthfulness of money, shared publicly) | me | P3.8f-2; cause P6 |
| F148 | **FIXED in P3.8f-2.** ~~Other family members saw this member's account id as their name.~~ The name sent was `accountId.split("@")[0]`, but the account id is an internal `acct_…` id (F125) with no "@", so the household saw "acct_9f2c…". It is now the local part of the signed-in email, or "Member". (The server takes the member itself from the sign-in token, as before.) | Low (privacy, truthfulness) | me | P3.8f-2 |
| F149 | **FIXED in P3.8f-2.** ~~Joining a household accepted a 4-7 character code.~~ The check was `length < 4` while the message says "Enter the 8-character code", and the server's codes are always 8 (`CODE_LENGTH`, `api/src/family.ts`). It now requires 8. | Low | me | P3.8f-2 |
| F150 | **FIXED in P3.8f-2.** ~~"Leave household" could leave you in the household.~~ It cleared the household on the phone at once and told the server fire-and-forget. If that call failed, the member stayed in the household on the server, with their monthly total still shown to the others, while the app said they had left. It now leaves only when the server confirms, and otherwise says "you're still in this household". | Medium (privacy) | me | P3.8f-2 |
| F151 | **FIXED in P3.8f-2.** ~~Two developer screens were reachable in release builds.~~ Every file in `app/` is a route, so a deep link opened `open-banking` ("Connect a sandbox bank" called the server's Plaid sandbox) and `backend` (the API's address and capabilities). Release builds now show "This screen isn't part of this version of Zeno"; development builds are unchanged. The Plaid code is untouched (owner: "keep the code only"), and the tests fake its calls, so no Plaid call is made. | Medium (exposure) | me | P3.8f-2 |
| F152 | **FIXED in P3.8f-2.** ~~Widgets promised "we'll let you know when it ships".~~ Nothing in the app would. The promise is gone; the "not available yet" stays. | Low | me | P3.8f-2 |
| F153 | **FIXED in P3.8f-2.** ~~"Notify me when it's ready" on Business, Partners and Public API was a fake waitlist.~~ The button only flipped the screen's own state and then said "You're on the list ✓ We'll let you know the moment this ships". Nothing was recorded anywhere. P3.8b's test checked that behaviour and I didn't see it was false then. The button and the promise are gone, and `ui.tsx`'s `PrimaryButton`, its only user, with them. | Medium (a control that lies) | me | P3.8f-2 |
| F154 | **FIXED in P3.8f-3.** ~~Opening the app from a sign-in link could leave you signed out.~~ At launch the root layout starts `hydrate()` (read the keychain) and, for a sign-in link, `verifyMagicLink()` together. When the verification finished first, `hydrate()`'s keychain read, begun before the new session was saved, came back "no session" and set the user signed out. The session sat in the keychain, but the screen showed sign-in until the next launch. The same overwrite applied to any sign-in or "continue without an account" made during launch, and a stale read of an OLDER account's session would have put that account back over the new one. Reproduced with a controlled keychain fake (the probe ended "authenticated", then "anonymous"). `hydrate()` now notes the count of sign-ins and local-only choices when it starts, and stands down after each read if one happened meanwhile. | Medium (a sign-in that silently didn't stick) | me | P3.8f-3 |
| F155 | **FIXED in P3.9.** ~~The release APK asked for "draw over other apps" (`SYSTEM_ALERT_WINDOW`) and shared-storage write (`WRITE_EXTERNAL_STORAGE`, up to Android 12) without using either.~~ Both come from Expo's prebuild template, which adds them under "OPTIONAL PERMISSIONS, REMOVE WHATEVER YOU DO NOT NEED" (`@expo/config-plugins` `withAndroidBaseMods.js`); `expo-file-system`'s plugin adds the write one again. In the release dex the only overlay code is React Native's dev-support overlay (`com/facebook/react/devsupport`, off when `ReactBuildConfig.DEBUG` is false), and nothing references shared-storage writes; the CSV export goes through the share sheet as text. Both are now in `android.blockedPermissions`. | Low (unused permissions on the store listing) | me | P3.9 |
| F156 | **FIXED in the P3 gate.** ~~Business, Partners and Public API showed their raw route name as the header title ("public-api").~~ They were off the consumer navigation but still reachable by deep link, and the root layout declared no screen for them. Each now has its title. A new test checks every route file under `app/` against the layout's declarations, so a route added without a header fails. | Low (visible polish) | me | P3 gate |
| F157 | **FIXED in the P3 gate.** ~~The dashboard's "Committed this month", the Insights chart total and the Spend Coach total added up every subscription, cancelled, paused and reported-cancelled included.~~ Seen on the emulator: after a reported cancel, the dashboard said $25.49 committed over "Charged so far $15.49 · Still to renew $0.00", and Insights said $25.49 above "Total monthly $15.49". The store summed `monthlyAmount` over all rows, while the spend summary counted only `active`. Now there is one rule, `countsTowardSpend` (active or trial, as the budget forecast, the insights engine and the Subscriptions tab already counted), and the headline total IS the spend summary's. | Medium (a wrong headline number) | me | P3 gate |
| F158 | **FIXED in the P3 gate.** ~~The widget snapshot called a renewal dated tomorrow "today" when it was under 24 hours away~~ ("Figma today" for an Oct 3 renewal, generated at 11:06 on Oct 2; read from the emulator's storage). It floored elapsed hours. It now counts calendar days (UTC, as `trial-guardian` does). No widget ships yet, so no user saw it. | Low (latent) | me | P3 gate |
| F159 | **FIXED in the P3 gate.** ~~The app lock could be bypassed by a menu, editor or alert left open when the app locked.~~ A React Native `Modal` is its own window, above the lock cover (a plain View), and React Native raises open modals again on resume. Seen on the emulator: with the subscription menu open, Home, then back, the locked app still showed the menu, and **Pause ran on the locked app**. Delete would have worked the same way. Two parts: (1) `AppModal` hides every modal while the lock covers the app (an eslint rule now forbids a raw `Modal`); (2) the lock cover is itself a Modal, the topmost window, so a native `Alert` left open sits under it. Re-run on the device: the locked tree held only the lock, a tap where Pause was did nothing, and a Delete alert left open was under the lock and still there after unlocking. | **High** (the lock is the app's main local protection) | me | P3 gate |
| F160 | **FIXED in the P3 gate.** ~~Pausing a subscription was one-way.~~ The menu always offered "Pause subscription", even on a paused plan, the paused bar was not a button, and the store had no resume at all. A paused plan's menu (Android and iOS) now offers "Resume subscription", and the store has `resumeSubscription`. Verified on the device: Figma resumed and its Cancel button came back. | Medium (a dead end) | me | P3 gate |
| F161 | **OPEN, owner decision.** The widget snapshot (`zeno.widget.snapshot.v1`: the next renewal's name and amount, the monthly total) is written in plaintext to AsyncStorage, though no widget ships in this build. It is app-private (root was needed to read it), not backed up (F92), and erased with the device's data (F27). | Low | owner | — |
| F162 | **FIXED in FX.3.** ~~While Settings' bottom sheet (Home currency) is open, the Settings controls behind it stay in the accessibility tree (`uiautomator dump --compressed`), so a screen reader can move behind the sheet.~~ The sheet is now its own window (AppModal). On the emulator the tree with it open holds only the sheet, and a TalkBack touch where "Go Pro" sits behind it focuses the backdrop. | Low (accessibility) | me | FX.3 |
| F163 | **FIXED in FX.6.** ~~A paused subscription counts $0 in the spend history (Year in Review, the recap, the Insights chart) for every month, including months it was paid before the pause.~~ Pausing now records a period (`pausedPeriods`, stored in a new column by migration v2) and resuming closes it; history skips only the charges inside a pause. Seen on the emulator: a pause on the old app collapsed October's paid charge; a pause on the new app keeps it, across restarts. A pause recorded before this change has no date, and none is invented. | Low (history understates) | me | FX.6 |
| F164 | **FIXED in FX.7.** ~~Insights' 6-month chart gives a screen reader the month names but not the amounts: each bar is an unlabelled view, so the history is visual only.~~ Each month is now one accessible element, "October 2026, $15.49, this month". On the emulator TalkBack focuses each month's column. | Low (accessibility) | me | FX.7 |
| F165 | **FIXED in P4.1a.** ~~`JsonLd` wrote `JSON.stringify(data)` straight into a `<script>`, and JSON leaves `<` alone, so a value holding `</script>` would close the tag and the rest would be read as HTML.~~ Values are our own catalog and copy, never a visitor's, so nothing exploited it; but 509 catalog entries feed the cancel guides' JSON-LD. Now `<` is written `\u003c`, the escape Next's own JSON-LD guide gives (`node_modules/next/dist/docs/01-app/02-guides/json-ld.md`). | Low (defence in depth) | me | P4.1a |
| F166 | **FIXED in P4.1c (the wording).** ~~The website said "in the app, a cancellation is only marked verified after your next receipt or statement shows no charge" (and "until the charge actually stops").~~ The app's `runCancellationVerification` marks a pending cancellation cancelled once its verify-by date passes with **no charge recorded since the request**, scanned or not. The site now says exactly that: "marked verified only once its renewal date passes with no new charge in the receipts or statements you scan or import", and that a charge which shows up anyway is flagged. The app's check was kept: requiring a fresh scan would leave most cancellations pending forever for anyone who never re-imports. Pinned by a test to the store's code. | Medium (truthfulness) | me | P4.1c |
| F167 | **FIXED in P4.1a.** ~~After a waitlist error, typing again set `aria-invalid` back to false but left the error message on screen (and the field still described by it).~~ Editing now clears both together. | Low (accessibility) | me | P4.1a |
| F168 | **FIXED in P4.1a.** ~~The footer's homepage links ("How it works", "Pricing", "FAQ", "Join the waitlist") were written `#how`, `#pricing`…, relative to the current page, so on every other page (the 509 cancel guides, compare, features, legal) they pointed at sections that don't exist there and did nothing.~~ They are `/#how` etc. now; on the homepage that is still an in-page jump. Since the website port (`53f521e`). | Low–Medium (navigation) | me | P4.1a |
| F169 | **FIXED in P4.1a.** ~~Without JavaScript the homepage below the hero was invisible.~~ The motion primitives are server-rendered at their animation start (inline `opacity:0`, offsets), which only Motion's in-view trigger lifts; the hero was built for no-JS (its entrance is gated on `html.js`), the rest wasn't. Measured: the server HTML of every primitive carried the start state. Now each such element has `zn-reveal`, and `html:not(.js) .zn-reveal` (globals.css) shows it finished; `html.js` is set by the inline theme script before first paint, so scripts-on is unchanged. Proven in Chromium on the primitives' real server HTML (no `html.js`: opacity 1, no transform; with it: the start state kept), and in the built homepage 84 of 86 start-state elements carry the class (the other two are the margin index's marker and the 5 % "zeno" watermark, both decorative and meant to start hidden). The full no-JS page check is P4.2's. | Medium (content invisible without JS) | me | P4.1a |
| F170 | **FIXED in P4.1b.** ~~On the three legal pages and the analytics page, the root layout's "Skip to content" link (`href="#main"`) had no target: their `<main>` had no `id="main"` (the legal layout and the dashboard render their own `<main>`), so a keyboard user couldn't skip the navigation there.~~ Both now carry the id; a test over every page requires exactly one `main#main`. | Low (accessibility) | me | P4.1b |
| F171 | **FIXED in P4.1c (the claim); the guides themselves are D5.** ~~The homepage said each of the 509 catalog services comes "with real, step-by-step cancellation instructions".~~ Measured from the catalog: **39** have steps written for that service (`guideOverrides`); **470** carry the same five general steps (`defaultCancelGuide`: "Go to X and sign in", "Open Account, Profile, or Settings", …). This is wider than F25's count (305 entries with a generated link and default difficulty). The homepage now says "each with a cancellation guide to follow"; "real cancellation flow/steps" is gone from the Method and the FAQ. | Medium (truthfulness) | me (wording); owner (D5) | P4.1c |
| F172 | **FIXED in P4.1c.** ~~Four feature pages presented as available what the app itself shows as "Coming soon" (Business, Public API, Partners) or "Preview only" (Widgets + Watch), with example data unlabelled (a "Zeno Labs" workspace, a masked API key, the Family page's "Maya" and "Avi", Spend Twin's $284); the sample analytics dashboard said "Live" over invented figures.~~ Each unavailable feature is now marked "Planned · not available today" (the Open Banking page's existing pattern), Partners says none is a partnership, example data is labelled, the dashboard says "Sample data". A test pairs each app screen's state with its page. | Medium (truthfulness) | me | P4.1c |
| F173 | **FIXED in P4.1c.** ~~The Monarch comparison said a live bank connection is "required" for Monarch.~~ Monarch's own help center documents manual accounts and CSV uploads ([Manual Accounts](https://help.monarch.com/hc/en-us/articles/360058187072-Manual-Accounts)). Now: built around live connections, manual accounts supported. A false statement about a named competitor. The Rocket Money claims were checked against its help center and hold (it links through Plaid; credentials "never touch Rocket Money's servers"). | Medium (legal: a claim about a competitor) | me | P4.1c |
| F174 | **FIXED in P4.1c.** ~~The cookie policy described essential cookies "to keep the site secure, to remember your cookie preference, and to support the waitlist form", "consent controls", and a waitlist that breaks without storage; none exists.~~ The site sets no cookie; the one stored item is `zeno-theme` (local storage, written only when the theme button is pressed). The policy now says that. A test checks the site's code for cookies and storage keys against it. | Low–Medium (legal accuracy) | me | P4.1c |
| F175 | **FIXED in P4.1c.** The privacy policy, against the code: ~~"we do not run … product analytics"~~: the app sends anonymous counts of four events (`PRODUCT_EVENT_LABELS`), now listed; ~~"AI coaching provider — Groq"~~: Anthropic (Claude) is the default provider and Groq the fallback (`coach.ts`, `render.yaml`), now both named; ~~"metadata such as … the referring page"~~: the waitlist records the address and the time only; ~~"expire within about 15 minutes"~~: 10 minutes. Each pinned to its code by a test. | Medium (legal accuracy) | me | P4.1c |
| F176 | **FIXED in P4.1c.** Three overstatements: ~~"every reminder carries the exact amount"~~ (it is the tracked price; the Terms call amounts estimates) → "the amount due"; ~~"protected by a biometric app lock"~~ (the lock is off until turned on) → "you can lock the app with a PIN (plus biometrics…)"; ~~"Cancel anytime — in one tap"~~ (Zeno's own plans are cancelled in the store account) → "from your App Store or Google Play account — no call, no form". | Low (truthfulness) | me | P4.1c |
| F177 | **FIXED in P4.2a.** ~~Text on every page failed WCAG AA contrast (1.4.3, 4.5:1 for normal text):~~ measured by axe in Chrome and by hand from the tokens: the light theme's `--ink-3` `#808698` was 3.44:1 on paper (footer headings, table headers, eyebrows, tags, the copyright line, the guides' "Related"); the dark theme's `--ink-3` `#6c7180` 3.67:1 on lit paper; `--warn` `#a36a0b` 4.31:1 (the guides' "Difficulty: medium" on most guides); `--stamp-verified` `#0b8a54` 4.39:1 on white (the hero's totals label); the compare pages' pricing footnote dimmed by `opacity: 0.7`. Each token moved, same hue, by the smallest step to at least 4.6:1 on every background it sits on (`#6b7184`, `#7c8191`, `#9c650b`, `#0a824f`); the footnote uses `--ink-2`. The earlier design note ("`textTertiary` is 3.45:1 on paper") was this. | Medium (accessibility, every page) | me | P4.2a |
| F178 | **FIXED in P5.** ~~The mobile app's tertiary text and verified green were below WCAG AA (4.5:1) on the surfaces they sit on: light tertiary `#808698` 3.27-3.63:1 (paper, card, sunken), light verified green `#0B8A54` 3.96-4.40:1, dark tertiary `#6C7180` 3.40-4.01:1 (desk, card, raised).~~ Each moved by the smallest step that passes on all of its theme's surfaces (measured): light tertiary `#686E81`, green `#097F4D`, dark tertiary `#80859A`. The theme's contrast test now covers tertiary text and every coloured ink on all four surfaces (the old values fail 12 of its checks). **Measured on the emulator, rendered pixels:** tertiary labels `#686E81` on `#FAF9F5` 4.82:1 (light), `#80859A` on `#0A0C13` 5.34:1 (dark); the verified green `#097F4D` on paper 4.80:1. | Medium (accessibility) | me | P5 |
| F179 | **FIXED in P4.2b.** ~~On a wide screen with a mouse (the homepage's book mode), the nav's "How it works", "Pricing", "FAQ" and "Join waitlist", and the footer's section links, did nothing: the book stayed on its page.~~ Every section sits in a hidden sheet and the page doesn't scroll, and Next's Link moves to "/#pricing" with `pushState`, which fires no `hashchange`; nothing listened in any case. Suspected in P4.1a, measured in Chrome in P4.2b (the pager stayed on COVER after clicking Pricing). The book now catches same-page section-link clicks (capture phase, before Next's handler) and turns to that sheet; a modified click or a new-tab link is left alone. | Medium (navigation on desktop) | me | P4.2b |
| F180 | **FIXED in P4.2c.** ~~Under Lighthouse's mobile throttling the homepage's first paint (and LCP, the nav's "zeno") came at ~2.9 s, over the 2.5 s "good" line; every other page measured 2.0-2.3 s.~~ Cause, measured step by step: not the scripts (2.65-2.87 s with JavaScript off), not the markup (every script async), but the **first layout**: one 1,120 ms layout (4x CPU) covering the whole long page while the web fonts were still loading; layout with the fallback fonts costs ~2.5x layout with the web fonts (1,070 ms vs 410 ms), and a relayout once loaded costs 7 ms. Fixed with `content-visibility: auto` on the homepage sections below the hero, so the first layout covers what is on screen: homepage LCP 2.42-2.45 s standalone, 1.89-1.93 s in later full-suite runs (lab timings move ~0.5 s with the machine's state), CLS 0.000-0.008. Side effect, accepted: without JavaScript, sections fade in briefly as they come into view (their styles resolve then); the no-JS test checks each section's settled state on screen. | Medium (performance on phones) | me | P4.2c |
| F181 | **FIXED (found during P4.2c's gate run).** ~~The mobile Calendar's "N RENEWALS" line counted each renewal by its LOCAL day while the month total beside it (`getMonthlyTotal`) uses its UTC day; renewal dates are UTC days (§10). At a month boundary west of UTC, a renewal dated the 1st (midnight UTC, the evening before in New York) was in this month's count but not its total.~~ The count is now `getMonthRenewalCount` in `calendarUtils`, the same renewals on the same UTC day as the total; the screen's private local-day helper is gone. Tested in New York, Kolkata and UTC (the New York case fails with the old local-day count). | Low (a count disagreeing with its own total) | me | P4.2c |
| F182 | **FIXED (found by CI's new far-from-UTC step).** ~~Renewal dates are stored as day labels (midnight UTC of the day, §10), but the mobile app formatted them in the phone's timezone, so every imported renewal (CSV, email receipt) showed **a day early anywhere west of UTC**: all of the Americas ("Oct 6" for a renewal on the 7th).~~ Four formatters (`formatShortDate`, `formatMonthYear`, the insights' dates, the add screen's) now show a label as the day it names (`src/utils/day-label.ts`, `timeZone: "UTC"`), the same day the calendar's dots and the countdowns already use. The add screen stored "now + N days" at the current time of day, a raw instant; it now stores a day label like imports and the edit screen. Tested in six zones (Los Angeles, New York, UTC, Kolkata, Kiritimati, Honolulu); with the old formatting the three western zones fail. | Medium (wrong dates shown in the Americas) | me | P4 (CI) |
| F183 | **FIXED in P4.3.** ~~Any made-up `/cancel/<slug>` was rendered on request and **written to the server's disk cache**: about nine files per slug, without limit (measured: five random slugs, five sets of files under `.next/server/app/cancel/`). Anyone could grow the server's disk and spend its CPU just by requesting URLs.~~ `dynamicParams = false` on the guide route: an unknown slug is now the prebuilt 404 page, byte for byte, and nothing is written. | Medium (unbounded disk growth from anonymous requests) | me | P4.3 |
| F184 | **FIXED in P5.** ~~`/analytics`, the 404 served while the sample-analytics flag is off, lacked the theme script.~~ Measured: it was Next's bare error document (`<html id="__next_error__">`: no `lang` attribute, no fonts, the theme script never run), because the page calls `notFound()` while prerendering; adding a root `not-found.tsx` and moving the check into the route's layout both left it so. Now, while the flag is off, `next.config` rewrites `/analytics` to a path no page matches, so the site's own 404 answers: in the root layout, `lang="en"`, the theme script run, its CSP hashes (browser test; it fails without the rewrite). The site also has its own 404 page now (`app/not-found.tsx`, the content layout, links home and to the guides). | Low | me | P5 |
| F185 | **FIXED in P5.** ~~The website had no favicon.~~ It uses the app's own icon (the design system's navy coin: `assets/zeno-app-icon.svg`, the same artwork as `apps/mobile/assets/icon.svg`): `app/icon.svg` as an SVG favicon and `app/apple-icon.png` (180 px, from the design system's 1024 px navy icon); Next writes both links. A browser test checks both are linked and served with the right type. | Low (brand) | me | P5 |
| F186 | **FIXED in P4.4.** ~~Turbopack's build cache (on by default for `next build` since Next 16.3) wrote **a snapshot of the whole build environment** into `.next/cache/turbopack/*.sst`: every variable set while building, secrets included, compressed (measured: the canary build's `API_PORT` value sat beside `ALLOW_UNVERIFIED_OAUTH_TOKENS` and this session's own variables; the rest was in compressed blocks a byte scan can't read). Not served (measured 404 on the server, path tricks included), but on the disk of every machine that builds the site, and in anything that copies `.next`.~~ `experimental.turbopackFileSystemCacheForBuild: false`: our builds never keep `.next/cache` (fresh CI runners, no cache step), and Next's own docs say to turn it off then. No `.sst` is written now, and the scan fails if one ever is. | Medium (secrets at rest in build output) | me | P4.4 |
| F187 | **OPEN (owner decision D15).** The ledger's headline "COMMITTED THIS MONTH" is the monthly-equivalent total (a $120/yr plan counts $10), while the two lines under it ("Charged so far", "Still to renew") are this calendar month's real charges. With only monthly plans they agree; with a yearly, quarterly or weekly plan they don't (measured on the emulator: $10.00 headline over $0.00 charged and $0.00 to renew). The design (`ui_kits/app/data.js`: "Used for 'monthly total'") only ever shows monthly plans. | Medium (a headline number that isn't what its label says) | owner (D15) | P5 |
| F188 | **FIXED in P5.** ~~A pending cancellation could be confirmed "Verified cancelled. No charge found. You're saving $185.88/yr." on the day it was reported, a month before the renewal it would be checked against.~~ The design says a self-report is never the end state (UX Architecture, the cancel flow), and the automatic check (`runCancellationVerification`) only resolves after the verify-by date. "Confirm it stopped" now appears only once that date has passed; "I was charged again" stays available throughout. Screen test (before / after the date; the old screen fails it) and Maestro flow 05. | Medium (truthfulness) | me | P5 |
| F189 | **FIXED in P5.** ~~Marking a plan cancelled wiped the charge it had already made this month: Netflix charged Oct 2, cancelled Oct 3, and "Charged so far" went from $15.49 to $0.00 (and the forecast and category budgets with it).~~ `computeBudgetForecast` and `computeCategoryForecast` dropped every non-active plan entirely. A plan reported cancelled (pending or verified) now counts its charges up to its cancellation request and none after; one with no readable request time counts nothing; paused and still-charging plans are unchanged (F157's rule). Tests (the old code fails them) and Maestro flow 05. | Medium (a wrong money figure) | me | P5 |
| F190 | **FIXED in P5.** ~~Family offered "Create household" and "Join household" to someone using Zeno without an account; a household lives on the server, so both could only fail ("You're offline", or the server's 401 shown as "Please sign in again" to someone who never signed in).~~ Without an account it now says "Households need an account", says why, and offers Sign in; no request is made. Screen test (the old screen fails it) and Maestro flow 07. | Low (a dead end) | me | P5 |
| F191 | **OPEN (measured, no verified fix).** A native crash once, right after "Continue without an account" on a fresh install: `IllegalStateException: FragmentManager is already executing transactions` (react-native-screens attaching a screen dispatches an event; Reanimated's `onEventDispatch` flushes Fabric's mount queue inline; that removes a screen view mid fragment transaction). 1 in about 33 runs of that step; 0 in a dedicated 20-run measurement. Matches react-native-reanimated#10316 (open; its reporter bisected it to 4.4.x, but we run 4.3.1 and crashed through a different event), react-native-screens#2318 (open). No released fix; the issue's workaround is a native patch to react-native-screens, which can't be proven here without a reliable repro, so it isn't applied. The nightly Maestro run and (once keys exist) Sentry will measure it; re-test on each screens/reanimated upgrade. | High (a crash on a new user's first tap), rare | me | P5 / upgrades |
| F192 | **FIXED in P5.** ~~When the phone blocks Zeno's notifications (the user tapped "Don't allow", or turned them off later), Settings still said "Renewal reminders" on and the Notifications screen still listed "the reminders that will fire" (F129's promise), while the phone would show none of them; nothing said so or how to fix it.~~ The app reads the phone's permission (on open and on every return to the foreground). When reminders are on in Zeno but blocked by the phone, the Notifications screen says "Notifications are off for Zeno: reminders won't appear until you allow them in your phone's settings" and opens them; Settings' row says "BLOCKED IN PHONE SETTINGS". Tests (the old screens fail them) and Maestro flow 09, run with the permission denied and then allowed. (On an emulator the app never asks: it skips push registration when `!Device.isDevice`; real phones are asked.) | Medium-High (the core promise silently not kept) | me | P5 |
| F193 | **FIXED in P5.** ~~After a scan, Discover said "You could be saving $317.76/year in subscriptions you'd forgotten about": the full yearly cost of everything found called "saving" (true only if all of it is cancelled), every plan presumed forgotten; the share text said the same in the user's voice. The design's results screen says neither.~~ It says "These cost you $317.76/year, a year, at their current prices", and the share text "Zeno found $317.76/year in subscriptions I'm paying for". Also fixed: "Add 1 subscriptions". Tests (the old screen fails 4) and Maestro flow 10, a real CSV import through Android's file picker. | Medium (truthfulness) | me | P5 |
| F194 | **FIXED in P5.** ~~The calendar's third group, "Later this month", is every renewal 15-30 days out, so a Nov 2 renewal sat under "Later this month" on Oct 3.~~ It's "Later", the design's word (this week / next / later). | Low (a wrong label) | me | P5 |
| F195 | **FIXED in P5.** ~~The calendar marked the selected day as having entries whether or not anything renewed then, so TalkBack read today as "You have entries for this day" on an empty day.~~ A day is marked only when it has a renewal ("You have no entries for this day" now, measured on the emulator). | Low (accessibility, a false announcement) | me | P5 |
| F196 | **FIXED in P5.** ~~"Projected year" was the rest of THIS calendar year: $46.47 for a $15.49 plan in October, beside the detail screen's "Per year at current rate $185.88". The design's figure is the month's run-rate × 12.~~ It's a year at current prices now ($185.88): monthly equivalents × 12 (F66's per-cycle rule kept), a yearly plan or a trial's conversion once, an unknown cycle 0; the same in every timezone. | Medium (a number that disagreed with another screen) | me | P5 |
| F197 | **FIXED in P5.** ~~The calendar's "This month" counted only renewals still dated in this month on the grid ($0.00 for a plan charged on the 2nd), while the ledger counted that month's charge ($15.49).~~ The design's "This month" is the monthly total of every plan; it is now the ledger headline's own figure (one rule, F157), with no renewal count beside it (the design has none). `getMonthlyTotal` and `getMonthRenewalCount` (F181) are gone with it. Its wording follows whatever D15 decides for the ledger. | Medium (two screens, two numbers for one month) | me | P5 |
| F198 | **FIXED in P5.** ~~Insights' overview said "streaming leads your category spend" above a breakdown that says "Entertainment 61%": it grouped by the benchmark categories (Netflix's catalogue category), not the user's own. The breakdown also wrote "ai_tools" as "Ai Tools" where every other screen says "AI tools".~~ The overview groups by the user's categories and both use the shared `categoryLabel`. Tests (the old code fails each) and Maestro flow 12. | Low (two names for one category on one screen) | me | P5 |
| F199 | **OPEN (Low).** Every made-up guide address (`/cancel/<anything>`) is answered correctly (the static 404, since F183), but `next start` also writes `Error: Internal: NoFallbackError` to the server log for it (measured: one line per request; `/no-such-page` and `/analytics` log nothing). Anyone can fill the error log with them, which can bury a real error. Inside Next's handling of `dynamicParams = false`; no fix found that doesn't guess at its internals. Re-check on each Next upgrade, and filter it in log alerting (P8). | Low (log noise under outside control) | me | P8 / Next upgrades |
| F200 | **OPEN (Low), measured.** On a wide screen the homepage switches to book mode just after load, and the two modes are different element trees, so the switch remounts every section: text typed before it is lost (measured: the form's input element is replaced). The window is ~65 ms after load at normal speed and ~500 ms with a 4x-slowed CPU, too short for a person; on phones (no book mode) a tap even before hydration works (React replays it: 4 of 4 sent and receipted, measured). It made a CI test flaky (CI 37137561648): the test typed within the window. The test now waits for book mode on desktop (bite check at 4x CPU: without the wait 5 of 5 fail, with it 5 of 5 pass). Making both modes one tree is a design-level change to the book, not done. Two fixes I first tried were measured wrong and dropped: an uncontrolled input and a button disabled until hydration (the phone was never losing text; the disabled button would have blocked React's replay). | Low | me | P5 |
| F201 | **FIXED in P5.** ~~An ending trial's insight was titled "Trial ends in 0 days" on its last day and "Trial ends in 1 days" the day before; the add screen read "in 0 days" for a renewal today.~~ "Trial ends today", "Trial ends tomorrow", and "today" on the add screen. Tests. | Low (wording) | me | P5 |
| F202 | **FIXED in P5 ("which today?").** ~~"Today" and "this month" were the UTC date everywhere: countdowns, the renewal roll-forward, the calendar's groups, insights' day counts, the budget's month and its "charged so far", spend history, year in review, the trial guardian, the add screen's "in N days". Near midnight the app was a day off the user's own calendar: at 22:00 on Oct 6 in New York (02:00 UTC on the 7th) a renewal on the 7th read "today" and counted as "charged so far".~~ "Today" is now the user's calendar date as a day label (`todayLabel` in `@zeno/shared`, with `daysFromToday`, `currentMonth`), and every one of those places uses it; renewal dates stay day labels and day arithmetic stays in UTC (§10). Tests at the boundary for each place in New York, Los Angeles, Kolkata and Kiritimati (each fails with the old code), and the whole logic suite passes in Honolulu, Kiritimati and New York. | Medium (dates and money a day off near midnight) | me | P5 |
| F205 | **FIXED in P6.1: six unused schemas removed, every limit of the two used ones pinned (100 %, 28 of 28).** ~~The input schemas in `packages/shared/src/schemas.ts` score 22 % (19 of 86 mutants killed, by every package and API test). The one that matters for security: the cap of 64 entries on a sync vector clock (a size limit against oversized requests) can be removed, or moved to 63, and no test notices. Most of the other 66 are accepted values (currencies, categories, difficulty levels) that no test sends, so dropping one would reject real input unnoticed.~~ Only the sync pull and push schemas had a user (the API); the sign-in pair was a weaker copy of the API's own (no 254-character email cap). | Medium (an unguarded size limit) | me | P6.1 |
| F206 | **FIXED in P6.1: the unused detector removed; the app-name extractor the app uses at 85.42 %, every survivor equivalent or a timeout.** ~~The email-receipt parser (`discovery/email-receipts.ts`) scores 63 %: 72 changes pass every test, among them the confidence score (raising or lowering it), the order results are returned in, the category it guesses, and the rule that drops a direct email without billing words.~~ Nothing called that detector: the app's own scanner does that work. | Medium (discovery accuracy) | me | P6.1 / P6.4 |
| F207 | **FIXED in P6.1: the list is pinned whole (100 %), and two statuses corrected.** ~~The partner list the public `GET /api/v1/partners` returns is checked only as "an array of 5 or more". Its `exportsFinancialData` flag, which tells a reader whether an integration sends their money data elsewhere, can be flipped on any entry unnoticed.~~ Pinning it showed Google Sheets and Slack labelled "dev adapter" (built, in development) with no code for either in the repository; both now read "planned", like the other three. | Low (truthfulness of a public statement) | me | P6.1 |
| F208 | **FIXED in P6.2 (a test that was missing; the code was right).** Revoking one account's sessions (account deletion) could be changed to revoke EVERY account's refresh sessions, pending sign-in links and pending codes, and no test noticed: every test revoked one user with no one else on the server. `auth-scope.test.ts` now signs in a second user and holds a link and a code pending for two more, and all three still work after the first account is revoked. | High (one deletion would sign everyone out) | me | P6.2 |
| F209 | **FIXED in P6.2 (missing test).** The per-address limit on sign-in emails (5 per 15 minutes from any IP, the guard against bombing one inbox) could have its window cut to 250 ms, or never reset, or be wiped by the periodic sweep, unnoticed. Now tested at 1, 14 and 15 minutes, across a sweep. | Medium | me | P6.2 |
| F210 | **FIXED in P6.2 (missing test).** The sweep could be changed to delete live sessions instead of used-up ones (signing everyone out each time it ran), unnoticed. Now a live session is refreshed after a sweep. | Medium | me | P6.2 |
| F211 | **FIXED in P6.2 (missing test).** A household member's monthly spend could be dropped to 0 on create and on join (`?? 0` turned into `&& 0`), and the USD default on join blanked, unnoticed: no test created a household with a spend. `family-spend.test.ts` now sends both and reads them back. | Medium (money shown to a household) | me | P6.2 |
| F212 | **FIXED in P6.3 (missing tests).** After a failed sign-in (a link request, a link, the demo, Apple, Google) or a rejected refresh, the app's auth store could be changed to say `isAuthenticated: true`, unnoticed: the failure tests read the status and the error, never the flag the screens gate on. And the 14-minute refresh timer could be left running after sign-out. Each failure now asserts signed-out, and no timer is left after sign-out, a rejected refresh, or a session that vanished from the keychain. | High (a screen gated on a false "signed in") | me | P6.3 |
| F213 | **FIXED in P6.3 (missing tests).** The crash-report scrubbers (what may reach Sentry) could be loosened so that "Rs 499", "12,499.00 INR", a bearer token after two spaces, a long token whose first digit follows letters, emails inside a list, or a log entry's message and parameters went out unscrubbed, and no test noticed. Each case is now tested, with the opposite edge (a count stays a number). | High (user data in a third-party service) | me | P6.3 |
| F214 | **FIXED in P6.3 (missing tests).** Exchange rates: an HTTP error or a "not success" answer from the rate source, and a zero, negative or non-numeric rate, could all have been accepted unnoticed (a negative rate would turn every converted price negative). Each now gives no rate, as designed (the totals then show what could not be converted). | Medium (money shown to the user) | me | P6.3 |
| F215 | **FIXED in P6.4 (found by a property test, on CI).** `parseAmountMinor("-0.00")` returned minus zero, not zero (also "$-0.00", "(0.00)", "0.00-"). Harmless where it was used (it is not below zero and prints as 0.00), but a signed zero in money code; now zero. The property passed locally and failed on GitHub with another random draw; that case is now always tried (`examples`), and a plain test pins the five spellings. | Low | me | P6.4 |
| F216 | **FIXED in P7.2 (found by reading ASVS V9.2.1 against the code).** Neither token check read the "not before" (`nbf`) claim: an Apple or Google identity token, or one of our own, that was not valid yet would have been accepted. Both now refuse a future `nbf` (our tokens carry none; a provider's may). Tested both ways (`auth-social.test.ts`, `auth-nbf.test.ts`); both tests fail on the old code. | Low (no known provider token arrives early) | me | P7.2 |
| F217 | **FIXED in P7.2 (ASVS V14.3.2).** No API answer said `Cache-Control`: answers carrying tokens (sign-in, refresh) and a user's data could be kept by a browser or a proxy cache. Every answer now says `no-store`, errors and 404s included (set in the first request hook). `app.test.ts` checks a 200, 400, 401 and 404; it fails on the old code. | Low (the app is the client; no cache sits in front of the API today) | me | P7.2 |
| F218 | **FIXED in P7.2 (ASVS V15.3.2).** Every outbound call (Resend, the AI provider, RevenueCat, the JWKS endpoints, the alert webhook) followed redirects, fetch's default: a redirect would have re-sent the request, API key included, to a host nobody reviewed. `fetchWithTimeout` now refuses any redirect. `http.test.ts` checks it on a real local socket (the redirect target is never called); it fails on the old code. | Low (needs a provider, or the operator's webhook URL, to redirect) | me | P7.2 |
| F219 | **FIXED in P7.2 (ASVS V15.3.5, V15.3.7).** `GET /services`, the one route that reads its query without a schema, turned a repeated parameter into a joined string (`q=net&q=hulu` searched "net,hulu") or silently dropped it (`limit`, `offset`). A repeated `q`, `limit` or `offset` is now a 400; every other route already refused it through its schema. `http-message.test.ts`; fails on the old code. | Low (public catalogue) | me | P7.2 |
| F220 | **FIXED in P7.2 (ASVS V6.6.2).** Requesting a new sign-in email replaced the code but left the earlier LINK working for the rest of its 10 minutes: an old email in the inbox, forwarded or intercepted, still signed in. A new request now retires the address's earlier link (deleted in memory and, awaited, in Postgres, so a restart can't revive it). `auth.test.ts`: the first link answers 401, the second signs in, another address is untouched; fails on the old code. | Low | me | P7.2 |
| F221 | **FIXED in P7.2 (ASVS V7.2.4).** Signing in again on the phone replaced the session there but left the previous one alive on the server until its refresh token expired (30 days). The app now revokes the previous refresh token (`/auth/logout`) once the new session is stored; offline, the revoke fails quietly and the sign-in stands. `authStore.flows.test.ts` (magic link and Apple); fails on the old code. | Low | me | P7.2 |
| F222 | **FIXED in P7.2 (ASVS V3.5.3, V14.2.1).** Using up a sign-in link was `GET /auth/verify?token=…`: a state change on a GET, with a one-time token in a URL, where proxies and histories keep it. It is now `POST /auth/verify` with the token (or email and code) in the body; the GET is removed and answers 404. No released app used the GET (pre-launch); an emulator build from before this commit can't verify links against the new API. 45 test call sites moved to the POST. `http-message.test.ts` fails if a GET is added back. | Low | me | P7.2 |
| F223 | **OPEN (owner, P8.5): the contact addresses receive no mail.** `zenoapp.in` has no MX record (Google's and Cloudflare's resolvers, 2026-10-05), and with no MX, mail falls back to the A record, Netlify's web servers, which accept none. So `privacy@` (the privacy policy's address for data requests), `legal@` (the terms), `feedback@` (the app's feedback button) and `security@` (security.txt) all bounce. Found while adding the disclosure contact; `SECURITY.md` also named the wrong domain (`zeno.app`), fixed. | High (legal: requests under privacy law go unanswered) | owner | P8.5 |
| F118 | **FIXED in P3.8d.** ~~Opened at a cold start, the subscription page's edit form showed no name, $0.00 and no date.~~ The form's fields were seeded once by `useState` on the FIRST render. When the page opens before storage has loaded (from a notification or a link at cold start), that render has no subscription yet, so the form held empty values for a subscription that had all three, and Save then refused "$0.00". The form is now filled from the subscription as it is when editing starts. Reproduced in the screen test, where the subscription arrives from storage after the first render, as at a cold start. | Medium | me | P3.8d |
| F112 | **CLOSED in the P3 gate (2026-10-02): reachable, not a bug.** TalkBack, driven by touches from the emulator's own touchscreen, put its focus on each nested button's exact bounds, separately from its parent: the calendar's "Cancel Figma", the menu's Edit/Pause/Delete, the login's Terms and Privacy links. Original note: on the calendar's day panel, "Cancel <name>" is a button nested INSIDE the row's button. RNTL's name matching counts the nested label as part of the outer row. Whether TalkBack and VoiceOver can reach the inner button at all is platform behaviour I will not state from memory. Settle it in the P3 gate with `uiautomator dump --compressed` and TalkBack. The same pattern is on Discover's results (a checkbox nested inside each row's "Edit" button) and in the subscription page's Android menu (Edit, Pause and Delete nested inside the "Close menu" backdrop button). | to be measured | me | P3 gate |
| F104 | **OPEN: owner decision.** `expo-screen-capture` adds 3 Android permissions for its screenshot LISTENER, which Zeno doesn't use: `READ_EXTERNAL_STORAGE` (API <= 32), `READ_MEDIA_IMAGES` (API 33) and `DETECT_SCREEN_CAPTURE` (34+). `DETECT_SCREEN_CAPTURE` must stay: blocking it crashed the app at launch on the Android 16 emulator, because the module registers a `ScreenCaptureCallback` in `OnCreate`. A test now forbids blocking it. The two read permissions look removable (on API <= 33 the module registers a media observer and only checks the permission when a screenshot arrives), but that path has never run on a device here: the only installed image is API 36, and an API 33 image is a large download. `READ_MEDIA_IMAGES` may also need a Play Console declaration. Options: (a) download an API 33 image, prove it, and remove both; or (b) keep them and file the declaration. | Low | owner | before Play release |
| F105 | **FIXED in P3.7 (found on the emulator).** ~~The locked app stayed readable to accessibility services.~~ The lock overlay is drawn on top of the app, but the app underneath stayed in the accessibility tree. With the app locked, `uiautomator dump --compressed` (the nodes accessibility services get) held 77 labelled nodes, every ledger amount included ("$107.46", "Netflix … $15.49 per mo"). So a screen reader, or any app granted accessibility access, could read the finances through the lock. Now `HiddenWhileLocked` hides the app's content (`no-hide-descendants`, `accessibilityElementsHidden`) whenever the overlay is up, on the same condition that draws it, and never remounts the app. Proven on the device: locked, 9 labels, all the lock screen's, no money; unlocked, the ledger is back. Bite-checked in jest. | High (financial data readable while locked) | me | P3.7 |
| F106 | **CLOSED, NOT REPRODUCED (not claimed fixed), FX.5.** 5 attempts in all (2 earlier, 3 fresh installs in FX.5: 9 captures, all normal), plus every unlocked capture of the P3 gate; since F159 the lock cover is its own window. P5 keeps watching. Original: After the first unlock following a fresh install, three screenshots of the unlocked app came back fully black, although the app window no longer carried `FLAG_SECURE`, the display was awake, and the home screen captured normally. In 2 later attempts (a return from background, and a cold start), the unlocked app captured normally at 4 s and at 10 s. Cause unknown. It fails safe (blocking a screenshot, not leaking one). Re-check during P5's end-to-end runs. | Low | me | P5 |
| F100 | **FIXED in P3.5.** ~~A sign-in link someone else sent was honoured.~~ `_layout.tsx` passed every `zeno://auth/verify?token=` link straight to `verifyMagicLink`, in any state. Someone could request a link for THEIR own email and send the victim `zeno://auth/verify?token=<theirs>`, and one tap signed the victim's phone into the sender's account. A junk token took the failure path, `clearStoredSession()`, which signed a signed-in user OUT; the old test "a failed verification clears any session" had written that down as intended. Now a link is honoured only if this device requested one for that email, the request is unexpired (the server's `expiresInSeconds`), and nobody is signed in. Otherwise it is refused before any server call. After verifying, the access token's `email` claim must match the email typed, or the session is discarded unstored. Bite-checked: the old handler fails 6 tests. | High (account takeover of the app's sync target; forced sign-out) | me | P3.5 |
| F101 | **OPEN: owner input.** Settings → "Rate Zeno" opens `https://apps.apple.com/` on every platform, so Android users land on Apple's store front page, not Zeno's listing. The fix needs the real listing links (the App Store id and the Play package page), which exist only once the app is published. | Low | owner | before store release |
| F98 | **FIXED in P3.4.** ~~Settings → App lock checked the PIN with no attempt limit.~~ Turning the lock off called `verifyPin()` directly, outside the lock store's counted `tryPin`. Anyone holding the phone with the app unlocked could try every PIN there without a lockout, learn it (people reuse PINs), and switch the lock off. A keychain error also left the screen stuck busy. It now uses `tryPin` (the same 10 attempts and lockout as the lock screen) and fails closed. Bite-checked: the old handler fails 4 screen tests. | Medium | me | P3.4 |
| F99 | **FIXED 2026-10-01 (cause found on the second occurrence).** The jest `github-actions` reporter named it on CI 36840880514 (`f7aa418`, a docs-only push): `security-screen.rntest.tsx`'s FIRST test "Exceeded timeout of 5000 ms". A suite's first render pays for transforming the RN module graph, and CI's transform cache is cold: measured here with `--no-cache`, ~2.1 s for each suite's first test (206 ms warm), on a 24-core machine. The jest project's `testTimeout` is now 30 s. The first occurrence (`844b49a`) left no detail; it was the same step and the same new suite, so very likely the same, but not proven. Original: **an intermittent CI-only jest failure, cause unknown.** CI 36839777837 on `844b49a` (P3.4) failed the step "RN component tests + coverage floor (jest)" with only "exit code 1" visible. The same command passed locally (130/130, every floor held), and CI passed on the next push `2d6a752`, which changed no test (it only added the reporter below). Which test failed, or whether a coverage floor did, cannot be read without a GitHub login. Jest now has its built-in `github-actions` reporter, so the next failure is an annotation readable through the public API. That reporter is only proven once something fails. | Low until explained | me | the next occurrence |
| F97 | **EXPLAINED AND FIXED 2026-10-01 (with F102).** The diagnostics added for it named the cause on CI 36846386965 (`3e541c9`). The only storage error logged was the simulated sync refusal, so the billing, family and Plaid deletes had SUCCEEDED and their rows came back afterwards. Two causes. (1) The test's wait was `[...].every((ns) => rows().then(...))`: `Array.every` doesn't await, each callback's Promise is truthy, so it never waited for the fire-and-forget writes (checked: `[1,2].every(() => Promise.resolve(false))` is `true`). Both F75 tests had it. (2) The code then let those still-in-flight writes land AFTER the deletion on a pooled server: that is F102, a real bug. Original: **OPEN (mine): an intermittent CI-only failure, cause not yet known.** `real-pg.test.ts`'s F75 test refuses the sync deletes, then expects only Alice's 2 sync rows to remain after the 503. Twice on CI, other namespaces' rows remained too: `plaid` on `3ad75f7` (a Dependabot branch), `billing`, `family` and `plaid` on `3553165`. It has never failed locally (PGlite). Every delete step is awaited and none retries, and each of those rows is written once and seen in the database before the delete. If those deletes failed under load, that is the designed 503 path, and a retry deletes them. If they remained with no error, it is a deletion bug. The CI log needs a GitHub login, so the assertion now prints the storage errors captured during the request. | Medium until explained (account deletion is a promise to the user) | me | the next occurrence |
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

### P3.1 — done — 2026-10-01

Green on GitHub: CI 36826726239 and CodeQL 36826726322 on `aea3587`.

### P3.2 — release console stripping; error reports carry no token or email — 2026-10-01

**Measured first.** The app's own code has no `console.log`, `info` or `debug` at all:
only 18 `console.warn` and 1 `console.error`, which the plan says to keep. Each `warn`
prints a fixed message plus the caught error, from the local data stores (budgets, quiet
hours, exchange rates, notification settings, price history, subscriptions, erase steps),
none of which holds a token or an email.

The release JS bundle (`expo export --platform android --no-bytecode`) told a different
story: it shipped 18 `console.log`, 4 `info`, 9 `debug` and 1 `trace`, all from bundled
libraries, attributed one by one through the bundle's source map. Among them is
RevenueCat's logger, which forwards every SDK message to `console` at its level; the app
never calls `setLogLevel`, so it runs at the default. The two `expo-notifications` debug
lines were read: neither logs a push token.

**The change:**
- **`babel-plugin-transform-remove-console` 6.9.4**, a dev dependency pinned exactly, with
  no dependencies of its own. `npm audit` counts were identical before and after
  (19 moderate, 1 high, all pre-existing), and CI's `scripts/audit-gate.mjs` passes.
- **`babel.config.js`:** production only, `exclude: ["error", "warn"]`. The Babel cache
  is now keyed by the environment instead of `api.cache(true)`, which would have frozen
  whichever environment loaded first.
- **Re-exported and recounted:** 0 `log`, 0 `info`, 0 `debug`, 0 `trace`; `warn` (221) and
  `error` (107) unchanged.

**`captureError` (`src/monitoring/report.ts`).** It has one caller, `AppErrorBoundary`,
which passes only the React component stack, so no token or email path exists today. But
nothing guaranteed it: the error's message and stack are free text. Now
`src/monitoring/redact.ts` redacts the error (message AND stack) and the context before
anything reaches `console.error` or Sentry:
- URL query values of credential keys (`token`, `code`, …): the magic-link verify URL and
  Gmail's revoke URL carry one-time tokens there;
- `Bearer <token>`;
- JWTs;
- email addresses;
- any 32+ character base64url or hex run containing a digit (our 43-character tokens).
  The digit keeps long CamelCase component names readable.

An Error with nothing to redact is passed through as the same object, so its stack and
identity are intact. Past a depth of 4 a value is dropped as `[truncated]`, never passed
through unredacted. P3.3's Sentry `beforeSend` will reuse it.

**Tests** (25 in `src/monitoring`: 14 in `redact.test.ts`, 11 in `report.test.ts`; plus 3 in `babel.config.test.ts`): every real token
shape from this codebase is removed; ordinary diagnostics (amounts, ids, routes, long
component names) are untouched; `captureError` end to end, where neither the log nor
Sentry receives the token or the email from the message, the stack or the context, while
the error type, the throw site and the component survive; and the Babel config (production
strips `log`/`info`/`debug`/`trace` and keeps `warn`/`error`; development and test strip
nothing; `BABEL_ENV` wins; the cache is keyed by environment; reanimated's plugin stays
last).

**Bite checks:** 13 mutations, all caught. Two of them, at first, were NOT:
- Removing the JWT rule or the Bearer rule changed nothing, because every sample token
  was also long enough for the long-token rule.
- The Bearer rule does close a real gap: a SHORT bearer token (under 32 characters) is
  caught by nothing else. That sample is now tested.
- The JWT rule adds no safety: every RS256 JWT's header alone is 36 characters. It is
  kept for its specific label, which is now what its test checks, stated as such.

**Also, my own test bug caught before it counted.** I first wrote a depth test asserting
that an email nested five levels deep passes through unredacted. That was a hole, not a
feature; the code now drops such values. Coverage then dipped below the ratchet (99.62 %
against 99.66 %) on one new branch, an Error with no stack. It is now tested: it is
redacted and stays stackless.

Gates after the final edit: `tsc -b --force` and every workspace typecheck 0 · lint 0 ·
vitest 133 files / 1727 tests at 100 / 99.66 / 100 / 100 · jest 114 / 114.

### P2.9 follow-up — a flaw in my schema-valid generator, found by itself — 2026-10-01

During P3.2's full test run, `schema-valid.test.ts` failed on its 193rd generated case
for the billing webhook: `{"event":{"":{"__proto__":null},"app_user_id":" "}}` got a 400
("Malformed request."), and the test expected 200. **The API was right:** the parser
rejects a `__proto__` key at any depth, by design (P2.4, pinned in `fuzz.test.ts`).
**My generator was wrong:** it kept parser-rejected keys out of an object's own extra keys,
but not out of the free-form JSON values nested inside them. It had passed every earlier
run by chance; the 200-run CI property could have failed on any push.

**Fix:** the free-form values are filtered with `hasRejectedKey`, which checks every depth.
Bodies like that remain the fuzz suite's job. The exact counterexample's shape is caught
by the filter (`true`); ordinary nested values pass (`false`). The webhook property then
passed 3 runs of 2 000 cases each (10 × CI).

**Also a process slip, caught in time:** my gate command was a chain of parenthesised
groups that did not stop on a failure, so it amended the P3.2 commit even though this
test had failed. Nothing was pushed. From now on the commit runs only if every gate
exits 0.

### F88 reopened by CI, fixed in code — 2026-10-01

CI 36828125002 on `f75bdf3` failed the F88 timing test on GitHub's Linux runner. The
medians there were: live 83.5 µs, revoked 82.0, expired 75.3, **foreign signing key
46.7**. On this Windows machine all four had been 28–29 µs, which is why the local
measurement missed it. On Linux, a forged token answered about 35 µs faster than a genuine
one, which tells a caller whether a token was ever really issued. That is exactly the leak
the plan's "same code path for unknown vs revoked" forbids. The test did its job; my
earlier "the code meets the intent" was true only for this machine.

**The cause, in the code:** a bad signature returned straight after the RSA verify. A
genuine token went on to decode the payload, check the claims, hash `sub` and look up the
revocation map. No Linux was available here (no WSL, no Docker) to time which step costs
the 35 µs, so the fix removes the difference rather than tuning one step.

**The fix:** `verifyAccessToken` now does the same remaining work for every well-formed
token (the decode, the claims, the SHA-256 and the revocation lookup) and decides only at
the end.

**A deterministic test** pins the "same code path": it counts SHA-256 calls (the
revocation lookup) per kind of token, with `node:crypto` wrapped. Live, revoked, expired,
foreign key, wrong audience and wrong issuer each do exactly 1. Bite-checked: with the
early return restored, the foreign-key token does 0. The CI timing test stays as a second
check.

**Not yet proven:** that the Linux runner's medians now agree within 25 %. The next CI run
is that measurement.

### Open items in one file; three solved now — 2026-10-01

At the owner's request, everything not yet solved is now listed in one place:
**`docs/OPEN_ITEMS.md`**. It has three parts: what needs the owner (each with the exact
action), what is mine and scheduled, and what was solved in this pass. Built from this
log's finding rows (94 of them), each read in full, not from memory.

**Solved now, each bite-checked:**
- **F29** (Settings' inbox row). `src/discovery/connected-inboxes.ts`: a pure label, plus
  a hook that re-reads `listConnectedGmailAccounts()` (the list Discover uses) on every
  focus, with `useFocusEffect` (its contract read in expo-router 56.2.21's own type
  file). It shows "…" while reading and "Unavailable" when the keychain can't be read.
  5 jest tests with a 100 % floor. 5 mutations, all caught: error shown as "None
  connected", the count ignored, a late answer or a late failure still setting state,
  blur never cancelling.
- **F18** (CSV currency). The currency detector moved from `emailScanner.ts` to
  `discovery-helpers.ts`, its regexes checked identical after the move. It gained a
  null-when-no-evidence variant, `currencyEvidence`; the email path keeps its USD
  default. `parseCSV(csv, fallbackCurrency)` makes the fallback required, so no caller
  can silently default to USD; Discover passes the home currency. Only the money cells
  count, not the description. Every symbol form was first confirmed to parse
  (`parseAmountMinor` probe). 4 mutations, all caught.
- **F95**, found by F18's own test (`CA$` read as AUD). Fixed, with detector tests.
- **F15**, confirmed from the code: no paid feature is server-side, so there is nothing
  to gate. It exposed **F96** for the owner.

**My mistakes caught on the way:**
- A one-off jest command with a custom root printed a misleading "coverage data not
  found"; the real config run is the check.
- My `sed` could not rewrite nested `parseCSV(...)` calls; the test file now uses one
  helper.
- A first F95 test expected `"CA$12.00 $"` to be CAD. It is a 1–1 tie, which the
  detector's documented rule gives to USD, so the test was corrected to two `CA$`
  against one `$`.
- A `grep` with a mangled pattern printed `0` after a bite-check restore. The file was
  re-verified with a fixed-string search and a byte comparison: restored correctly.

**Before committing:**
- The gates stopped on coverage: Vitest counted the new hook, which jest tests. It joined
  the jest-owned exclude list in `vitest.config.ts`, as P1.8a did for the others; CI's
  `test:rn:coverage` shows it at 100 %.
- One new branch of mine was untested: a ragged CSV row shorter than the money column. It
  is now tested (detection and currency unaffected).

Gates after the final edit: `tsc -b --force` and every workspace typecheck 0 · lint 0 ·
vitest 1743 tests at 100 / 99.66 / 100 / 100 · jest 119 / 119, with the per-file floors
held.

### P3.2 — done — 2026-10-01

Green on GitHub: CI 36828700036 and CodeQL 36828699880 on `87ac086` (P3.2's own commit
`68c9fcf` was pushed with it and has no run of its own), and again on `47211fe`.

### P3.3 — what Sentry receives — 2026-10-01

**Read first, not assumed** (`@sentry/react-native` 7.11.0 on `@sentry/core` 10.37.0,
from `node_modules`):
- `sendDefaultPii`, `attachScreenshot`, `attachViewHierarchy` and
  `enableCaptureFailedRequests` all default to false (`options.d.ts`, and `sdk.js`'s
  `DEFAULT_OPTIONS`). With `sendDefaultPii` false the client tells Sentry's relay
  `infer_ip: 'never'` (`client.js`).
- `beforeBreadcrumb` runs BEFORE a breadcrumb is stored (`core/breadcrumbs.js`), and the
  RN SDK copies the STORED breadcrumb to the native layer (`scopeSync.js`), so native
  crash reports get the scrubbed one.
- `beforeSend` is stripped from the options given to the native SDK (`wrapper.js`): a
  native (Java/NDK) crash never passes through it. It carries the native stack plus the
  synced scope. That scope holds only breadcrumbs: the app calls no `setUser`, `setTag`,
  `setExtra` or `setContext` (source search).

**Before:** `Sentry.init` had `tracesSampleRate: 0` and a `beforeBreadcrumb` that only
stripped query strings from fetch/xhr URLs. There was no `beforeSend`. An error from
anywhere other than `captureError` (the global handler, an unhandled rejection) went out
unredacted, as did any console breadcrumb's message and arguments. Amounts went out
everywhere: P3.2 deliberately kept them in the on-device log.

**Change** (`src/monitoring/sentry-scrub.ts`, wired in `report.ts`):
- `Sentry.init` now spells out `sendDefaultPii: false`, `attachScreenshot: false` and
  `attachViewHierarchy: false`, even though they match today's defaults, so a changed
  default or a careless edit fails a test.
- `scrubText` = redact.ts's rules plus amounts: a currency marker next to a number
  (`$`, `€`, `£`, `₹`, `Rs.`), or a number followed by an ISO code. `CA$12.00` becomes
  `CA[amount]`. A bare number can't be told apart from a line number or an id, so it is
  kept, except under a money-named key (`amount`, `price`, `cost`, `total`, `balance`,
  `spend`, `income`). That rule over-redacts on purpose: a `totalCount` is hidden too,
  and its test says so.
- `scrubBreadcrumb` (every breadcrumb):
  - message and data are scrubbed;
  - fetch/xhr URLs still lose their whole query string.
- `scrubEvent` (`beforeSend`) returns a copy, never mutates the SDK's event, and never
  drops one.
  - **Scrubbed:** message, logentry, each exception's value, each frame's source-context
    lines, breadcrumbs, extra, contexts other than `trace`, string tags, and the request's
    URL (query stripped), headers and data.
  - **Dropped whole:** user, frame `vars`, the `Authorization`/`Cookie`/`Set-Cookie`/
    `Proxy-Authorization` headers, cookies, query_string, env.
  - **Kept, because Sentry needs them to group and symbolicate:** event_id, release,
    frames' filename/function/line, and the `trace` context's ids.
- The old test "non-http breadcrumbs are left untouched, even with `?token=`" asserted
  the narrow behaviour. It is replaced: a navigation breadcrumb's token is now redacted
  and its harmless query (`?tab=2`) kept.

**Tests:** `sentry-scrub.test.ts` has 23. The 5 breadcrumb tests moved there from
`report.test.ts`, which now has 6 (was 11), and its init test asserts the exact options.
- One event carries a token, an email and an amount in every free-text place. The test
  checks that none survives anywhere in the serialised event, nor the IP.
- An empty and a sparse event come back unchanged.
- The SDK's event is not mutated.

**Bite check: 13 mutations, all caught.** The files were restored byte-identical
(`cmp`):
- no amount rule;
- no `beforeSend`;
- no `sendDefaultPii`;
- no `attachScreenshot`;
- user kept;
- auth headers kept;
- `vars` kept;
- breadcrumb message raw;
- `trace` scrubbed;
- no money keys;
- http query kept;
- request URL query kept;
- the event mutated in place.

**A flake fixed on the way.** The long-token rule needs a digit, and about 0.067 % of
random 43-character tokens have none (1 in 1,489: `(54/64)^43`). P3.2's
`redact.test.ts` "a bare refresh token" therefore failed about once in 1,490 runs. Both
test files now draw the sample until it has a digit. The rule's limit is unchanged and
still documented in `redact.ts`.

**Not provable here:** no DSN exists, so no event has reached a real Sentry project. The
device smoke "after the keys" in `OPEN_ITEMS.md` now includes checking one JS error and
one native crash in the Sentry UI for scrubbed content.


Gates after the final code edit: `tsc -b --force` and every workspace typecheck 0 · lint 0 ·
vitest 134 files / 1761 tests at 100 / 99.67 / 100 / 100 (the ratchet rose from 99.66
because the branch count grew to 2774; the same 9 defensive branches stay uncovered) ·
jest 119 / 119, with the per-file floors held.

### CI on `3553165` (P3.3): two intermittent API failures — 2026-10-01

P3.3's push went red on GitHub (CI 36833430965; CodeQL 36833430869 green). Both failures
were in API tests the commit did not touch. Both had happened before: the annotations of the 12 most recent
failed CI runs (read through the public API) show each one once earlier.

**1. The F88 timing test: explained, test fixed, and F88's story corrected.**
- Medians on CI were live 69.0 µs, revoked 68.3, expired 69.1, foreign key 38.4. That is
  the same shape as the failure that started F88 on `f75bdf3`: revoked 82.0, foreign key
  46.7.
- `verifyAccessToken` does identical work for both, so the gap had to be inside the RSA
  verify.
- Measured here (2000 samples each, Node 24):
  - a genuine signature, 13.1 µs;
  - a forged one below our modulus, 13.5 µs;
  - a forged one at or above it, 3.8 µs.
- OpenSSL rejects an out-of-range signature before any arithmetic. The test's foreign key
  is fresh each run, so its single signature is out of range on some runs and not
  others.
- **Reproduced in place:** with an out-of-range sample, the timing test failed in both
  runs where one existed, and passed in the two where none could (the foreign modulus was
  smaller). The file was restored byte-identical.
- **Not a leak:** the modulus is public (JWKS), so the sender can see their own signature
  is out of range. A fast answer tells them nothing about the server.
- **So my F88 diagnosis was wrong.** I had blamed the early return after a bad signature.
  This machine measured that work at under 1 µs, so it could not explain 35 µs. The code
  change (same work for every token) and its deterministic one-lookup-each test are kept:
  they are what "same code path" means. The comments in `auth.ts` and the test are
  corrected.
- The timing test now forges an in-range signature (the case that costs the server a
  real verify), asserts that it is in range, and passed 5 of 5 runs here.

**2. `real-pg.test.ts:341` (F75 refused deletion): NOT explained.** Logged as **F97**,
with the evidence in its row. I did not re-run CI until it passed, and did not add a
retry: that would hide a possible deletion bug. The assertion's failure message now
carries the storage errors the test captured, so the next occurrence says why.

**Also:** the one lint warning on CI, an unused `CurrencyCode` import left in
`emailScanner.ts` by F18, is removed. Lint passed with it (warnings don't fail), which is
how it slipped through.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1761 at
100 / 99.67 / 100 / 100 · jest 119 / 119.

### P3.3 — done — 2026-10-01

Green on GitHub: CI 36834676134 and CodeQL 36834676176 on `a74417c`, the first green run
containing P3.3's `3553165`. F97 stays open until a CI failure explains it.

### P3.4 — the PIN — 2026-10-01

**Read, not assumed** (`app-lock.ts`, `lock-store.ts`, `secure-store.ts`,
`LockOverlay.tsx`, `app/security.tsx`, `app/_layout.tsx`):
- **Salt:** 16 bytes from `expo-crypto`'s `getRandomBytes`, new on every `setPin`.
- **Derivation:** PBKDF2-HMAC-SHA256, 600,000 iterations, 32-byte key, through the native
  `react-native-quick-crypto`. Stored as `v3$600000$<salt>$<hash>`. Older v1/v2 hashes
  verify once and are upgraded to v3. Compared with `timingSafeEqual`.
- **Where it lives:** SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (the Android
  Keystore and the iOS keychain). It is never backed up: Auto Backup is off (P3.1,
  F92).
- **PIN length:** 4 to 8 digits. Only digits get through (`replace(/[^0-9]/g, "")`, both
  screens).
- **Lockout:** 10 wrong PINs lock for 15 minutes. The state is persisted, so killing the
  app doesn't reset it. During a lockout even the right PIN is refused without being
  checked, and biometrics are refused too. The counter is kept until a successful
  unlock.
- **Lock on background:** yes. `_layout.tsx` calls `lockNow()` when the app goes from
  active to inactive or background (so the switcher thumbnail shows the cover), and
  again on the way back. The overlay is drawn whenever the lock is engaged or not yet
  hydrated.
- **No PIN in logs or state:** the stores hold no PIN, only a count and a time. The
  overlay keeps the digits typed in component state, which is gone when it unmounts on
  unlock. The only `console` call in `src/security/` is `erase-device.ts`, which logs a
  step's name and its error, never a PIN (source search). P3.2 strips `console.log` from
  release builds.

**The honest threat model:**
- **If the hash ever leaves the device, the PIN is effectively known.** Measured here
  (Node 24, one core of a Ryzen 9 9900X3D): one guess at 600,000 iterations takes
  57.0 ms. That is every 4-digit PIN in 9.5 minutes, every 6-digit in 15.8 hours, every
  8-digit in 66.0 days, on ONE core. Many cores or a GPU divide that. So the iteration
  count is a speed bump, not the defence.
- **The real controls are on the device:**
  - the keystore binding (the hash can't be read without breaking the OS);
  - the attempt limit and its lockout;
  - the lock engaging whenever the app leaves the screen.
- **What the lockout cannot stop:** someone holding the unlocked phone who moves its
  clock forward (F14). It now has a decision for the owner.

**F98 (new, fixed):** the second PIN check, in Settings, was outside the limit (see its
row).
- Fix: `turnOff` calls the store's `tryPin`. Its messages ("Incorrect PIN. 9 attempts
  left.", the lockout) are shown, the field is cleared, and a keychain error fails
  closed: the lock stays on, the screen is freed.
- `turnOn` also no longer sticks busy when the keychain throws.

**Backoff (the plan's "lockout with backoff"):**
- Before, every wrong PIN after the 10th cost a flat 15 minutes: 96 guesses a day.
- Now: 15 minutes at the 10th, doubling with each one after (30 min, 1 h, 2 h, 4 h, 8 h,
  16 h), capped at **24 h** from the 17th. The doubling and the cap are my choice. A
  legitimate user who mistypes 10 times still waits only 15 minutes.
- Messages give the real wait ("Try again in 2 hours.").

**Tests:**
- `src/security/security-screen.rntest.tsx`: 11 new jest tests for `app/security.tsx`,
  which now has a 100 % per-file floor. It lives under `src/` because every file in
  `app/` is an expo-router route.
- `app-lock.test.ts`: 3 backoff tests (the whole schedule, the persisted duration, the
  wording).
- `lock-store.test.ts`: the "re-locks at once" test now expects 30 minutes, plus one test
  for the hours and the cap.

**Bite check: 8 mutations, all caught.** The files were restored byte-identical (`cmp`):
- the OLD uncounted `verifyPin` turn-off fails 4 screen tests;
- turn-off without try/catch;
- turn-on without try/catch;
- the field not cleared;
- a flat 15 minutes;
- no 24 h cap;
- the flat duration persisted;
- the message hard-coded.

**Caught on the way:** the first run of the old-handler mutation was "caught" only because
the suite crashed importing native crypto, which proves nothing. The test now has a
stand-in for `app-lock`, so the old code loads and fails on its behaviour.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1765 at
100 / 99.67 / 100 / 100 · jest 130 / 130, `app/security.tsx` at 100 % on all four.
Not yet on a device: the P3 gate runs every lock flow on the hardened release APK.

### P3.4 — done — 2026-10-01

- P3.4's push `844b49a` went red once: CI 36839777837, in the jest step, with no detail
  readable without a login (CodeQL green).
- Locally the same command passed: 130 tests, every per-file floor held, and the new
  suite's slowest test took 206 ms against jest's 5 s limit, so it was not a timeout.
- I did not re-run until green. I added jest's built-in `github-actions` reporter
  (`2d6a752`), so a failure is readable through the public API, and pushed that.
- That run was green (CI 36840438554, CodeQL 36840438566) with no test changed. So the
  failure was intermittent, and it is logged as **F99** next to F97, rather than called
  fixed.

### F99 found and fixed — 2026-10-01

- The docs-only push `f7aa418` went red in jest again (CI 36840880514). This time the new
  reporter gave the annotation: `security-screen.rntest.tsx:52`, the suite's first test,
  "Exceeded timeout of 5000 ms".
- **Measured, not assumed:** `--no-cache --coverage` here put every suite's first test at
  about 2.1 s (this suite's 2124 ms, `theme-provider`'s 2112 ms and 2159 ms), against
  206 ms with a warm cache. CI's cache starts cold, and its runner is slower.
- **Fix:** `testTimeout: 30_000` for the jest project, with this evidence in the config's
  comment.
- No test can make CI's speed bite. The evidence is the annotation plus the cold-cache
  measurement, and the next CI runs are the check.

### P3.5 — deep links and outbound links — 2026-10-01

**Inventory (read from the code):**
- **29 files** under `app/`: 27 screens and 2 layouts. Every screen is reachable as
  `zeno://<path>`, and the root layout's lock overlay covers all of them.
- **Two take a parameter:** `subscription/[id]` and `subscription/cancel/[id]`. No other
  screen calls `useLocalSearchParams` or the global variant (source search).
- **No route found acting as soon as it opens:** a search of each screen's `useEffect`
  (the first 6 lines of each) for network, delete, create, join, purchase, open or
  link calls found none outside `_layout.tsx`. That is a search, not a full read of
  every effect; P3.8's screen tests cover the rest.
- **One link handler:** `_layout.tsx`, for `zeno://auth/verify?token=`.
- **9 calls that hand a URL to the OS:** login (terms, privacy), the paywall (terms,
  privacy), Settings (rate, feedback mailto, privacy, terms), and the cancel guide (the
  catalog's cancel link, the support mailto and tel, the Google-search fallback).

**F100 (found, fixed): see its row.** The fix, in `authStore.ts`:
- **Remembering the request:** `loginWithMagicLink` stores `{ email (lowercased),
  expiresAt }` in SecureStore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`; in memory on web).
  `expiresAt` comes from the server's own `expiresInSeconds`.
- **Before any server call:** `verifyMagicLink` refuses when nobody requested a link,
  the request has expired or can't be read, or someone is already signed in. The
  session already on the phone is untouched.
- **After verifying:** the new access token's `email` claim (`issueSession` signs it,
  `auth.ts`) must equal the email typed, ignoring case and spaces. Otherwise the session
  is discarded, nothing stored.
- **Clean-up:** the request is cleared on success and on sign-out, since it holds an
  email address.
- **The claim reader** (`src/auth/jwt-claims.ts`) is pure TypeScript, so it doesn't
  depend on `atob`/`TextDecoder` in Hermes. It is checked against Node's decoding over
  500 random Unicode strings, and every malformed input returns null.
- `_layout.tsx` catches a refused link: no unhandled rejection, no navigation.
- **One consequence, stated:** a link now signs in only the phone that asked for it.
  Requesting on the phone and tapping the link on another device no longer works there.
  That is the point.

**Parameter routes:** both look the id up among THIS user's own subscriptions by exact
equality, and show "Subscription not found" otherwise. Tested on both routes:
- an unknown id, no id, an empty id, a path, a repeated parameter (an array), a
  trailing-space lookalike, a different case: all "not found", with no subscription
  name shown;
- the user's own id opens it.

**The outbound allowlist** (`src/utils/external-link.ts`, the only `Linking.openURL` left
in the app):
- **https:** only to our site host, `apps.apple.com`, `www.google.com`, and the hosts
  of the bundled catalog's links.
- **mailto:** only to exactly one address, with no headers.
- **tel:** only digits and `+ - ( )` and spaces.
- **Refused:** everything else, including http, `javascript:`, `intent:`, `file:`, other
  apps' schemes, lookalike hosts, subdomains not on the list, and `https://site@evil`.
- Parsed with string operations, because Hermes's `URL` doesn't reliably expose `.host`
  (`config/site.ts`).
- **The catalog, measured with the right fields this time:** 1018 links (509 cancel
  links plus 509 websites), all https, across 498 hosts, every one accepted
  (`external-link.catalog.test.ts`). No entry has a support email or phone, so the
  cancel screen's mailto and tel rows never render today.
- `scripts/external-link-guard.test.ts` fails if `Linking.openURL` or
  `openBrowserAsync` appears in any other mobile source file.

**Tests:**
- `jwt-claims.test.ts`: 19.
- `external-link.test.ts`: 33.
- `external-link.catalog.test.ts`: 2.
- `external-link-guard.test.ts`: 2.
- `authStore.flows.test.ts`: 10 new; 4 rewritten to request a link first. The old "a
  failed verification clears any session" is replaced by its opposite.
- `authStore.test.ts`: its 4 sign-ins now request a link first.
- `subscription-routes.rntest.tsx`: 16 jest tests.

**Bite check: 16 mutations, all caught.** The 6 files were restored byte-identical
(`cmp`):
- the OLD `verifyMagicLink` fails 6 tests;
- a signed-in user switchable;
- no account check;
- the check without normalising;
- the request kept after success;
- sign-out keeping it;
- expiry ignored;
- the request never saved;
- every URL allowed;
- subdomains allowed;
- mailto headers allowed;
- plain http accepted;
- a raw `Linking.openURL` back in Settings;
- UTF-8 read as Latin-1;
- the detail route taking an array's first id;
- the cancel route ignoring case.

**My mistake on the way:** my first catalog probe read `cancellationUrl` and
`supportContact`, which are the fields of the converted `ServiceRecord`, not the raw
`Service` (`cancelUrl`, `supportEmail`, `supportPhone`). It reported "509 links, 486
hosts", counting only websites. The type checker caught it in my helper, and the probe
was re-run on the real fields: 1018 links, 498 hosts.

**Not covered by a test, stated:**
- **`_layout.tsx`'s catch:** `app/_layout.tsx` has no test yet (P3.8).
- **The cancel screen's alert for a refused link:** unreachable today, since every
  catalog link is allowed.
- **Google sign-in:** expo-auth-session opens Google's own fixed authorisation endpoint,
  not through this helper. It is not a URL from the app's data.
- **On a device:** this is checked at the P3 gate.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1831 at
100 / 99.68 / 100 / 100 (9 branches uncovered, 2846 − 2837) · jest 146 / 146. The first
coverage run after my last fix had a vitest WORKER crash ("Worker exited unexpectedly"):
one file's 11 tests never ran and coverage fell with them; no test failed. The re-run
above was clean. One crash, logged; if it recurs it gets its own finding.
The gate before that one failed for a real reason: the "no request at all, signed out"
case was untested (`authStore.ts:556`), and 3 lint warnings (fast-check default-import
members). Both fixed.

### CI after P3.5: F97 explained, F102 found and fixed, F103 logged — 2026-10-01

- **`44791e7` (P3.5):** CI went red in "Build web", with no detail (F103). I added an
  annotation for build failures (`3e541c9`).
- **`3e541c9`:** went red on F97, and this time F97's diagnostic message said why. The
  ONLY storage error logged was the simulated sync refusal. So the billing, family and
  Plaid deletes had succeeded, and the rows were written again after them.
- **The test bug:** both F75 tests' wait was an `Array.every` over Promises, which never
  waits for anything. It is fixed in both (one query, then a synchronous check).
- **The real bug (F102):** in-flight writes to a row could land after its delete, or
  after a newer write.
- **The fix:** `inOrder()` in `pg.ts` chains each row's operations in the order they
  were issued. `kvDeleteByValueField` and `kvClear` first wait for every write in flight
  in their namespace. A value is serialised when the write is issued, and a value that
  can't be serialised still fails as before (logged, false).
- **`storageOpsInFlight()`** exposes the queue's size, and a test asserts it returns
  to 0.
- **Three new deterministic tests** in `real-pg.test.ts`. A patched query holds one
  INSERT until the competing query has FINISHED, with a 1 s release so the fixed code,
  which waits, cannot deadlock:
  - a Plaid write in flight during account deletion;
  - a sync push in flight during account deletion;
  - two quick upserts of one key.
- **Bite-checked:**
  - the old `pg.ts` fails the first and third tests, here on PGlite;
  - without the namespace wait, the second fails;
  - without the queue clean-up, the count test fails (`1`, not `0`).
- All restored and compared byte-for-byte.
- **Plus one test** for the value that can't be serialised (a BigInt): it returns false,
  is logged without its key, and leaves nothing queued. The first gate run after the fix
  failed coverage on exactly those 2 lines, so the test was added.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1835 at
100 / 99.68 / 100 / 100 · jest 146 / 146.

### P3.5 — done — 2026-10-01

Green on GitHub: CI 36847517276 and CodeQL 36847517287 on `3b8be1e`. It contains P3.5
(`44791e7`), the web-build reporting (`3e541c9`) and F102. Its "Build web" step
passed, so F103 stays a single unexplained occurrence, which will now report itself.

### P3.6 — no secret in the bundle — 2026-10-01

**Inventory (read from the code):**
- **`app.config.ts`'s `extra`:** the EAS project id, `apiBaseUrl` (from
  `PUBLIC_API_BASE_URL`), `siteUrl`, 4 Google client ids, the 2 RevenueCat SDK keys, and
  `sentryDsn`.
- **The app's own `process.env` reads (6, all `EXPO_PUBLIC_*`):** 3 Google client ids
  (`discover.tsx`), the 2 RevenueCat keys (`revenueCat.ts`), the Sentry DSN
  (`report.ts`).
- No `.env` file is tracked under `apps/mobile`. `eas.json` sets only
  `PUBLIC_API_BASE_URL`.

**Why each is public, from the source, not from memory:**
- **The Sentry DSN:** "safe to keep public because they only allow submission of new
  events" (Sentry's DSN docs).
- **RevenueCat:** the public SDK keys "must be used to configure the SDK". The SECRET
  keys are "prefixed `sk_`" and must never be embedded (RevenueCat's authentication docs).
  That page states no prefix for public keys, so none is assumed.
- **The Google client ids:** sent in the clear in every OAuth request URL.
- **The API and site URLs, and the EAS project id:** visible to anyone using the app.

**Measured on the real artefacts, not inferred:**
- **The exported Android bundle** (`expo export`, Hermes bytecode, 11.6 MB) was built
  with 17 secret variables set to marker values: every secret the API reads, plus
  `SENTRY_AUTH_TOKEN` and `EXPO_TOKEN`. **None appears in any of the 86 exported files**,
  searched as UTF-8 and UTF-16.
- **The public values the code reads ARE in the bundle**, which proves the search can
  see inlined values: the Android RevenueCat key, the DSN, and the 3 Google ids.
- **An unreferenced `EXPO_PUBLIC_DECOY_UNREFERENCED` is NOT in the bundle:** Expo inlines
  only names the code reads. So a guard on the names the SOURCE reads is the right
  control, and refusing unknown names in the build environment (my first idea) would add
  nothing. Dropped.
- **The release APK built in P3.1:** its `assets/app.config` `extra` holds `eas`,
  `apiBaseUrl`, and empty `google`, `revenueCat` and `router` objects. `router` is added
  at build time by the expo-router plugin. gitleaks over its bundle and config (9.27 MB):
  no leaks.

**Added:**
- **`app.config.ts`** refuses to build when either RevenueCat variable holds an `sk_`
  secret key. The error names the variable, never the value.
- **`scripts/public-env-guard.test.ts`:** every `EXPO_PUBLIC_*` name in mobile source
  must be on a reviewed list (7 names, each with its reason), and the list has no stale
  entries.
- **`app.config.test.ts`:**
  - the refusal for both variables, including a value with leading spaces, and that the
    message never carries the value;
  - that a public key still builds;
  - the leak test's decoys now include the build-side secrets (`SENTRY_AUTH_TOKEN`,
    `EXPO_TOKEN`).

**Bite check: 6 mutations, all caught.** The files were restored byte-identical:
- no refusal;
- the refusal without trimming;
- the message carrying the value;
- a new unreviewed `EXPO_PUBLIC_` read;
- a server secret put into `extra`;
- the Sentry upload token put into the manifest.

The last one is caught ONLY because of the decoys added here; the old test would have
missed it.

**Findings:** none. Nothing secret was found in the bundle, the config or the APK.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1840 at
100 / 99.68 / 100 / 100 · jest 146 / 146.

### P3.6 — done — 2026-10-01

Green on GitHub: CI 36849676333 and CodeQL 36849676314 on `1801e8d`.

### P3.7 — screen capture on the lock screens — 2026-10-01

**Read first, not assumed** (`expo-screen-capture` 56.0.5, installed with
`npx expo install` for SDK 56; its `.d.ts`, `build/ScreenCapture.js`, the Kotlin
module and its `AndroidManifest.xml`):
- `preventScreenCaptureAsync(key)` sets the window's `FLAG_SECURE`.
  `allowScreenCaptureAsync(key)` clears it only when no key remains, so two screens can
  each hold their own key.
- The module's own hook does not handle its promises, which reject where the module is
  missing.
- Its manifest adds 3 permissions for the screenshot LISTENER (F104).

**The change:**
- **`src/security/screen-capture.ts`:** `useBlockScreenCapture(key)` blocks capture
  while mounted, releases it on unmount, and catches failures, so a failure can never
  crash the lock screen.
- **Used on the lock overlay** (`"lock-overlay"`, from its first frame, the neutral
  cover included) and on **Settings → App lock** (`"pin-entry"`, both when a PIN is set
  and when it is entered to turn the lock off).
- **App-wide blocking stays the owner's decision:** it would stop the user's own
  screenshots too.

**My mistake on the way, caught on the device:**
- I first removed all 3 permissions with `android.blockedPermissions`. Every unit test
  passed, but on the emulator the release app CRASHED at launch: "Permission Denial:
  registerScreenCaptureObserver … requires android.permission.DETECT_SCREEN_CAPTURE".
- The permissions are reverted, and the trade-off goes to the owner (F104). A test now
  fails if `DETECT_SCREEN_CAPTURE` is ever blocked, and another fails if the module's
  permission list changes on an upgrade.
- A plain `expo prebuild` KEPT the stale `tools:node="remove"` lines, so the next APK
  still lacked the permissions. `--clean` failed (EBUSY, with no Gradle or Java process
  alive), so exactly those 3 generated lines were removed by hand.
- `aapt2 dump permissions` on the rebuilt APK confirms all 3 declared.

**Proven on the emulator** (single-ABI release APK, Android 16, API 36):
- **Control:** the dashboard captured normally (100 % non-black). The image was looked
  at, not just measured.
- **Settings → App lock:** the app window's flags include `SECURE`
  (`dumpsys window windows`), and the capture is 0.00 % non-black.
- **After setting a PIN and leaving:** `SECURE` is gone, and the capture is normal again
  (100 %), so the block is released.
- **The lock screen** (background, then return): `SECURE`, and 0.00 %.
- **After unlocking:** see F106. A later return from background and a later cold start
  both captured normally after unlock (100 %, at 4 s and at 10 s).

**F105, found there and fixed:** see its row.
- Measured with `uiautomator dump --compressed`. The plain dump lists every view,
  including ones hidden from accessibility services, so it can't show what TalkBack
  sees. I first misread it this way, then re-measured the OLD build with `--compressed`
  to be sure the finding was real: 77 labels while locked, money included.
- **The fix, on the device:** locked, 9 labels (the lock screen's only), no money;
  unlocked, 68 labels, the ledger back.

**Tests:**
- `screen-capture.rntest.tsx`: 2 tests (block and release with the key; failures never
  escape).
- `HiddenWhileLocked.rntest.tsx`: 3 tests (hidden when covered; reachable when not;
  never remounts across lock and unlock).
- `LockOverlay.rntest.tsx` and `security-screen.rntest.tsx`: each now asserts its block.
- `app.config.test.ts`: the 2 F104 tests.
- New 100 % jest floors on `screen-capture.ts` and `HiddenWhileLocked.tsx`.

**Bite check, all caught:**
- the overlay without its block;
- the PIN screen without its block;
- failures uncaught;
- never released on unmount;
- `DETECT_SCREEN_CAPTURE` blocked again;
- the shield never hiding;
- the shield remounting the app on lock.

`npm audit`: the only added package is `expo-screen-capture`, and no other version
changed. `scripts/audit-gate.mjs`: PASS.

**For P3.9 (noticed, not changed here):** the release APK declares
`SYSTEM_ALERT_WINDOW` and `WRITE_EXTERNAL_STORAGE` (max SDK 32). P3.9's manifest review
must find out which library adds them, and whether they are needed.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1842 at
100 / 99.68 / 100 / 100 · jest 153 / 153 (screen-capture.ts and HiddenWhileLocked.tsx at
100 %) · audit gate PASS.

### P3.7 — done — 2026-10-01

Green on GitHub: CI 36854703994 and CodeQL 36854704080 on `39c9c46`.

### P3.8a — the screen-test floor — 2026-10-01

**The plan's ask, quoted** (`PRODUCTION_HARDENING_PLAN.md`): screen tests for all 29
screens, "renders with seed data, empty, loading, error; every pressable does its
navigation or mutation (router and stores mocked at the boundary); every touchable
labelled; reduce-motion path", with a jest coverage floor over `app/**` and
`src/components/**`, "ratcheting to 100 % lines".

**Measured baseline, not estimated** (jest, the three trees):
- **Scope:** `app/**`, `src/components/**`, and `components/**` (where `ServiceAutocomplete`
  lives, outside `src/`).
- **Overall:** 235 of 1842 lines (12.75 %) across 51 files; 7 files at 100 %.
- **By folder:**
  - `app/`: 117/1515 lines (7.72 %), 128/1750 statements (7.31 %);
  - `src/components/`: 118/307 lines, 123/328 statements;
  - `components/`: 0/20.
- **Most screens are at 0 %.** The partly covered ones: `subscription/[id]` 39 %,
  `subscription/cancel/[id]` 43 % (P3.5's route tests), `Ledger.tsx` 84 %.

**The floor:**
- `jest.config.js` now collects coverage from all three trees and sets a DIRECTORY floor
  for `./app/` (7.72 % lines, 7.31 % statements) and for `./src/components/` (38.43 %,
  37.5 %).
- Read in jest 29.7's `CoverageReporter.js` before relying on it: a directory key is a
  "path" group, checked on the COMBINED coverage of the files under it; a glob key is
  checked file by file.
- Jest truncates (it reads 118/307 as 38.43 %, not 38.44 %), so the floors are set to
  what jest reports.
- `components/`, at 0 %, gets its floor when P3.8b covers it; a 0 % floor checks
  nothing.
- **Each step after this raises the floors to what it measured, so they only go up.**
  P3.8 is split into 6 steps (in the tracker): the whole item is about 1600 untested
  lines, too much for one commit.

**Bite-checked:** leaving out `Kit.rntest.tsx` drops `src/components/` to 13.07 %
lines, and the run fails. Leaving out the route tests drops `app/` to 2.7 %, and it
fails.


Gates after the final code edit: typecheck 0 · lint 0 · vitest 1842 · jest 153 / 153 with
the new directory floors held.

### P3.8b — shared components — 2026-10-01

**Result:** every file under `src/components/**` and `components/**` is at 100 % lines
and statements. Jest now holds each of them there FILE BY FILE, using glob keys
(`"./src/components/**/*.{ts,tsx}"`, `"./components/**/*.tsx"`), which replace
P3.8a's directory floor for `src/components/`. The whole jest scope went from 235 to 852
covered lines (of 2251, now that the component trees are measured whole), and from 7 to
31 files at 100 %. `app/` is unchanged (117/1515); the screens come next.

**Tests (all checking behaviour, not just rendering):**
- **`zeno/Primitives.rntest.tsx`, 31 tests:**
  - Icon: name resolution, the explicit component, the fallback.
  - ProgressBar: the colour at each threshold (75 % and 100 %), the clamping, the
    label.
  - CategoryTag and Badge: the colours chosen from the palette and tones.
  - IconButton: its role, name and disabled state; the 44 pt `hitSlop` maths; the
    pressed style.
  - Switch: its role, state, opposite-value callback, and disabled.
  - SegmentedControl: tabs with their selected state, and the value reported.
  - Input: the name from its label or explicit label, the hint, focus, error and
    disabled.
  - ListRow: the derived name ("Netflix, Renews Oct 2, $15.49 per mo"), the
    non-pressable form, and no empty name.
- **`Components.rntest.tsx`, 15 tests:**
  - LedgerSheet and ConfirmSheet: options as named buttons with their selected state;
    the pick with its haptic; Close and Cancel; the backdrop closing on tap; the note.
  - ComingSoon: says "coming soon", records interest, pretends nothing.
  - AppErrorBoundary: a crash is shown, reported with the component stack, and
    recoverable through Try again.
  - SplashSequence: its safety timer (2250 ms, 700 ms under reduced motion, cleared
    on unmount).
  - The ledger kit under reduced motion.
- **`components/subscriptions/ServiceAutocomplete.rntest.tsx`, 8 tests (F1):** against
  the REAL catalog, with the data read first (`"netf"` matches only Netflix at
  $15.49/mo; Speechify is annual-only; Substack has no price).

**Found and fixed on the way:**
- **F107** (see its row): found by the Stamp's reduced-motion test, which failed
  against the code.
- **Dead code removed, not tested:** `ui.tsx`'s `TextLink`, `ThemeToggle` (the retired
  generational themes) and `Kpi`. A search of every import of `components/ui` found only
  `ComingSoon`, using `Screen`, `Surface` and `PrimaryButton`.
- **`Icon.tsx`'s unreachable `return null`:** it is gone, because the fallback is now
  `Circle`, imported directly.
- **act() warnings:** the whole jest suite had 3 ("an update … was not wrapped in
  act"): 1 already in `Kit.rntest.tsx` (now fixed), and 2 from my own Switch tests (now
  fixed). It now has 0, across 208 tests.
- **The mock for `@gorhom/bottom-sheet`** needed `__esModule: true`: the library's own
  mock exports `default` without it.

**Bite check: 11, all caught:**
- ProgressBar warning from 80 %;
- Switch reporting the current value;
- ListRow's name losing the cadence;
- IconButton ignoring disabled;
- a case-sensitive exact match;
- LedgerSheet picking the label;
- Try again never clearing;
- the reduced-motion timer at 2250 ms;
- the F107 cache removed;
- Input never showing focus;
- the per-file floor, which fails as soon as one test file is left out.

**Not covered yet, stated:** branches. The plan's ratchet is "100 % lines"; 46 branch arms (counted from the coverage data)
in these files are still unexercised (e.g. Button and ServiceAvatar variants, and
optional `style` props).


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1842 at
100 / 99.68 / 100 / 100 · jest 208 / 208, 0 act() warnings, every component file at 100 %
lines and statements.

### P3.8c-1 — the Ledger, Subscriptions, Calendar and Insights tabs, and the tab bar — 2026-10-01

**The harness** (`src/test-support/`, out of every coverage scope):
- **Real:** the screens run through the app's real theme, subscription store and budget
  store providers, with their hydration and aggregates, the bundled seed data and the
  catalog.
- **Faked, at the module boundary only:** SQLite (an in-memory map), the FX fetch,
  notifications, the router, and safe-area metrics.
- **`unnamedControls()`** fails a test if any button, link, tab or switch has no
  accessible name.
- **Animations are settled inside act()** (fake timers), so no frame updates state
  after a test. The whole jest suite still has 0 act() warnings.
- **A cycle avoided:** a `jest.mock` factory that required the harness pulled in the
  real providers, which import the very modules being mocked (the fakes were undefined).
  So the fakes now live in `screen-fakes.tsx`, which imports no app code.

**Expected values come from the app's own logic, not typed numbers:**
- the seed file;
- `generateInsights`;
- `computeBudgetForecast`;
- `calendarUtils`;
- `formatShortDate` and `formatMoney`.

Fixtures for each insight type were first checked to make the engine produce that type,
so no UI assertion can pass vacuously. I also removed one vacuous test I had written: an
invalid-day press, whose panel can never open.

**Tests (51, all behaviour):**
- `dashboard.rntest.tsx` (17):
  - the $107.46 total;
  - the free counter, and the upgrade at the limit;
  - every upcoming row and fixed control, and where each goes;
  - empty;
  - needs-attention (still charging, trial ending today, in 1 day or in N days, a price
    rise);
  - the budget line over, approaching and on pace;
  - plan, a failed plan check, other currencies;
  - "Ways to save";
  - reduced motion (shown at once), with a control proving the count-up would
    otherwise not have reached the total.
- `subscriptions.rntest.tsx` (8):
  - every row's full name (F109);
  - the add button;
  - search with its 200 ms debounce;
  - every filter as a tab with its count;
  - every status;
  - empty filters;
  - an unknown status from older data;
  - empty.
- `calendar.rntest.tsx` (9):
  - the three ledger lines against `calendarUtils`;
  - the weekly groups;
  - the day panel (open, rows, cancel, close, the two-renewal total);
  - empty;
  - other currencies;
  - paused and cancelled excluded;
  - missing and invalid dates;
  - F111.
- `analytics.rntest.tsx` (11):
  - the spend and the budget entry;
  - dismissing every insight down to "All caught up";
  - the sort flip and its spoken state;
  - F110 ("Save $22.00/mo", was "$0.22");
  - insight actions;
  - every insight type;
  - the budget pill in 3 states;
  - empty;
  - other currencies.
- `tabs-layout.rntest.tsx` (6):
  - the 5 tabs in order;
  - the tab haptic;
  - each icon focused and unfocused;
  - reduced motion;
  - the centre Discover action.

**Found and fixed:** F108, F109, F110, F111 (see their rows). F112 is logged to check on
the device.

**Coverage and floors:**
- `app/` went from 117 to 424 of 1515 lines (7.72 % to 27.98 %).
- The dashboard, subscriptions, calendar and tab-layout files are held at 100 % lines
  per file, and the dashboard, subscriptions and tab-layout files at 100 % statements.
  The keys are exact paths, because `(tabs)` in a glob is pattern syntax.
- `analytics.tsx`: 98.38 % lines. Its one uncovered line is the `default:` of
  `insightAccentColor`, reached only by an insight type (`price_spike`) the engine
  declares but never produces.

**Bite check: 8, all caught:**
- each of F108, F109, F110 reverted (F111 bite-checked separately: the old parse is
  19,800,000 ms, 5.5 h, off);
- "approaching" moved from 85 % to 95 %;
- the Pending filter dropping "still charging";
- the calendar's cancel link opening the detail page;
- the sort never flipping;
- the centre tab losing its haptic.

The floor bites too: without `dashboard.rntest.tsx`, `app/` falls to 23.23 % and the
dashboard file to 0 %.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings (my first run failed lint
on the new tests: 20 `require()` in mock factories, now `jest.requireActual`; an export
above imports; 2 unnamed stand-in components) · vitest 1842 at 100 / 99.68 / 100 / 100 ·
jest 259 / 259, 0 act() warnings, the new floors held.

### P3.8c-2 — Discover — 2026-10-01

**Result:**
- `app/(tabs)/discover.tsx` is at 100 % lines and statements (230/230), held there file
  by file.
- `app/` went from 424 to 603 lines covered (27.98 % to 39.51 %, of 1526: the total
  grew with the F113 fix).
- The jest suite is at 286 tests, 0 act() warnings.

**What is real and what is faked:**
- **Real:** the subscription store, the CSV parser, the free-plan cap, the found-money
  summary and the catalog.
- **Faked:** the inbox scan and connection (`emailScanner`), Google's auth hook, the file
  picker, sharing, and the funnel event.

**Checked before writing, not assumed:** `process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID` is
read at run time in jest (a probe set it after import and saw it), so a test can set it.

**Tests (27):**
- **Before any scan:** the export guides, the empty state, Skip; Connect Gmail without a
  client id (it explains, opens nothing), with one (opens consent), and disabled until
  the request is ready.
- **Gmail:**
  - an approved connection is scanned, and a failed one is shown;
  - inboxes are listed, disconnected, and scanned as "all";
  - progress, and a Cancel that drops late results;
  - a scan error;
  - a failed listing or disconnect handled;
  - a reconnect not listed twice.
- **CSV:** through the real parser (expected counts taken from `parseCSV` itself); a
  cancelled pick; a picker failure; read by uri on a phone.
- **Results:**
  - named checkboxes;
  - "already tracked" by name, and by catalog slug alone (added when the slug mutation
    escaped);
  - a cancelled match not counted;
  - select all and none, and the disabled add;
  - adding (saved, reminders scheduled, the funnel event, back to the ledger);
  - the free-plan cap at 8 and at 10 tracked;
  - a paid plan uncapped;
  - the catalog category mapping for all 11 catalog categories;
  - the found-money card and its share;
  - Start over;
  - the Android toast.
- **Editing (F113):** keyboard-realistic typing. Each keystroke edits what the field
  currently shows; my first version passed whole strings and did NOT catch the bug,
  which I noticed when it passed against the unfixed code.

**Found and fixed: F113 (see its row).** F114 is logged for the owner. F112's nesting
pattern is on this screen too (a checkbox inside the row's "Edit" button).

**Dead code removed, not tested:**
- `handleGmailResponse`'s re-check of request and response: its only caller had just
  checked both, so they are now passed in.
- An edit sheet mounted on the landing screen, where no row exists to open it.

**Bite check:**
- the committed version fails the 3 F113 tests;
- free slots off by one;
- "already tracked" ignoring the slug, which first ESCAPED (my test matched by name), so
  a slug-only test was added and it is caught now;
- a cancelled scan still showing late results;
- Save allowed with an invalid date.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1842 at
100 / 99.68 / 100 / 100 · jest 286 / 286, 0 act() warnings, the new floors held.

### P3.8d-1 — the subscription page — 2026-10-01

**Result:**
- `app/subscription/[id].tsx` is at 100 % lines and statements (135/135), held there
  file by file.
- `app/` went from 603 to 670 lines covered (39.51 % to 43.87 %).
- The jest suite is at 311 tests, 0 act() warnings.

**Tests (25), through the real store:**
- **Figures:** the price, /month, /week and /quarter, a year as 12, 52 and 4 charges.
- **Controls:** the urgency banner and its cancel link; the three reminder switches,
  saved and rescheduled; notes added, edited and cancelled.
- **Editing:** all four fields saved; an impossible date refused (F115); a zero price
  refused; Stop editing; an emptied name or date keeping the old one; the form filled at
  a cold start (F118).
- **The menu:** the iOS action sheet (Edit, Pause, Delete, dismissed); Delete's
  confirmation; the Android menu, and its back-button close.
- **Statuses:** pending (confirm, or charged again), still charging, trial.
- **Figures that must not be invented:** an unknown cycle (F117); the month-end history
  (F116, on a pinned clock); no history from a brand-new, unreadable or dateless
  subscription; not found.

**Found and fixed:** F115, F116, F117, F118 (see their rows). F112 is extended (the
Android menu nests its items inside the backdrop button).

**Checked, not a bug:** saving an unchanged date writes back the page's DISPLAY copy of
it. `rollRenewalForward` rebuilds it from day, hours and minutes, so the seconds go. The
day is unchanged, and renewal dates are day-level everywhere. The test asserts the day.

**Bite check: 7, all caught:**
- each of F115, F116, F117, F118 reverted on its own;
- "charged again" marking the subscription verified instead;
- a reminder toggle saving the opposite value;
- Delete's confirmation removed.


Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1856 at
100 / 99.68 / 100 / 100 · jest 311 / 311, 0 act() warnings, the new floors held.

### P3.8d-1 went red on CI: my gate failed, I misread it and committed anyway — 2026-10-01

- **What happened:** CI 36867624513 (`e40877c`) failed jest's coverage floor. The new
  annotation (`9d2600e`) read: `"./app/" coverage threshold for statements (44.81%) not
  met: 44.8%`.
- **Cause 1, the floor:** `app/` is 790/1763 statements, 44.8099 %. My measuring script
  printed that rounded to 4 places ("44.8100"), and I set the floor to 44.81. Jest
  TRUNCATES to 2 places (44.80), as it did once before (38.43 in P3.8a). The floor is now
  44.8. Coverage is deterministic: three local runs all gave 790/1763, and a run forced to
  UTC changed nothing.
- **Cause 2, my process:** the local gate run before that commit FAILED correctly. Its
  log holds the same "not met" line, and re-running `gates.sh` against that state exits 1.
  But I read its filtered output, saw the failure tail's "Tests: 311 passed", took it for
  a pass, and committed. The missing "ALL GATES PASSED" line was the signal.
- **The fix to the process:** from here on, the commit is chained on the gate script's
  exit code (`gates.sh && git commit`), so a failed gate cannot be followed by a commit.
  Recorded as a standing rule in my notes.
- **Also kept:** CI's jest step now posts its floor lines as an annotation, because the
  github-actions reporter annotates failing tests, not thresholds. That is how this was
  read without a login.

### P3.8d-2 — the cancel guide and Add subscription — 2026-10-01

**Result:**
- `app/subscription/cancel/[id].tsx` (78/78 lines) and `app/subscription/add.tsx`
  (101/101 lines) are at 100 % lines and statements, held there file by file.
- `app/` went from 670 to 815 lines covered (43.87 % to 53.33 %); statements 790 to 961
  of 1765 (54.44 %). The floors are set to jest's truncated values.
- The jest suite is at 359 tests, 0 act() warnings.

**Cancel guide tests (19), through the real store and catalog:**
- **Catalog service (Netflix):** renewal, the yearly saving, the difficulty, the steps;
  the cancel page through the P3.5 allowlist; a page that cannot open; "Did you cancel
  it?"; the self-report to pending verification with reminders cleared (also when
  clearing them fails); Done to the ledger; "Having trouble?" and its web search.
- **Others:** each difficulty; support by mail and phone (one stand-in catalog entry,
  since no real entry has a support contact); a service not in the catalog; renewing
  today, in 9 days, unknown; both back buttons, including the not-found page.
- **Figures:** annual (F119), weekly, quarterly, unknown (F117).

**Add subscription tests (28):**
- **Step 1:** the popular grid (8, catalog prices); search; the custom row; the
  keyboard's done key; Back.
- **Step 2:** the autofill (monthly, annual-only, one service per catalog category);
  every field saved as chosen (cycle, category, renewal date, note, trial); the
  renewal stepper stopping at today.
- **Reminders and amount:** reminders switched off (F120); the amount rules (F122, F123);
  a required name; editing the name detaching the catalog match, and the inline list
  re-attaching one.
- **The free plan's 10:** Save at 10 goes to /paywall; a cancelled one doesn't count;
  Pro has no ceiling.

**Found and fixed:** F119, F120, F121, F122, F123, and F117 extended to the cancel guide
(see their rows).

**Bite check: 10, all caught:**
- each of F120 and F121 reverted, in the form and in the store;
- F122 back to `parseFloat`;
- F123's empty start and its unpriced-pick clear, each reverted;
- F119's label, and its duplicate annual line, each reverted;
- F117 in the cancel guide.

Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1874 at
100 / 99.68 / 100 / 100 · jest 359 / 359, 0 act() warnings, the new floors held.

### P3.8e-1 — Settings, Profile, Notifications — 2026-10-01

**Result:**
- `app/settings.tsx` (95/95 lines), `app/profile.tsx` (20/20) and `app/notifications.tsx`
  (23/23) are at 100 % lines and statements, held there file by file.
- `app/` went from 815 to 948 lines covered (62.24 % of 1523); statements 1098 of 1757
  (62.49 %). The floors are jest's truncated values.
- The jest suite is at 403 tests, 0 act() warnings. Vitest is at 1888.

**Settings tests (23), through the real stores, the real erase flow and the external-link
allowlist:**
- **Account:** the email and plan; a long email shortened; the version; every row's
  destination; Pro and Family; F29's inbox count, now covered on the screen.
- **App and notifications:** dark mode; home currency, with its sheet; the reminders
  switch (F124), saved and read back; quiet hours and their window; the sheets closing
  unchanged; AI coaching and what it says is sent.
- **Data:** the CSV export (notes, formula guard, quoting); Delete all my data (cancel,
  delete, a step that fails); the More links.
- **Leaving:** sign out; local-only exit; Cancel my Zeno account (server first, then the
  device); the server refusing; a local step failing after the server deleted it.

**Profile tests (10):** the email (F125), the id labelled as such, the plans, the lock
state (F128), the rows, sign out and local-only.

**Notifications tests (10), with the scheduler's real list:** the reminders that will
fire, soonest first; one switched off; a trial's ladder; the master switch off, with the
reason shown; the 12 cap; every flag kind and where it goes; a yearly price rise (F130).

**Found and fixed:** F124, F125, F126, F128, F129, F130, F131; F127 in part, the rest to
the owner (see their rows).

**Checked, not a bug:**
- Settings' "Your subscriptions are encrypted on this device": `useSQLCipher: true`, and
  the key is set with `PRAGMA key` (F16 still has to prove it on a device).
- "We never ask for your bank login": no screen links to `open-banking` (dev-only Plaid;
  untouched, per the owner). Added to F45, which is the same question.

**Bite check: 18, all caught:**
- **F124:** the switch, the store's read-back, its reset on a wipe, the empty list.
- **F125:** the store at sign-in, at launch and on local-only; Settings; Profile.
- **F126, F127**, and **F128** in Profile and in Settings.
- **F129:** the screen ignoring the switches; the list unsorted.
- **F130**; **F131** in the shared suffix and on the subscription page.

Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1888 at
100 / 99.68 / 100 / 100 · jest 403 / 403, 0 act() warnings, the new floors held.

### P3.8e-2 — sign-in, the paywall, onboarding — 2026-10-01

**Result:**
- `app/login.tsx` (55/55 lines), `app/paywall.tsx` (116/116) and `app/index.tsx`
  (onboarding, 18/18) are at 100 % lines and statements, held there file by file.
- `app/` went from 948 to 1137 lines covered (74.31 % of 1530); statements 1313 of
  1769 (74.22 %).
- The jest suite is at 441 tests, 0 act() warnings. Vitest is at 1902.

**Sign-in tests (11):**
- **Consent:** the 16+ / Terms gate locks every way in, from the buttons and the
  keyboard; the legal links.
- **Magic link:** email rules; the link sent; a failure shown; locked while in flight and
  while the store is loading.
- **Other ways in:** Apple, Google and the dev account; no Apple on Android (F132);
  signed in, to the ledger.
- Three guards that could never run were removed: each duplicated its button's own
  `disabled`. The magic link keeps its guard, since the keyboard's send key reaches it.

**Paywall tests (21), with packages shaped like react-native-purchases' and the real
trial rule:**
- **Prices:** live and fallback prices; the per-month figure and the saving, only from
  plain USD; a localized price as written.
- **The trial (F134, F133):** iOS eligible and not; no trial product, or no store; the
  Android free phase.
- **Buying:** Pro, Family (F136) and Lifetime; a purchase with no active plan (F137); a
  cancelled sheet (F135) and real failures, each way to buy; locked while buying.
- **Other:** restore (found, none, failed); the links; closing; leaving before the store
  answers.

**Onboarding tests (5):** the sample ledger (total computed, labelled as a sample); the
three beats; sign-in; continue without an account; skip; reduced motion.

**Found and fixed:** F132-F138 (see their rows). F134 and F138 each have an owner part
in OPEN_ITEMS.

**For P3.9 and the P3 gate:**
- The dev-only demo password is a literal behind `__DEV__` in `app/login.tsx`. The
  release-APK scan must confirm it is not in the bundle.
- The login's Terms and Privacy links sit inside the consent checkbox, the same nesting
  as F112, to check with a screen reader on the device.

**Bite check: 10, all caught:**
- **F132, F133**;
- **F134:** a hard-coded label; eligibility ignored; a paid intro taken for a trial;
  eligibility asked off iOS;
- **F135, F136, F137**;
- **F138:** samples in a release build.

Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1902 at
100 / 99.68 / 100 / 100 · jest 441 / 441, 0 act() warnings, the new floors held.

### P3.8f-1 — the budget, its recap, the Spend Coach — 2026-10-01

**Result:**
- `app/budget.tsx` (75/75 lines), `app/budget-recap.tsx` (32/32) and `app/coach.tsx`
  (56/56) are at 100 % lines and statements, held there file by file.
- `app/` went from 1137 to 1295 lines covered (84.75 % of 1528); statements 1490 of
  1758 (84.75 %).
- The jest suite is at 478 tests, 0 act() warnings. Vitest is at 1915.

**Budget tests (16), on a pinned clock, with figures from the real forecast:**
- **Setup:** the forecast; the suggested cap as the start (F144); the $5 steps; the
  floor; Start.
- **Over, close, on pace:** the cuts, each with its own cycle and in monthly order
  (F139); trials not offered; the running total of what's still to renew; Edit.
- **Other:** the coach without a Pro badge (F141); the recap link; income; another
  currency counted, not guessed; the free plan's locked rows.
- **Pro:** category caps; envelopes (add, log, over, remove).

**Recap tests (6):** no budget; a budget set today (F143: no recap, no streak); a 2-month
streak, shared; one month; over the cap; a cheaper month after an over-cap one.

**Coach tests (14):**
- **Consent:** nothing is sent before it; Not now; enable later.
- **What's sent:** names, categories and monthly amounts, never an email-found
  subscription.
- **Answers:** the AI's advice; no AI model, or offline (F142); waiting; no summary;
  leaving early.
- **Budget:** over, with cuts that don't cover it or that do (F145); on pace.
- **Other:** categories and insights; another currency; nothing tracked.

**Found:**
- Fixed: F139, F141, F142, F143, F144, F145 (see their rows).
- F140 (envelopes can't be set up) is the owner's decision.

**To check in P3.8f-2:** the recap says "Budget adherence rolls into your Year in Review"
next to a Pro badge. Whether the Year in Review uses budgets, and whether it is Pro, is
read in `app/wrapped.tsx` next.

**Bite check: 12, all caught:**
- **F139:** the cycle text; the order; trials offered;
- **F141, F142**;
- **F143:** the rule; the screen ignoring it; "Actually spent"; the store never dating
  the cap; an undated stored cap;
- **F144, F145**.

Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1915 at
100 / 99.69 / 100 / 100 · jest 478 / 478, 0 act() warnings, the new floors held.

### P3.8f-2 — Family, Year in Review, the preview and developer screens — 2026-10-01

**Result:**
- Every screen but the root layout is now at 100 % lines and statements, held file by
  file: `family`, `wrapped`, `widgets`, `spend-twin`, `backend`, `open-banking`,
  `business`, `partners` and `public-api`, plus the shared `ComingSoon` and
  `NotInThisBuild`.
- `app/` went from 1295 to 1426 lines covered (92.83 % of 1536); statements 1642 of
  1763 (93.13 %). What's left is `_layout.tsx` (P3.8f-3) and one line of Insights.
- The jest suite is at 513 tests, 0 act() warnings. Vitest is at 1915.

**Family tests (17):**
- **Joining:** start or join; the name shared (F148); every failure's message; the code
  rule (F149); busy states.
- **Household:** restore and re-share; mixed currencies not summed; disbanded on the
  server; unreadable for now.
- **Leaving (F150):** the server confirming it, or not.
- **Other:** a failing secure store never blocks; leaving the screen early.

**Year in Review tests (5), on a pinned clock with the real figures:**
- "Committed", never "spent" (F147), on the page and in all five shares.
- A full year's wording; nothing tracked; another currency.

**Small screens (13):**
- **Widgets:** no promise (F152).
- **Spend Twin:** the fixed-price note.
- **Coming soon:** the three screens, with no waitlist (F153).
- **Developer screens:** release builds call nothing and show nothing (F151);
  development builds work with their calls faked (no Plaid call).

**Found:**
- Fixed: F146-F153 (see their rows).
- F146's feature is the owner's call; F147's cause is scheduled.
- Also: Wrapped's share handlers had guards that could never run, since each share
  button exists only with its stat. The stat is now passed in, and the guards are
  gone. A grammar slip ("1 subscription … aren't") is fixed.

**Bite check: 11, all caught:**
- **F146**;
- **F147:** the heading; the total's share; the summary;
- **F148, F149, F150**;
- **F151:** open-banking and backend;
- **F152, F153**.

Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1915 at
100 / 99.69 / 100 / 100 · jest 513 / 513, 0 act() warnings, the new floors held.

### P3.8f-3 — the root layout; P3.8 complete — 2026-10-01

**Result:**
- `app/_layout.tsx` is at 100 % lines and statements (109/109), as is
  `app/(tabs)/analytics.tsx` (61/61).
- **Every line of every screen in `app/` is now covered: 1535/1535.** Statements are
  1761/1762. The one left is `calendar.tsx`'s guard for a malformed day key, which its
  callers can't produce (the key is the calendar's own `YYYY-MM-DD`). The `app/` floor
  is now lines 100, statements 99.94.
- The jest suite is at 547 tests in 38 suites, 0 act() warnings. Vitest is at 1920.

**Root layout tests (34), with the subscription and budget stores and the lock cover
real:**
- **Start-up:** fonts loading, loaded, or failed; the animated splash; the holding screen
  while the session is read; notification handlers set up and removed.
- **The auth gate:** four redirects, and three cases that stay put.
- **The sign-in link:** at launch and while open; another screen's link; no token; a
  refused link.
- **Billing identity:** signed in, local-only, a billing failure, signed out.
- **The lock:** fail-closed until loaded, with the app hidden from screen readers;
  locked; unlocked; signed out.
- **Data:** reminders reconciled after the 500 ms settle, and F124's switch reaching the
  scheduler as an empty list; the widget; a pending cancellation resolved.
- **App state:** lock on the way out and on return, then reminders reconciled; a
  sign-out racing an event; no listener while signed out.

**Found and fixed:** F154 (see its row). It was found by reading the layout's start-up
order, then proven with a held keychain read before any change.

**Also:**
- **Dead code:** Insights' `"price_spike"` insight type is declared but never produced by
  the engine; it and the colour function's fallback (reachable only through it) are
  removed.
- **A measuring mistake, caught by the gates:** a vitest coverage run filtered to one
  file let `autoUpdate` raise the global branch floor to 100. The full gate then failed.
  `vitest.config.ts` is restored to 99.69, and the trap is in my notes.

**Bite check: 4, all caught**, after two tests were made to discriminate. The first
pass of reverts showed that one guard and one counter were never actually needed by
those tests:
- the guard after the session read (needs a stale OLDER session);
- the guard after the local-only read;
- the sign-in count;
- the local-only count (needs the held read to start before the choice is saved).

**P3.8 overall (a-f, 2026-09-30 to 2026-10-01):**
- Every screen and shared component is tested through the real stores and held at 100 %
  lines.
- Findings F107-F154 came from it, nearly all real bugs in what the app showed or did.
- The owner's share is in OPEN_ITEMS: F114, F127, F134, F138, F140, F146.

Gates after the final code edit: typecheck 0 · lint 0 errors, 0 warnings · vitest 1920 at
100 / 99.69 / 100 / 100 · jest 547 / 547, 0 act() warnings, the new floors held.

### P3.9 — static scan of the release APK — 2026-10-02

**What was scanned:**
- A release APK built from a CLEAN prebuild (`expo prebuild --clean`). `android/` is
  gitignored, so EAS builds from a clean prebuild, and that is what ships.
- An incremental prebuild of the old `android/` folder gave a different manifest:
  `READ_EXTERNAL_STORAGE` with no SDK cap. The clean one matches what shipped before.
- The build is single-ABI x86_64, 64,082,913 bytes, R8-minified, Hermes bytecode.
- It differs from a store build in four things, all expected:
  - It is signed with the local debug keystore (`CN=Android Debug`).
  - Its API URL is the local fallback (`http://127.0.0.1:8787/api/v1`).
  - It has no Sentry DSN and no RevenueCat keys.
  - The store builds get those from the EAS profiles. `app.config.test.ts` already
    requires https in every store-bound profile.
- MobSF needs Docker, which isn't installed. apkleaks needs a jadx download. Instead,
  with no download:
  - `aapt2` (manifest, permissions, badging);
  - `apksigner`;
  - `dexdump`;
  - gitleaks 8.30.1 over the extracted APK, and over the printable strings (6+ chars) of
    all 1,009 binary files (dex, Hermes bundle, `.so`), because gitleaks skips binaries;
  - a literal search across every file.

**Found and fixed:** F155 (see its row). Before: the old release APK's
`aapt2 dump permissions` listed both. After: neither is listed. On emulator-5554 the
new APK installed and launched cold (`TotalTime: 1538`). Onboarding rendered, the
crash buffer was empty, and `dumpsys package` shows neither permission.

**Manifest review (`aapt2 dump xmltree`):**
- Not debuggable (no `application-debuggable` in badging), `allowBackup=false`,
  `usesCleartextTraffic=false`, target SDK 36.
- **Exported components, each with a reason:**
  - `MainActivity` (the launcher and the `zeno://` links);
  - `FirebaseInstanceIdReceiver` (guarded by `c2dm.permission.SEND`, a signature
    permission);
  - Amazon IAP's `ResponseReceiver` (guarded by `com.amazon.inapp.purchasing.Permission.NOTIFY`);
  - `ProfileInstallReceiver` (guarded by `DUMP`).
  - Every provider has `exported=false`.
- **The rest of the permissions, by source** (from Gradle's
  `manifest-merger-blame-release-report.txt`):
  - **Zeno's own manifest:** `INTERNET`, `POST_NOTIFICATIONS`, `USE_BIOMETRIC`,
    `USE_FINGERPRINT` (minSdk 24), `VIBRATE`.
  - **`expo.modules.screencapture` 56.0.5** (still F104, the owner's):
    `READ_EXTERNAL_STORAGE` (<=32), `READ_MEDIA_IMAGES` (<=33), `DETECT_SCREEN_CAPTURE`.
  - **`expo.modules.notifications` 56.0.17:** `RECEIVE_BOOT_COMPLETED`.
  - **`firebase-messaging` 25.0.1:** `WAKE_LOCK`, `c2dm.permission.RECEIVE`.
  - **`billingclient` 8.3.0:** `BILLING`.
  - **`installreferrer` 2.2:** `BIND_GET_INSTALL_REFERRER_SERVICE`.
  - **`me.leolin:ShortcutBadger` 1.1.22:** the 16 launcher-badge permissions (Samsung,
    HTC, Sony, Apex, Solid, Huawei, OPPO, everything.me, `READ_APP_BADGE`).
  - **`sentry_react-native`:** `ACCESS_NETWORK_STATE`.
  - **`androidx.core` 1.18.0:** its own `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`.

**Secrets and literals:**
- **The dev demo account** (`demo@zeno.local`, its password, "Developer login"): **0
  files.** The `__DEV__` branch is stripped from the release bundle.
- `sk_live`, `sk_test`, `BEGIN PRIVATE KEY`, `BEGIN RSA`, `PLAID_SECRET`,
  `service_role`, `JWT_SECRET`, `RESEND_API_KEY`: 0 files.
- **gitleaks: 3 hits, all false positives:**
  - Sentry's published `sentry-android-replay` Maven verification token
    (`META-INF/.../verification.properties`);
  - OpenSSL's `"%s Private-Key:"` and `"Private-Key: (%d bit, %d primes)"` format strings
    in `libcrypto.so` and `libQuickCrypto.so`.
- **A Sentry DSN in the bundle (`o447951…`) is not Zeno's.** `@sentry/browser`'s
  `diagnoseSdkConnectivity` posts `{}` to it, and its source comment says the key is
  disabled. Zeno never calls that function.
- `127.0.0.1:8787` is the documented API fallback (`src/api/config.ts`, `app.config.ts`).
  `localhost:8081` is Metro, `localhost:8969` is Sentry Spotlight, and `10.0.2.2` is
  React Native's dev support: all dev-only library strings.
- **Plaid:** the client paths (`/plaid/link-token`, `/plaid/sandbox/public-token`, …) are
  in the bundle, as expected. Their screen is `__DEV__`-gated (F151), and the code stays
  by the owner's instruction. Nothing was called. The API refuses sandbox minting unless
  `PLAID_ENV` is sandbox (`apps/api/src/app.ts`, read only).
- **548 distinct URL hosts in the bundle:** the 509-service catalogue's cancel pages,
  plus library documentation hosts.

**Bite check: 1, caught.** The new `app.config.test.ts` case failed on the old config
("expected [] to deeply equal [ …(2) ]").

**CI caught a new advisory on the push:** GHSA-86w9-cpqp-85rv (high), `node-forge` <= 1.4.0. It
was published 2026-09-03, and 1.4.0 is the latest release, so there is no fix to take. It was
not caused by this change. `npm ls` shows one path: `expo` → `@expo/cli` →
(`@expo/code-signing-certificates`). There it signs development manifests with the
developer's own key, then verifies only that self-made signature, or self-signed
certificates. The flaw is in verifying someone else's forged signature. The P3.9 scan finds
no node-forge in the app bundle: the RSA strings there are react-native-quick-crypto's
constants. It is accepted in `.audit-allowlist.json` with a short expiry (2026-11-30), so the
gate flags it again then.

**For the P3 gate:** the store build (EAS) is the one to verify on a device. Confirm on
it that the API URL is https and that the permission list matches the one above.

### P3 gate — the hardened app on the emulator, the MASVS checklist; P3 complete — 2026-10-02

**The four parts:**
1. **The hardened release APK, driven on the emulator.** A clean prebuild of HEAD, then
   single-ABI x86_64 release builds, on emulator-5554 (API 36).
2. **The jest floor in CI:** the "RN component tests + coverage floor (jest)" step passed
   in run 36967460539 on `6d8a9cb` (read from GitHub's jobs API).
3. **The MASVS checklist:** `docs/MASVS_CHECKLIST.md`. Every control of MASVS v2.1.0
   (copied from `OWASP/masvs`) has a status and evidence.
4. **Items deferred to the gate:** F16, F112 and the login consent links are all settled
   on the device.

**Every flow in `DEVICE_TEST_FINDINGS.md`, re-run on the device:**
- **Onboarding:** three beats, every control labelled, "No bank login required" shown.
  The ledger starts empty (F138).
- **Login:** unchecked, both methods are disabled. Checked, Google is enabled, and the
  email link once an address is typed. No Apple button on Android (F132).
- **Add:** search, prefill (Netflix $15.49), save; then Spotify. The dashboard went
  $15.49 → $25.49 and 1/10 → 2/10 FREE.
- **Settings → Home currency sheet:** the current value is marked, and the currency
  footnote is shown.
- **Cancel:** guide, then Spotify's page in Chrome, then "Did you cancel it?", then
  PENDING "Reported Oct 2", then Done.
- **The 27 routes, by deep link:** each one renders with the app in focus, no
  unlabelled control, and an empty crash buffer. The one crash in the buffer was the
  emulator's own Bluetooth service.
- **Dark mode on 8 screens:** mean brightness 16 to 32 of 255.
- **Reduced motion:** the dashboard at 3 s and 13 s is pixel-identical below the
  status bar.
- **The lock, all of it:**
  - it engages on return from the background;
  - the window is SECURE and its screenshots are black;
  - the accessibility tree holds only the lock;
  - wrong PINs count down from 9;
  - the 10th wrong PIN gives "Try again in 15 minutes";
  - the lockout survives a force-stop;
  - the correct PIN is refused during the lockout.

**Found on the device and fixed (see their rows):**
- **F159 (high):** the lock could be bypassed through an open menu, editor or alert.
- **F157:** headline totals included cancelled and paused plans.
- **F160:** a pause could never be undone.
- **F156:** raw route names as headers.
- **F158:** the widget's "today" for tomorrow.

**Found and left open:** F161 (owner), F162 (P5).

**Settled:**
- **F16, closed:** with root, the app's data directory was pulled. `zeno.db` begins with
  random bytes, not `SQLite format 3\0`. "Netflix", "Spotify" and "15.49" are in none
  of its 31 files, the WAL included. The one plaintext name was the widget snapshot
  (F161).
- **F112, closed, reachable:** TalkBack was driven with touches from the emulator's own
  touchscreen. `adb input` touches are ignored by touch exploration, so the console's
  `event send` was used, scaled to its 0-32767 axes. TalkBack's focus landed on the
  inner element's exact bounds, separately from its parent:
  - the calendar's "Cancel Figma" (856,1664-992,1714), apart from the row;
  - the menu's Edit, Pause and Delete;
  - the login's checkbox, "Terms" and "Privacy Policy".
  Swipe-through navigation was not checked: console touches are too slow to make a
  swipe. Discover's nested checkbox needs an import to show, and was not driven.
- **Not reproduced today:** F106 (black screenshots after the first unlock; every
  unlocked capture today was normal) and F94 (the translucent sheet). Both stay at P5.

**Mistakes of mine, caught:**
- **A wrong control:** I first re-ran F159's check on Figma, which my own earlier
  bypass test had already paused, so "nothing changed" proved nothing. It was redone
  on an active plan.
- **Two broken readings:** my first secure-flag check grepped the wrong line and
  reported "False" while the window was SECURE. My TalkBack colour filter missed the
  dark-theme focus colour. Both were corrected against the screenshots before any
  conclusion.

**Bite checks:**
- F156: 1.
- F157: 2 (store and shared).
- F158: 1.
- F159: 3 — the layout's Modal test, `AppModal` without the lock condition (2 of 4
  fail), and the eslint rule on a raw `Modal`.
- F160: 3.
All caught.

Emulator settings restored afterwards: TalkBack off and its notification grant revoked,
animation scales at 1, adb unrooted, the emulator killed.

### FX.1 — strict dates for CSV and receipt imports (F21) — 2026-10-02

**Measured first, in Node 24** (`Date.parse` on the forms the parsers see):
- Lenient, as F21 said: "02/30/2026" → 1 March 18:30Z, "2026-02-30" → 2 March,
  "February 31, 2026" → 2 March, "Feb 29, 2026" (not a leap year) → 28 Feb.
- **Local time, which F21 didn't say:** every non-ISO form is local midnight. On this
  machine (UTC+5:30) "Feb 28, 2026" → `2026-02-27T18:30:00Z`, "03/03/2026" →
  `2026-03-02T18:30:00Z`. Stored as ISO, that is the previous day for every user east
  of UTC. ISO day-only forms are UTC, so CSVs with "2026-03-03" were fine and CSVs
  with "03/03/2026" (Chase, Wells Fargo) were a day early.
- `calculateNextRenewal` (discovery-helpers) used local getters. With a UTC-midnight
  input on a UTC-5 device (Node with `TZ=America/New_York`): Jan 31 → **1 March**, not
  28 Feb, because the instant is Jan 30 locally and the clamp never applied.

**The change:**
- **`src/utils/day-text.ts`, `parseDay`:** one strict parser. ISO (`2026-03-03`,
  `2026/03/03`, with a trailing time ignored), numeric month-first as the supported US
  banks export (`03/03/2026`, `3/3/26`; day-first only when the first number is above
  12, since nothing else fits), month names in either order (`Jan 15, 2026`, `Sept 5,
  2026`, `15 Jan 2026`). Each day is checked with `isIsoDay` (F115) and returned as
  midnight UTC. Everything else is null.
- **csvParser:** `parseDate` is `parseDay`. **emailScanner:** `extractDate` takes the
  first match that names a real day, and now also matches ISO and day-first text
  (those receipts used to get "today" as the charge date, with confidence capped).
- **`calculateNextRenewal`:** UTC getters and setters.
- The Gmail `Date:` header is left on `Date.parse`: it is a server-written RFC 2822
  timestamp with an explicit zone, not a receipt date, and `internalDate` is the
  fallback.

**Tests:** `day-text.test.ts` (21 accepted forms with exact UTC output, 15 rejections);
the helper tests rewritten on UTC days, plus a block that sets `process.env.TZ` to New
York (Node re-reads it on assignment; checked) and restores it after; new cases in the
CSV and receipt suites. vitest for `utils` and `discovery`: 357 passed.

**Bite check: 6, all caught** (CSV on `Date.parse`: 1 fails; receipts on `Date.parse`:
3; the ISO/day-first receipt patterns removed: 2; the helper on local arithmetic: 1,
the New York case, and only after that block was added, since on this UTC+5:30
machine local and UTC agree; the parser without the real-day check: 9; the parser
building local dates: 27).

**Also:** the F16 and F112 rows, closed by the P3 gate, now say so.

### FX.2 — a cancelled subscription counts until it was cancelled (F147) — 2026-10-02

**Read first:**
- `buildMonthlySpendHistory` (`packages/shared/src/spend/history.ts`) feeds Year in
  Review, the budget recap and the Insights chart. Its `chargeInMonth` returned 0 for
  any status but `active`, in every month: a cancelled, reported-cancelled or
  still-charging plan vanished from the past.
- **The date was already recorded on every real cancel path.** The app's only cancel
  action is `requestCancellation` (the cancel guide, both buttons). It sets
  `cancellationRequestedAt`, and verification, "Confirm it stopped" and "I was charged
  again" keep it (they spread the row). It is a stored column since CHANGE 4, so no
  schema change was needed. `markCancelled` set no date; it has no caller outside tests.

**The change:**
- **`history.ts`:** `billingEndsAt` gives each row its end. Active and `attention`
  (charged after cancelling) are still billing. `pending` and `cancelled` end at
  `cancellationRequestedAt`. Anything else (paused, trial, unknown), and a cancel
  with no readable date, counts nothing: no date is invented.
- **Day-precise:** a monthly, quarterly or annual charge counts only when its day
  (the anniversary day, or the month's last day in a shorter month) falls before the
  end. A weekly plan's month-equivalent is prorated in its last month.
- **`markCancelled`** records the date, keeping an earlier one.
- **Year in Review's wording:** "on the N subscriptions you track now" is no longer
  true. It now reads "on your subscriptions over the last 12 months, each cancelled
  one until you cancelled it", and the shares say "my subscriptions". Still
  "committed", not "spent": it remains an estimate from renewals.

**Tests:** 8 new history cases (cancelled before or after that month's charge;
pending; attention; annual either side of its renewal; weekly proration, 2167 of
4333; the 31st in February; no date, an unreadable date, or a pause counting
nothing), a Year in Review total of 12 x 1500 + 9 x 1000, the store recording the
date, and the new wording. Shared: 223 passed; the two jest suites: 42 passed.

**Bite check: 6, all caught:** the original rule back (8 fail); the date ignored (6);
`attention` not billing (1); weekly not prorated (1); no short-month clamp (1);
`markCancelled` without a date (1).

**Found, not fixed here:** F163, a paused plan's past months (see its row). It is
FX.6.

### FX.3 — the Settings sheet is its own window (F162) — 2026-10-02

**Read first:** `LedgerSheet` (`src/components/zeno/LedgerSheet.tsx`, Settings' Home
currency and quiet-hours pickers, and `ConfirmSheet`) drew `@gorhom/bottom-sheet`
inside the screen's own tree. So with it open, the Settings rows behind it, and the
native header's "Navigate up" (outside the screen tree entirely), stayed in the
accessibility tree. Hiding only the screen body could not have covered the header.

**The change:**
- The sheet renders in `AppModal` (F159's wrapper), so it is its own window. That
  also means it hides while the app is locked, and Android Back closes it.
- Its content is wrapped in `GestureHandlerRootView`, as Gesture Handler's own docs
  require for gestures inside a Modal on Android ("you need to wrap Modal's content
  with `GestureHandlerRootView`", `getting-started.mdx`, read from the repository).
- **jest:** the setup now loads Gesture Handler's official `jestSetup`, and maps
  `react-native-quick-crypto` to Node's `pbkdf2Sync`/`timingSafeEqual`/`Buffer`, the
  stand-in the vitest suites for app-lock and lock-store already use. Every screen
  imports the components index, which now reaches the lock store through
  `AppModal`. The Settings test's lock fixture gained `ready: true`, as on a device
  by the time Settings can open.

**On the emulator (release APK, fresh install):**
- With the sheet open, `uiautomator dump --compressed` holds only the sheet:
  backdrop, title, six currencies, footnote, Close. Before, it also held "Navigate
  up" and every Settings row (P3 gate). Two app windows: the activity and the sheet.
- Every path works: picking EUR saves it and closes the sheet; Android Back closes
  it and stays on Settings; a backdrop tap, a swipe down and Close each close it.
  Crash buffer empty.
- **TalkBack:** a touch where "Go Pro" sits behind the sheet put the focus frame
  around the whole-screen backdrop, not on Go Pro. A touch on GBP focused GBP's
  exact bounds.
- The sheet drew opaque, with the tear edge (F94's translucency did not appear).
- Settings restored afterwards: TalkBack off, its notification grant revoked, the
  emulator killed.

**Bite check: 1, caught.** The sheet back in the screen tree (no Modal) fails the
new test. jest: 557 passed.

### FX.4 — the website's fonts self-hosted; the build needs no network (F103) — 2026-10-02

**Measured first, from a build with `next/font/google`:**
- 13 `woff2` files, 179,424 bytes. Each family is one variable font split by
  character range: Space Grotesk 3 (Latin, Latin-ext, Vietnamese), Hanken Grotesk 4
  (adding Cyrillic-ext), JetBrains Mono 6 (adding Cyrillic and Greek).
- The generated CSS had 52 `@font-face` rules (the same file repeated per weight), a
  size-adjusted Arial fallback per family, the three Latin files preloaded, and three
  CSS variables. The site's CSS reads only the variables, never a family name.
- All three families are SIL Open Font License 1.1 (read from the licence files
  shipped with `@expo-google-fonts`), which allows bundling with the licence.

**The change:**
- The same 13 files, copied byte for byte from that build, in
  `apps/web/app/fonts/<family>/<range>.woff2`, each folder with its `OFL.txt`.
- `apps/web/app/fonts.ts`: `next/font/local`, one call per range (it takes one
  `unicode-range` per call), the ranges copied from the generated CSS. The Latin call
  of each family sets the variable, is preloaded and generates the fallback; the
  other ranges join the family and load only when a page uses them.

**A mistake of mine, caught by comparing builds:** my first version declared the real
family names ("Space Grotesk") on every call. The files and ranges matched, but
Turbopack names the CSS variable's family after the const ("display"), so the
variable pointed at a family with no fonts and the site would have rendered in the
fallback. The webpack path takes the family from the first `@font-face` instead (read
in `postcss-next-font.js`); Turbopack's code is compiled Rust, so its behaviour was
read off the build output. Fixed: the Latin call declares no family (so it is named
`spaceGrotesk` and so on), and the other ranges declare that name.

**Proof, from builds:**
- **Same fonts:** a script parsed both builds' CSS. The same 13 (file bytes, code
  points) pairs, one family each; every weight served before (Space Grotesk 500-700,
  the others 400-700) is covered; every face belongs to the family its variable names.
- **One difference, stated:** the fallback's metrics, shown only until the web font
  loads, are computed by Next from the font file instead of Google's table (Space
  Grotesk `size-adjust` 110.84 % against 109.69 %; the others within 3.1 points).
- **Offline:** with `HTTPS_PROXY` and `HTTP_PROXY` pointed at a dead local port (Next's
  Google font fetch honours them, `get-proxy-agent.js`), the new build passes. The old
  layout, restored for the test, fails under the same block ("an issue establishing a
  connection while requesting https://fonts.googleapis.com/css2?family=Hanken+Grotesk…").
- **In the browser** (`next dev`): headings in `spaceGrotesk`, body in `hankenGrotesk`,
  labels in `jetbrainsMono`, all three `document.fonts.check` true; only the three
  Latin files requested, all from `/_next/static/media`; 0 requests to Google; asking
  for "₹" loaded exactly Hanken Grotesk's Latin-ext file. No console errors.

**Guard test** (`apps/web/app/fonts.test.ts`, 4 tests): no `next/font/google` import
anywhere in the site; 13 files, each a real woff2 (`wOF2` magic); a licence in each
folder; each family's Latin call sets the variable and declares no family, and every
other range declares the family's name. **Bite check: 3, all caught:** a Google
import back in the layout; a range under the real family name; the Latin call
overriding its family.

Also: running `next dev` rewrote the generated `next-env.d.ts` to point at
`.next/dev`; restored, not committed.

### FX.5 — F94 and F106: one bounded reproduction attempt each; neither reproduced — 2026-10-02

Both were seen once and never since. This was a fixed budget of three attempts each,
on the current release APK (built from `e3f4edc`'s mobile code; FX.4 changed only the
website), measured, not eyeballed. Neither is claimed fixed.

**F106 (black screenshots after the first unlock of a fresh install):** three fresh
installs (`pm clear`), each: onboarding, a PIN set, Home, return (locked), the PIN,
then captures at 1, 4 and 10 s. **All 9 captures 100 % non-black** below the status
bar, the window not `SECURE`, the ledger on screen, no crash from the app. Since F106
was seen, the lock cover became its own window (F159).

**F94 (the Home currency sheet drawn translucent):** measured by colour. The sheet's
card is pure white (255,255,255) while the Settings paper behind it is (250,249,245),
dimmed further by the backdrop, so a see-through sheet cannot keep a pure-white
field. Calibrated on FX.3's opaque capture: 96.71 % pure white in the right half of
the option rows. Three routes, captures at 1 and 5 s: (1) F94's exact first path
(fresh install, Sign in, an email typed, back, continue without an account, Add,
Settings); (2) after a restart; (3) Settings opened from the dashboard's own button.
**All 6 captures 96.71 % pure white**, identical to the reference, and the
accessibility tree held only the sheet each time. Since F94 was seen, the sheet
became its own window (FX.3).

**Status:** both closed as not reproduced, with the totals in their rows: F94, 8
attempts in all plus FX.3's checks; F106, 5 attempts plus every unlocked capture of
the P3 gate. P5's end-to-end runs keep watching for both.

The crash buffer again held only the emulator's Bluetooth service ("Hardware Error
Event", `com.google.android.bluetooth`), as in the P3 gate. Emulator killed after.

### FX.6 — a pause skips only its own months (F163) — 2026-10-02

**Read first:** history (FX.2's `billingEndsAt`) counted a paused plan as nothing in
every month: a pause, unlike a cancel, recorded no date, and it can be undone, so one
date isn't enough. The shared `subscriptionSchema` is used nowhere and the mobile app
does not sync subscriptions, so the change stays in the shared type, the phone's
SQLite store, the store's two actions and the history builder.

**The change:**
- **`Subscription.pausedPeriods`:** `[{ from, to? }]`, oldest first; while paused, the
  last one is open.
- **Store:** `pauseSubscription` opens a period (never a second one while one is
  open); `resumeSubscription` closes it. A plan paused before this change has none,
  and resuming invents none.
- **History:** a cycle charge counts only outside every pause (and before a cancel);
  a still-paused plan counts up to its pause; a weekly plan's month-equivalent counts
  the share of the month outside pauses. A paused plan with no readable start counts
  nothing.
- **Storage:** migration v2 adds `paused_periods TEXT` (JSON), idempotent like v1's
  column adds. Rows are validated on read: anything but a list of `{ from, to? }`
  strings reads as no periods.

**Tests:** 6 history cases (still paused; paused and resumed; two pauses; weekly; a
cancel after a pause; no readable start), 2 store cases, a repository round trip and
6 malformed stored values, a real-SQLite upgrade from a version-1 database keeping
its row, and the existing migration tests moved to version 2. Shared 230, storage 20,
jest 559, all vitest 1988.

**Bite check: 9, all caught:** pauses ignored (3 fail); a paused plan counting
nothing again (1); weekly ignoring pauses (1); no period recorded (1); a new period
on every pause (1); resume leaving it open (1); periods not written (1); no
validation on read (1); no migration v2 (15).

**On the emulator (the real upgrade, on an encrypted database):** the old APK, a
Netflix added and paused (no period); the new APK installed over it. The app boots,
the paused row survived the migration, and resume, pause and restart all work. The
Insights chart's bars (read from the full view dump; a bar is the view above its
month label) were the readout, since October's charge (the 1st) predates a pause made
on the 2nd:
- paused on the new app: October full (210 px), and still full after two restarts, so
  the period persisted in the SQLCipher database;
- control, paused on the old app: October a stub (10 px), F163 itself; still a stub
  after the upgrade, since no date is invented.
No crash from the app (the buffer held only the emulator's Bluetooth service).

**Found:** F164, the chart's amounts aren't available to screen readers. It is FX.7.

### FX.7 — the Insights chart read aloud (F164); the fix pass is complete — 2026-10-02

**The change:** each column of Insights' 6-month chart (`app/(tabs)/analytics.tsx`) is
one accessible element labelled with the month's full name, its amount, and ", this
month" for the current one. The full name comes from the history point's UTC year and
month.

**Tests:** a screen test reads six labels, consecutive months ending with the current
UTC month, each "Month YYYY, $amount", exactly one "this month", its amount the one
printed above the bar. Insights suite 12 passed. **Bite check: 2, caught:** the column
not one element (`accessible` removed); no "this month" marker.

**On the emulator:** the compressed tree lists "May 2026, $0.00" to "October 2026,
$15.49, this month", and a TalkBack touch on October focused its column's exact
bounds. TalkBack off and its notification grant revoked afterwards; emulator killed.

**Found along the way, not an app bug:** a reinstall over the booted emulator opened
on a lock screen that rejected the test PIN. The emulator boots its quick-boot
snapshot `default_boot`, saved 2026-07-09 ("Loading snapshot 'default_boot'" in its
log; the app's `zeno.db` dated that day), so app data at boot is July's, PIN included.
Every device test here starts with `pm clear`, so no earlier result is affected; the
trap is in my notes.

**Also in this commit:** the vitest branch floor ratcheted from 99.69 to 99.70 by
FX.6's gate run (the full coverage run, the only legitimate ratchet).

**The FX pass, complete (2026-10-02):** F21, F147, F162, F103 and F163 fixed; F164
found and fixed; F94 and F106 closed as not reproduced; F16 and F112 rows closed. What
remains open needs the owner (decisions, account actions, tests only the owner can
run); it goes into its own file next.

### The owner-only file — 2026-10-02

`docs/OWNER_ACTIONS.md` holds only what needs the owner: 13 account actions, 12
decisions (D1-D12) and 6 tests only the owner can run. `OPEN_ITEMS.md` section 1 now
points to it.

Each decision carries one recommendation under the owner's rule (good for the user and
the business, tilted to the business where there's slack), with the evidence linked:
YNAB's and Monarch's own pages on household sharing; Apple's App Review Guidelines
2.3.1(a) and 3.1.2(c); Google Play's photo and video permissions policy; the FTC's 2023
privacy report; Google's scaled-content spam policy; GDPR Article 20; OWASP ASVS 3.3.1;
Android's pinning and in-app update docs; Apple's opt-in "Erase Data".

Three sentences of mine were checked before committing:
- **The certificate:** read live (`CN=onrender.com`, Google Trust Services, 21 Sep to
  20 Dec 2026).
- **Monarch's sharing:** quoted from the Experian page.
- **An emulator image size I had not measured:** removed.

### P4.1a — the website's component tests; F165, F167, F168, F169 fixed, F166 found — 2026-10-02

**The setup.** The website had no rendered tests at all: `apps/web/app/**` and
`components/**` were excluded from coverage ("exercised by the web build"). Now:

- `vitest.web.config.ts`: its own run (`npm run test:web`, `test:web:coverage`), React
  Testing Library 16.3.3 in jsdom 20 (already in the tree via jest-expo; now declared),
  Node by default and jsdom per file (`// @vitest-environment jsdom`), so the API route
  and fonts tests keep running in Node. Its own coverage floor, starting at the measured
  level and ratcheting (autoUpdate). It is separate because `vitest.config.ts`'s floor is
  global at 100 % lines and could take a web file only once that file was complete
  (vitest applies the global floor to every file, glob floors included: "Global threshold
  is for all files", its coverage source).
- `vitest.shared.ts`: the `@zeno/*` aliases, and the website's `@/` imports resolved only
  for importers inside `apps/web` (apps/mobile's tsconfig maps `@/` to its own `src/`).
- `apps/web/test-support/`: controllable `matchMedia` (live lists, so Motion's cached
  reduced-motion setting follows), `IntersectionObserver` (nothing in view until a test
  says so), `Element.animate`, element geometry; the teardown restores every mock (a
  leftover `requestAnimationFrame` spy outlived its fake clock and swallowed the next
  test's frames, found while writing these).
- CI: a new step "Website component tests + coverage floor". The gate script runs it too.

**Removed, not tested: dead code.** `components/ui/*` (5 shadcn files), `lib/utils.ts`
and its test, `components.json`, and their four dependencies (`@base-ui/react`,
`class-variance-authority`, `clsx`, `tailwind-merge`) were imported by nothing; also the
unused primitives `Reveal`, `RuleWipe`, `StampIn`, `CountUp`, `Magnetic` and ledger marks
`SectionHead`, `Stamp`, `RuledStep` (a comment said the cancel guides used them; none
did). Checked by search, then by a production build (all routes built).

**Tests (122, in 12 new files; the run has 14 with the route and fonts tests):** every shared component: the waitlist form (request, each
error, the busy state), the nav (links, the analytics flag, the theme toggle with storage
refused, the mobile menu's six ways to close and its scroll lock), the footer, the
content shell, the comparison table (real table semantics), the ledger marks, every
motion primitive (in view, reduced motion, the counters' failsafes), the homepage
sections (the FAQ's disclosure semantics, the pricing rows), the hero's sample ledger
(each switch, the announced totals, the cancel flow line by line, the delayed
"verified", restore, timers cleared on leaving), the pen chrome, and the ledger book
(document mode for narrow, reduced-motion and incapable browsers; book mode's pages,
pager, keys, wheel, touch, edge drag, flick, the running chip, a turn cancelled on
leaving). `components/site` is at 100 % lines and functions except `faq-data.ts`, whose
claims are P4.1c's. **Bite check: 9, caught 9** (the four fixes; Escape in the nav; the
hero's delay before "verified"; the book's in-turn guard, first missed by a test that
pressed Next twice, now End mid-turn; the wheel turning mid-page; the tally ignoring
cancellations).

**Fixed:** F165 (JSON-LD escape), F167 (the waitlist error left behind), F168 (the
footer's links on every page but the homepage), F169 (no-JS homepage invisible below the
hero). **Found, for P4.1c:** F166 (the site's "verified" claim is stronger than the app's
check). **To check in P4.2, not a finding yet:** in book mode the nav's "/#pricing"
style links may not turn the book (the target sits in a hidden sheet and nothing listens
for the hash); it needs a real browser to say.

**The floor** this run starts at: 72.83 % statements, 73.65 % branches, 68 % functions,
73.06 % lines over `apps/web/app/**` and `components/**` (the pages are P4.1b's).

**The production build** passes, and its homepage HTML carries the fixes (the `/#`
links, `zn-reveal` on 84 of 86 start-state elements as above, the no-JS rule in the CSS).

### P4.1b — every page rendered and checked; the 509 cancel guides; F170 fixed — 2026-10-02

**How pages are found.** `apps/web/test-support/pages.tsx` walks `apps/web/app/` for
`page.tsx` files, so a page added later is tested without anyone listing it (the list
is also pinned, 19 routes with the guides as one, so a page that disappears fails
too). Each is rendered as the server renders it: the async page awaited, inside its
layouts, to static HTML; its metadata merged over its layouts' (root included, nearest
wins, as Next does).

**Every page (`app/pages.test.tsx`):** a title and a description of its own (none
shared); indexable pages: canonical = the page's own path and a social-card title; the
analytics page says noindex; exactly one `h1`; exactly one `main#main` (the skip link's
target); every JSON-LD block parses, and every breadcrumb trail runs 1..n from Home to
this page; **every internal link resolves** to a page or a file in `public/` (none dead
today); every new-tab link has `rel="noopener noreferrer"`; **the sitemap lists exactly
the indexable pages** (all 509 guides, no noindex page, no duplicates); robots.txt
points at it.

**The 509 cancel guides (`app/cancel/guides.test.tsx`), every one rendered:** a guide
per catalog service, each slug once; each title, description, canonical and article
card; the catalog's steps printed in order, the difficulty stated; no repeated step in
any guide (steps are React keys); HowTo data matching the steps; the Home > guides >
service breadcrumb; the cancellation link, where the catalog has one, is https and
opens safely; related guides are up to six others of the same category, never itself;
an unknown slug is a 404 with a "not found" title. The hub: every guide linked in the
server HTML, grouped, largest group first, counts adding up to 509; search narrows by
name (any case, trimmed), an empty result says so.

**Also:** the root layout (lang, the theme script first, "Skip to content" first and
to `#main`, Organization and WebSite data, metadata base and card); the homepage (FAQPage
data equal to the visible FAQ with entities decoded, The Case's figures from the
catalog, the sections in reading order, the back-office teaser only with its flag); the
analytics page (404 unless flagged; range tabs switch the figures; chart hover clamps to
the chart); the waitlist route's file path (one JSON line per signup, folder created; an
unwritable file is a 502 and the log carries only a masked address).

`app/fonts.ts` is excluded from this floor with the reason written in the config:
`next/font/local` is compiled away by Next and can't run outside it (`fonts.test.ts`
checks its source and files; CI's web build compiles it).

**Numbers:** 155 tests in the web run; lines 99.9 %, statements 97.69 %, branches
87.54 %, functions 99.38 % over `apps/web/app` and `components` (the floor ratchets to
these). **Bite check: 9, caught 9**: the legal `<main>` without its id (F170); a dead
footer link; a copied canonical; a page dropped from the sitemap; a breadcrumb ending
elsewhere; a guide's steps reversed; the guide link's `rel` removed; the hub's search
untrimmed; the waitlist log unmasked. The production build passes and the built legal
pages carry `main#main`.

**For P4.1c (truthfulness), noted while reading the pages, not judged yet:** the
analytics dashboard's pulsing "Live" badge over sample figures (its only "Sample data"
label is the footer); Partners lists named brands with statuses ("dev adapter"); the
Developers page offers a "Public API"; the family page shows named demo members; the
hub says "509+" for exactly 509.

### P4.1c — the truthfulness rail as a test; every site claim checked against the code; F166, F171-F176 fixed — 2026-10-02

**Method.** The visible text of every built page was extracted from the production
build (`.next/server/app/*.html`) and each factual statement checked against the code
that would make it true, or against the competitor's own documentation. Nothing was
judged from the copy alone.

**Held up (now pinned by tests):** the prices ($3.99 / $29.99 / $79.99 / $6.99 = the
paywall's), the free limit of 10 (enforced on three screens), Pro's three gates,
reminders at 7, 3 and 0 days at 9 AM with the amount and quiet hours, scanning only on
request (no background task registered anywhere), Spend Twin on-device, the family view
built from totals, the app never calling the sync endpoints, Rocket Money's use of Plaid.

**Corrected:** F166 (what "verified" means), F171 (the guides claim: 39 written, 470
general), F172 (four unavailable features shown as available; unlabelled example data;
"Live" on sample figures), F173 (Monarch), F174 (the cookie policy), F175 (four privacy
policy statements), F176 (three overstatements). Both legal pages' "Last updated" moved
to October 2, 2026.

**Left to the owner (`OWNER_ACTIONS.md`):** the absolute privacy lines are D4's (the
site's "Bank login: NEVER", "Sees your bank credentials: Never", "We never ask for bank
credentials" are added to it); the 470 general guides are D5's (its numbers updated);
D13 (new): the "3 months of Pro free" promise to founding members; and three facts only
the owner's accounts show (where the website is hosted, which AI provider is set,
Render's log retention against the policy's "up to 30 days").

**The tests (`app/truthfulness.test.tsx`, 21):** the rail over the text of every page
and all 509 guides: never an absolute on-device claim, "we never see your data",
automatic or background discovery, "no Plaid ever", "$219/yr", the old "real
cancellation flow"/"statement shows no charge" wording, or a "Most popular" badge; always
"No bank login required" (every page and the hero). The rail checks its own patterns
against sample wording. Then each claim pinned to its code: prices to the paywall, the
free limit to the three screens, reminders to the notification service, "verified" to
the store's check, the lock's default, each unavailable feature's app screen to its page,
the privacy policy's events to the server's allowlist, its link lifetime to `auth.ts`,
its AI providers to `coach.ts`, its waitlist record to the route, the cookie policy to
the site's storage code, the Monarch wording, the dashboard's label.

**Bite check: 11, caught 11** (one first written too weakly: removing "not available
today" from the Developers label alone left it in the lead, so the page still said it;
removing both is caught): the old FAQ wording; "100% on-device" in the footer; the
footer losing "No bank login required"; the app's annual price, free limit, link
lifetime, events, storage, verification check and waitlist record each changed on the
code side.

Web run: 177 tests.

### P4.2a — the website in a real browser: every route, both themes, desktop and phone; F177 fixed — 2026-10-02

**Setup.** Playwright 1.63.0 with `@axe-core/playwright` 4.13.0 (root dev
dependencies; the audit gate passes). The tests drive the **installed Google Chrome**
(`channel: "chrome"`, Chrome 154 here; GitHub's ubuntu-24.04 image ships Chrome), so no
browser is downloaded. They run against `next start` over the production build, so the
headers, CSP and prerendered HTML are what visitors get. Sign-ups go to a temporary
file, never the repo. CI runs it after "Build web" and uploads traces on failure.

**Per route, on desktop (1440×900, which turns on book mode) and a phone (Pixel 7),
in the light and the dark theme:** 200; the six security headers exactly
(`next.config.ts`'s production CSP, HSTS, nosniff, DENY, referrer and permissions
policies); no console error and no page error; **no request to any other host**
(blocked and recorded); **axe finds nothing** at WCAG 2.0/2.1 A and AA and 2.2 AA, measured
after every finite animation has finished (otherwise axe measures a colour half-way
through a fade: the first run reported the hero's sample rows that way). The route
list is read from the server's own sitemap.xml, and the hand list is checked against
it. Five guides cover the template (each difficulty, with and without a cancellation
link, one of the 470 general ones); all 509 are fetched for 200 and the CSP. An unknown
path is a 404 with the same headers and accessible; `/analytics` is a 404 in
production.

**Found and fixed: F177** (contrast on every page, both themes; above). The first run
failed 43 page checks, all on contrast; after the four token changes and the footnote,
98 pass.

**Bite check: 4, caught 4** (each with a rebuild): the old grey back; X-Frame-Options
dropped from `next.config.ts`; an image from another host on a page; a `console.error`
in the nav.

**Logged: F178** (the app's matching colours, for P5's on-device audit).

**Next in P4.2:** the behaviours (P4.2b): the homepage book (pager, keys, wheel, edge
drag, touch), the no-JS homepage (F169 in a real browser), reduced motion, the theme
persisting, the waitlist end to end (validation, the rate limit, a repeat sign-up),
the hub's search and the guides, and the book-mode nav links checked for real.

### P4.2b — the website's behaviours in Chrome; F179 fixed — 2026-10-02

**The homepage (`e2e/homepage.spec.ts`).** Book mode on a wide screen: it turns on
after load (one labelled region, the pager, the cover); the pager and the keys (Next,
End, Home, ←, →) turn pages and the address follows; an address with a section opens the
book there; **dragging the page's right edge turns it** (a real mouse drag); **the nav's
section links turn the book** (F179, failed before the fix). Document mode: on a phone,
no pager, the menu's Pricing link brings the pricing into view and closes the menu;
with reduced motion on a wide screen, the document and no running tally. **Without
JavaScript (F169 in a real browser):** every section present, and every `zn-reveal`
element at full opacity with no transform. The theme: paper by default; the toggle
switches to dark; after a reload it is dark from the first paint.

**The waitlist and the guides (`e2e/waitlist-and-guides.spec.ts`).** The form: an address
in, the receipt line out; a non-address refused with nothing sent. The API on the real
server: 200, 422 (a bad address, an array), 400 (a body that isn't JSON, sent as raw
bytes), 413 (oversized); **a repeat sign-up gets byte-for-byte the same answer** (no way
to test whether an address is on the list); **five sign-ups a minute per client, the
sixth a 429**, another client unaffected (each test uses a random client address under
the one trusted proxy hop). The hub: 509 links, search narrows ("netfl" → Netflix), an
empty result says so; hub → guide → its steps, its cancellation link (`_blank`,
`noopener noreferrer`) → back; F168 in a browser: a guide's footer Pricing link reaches
the homepage's pricing (scrolled into view on a phone, the book's pricing sheet on a
wide screen).

**The full suite:** 125 pass, 7 skipped by design (viewport-specific tests), in about a
minute; the all-guides fetch is batched with its own two-minute budget (one-at-a-time
fetches passed alone but ran past the default 30 s inside the full parallel suite). P4.2a
ran on GitHub: CI's "Website end-to-end (Playwright, installed Chrome)" step passed in
2 minutes on the runner's own Chrome.

**Bite check: 4, caught 4** (each with a rebuild): the book's link handler removed
(F179); the no-JS rule removed (F169, both viewports); the rate limit raised to 50; the
theme no longer restored on load. Also a unit test for the handler (a section link
turns the book; a modified click, an unknown section, another page and a new-tab link
are left alone).

The local gate script now runs the web build and the browser suite too.

### P4.2c — Core Web Vitals budgets in Chrome; F180 fixed — 2026-10-03

**No new dependency.** Lighthouse 13.5.0 alone is 19 MB unpacked before its own
dependencies. The same three metrics come from the browser APIs Google's
`web-vitals` library reads: `largest-contentful-paint`, `layout-shift` (session windows:
a gap over 1 s or a window over 5 s starts a new one; CLS is the worst window) and event
timing (INP = the slowest interaction, its definition below 50 interactions). They are
measured in the existing Playwright suite (`e2e/web-vitals.spec.ts`).

**Conditions: Lighthouse's own mobile throttling.** 150 ms latency, 1.6 Mbps down /
750 Kbps up, 4x CPU ([lighthouse/docs/throttling.md](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md));
applied through DevTools, Lighthouse multiplies latency by 3.75 and throughput by 0.9
([lighthouse#7330](https://github.com/GoogleChrome/lighthouse/issues/7330)), and those
adjusted values are used. **Budgets: Google's "good" thresholds**: LCP <= 2.5 s, CLS
<= 0.1, INP <= 200 ms. Pages: the homepage, the hub, a guide, a comparison, the privacy
policy; each loaded cold, scrolled through (for shifts below the fold), then used (theme
toggle, an FAQ answer, a hero switch, the hub's search).

**Its own project.** Timing measured while other tests compete for the CPU measures the
machine (three budget failures that way). The "vitals" project runs after the desktop
and phone projects, one test at a time.

**Found: F180** (the homepage's first paint, ~2.9 s), fixed (above).

**A wrong lead, withdrawn.** An A/B suggested `text-wrap: pretty` cost ~0.8 s; a rebuild
without it measured no difference. The A/B had served its rewritten CSS through
Playwright's request interception, and **a response fulfilled that way bypasses the
network throttling**, so the CSS simply arrived early. The change was reverted. Later
experiments that needed interception (a section removed from the HTML) read CPU layout
time from the trace, which interception doesn't skew, not paint times.

**Measured now (three full runs):** LCP 1.69-1.93 s on every page, CLS 0.000-0.008, INP
24-56 ms; all 130 tests pass each run. **Bite check: 3, caught 3, each by its own
metric:** a 300 px block pushed in after load (CLS 0.358); the theme button blocking
for 300 ms (INP 344 ms); a script holding the first paint (LCP 3.65 s). (A first CLS
bite fired before the first paint, where shifts don't count by definition; redone after
`load`.)

**Caveat:** lab timings depend on the machine; CI's runner will give its own numbers.
They are read from the GitHub run, not assumed.

**P4.2 is complete.**

### F181 and three date-fragile tests — found by the gate run after local midnight — 2026-10-03

**What happened.** P4.2c's gate run failed three Calendar screen tests at 00:06 IST, a
few minutes after the date rolled over. Nothing in the mobile app had changed.

**The tests were wrong, not the screen.** Their date helper keyed a renewal by its
LOCAL day, while the app keys renewals by their UTC day everywhere (§10). Between local
midnight and 05:30 in India the two differ. The seed's "in 1 day" renewal (09:00 UTC
tomorrow) then lands on the local today, and a renewal four days out sits on a
different day for the test than for the app. Fixed: the tests key renewals by UTC day,
and the "no day panel on load" test now computes from the seed whether a renewal falls
on the user's today, instead of assuming none does.

**A first diagnosis, withdrawn.** I first read it as an app bug: the dots and the tap
disagreeing on a renewal's day. Wrong: the dots come from `getMarkedDates`, which uses
the same UTC day as the tap; the screen's local-day helper (`toDateKey`) fed only the
month's count. A screen test written for the wrong diagnosis passed with or without the
change, which is how it was caught. Separately, **jest ignores a runtime `TZ` change**
(measured: the hour stayed at the host's), so a timezone can't be switched inside a
jest test; that test was removed rather than kept as false assurance.

**The real defect, F181:** the month's count, by local day, disagreeing with the month's
total, by UTC day, at a month boundary (above). Fixed in `calendarUtils`, where vitest
can pin a timezone. **Bite check: 1, caught 1** (a local-day count fails the New York
case).

**Checked far from UTC: NOT, as first written.** I first wrote that every suite passed
at UTC-10, UTC-7 and UTC+14. That was false: **Node on Windows ignores an IANA name in the
`TZ` environment variable** (measured afterwards: every zone gave the host's offset,
-330), so those runs were all on India time. CI's Linux was the first real far-from-UTC
run, and it failed at once (F182, below). **CI now does the same:** a new step runs the logic suite at UTC-10 and
UTC+14 and the mobile screen tests at UTC+14, because the runner's own clock is UTC, where
a local/UTC mix-up can't show.

**Observation for P5 (not a finding):** the Calendar opens on the user's LOCAL today,
while the app's countdowns ("renews in N days") count from the UTC day. Which "today"
the whole app should use is a product-wide question for P5's timezone pass.

### F182 — renewal dates shown a day early west of UTC; the far-from-UTC check made real — 2026-10-03

**Found by CI**, in the step added with F181: at UTC+14 `formatShortDate` turned a June 12
renewal into "Jun 13". The function formatted the stored day label in the phone's
timezone; the label is midnight UTC, so west of UTC it read as the day before (F182).

**A false claim, corrected.** My F181 write-up said the suites passed at UTC-10 and
UTC+14; Node on Windows ignores `TZ=Pacific/...` at startup, so they had run on India
time (corrected in that entry). What works: setting `process.env.TZ` at runtime inside
vitest (the F181 New York test proved it) but not inside jest. So `vitest.tz-setup.ts`
applies `ZENO_TEST_TZ` at runtime, which makes a local far-from-UTC run real on any OS:
probe offsets -840 at Kiritimati, 600 at Honolulu. CI's Linux honours `TZ` directly.

**The fix, scoped.** The app's convention (§10) is that a renewal date is a day label;
the edit screen, the reminder scheduler (9 AM local on the label's day) and the
calendar's dots and countdowns already follow it. Four formatters and the add screen
didn't; they do now (`src/utils/day-label.ts`). **Not changed here:** "today" is the UTC
day throughout the app (countdowns, renewal roll-forward, budget months, spend history,
trial guardian, insights). Whether it should be the user's local day is product-wide and
touches money calculations; it is listed for P5 with every place it lives.

**Tests:** the new module in six zones (13). The full logic suite passes in three far
zones for real now (1,985 each, `ZENO_TEST_TZ`), and all 560 jest tests on this machine's
zone; CI runs jest at UTC+14. **Bite check: 1, caught 1** (local formatting fails Los
Angeles, New York and Honolulu, and only those).

Also: three unused variables in this phase's test files (lint warnings CI reported) removed.

**F182 on CI:** run 37100882161 passed every step, the far-from-UTC step included, except
the last, the dependency audit: a new high advisory against `braces`, published
2026-09-18 (below, in P4.3). CodeQL 37100882131 green.

### P4.3 — inline scripts allowed by hash, page by page; the headers checked; F183 fixed — 2026-10-03

**What the site had.** `script-src 'self' 'unsafe-inline'`, with a written reason: Next
emits inline scripts a fixed header can't name, and nonces would end static rendering.
P4.3 asked for that reason to be measured, or the permission removed. It is removed in
effect: every page now names its own inline scripts by hash.

**Measured first (the build, 529 HTML pages).** Each page has exactly three inline
scripts: Next's 43-byte bootstrap and our theme script (the same on every page), and the
page's React Server Components payload, **different on every page** (530 distinct
bodies). So one header can't list them. Every HTML page is prerendered, apart from one
hole: an unknown `/cancel/<slug>` was rendered on request (F183, below).

**The three ways Next offers, tried, not assumed:**
- **Nonces** (Next's CSP guide): "you must use dynamic rendering", so all 529 pages would
  render per request. Not taken: slower pages and more server work for the same result.
- **Experimental SRI** (`experimental.sri`), which Next's guide says keeps static pages
  "while still having a strict CSP" with `script-src 'self'`: **measured false on
  16.3.6.** Built with it, served, loaded in Chrome: the three inline scripts on every
  page were blocked (3 CSP violations a page), the theme script didn't run and React
  never hydrated. SRI only adds `integrity` to the script files.
- **`'unsafe-inline'`**: what we had.

**What was done: a per-page `<meta>` policy.** After `next build`,
`scripts/csp-script-hashes.mjs` writes into each prerendered page, first in its
`<head>`, `<meta http-equiv="Content-Security-Policy" content="script-src 'self'
'sha256-…' …">` naming the hashes of that page's own inline scripts (hashed as the
browser does: line endings normalised; JSON-LD data blocks skipped, import maps and
speculation rules included). A browser enforces every policy it is given, so an inline
script now runs only if the header AND the page's policy allow it: only the page's own.
The header keeps `'unsafe-inline'` as the fallback if a page ever lacked its policy (the
site keeps working at the old level, never breaks), and keeps what a `<meta>` can't
carry (`frame-ancestors`). The step is part of the website's `build` script, so CI, the
release workflow and any deploy that runs it get it.

**F183, found on the way.** With `dynamicParams` at its default, every unknown
`/cancel/<slug>` was rendered on request and written to the server's disk cache (about
nine files each, measured), without limit: an anonymous disk-filling route. Now
`dynamicParams = false`: unknown slugs get the prebuilt 404 page, byte for byte, and
nothing is written (measured: zero files). This also made every HTML response a
prebuilt page, which the hashes need.

**The other headers, against OWASP Secure Headers' recommended set (2026-09-13):**
- **Adopted:** `Cross-Origin-Opener-Policy: same-origin`, `X-Permitted-Cross-Domain-Policies:
  none`, `X-DNS-Prefetch-Control: off` (was `on`: the guides link to hundreds of services,
  and prefetching tells the visitor's DNS resolver which ones a page shows), OWASP's
  Permissions-Policy list (27 features off, none used by the site: checked in the code),
  and no `X-Powered-By` (`poweredByHeader: false`; OWASP lists it to remove).
- **Kept different, on purpose:** Referrer-Policy stays `strict-origin-when-cross-origin`
  (sends our origin, never the path, to the services we link to, so they can see visits
  came from Zeno; OWASP says `no-referrer`). HSTS keeps `preload` (submitting needs it;
  submitting is the owner's call, D14). No `Cache-Control: no-store` or `Clear-Site-Data`
  (a public site meant to be cached; no sign-out), no COEP (nothing to isolate).
- `style-src` keeps `'unsafe-inline'`: measured, 5 pages carry style attributes in their
  markup and 2 carry `<style>` elements. P4.3 was about scripts.

**Tests.**
- `scripts/csp-script-hashes.test.ts` (14): which scripts count, the hash (line
  endings), the policy's place and content, re-running changes nothing, refusals, the
  folder walk, and that the website's build runs it.
- Chrome (both projects): every route and the 404 carry exactly their own scripts'
  hashes, the theme script ran and React hydrated, no console error (a CSP violation is
  one); all 509 guides checked the same way over HTTP; an injected inline script is
  blocked while the page's own run; a made-up guide is byte for byte the 404 page.
- `next.config.test.ts`: the new header set; `guides.test.tsx`: `dynamicParams` off.

**Bite checks: 2, caught 2.** Built without the hash step and with `dynamicParams` back
on: five new browser checks failed, and the injection test failed because the injected
script ran (`__injected` was `true`).

**Not CSP, logged:** F184 (the `/analytics` 404 lacks the theme script) and F185 (no
favicon), both for P5.

**Dependency audit (found by F182's CI run).** A new high advisory, GHSA-vfj7-8cjw-p6xm
(`braces`, stack exhaustion from deeply nested patterns), has no fixed release (every
version up to 3.0.3, the latest, is affected). Production trees, measured with
`npm ls --omit=dev`: the API and the website have no path to it; the only one is the
mobile workspace's `@expo/cli` -> `@expo/metro-file-map` -> `micromatch`, the developer
CLI's file watcher (Node-only, not in the app bundle), expanding patterns from our own
config. Accepted in `.audit-allowlist.json` with a short expiry (2026-11-30), like
node-forge, to re-check for a fix.

**P4.3 on CI:** CI 37101977826 green (every step, the browser tests on the runner's
Chrome included). CodeQL 37101977824 failed its zero-findings gate on one alert,
`js/bad-tag-filter` in `scripts/csp-script-hashes.mjs`: the script-end pattern didn't
match end tags HTML accepts, such as `</script\t\n bar>`. The input is our own build
output, so not exploitable here, but the pattern now follows HTML's tokenizer
(`</script` then whitespace, `/` or `>`, anything up to `>`), with a test. Bite check: 1,
caught 1 (the old pattern fails it).

### P4.4 — the build output scanned for secrets, by canary; F186 fixed — 2026-10-03

**Why a canary, not a pattern scan.** A pattern scanner recognises key-shaped strings;
it can't recognise a webhook URL, a database URL or a password it has never seen. So
`scripts/build-secret-scan.mjs` builds the website with every non-public environment
name the repository knows set to a fresh random value, then searches every byte under
`apps/web/.next` for each one, as written and base64-encoded (at each of the three
alignments). The names come from every tracked file that can name one: code
(`process.env`), `render.yaml`, the `.env` examples and the workflows' secrets: 49 today,
the website's secret (`WAITLIST_WEBHOOK_URL`) and every API secret included. Only the
public-by-design prefixes (`NEXT_PUBLIC_`, `EXPO_PUBLIC_`) and the build's own controls
(`NODE_ENV`, `CI`, `TZ`, `BABEL_ENV`) are left out. This is how CI builds the website
now, so the browser tests run on the canary build.

**F186, found by the first run.** One hit: `API_PORT`'s canary, inside Turbopack's build
cache (`.next/cache/turbopack/*.sst`), next to other variable names and this session's
own environment variables. Turbopack (its build cache on by default since Next 16.3)
stores a snapshot of the build's environment there, compressed; `API_PORT` happened
to fall in an uncompressed stretch, which is why a byte search saw only that one. Not
served: `next start` answered 404 for the cache, the manifests, `BUILD_ID`, the server
files and `.env`, including `..`, `%2f` and `%2e%2e` tricks. But it's every secret of the
build environment, at rest on any machine that builds the site and in anything that
copies `.next`. Our builds never keep the cache (fresh CI runners, no cache step), and
Next's own docs say "if your build environment never preserves `.next/cache`, set
`turbopackFileSystemCacheForBuild: false`". Done; no `.sst` is written now.

**So the scan can't pass blind:** every kind of file the build writes was listed
(`.rsc`, `.meta`, `.html`, `.js`, `.json`, `.map`, `.ts`, `.css`, `.body`, `.woff2`, and a
few Next info files), all text except the fonts (`next/font`'s subsets, skipped by
design). A kind not on that list (an `.sst`, a `.gz`) fails the scan until reviewed.

The scan deletes `.next` before building, so it judges that build alone: Next keeps
files from earlier builds (turning the cache off left the old `.sst` files in place,
which the scan duly refused on this machine's next gate run).

**Result: PASS.** None of the 49 values is anywhere in `.next`.

**Also measured: gitleaks over `.next`:** 6 hits, every one Next's own per-build random
keys: the draft-mode ("preview") keys (`.previewinfo`, `prerender-manifest.json`) and the
Server Action encryption key (`.rscinfo`, `server-reference-manifest.json`). They are in
server-only files (none in `.next/static`, which is all browsers get; served files
answer 404), and the site uses neither feature (no `"use server"`, no `draftMode`), so
they protect nothing. Not added to CI: its only hits would be these by-design keys, and
our own secrets are covered by the canaries.

**Tests:** `scripts/build-secret-scan.test.ts` (9): the name sources, what's left out,
that the repository's list covers the website's and the API's secrets, the canaries,
the base64 search (random bytes around the value, every alignment), the file kinds, and
the search itself on a planted tree.

**Bite checks: 2, caught 2.** (1) One build with three planted leaks: the webhook URL
rendered into every page, the Groq key rendered base64-encoded, and Turbopack's cache
back on. The scan failed on all three: both values in all 2,113 page files, and 9
unreadable `.sst` files (plus `API_PORT` again). (2) Without the base64 trimming, the
base64 tests fail.

**P4.4 on CI:** CI 37103114341 green (the canary build and scan, then the browser tests on
that same build). CodeQL 37103114274 failed its gate on one alert,
`js/file-system-race` in `scripts/build-secret-scan.mjs` (a `stat`, then a read of the same
path). Both folder walkers now take the entry type from the listing (`withFileTypes`);
CodeQL 37103592019 and CI 37103591985 green on `7492e01`. The scan's name list is 51 now: the scanner's own
test fixture (`EXPO_TOKEN`, a real secret name) and a comment (`X`) count too; an extra
canary costs nothing.

### P4.5 — DAST: OWASP ZAP's baseline scan, nightly, gated; first run's two Mediums resolved — 2026-10-03

**What runs** (`.github/workflows/dast.yml`): nightly at 03:41 UTC, on demand, and on any
push that changes the scan. The website is built and served with `next start`; the API
runs in production mode (in-memory storage, RS256 keys generated for the run and never
stored, no email or AI provider; measured locally first: it boots and answers 200, 200,
401, 404). ZAP 2.17.0, pinned by digest (the `stable` tag on 2026-10-03, read from the
registry), runs `zap-baseline.py` three times: the website (3-minute spider), the API's
public catalogue route and its auth guard's 401. The baseline scan spiders and checks
responses passively; it sends no attacks.

**The gate** (`scripts/zap-gate.mjs`, 11 tests). ZAP runs with `-I`, so its exit code only
says the scan ran (0, or 3 on an error: read from `zap-baseline.py`'s source). The gate
reads each JSON report (field names from ZAP's own report template) and fails on any
Medium or High alert that ZAP didn't mark a false positive, unless `.zap-accepted.json`
accepts that exact alert with a reason and an expiry; on a scan ZAP stopped early; on a
missing or empty report; and on an expired acceptance. An acceptance names ZAP's
`alertRef`, not the rule: rule 10055 reports every CSP problem, and accepting the style
one must not pass a script one. Every alert is printed as an annotation; the HTML and
JSON reports are kept 14 days. Bite checks: blocking only High fails 4 tests; matching
acceptances by rule instead of alertRef fails 2.

**First run** (DAST 37103592028 on `7492e01`): the API, nothing at Medium or above; the
website, two Mediums, so the gate failed as designed.
- **"Source Code Disclosure - SQL" on `/cancel/adobe-creative-cloud`: a false positive.**
  ZAP's pattern (`select … from …`, from the rule's source) matched the guide step "Select
  a cancellation reason from dropdown"; run over all 529 built pages, that step was the
  only match. Reworded ("Choose a cancellation reason in the dropdown"), and a catalogue
  test now runs ZAP's pattern over every step (it fails on the old wording).
- **"CSP: style-src unsafe-inline" (10055-6), every page: accepted until 2027-03-31.**
  Measured: 156 inline style attributes (63 distinct, nearly all on the homepage: Motion's
  server-rendered start states, which F169's no-JS fix relies on, and component style
  props) and 2 `<style>` elements (Next's own 404 and error pages). The only way to drop
  `'unsafe-inline'` is `'unsafe-hashes'` per attribute, which ZAP also rates Medium
  (10055-8, from the rule's source), adds ~63 hashes to the homepage's head, and breaks
  layout in browsers that support hashes but not `'unsafe-hashes'` (before Firefox 109 and
  Safari 15.4, MDN's compatibility data). Scripts are already locked to their own hashes
  (P4.3), and the site shows no user data for CSS to read. GitHub, Stripe and Vercel all
  send `style-src … 'unsafe-inline'` (their live headers, fetched 2026-10-03).

**Lows, recorded, not blocking:** Cross-Origin-Resource-Policy missing on the website and
"missing or invalid" on the API's catalogue route (it sends `same-site`), and
Cross-Origin-Embedder-Policy missing on the website (P4.3 decided against COEP: nothing to
isolate). Informational: cacheability notes only.

**P4.5 on CI:** DAST 37104160285 green on `36f1bb0` (the three scans ran; nothing at Medium
or above but the accepted style alert, shown as accepted; the SQL false positive gone),
with CI 37104160223 and CodeQL 37104160276 green.

### P4 gate — passed — 2026-10-03

Each criterion, with its evidence:
- **Playwright green in CI.** The browser suite (every route on desktop and phone, light
  and dark; the behaviours; the Core Web Vitals budgets) runs in every CI build on the
  runner's Chrome; green on every push since P4.2, last on `36f1bb0` (CI 37104160223),
  over the canary build of P4.4.
- **CSP without `'unsafe-inline'` scripts (or a written reason).** Done without the
  reason: each page's inline scripts are allowed by their own sha256 (P4.3), an injected
  inline script is blocked (a browser test, bite-checked), and all 509 guides carry exactly
  their own hashes. `style-src` keeps `'unsafe-inline'`, with the measured reasons and an
  expiry (P4.5).
- **axe clean on every route.** CI checks all 17 pages and 5 representative guides on
  desktop and phone, light and dark. For the gate, axe also ran once on **every one of the
  509 guides, light and dark: 1,018 views, 0 violations** (desktop, WCAG 2.2 AA, this
  build; a one-off spec, not kept: 17 minutes is too long for each CI run, and the guides
  share one template, which CI's five cover).

Also in P4: the website's component and page tests with their own floor (P4.1), the
truthfulness rail as a test, the build-output secret scan by canary (P4.4), and the nightly
ZAP scan (P4.5). Findings fixed in P4: F165-F177, F179-F183, F186. Open from P4, for P5:
F178 (the app's matching low-contrast colours), F184 (the `/analytics` 404 ignores the
theme), F185 (no favicon), and the product-wide "which today?" question.

### P5 (in progress) — Maestro on the emulator: first eight flows; F188-F190 fixed, F187 and F191 logged — 2026-10-03

**Set-up, measured.** Maestro CLI 2.11.0 (315 MB, downloaded with the owner's OK; its
SHA-256 matched the release's checksum file and GitHub's asset digest). Its anonymous
analytics are off: `MAESTRO_CLI_NO_ANALYTICS` (any value; read from its code), and
`enabled: false` in `~/.maestro/analytics.json` (the first `--version` run had turned it
on; `lastUploadedTime` was null, so nothing was sent). The flows run on the single-ABI
release APK on emulator-5554 (`pm clear` first). That APK only speaks HTTPS
(`usesCleartextTraffic="false"`) and its API address is the loopback default, so the
flows run the app as shipped with no server: hermetic, and never touching production.
Server behaviour is the API suites' (P2).

**Flows** (`.maestro/`; subflows in `.maestro/common/`), green on the emulator:
01 onboarding and continue without an account (and a relaunch keeps the choice); 02 the
sign-in gate (nothing is enabled until the age and terms box is ticked; no developer login
in a release build; nothing is pressed, since this build would send a real email); 03 add
from the catalogue, kept across a relaunch; 04 a written-in yearly service; 05 detail,
cancel guide, the stamp, pending (F188, F189); 06 app lock (relock on leaving, wrong PIN
refused with attempts left, cold start locked); 08 coach consent (nothing sent until
Enable; Not now remembered; with no server it says coaching isn't available). 07 (Family
without an account, F190) is written; its first run hit F191 in onboarding. Bite check on
the tooling: an assertion expecting the consent box ticked before the tap fails.

**A date-fragile test, from F182:** three add-screen tests counted a renewal's days by
rounding from this instant; the renewal is now a day label (midnight UTC), so after
12:00 UTC "30 days" rounded to 29 (seen in the gate run at 13:14 UTC). They now count
whole days from today's UTC day. CI would have failed any afternoon run.

**F106 watch:** a capture right after the first unlock of a fresh install was normal
(100 % non-black). **F94:** not seen.

**Left in P5:** flows for notifications, discover, calendar, insights, dark mode and the
accessibility-tree audit; the nightly CI emulator job; F178, F184, F185 and "which
today?"; then the gate (12+ flows green locally and nightly).

### P5 (in progress, part 2) — flows 09-11; F192-F197 fixed; the runner — 2026-10-03

**CI for part 1:** CI 37125737295 and CodeQL 37125737299 green on `f1be88f`.

**Found after part 1, fixed:** F190's Sign in pushed `/login`, which the root layout
sends straight back to the ledger for a usable (local-only) session (seen on the
emulator); it now goes through the same confirmed "Exit local-only mode" as Profile,
which lands on sign-in. Typecheck caught that a renewal date can be missing: with no
date at all, "Confirm it stopped" is the user's call (the automatic check can never
run). Lint moved that check out of render (`react-hooks/purity`).

**Flows 09-11** (green on the emulator): 09 notifications blocked by the phone, then
allowed (F192); 10 Discover: a real CSV statement through Android's file picker, the two
subscriptions found and the bakery and hardware-store one-offs not, the honest total
(F193), one kept; 11 the calendar (F194-F197). `.maestro/run.sh` pushes the CSV fixture
(Windows paths converted; proven by deleting it from the device first), turns Maestro's
analytics off, and runs each flow on its own.

**Bank login copy:** Settings says "We never ask for your bank login". True of this build:
the bank-connection screen shows "This screen isn't part of this version of Zeno" in
release builds (F151). It must change if Plaid ever ships.

### P5 (in progress, part 3) — flows 12-13, the accessibility audit, the nightly job; F198 fixed — 2026-10-03

**CI for part 2:** CI 37127739214 and CodeQL 37127739213 green on `ce2cd44`.

**Flows 12-13** (green on the emulator): 12 Insights with a monthly and a yearly plan (the
monthly spend $25.49, this month's chart bar $15.49 read as one month, the overview
naming the user's own category (F198), the breakdown 61 % / 39 %); 13 dark mode, switched
on, kept across a relaunch, switched back. Maestro can't see colour, so the flow saves
both ledgers and they were measured: mean luminance 24.4 (dark) and 237.0 (light). A
first measurement read 71.6 for light: the screenshot had caught the launch splash
mid-tear (the ledger's text is in the tree under it); the flow now waits for the
animation to end.

**The accessibility-tree audit** (`.maestro/a11y-audit.sh`, the check in
`a11y_check.py`): after a realistic set-up (onboarded, one subscription), each of 17
reachable screens is opened by deep link and dumped as TalkBack sees it (`uiautomator
dump --compressed`); a clickable node with no text or description, on it or inside it,
fails. Result: **17 screens, 0 unnamed controls** (twice, the second after a reinstall).
Bite check on the checker: a hand-made tree with an unnamed button fails, one whose
button is named by its child passes, and a screen that isn't Zeno fails.

**Two Maestro tooling failures, measured** (about 2 in 15 runs): its on-device server
died at launch (`DeviceServerDiedException`), with no app crash in the device's crash
log. `run.sh` retries a flow once in exactly that case, and never when the app crashed.
(Two "app died" lines once looked like crashes; they were Maestro's own `stopApp`
force-stops, read from the activity manager's log.)

**The nightly job** (`.github/workflows/mobile-e2e.yml`): `expo prebuild`, the x86_64
release APK, Maestro 2.11.0 checksum-verified, an API 35 emulator
(reactivecircus/android-emulator-runner, pinned), then `.maestro/ci.sh`: every flow and
the audit. Nightly, on demand, and on a push that changes the flows. Its first run is
the measurement that the flows hold on a different emulator image.

**F178 fixed** (row above), measured on the device in both themes. **CI for part 3:**
semgrep failed on `.maestro/a11y_check.py` (`use-defused-xml-parse`: `xml.etree`
parsing). Its input is uiautomator's dump of our own app on our own test emulator, never
untrusted XML; suppressed inline with that reason (the repo's rule: `nosemgrep` with a
reason, never a wider ignore). Proven with the CI's packs: 0 findings, and 1 with
`--disable-nosem`; the full scan: 258 rules, 337 files, 0 findings.

**F184 and F185 fixed, F199 logged** (rows above). For F184 two plausible fixes were
measured and failed (a root `not-found.tsx`; the `notFound()` moved into the layout)
before the rewrite worked.
The build-output secret scan (P4.4) then refused the two new file kinds, as designed;
reviewed: `.svg` (text, now searched) and `.png` (the icon, a copy of a committed image,
skipped like the fonts).

**CI after part 3.** CI 37137561648 (`935d7fb`) failed one website test, the waitlist form
on desktop: F200 (above), a test typing inside the book-mode switch on a loaded runner;
fixed in the test, measured. The first nightly mobile run (37136242072) failed building
the APK; the annotation carried no reason (the raw log needs a login). The job now
builds on Java 21 (the local loop's, measured working; it had 17) and turns Gradle's
"What went wrong" into an annotation, so the next failure, if any, is readable.

### P5 — "which today?" decided and done (F202); F201 — 2026-10-03

**The decision.** Renewal dates are calendar-day labels (§10), and a person means their
own calendar day: "renews today" is about the date on their phone. So "today" is the
user's calendar date, expressed as a label (midnight UTC of that date), and compared with
the renewal's label; the arithmetic between labels stays in UTC, where every day is 24 h.
Not an owner call: it is what the dates already meant.

**Done in one helper and every caller** (`packages/shared/src/dates/day-label.ts`):
countdowns and the roll-forward (`subscription-ui`), the calendar's groups
(`calendarUtils`), insights' day counts, the budget (its month, "charged so far" by day
label, days left, the recap's month), spend history and year in review, the trial
guardian, the add screen's "in N days" and the demo seed. Tests that had pinned the old
UTC rule ("does not depend on the device timezone") now say which zone they run in, and
each place has a boundary test across zones that fails with the old code.

**CI caught a gap the next day (2026-10-04).** The push of F202 went red on GitHub in
"Tests far from UTC": 10 screen tests failed in Kiritimati (UTC+14) at 17:50 UTC, when
its date was a day ahead of UTC's. The app was right; the tests were not. Their fixtures
stored "today" as the current instant instead of a day label (the app only ever stores
day labels), the add screen's test counted "in 30 days" from the UTC date, and the budget
test hardcoded "22 DAYS LEFT" for a moment that is 10 Oct or 11 Oct depending on the
zone. My local gate had passed because it runs in one zone (Kolkata), and Git Bash drops
`TZ` before it reaches Node (measured: `process.env.TZ` was undefined); PowerShell passes
it. Reproduced in Honolulu, fixed (fixtures from `dayLabelInDays`, counts from
`todayLabel`, days left from the phone's date), and the five suites pass in Honolulu,
Kiritimati and Kolkata. Bite: with `todayLabel` put back on the UTC date, the budget test
fails in Kiritimati; the other four suites are now zone-proof but don't pin the rule, which
the shared boundary tests do.

**Flow 10, flow 12 and the nightly build (2026-10-04).** Flow 10's failure the night
before was the system file picker, not the app: its screenshot shows the file ticked,
"1 selected", the picker waiting on its own "Select" button (the app asks for one file,
`multiple: false`; Maestro sent one plain tap). The flow now taps "Select" only when the
picker asks. Rerun: flows 10 and 12 pass, and flow 10 passed again later; both times the picker
returned at once, so the new step was skipped. It covers the stop seen once and was not
exercised here. One more run of flow 10 died in 6 s on "device offline" (the emulator
dropped off adb while the gate ran beside it; no app step had run); `run.sh` retries only
on Maestro's DeviceServerDied text, so it was counted as a failure, correctly not hidden. Flow 12's
earlier failure was Maestro's session-file lock; it passes. The nightly job now builds
with Java 21 and fails in R8 (`minifyReleaseWithR8`: "Compilation failed to complete";
the same build passes locally). The job log needs admin rights, so R8's own error lines
now go into a second annotation (readable through the public API), and Gradle runs with
`--stacktrace`; the cause gets fixed from that, not guessed.

**Second red run, and the nightly build's cause (2026-10-04).** CI on `dd73eee` failed in
"Tests far from UTC" again, in a suite the first fix didn't touch: `insightsEngine.test.ts`
put a trial "2 days" away as now + 48 h, which in Honolulu is 3 days from the user's date
(priority "medium", not "high"). This time I ran every suite in Honolulu while its date
differed from UTC's (through PowerShell, which passes `TZ`), to find all such cases at once
rather than one per CI run: that one, plus `subscription-detail.rntest.tsx` (F116), whose
expected label was read in local time ("MAR 30" in Honolulu for the 31st) while the app
shows day labels in UTC (F182). CI never saw the second because it runs the screen tests
only in Kiritimati. Both fixed; both pass in Honolulu, Kiritimati and Kolkata; the detail
test fails with dates formatted in local time (bite). The whole suites pass in Honolulu.
The new R8 annotation gave the nightly build's cause: `java.lang.OutOfMemoryError: Java
heap space` with the template's 2 GB Gradle heap (enough locally, not on the runner). The
workflow now gives Gradle 6 GB on the 16 GB runner.

**The nightly job builds now; the flows' result needs to be readable (2026-10-04).** With
6 GB, the APK build passed on GitHub (17 min) and the emulator step ran for 14 min, then
failed with only "exit code 1" readable: the job log and the uploaded Maestro logs both
need a login. As with R8, `ci.sh` now turns its own summary (PASS/FAIL/RETRY per flow,
each failure's assertion and crash line, the audit's result) into an annotation, on
failure only (tested with stand-in scripts: a failing run annotates, a passing one
doesn't). Which flows failed on the runner is not known yet; the next run says.
GitHub's schedules for this repo run ~6 h late (measured: the fuzz job, due 03:17 UTC,
started 09:14-10:14 UTC each day), so "nightly" results arrive mid-morning UTC.

**First readable result from GitHub's emulator, and the screen behind each failure
(2026-10-04).** The summary on `5466b6e`: the accessibility audit passes on all 17 screens;
flows 03, 04, 07, 09, 11 and 12 pass; 01, 02, 05, 06, 08, 10 and 13 fail (all 13 pass on
the local emulator, Android 36 with July app data; the runner is a fresh Android 35). One
is plainly an assumption of the test: flow 06 expects "PIN + BIOMETRICS", shown only when
a fingerprint is enrolled. The others are not diagnosed: the screenshots are in logs that
need a login. So each failed flow now also prints what was on screen (texts and labels
from Maestro's saved screen, `.maestro/screen_texts.py`), and that goes into the
annotation. Checked on the real 2026-10-03 failure: it prints the picker's
"1 selected · Select", as its screenshot shows.

**GitHub's emulator, second readable run (`c2909f6`, 2026-10-04).** Flow 01 passed this
time (so its failure on `5466b6e` was not stable); 02, 05, 06, 08, 10 and 13 failed; the
audit passed (17/17). No "SCREEN" lines: the runner's console never printed Maestro's
"Debug output" folder, so `run.sh` found nothing to read. Now each run writes its evidence
to a folder `run.sh` names (`maestro test --debug-output`), read for the screen and for
the retry check, and uploaded with the logs; tested with a stand-in Maestro that never
prints the folder (screen reported) and with the "device offline" run (one retry).
Flow 06 accepts "APP LOCK · PIN" as well as "PIN + BIOMETRICS": the label says what the
phone allows (F128), and a fresh emulator has no fingerprint enrolled.
`render.yaml`: no forced `COACH_PROVIDER` (forcing "anthropic" turned the coach off with
only a Groq key; `coach.ts` picks by key), and `METRICS_TOKEN` is listed. The API now runs
from the Blueprint (`zeno-api` + `zeno-db`, Oregon), with the database linked.

**Third readable run (`c161230`): the screens still missing, cause measured (2026-10-04).**
Every failure read "no screen saved", and flow 06 still failed with "PIN" accepted too, so
the fingerprint explanation was at best incomplete (not claimed fixed). Measured on the
local emulator with a flow that fails on purpose: `maestro test --debug-output DIR`
writes under a hidden `DIR/.maestro/tests/<time>/`, and Python's glob skips hidden
folders. `screen_texts.py` now walks the tree (reads the probe's screen and the
2026-10-03 one); the log upload sets `include-hidden-files`, which the action needs for
hidden files. On GitHub, flows 10 and 13 each hit Maestro's device-server dropout once
and were retried once (both then failed their assertions).

**The screens arrived, and they agree (`34ff7d5`, 2026-10-04).** Each failing flow's saved
screen stopped short of the control it needed: 02 ends at "Send sign-in link · OR" (the
Google button below is off screen), 05 at the cancel guide's step 4 ("Mark Netflix as
cancelled" below), 06 shows the keyboard open over "Turn on app lock", 08 ends at the
consent's point 03 ("Not now" below), 10 still reads "2 selected" after the "Deselect
Spotify" tap; 13 saved no screen. The local emulator the flows were written on is a
1080x2400 phone; the workflow set no device profile, so the runner used the tool's
default device. So: the emulator is now `profile: pixel_6` (1080x2400), and `ci.sh` puts
the measured screen size (`wm size`, `wm density`) at the top of the summary. Not
claimed fixed until the next run says so; a flow that still fails there gets its own
look. The app itself showed no fault in any of these screens (no crash line, the right
content in each).


### SEO audit of the live site, measured — 2026-10-04

Asked for "top of search for everything subscription-related, beat every competitor". What
can be measured and fixed was; what can't be promised (a ranking) isn't claimed. Measured on
`zenoapp.in` with Lighthouse 12.8 (mobile, simulated), Google's PageSpeed API (rate-limited,
so Lighthouse ran locally), public DNS and curl:

- **Scores:** home SEO 100, performance 94, accessibility 98, best practices 93; a cancel guide
  SEO 100 / 96 / 98 / 93. LCP 2.6-2.8 s, layout shift 0, blocking time 10 ms (all inside
  Google's "good" thresholds). Pages come from Netlify's cache in 0.5-0.8 s.
- **Already right:** canonical on every page, Open Graph and Twitter cards with a real
  1200x630 image, a 526-URL sitemap, robots.txt, FAQ/HowTo/Breadcrumb/Organization/WebSite
  structured data, `www` and trailing-slash redirects, HSTS, every image with alt text, one h1
  per page.
- **Found and fixed:** (1) the footer's column headings were h4 after h2 (Lighthouse
  heading-order on every page): h2 now, same look. (2) `/features` and `/compare` were 404s,
  their ten pages reachable only from the footer: both are hubs now, in the sitemap, with
  breadcrumbs. (3) 470 of 509 guides are one template (measured: name and domain replaced,
  40 distinct texts in 509), and read as if written for the service: each now says it is
  general, on the page and in its search description, and the sitemap ranks it 0.5 against
  0.8 for the 39 real ones; whether to index them at all is D16, one switch
  (`apps/web/lib/guides.ts`). Bite: the label test fails with the label misspelt; the priority
  test fails with both at 0.7.
- **Found, owner's to fix:** a console security error on every page is Netlify's pre-launch
  toolbar (`/.netlify/scripts/hud`, injected while the project is private; it builds a
  `srcdoc` frame whose inline script our policy blocks, hash `mTJ4cJ…`, found by hashing every
  script in the live page). Netlify's docs: it stops when the project is made public.
  Google Search Console and Bing are not set up (owner list, exact steps).
- **Not done, on purpose:** no `sameAs` social links in the Organization data (none exist);
  no dates in titles; no ratings or app-store schema (no app is published). Minor: 13-26 KiB
  of unused/legacy JavaScript flagged by Lighthouse; not worth a change.


### The blog, and the phone-sized runner's launcher dialog — 2026-10-04

**Blog.** `/blog` and four posts (`apps/web/app/blog/posts.ts`): finding every subscription,
keeping a free trial free, why cancelling is made hard, a 20-minute audit. Written by hand
in plain words; the two figures a post quotes (509 services, 14 hard or dark-pattern) are
filled from the catalog at render time, never typed. Each post: its own title, description,
canonical, article social card with a published date, BlogPosting and Breadcrumb structured
data, 600+ words, links to the other posts and to the guides. Tests
(`apps/web/app/blog/blog.test.tsx`) hold every post to the truthfulness rail (the site test
renders only the first post of the route), check every internal link resolves, and that
the index lists them newest first. In the sitemap (0.7) and the footer. Legal lines kept:
no competitor is named in a post with a claim about it; no statistics; app-store steps are
the stores' own (Settings → name → Subscriptions; Play Store → Payments & subscriptions).
The D16 switch got a root-scope test (`apps/web/lib/guides.test.ts`) that also keeps the
decision record in OWNER_ACTIONS.md in step with the setting (the root coverage floor had
caught the file at 0%).

**Runner (`2bf6d7d`, pixel_6 profile).** The screen is now the local phone's
(1080x2400, density 420: `ci.sh` prints it), but every flow failed at its first step and
every saved screen read "Pixel Launcher isn't responding · Close app · Wait": the launcher's
ANR dialog sat over the app. `ci.sh` now sets `hide_error_dialogs 1` on the device before
the flows (system dialogs off; the app's own crashes are still read from the crash log).
Not claimed fixed until the next run says so.


### F203 and F204 — the website on phones and on a 27" screen, measured and fixed — 2026-10-04

Owner's report: "the entire website feels broken on mobile, and on a 27-inch display it
looks too small and doesn't fit". Measured in a real Chrome at 320, 375, 390, 412, 768,
1024, 1280, 1440, 1920 and 2560 px wide, on the live site first, then on the fix.

- **F204, phones.** Content pages (blog, guides, hubs) fit a 375px phone exactly. The
  **homepage laid out 447px wide** on a 375px phone, so the browser zoomed out and clipped
  the right side (the form's button, the sample ledger). Measured cause, by giving every
  element `width: min-content` and reading the result: the sample ledger row's no-wrap label
  ("RENEWS JUL 14 · DARK-PATTERN CANCEL", 233px) plus the row's other parts made the row
  393px, and the hero's single-column grid was `1fr`, whose minimum is the content's, so the
  column became 423px. Fixed: the single-column grids are `minmax(0, 1fr)` (the row shrinks
  and the label's own ellipsis takes over); the "zeno" wordmark's floor went from 220px (a
  461px word) to 96px; the refusal rows' label can shrink and wrap (its value had been pushed
  51px off a 375px screen, more at 320px). After: the layout is exactly the screen's width at
  every size, nothing past the edge, the form wraps.
- **F203, large screens.** In the book, each sheet is the screen (2464x1335 on 2560x1440)
  while the content was laid out for a 1440x900 desk: a 1080px column, a 64px headline, 44%
  of the sheet's width and ~60% of its height used, the rest blank ruled paper. Fixed: the
  sheet's content is scaled with the smaller of width/1440 and (height-nav)/860, never down,
  at most 1.6x (`zoom` on a wrapper; LedgerBook sets `--book-zoom`); measured after: 1.6x on
  2560x1440 (the column 70% of the sheet, the hero 74% of its height), 1.19x on 1920x1080,
  1x on 1440x900, page turning and in-page scrolling unchanged, no sideways overflow in any
  sheet. Tried and dropped: centring a short section in its sheet with a flex wrapper and
  `min-height: 100%`; under `zoom` that wrapper stretched the section (The Method measured
  1165px of its own 644px) and made the page scroll, so short pages keep their blank paper
  below, as the 1440x900 design has. The ruled margin line is placed from the section's
  width, not 100vw.
- **Regression test:** `apps/web/e2e/viewports.spec.ts` loads seven page types at the eleven
  sizes above and fails on any element past the screen's edge, any horizontal scroll, or a
  layout wider than the screen; and checks the book scales on 2560x1440.
- **Asked for, and why not:** "skeleton loading" is for content fetched after the page
  arrives; every page here is complete HTML from the server (nothing loads afterwards,
  layout shift measured at 0), so a skeleton would be a fake loading state. Fonts come from
  the site itself with `font-display: swap` via next/font; images are a 49KB share card and
  SVG icons.

**Runner, second try (`c05e85e`).** `hide_error_dialogs 1` did not clear the launcher's
"isn't responding" dialog: it was already on screen when the flows started (the runner's
launcher stalls during boot), and the setting only stops new ones. `ci.sh` now runs a
small Maestro flow first (`.maestro/ci/dismiss-system-dialogs.yaml`) that taps "Wait" or
"Close app" if such a dialog is visible and asserts none is left; its result is the first
line of the summary. Not claimed fixed until the next run says so.

**Coverage floors (web), corrected.** The gate refused this change on functions 99.44% vs a
99.45% floor and statements 97.84% vs 97.85%; measured at HEAD without the change: the same
99.44 / 97.84, twice. The floors had been written by one run that rounded up (the cards
commit's), so they were unreachable for any change. Set to the stable measured level, as
the jest floors were after their truncation lesson; the ratchet still only moves up.


**Runner, third try (`41d8d8f`): 10 of 13 flows pass on GitHub, the audit 17/17.** The
dismiss flow cleared the dialog ("none left"). Left: flow 02, where the runner's keyboard
stayed up over the button below the email field (the saved screen had the typed address
and no button): `hideKeyboard` after typing, only there (the other typing flows passed).
Flow 05 asserted the day it was written ("Nov 2", "REPORTED OCT 3"); the renewal is 30 days
from the day the flow runs, so those are date-shaped patterns now. Flow 11 died on
Maestro's device server on the first try and again on the retry (flow 06 once): `run.sh`
allows a second retry for that tooling case only, and an app crash is still never retried.


### P5 gate — passed; the mobile job green on GitHub — 2026-10-04

The gate: at least 12 of the 13 flows green locally and on the runner. Measured: all 13
flows and the accessibility audit (17 screens, every control named) passed on GitHub's
emulator (Mobile end-to-end 37205579950 on `5dbddd7`, 38 min; CI 37205579972 and CodeQL
37205579957 green on the same commit), and all 13 on the local emulator (flows 10 and 12
rerun 2026-10-04, the rest 2026-10-03). Neither F94 nor F106 reappeared in any run.

What it took to get the runner green, each step measured before the next (the day's
entries above): Java 21; a 6 GB Gradle heap (R8 ran out); a readable summary and then each
failure's saved screen in an annotation (the job log needs a login); Maestro's evidence in a
folder `run.sh` names, read from its hidden `.maestro` subfolder; a phone-sized device
profile (the default was smaller and every button sat below the fold); the launcher's
"isn't responding" dialog dismissed by a first flow (`hide_error_dialogs` only stops new
ones); the keyboard hidden after typing in one flow; date patterns instead of the day a
flow was written; up to two retries when Maestro's own device server dies (never for an
app crash). The scheduled 04:07 UTC run is the same job; GitHub starts this repo's
schedules ~6 h late, so its first result is due mid-morning UTC on 2026-10-05.

**Next: P6** (mutation and property-based testing), when the owner says so.


### P6.1 — Stryker on the shared packages: set up and measured — 2026-10-04

Stryker 10.0.0 with its vitest runner (`stryker.config.mjs`, run `npx stryker run`; the
report goes to `reports/mutation/`, ignored by git). It mutates the 21 files of
`packages/shared` and `packages/service-catalog` (the `index.ts` files only re-export,
checked) and runs the tests that can reach them: the packages' own and the API's
(`vitest.mutation.config.ts`). 2,159 mutants.

**One harness problem, measured before it was fixed.** The first dry run failed a test
that passes in the normal suite ("31 March of a leap year" read April). Stryker's source
forces vitest into worker threads, and a probe showed that in a worker given its own env
object (as vitest's are) `process.env.TZ = …` is silently ignored; in a forked process it
works. So under Stryker every zone-switching test ran in this machine's zone (India).
Fixed: Stryker's process sets TZ to UTC before it forks its workers (a startup TZ is
honoured, measured), and `vitest.tz-setup.ts` probes whether a zone switch works. Where it
does not, the 10 zone-switching cases skip ONLY if Stryker started the run; anywhere else
the setup throws. Bite-checked: vitest with `--pool=threads` and no Stryker fails all 33
files with that message; the normal run still runs all 278 package tests, none skipped.

**Baseline** (the packages' tests alone: 79.90 %, 102 mutants no test reached, 86 of
them in the schemas; then with the API's tests):

| Measure | Value |
|---|---|
| Mutation score | 82.35 % |
| Killed / timed out | 1,773 / 5 |
| Survived | 373 |
| No test reached | 8 (7 in `domain.ts`: the currency list and `isCurrencyCode`, which only the app's tests use, P6.3; 1 in `parse-utils.ts`) |
| Run time on this machine | 28 min 44 s |

Weakest files: `schemas.ts` 22 % (F205), `integrations/partners.ts` 21 % (F207),
`discovery/email-receipts.ts` 63 % (F206), `scale/business.ts` 70 %, `dates/day-label.ts`
71 % (2 survivors), `family/vault.ts` 76 %. Strongest: `finance/open-banking.ts`,
`public-api/keys.ts` and `api.ts` at 100 %, `year-in-review.ts` 98.9 %.

One worker process crashed once mid-run (Windows code 0xC0000409, a stack overrun, almost
certainly a mutant recursing); Stryker restarted it and counted the mutant. The new
dependency brings two moderate advisories in `qs`, used only by Stryker's dashboard
upload, which this setup does not use; the audit gate passes.

**Observed once, cause not known:** the first gate run after this change had one vitest
fork exit mid-run ("Worker exited unexpectedly"), so one file's coverage was missing and
the 100 % floor failed. Four runs after it were clean (150 of 150 files). Watching for it;
if CI shows it, it gets a number and a cause.

**Next in P6.1:** kill the survivors that matter (F205 first, then F206, F207, then the
smaller files) and set the floor at 85 %.


### P6.1 — the survivors that mattered — 2026-10-05

Each finding was read in the code before it was judged, and each fix was checked by
putting the mutations back by hand (scripts in the session scratchpad): every one now
fails a test. A Stryker run on the three files confirmed it.

- **F205, the input schemas.** Only `syncPullSchema` and `syncPushSchema` are used (the
  API's sync routes); the other six had no user in the API, the app or the website, and
  the shared sign-in pair was a weaker copy of the API's own. Removed. A new
  `schemas.test.ts` pins every limit of the two at its edge: the cursor (64), the page
  size (1 to 100, default 50, whole numbers), the entity types and operations, the id
  (1 to 128), the payload (8,192), 100 changes, and the vector clock (64 entries, each
  name up to 64 characters, each count 0 to 2^40, with its error message). 15 hand
  mutations, 15 caught.
- **F206, the email-receipt reader.** The receipt detector, its confidence score and its
  category guess had no caller: the app's scanner (`emailScanner.ts`) does that work.
  Removed; the app-name extractor the scanner calls stays. Its cleaner had two parts no
  input can reach (the captured name never holds a quote, and never more than three
  words, so a six-peel cap never bites), so they were removed rather than tested, and a
  `\s+` that could only ever see one space became `\s`. New cases: up to three words,
  every period marker, folded gaps, every spelling of the store and auto-renew headings,
  noise only at the front, the two-character minimum at each step, any letter case.
- **F207, the partner list.** Pinned whole; two statuses corrected (see the finding).
- **The spending coach** (`coach.ts`, 34 survivors; its insights are the app's coach
  screen): a new `coach.insights.test.ts` pins each insight whole at its edge. The one
  that mattered: the rule that decides which currency the totals are in, when no rates
  are given, could be broken so that ₹500 + $50 read "$550.00" against the dollar
  benchmark, and no test noticed. 10 hand mutations, 10 caught.
- **`daysFromToday`:** its only arithmetic tests switch zones, so they skip under
  Stryker; a case that holds in any zone now covers it there.
- **Marked, not tested** (Stryker's own "disable" comments, each with its reason): the
  demo household and demo business workspace (sample names and colours; a change alters
  no behaviour), and one equivalent mutant in the business summary (without the guard a
  missing date is NaN, which fails both comparisons anyway).

Measured by Stryker on the three files: `schemas.ts` 100 % (28 of 28), `partners.ts`
100 % (47 of 47), `email-receipts.ts` 85.42 % (39 killed, 2 timed out, 7 survived; 6 of
those 7 then caught by the cases above, put back by hand, and the 7th equivalent, so the
`\s+` became `\s`).

**A coverage side effect, measured:** removing that well-tested dead code dropped branch
coverage to 99.69 %, under the 99.7 % floor; the uncovered branches left were fallbacks
no input can reach. One of them, in the app's site host (`config/site.ts`, a `?? ""`
after `split("/")[0]`), is now a single replace with the same result and no dead branch:
99.73 %, and the ratchet raised the floor to it.

A full run takes about half an hour here, because most mutants in module-level
constants (the schemas, lists) rerun every test (Stryker calls them "static"). The full
score with all of the above, and the 85 % floor, come from the next full run.


### P6.1 — measured after the fixes; the floor — 2026-10-05

A full run on `f2ec20d` (8 min 55 s here, down from 28 min 44 s: the six removed schemas
were module-level constants whose every mutant reran all the API's tests):

| Measure | Before (2026-10-04) | After |
|---|---|---|
| Mutation score | 82.35 % | 92.44 % |
| Mutants | 2,159 | 1,919 |
| Killed / timed out | 1,773 / 5 | 1,767 / 7 |
| Survived | 373 | 137 |
| No test reached | 8 | 8 (the same: `domain.ts` 7, `parse-utils.ts` 1) |

At 100 % now: the schemas, partners, the email-receipt reader, `day-label.ts`,
`vault.ts`, `business.ts` (the last two with their demo data marked), with
`open-banking.ts`, `keys.ts` and `api.ts` as before. `coach.ts` 97.77 % (from 84.82 %).
Still under 90 %: `services.ts` 89.05 % (54), `renewal-plan.ts` 87.22 % (23),
`history.ts` 87.66 % (19), `analytics.ts` 88.89 % (7), `twin.ts` 88.24 % (6); they are
above the floor and are next when the floor is raised.

**The floor:** `break: 92` in `stryker.config.mjs`, just under the measured 92.44 % (a
margin of about eight mutants, for results that are timeouts on a slow machine), raised
only. The plan's 85 % is met; the floor is set where the score is, like the coverage
floors. Bite-checked: a run mutating only `twin.ts` (88.24 %) exits 1 with "Final mutation
score 88.24 under breaking threshold 92". CI enforces it in P6.5.


### P6.2 — Stryker on the API: set up, two batches measured, the first one's survivors fixed — 2026-10-05

`stryker.api.config.mjs` reuses the shared-packages settings (UTC, the same tests) and
mutates `apps/api/src` without the test helpers and the seven-line `server.ts`. Report:
`reports/mutation-api/` (ignored by git).

**Measured, not run whole.** A run over all 14 files (3,098 mutants) estimated 2 h 10 min
at 4 workers: every API test builds the app, and 358 "static" mutants rerun all 564 of
them. Stopped, and run in batches instead, with 10 workers (this machine: 12 cores,
61 GB): the batches take 4 to 6 minutes.

**One test could not run under Stryker:** the F89 check reads the route source as text to
list every schema-parsing call, and Stryker's instrumented copy wraps each call, so the
text no longer matches. A text scan never runs the code, so it can never notice a mutant;
it skips under Stryker only (the dry run then passed, 564 tests).

| Batch | Mutants | Score before | Score after |
|---|---|---|---|
| auth guard, sync, billing, family, Plaid, config, HTTP, metrics, server options | 839 (836 after: one branch removed) | 89.03 % | 95.69 % |
| sign-in routes (`routes/auth.ts`) | 931 | 81.31 % | next |

What the first batch's survivors were, read in the code, and what changed:
- **Auth guard:** the "Bearer " check could be removed unnoticed, because every
  wrong-scheme test carried an INVALID token, which fails anyway. Now a real signed-in
  token is refused behind another seven-character scheme ("Tokens ", "Basic: ") or none,
  and admitted as "Bearer " with stray spaces trimmed. (Lowercase "bearer " is refused
  today; HTTP treats the scheme as case-insensitive, so that is a stricter choice than
  needed, harmless with our own app as the only client. Not pinned by a test.)
- **Billing:** the version counter that stops an in-flight RevenueCat answer from being
  cached after a webhook (F87) could be broken so the first webhook set it to NaN, which
  never equals itself: that user's answers were then never cached again, unnoticed. A test
  reads twice after a webhook and expects one lookup. A branch loading a legacy bare row
  as "cached at time 0" was removed: such a row is stale on every read, exactly like no
  row.
- **Config:** each JWT key missing alone (not only both) is fatal; the storage-key and
  email-key warnings are checked in their words; `http://` is cleartext only at the start
  (an https:// URL that mentions http:// later is not flagged); the alert and coach URLs
  are trimmed before the check; the CORS list splits on commas and quotes at most 60
  characters.
- **Metrics:** the whole `/metrics` text is pinned for a known set of requests (HELP and
  TYPE lines, sums, counts, label escaping, the in-flight gauge and its floor at zero), and
  the public events endpoint's allowlist is pinned whole.

Left in that batch, read and judged: family (10) is mostly equivalent (the owner is always
the first member, so "is the leaver the owner" changes nothing; a missing household id
finds nothing either way); Plaid (10) is the request shape sent to Plaid, which the
owner's rule keeps out of tests that call Plaid; billing's remaining 6 include the expiry
check at the exact millisecond.

**Next in P6.2:** the sign-in routes, where the survivors sit in remote token
verification (Apple and Google, 22), our own access-token check (12), the expired-entry
sweep (18) and the code-guessing limits (7); then `app.ts`, `coach.ts`, `storage/pg.ts`,
`start.ts`; then the API floor.


### SEO pass against the owner's playbook (SEO.md) — 2026-10-05

Asked for before P6.2 continues. Measured first, on the live site (a script reading every
sitemap URL's HTML, SEO.md §9): 27 pages sampled, 18 descriptions outside 140 to 160
characters, 26 share images with the same generic alt, 20 pages whose Twitter card fell
back to the site-wide one, the three legal pages with no share image, two titles over 60
characters, the homepage title brand-first, no stable `@id`s in the structured data, no
app schema, no RSS feed, no `llms.txt`, and one fixed June date as every page's lastmod.

**What changed:**
- `lib/seo.ts` `pageMetadata()`: every page's title (keyword first, "| Zeno" once, at most
  60), description, self-canonical, and its OWN Open Graph and Twitter cards with an alt
  that is the page title. All 19 static pages, the 509 guides and the 4 posts use it.
- New titles and descriptions, each read against what its page says. Two were corrected
  for truth, not length: the Rocket Money page promised "no Plaid" (optional bank links
  through Plaid are planned and their code exists), now "No bank login required"; a draft
  hub description promised help checking that charges stopped, which the guide pages do
  not give, so it says what they do (cancel before the next charge).
- The 509 guide descriptions come from `guideDescription()`: the longest honest wording
  that fits, so every guide is 143 to 160 characters (measured over the catalogue first).
- `lib/structured-data.ts`: one Organization and one WebSite with stable ids on every
  page (the logo is now the square app icon, not the wide banner); the homepage adds the
  app as a FinanceApplication with the five visible prices, each a pre-order (it is not
  released); posts and the blog reference the Organization by id; the blog index is a
  Blog with an ItemList. No rating, no review, no invented date.
- `/blog/feed.xml` (RSS, static, real dates) advertised on `/blog`; `public/llms.txt`.
- Sitemap lastmod: 2026-10-05, the day every page's title and description changed.

**Held by tests:** `app/seo.test.tsx` checks every page, all 509 guides and every post
against those limits, the schema prices against the visible bill, the feed against the
posts, and `llms.txt` against the sitemap, the catalogue size and the prices (and for
the banned claims). Bite-checked: a Twitter card without its title, a generic alt, a
161-character description, a guide over 160, a schema price that differs, and a wrong
count in `llms.txt` each fail it. Then a production build served locally and the same
audit script over all 533 sitemap URLs: 532 pass every check; the 533rd is the homepage's
canonical written without its trailing slash, the same URL.

**A coverage side effect, measured:** moving the guide wording into `lib/` (outside the
website suite's coverage scope) took covered branches with it, and branch coverage fell
to 88.44 %, under its 88.47 % floor. What was left uncovered on the guide page were
`?? ""` fallbacks on CSS-module class names, which always exist; the badge lookup now
has none (same class names rendered): 88.97 %. The floors stay where P4 pinned them
(the auto-ratchet's higher values were reverted: those floors drifted between runs).

**Not done here, and why:** the playbook's four landing pages (subscription tracker,
cancel subscriptions, free-trial reminders, budgeting) need about 3,000 words of new copy
written against what the app really does; they are the next SEO step. The launch-week
items (indexing requests, profiles, directories) are the owner's, in OWNER_ACTIONS.md.

### SEO: the four landing pages — 2026-10-05

The playbook's money pages (SEO.md §5.1, §6.1), one buying intent each:
`/subscription-tracker`, `/cancel-subscriptions`, `/free-trial-reminders`, `/budgeting`.
Copy is data (`lib/landings.ts`), rendered by one component (`LandingPage.tsx`), so the
visible FAQ and its FAQPage schema are the same text.

**Every claim was read in the code before it was written** (the list is at the top of
`landings.ts`): the 7/3/day-of renewal reminders; the trial reminders two days before,
the day before and on the day, and a tap on one opening that subscription's cancel flow;
Gmail read-only, more than one account; App Store and Play receipts named by app;
"pending" until the renewal passes clean, flagged if a charge appears; the free monthly
cap with the forecast and recap, category budgets and envelopes on Pro; the prices.
Claims dropped after checking: a yearly total (the app shows none), trials found by an
email scan (the scanner does not detect them, so the page says you add them), and "watches
your receipts" (it reads only what you scan or import). Competitors are named only with
what the site already states (Monarch connects to bank accounts; YNAB is $109 a year).

**Held by `app/landings.test.tsx`:** 700 to 1,000 words each (measured 717 to 744); no
paragraph shared with another landing page, the homepage FAQ or any post; no exclamation
mark, no em dash, no stock phrase ("seamless", "unlock", "whether you're" and the like),
none of the banned claims; every plan price exact; FAQ schema equal to the visible FAQ;
one h1; links only to pages in the sitemap. `seo.test.tsx` covers their titles and
descriptions with the other pages.

**Wired in:** sitemap at priority 0.9, a footer link to each (every page links to them),
each blog post's link list leads with its landing page, and `llms.txt` lists them.
Checked in Chrome on the production build at desktop and phone width: no console error,
no sideways scroll. The FAQ questions first rendered in body type, indistinguishable
from their answers; they now have their own heading style (`.faqQ`).


### P6.2 — the sign-in routes' survivors — 2026-10-05

`routes/auth.ts`, 931 mutants: 81.31 % to **84.53 %** (782 killed, 5 timed out, 139
survived, 5 no coverage). No code changed: every gap was a test that did not exist. Each
fix was checked by putting the mutation back by hand (21 mutations, 21 caught).

- **F208, F209, F210** (see the findings): one account's revocation reaching everyone,
  the email-bombing limit, and the sweep deleting live sessions.
- **Token expiry at the exact second**, for our own access tokens (`auth-expiry.test.ts`:
  valid at 14:59, refused at 15:00) and for Apple and Google tokens. Every expired-token
  test was minutes past expiry, so `>` and `>=` looked the same.
- **The providers' key lists:** the cache test ran inside the 30-second refresh cooldown,
  which hid mutants that re-fetched Apple's or Google's keys on EVERY sign-in (the abuse
  F83 closed). Past the cooldown, a known key now costs no request, and a key the
  provider really rotated in is picked up with one request and the sign-in succeeds. These
  two use Google's key list: the fetch times are module state, and moving the clock on
  Apple's broke the existing outage test.
- **Why a social sign-in failed:** each refusal's logged reason is checked (the server log
  is the operator's only clue). One expectation was wrong and the code right: an
  "alg none" token has no signature part, so the shape check refuses it first.

What survives in `auth.ts`, read and judged: most are equivalent because the code fails
closed twice (a missing token part makes decoding throw; a missing audience or nonce
fails a later check), millisecond boundaries on record expiry, error messages of paths
that are themselves tested, and leaks a sweep would reclaim that no API shows. Two worth
a later test: restoring pending sign-in links after a restart (the hydrators), and
account deletion reporting success when only some of its deletes landed (`every`).


### P6.2 — the rest of the API, and its floor — 2026-10-05

Two more batches, each survivor read in the code first; every fix put back by hand (19
mutations, 19 caught).

| Batch | Mutants | Before | After |
|---|---|---|---|
| coach, storage, startup | 612 | 88.71 % | 92.80 % (startup 100 %) |
| the main routes (`app.ts`) | 716 | 82.26 % | 83.52 % |

- **The main routes:** F211 (household spend); an error that carries a 5xx status (500
  included) was answerable as a client error with no log and no alert, now tested at 500,
  503 and 499; the local-development CORS origin anchored at its start; `TRUST_PROXY_HOPS`
  whole numbers only ("1.5" and "-1" fall back); the second open-banking provider by name
  (the intent route uses the built-in mock adapter: no call reaches Plaid).
- **The coach:** the fallback charter (the coach's whole safety posture when its file is
  missing) pinned word for word, where four phrases had been checked; a reply whose only
  `}` comes before its `{` is "no JSON".
- **Storage:** previous encryption keys written as "k1, k2" (with spaces, and an empty
  entry) still open old rows; 64 hex characters plus anything more is a malformed key;
  the stored key id is an 8-character fingerprint.
- **Startup:** the 10-minute sweep as a literal (the test compared against the code's own
  constant), the signal that started each shutdown in the log, the single-instance
  warning's words, the returned handle, and the real `clearTimeout`.

**A mistake of mine, caught by Stryker:** one new test file did not parse (a `"\n"` written
as a real line break by the editing script). My check grepped for failing tests and
assertion errors, and a file that fails to parse shows neither, only `Test Files 1
failed`; so I reported it passing and two hand bite-checks against it were false. Stryker's
dry run refused the file. Fixed, the whole logic run re-read in full (75 files, 894 tests),
and both bite-checks redone: both caught. The rule now is to read the `Test Files` line.

**The API's score and floor:** 88.95 % over all four batches (2,752 of 3,094 mutants
caught: 800, 787, 567 and 598 of 836, 931, 611 and 716). `break: 88` in
`stryker.api.config.mjs`, just under it, raised only. A whole run is about 20 minutes at
10 workers here. What survives is mostly response wording that is not a promise (the
capabilities list, provider descriptions), equivalent fail-closed paths, and storage
bookkeeping no API can observe.

**Next: P6.3**, the app's logic (`apps/mobile/src`): its four zone-switching tests need the
same `itZone` care first.


### P6.3 — the app's logic under Stryker: set up, measured, the first fixes — 2026-10-05

`stryker.mobile.config.mjs` mutates `apps/mobile/src` except the tests, test helpers, the
React Native components and the four modules only jest can load (the same ones
`vitest.config.ts` leaves out of its coverage). The app's logic tests joined the mutation
test set (`vitest.mutation.config.ts`).

**The zone tests first:** nine tests in six files switch the time zone mid-test (a
`describe` with a New York `beforeAll`, `inTimeZone(...)` helpers, `it.each` over zones).
Each is now `itZone`/`describeZone`, skipped only when Stryker runs it. Checked both ways:
a normal run runs all 1,073 (none skipped); a run as Stryker starts it (UTC, the Stryker
flag, worker threads) passes 1,047 and skips exactly 26.

| Batch | Mutants | Score |
|---|---|---|
| security, sign-in, API client, storage, billing, config | 1,613 | 88.53 % |
| discovery, budget, FX, insights, notifications, widgets, data | 2,564 | 82.80 % |
| utilities, theme, crash reporting | 1,021 | 87.07 % |

**Fixed so far (F212, F213):** the sign-in store's six failure paths and its refresh timer;
the crash-report scrubbers. 11 sign-in and 9 scrubber mutations put back by hand, all
caught. Two timer stops are equivalent (a failed new sign-in can't have a timer running:
a signed-in phone refuses a new link before reaching them).

**Next in P6.3:** the Gmail scanner (`emailScanner.ts`, 68.98 %, 224 survivors), the CSV
statement parser (80.69 %), insights (91.32 %); the demo seed data and the theme's colour
tables (no behaviour) get Stryker's disable comment with a reason; then the app's floor.


### P6.3 — done: the app's logic at 89.74 %, and its floor — 2026-10-05

After the sign-in store and the crash-report scrubbers (above), each survivor read in the
code before it was judged:

- **The Gmail scanner** (68.98 % to 83.66 %): amounts in every form a receipt writes them
  (€10,99, ₹1,299, "USD 12.99", "12.99 EUR", "1.299,00 EUR", "Total: 7.50", "payment of
  3", "€2.500"), and a whole number before a code ("2026 USD") is not an amount; the
  charge date in five formats, an impossible day skipped for the next real one (F21); the
  known-sender list unique and well formed, a subdomain counting as its sender. The list
  is NOT required to map to the catalogue: 8 of its 91 entries are payment processors
  (Stripe, PayPal, Paddle, …) that bill for many services, 4 bill under another domain.
- **The CSV statement parser:** which bank layout a file is read as (Wells Fargo, Citi,
  Generic), columns found by name in any order, a positive debit or a negative amount
  is a charge (a zero debit and a positive amount are not), each cycle's day window at
  both edges and one day outside, charges out of order read in date order, one charge
  or two far-apart amounts are not a plan, and every card-descriptor prefix cleaned.
- **Exchange rates (F214)** and **quiet hours:** both edges of a daytime and an
  overnight window, and a day-of reminder that a wrapping window would push past midnight
  stays at 9 AM on the renewal day.
- **Marked, not tested** (Stryker's disable comment, each with its reason): the demo's
  sample subscriptions, the two colour schemes' values, and the retired per-generation
  theme fields nothing reads (checked by search).

| Batch | Mutants | First | Now |
|---|---|---|---|
| security, sign-in, API client, storage, billing, config | 1,602 | 88.53 % | 89.51 % |
| discovery, budget, FX, insights, notifications, widgets, data | 2,514 | 82.80 % | 89.30 % |
| utilities, theme, crash reporting | 972 | 87.07 % | 91.26 % |

**The floor:** `break: 89` in `stryker.mobile.config.mjs`, under the measured 89.74 %
(4,566 of 5,088 caught). Three batches take about 4 minutes at 10 workers here. Every new
test file was read by its `Test Files` line; one did not load at first (it imported the
reminder module without the native stubs the other reminder tests use) and was fixed
before anything was counted.

**Next: P6.4**, property-based tests with fast-check: money math, UTC date math across
DST and leap days, the parsers (never throw, never over-match), the catalogue, sync.


### P6.4 — property-based tests (fast-check) — 2026-10-05

`fast-check` is now a root dev dependency (it was declared only by the API, and used
undeclared by the app's tests). Each property runs 100 to 500 generated cases and shrinks
a failure to its smallest example.

| File | What holds for every generated input |
|---|---|
| `packages/shared/src/properties.test.ts` | conversion: whole minor units, never negative, the amount itself within one currency, null (never a made-up number) when a rate is missing, order kept; `monthlyAmount` per cycle in range; a summary's total is its categories' sum, largest first, and every subscription is counted or excluded; `parseAmountMinor` reads back any statement-style amount (sign, symbol or code, thousands commas) and never throws; `parseCsvRows` returns any simple table exactly and never throws; the store-app name extractor never throws and only returns words from its text |
| `apps/mobile/src/properties.test.ts` | the next renewal: weekly exactly 7 days, monthly/quarterly/annual on the same day or the month's last, at the same time, always later; rolling a renewal forward: never in the past, idempotent, a renewal still ahead untouched, monthly-type plans on their anchor day; `parseCSV` and `parseEmailBody` never throw and never produce a charge that isn't a positive finite amount |
| `apps/api/src/sync.properties.test.ts` | against a written-out model: per entity the highest version wins, a tie goes to the later push; a full paged pull returns each entity once with a cursor that never goes back; pushing a batch again changes nothing; an older version is refused and says so; one user's changes never reach another |
| `packages/service-catalog/src/properties.test.ts` | search never throws, returns at most its limit, never a service twice; each of the 509 names, in either case, finds that name first |

The catalogue's per-entry invariants already run over all 509 entries (exhaustive, not
sampled), so they were kept as they are.

**Checked that they bite**, not only that they pass: conversion without rounding, an
excluded subscription not counted, a month end not clamped, a weekly roll that stops
short, ties keeping the old change, a pull that repeats its cursor record, an older
version accepted: each fails. Two of these first PASSED: the generated rate tables always
had every currency (so nothing was ever excluded), and month ends came up only a few times
in a hundred uniform dates. Rates are now optional there, and a third of the dates are
month ends; both breaks then failed on three repeat runs. The date properties also pass in
Kiritimati (UTC+14) and Los Angeles.

**Next: P6.5**, the floors in CI: the mutation runs nightly, and on pull requests for the
files they change.


### P6.5 — the mutation floors in CI — 2026-10-05

`.github/workflows/mutation.yml`:
- **Nightly (02:47 UTC) and on demand:** the shared packages, the API and the app's logic
  as three parallel jobs, each `npx stryker run <its config>`; the config's `break` fails
  the job below its floor (92 %, 88 %, 89 %, P6.1-P6.3). Each job writes its per-file
  table to the job summary (`scripts/mutation-score.mjs`, Stryker's own formula; checked
  against Stryker's figure on a real report, 88.24 % both) and keeps the report 14 days.
- **Pull requests that change source** in those three trees: only the changed files
  (added or modified, tests and helpers left out) are mutated, per suite, through
  `stryker.pr.config.mjs`, and the score goes in the summary. **Not enforced:** a floor
  is a whole-suite measure, and a single file can sit under it while its suite is above
  (the API's `app.ts` is 83.52 % inside an 88.95 % API), so a per-file floor would fail
  honest pull requests; the nightly run enforces the suites. Checked locally: one file at
  88.24 % (under the shared floor of 92 %) exits 0 in this mode; an unknown suite name
  stops with its reason; the changed-file lists over the last four commits came out right
  (only the app had changed source).

Runner time, estimated from this machine (12 cores, 10 workers: 9, about 20 and 4
minutes): GitHub's 4-core runner takes roughly three times as long, so the API job has a
150-minute limit. The first nightly run's real times and scores are the check on that.

**P6 gate** (the floor in CI, green on GitHub): met once the first nightly mutation run is
green; until then P6 stays open in the tree above.


**F215, found by the new property tests on CI (2026-10-05).** The push of P6.4 went red on
GitHub: `parseAmountMinor` read "-0.00" as minus zero, where the property expected zero.
Locally the property had passed: its random draws never paired a zero amount with a minus
sign. Read in the code, the cause is the last line negating every amount; it now negates
only a non-zero one. The failing case is pinned two ways: the property always tries it
first (fast-check's `examples`), and a plain test covers five spellings of a signed zero.
Both fail on the old line and pass on the new. This is what P6.4 is for: an example test
asks about the cases its author thought of, a property asks about all of them.


### P7.1 — the threat model — 2026-10-05

`docs/THREAT_MODEL.md`. Read in the code that day, not taken from older docs: which API
routes the app calls (it never calls sync, the public-API key preview, the business
summary or the open-banking intents), where the push token goes (the keychain only),
where email content goes (Google to the phone only), which outside services each part
talks to. Then STRIDE for the phone, the API, the database, the website and the outside
services, and a row for every one of the 40 routes (access, limit, whether the app calls
it, the main threat). Every mitigation names a test file, CI job or config line; a
script checked that each of the 37 files cited exists (the 37th, the October audit, is
P7.4's). Claims checked in the code before they were written: every SQL statement is
parameterised or fixed text; readiness answers status only; sign-in codes allow 10
failures per address per 24 hours; the privacy policy names the AI provider.

**What it turned up that no finding had said:** four route groups have no caller in the
app (section 5), which is surface without a user (an owner decision for P7.4); there is
no audit trail of user actions (repudiation, partial); the waitlist has no rate limit of
its own. Each is carried into the open list, with the open findings F3, F7, F8, F11, F14,
F77, F90 and F161, the database's expiry and restore drill, edge rate limiting and iOS.


### P7.2 — ASVS 5.0 checklist: built, and the first half assessed — 2026-10-05

**The source:** OWASP ASVS 5.0.0 as published in the OWASP/ASVS repository
(`5.0/docs_en/…flat.json`, CC BY-SA 4.0), vendored as `docs/asvs/asvs-5.0.0-en.flat.json`:
345 requirements, 253 at Level 1 or 2. `docs/ASVS_CHECKLIST.md` is generated from it and
`docs/asvs/assessment.json` by `scripts/asvs-checklist.mjs`, so the requirement text is
OWASP's, never retyped. `scripts/asvs-checklist.test.ts` holds it: statuses only Met,
Partial, Open, N/A (never "believed"); open and partial name an owner; met names evidence;
every cited file exists; the file on disk is current; a bad entry is refused (tested).

**The documentation ASVS asks for** (V6.1, V7.1, V8.1): `docs/AUTH_AND_SESSIONS.md`, the
sign-in pathways, session lifetimes and authorisation rules, written from the code and
each rule tied to its test. Facts checked on the way: accounts are namespaced per provider
(an Apple or Google email never selects an account); the 10-wrong-codes limit leaves the
sign-in link working (so it can't be used to lock a user out; tested, F80); sessions are
not capped per account; there is no absolute session lifetime.

**Assessed so far (118 of 253):** V4.3, V4.4 (no GraphQL or WebSockets), V5 (no files),
V6 Authentication, V7 Sessions, V8 Authorisation, V9 Tokens, V10 OAuth/OIDC (as a client
and resource server; Zeno is not an authorisation server), V17 (no WebRTC). 51 met, 3
partial, 4 open, 60 not applicable. Tests added to back rows that had none: a refresh token
works until 30 days and is refused at 30 days (V7.3.1); an Apple token is refused on the
Google route and the reverse (V10.2.2); a household member's write lands only on their own
line whatever the body says (V8.2.3). And F216 (nbf), fixed.

**Owner decisions it surfaced** (open): a second factor (V6.3.3); an absolute session
lifetime (V7.3.2); an operator tool to end a user's sessions (V7.4.5); a list of a user's
sessions (V7.5.2). **Mine** (partial): an earlier sign-in link stays usable after a newer
one is requested (V6.6.2); signing in again doesn't end the device's previous session on
the server (V7.2.4).

**Next in P7.2:** V1 Encoding, V2 Validation, V3 Web frontend, V4.1-4.2, V11 Cryptography,
V12 TLS, V13 Configuration, V14 Data protection, V15 Secure coding, V16 Logging.

### P7.2 — ASVS 5.0 checklist: every requirement assessed — 2026-10-05

**V1 to V4 and V11 to V16 assessed**, so all 253 Level 1 and 2 requirements now have a
status: 150 met, 79 not applicable, 20 partial, 4 open. Every met row names its evidence
(a test, a CI job, a measurement script or a document written from the code), and every
partial or open row its owner; `scripts/asvs-checklist.test.ts` holds that and that every
cited file exists.

**Documents ASVS asks for, written from the code** (each statement checked against it;
two wrong drafts caught that way: sign-in codes are stored as is, not hashed, and the
API's certificate is Google Trust Services', not Render's own):
`docs/INPUT_VALIDATION.md` (V2.1), `docs/CRYPTOGRAPHY.md` (V11.1: every key, algorithm and
certificate, what each key may and may not be used for, and its lifecycle),
`docs/DATA_AND_LOGGING.md` (V14.1 protection levels; V16.1 the logging inventory),
`docs/COMPONENTS_AND_LOAD.md` (V15.1: remediation time frames, the advisories as of today,
costly functions and their limits).

**Measured, not assumed:** TLS on both live hosts (`scripts/tls-check.mjs`, extended to
offer one suite family at a time): 1.0 and 1.1 refused; on 1.2 only ECDHE with AES-GCM,
every RSA-key-exchange and every CBC suite refused by the server. The production JWT key
read from the owner's key file: RSA 2048.

**Tests added:** TRACE refused without echo, a request with both Content-Length and
Transfer-Encoding refused and the smuggled request never answered, JSON charset on
success and error (all on a real socket, `http-message.test.ts`); exact security header
values; an email address never reaches a log line (a marker address in
`log-hygiene.test.ts`; bite-checked by logging it). **Fixes:** F217 (no-store), F218 (no
redirects on outbound calls), F219 (a repeated query parameter); each test fails with its
fix undone.

**Partials owned by me:** V3.5.3 and V14.2.1 (the email sign-in link is a GET with its
one-time token in the query), V6.6.2 (an older sign-in link stays usable), V7.2.4 (a new
sign-in doesn't end the device's old session), V16.2.1 and V16.3.1 to V16.3.3 (no
security-event log naming the account). **The owner's:** the 3072-bit key swap, Render's
login and log retention, Postgres's unverified certificate and owner role, an outbound
firewall (P8), and the decisions in `OWNER_ACTIONS.md` D17.

**Next:** the partials owned by me, then P7.3 (MASVS refresh) and P7.4 (the audit report).

### P7.2 — my partials: four closed — 2026-10-05

F220 (only the newest sign-in link works), F221 (a new sign-in revokes the device's old
session on the server), F222 (sign-in links are used up by POST, token in the body, the
GET removed). ASVS V3.5.3, V6.6.2, V7.2.4 and V14.2.1 move to met: 154 met, 16 partial,
4 open. Each fix bite-checked (its test fails with the fix undone). Left of mine: a
security-event log naming the account, the method and the outcome (V16.2.1, V16.3.1 to
V16.3.3).

**CodeQL red on `3c3c9a3` (read on GitHub, 2026-10-05):** js/incomplete-sanitization in
`scripts/asvs-checklist.mjs` (added in `c80a9a3`): the Markdown cell escaper wrote `|` as
`\|` without handling a backslash before it, so a note ending in a backslash could have
broken the table. Escaping backslashes too would have doubled OWASP's own Markdown
escapes (`\*`, `\_`), so `|` is now written as the entity `&#124;`, which no backslash
undoes; the generated file is byte-identical. A test pins it (bite-checked: it fails with
the old escaper). I had read CI as green from the CI workflow alone; the CodeQL run is a
separate workflow and is read with it from now on.

### P7.2 — the security-event log; P7.2 done — 2026-10-05

Every sign-in (with its method), refresh, sign-out and sign-in email request, and every
request refused with 400, 401, 403 or 429, now writes a `"security event"` log line of
its own: event, outcome, route, status, and the account when known (the pseudonymous
`acct_` id, never the email), beside pino's UTC time, request id and client IP
(`apps/api/src/security-events.ts`; the sign-in routes record the account they signed
in). `security-events.test.ts` runs it under the production logger options and checks
the exact events of a real sign-in, a failed one, a refresh, a sign-out, a 400, a 401
and a 429, and that the email never appears; bite-checked twice (no hook: both flows
fail; no account recorded: the sign-in flow fails). ASVS V16.2.1 and V16.3.1 to V16.3.3
are met: 158 met, 12 partial, 4 open, and no partial or open item is mine.

**P7.2 is done.** Next: P7.3 (MASVS refresh), P7.4 (audit report and residual-risk
register), then the P7 gate.

### P7.3 — MASVS checklist: every row points at its tests — 2026-10-05

`docs/MASVS_CHECKLIST.md` now has a Tests column: for each of the 24 MASVS v2.1.0
controls, the tests that hold it, by file and exact test name (41 in all), beside what was
seen on the device in P3. Updated for P4 to P7.2: the sign-in fixes F220 to F222 (AUTH-1),
the TLS measurement (NETWORK-1), the 4 allowlisted advisories and the remediation time
frames (CODE-3), mutation testing of the app's logic, the crypto inventory. No status
changed. Wording corrected on the way: `OWNER_ACTIONS.md` D12 holds my recommendations,
not the owner's decisions, so each such row says "D12 recommends …; the owner decides".

`scripts/masvs-checklist.test.ts` keeps it true: every quoted test name must exist in the
code word for word, and every cited file must exist. Bite-checked: renaming one quoted
test and one cited path in the document fails both checks.

**Next:** P7.4, the audit report and residual-risk register, then the P7 gate.

### P7.4 — the October audit and its residual-risk register — 2026-10-05

`docs/SECURITY_AUDIT_2026-10.md` replaces July's (which now says it is superseded). It
states the verdict (ready to soft-launch on Android once the owner's "before launch"
items are done; no defect in the code open above Low), what stands behind it (each check
read on GitHub, with the one not yet run named: the first nightly mutation run), the
results against ASVS (158 / 79 / 12 / 4) and MASVS (11 met, 7 partial, 5 not met, 1 N/A;
counted from the checklist), what changed since July, what the audit does not cover (iOS,
an external penetration test, the hosts' own controls, Sentry and RevenueCat in a release
build, legal review), and a register of 31 residual risks, each with severity, owner,
target date and source. The finding count was read row by row (220 recorded; 21 not
closed, all in the register; F6 a working rule): a keyword count over-counted, because
fixed rows keep their struck-through "OPEN" text.

Cross-checked on the way: the threat model's list of threats handed to the register had
one item I'd left out (an audit trail of user changes, now R31). `scripts/security-audit.test.ts`
holds the register: numbered without gaps, every risk with a severity, an owner and a date
or event, every cited finding in this log, every finding the threat model hands over
present, every cited document existing. Bite-checked: a row without an owner and a
dropped F14 each fail.

### P8 — my part: runbooks, uptime check, disclosure contact, DNS measured — 2026-10-05

**Measured first (read-only):** `zenoapp.in` has no CAA record (any CA may issue), no
DNSSEC, DMARC at `p=quarantine` with reports to GoDaddy, Resend's DKIM and SPF on the
sending subdomain in place, and **no MX record** (F223): every contact address the site,
the policies and the app give out bounces. The owner's steps for each are in
`OWNER_ACTIONS.md` §1.

**Key rotation, corrected.** Writing the runbook, I checked my earlier note that swapping
the JWT key "logs no one out": true, but the app refreshes on a 14-minute timer, not on a
401, so every request in the next ~15 minutes would have been refused. The API now
accepts the previous public key while `JWT_PUBLIC_KEY_PREVIOUS` is set
(`auth-key-rotation.test.ts`: the previous key verifies, a stranger's doesn't; bite-checked),
and the owner's step and `CRYPTOGRAPHY.md` say to use it.

**Added:** `docs/RUNBOOKS.md` (six procedures); `/.well-known/security.txt` (RFC 9116;
Expires 180 days after each deploy; tested, and fetched from the production build:
200, text/plain); `SECURITY.md`'s reporting section on the real domain, without a
response-time promise (that is the owner's to make); an uptime workflow running
`scripts/uptime-check.mjs` every 15 minutes (200, "ready", every check "ok", one retry for
a cold start; 5 tests against a local server, bite-checked; run once against production:
UP), off until the owner sets `UPTIME_CHECKS=on`, because each check spends free Render
hours.

### P8.2 corrected; the P6 gate is waiting on GitHub's scheduler — 2026-10-06

Read on GitHub at 05:22 UTC: the uptime workflow's 15-minute schedule fired **twice in
about 11 hours** (both skipped, as designed while off), and the nightly fuzz and DAST
runs land 6 to 7 hours after their slots (03:17 slot, run at 10:34). GitHub's schedule is
best-effort, so it cannot be an alert. The runbook (§6) and the owner action now say: the
alert is an outside monitor on `/api/v1/health/ready`; the workflow stays as a manual
check and backstop.

The same delay holds the **P6 gate**: the mutation workflow is registered and active,
but its 02:47 slot had produced no run by 05:22. Expected late this morning, going by
the other nightlies; read it then. (Running it by hand needs the owner's GitHub login.)

**CI red on `fb92d50`, read on GitHub (2026-10-06):** the blocking dependency audit
stopped on a high advisory published overnight, GHSA-68fv-2mgg-jv7q in `source-map-js`
1.2.1 (event-loop denial of service from crafted source-map offsets), reached through
postcss and Tailwind (the website's build) and Vitest's coverage. The gate worked as
designed: nothing deployed with it. 1.2.2 fixes it; checked before taking it: the same
sole maintainer as 1.2.1, the project's own repository, published 2026-09-30 (security
fixes are exempt from the 7-day cooldown). Updated in the lockfile only (one package,
integrity matching the registry); audit gate PASS and every gate green locally. Fixed
before the next deploy, as `docs/COMPONENTS_AND_LOAD.md` requires for high advisories.

### P8.9 — the Play data-safety draft, from the code — 2026-10-06

`docs/STORE_DATA_SAFETY.md`: every kind of data the release build sends off the phone,
where it goes and the file that sends it, then a draft answer per Play data type
(collected, shared, optional, purpose). Read from the code, not assumed: Plaid is
development-only (`__DEV__`), the product events carry no identifier and the server keeps
only counters, Sentry is inert without a build-time DSN (none set), Gmail content never
reaches our API. Open for the owner: each SDK vendor's own guidance, whether the
anonymous product events need a setting, a web link for deletion requests (none exists,
and its address needs F223's mail), the IP addresses in request logs, and the iOS
privacy manifest, which is not configured and can't be produced or checked without an
iOS build. `scripts/store-data-safety.test.ts` fails if the app gains a product event the
draft doesn't name, if bank connection reaches release builds, or if a cited file goes
(bite-checked with an added event).


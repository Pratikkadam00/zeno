# Zeno — Production Hardening Plan (2026-09-30)

Owner's ask: *"every single line tested properly; security that is not easily hackable;
no leaks; production-level."* This plan turns that into measurable gates. Every number
in §1 was measured on `main` at `98245e2` with the commands shown; nothing is estimated.

Companion docs: `SECURITY_AUDIT_2026-07.md` (last audit), `SECURITY_ARCHITECTURE.md`,
`REMAINING_PLAN.md` (owner blockers A1/A3/A7), `ENGINEERING_STANDARDS.md` (binding).

---

## 0. What "done" means — the bar, in checkable terms

"Unhackable" is not a state software reaches. The credible bar, and what this plan
delivers evidence for, is:

| Surface | Standard | Level |
|---|---|---|
| API (Fastify) + website (Next) | OWASP ASVS 4.0 | **L2** (all L1 + L2 controls, each with a test or config line as evidence) |
| Mobile (Expo / React Native) | OWASP MASVS 2.x | **L2 + R** (resilience controls where feasible without native code) |
| Supply chain + CI | SLSA-style hygiene | pinned actions, least-privilege tokens, secret scanning, SAST, SBOM |
| Tests | "every line tested properly" | defined in four tiers below; each tier has a floor that only ratchets up |

**"Every line tested properly" — four tiers, each with its own gate:**

- **Tier 1 — Logic** (`packages/*`, `apps/api/src`, `apps/mobile/src`, `apps/web/lib`,
  `scripts`): **100 % statements / lines / functions, ≥ 95 % branches** under vitest.
  Any `v8 ignore` must carry a reason comment (a test greps for bare ignores and fails).
- **Tier 2 — UI components and screens** (29 mobile screens + components; 29 web pages +
  21 components): component tests that render each screen in its real states (data /
  empty / loading / error), press every interactive element and assert what it does,
  and check the a11y tree. Coverage measured by the jest project (mobile) and a new
  jsdom vitest project (web), each with a ratcheting floor to 100 % lines.
- **Tier 3 — Flows** (end to end): Playwright for the site; Maestro on the emulator for
  the app (release-APK loop); real-Postgres integration tests for every API route.
- **Tier 4 — Proof the tests bite**: mutation testing (Stryker) with a mutation-score
  floor ≥ 85 % on Tier 1, and property-based tests (fast-check) for money, dates,
  parsers, and the catalog. Coverage says a line ran; mutation says a bug there fails.

---

## 1. Measured baseline (main @ 98245e2)

**Code size** (non-test `.ts/.tsx`, `find … | xargs wc -l`):

| Surface | Files | Lines |
|---|---:|---:|
| `apps/api/src` | 13 | 3,270 |
| `apps/web` (app + components + lib) | 54 | 5,427 |
| `apps/mobile/app` (screens) | 29 | 8,660 |
| `apps/mobile/src` | 66 | 8,890 |
| `packages/shared/src` | 20 | 1,792 |
| `packages/service-catalog/src` | 2 | 1,096 |
| `scripts` | 2 | 110 |
| **Total** | **186** | **≈ 29,245** |

**Tests today:** vitest 550 tests in 60 files; jest-expo 22 tests in 2 files;
end-to-end **0** (Playwright / Maestro / Detox absent).

**Coverage — Tier 1 scope only** (`npx vitest run --coverage`, 90 files in scope):

| | Now | Target |
|---|---:|---:|
| Lines | 63.55 % (2,501 / 3,935) | 100 % |
| Statements | 62.86 % | 100 % |
| Functions | 63.01 % | 100 % |
| Branches | 55.95 % | ≥ 95 % |

- 30 files at 100 %; **26 files at 0 %** (never executed by any test); 8 files at 1–59 %.
- Largest untested logic: `apps/mobile/src/data/subscription-store.tsx` (225 lines, 0 %),
  `packages/service-catalog/src/services.ts` (100, 0 %), `budget-store.tsx` (50, 0 %),
  `security/LockOverlay.tsx` (39, 0 %), `apps/api/src/server.ts` (36, 0 %).
- Security-relevant and under-tested: `discovery/emailScanner.ts` **48 %** (260 lines —
  it parses untrusted email content), `auth/authStore.ts` 51 %, `security/lock-store.ts`
  48 %, `billing/revenueCat.ts` 55 %, `storage/database.ts` 59 %, `apps/api/src/plaid.ts`
  21 % (dev-only by standing instruction).
- **Out of scope today** (no automated behavioural coverage beyond 22 RN tests, the
  build, and manual browser/emulator passes): every mobile screen and component, every
  web page and component — **≈ 14,000 lines**.
- Config defect: `apps/web/.next/**/types/validator.ts` (two generated files) are counted
  in the scope. Fix in P0.

**API:** 40 routes (`grep -rhoE "\.(get|post|…)\("`). Fastify 5 with `@fastify/helmet`,
`@fastify/cors`, `@fastify/rate-limit` (14 rate-limit sites), zod, `pg`; RS256 JWT with
`jti`, refresh rotation with reuse detection, magic-link tokens hashed with SHA-256,
`timingSafeEqual` on webhook auth, pino `redact` list in `server.ts`; 0 raw SQL strings.
**Gap:** the route tests use the in-memory storage in `storage/pg.ts` — **no test has
ever run against a real Postgres** (migrations, constraints, cascades, concurrency).

**CI (`ci.yml`, `release.yml`):** typecheck, lint, vitest, RN tests, coverage floor, web
build, audit gate (report-only in CI, blocking in release). **Absent:** secret scanning,
SAST (CodeQL/semgrep), Dependabot/Renovate, SBOM, DAST, E2E; actions pinned by tag
(`@v4`) not SHA; no `permissions:` block (default GITHUB_TOKEN scope).

**Secrets:** current tree clean for common key patterns (`git grep` of 6 patterns);
history pickaxe for `PRIVATE KEY` / `sk_live_` clean across 251 commits. **No full
gitleaks history scan has run yet.**

**Mobile (Android, generated `android/` read at HEAD):** `allowBackup="true"`;
R8 minify **off** (`enableMinifyInReleaseBuilds` defaults false) and `shrinkResources`
off → the release APK ships un-obfuscated; `proguard-rules.pro` is 14 lines. SecureStore
uses `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; local DB is SQLCipher (AES-256); Sentry has
`tracesSampleRate: 0` and a `beforeBreadcrumb` scrub but **no `beforeSend`** scrub;
no release console stripping in `babel.config.js`. PIN: `secure-store.ts` exposes
`setPin/verifyPin/clearPinHash` and `maxPinAttempts` (hashing method and lockout to be
verified in P3, not assumed).

**Web:** CSP, HSTS (preload) and `frame-ancestors 'none'` present in `next.config.ts`;
one API route (`/api/waitlist`). CSP still carries `'unsafe-inline'` for scripts.

**Not checkable from this machine:** GitHub branch protection (`gh` not installed);
Render config; DNS; TLS termination; store consoles.

---

## 2. Phases — order, effort, exit gate

Effort: **S** ≤ half a day · **M** 1–2 days · **L** 3–5 days of focused sessions.
Each phase ends with its gate green **and** committed + pushed; a phase with a known
open defect does not close. Every phase re-runs the standing gates (typecheck, lint,
vitest, RN, coverage floor, web build, audit gate).

### P0 — Foundations: CI hardening, secret scan, coverage scope · **M**
1. Coverage scope: exclude `**/.next/**`; add a test that fails on any bare `v8 ignore`
   (must read `/* v8 ignore … -- reason */`).
2. **gitleaks**: full-history scan locally (`gitleaks git --log-opts=--all`); CI job on
   every push/PR. Any hit → owner rotates the secret; history purge is a separate decision.
3. **SAST**: CodeQL (javascript-typescript) workflow + semgrep CI with `p/owasp-top-ten`,
   `p/nodejs`, `p/typescript`, `p/react`, `p/nextjs`; zero-findings gate with an
   expiring allowlist (same pattern as `.audit-allowlist.json`).
4. Workflow hygiene: SHA-pin every action (`uses: actions/checkout@<sha> # v4`),
   `permissions: contents: read` at workflow level (raise per job only where needed),
   `concurrency` groups, audit gate **blocking in `ci.yml` too**.
5. **Dependabot**: npm (weekly, grouped minor/patch) + github-actions; SBOM (CycloneDX)
   produced on release.
6. Owner: branch protection on `main` (required checks = every CI job, no force-push).
- **Gate:** the four new CI jobs green; gitleaks clean (or findings rotated); coverage
  scope correct; `.github/workflows/*.yml` has no unpinned action.

### P1 — Tier 1 logic to 100 % · **L**
Order by risk: `emailScanner.ts` → `authStore.ts` → `lock-store.ts` → `subscription-store.tsx`
→ `budget-store.tsx` → `storage/database.ts` → `revenueCat.ts` → `services.ts` (catalog:
every entry has a valid URL, difficulty, steps) → `apps/api/src/server.ts` (boot with
`inject` + env matrix) → the remaining 0 % files (theme-provider, notificationHandlers,
subscription-repository, widgetBridge, format, subscription-ui, seed, haptics, motion,
config) → `plaid.ts` (pure parts tested; sandbox flows stay untested by instruction, with
`v8 ignore -- Plaid stays in dev` on those branches only).
- Floors ratchet to 100 / 100 / 100 / 95 and stay there (`autoUpdate` keeps raising).
- **Gate:** `npm run test:coverage` passes at the new floors; zero bare ignores.

### P2 — API against a real database, authorization matrix, fuzzing · **L**
1. **Real Postgres in tests**: PGlite (embedded Postgres) locally + a `services: postgres`
   container in CI. Every storage function and every route runs against it: migrations
   from empty, unique/FK constraints, cascade on `DELETE /api/v1/account` (assert **no
   row for the user remains in any table**), refresh-token rotation race, `sync/push`
   idempotency under concurrent replays.
2. **Authorization matrix** — table-driven from the route list, so a new route without
   an entry fails the suite: each authenticated route × {no token, expired, wrong `aud`/
   `iss`, `alg: none`, HS256-with-public-key confusion, revoked `jti`, another user's
   resource, another household's id}. Expected: 401/403, identical bodies, no timing leak
   on the token path (same code path for unknown vs revoked).
3. **Rate limits** — table-driven per route: window, key (IP vs account), 429 body and
   `Retry-After`; assert the auth and webhook routes are the strictest. Document that
   the app limiter is per-instance and an edge limiter is required (P8, owner).
4. **Fuzzing** — fast-check driven by each zod schema: valid ⇒ expected status; invalid
   ⇒ 400 with a fixed shape; oversized body ⇒ 413; wrong content-type ⇒ 415; keys
   `__proto__`/`constructor` ⇒ rejected; unicode, null bytes, deeply nested JSON.
   200 cases/route in PR CI, 10 000/route nightly.
5. **Error and log hygiene** — every 4xx/5xx body has no stack, no `pg` text, carries a
   request id; a test sends a token in header + body and asserts the pino output has it
   redacted.
6. **Auth flows** — magic link: single use, expiry, enumeration-safe (identical response
   and timing for unknown email), rate-limited; Google/Apple: server-side token
   verification, `ALLOW_UNVERIFIED_OAUTH_TOKENS` impossible when `NODE_ENV=production`
   (extend the existing prod-guard tests: demo login, wildcard CORS, missing JWT keys,
   `http://` URLs all refuse to boot).
7. **Outbound inventory** — every external call (Anthropic/Groq coach, Resend,
   RevenueCat, Plaid, open-banking intents, Google/Apple certs) listed in a test with
   its host allowlist; no user-controlled URL reaches `fetch` (SSRF impossible by
   construction, and tested); timeouts and bounded retries on each.
8. **Webhooks** — RevenueCat: auth constant-time, replay (same event id twice) ignored,
   malformed payload 400, entitlement change idempotent.
- **Gate:** route-inventory test green (every route has authz + rate-limit + fuzz
  entries); real-PG suite green locally and in CI.

### P3 — Mobile hardening (MASVS) + a test for every screen · **L**
1. **Build hardening in `app.config.ts`** via `expo-build-properties` (the `android/`
   folder is generated — never edit it): `enableMinifyInReleaseBuilds: true`,
   `enableShrinkResourcesInReleaseBuilds: true`, `allowBackup: false`,
   `usesCleartextTraffic: false` explicit; ProGuard/R8 keep rules for RN, Hermes, Sentry,
   RevenueCat, expo-sqlite/SQLCipher. Then `expo prebuild` → release APK → verify by
   bytes (`aapt dump badging`, class names obfuscated in the DEX) → **re-run the full
   on-device smoke** (R8 breaks apps silently; the release-APK loop in
   `REMAINING_PLAN.md` is the harness).
2. **Release console stripping** (`babel-plugin-transform-remove-console`, keep
   `error`/`warn`), plus tests that `captureError` paths never carry tokens or emails.
3. **Sentry `beforeSend`** scrub (emails, tokens, auth headers, amounts) with tests;
   `sendDefaultPii` asserted false.
4. **PIN** — read `secure-store.ts`: confirm salt + iteration/derivation, attempt lockout
   with backoff (`maxPinAttempts`), lock on background (done), no PIN in logs/state
   dumps. State the honest threat model: a 4–6 digit PIN is offline-crackable in
   milliseconds if the hash ever leaves the device, so the controls that matter are
   SecureStore device binding + lockout; tests cover both.
5. **Deep links** — every `zeno://` route with parameters validates them (ids resolve or
   404-safe screen), `Linking.openURL` only for `https:`/`mailto:` against an allowlist
   (no open redirect via a `url` param). Tests per route.
6. **No secret in the bundle** — a test asserts `extra` and every `EXPO_PUBLIC_*` name
   is on the public-by-design allowlist (RevenueCat public SDK keys, Google client ids,
   Sentry DSN, site URL) and nothing else.
7. **Screen capture** — `expo-screen-capture` on the lock overlay and PIN entry
   (default); app-wide `FLAG_SECURE` is an owner decision (it also blocks the user's
   own screenshots).
8. **Screen tests (jest-expo + RNTL) for all 29 screens**: renders with seed data,
   empty, loading, error; every pressable does its navigation or mutation (router and
   stores mocked at the boundary); every touchable labelled; reduce-motion path. The
   jest project gets its own coverage floor over `apps/mobile/app/**` and
   `src/components/**`, ratcheting to 100 % lines.
9. **Static scan of the release APK** — MobSF (Docker) if available, else `apkleaks` +
   manifest/permissions review; fix findings.
- **Gate:** hardened release APK verified on the emulator (all flows in
  `DEVICE_TEST_FINDINGS.md` re-passed); jest floor in CI; MASVS checklist with
  evidence per control.

### P4 — Website: component tests, Playwright, headers, DAST · **L**
1. **Component tests** (vitest + jsdom + RTL) for the 21 components and render tests
   for the 29 pages: metadata, JSON-LD validity, breadcrumbs, and the **truthfulness
   rail as a test** (banned phrases never appear in rendered text; required phrasing
   does).
2. **Playwright**: homepage book (pager, keys, wheel, edge-drag, touch swipe; document
   fallback; reduced motion; JS disabled; mobile viewport); theme default paper + toggle
   persistence; waitlist API (validation, rate limit, duplicate); cancel hub + guide;
   compare; legal; 404. On every route: security headers asserted, **zero console
   errors, zero non-localhost requests** (route interception fails the test), axe-core
   clean. Lighthouse CI budgets (LCP, CLS, INP).
3. **CSP**: replace `'unsafe-inline'` for scripts with a hash source for the fixed
   inline theme script (SSG-compatible) and nonces where Next 16 supports them;
   add/verify `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, COOP.
4. **Build-output secret scan** — a test greps the `.next` output for every non-public
   env value and fails if any appears.
5. **DAST**: OWASP ZAP baseline against `next start` + the API in a nightly workflow;
   gate on no medium+ alerts.
- **Gate:** Playwright suite green in CI; CSP without `'unsafe-inline'` scripts (or a
  written reason); axe clean on every route.

### P5 — Mobile end-to-end (Maestro on the emulator) · **M–L**
Flows: onboarding → consent → login gate → continue without account; add (catalog
search + write-in); detail → cancel guide → stamp → done; settings → lock → set PIN →
background → relock → unlock; family create/join code; coach consent; notifications
permission; discover; calendar; analytics; dark mode; TalkBack a11y-tree audit (the
known-good `uiautomator` sequence, scripted). Runs locally on the release-APK loop;
nightly in CI via `reactivecircus/android-emulator-runner`.
- **Gate:** ≥ 12 flows green locally and nightly.

### P6 — Prove the tests bite: mutation + property-based · **M**
Stryker on `packages/*`, `apps/api/src`, `apps/mobile/src` logic with a mutation-score
floor ≥ 85 % (ratcheting); fast-check properties for money math (rounding, currency
minor units), UTC date math (renewal schedules across DST and leap days), the email
and CSV parsers (never throw, never over-match), the catalog (invariants per entry),
and sync (idempotency, vector-clock ordering).
- **Gate:** mutation floor in CI (nightly, PR runs on changed files).

### P7 — Security verification v2 with evidence · **M**
Threat model (data-flow diagram + STRIDE per surface and per route); ASVS L2 checklist
and MASVS L2+R checklist where every control links to its evidence (test name, CI job,
or config line); `SECURITY_AUDIT_2026-10.md` replacing the July audit; residual risks
listed with an owner and a date. The CI jobs from P0–P6 are the living proof.
- **Gate:** no control marked "believed" — each is "tested by …" or "open, owned by …".

### P8 — Infrastructure and operations · **owner-driven, M for me**
Render: Postgres on the private network with TLS, automated backups **and a restore
drill**; secrets only in Render env (never `render.yaml`); JWT key rotation runbook
(`kid` rotation exists); uptime + alerting on `/health/ready`; **edge rate limiting and
WAF** (Cloudflare in front of Render — the app limiter is per-instance); DNS: CAA,
DNSSEC, SPF/DKIM/DMARC `p=reject` on the Resend sending domain (prevents spoofed
"Zeno" mail); branch protection and required checks; Dependabot policy; **third-party
penetration test** (booked with lead time — start now) and the disclosure contact in
`SECURITY.md`; store data-safety forms and the iOS privacy manifest aligned with code.

---

## 3. Owner-side items (cannot be done from this machine)

- A1 domain, A3 keys (also removes `SENTRY_DISABLE_AUTO_UPLOAD`), A7 export filing —
  unchanged from `REMAINING_PLAN.md`.
- Branch protection on `main`; Render/Cloudflare accounts; DNS records; Sentry projects.
- Penetration test vendor + budget; bug-bounty/disclosure decision.
- Decisions: app-wide `FLAG_SECURE`; root/jailbreak detection (MASVS-RESILIENCE, needs
  a native module — recommend **no** for v1, documented); certificate pinning
  (recommend **no** with Expo managed builds; TLS + HSTS + CAA instead, documented).
- iOS: builds and device tests need a Mac. Nothing in this plan verifies iOS at runtime.

## 4. What this plan does not promise

- No software is "unhackable". This plan delivers ASVS L2 / MASVS L2+R **with evidence**,
  automated re-verification on every change, and an external pentest as the check on
  my own work. Residual risk is written down, not hidden.
- Third-party services (RevenueCat, Resend, Anthropic, Google, Apple, Render) are trust
  boundaries: their internals are outside scope; our use of them is inside scope.
- Plaid stays untested end to end (standing instruction). Its routes still get the
  authz, rate-limit and fuzz entries.
- Estimated total: **about 4–6 weeks of focused sessions** for P0–P7, with P8 running
  in parallel on the owner's side. Sequencing is by risk-per-hour: P0 → P1 → P2 → P3
  → P4 → P5 → P6 → P7.

## 5. The gate list (must all be green at the end)

```
npm run typecheck && npm run lint
npx vitest run && npm run test:coverage        # Tier 1 at 100/100/100/95
npm run test:rn                                # mobile screens, jest floor 100 % lines
npm run test:web-ui                            # web components/pages (new)
npm run test:api:pg                            # real-Postgres suite (new)
npx playwright test                            # web E2E, headers, axe, no external requests
maestro test .maestro/                         # mobile E2E on the release APK
npx stryker run                                # mutation floor ≥ 85 %
node scripts/audit-gate.mjs                    # blocking everywhere
gitleaks git --log-opts=--all                  # clean
semgrep ci / CodeQL                            # zero unallowlisted findings
npm run build --workspace @zeno/web            # 509 guides
```

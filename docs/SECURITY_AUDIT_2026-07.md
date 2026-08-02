# Zeno — security & code audit (web + mobile + API)

**Date:** 2026-07-28 · **Scope:** `apps/web`, `apps/mobile`, `apps/api`,
`packages/shared`, `packages/service-catalog` · **Method:** every finding below
was produced by running the command or reading the code cited. Nothing is
inferred from reputation or assumed from a package name.

---

## 1. Automated verification — ALL GREEN

| Check | Command | Result |
|---|---|---|
| Typecheck (all workspaces) | `npm run typecheck` | **clean** (tsc -b + mobile + web) |
| Lint (all workspaces) | `npm run lint` | **clean**, 0 errors 0 warnings |
| Unit/integration tests | `npx vitest run` | **53 files / 498 tests passed** |
| Web production build | `npm run build -w @zeno/web` | **532 pages generated**, compiled OK |
| RN component tests | `npm run test:rn -w @zeno/mobile` | **8 passed** |

No failing tests, no type errors, no lint violations anywhere in the repo.

---

## 2. Application security — findings

### 2.1 Rate limiting — IMPLEMENTED AND WELL DESIGNED ✅

`apps/api/src/app.ts`:
- **Global**: 100 req/min, all routes (`app.register(rateLimit, { max: 100 })`).
- **Per-route tightening** on every expensive/abuse-prone endpoint — verified
  present on: `/events` (60), `/account` DELETE (5), `/open-banking/:provider/intent`
  (20), `/family/create` (10), `/family/join` (10), `/family/:id/spend` (30),
  `/family/:id/leave` (20), `/billing/entitlement` (30), `/billing/webhook` (30),
  all four `/plaid/*` (10–20), `/sync/pull` (60), `/sync/push` (60).
- **Account-keyed limiting for the AI coach** (`limitByAccount(10)`): keyed on
  `req.userId`, not IP, with `hook: "preHandler"` so it runs after the auth guard
  populates `userId`. This is the correct choice — an IP-keyed limit on a paid-LLM
  endpoint is trivially evaded by rotating source IPs.
- **Auth endpoints** (`routes/auth.ts`): magic-link 5/min, verify 10/min, plus a
  separate per-account limit so one IP can't spray many addresses.
- **Distributed correctness**: optional Redis store (`REDIS_URL`) with
  `skipOnError`, so limits hold across replicas instead of multiplying per process.
- **Proxy spoofing**: `resolveTrustProxy()` returns a bounded hop *number*
  (default 1 in production), never `true`. Trusting arbitrary `X-Forwarded-For`
  would let any client forge its own limiter bucket. Correctly avoided.
- Web (`apps/web/app/api/waitlist/route.ts`) has its own in-memory per-IP limiter
  and takes the **last** (not first) `X-Forwarded-For` entry — the correct end of
  the chain; taking the first is a documented past bug and is fixed.

**No gap found.** The only note: the web limiter is in-memory and resets on cold
start — the file itself says a platform/WAF limiter should sit in front. That is
correct and worth doing at deploy time (A10).

### 2.2 Authentication & authorization ✅

- **Fail-closed guard** (`auth-guard.ts`): one `onRequest` hook gates every route;
  only an explicit `PUBLIC_ROUTES` allowlist is exempt (health, metrics, catalog,
  capabilities, partners, open-banking providers, RevenueCat webhook, funnel
  events) plus `/api/v1/auth/*`. Unmatched routes return 404 rather than a
  misleading 401.
- **Identity from the token, never the body** — confirmed in the family schemas:
  `ownerId`/`memberId` are taken from the verified token; the body cannot assert
  identity.
- **Constant-time comparisons** for both the metrics token and the RevenueCat
  webhook secret (`timingSafeEqual`, with length check first) — no timing oracle.
- **Real signature verification** for Apple/Google identity tokens
  (`createVerify(...).verify(publicKey, ...)`), not a decode-and-trust.

### 2.3 Injection ✅

- **SQL**: every query in `storage/pg.ts` is parameterized (`$1`, `$2`). Zero
  string interpolation into SQL — verified by grep for `` sql`${ `` and
  concatenation patterns; only match is a static `CREATE TABLE IF NOT EXISTS`.
- **Command injection**: no `child_process`/`exec` in application code.
- **Dynamic code**: zero `eval(`, `new Function(`, or `innerHTML =` across all
  workspaces.

### 2.4 XSS (web) — reviewed, safe ✅

Four `dangerouslySetInnerHTML` uses, each traced to its source:
1. `app/layout.tsx` — `THEME_SCRIPT`, a hardcoded string constant.
2. `components/site/JsonLd.tsx` — `JSON.stringify(data)` where `data` is built in
   `page.tsx` from the in-repo FAQ list and service catalog.
3. & 4. `components/site/sections.tsx` — FAQ question/answer from
   `faq-data.ts`, a static in-repo module whose only interpolation is
   `${SERVICE_COUNT}` (a computed integer).

**No user input reaches any of them.** Safe as written.
*Hardening note (not a vulnerability today):* `JSON.stringify` does not escape
`<`, so if the JSON-LD data source ever becomes user-influenced, a `</script>`
sequence could break out. Escaping `<` in `JsonLd` would make that structurally
impossible.

### 2.5 Security headers ✅

- **API** (`helmet`): CSP `default-src 'none'`, `frame-ancestors 'none'`,
  `base-uri 'none'`; HSTS; nosniff; `referrerPolicy: no-referrer`;
  `crossOriginResourcePolicy: same-site`.
- **Web** (`next.config.ts`): HSTS (2y, includeSubDomains, preload),
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  disabling camera/microphone/geolocation/browsing-topics, and a strict CSP.
- **CORS**: explicit origin allowlist + dev-localhost helper; **no wildcard**.
  Requests with no `Origin` (mobile/server-to-server) are correctly not treated
  as CORS requests.

### 2.6 Secrets ✅

Repo-wide regex sweep for assigned secret-looking literals (≥16 chars) across
`apps/*/src`, `apps/*/app`, `packages/*/src`: **zero hits**. All credentials are
read from `process.env`. The mobile OAuth setup uses public/native client IDs
with **PKCE and no client secret** — correct for a mobile bundle, and commented
as such.

### 2.7 Mobile platform security ✅

- **PIN**: PBKDF2 via `react-native-quick-crypto` at **600,000 iterations**,
  salted, with `timingSafeEqual` comparison and a **15-minute lockout** after
  repeated failures (`app-lock.ts`).
- **Token storage**: access/refresh tokens, account id and expiry are written to
  **`expo-secure-store`** (Keychain/Keystore), not AsyncStorage.
- **Database**: SQLCipher enabled (`app.config.ts` → `expo-sqlite` with
  `useSQLCipher: true`), so the local DB is encrypted at rest.
- **Export compliance**: `usesNonExemptEncryption: true` is declared honestly
  (owner action A7 tracks the BIS/NSA self-classification filing).

### 2.8 Privacy controls ✅ — notably strong

- **AI-coach consent is enforced before any transmission**: `app/coach.tsx`
  returns early unless `coachAiConsent === "granted"`.
- **Gmail-derived data is excluded from the AI payload** even after consent
  (`source !== "email"` filter), *and* the transmitted total and insights are
  recomputed from that same filtered set so an email-derived amount cannot leak
  through an aggregate. This is a correct implementation of Google API Services
  User Data Policy (Limited Use) and is better than most apps do.
- **Funnel events are anonymous by construction**: `recordFunnelEvent`
  deliberately attaches no auth header even when signed in, so events cannot be
  correlated to an account.
- **Data-layer honesty** (`subscription-hydration.ts`, unit-tested): a corrupt or
  legacy consent value can never be read as `granted`.

---

## 3. Dependency vulnerabilities — THE MAIN FINDING ⚠️

`npm audit --omit=dev`: **23 advisories — 8 high, 13 moderate, 2 low.**
Every one has a fix available.

**Crucially, I verified exploitability rather than trusting severity labels:**

| Package | Installed | Advisory | Reachable **today**? |
|---|---|---|---|
| `find-my-way` (Fastify router) | 9.6.0 | HIGH — DDoS via HTTP/2 | **No** — the API registers no `http2` option; it serves HTTP/1.1 only |
| `next` | 16.2.6 | HIGH — middleware/proxy bypass; Server Actions DoS | **No** — there is no `middleware.ts`, and zero `"use server"` directives exist |
| `sharp` (under `next`) | 0.34.5 | HIGH — libvips CVEs | **No** — `next/image` is not used anywhere; no user-supplied image is processed |
| `fast-uri` (Fastify/Ajv) | 3.1.2 | HIGH — host confusion via backslash/IDN | Parsing path only; no user-controlled URI is authorized on |
| `shell-quote`, `brace-expansion`, `js-yaml`, `@babel/core`, `postcss`, `esbuild`, `@expo/*`, `xcode` | — | DoS / arbitrary file read | **Build/tooling only**, not in either production runtime |

**Assessment: no exploitable path exists in the current configuration.** But this
is a configuration-dependent safety margin, not immunity — adding a
`middleware.ts`, enabling HTTP/2, or using `next/image` would activate a real
high-severity issue immediately.

**Recommendation (do this before launch):** run `npm audit fix`, then re-run the
gates. `fastify`, `next` and `sharp` all have non-breaking fixed releases. This
is the single highest-value security action outstanding.

---

## 4. Bugs found and fixed during this port (for the record)

Both were invisible to the test suite — worth noting because they show where
tests do *not* protect you:

1. **Wrong app icon shipped.** `expo run:android` reuses the gitignored
   `android/` folder and does **not** regenerate native res assets, so the app
   launched with the old icon while every check passed. Fix: `expo prebuild`.
2. **The cancel celebration was never visible.** `handleConfirmedCancel` set the
   success state then immediately fired a toast + `router.replace()`, so the
   confirmation rendered for at most one frame. Fixed to let it stay until dismissed.
3. **Paywall sold a free promise as a paid unlock** — "No bank login, ever" sat
   in the Pro `VALUE_PROPS` list (each row rendering a green check). Moved out.

---

## 5. What this audit did NOT cover — stated plainly

- **No runtime penetration testing.** No fuzzing, no live DoS, no authenticated
  session replay against a running instance. Findings are from code and
  configuration review plus the automated suite.
- **Plaid paths were not exercised** (standing instruction: Plaid stays in dev;
  code retained but untested).
- **No on-device verification.** M3/M4 UI work is verified structurally only —
  see `docs/PORT_STATE.md`. This audit says nothing about visual/runtime
  behaviour on a real device.
- **No third-party/infra review** (Render config, DNS, TLS termination, WAF).

---

## 6. Verdict

**Application code: no vulnerabilities found.** Rate limiting, auth, injection
defence, secret handling, headers, mobile crypto and privacy gating are all
implemented correctly and in several places better than typical (account-keyed
LLM limiting, bounded proxy trust, Gmail-exclusion from AI payloads,
600k-iteration PIN hashing).

**One outstanding action: patch dependencies** (`npm audit fix`). No current
exploit path, but the margin depends on configuration choices that could change.

# Zeno — Security Posture

How Zeno defends each surface (API, mobile app, website), what's enforced in
code today, and what to harden before scaling. Pairs with `COMPLIANCE.md`
(privacy/legal) and `apps/api/src/ai-coach-constitution.md` (AI safety).

Last reviewed: 2026-06-15

---

## Defense in depth — layers

1. **Transport** — HTTPS everywhere; HSTS on the website.
2. **Edge / platform** — (production) put a WAF / platform rate-limiter in front
   (see "Before scale" below). The in-app limiter is the second line, not the only one.
3. **Application** — CORS allowlist, security headers, per-route rate limits,
   schema validation, authn/authz, no secret exposure.
4. **Data** — sensitive financial data encrypted on-device (SQLCipher). Cloud
   sync is disabled at launch; its payloads are stored opaque but are NOT yet
   client-side (end-to-end) encrypted — real E2E encryption is deferred to P6.

---

## API (`apps/api`)

| Control | Status | Where |
|---|---|---|
| **CORS allowlist** (no `*`; explicit origins + dev-localhost only off-prod) | ✅ | `app.ts` `readAllowedOrigins` |
| **Security headers** (HSTS, nosniff, frame-deny, referrer, strict CSP for JSON API) | ✅ | `@fastify/helmet` in `app.ts` |
| **Global rate limit** — 100 req/min/IP | ✅ | `@fastify/rate-limit` |
| **Per-route rate limits** (tighter on expensive/abuse-prone routes) | ✅ | `app.ts` `limit()` |
| **Input validation** — every body/query parsed with zod | ✅ | `parseBody` + per-route schemas |
| **Auth: RS256 JWT**, JWKS verification for Apple/Google | ✅ | `routes/auth.ts` |
| **Auth brute-force limits** — magic-link request 5/min, verify 10/min | ✅ | `routes/auth.ts` |
| **Constant-time** credential compare; tokens stored **hashed** (SHA-256) | ✅ | `routes/auth.ts` |
| **Refresh-token rotation** (single-use, reuse rejected) | ✅ | `routes/auth.ts` |
| **No secrets in logs**; error handler returns generic 500 (no stack leak) | ✅ | `routes/auth.ts`, `app.ts` |
| **Production guards** (unverified OAuth refused, RESEND required, demo login off) | ✅ | `routes/auth.ts` |

**Per-route limits (per IP, per minute):**

| Route | Limit | Why |
|---|---|---|
| `/auth/magic-link`, `/auth/demo-login` | 5 | brute force / email bombing |
| `/auth/verify|apple|google|refresh` | 10 | 6-digit code guessing |
| `/coach` | 10 | calls paid AI provider (Groq/Anthropic) |
| `/plaid/*` | 10–20 | calls paid Plaid upstream |
| `/family/create|join` | 10 | resource creation abuse |
| `/family/:id/spend`, `/billing/entitlement` | 30 | |
| `/sync/pull|push` | 60 | legit multi-device sync is frequent |
| everything else | 100 (global) | |

The AI coach additionally has a **scope-gate + prompt-injection defense**
(constitution system prompt, `<user_data>` untrusted fence, server-enforced
out-of-scope) — see the AI coach constitution.

---

## Mobile app (`apps/mobile`)

| Control | Status |
|---|---|
| **No secrets in the bundle** — OAuth uses PKCE (no client secret); only *public* values in `extra` (API URL, Google client IDs, RevenueCat **publishable** keys) | ✅ |
| Auth tokens in **`expo-secure-store`** (Keychain / Keystore), not AsyncStorage | ✅ |
| App-lock: **biometric + PIN**, PIN stored as a salted KDF hash, lockout after failed attempts | ✅ |
| Subscription data in **encrypted SQLite (SQLCipher)** | ✅ |
| Server is source of truth for entitlements (client can't self-upgrade to Pro) | ✅ |
| Age + consent gate at sign-in | ✅ |

> ⚠️ The Google **client secret was removed** from the app (it was in an
> `EXPO_PUBLIC_` var, which ships in the bundle). Gmail OAuth now uses PKCE with a
> native client. If your Google OAuth client is a *Web* type, switch it to an
> iOS/Android client, or move the token exchange server-side.

**What `EXPO_PUBLIC_*` means:** anything with that prefix is compiled into the app
and is readable by anyone who unpacks it. Only ever put **public** values there.
Real secrets (Groq/Anthropic, Plaid, RevenueCat *secret* key, Resend) live in the
**server** `.env` (gitignored) and are never shipped to the client.

---

## Website (`apps/web`)

| Control | Status |
|---|---|
| **Security headers** (HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, CSP `frame-ancestors/frame-src/object-src/base-uri/form-action` + `img/font/connect-src 'self'`) | ✅ `next.config.ts` |
| **Waitlist API** — per-IP rate limit (5/min), strict email validation, body-parse guard, **masked** logging (never raw email) | ✅ `app/api/waitlist/route.ts` |
| No secrets in client bundle — only `NEXT_PUBLIC_*` is exposed; server env stays server-side | ✅ |

---

## Secrets inventory

| Secret | Lives in | Never in |
|---|---|---|
| `GROQ_API_KEY` / `ANTHROPIC_API_KEY` | API `.env` | client, git |
| `PLAID_SECRET` | API `.env` | client, git |
| `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH` | API `.env` | client, git |
| `RESEND_API_KEY`, `JWT_PRIVATE_KEY` | API `.env` | client, git |
| Google OAuth **client secret** | (not used — PKCE) | anywhere |
| RevenueCat **public** SDK key, Google **client IDs** | client `extra` (public by design) | — |

`.env` is gitignored; `.env.example` documents the keys without values.

---

## Backup & recovery (server Postgres)

**What the server stores.** The Postgres `kv_store` table holds: sync payloads
(opaque blobs — but NOT yet client-side end-to-end encrypted; real E2E is
deferred to P6, and cloud sync is disabled at launch), entitlement cache,
households, auth sessions (refresh tokens + magic links), and AES-256-GCM-sealed
Plaid tokens. The client device's SQLCipher DB is the source of truth for a
user's subscriptions, and no subscription data is uploaded while sync is off.

**Recovery model — the server DB is *disposable*.** If `kv_store` is lost:
- **Sync/subscription data**: no server-side loss of user financial data — the
  device holds the authoritative copy and re-pushes its changes on next sync
  (once sync is enabled in P6).
- **Auth sessions**: users are logged out and re-authenticate via magic link /
  Apple / Google. Annoying, not data loss.
- **Plaid tokens**: users re-link their bank (one tap). Entitlements re-fetch
  from RevenueCat on next check.

So the worst case of a total DB loss is re-auth + re-link, not lost user data.

**Backup cadence (do before onboarding paying users).** Render's free Postgres
plan **auto-deletes at ~90 days** (`render.yaml`), so either move to a paid plan
with automated backups **or** run a scheduled dump:

```sh
# Nightly logical backup (cron / GitHub Action). DATABASE_URL is the Render
# "External Database URL". Store dumps off-Render (S3/GCS) with >=30-day retention.
pg_dump "$DATABASE_URL" --no-owner --format=custom --file "zeno-$(date +%F).dump"

# Restore into a fresh database:
pg_restore --clean --no-owner --dbname "$TARGET_DATABASE_URL" zeno-YYYY-MM-DD.dump
```

**Encryption-key handling on restore.** Restoring `kv_store` only makes sealed
Plaid tokens readable if the matching `STORAGE_ENCRYPTION_KEY` is also restored.
Back up the key alongside (in your secrets manager, **never** in the same store
as the dump). Sealed envelopes carry a non-secret key fingerprint (`kid`), so a
rotated key still opens old rows as long as the previous key is listed in
`STORAGE_ENCRYPTION_KEYS_PREVIOUS` (see key-rotation note in `render.yaml`).

---

## Before scale (production hardening checklist)

The in-code limits are correct but the **state is in-memory**, so it resets per
instance/cold-start and isn't shared across replicas. Before real traffic:

- [x] **Distributed rate limiting** — the limiter reads the real client IP via a
  bounded `trustProxy` hop count (default 1 in prod; `TRUST_PROXY_HOPS` to
  override), and a **shared Redis store activates when `REDIS_URL` is set**
  (`createRateLimitRedis` in `app.ts`, `skipOnError` so a Redis blip fails open
  rather than 500ing). Inert without `REDIS_URL` (per-process default). Remaining
  for hostile-traffic scale: a platform WAF (Cloudflare, Vercel, API gateway) in front.
- [x] **DB-back the in-memory stores** — cloud-sync blobs, entitlements,
  households, and auth sessions (refresh + magic links) are now mirrored to
  Postgres when `DATABASE_URL` is set (`storage/pg.ts`, wired in `render.yaml`)
  and replayed on boot, so a restart/redeploy no longer drops them. **Plaid bank
  tokens** are persisted only when `STORAGE_ENCRYPTION_KEY` is set, and then only
  as an **AES-256-GCM sealed envelope** (`sealValue`/`openValue` in `storage/pg.ts`)
  — never plaintext; without the key they stay in-memory. Still open: (a)
  rate-limit state is still per-instance (see distributed rate limiting above);
  (b) reads are node-local, so cross-replica consistency needs async reads before
  scale-out; (c) the encryption key lives in env — graduate to a KMS/secrets
  manager (see below) for envelope-key rotation.
- [x] **Full website CSP** — the site now ships a complete CSP (`next.config.ts`):
  `default-src 'self'`, `script-src`/`style-src 'self' 'unsafe-inline'` (Next inline
  hydration scripts + Motion inline style attributes), and `img/font/connect-src`,
  `frame-src`, `object-src`, `base-uri`, `form-action`, `frame-ancestors` all locked.
  No `'unsafe-eval'`. **Nonce + `'strict-dynamic'` was tried and rejected:** verified
  locally it blocks the statically-prerendered pages (no per-request nonce on static
  HTML) and making it work forces site-wide dynamic rendering — killing SSG on 500+
  cancel-guide SEO pages — for defense against an XSS sink the audit confirmed doesn't
  exist. Revisit only if a user-content sink is introduced.
- [ ] **Rotate** any key that has ever been shared in plaintext (e.g. chat/logs).
- [ ] **Dependency audit** in CI (`npm audit` / Dependabot) and pin/update.
- [ ] **Secrets manager** for production (not a plaintext `.env` on the box).
- [~] **Monitoring/alerting** — baseline in place: structured request/error logging
  (Fastify), an optional 5xx error-alert webhook (`MONITORING_WEBHOOK_URL`, route +
  message + request id only, no PII), a Prometheus `/metrics` endpoint (request
  count / latency / in-flight by route pattern, gated by optional `METRICS_TOKEN`),
  and `/health/ready` readiness probe (checks Postgres). Still to add at deploy
  time: dashboards + 401/429-spike alerts (point a scraper/APM at `/metrics`).
- [ ] **Pen-test / security review** before public launch.

---

## Reporting a vulnerability

Email **security@zeno.app** (set this up before launch). Do not open public issues
for security reports.

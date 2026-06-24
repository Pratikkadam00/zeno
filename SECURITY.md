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
4. **Data** — sensitive financial data encrypted on-device; cloud sync is
   end-to-end-encrypted ciphertext the server can't read.

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

## Before scale (production hardening checklist)

The in-code limits are correct but the **state is in-memory**, so it resets per
instance/cold-start and isn't shared across replicas. Before real traffic:

- [ ] **Distributed rate limiting** — back `@fastify/rate-limit` with Redis, and/or
  put a platform WAF + rate limiter (Cloudflare, Vercel, API gateway) in front.
- [ ] **DB-back the in-memory stores** (auth sessions, sync, family) — currently
  per-instance memory; move to Postgres/Redis so limits and sessions persist.
- [ ] **Full website CSP** — `script-src`/`style-src` are the only directives still
  unset. `connect-src/img-src/font-src/frame-src/form-action` are now pinned to
  `'self'` (the site has no external scripts, iframes, or cross-origin fetches).
  The remaining step is nonce-based `script-src`/`style-src` (Next inline hydration
  + Motion inline styles need per-request nonces), validated against rendered pages.
- [ ] **Rotate** any key that has ever been shared in plaintext (e.g. chat/logs).
- [ ] **Dependency audit** in CI (`npm audit` / Dependabot) and pin/update.
- [ ] **Secrets manager** for production (not a plaintext `.env` on the box).
- [ ] **Monitoring/alerting** on 401/429 spikes and error rates.
- [ ] **Pen-test / security review** before public launch.

---

## Reporting a vulnerability

Email **security@zeno.app** (set this up before launch). Do not open public issues
for security reports.

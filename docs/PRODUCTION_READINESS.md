# Zeno — Production Readiness Review & Phased Plan

Grounded in a three-lens read-only review (resilience/failure-modes, data & state
architecture, observability/operability) plus direct verification of every load-bearing
finding against the source. Nothing here is guessed — each item cites `file:line`.

Baseline at review time: clean tree, **244/244 tests green**, typecheck clean across all
workspaces, deps current (Fastify 5 / Expo 56 / Next 16 / React 19), ~24k LOC, 35 API routes.

---

## Verdict: is it "solid, production-ready code"?

**The code is solid. The *service* is not yet production-ready — but the gaps are a bounded,
mostly-additive punch list, not a rewrite.**

Two things are true at once:
- **Craftsmanship is genuinely high.** Security/auth is mature (fail-closed guard, RS256 pinned,
  constant-time compares, prod fail-loud secret guards), the API contract is a single consistent
  envelope with no internal leakage, code quality is excellent (**0** `@ts-ignore`, **0** `as any`
  in business-logic paths, **0** `TODO/FIXME` in source, near-zero duplication), and the test suite
  is real (244 tests incl. full-stack `inject` integration tests).
- **It is instrumented and hardened for a *single-instance MVP*, not for scale or unattended
  operation.** Every external HTTP call is un-timed, there's no graceful shutdown or crash handler,
  the mobile app has no error boundary or crash reporting, there are no metrics/readiness probes,
  and the persistence model has real durability/scale ceilings.

### Scorecard (verified)

| Dimension | Score | One-line basis |
|---|---:|---|
| Security & auth | 9/10 | Fail-closed guard, RS256 pinned, prod secret guards, constant-time compares |
| API error handling & contract | 8/10 | One envelope, global handler, no internal leakage, test-enforced |
| Code quality / maintainability | 9/10 | 0 suppressions, 0 `any` in logic paths, 0 TODOs, minimal dupe |
| Correctness & test coverage (API/logic) | 8/10 | 244 tests, real `inject` integration coverage |
| **Resilience / failure modes** | **4/10** | **No fetch timeouts anywhere; no graceful shutdown; no crash handlers** |
| **Data durability / persistence** | **5/10** | Fire-and-forget loss window; no backup; silent key-rotation loss; no migrations |
| **Scalability** | **3/10** | Single-instance only; `globalSeq` + node-local reads silently corrupt sync if scaled |
| Observability / operability | 6.5/10 | Structured logs + request IDs good; no metrics/readiness/tracing/mobile-crash-reporting |
| Web app hardening | 5/10 | Live waitlist route untested; CI never `next build`s |

**Bottom line:** ready for a **single-instance soft launch to a small user base after Phase A + the
mobile crash-reporting item** (~2–4 focused days). **Not** ready to (a) scale horizontally —
that silently corrupts sync — or (b) be operated under load without metrics. None of the fixes are
architectural rewrites; the durability/scale items are the deepest.

---

## Phase A — Resilience blockers (do before ANY real users) · Owner 🤖 code · ~1–2 days

Every external `fetch` in the API is un-timed (verified: **zero** `AbortSignal` usage in `apps/api/src`),
and there is no graceful shutdown or crash handler (verified: `closeStorage()` at `storage/pg.ts:177`
is only ever called from a test; no `SIGTERM`/`uncaughtException` anywhere).

- [ ] **A1 — Graceful shutdown.** `server.ts:30-35`: on `SIGTERM`/`SIGINT`, `await app.close()`
      (drains in-flight) → `await closeStorage()` → `process.exit(0)`, with a hard-exit timer backstop.
- [ ] **A2 — Crash handlers.** Register `process.on("unhandledRejection"|"uncaughtException")` →
      log via `app.log`, then deliberate shutdown for `uncaughtException`. (None exist today.)
- [ ] **A3 — `fetchWithTimeout` helper + apply to all 5 un-timed calls:** RevenueCat `billing.ts:84`,
      Plaid `plaid.ts:62` (+ overall deadline across the ≤10-page loop `plaid.ts:107-127`),
      Groq coach `coach.ts:189`, Resend `routes/auth.ts:558`, JWKS `routes/auth.ts:686`.
      Map abort → clean 502/504.
- [ ] **A4 — Explicit server/DB timeouts.** Fastify `requestTimeout` (e.g. 30s) + explicit `bodyLimit`
      (`app.ts:118-128`); pg pool `connectionTimeoutMillis` + `statement_timeout` (`storage/pg.ts:43-50`).
- [ ] **A5 — Mobile fetch timeouts + retry.** Wrap `apps/mobile/src/api/client.ts` fetches in
      `AbortSignal.timeout(...)` and add small retry/backoff for idempotent GETs (spinners currently
      hang forever on a dead network).
- [ ] **A6 — Pin `engines.node`** in `apps/api/package.json` (undici fetch-timeout semantics are
      Node-major-dependent).

**Done when:** a `SIGTERM` drains cleanly; a hung upstream returns a timeout error instead of hanging;
the app can't be killed by an un-awaited rejection without a logged reason.

---

## Phase B — Durability & data-safety (before onboarding users whose data matters) · Owner 👥 · ~2–3 days

- [ ] **B1 — Close the fire-and-forget data-loss window** for user-visible writes. `kvPersist` is
      not awaited (`storage/pg.ts:57-66`; callers `auth.ts:431`, `sync.ts:68`). Offer an awaited
      variant for **auth sessions** (a login during a DB blip is silently lost on restart) and the
      **sync ack** (server currently acks a change before the row lands), keep fire-and-forget only
      for self-healing data (billing). Or add a durable write-ahead/outbox on the server.
- [ ] **B2 — Encryption-key versioning.** `sealValue` writes `{ enc }` with **no key id**
      (`storage/pg.ts:107-115`), so rotating `STORAGE_ENCRYPTION_KEY` silently makes every persisted
      Plaid token undecryptable and the hydrator drops them with no signal (`plaid.ts:54-59`). Add a
      `kid` to the envelope + a small keyring (current+previous) so rotation is non-destructive, and
      log a count of rows that failed to decrypt at boot.
- [ ] **B3 — Backup runbook.** Render free Postgres **auto-deletes at ~90 days** (`render.yaml:17-19`)
      and there is **no backup guidance anywhere**. Document a `pg_dump` cadence + restore runbook,
      or move off the expiring free plan. At minimum state in SECURITY.md that `kv_store` is
      disposable and recovery = client re-sync.
- [ ] **B4 — Server migration story.** Only `CREATE TABLE IF NOT EXISTS` exists (`storage/pg.ts:146-152`);
      hydrators `as`-cast opaque jsonb (the billing hydrator already hand-tolerates a "legacy bare row"
      at `billing.ts:143-149`). Add a `schema_version` + a per-namespace forward-migration registry and
      zod-validate hydrated rows instead of unchecked casts.
- [ ] **B5 — Mobile migration versioning.** `database.ts:27-149` is additive-only with no
      `PRAGMA user_version` (verified: zero matches). Adopt `user_version` + a numbered migration array
      so a future destructive change is possible without silent new-vs-upgraded schema divergence.
- [ ] **B6 — Sweep rotated refresh tokens.** `sweepExpiredAuth` (`routes/auth.ts:151-171`) only deletes
      on `expiresAt`; a rotated-dead token sits for the full 30 days. Delete on `rotatedAt` + short grace.

---

## Phase C — Scale-safety guardrails (cheap now; prevents silent corruption later) · Owner 🤖 code

The persistence model is **node-local reads + a per-process `globalSeq` counter** (verified:
`sync.ts:24`, no `kvGet`, only `SELECT` is boot-time `initStorage`). Running >1 instance silently
**corrupts sync** (two instances mint overlapping `seq`, cursors become meaningless) and **breaks
auth** (a magic link/refresh issued on A is unknown to B). Redis rate-limiting is the one flow
already built for multi-instance.

- [ ] **C1 (now, ~1h) — Boot guard.** Refuse to start with >1 instance unless `ALLOW_MULTI_INSTANCE=1`
      is set, so nobody bumps replica count and silently corrupts sync.
- [ ] **C2 (only when actually scaling) — Real multi-instance:** move `globalSeq` to a DB sequence and
      back the auth-session lookup + sync pull with Postgres/Redis reads instead of the in-memory Map.

---

## Phase D — Observability & operability (before operating under load) · Owner 👥

- [ ] **D1 (HIGH) — Mobile error boundary + crash reporting.** Verified: **no** ErrorBoundary and **no**
      Sentry anywhere in `apps/mobile`. An uncaught render error blanks the whole app and you never hear
      about it. Add a root Expo-Router `ErrorBoundary` + `@sentry/react-native` (route the existing 16
      `console.warn` degradation signals through it). *(Needs a Sentry DSN — can scaffold inert-until-set.)*
- [ ] **D2 (HIGH) — API metrics.** Verified: no metrics of any kind. Add `fastify-metrics`/Prometheus
      (request count / latency histogram / error rate) or at least a `/metrics` endpoint.
- [ ] **D3 (HIGH) — Readiness probe.** `/health` (`app.ts:181`) returns static `{status:"ok"}` even
      when Postgres/Redis are down, so Render's health check reports healthy while degraded. Add
      `/health/ready` that checks pool + Redis; keep `/health` as liveness.
- [ ] **D4 (MED) — `x-request-id` response header.** requestId is in the JSON body but not a header;
      non-JSON proxy errors leave clients with no correlation id.
- [ ] **D5 (MED) — One typed `config.ts`.** `process.env` is read directly in **49 places** across 8
      files with ad-hoc `?? default` fallbacks, evaluated lazily on first use. Zod-parse it once at boot
      into a typed object (turns scattered lazy guards into one fail-fast startup check).
- [ ] **D6 (later) — OpenTelemetry tracing** for upstream calls, once multi-instance.

---

## Phase E — Web & CI hardening · Owner 🤖 code · ~half day

- [ ] **E1 (HIGH) — Test the waitlist route.** `apps/web/app/api/waitlist/route.ts` is live server logic
      (email validation, rate limit, fail-loud 502) with **zero tests** (verified: no `*.test.*` in
      `apps/web`). Add valid/invalid-email, rate-limit, and 502-on-unpersisted cases; consider a
      Playwright smoke for the landing page.
- [ ] **E2 (MED) — CI builds web.** `.github/workflows/ci.yml` runs typecheck + test + audit but never
      `next build`, so a bundler/RSC break ships undetected. Add `npm run build --workspace @zeno/web`.
- [ ] **E3 (LOW) — Cleanups:** delete dead `apps/api/src/auth/dev-auth-adapter.ts` (verified unused);
      warn (not silent-disable) on a malformed `STORAGE_ENCRYPTION_KEY` (`storage/pg.ts:95-98`);
      optionally run prod via `node dist/server.js` instead of `tsx src/server.ts`.

---

## By design / known-deferred (honest)

- **Sync LWW by vector-clock *sum*** (`sync.ts:34-38,64`) can silently drop a concurrent multi-device
  edit — inherent to the server-can't-read-ciphertext model. Minimum: surface/log rejections so the
  loss is observable; a real fix (store conflict pairs for the client to resolve) is a larger design task.
- **Server-side free-tier count enforcement** — impossible without breaking E2E encryption (already
  documented). Gate a Pro *feature* on the verified entitlement instead.
- **KMS, cert pinning, pen-test, secrets-manager, real Redis/multi-instance provisioning** — already in
  `docs/REMAINING_WORK.md` Phase 6 (pre-scale) and remain owner-🧑 infra/decision items.

---

## What's already genuinely production-grade (credit, verified)
Fail-closed auth guard; RS256 pinned + full iss/aud/exp checks; prod fail-loud on missing JWT/Resend
keys; constant-time secret compares; one consistent no-leak error envelope + global handler + custom
404; entitlement TTL that never serves a grant past expiry; AES-256-GCM Plaid sealing gated so plaintext
is never persisted; SQLCipher-encrypted local DB (verified real, not aspirational); privacy-careful 5xx
alert webhook (no PII); boot-tolerant DB outage handling; structured JSON logs with propagated request
IDs; Redis rate-limiter correctly tuned to fail-fast + fail-open; and an unusually clean, low-debt,
well-tested codebase.

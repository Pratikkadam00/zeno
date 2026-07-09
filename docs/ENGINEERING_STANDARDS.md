# Zeno Engineering Standards

The canonical "how we build" document. Every rule here is either (a) an industry standard with a named source — OWASP ASVS 4.x / MASVS 2.x, OWASP Cheat Sheet Series, NIST SP 800-63B, RFC 8725 (JWT Best Current Practices), RFC 9110 (HTTP semantics) — or (b) a repo-specific convention already proven in this codebase. Each section states the rule, then the **current state in this repo** (✅ already true / ⚠️ gap tracked in `docs/LAUNCH_READINESS_PLAN.md`). Nothing here is aspirational filler: if a rule appears, PRs are expected to follow it.

Related: `docs/SECURITY_ARCHITECTURE.md` (system-level design), `docs/LAUNCH_READINESS_PLAN.md` (the gap-closing plan).

---

## 1. Input validation & sanitization

**Rules** (OWASP ASVS V5, Input Validation Cheat Sheet):
- Validate every external input **at the boundary** with a schema, before any business logic: HTTP bodies, query strings, headers you read, deep-link params, file imports (CSV), third-party API responses (Gmail, exchange rates), and IPC/webhook payloads.
- Validation is allowlist-shaped: enums over free strings, bounded lengths, bounded numbers, explicit formats. Reject, don't coerce, on violation (400/422 with a generic message).
- Treat *parsed output* as typed and trusted; never re-validate downstream (single choke point).
- Anything rendered into another context is encoded for that context: CSV cells are formula-escaped (`csvSafeCell`), user text is never interpolated into SQL (parameterized queries only), never into shell commands, never into HTML without React's default escaping.
- Server never trusts client-supplied identity: user IDs come from the verified JWT, not the request body.

**Repo state:** ✅ API uses zod v4 schemas on routes; SQL is parameterized (`db.runAsync(sql, ...args)`); CSV export uses `csvSafeCell`; Plaid/coach routes derive `userId` from the verified token. ⚠️ Gaps: home-currency read back from DB is cast without validation; Gmail email amount parsing accepts malformed amounts (Plan P1).

## 2. Authentication & session management

**Rules** (NIST SP 800-63B, RFC 8725, OWASP Session Management Cheat Sheet):
- Tokens: short-lived access JWTs + rotating refresh tokens. JWTs are asymmetric (RS256/EdDSA) so the verifying side never holds a signing secret; validate `alg`, `iss`, `aud`, `exp` explicitly; never accept `alg: none`.
- Refresh tokens are single-use, revocable server-side, stored only in platform secure storage (Keychain / Android Keystore via `expo-secure-store`), never in AsyncStorage/localStorage.
- Production refuses to boot with missing/dev keys (fail closed, never fall back to a hardcoded secret).
- All authenticated routes gated by default: a middleware allowlist of public routes, registered before any route, so a forgotten annotation fails closed.
- Credential-adjacent endpoints (magic link, login, refresh) are the most tightly rate-limited routes in the API and return uniform errors that don't reveal account existence.
- Local app lock: PIN is a *convenience lock*, not the encryption root; hash with a memory/CPU-hard KDF at current OWASP parameters — PBKDF2-HMAC-SHA256 ≥ 600,000 iterations (already implemented) or Argon2id when a maintained native binding is adopted; per-user random salt; constant-time comparison; persisted attempt-lockout.

**Repo state:** ✅ RS256 with prod boot-refusal, fail-closed route allowlist (`app.ts`), refresh rotation with awaited revocation, secure-store split on web, PBKDF2 600k + `timingSafeEqual` + persisted lockout. ⚠️ Gap: magic-link failure leaks upstream error detail (Plan P3).

## 3. Encryption & key management

**Rules** (OWASP Cryptographic Storage Cheat Sheet):
- In transit: TLS everywhere, no cleartext HTTP in production; mobile uses HTTPS endpoints only (`apiBaseUrl` must be https in production builds).
- At rest (device): sensitive local data lives in SQLCipher-encrypted SQLite; the database key is generated from a CSPRNG, stored **only** in the platform keystore, never logged, never sent anywhere, and interpolated into `PRAGMA key` with quote-escaping only (already the pattern).
- At rest (server): anything user-content-bearing that we persist server-side must be either (a) E2E-encrypted client-side before upload (server stores opaque blobs), or (b) explicitly documented as server-readable in the privacy policy. **We never advertise E2E until (a) is actually implemented.**
- No homemade crypto: primitives come from OpenSSL via react-native-quick-crypto / node:crypto only. No custom modes, no ECB, no static IVs.
- Never derive encryption keys from the PIN alone (4–8 digits is brute-forceable); PIN gates UI, keystore gates keys.
- Secrets rotation: signing keys and API keys must be rotatable without a client release (server-side config), and rotation is documented.

**Repo state:** ✅ SQLCipher on-device, keystore-held DB key, CSPRNG salts, vetted primitives only. ⚠️ Gaps: sync/cloud backup has no client-side encryption yet advertises it (Plan P2); iOS export-compliance declaration must match the crypto we ship (Plan P2).

## 4. Rate limiting & abuse resistance

**Rules** (OWASP API Security Top 10 — API4 Unrestricted Resource Consumption):
- Layered limits: a global per-IP bucket (already 100/min) plus **tighter per-route budgets** on expensive or abusable endpoints (auth, email-sending, AI calls) — sized to human behavior, not machine behavior.
- Key limits on the *trusted* client IP: honor `X-Forwarded-For` only for the configured number of proxy hops; on topology mismatch, fail closed into a shared bucket (never trust a client-authored hop). This is already implemented and tested in the web waitlist route — the same rule applies anywhere IPs are read.
- Anything that sends email or calls a paid third-party API (Resend, Groq) gets its own low ceiling and a per-account limit in addition to per-IP.
- Return 429 with `Retry-After`; never queue unbounded work on behalf of an unauthenticated caller.
- Payload caps: body-size limits at the framework level; explicit `Content-Length` rejection for oversized requests (implemented in waitlist route — keep as the pattern).

**Repo state:** ✅ Global + per-route limits via @fastify/rate-limit, trusted-hop IP resolution, body caps on public routes. ⚠️ Gap: verify every email-sending/AI route has a per-account (not just per-IP) budget (Plan P3 audit item).

## 5. Secrets & configuration

**Rules** (12-factor, OWASP Secrets Management Cheat Sheet):
- Secrets live in environment/managed secret stores only. `.env` files are git-ignored; `.env.example` documents names, never values. (Verified clean against full git history — keep it that way.)
- Nothing secret in the mobile bundle: every `EXPO_PUBLIC_*`/`extra` value ships to users by definition — only publishable keys (RevenueCat public SDK keys, OAuth client IDs, Sentry DSN) are allowed there. Server-only secrets (Resend, Groq, Plaid secret, JWT private key) must never appear in `apps/mobile` or `apps/web` client code.
- New config keys are added to `.env.example` + the deployment checklist in the same PR that reads them.
- CI must never print env values; logs must never include tokens (redaction list in the logger config).

**Repo state:** ✅ Verified clean (audit checked git history, bundle, and EAS). Keep the invariant.

## 6. Logging, monitoring & PII

**Rules** (OWASP Logging Cheat Sheet, GDPR data-minimization):
- Structured logs with request IDs; log *events*, never payloads containing PII (emails, tokens, subscription contents, income).
- Redaction is configured centrally (Fastify logger `redact` paths; Sentry `beforeBreadcrumb`/`beforeSend` scrubbers — the token scrubber already exists, extend it for any new sensitive field).
- Production log level is explicit (info or warn), not the framework default; debug logging is never enabled in production builds.
- Crash reporting (Sentry) ships only with the DSN set, is disclosed in the privacy policy, and must never receive financial data in breadcrumbs.
- Every 5xx is observable: metrics endpoint requires a token in production, compared with a constant-time check.

**Repo state:** ✅ Redaction + Sentry scrubbing exist. ⚠️ Gaps: bare `logger: true` in production, `/metrics` public when token unset + non-constant-time compare (Plan P3).

## 7. Error handling

**Rules:**
- User-facing errors never leak internals (stack traces, upstream service names, HTTP details from third parties). Server maps internal failures to the stable `ApiEnvelope` error codes.
- The client distinguishes at minimum: **offline**, **auth-expired**, **server-error**, **empty**. A `null`-collapsing catch-all is not acceptable in new code — return a discriminated result (`{ ok: true, data } | { ok: false, reason: "offline" | "auth" | "server" }`) so screens can say something true.
- Every `async` UI handler either awaits inside try/catch or is explicitly `void`-ed with error surfacing through store state — unhandled promise rejections are treated as bugs (they crash dev overlays and get reported in production).
- Fail loud on writes: a failed persistence write must surface (toast/retry queue), never silently drop (see §10 data integrity).

**Repo state:** ⚠️ `api/client.ts` collapses failures to `null` (Plan P4 refactor); login handlers fixed this week — keep the pattern.

## 8. Mobile-specific security (OWASP MASVS)

- **Storage (MASVS-STORAGE):** sensitive data only in SQLCipher DB or SecureStore; nothing sensitive in AsyncStorage, logs, or screenshots of sensitive screens. Android backup rules configured deliberately (`configureAndroidBackup: true` is set — the backup must not exfiltrate the DB key; keystore keys are non-exportable by design).
- **Auth (MASVS-AUTH):** app lock re-engages on background→foreground (implemented); biometric unlock falls back to PIN, never silently bypasses.
- **Network (MASVS-NETWORK):** HTTPS only in production; certificate pinning is a *deliberate non-goal* for now (documented decision: pinning breaks on cert rotation and our threat model is commodity, not nation-state; revisit if we ever handle bank credentials — we don't).
- **Platform (MASVS-PLATFORM):** deep links validate their params; WebViews are not used; clipboard never auto-reads.
- **Resilience (MASVS-RESILIENCE):** root/jailbreak detection is a *deliberate non-goal* pre-launch (low value against our threat model, high false-positive cost); revisit post-launch.
- **Privacy (MASVS-PRIVACY):** every data flow off the device requires either explicit user action or a consent moment (coach consent — Plan P2); Gmail-derived data never leaves the device except as user-approved subscription entries, and never reaches third-party AI (Google Limited Use policy).

## 9. API design

- Versioned base path (`/api/v1`) — breaking changes bump the version, never mutate v1 semantics.
- Uniform envelope (`ok/fail` in `@zeno/shared`) with stable machine-readable error codes; HTTP status codes follow RFC 9110 (401 unauthenticated, 403 unauthorized, 404 hidden-or-missing, 409 conflict, 422 validation, 429 rate, 5xx server).
- Mutating endpoints that clients may retry (sync push, purchases ack) must be idempotent — keyed by client-generated IDs, safe to replay.
- Pagination via opaque cursors (`meta.cursor`/`nextCursor`), never offsets that shift under writes.
- CORS: explicit origin allowlist in production, no wildcard with credentials.

**Repo state:** ✅ all of the above exist as patterns; keep them.

## 10. Data integrity & persistence

- **The store is the single writer**: every mutation persists through one code path, and the persisted value is computed **before or independently of** React state dispatch. Never capture values out of a `setState` updater for side effects — React is free not to run updaters synchronously (this caused the price-edit data-loss bug; fixed pattern: compute `next` from current state, then `setX(next)` + `persist(next)`).
- Writes that cannot be applied (DB not open) are queued or surfaced — never silently dropped.
- Migrations are numbered, idempotent, forward-only, gated on `PRAGMA user_version` (implemented — keep).
- Distributed merge (sync) uses real causality: per-entity vector clocks compared component-wise (concurrent ⇒ deterministic merge or LWW with audit trail), never collapsed to a scalar.
- Money is integer minor units end-to-end; cross-currency totals either convert with a disclosed rate or disclose exclusions — never silently mix currencies (the "currency honesty" convention).
- All calendar math is UTC-day based; ISO strings persisted as dates-with-intent (renewal *day*) must be constructed as UTC dates, not local times serialized.

## 11. Dependencies & supply chain

- Lockfile committed; installs in CI are `npm ci` only.
- `npm audit --audit-level=high` runs in CI as a **visible report**; it gates releases, not unrelated PRs (a new upstream advisory must not redden a docs PR — Plan P5 adjusts the gate).
- New dependencies require justification in the PR: maintained (commits in the last year), typed, no install scripts doing surprising work. Prefer platform/Expo-blessed modules.
- Renovate/Dependabot cadence: security patches immediately, minors batched.
- Pre-1.0 native dependencies (react-native-quick-crypto) are pinned exactly and re-reviewed on every bump.

## 12. Testing standards

- **Pure logic is 100% testable and mostly tested** (packages/shared is the model — keep every new domain rule there, tested).
- Every bug fix lands with a regression test that fails before the fix (this week's database-race test is the pattern).
- Critical mobile modules (subscription store, api client, notification scheduling) get tests via React testing infra (Plan P5 sets it up); mocks fake *boundaries* (native modules, fetch), never the logic under test.
- Tests assert behavior, not implementation: given inputs → observable outputs/persisted effects.
- CI is the gate: typecheck + lint + tests + web build on every PR to main; a red main is a stop-the-line event.
- Coverage is reported honestly (`coverage.all: true` — already fixed); thresholds ratchet up, never down.

## 13. Performance budgets

- Mobile: no work at top-of-render on hot screens — derived data is `useMemo`-ed with correct deps; lists beyond ~20 items use `FlatList`/virtualization; contexts that fan out to many screens expose granular selectors so a mutation doesn't re-render the world.
- Native-bridge batch jobs (notification rescheduling) are debounced and diffed — reschedule only what changed; respect platform caps (iOS 64 pending notifications ⇒ schedule the nearest window only).
- Network: every fetch has a timeout (`timedFetch` — keep), caches respect upstream cadence (FX daily), and no polling loops without backoff.
- API: no unbounded per-request scans; anything O(all-users) is a background job, not a request handler.

## 14. Privacy & data lifecycle (GDPR/CCPA posture)

- Data minimization: collect nothing server-side we don't need; local-only mode is a first-class path (already true — preserve it in every new feature).
- Every category of server-held data has: a named purpose, a retention rule, a deletion path reachable from the app (account deletion exists — keep it exhaustive as new tables appear), and a privacy-policy entry naming the processor (Render, Resend, Groq, RevenueCat, Sentry).
- Export: user can export their data (CSV export exists on-device; server data export accompanies any future server-side store).
- Consent moments precede any new off-device data flow; marketing claims are written from the code's actual behavior, reviewed whenever a data flow changes (Plan P2 aligns current copy).

## 15. Code style & review

- TypeScript strict; no `any`/`as any` in first-party code (currently true — keep); `as never` router casts are tech debt to burn down, not a pattern to extend.
- ESLint is the gate (real config now exists); disables are per-line with a justifying comment, never file-wide blanket offs.
- Comments explain *constraints and why*, not what the next line does.
- Small PRs, imperative commit subjects, body explains why + user-visible impact; every PR states how it was verified (tests/emulator/live).
- No dead code: unused exports/components are deleted, not kept "just in case" (two dead ThemeToggles taught us this).

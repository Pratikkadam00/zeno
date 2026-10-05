# Sensitive data and logging (P7.2, 2026-10-05)

Two inventories ASVS 5.0 asks for, written from the code on 2026-10-05: what sensitive
data Zeno handles and how each kind is protected (V14.1.1, V14.1.2), and what is logged,
where, and who can read it (V16.1.1). The privacy policy (`apps/web/app/legal/privacy`)
is the public promise; this is how the code keeps it.

## 1. Protection levels

| Level | What | Encryption | Integrity | Retention | Logging | Access |
|---|---|---|---|---|---|---|
| **S: secret** | signing and storage keys, webhook and metrics secrets, provider API keys; access, refresh and sign-in tokens; the Gmail OAuth token; the PIN | at rest: keys only in Render's environment and the owner's key folder; tokens hashed (SHA-256) where the server stores them; on the phone only in Keychain / Keystore | tokens are signed (RS256) or looked up by hash | tokens: 15 minutes (access), 30 days (refresh), 10 minutes (sign-in link and code); keys: `docs/CRYPTOGRAPHY.md` | **never**: redacted by path, query strings dropped, tested with markers (`apps/api/src/log-hygiene.test.ts`) | the process that uses it; keys: the owner |
| **P1: personal financial** | the subscription list, amounts, renewal dates, budgets; a stored Plaid access token (development only) | on the phone in SQLCipher (`docs/CRYPTOGRAPHY.md`); a Plaid token sealed with AES-256-GCM; TLS in transit | SQLCipher's per-page HMAC; GCM's tag | on the phone until the user deletes it; nothing on the server (the app never calls `/sync`) | never logged; error reports scrubbed of amounts and names (`apps/mobile/src/monitoring/scrub-edges.test.ts`) | the user's own device; a coach request sends names, categories and amounts to the AI provider, and the privacy policy names it |
| **P2: personal** | email address, account id, household names and monthly totals, waitlist emails | TLS in transit; at rest, Postgres on Render (any disk encryption is Render's; not verified by us) | Postgres constraints | until the account is deleted (then erased, tested in `apps/api/src/storage/real-pg.test.ts`); waitlist: until launch plus a reasonable period | never logged (tested with a marker address in `log-hygiene.test.ts`); account ids are not logged today | the user; household members see the household's names and totals |
| **Public** | the website, the service catalogue, cancellation guides | TLS | — | — | — | everyone |

Encoded is not protected: no level relies on base64 or similar to hide a value.

Where these are held (ASVS V14.2): sensitive values travel in headers or bodies, never in
a URL, with one exception recorded as a partial (V14.2.1): the sign-in link
(`GET /auth/verify?token=...`) carries a one-time token in its query string, because it is
a link in an email. It works once, expires in 10 minutes, and is never logged (F9). Every
API answer says `Cache-Control: no-store` (F217), so no browser or proxy keeps one.

## 2. Logging inventory

| Layer | What is logged | Format | Where it goes | Who can read it | Kept |
|---|---|---|---|---|---|
| API requests (Fastify / pino) | one line per request and per response: time (epoch ms, UTC), request id, method, path **without** the query string, host, client IP, status, response time | JSON lines | stdout, captured by Render | the Render workspace's members (the owner) | Render's log retention for the plan (**the owner confirms it is within the privacy policy's 30 days**, P8) |
| API errors | a 5xx: the error with its stack, request id, route; an upstream failure (Resend, AI, RevenueCat, JWKS): a warning with the error | JSON lines | stdout (Render); a 5xx also goes to `MONITORING_WEBHOOK_URL` when set (message, method, route, request id only) | as above; the webhook's owner | as above |
| API boot | persistence mode, encryption on or off, environment; configuration warnings | text | stdout (Render) | as above | as above |
| Phone app | crash and error reports, scrubbed (no amounts, names, emails or tokens) | Sentry events | Sentry, only when a DSN is set at build time (`EXPO_PUBLIC_SENTRY_DSN`; `eas.json` sets none) | the Sentry project's members | Sentry's retention |
| Website | none of our own (Netlify's platform access logs) | — | Netlify | the Netlify account | Netlify's |

Not logged anywhere: request or response bodies, headers (Authorization and cookies are
also redacted by path if a future serializer adds them), query strings, email addresses,
subscription data. A log value cannot break a line or forge an entry: every line is a JSON
object written by pino, which escapes control characters (ASVS V16.4.1).

**Security events.** A sign-in attempt, a refresh, a refused token or a refused household
write appears as its request line, with its route and status (200, 400, 401, 403, 429).
There is no dedicated security-event log naming the account, the method or the reason: an
investigation can reconstruct who did what only from IP, time and request id. That is
recorded as partial (V16.2.1, V16.3.1 to V16.3.3), owner me.

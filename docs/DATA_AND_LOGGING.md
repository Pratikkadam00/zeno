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
| **P2: personal** | email address, account id, household names and monthly totals, waitlist emails | TLS in transit; at rest, Postgres on Render (any disk encryption is Render's; not verified by us) | Postgres constraints | until the account is deleted (then erased, tested in `apps/api/src/storage/real-pg.test.ts`); waitlist: until launch plus a reasonable period | email: never logged (tested with a marker address in `log-hygiene.test.ts`); the pseudonymous account id is logged in security events only | the user; household members see the household's names and totals |
| **Public** | the website, the service catalogue, cancellation guides | TLS | — | — | — | everyone |

Encoded is not protected: no level relies on base64 or similar to hide a value.

Where these are held (ASVS V14.2): sensitive values travel in headers or bodies, never in
a URL. The sign-in email's link is a `zeno://` link that opens the app and reaches no
server; the app then sends its token in the body of `POST /auth/verify` (a GET with the
token in its query until P7.2; that route is gone). Query strings are never logged (F9). Every
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

**Security events** (`apps/api/src/security-events.ts`, since P7.2). Besides its request
line, each of these requests writes one `"security event"` line: a sign-in (with its
method: email link or code, Apple, Google, demo), a refresh, a sign-out, a sign-in email
request, every successful change to a user's data (the audit trail: `data.household_created`,
`data.household_joined`, `data.household_spend_changed` and `data.household_left` with the
household id, `data.account_deleted`, and for the routes the app doesn't use yet
`data.bank_connected` and `data.synced`), and any request refused with 400 (`input.refused`), 401
(`access.unauthenticated`), 403 (`access.forbidden`) or 429 (`rate_limited`). Each names
the event, the outcome, the route, the status, and the account when one is known (the
account signed in, or the one whose token the request carried), next to pino's time,
request id and client IP. The account is the pseudonymous `acct_` id, never the email.
Held by `apps/api/src/security-events.test.ts` under the production logger options.

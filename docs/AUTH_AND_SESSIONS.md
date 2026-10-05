# Sign-in, sessions and authorisation (P7.2, 2026-10-05)

How Zeno's API identifies a user, how long that lasts, and who may do what. Written from
`apps/api/src/routes/auth.ts`, `auth-guard.ts` and `app.ts` as they stand on 2026-10-05;
each rule names the test that holds it. This is the documentation ASVS 5.0 asks for in
V6.1, V7.1 and V8.1 (`docs/ASVS_CHECKLIST.md`).

## 1. The ways in (authentication pathways)

There are no passwords. Every way in proves control of an email address or an Apple or
Google account. Each ends in the same session (section 2).

| Pathway | Proof | Account it signs into | Controls | Held by |
|---|---|---|---|---|
| Sign-in link (`/auth/magic-link`, then `/auth/verify`) | the link sent to the address: 256 random bits, single use, 10 minutes | `acct_` + hash of the email | 5 requests per IP per minute; 5 emails per address per 15 minutes from any IP; 10 verifications per IP per minute | `apps/api/src/routes/auth.test.ts`, `auth-scope.test.ts`, `apps/api/src/rate-limits.test.ts` |
| Sign-in code (`/auth/magic-link/verify`) | the 6-digit code in the same email, single use, 10 minutes | the same | as above, plus 10 wrong codes per address per 24 hours, then refused | `apps/api/src/routes/auth.test.ts`, `apps/api/src/routes/auth-internals.test.ts` (F80) |
| Sign in with Apple (`/auth/apple`) | Apple's signed identity token: signature against Apple's keys, issuer, audience, expiry, not-before, a nonce bound to this sign-in | `acct_apple_` + hash of Apple's user id | 10 per IP per minute | `apps/api/src/routes/auth-social.test.ts` |
| Sign in with Google (`/auth/google`) | the same for Google; an ID token is required whenever Google is configured | `acct_google_` + hash of Google's user id | 10 per IP per minute | `apps/api/src/routes/auth-social.test.ts` |
| Demo sign-in (`/auth/demo-login`) | an operator-set password | `acct_` + hash of the email | refused in production whatever is configured | `apps/api/src/routes/auth-prod-guards.test.ts` |

**One identity per provider.** Accounts are namespaced by the way in: an Apple or Google
account never maps onto an email account, or onto each other, even with the same email.
The email a provider reports is shown to the user, never used as the account key.

**Lockout without denial of service.** The 10-wrong-codes limit counts per address and
blocks code guesses only; a new sign-in link still works, so an attacker spending a
victim's code attempts cannot lock the victim out (`apps/api/src/routes/auth-internals.test.ts`, F80: "the link still works").

**Strength.** Each pathway is a single factor (control of an inbox, or of an Apple or
Google account, which may itself use multiple factors). There is no second factor on our
side: the data that matters most, the subscription list, lives on the phone behind its
own app lock (PIN, `docs/MASVS_CHECKLIST.md`); the server holds account, household and
billing state. ASVS 5.0 V6.3.3 asks for multi-factor or a combination at Level 2; that
gap is the owner's decision (`docs/ASVS_CHECKLIST.md`).

## 2. Sessions

| | Value | Held by |
|---|---|---|
| Access token | RS256 JWT, 15 minutes; issuer `zeno-api`, audience `zeno-mobile`; checked for signature, issuer, audience, expiry to the second, not-before, and the account's revocation time | `apps/api/src/routes/auth-expiry.test.ts`, `auth-nbf.test.ts`, `apps/api/src/auth-guard.test.ts` |
| Refresh token | 256 random bits, stored only as a hash, 30 days, single use: each refresh rotates it, and a reused one is refused | `apps/api/src/routes/auth.test.ts` |
| Inactivity | a session unused for 30 days ends (its refresh token expires) | as above |
| Absolute lifetime | **none**: each refresh starts a new 30 days, so an app in regular use stays signed in. Owner decision (ASVS V7.3.2) | |
| Concurrent sessions | not capped: each sign-in on each device is its own session | |
| Sign-out | revokes that refresh token at once; the access token works until it expires (at most 15 minutes, F77, owner decision) | `apps/api/src/authz-matrix.test.ts` (named known gap) |
| Account deletion | revokes every session, link and code of that account, then every access token issued before it | `apps/api/src/routes/auth-scope.test.ts` (F208), `apps/api/src/app.test.ts` |
| Expired records | swept every 10 minutes; live sessions are kept | `apps/api/src/routes/auth-scope.test.ts` (F210), `apps/api/src/start.test.ts` |

**Federated sign-in.** A session started with Apple or Google is a Zeno session from then on: it
neither follows nor ends the provider's own session (signing out of Google does not sign out of
Zeno, and the reverse). Each new sign-in needs the user to choose a provider and confirm with it.

In the app, sign-out is on the Profile screen (`apps/mobile/app/profile.tsx`). There is no
screen listing other sessions, and no operator tool to end a user's sessions short of
deleting the account: both are product decisions (ASVS V7.5.2, V7.4.5).

## 3. Who may do what (authorisation)

Every route is one of three kinds, and a test fails if a route is added without saying
which (`apps/api/src/authz-matrix.test.ts`):

- **public:** health, the catalogue, partners and capabilities, product events (an
  allowlist of anonymous counters), and the sign-in routes;
- **own secret:** `/metrics` (`METRICS_TOKEN`, required in production) and the billing
  webhook (RevenueCat's shared secret);
- **signed in:** everything else, as the account in the token.

**Data rules.** A signed-in user reaches only their own data: the account is taken from
the verified token, never from a parameter (billing, account, sync, coach, Plaid). A
household is readable and writable only by its members; the owner is a member; when the
owner leaves, ownership passes to a remaining member; the last one out disbands it. A
member can change only their own spend line. There are no field-level roles beyond that,
and no administrators in the API.

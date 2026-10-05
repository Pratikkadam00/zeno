# Input validation rules (P7.2, 2026-10-05)

What the API accepts, read from its schemas (`apps/api/src/app.ts`,
`apps/api/src/routes/auth.ts`, `packages/shared/src/schemas.ts`) on 2026-10-05. The API
is the only place these are enforced; the app checks the same things for usability, and
nothing relies on that (ASVS V2.2.2). Every route that reads input parses it with its
schema first, and anything outside the rules is a 400 before the handler runs
(`apps/api/src/schema-valid.test.ts` sends every route the values each rule allows and
just outside them; `apps/api/src/fuzz.test.ts` sends arbitrary and hostile shapes). This
is the documentation ASVS 5.0 asks for in V2.1.

## Data items

| Item | Rule |
|---|---|
| Email address | a valid address, at most 254 characters, compared in lower case |
| Sign-in code | 6 to 12 characters (the API issues 6 digits) |
| Sign-in link token, refresh token | opaque strings; looked up by their hash, never parsed |
| Apple / Google sign-in nonce | 16 to 256 characters |
| Currency | one of USD, EUR, GBP, INR, CAD, AUD (upper case) |
| Monthly spend (households) | a whole number of minor units, 0 to 10,000,000,000 (100 million) |
| A name (household owner, member) | 1 to 80 characters |
| Household share code | 4 to 12 characters, compared in upper case |
| Product event | name and label 1 to 64 characters, then checked against a fixed list (`apps/api/src/metrics.ts`) |
| Coach request | up to 200 subscriptions (name 1-80, category 1-40, cycle 1-20, monthly amount a whole number from 0), up to 20 insights (title 1-200, body 1-600), a question of at most 500 characters, an optional budget cap from 0 |
| Billing webhook | an event whose app user id is 1 to 256 characters; used only as "re-check this user" |
| Plaid public token | 1 to 512 characters |
| Sync pull | a cursor of at most 64 characters; a page size from 1 to 100 (default 50) |
| Sync push | at most 100 changes; each an entity type and operation from fixed lists, an id of 1 to 128 characters, a payload of at most 8,192 characters, a vector clock of at most 64 entries (names at most 64 characters, counts 0 to 2^40) |
| Any request body | at most 1 MB (Fastify's limit), JSON only on body routes; prototype-pollution keys refused at the parser |

## Data that must agree with other data (ASVS V2.1.2, V2.2.3)

- A household write must come from one of its members, and changes only the caller's own
  line (`apps/api/src/family-spend.test.ts`).
- A refresh token must belong to a live, unrotated session; a sign-in code must belong to
  the latest code sent to that address, within 10 minutes and the wrong-guess budget.
- An Apple or Google token's nonce must match the one this sign-in sent.

## Limits on use (ASVS V2.1.3, V2.3.2)

| Limit | Per | Value | Held by |
|---|---|---|---|
| Households owned | account | 5 (a 6th is refused) | `apps/api/src/app.test.ts` |
| Members | household | 5 (owner included; re-joining doesn't count) | `apps/api/src/family.test.ts` |
| Sync entities | account | 1,000 | `apps/api/src/sync.ts` |
| Sign-in emails | address | 5 per 15 minutes | `apps/api/src/routes/auth-scope.test.ts` |
| Wrong codes | address | 10 per 24 hours | `apps/api/src/routes/auth-internals.test.ts` |
| Coach requests | account | 10 per minute | `apps/api/src/rate-limits.test.ts` |
| Every route | IP | its own limit, on top of a global one | `apps/api/src/rate-limits.test.ts` |
| Subscriptions on the free plan | the phone | 10 | enforced in the app: the list lives on the phone, the server holds none (F15) |

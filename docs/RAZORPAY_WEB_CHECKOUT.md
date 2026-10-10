# Razorpay web checkout — design (2026-10-10)

**Decision (owner, 2026-10-10):** keep Google Play Billing in the app *and* add Razorpay
on the website. Both paths grant the same entitlement; the server stays the source of
truth. This doc is the design that code gets written against, plus what it needs from the
owner.

## Why both, and not Razorpay alone

Play's Payments policy requires Play's billing system for digital subscriptions bought
**inside** the app, and separately forbids leading users to another payment method from
inside the app ([Payments
policy](https://support.google.com/googleplay/android-developer/answer/10281818)). Who
processes the money is irrelevant to that rule — a Razorpay sheet inside the Android app
would breach it whatever the gateway.

Purchases made **outside** the app are not covered, which is what makes a web checkout
legitimate. India also has a narrow in-app exception — user choice billing, Play's fee cut
by 4% — but it requires PCI DSS certification, a fraud-reporting channel, and reporting
every transaction to Google within 24 hours through the ExternalTransactions API
([India programme](https://support.google.com/googleplay/android-developer/answer/13306652),
[integration guide](https://developer.android.com/google/play/billing/alternative/alternative-billing-with-user-choice-in-app)).
It nets roughly two points on Indian users only. Not now; revisit when revenue justifies
the compliance work.

## What the web sells

**Annual and lifetime only. Monthly stays in the app.**

Reasoning: one-time orders need no e-mandate, so none of Razorpay's recurring failure
states exist (`subscription.pending` → retries → `subscription.halted`), and the grant is
a fixed expiry date rather than a state machine. The 15% saved is also largest on the
big-ticket items. Monthly through Play keeps the in-app Upgrade button working, which is
where most conversions happen.

**This is a product call, not a technical one — D24 in `docs/OWNER_ACTIONS.md`.** Say the
word and I'll add recurring (Razorpay Subscriptions: plans, mandates, the five
subscription webhooks) instead.

## How a web payment reaches the right account

**Sign in first, then pay.** The checkout page uses the existing magic-link flow against
`/api/v1/auth/magic-link`, so the purchase is bound to a verified account id.

Rejected: "type the email of your Zeno account at checkout". A typo grants Pro to the
wrong person or to nobody, support cannot tell the two apart, and the grant would have to
sit pending against an unverified address. Signing in costs the buyer one email and
removes the whole class of problem — and the magic-link flow already creates the account
on first use, so there is no "not registered yet" case to handle.

## The server side

A Razorpay grant is **not** a cache of someone else's truth, which is the one real
difference from `apps/api/src/billing.ts` as it stands today. The RevenueCat entitlement
is cached with a 10-minute TTL and re-verified against RevenueCat's REST API; a paid
one-time order has nothing to re-verify — it is authoritative until its own expiry. So:

- **Store** the grant durably (`kvPersist`, its own namespace), keyed by account id:
  plan, `expiresAt` (`null` for lifetime), the Razorpay payment id, and the amount and
  currency actually charged.
- **No TTL.** It stands until it expires or is revoked.
- **Revoke on refund.** `payment.refunded` and `refund.created` drop the grant. Without
  this a refunded buyer keeps Pro forever, which is the mirror of the bug the TTL exists
  to bound on the RevenueCat side.
- **Resolve both sources on read** by taking the better of the two: `family` outranks
  `pro` outranks `free`, and for an equal plan the later expiry wins, with `null`
  (lifetime) beating every date. Someone who bought monthly on Play and later bought
  lifetime on the web must not be downgraded by whichever source answered last.

### The webhook, exactly

Verified per Razorpay's own documentation
([validate webhooks](https://razorpay.com/docs/webhooks/validate-test/)):

- Header **`X-Razorpay-Signature`**.
- **HMAC-SHA256** of the **raw request body** with the webhook secret. The body must not
  be parsed or re-serialised first — Fastify needs a raw-body hook scoped to this route.
- Constant-time comparison, as `verifyWebhookAuth` already does for RevenueCat.
- **Replay guard** on the event id, so a captured request cannot re-grant.
- **Rotation window:** on a secret change, retries of events sent before the change still
  carry the old signature, so accept a previous secret for a bounded period.
- The browser's success callback grants **nothing**. Only a verified webhook, or a
  server-side fetch of the payment from Razorpay's API, moves an entitlement.

### Prices and currency

A price table on the server, one entry per currency — INR for India, USD elsewhere. No
client-side conversion and no rate maths: the amount charged is a number we chose, which
is what `docs/ENGINEERING_STANDARDS.md` requires of anything with a currency on it. USD
needs international payments activated on the Razorpay account; Razorpay settles in INR
either way.

## The website side

- A checkout route on `zenoapp.in`, which can host server logic — the site is a full Next
  build on Netlify, and `app/api/waitlist/route.ts` already runs as a real endpoint in
  production.
- **CSP:** the site is `script-src 'self'` with `frame-src 'none'` and no third-party
  scripts at all. Razorpay Checkout needs its script and its iframe allowed, so that
  relaxation is **scoped to the checkout route only** and every other page keeps the
  policy it has now. The CSP tests pin this.

## The Play guardrail

The app must not link to, or price, the web checkout. I'll add a test that fails if any
file under `apps/mobile` references the checkout path or Razorpay — a rail, so this can't
be undone by accident months from now.

## What I need from the owner

1. **Razorpay key id and key secret** — live and test. Put them in `zeno-keys\prod\` as
   files like the others; don't paste them into chat. Same for the **webhook secret** you
   set when creating the webhook.
2. **Is international payments activated** on the account? That decides whether USD is
   available at all, or whether v1 is INR-only.
3. **The INR prices** for Pro annual, Pro lifetime and (if you want it on the web) Family
   — real price points, not a conversion of $69.99. Indian pricing for an Indian audience
   is a positioning decision.
4. **The legal entity and GST position** (D18). Razorpay onboarding and the invoices it
   issues need the registered name, and whether GST applies to the sale changes what the
   buyer is shown.

## Status

| Slice | State |
|---|---|
| Signature verification, grant model, two-source resolution (API, unit-tested) | ✅ `apps/api/src/billing-razorpay.ts`, 32 tests |
| Webhook route + raw-body hook + replay guard | ⬜ |
| Order creation endpoint (needs keys) | ⬜ |
| Checkout page + scoped CSP (needs prices) | ⬜ |
| The mobile no-steering guard test | ⬜ |
| End-to-end in Razorpay test mode | ⬜ |

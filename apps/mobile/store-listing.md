# Zeno — App Store / Play Store listing copy

Phase 4.5 of `ZENO_MASTER_PLAN.md`. Built from the three locked onboarding
promises (`apps/mobile/app/index.tsx`) plus the lifetime pricing shipped in
Phase 2.1. Character limits verified against current App Store Connect /
Play Console documentation (2026) before writing — not assumed.

**Not included here, and not code-fixable:** screenshots. The plan's original
text asked for them "from the Phase 3 card designs" — but Phase 3 shipped as
text-based shares (a decision made with the founder; see Phase 3 in the plan),
not rendered visual cards, so there are no card designs to screenshot from.
Store screenshots need actual device/simulator captures of the real app,
which is a manual step once there's a build to screenshot.

---

## App Store (Apple)

**App name** (≤30 chars — 26 used): `Zeno: Subscription Tracker`

**Subtitle** (≤30 chars — 29 used): `Track & cancel, no bank login`

**Keywords** (≤100 chars, comma-separated, no spaces after commas — 97 used, verified via node -e). NO competitor brand names here — Apple rejects them and it invites trademark complaints (P2.13):
```
subscription tracker,cancel subscription,budget app,bill tracker,recurring charges,trial reminder
```

**Promotional text** (≤170 chars, editable without a new build — 139 used, verified via node -e):
```
Find every subscription from email receipts or a bank statement you import — never a bank login. Warned 7 and 3 days before you're charged.
```

## Google Play

**App title** (≤30 chars — 26 used): `Zeno: Subscription Tracker`

**Short description** (≤80 chars — 74 used):
```
Find, track & cancel subscriptions. No bank login, ever. Pay once, own it.
```

## Full description (both platforms, ≤4000 chars — shared)

```
Zeno finds every subscription you're paying for — and never asks for your bank login to do it.

THE HONEST WAY TO TAKE BACK YOUR SUBSCRIPTIONS

Most subscription trackers want you to link your bank account first. Zeno doesn't. Scan your email receipts or import a bank/card statement you download yourself, and Zeno finds your recurring charges — processed on your device, encrypted, never sent anywhere just to find a subscription.

NO BANK LOGIN. EVER.
Zeno never asks for your banking credentials, and never sees them. Full stop.

YOUR DATA STAYS ON YOUR DEVICE
Discovery runs from email receipts and statements you control — on-device and encrypted. You can even use Zeno with no account at all: everything works offline, from day one. Optional cloud features like the AI coach and Family Vault only send data when you turn them on — and we ask first.

WARNED BEFORE YOU'RE CHARGED
A heads-up 7 and 3 days before any renewal or trial conversion — never a surprise charge again.

WHAT ZENO DOES
- Finds subscriptions from Gmail receipts or a CSV bank/card statement
- Tracks renewal dates, price hikes, and free trials before they convert
- One-tap cancellation guides for hundreds of services
- A monthly budget cap, category budgets, and envelopes
- Works fully offline — no account required to start
- Share your Wrapped year-in-review, a "found money" card, and budget streaks

PRICING THAT DOESN'T HATE YOU BACK
- Free: track up to 10 subscriptions, a monthly budget, full discovery, and every cancellation guide
- Pro: $3.99/month or $29.99/year — unlimited subscriptions, category budgets, and envelope budgeting
- Lifetime: $79.99 once — pay one time, own it, no renewal, ever

Track what you're really paying for. Cancel what you don't need. Never hand over your bank login to do it.
```

---

## Verification notes
- Character limits (App Store subtitle 30, keywords 100, promotional text 170; Play Store title 30, short description 80) checked against current platform documentation before writing this file, not recalled from memory.
- All prices match the shipped paywall (`apps/mobile/app/paywall.tsx`, Phase 2.1) — do not edit one without the other.
- Do not restore the removed "14,000+ people" claim (Phase 1.3) or any other unverified user-count/social-proof number here.

# Product Hunt listing (draft; the owner posts from a personal maker account)

Rules read on producthunt.com/launch and /launch/preparing-for-launch on 2026-10-01: company accounts are prohibited; anyone can submit their own product (no need to pay a hunter); schedule up to one month ahead; 12:01 am Pacific gives a full 24-hour cycle; the URL must be the product page, no shortened or UTM links; name field is the product name only, no tagline or emoji. Third-party guides add: maker account aged 30+ days, never ask for upvotes, 3-5 gallery images or a 30-90 s video, tagline under 60 characters.

Pre-launch (now): create the personal account, fill the profile, comment on launches in Finance/Productivity for four weeks. Do not launch until the app is installable from at least one store and the website is live on the final domain.

## Fields

**Name:** Zeno

**Tagline (≤60 chars, 54 used):** Track and cancel subscriptions. No bank login required.

**URL:** https://<domain>

**Topics:** Fintech · Productivity · Privacy · Android · iOS

**Description (first paragraph is what people read):**

Zeno finds every subscription you pay for from email receipts you scan or a bank statement CSV you export yourself, and never asks for a bank login. It warns you 7 days, 3 days and the morning before each renewal, flags free trials before they convert, and walks you through each service's real cancellation steps. A cancellation stays "pending" until the next renewal date passes with no charge, so nothing is called cancelled until it is.

Your subscription data lives in an encrypted database on your phone. You can use Zeno with no account at all.

Pricing that doesn't hate you back: Free for 10 subscriptions with every guide and reminder. Pro is $3.99/month or $29.99/year. Lifetime is $79.99, once. We built the lifetime plan because a subscription tracker that is itself a subscription felt wrong.

**Gallery (5 images, 1270×760):** 1) the ledger with the monthly total; 2) a renewal reminder notification; 3) the cancel guide with the "pending verification" state; 4) Discover: CSV import results; 5) the pricing ledger with Lifetime. Capture from the real app (see `store/screenshot-plan.md`); no mock numbers that aren't in the capture.

## First comment (maker)

Hi Product Hunt. I'm {owner}, I built Zeno.

I started it because every subscription app I tried wanted my bank login first. Zeno refuses that step: it reads receipts and statements you already control, on your phone, only when you tap scan.

Two things I'd love feedback on:
1. The verified-cancellation idea: Zeno won't mark a subscription cancelled until the next renewal passes without a charge. Is that reassuring or annoying?
2. Lifetime pricing at $79.99. YNAB is $109 every year (their pricing page, checked this week). Does a one-time price change how you think about a finance app?

The cancellation catalog (509 services, rated by how hard they make it) is on the site free, no app needed: {url}/cancel. Honest caveat: {curated count} of those guides are hand-verified so far; the rest show general steps and say so.

Ask me anything, I'm here all day.

## Day-of checklist

- Waitlist email goes out at 7 am Pacific with the PH link (ask for feedback, not votes).
- Reply to every comment within the hour.
- Log the result (rank, upvotes, visits from PH in Vercel Analytics) in `GROWTH_LOG.md` the next morning.

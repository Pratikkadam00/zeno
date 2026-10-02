# /budgeting

Primary query: budgeting app for subscriptions (SEO.md §12 angle: "budgeting for people who hate budgeting apps"; never fight YNAB/Mint head-on). Persona: tried YNAB or Monarch, quit over the price or the bank-sync re-auth loop, wants one cap and the recurring charges handled. Zero shared paragraphs.

## Metadata

- title: `Budgeting App for Subscriptions, No Bank Sync` (full with ` | Zeno` = 52)
- description (155): `A budgeting app built around recurring charges: set one monthly cap, see every subscription against it, add category budgets and envelopes. No bank sync needed.`
- canonical: `/budgeting`
- openGraph + twitter full blocks; JSON-LD: `WebPage` + `BreadcrumbList` + `FAQPage` (5, verbatim)
- components: `ContentShell` (eyebrow "Budgeting"), prose, `FAQ`, `ComparePageCta`, related guides

## Copy

**H1:** Budgeting for people who hate budgeting apps.

**Lead:** One monthly cap, every subscription measured against it, and a recap at the end of the month. Category budgets and envelopes when you want them. No bank account to connect, so nothing to re-authenticate.

### Why the big budgeting apps lose people

The two complaints that follow YNAB and Monarch around are not about features. One is price: YNAB is $109 a year, Monarch $99.99 a year (both from their own pricing pages, read 1 October 2026), every year. The other is the bank connection: Monarch's help centre lists three data providers and a whole article on connection-status messaging, because syncing thousands of banks is hard and breaks. If you stopped using a budgeting app, it was probably for one of those two reasons.

Zeno's budget starts from a different assumption: the money that leaks is recurring. You already know what rent is. What you don't know is that fourteen subscriptions add up to more than you'd guess and three of them renew next week. So the budget here is a monthly cap on recurring spend, filled in automatically from the subscriptions Zeno tracks, with a forecast of what the month will cost before it happens.

### How it works

1. **Set a cap.** Zeno suggests one from your current recurring total; you adjust it. That's the whole setup.
2. **Watch the forecast.** The month's committed subscription spend sits against the cap as renewals approach. Cut candidates are listed with what each would save, per its real billing cycle.
3. **Close the month.** A recap shows estimated spend against the cap and your streak of months under it. Share the streak if you like; it's a text card, not a tracking link.

### Why this beats the alternatives for this job

- **Nothing to connect.** Subscriptions come from receipts and statements you choose to import. No bank login required, so there is no bank-sync outage and no re-authentication loop.
- **Pay once if you want.** Lifetime is $79.99, one payment. YNAB has no one-time option; Monarch has none either (their pricing pages, 1 October 2026).
- **The budget already has your data.** Most budgeting apps start with an empty page. Zeno's cap is populated by the subscriptions it has already found.
- **Honest numbers.** When subscriptions are in more than one currency, Zeno converts into your home currency at a daily rate or tells you how many it couldn't convert. It never silently adds dollars to euros.

### Zeno next to YNAB and Actual Budget

YNAB is a full zero-based budgeting method with bank import, and it is excellent at that; it is also $109 a year and asks you to budget every dollar. Actual Budget is free, local-first and open source, and the common complaint in the threads is that it is too technical to self-host. Zeno is narrower on purpose: a cap on recurring spend, category budgets and envelopes for people who want them, and nothing to install on a server. If you want to budget every grocery receipt, YNAB is the better tool. If the problem is subscriptions, this page is.

### What it costs

The monthly cap, the forecast and the recap are free. Pro ($3.99 a month or $29.99 a year) adds per-category budgets and envelopes, and removes the 10-subscription cap. Lifetime is $79.99 once.

### Questions

**Does Zeno need my bank account to budget?** No. The budget is built from the subscriptions Zeno tracks, which come from receipts you scan, statements you import, or entries you add by hand.

**Is this a full budgeting app?** It budgets recurring spend: a monthly cap, category budgets and envelopes. It does not try to replace a zero-based budget for every transaction.

**What are envelopes here?** Named allocations you fund each month and log spend against, inside the cap. They are part of Pro.

**Can I budget in a currency other than dollars?** Yes. Set a home currency in Settings; totals convert daily, and anything that can't be converted is counted and shown, not hidden.

**Is my budget stored online?** It is stored in the encrypted database on your phone. Sync is off at launch.

### Set one cap

Join the waitlist. The cap, the forecast and the recap are free.

### Related guides

- [YNAB alternative with a one-time purchase](/compare/ynab-alternative)
- [Monarch alternative with no bank sync to break](/compare/monarch-alternative)
- [How to cancel YNAB](/cancel/ynab)

In-body mesh links: "subscriptions Zeno tracks" → `/subscription-tracker`; "YNAB is $109 a year" → `/compare/ynab-alternative`; "Monarch's help centre lists three data providers" → `/compare/monarch-alternative`.

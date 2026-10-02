# /subscription-tracker

Primary query: subscription tracker app. Persona: someone who just found a charge they don't recognise and wants a list of everything they pay for, without handing over a bank login. Zero paragraphs shared with the homepage or the other three pages.

## Metadata (engineering ports verbatim)

- title: `Subscription Tracker App: Find, Track, Cancel` (template appends ` | Zeno`; full string 52 chars)
- description (157): `A subscription tracker that finds every recurring charge from receipts you scan or a statement you import, reminds you before renewals, and helps you cancel.`
- canonical: `/subscription-tracker`
- openGraph + twitter: full blocks, same title/description, `/og.png`, alt = title
- JSON-LD: `WebPage` + `BreadcrumbList` (Home → Subscription tracker) + `FAQPage` mirroring the 5 FAQs below verbatim + `SoftwareApplication` (`applicationCategory: FinanceApplication`, `operatingSystem: Android, iOS`, `offers`: 0, 3.99/month, 29.99/year, 79.99 one-time, USD)
- components: `ContentShell` (eyebrow "Subscription tracker"), prose, `FAQ`, `ComparePageCta`, related-guides list

## Copy

**H1:** Track every subscription you pay for.

**Lead:** Zeno is a subscription tracker that builds the list for you from receipts you scan or a statement you import, warns you before each renewal, and only calls a cancellation done when the charge actually stops.

### The charge you didn't recognise

Most people find out they have a subscription problem from a bank statement line they can't place. Then comes the slow version of the job: opening the Apple and Google subscription pages, searching an inbox for "receipt", scrolling three months of card statements, and still missing the annual plan that renews in February. The list never gets finished, so it never gets trusted.

Zeno finishes the list. It reads the sources you already have access to, puts every recurring charge on one ledger with its amount, cycle and next renewal date, and keeps that ledger current as reminders fire and cancellations clear. No bank login required.

### How it works

1. **Discover.** Scan billing receipts in a Gmail inbox you connect read-only, or import a CSV statement exported from your bank or card. Zeno reads them on your phone when you tap scan, matches charges against a catalog of 509 services, and fills in prices, cycles and cancellation steps.
2. **Track.** Each subscription shows what it costs per cycle and per year, when it next renews, and whether it is a trial. Reminders arrive 7 days, 3 days and the morning before every charge, with the exact amount.
3. **Cancel and verify.** One tap opens the service's cancellation guide. After you cancel, the entry stays "pending" until the next renewal date passes without a charge. Then, and only then, it is marked cancelled.

### Why this beats the usual options

- **Against a spreadsheet:** a spreadsheet does not know when February's annual renewal is coming, and it does not notice when a price goes up. Zeno does both from the data it already has.
- **Against a bank-sync app:** apps like Rocket Money connect to your accounts through Plaid (their help centre says so, read 1 October 2026). That means a bank credential step, and a connection that can break. Zeno has no bank connection to break.
- **Against the Apple and Google subscription pages:** those show only what is billed through the store. Zeno also catches the Adobe plan billed by card, the newsletter on PayPal, the gym on a different card.
- **Against "just remember":** the whole business model of auto-renewal is that you won't.

### Zeno next to Bobby and Rocket Money

Bobby is a well-liked manual tracker: you type each subscription in by hand, and it reminds you. Zeno does that too, and adds discovery from receipts and statements so the list starts full instead of empty, plus the verified-cancelled state. Rocket Money starts from a bank connection and can cancel on your behalf for Premium members; it is the right tool if you want bank sync and a human cancelling for you, and the wrong one if you don't want to connect a bank at all. Zeno is for the second group.

### What it costs

Free covers 10 tracked subscriptions, every reminder, every cancellation guide, the monthly budget cap and the Spend Coach. Pro ($3.99 a month or $29.99 a year) removes the cap and adds category budgets and envelopes. Lifetime is $79.99 once; there is no subscription for the subscription tracker unless you want one. Full details on the pricing section of the homepage.

### Questions

**Does Zeno connect to my bank?** No. It reads email receipts you choose to scan and statement files you choose to import. There is no bank credential step and no data aggregator.

**Does it scan in the background?** No. A scan runs when you tap scan. Nothing is collected while you are not using the app.

**Where is my data stored?** In an encrypted database on your phone. You can use Zeno without creating an account. Cloud sync is switched off at launch.

**How many services does it recognise?** 509 in the catalog today, with prices and cancellation steps. Anything else you can add by hand in a few seconds.

**Can Zeno cancel a subscription for me?** It takes you to the service's real cancellation flow with step-by-step guidance, then checks your next receipt or statement before marking it cancelled. You keep the final confirmation.

### Start the list

The list is free for your first 10 subscriptions. Join the waitlist and be first in when Zeno reaches the App Store and Google Play.

### Related guides

- [How to cancel Netflix](/cancel/netflix)
- [How to cancel Spotify](/cancel/spotify)
- [How to cancel Adobe Creative Cloud](/cancel/adobe-creative-cloud)

In-body mesh links: "catalog of 509 services" → `/cancel`; "connect to your accounts through Plaid" → `/compare/rocket-money-alternative`; "No bank login required." → `/compare/no-bank-login`.

# Paid search test (last; not before Tiers 1-3 are live)

## Gate

Do not start until: the site is on the final domain and indexed; the five compare pages and four money pages are live; analytics is on with a `waitlist_submit` (or store-click) custom event, otherwise there is nothing to measure; the owner has read Google's Financial products and services policy page. Search summaries read today list credit cards, loans, insurance, securities and crypto as the certification categories; a budgeting/subscription app was not named, but the owner must confirm on the policy page itself, not from this note.

## 1. Google Search, exact match only

| Setting | Value |
|---|---|
| Campaign | Search only, no Display, no Search Partners, no auto-apply recommendations |
| Match type | exact match `[...]` only; add every broad phrasing as a negative |
| Budget | $10/day, 14 days, hard cap $140 |
| Bidding | Manual CPC, max $2.00 to start |
| Geo | US only (the pages' competitor prices are USD) |

| Ad group | Exact-match keywords | Landing page |
|---|---|---|
| no-bank-login | [subscription tracker without bank login], [subscription tracker no bank account], [subscription tracker no bank login] | `/compare/no-bank-login` |
| budget-no-sync | [budget app that doesn't connect to bank account], [budget app without bank linking], [budget app no bank sync] | `/compare/budget-app-no-bank-sync` |
| ynab-lifetime | [ynab alternative one time purchase], [ynab alternative no subscription], [ynab alternative lifetime] | `/compare/ynab-alternative` |
| rocket-money | [rocket money alternative without plaid], [rocket money alternative] | `/compare/rocket-money-alternative` |
| trial-reminders | [free trial reminder app], [free trial tracker app] | `/free-trial-reminders` (once built) |

Ad copy (responsive search ad; every line must be true of the page it lands on):

- Headlines: "Subscription Tracker, No Bank Login Required" · "Find and Cancel Subscriptions" · "Warned 7 and 3 Days Before a Charge" · "Pay Once: $79.99 Lifetime" · "Free for 10 Subscriptions" · "Your Data Stays on Your Device"
- Descriptions: "Finds subscriptions from receipts you scan or a statement you import. No bank login required. Free for 10 subscriptions." · "Cancellation guides for 509 services and reminders before every renewal. Pro $3.99/mo, $29.99/yr, or $79.99 once."
- Banned in ads, same as everywhere: "100% on-device", "we never see your data", "no Plaid ever", any user count, "most popular", "limited time".

## Stop rules (written before spending)

- Stop an ad group if after 100 clicks it has 0 waitlist submits / store clicks.
- Stop the campaign if average CPC exceeds $3.00 for 3 consecutive days.
- Stop everything if a policy disapproval mentions financial certification; do not appeal, ask counsel.
- At day 14, write the numbers into `GROWTH_LOG.md`: impressions, clicks, CPC, submits per ad group, and the search-terms report (the real queries are the best free keyword research the project will get).

## 2. Apple Ads (install intent, store launch day)

Third-party summaries read today: Apple Ads Basic is cost-per-install, Search results only, with a $100 starter credit and a monthly cap; Advanced is cost-per-tap with keyword control. Benchmarks quoted ($1-5 per install) are not Apple's numbers. Confirm everything in the Apple Ads console before spending. If used: Advanced, exact-match "subscription tracker", "cancel subscriptions", "bill tracker"; $10/day; stop rule: CPI above $5 for 3 days.

## Not planned

Meta, TikTok, display, retargeting. No audience exists to retarget and the pages have no conversion history. Revisit after the first 1,000 installs.

# Keyword architecture (SEO.md §1.2: brand / money / long-tail, one page per intent)

Demand column = what page 1 looked like on 2026-10-01 (`research/serp-checks-2026-10-01.md`). Volume ranges: NOT available in this session; owner pastes Keyword Planner buckets into the last column.

## Brand

| Query | Page | Note | Planner range |
|---|---|---|---|
| zeno app · zeno subscription tracker · zeno subscriptions | `/` | "Zeno" is shared with a philosopher, a Dutch bank and other apps; claim the brand SERP with the profiles in `deploy/owner-checklist.md` §10 | |

## Money (one page each; never two pages on one query)

| Primary query | Secondary phrasings (same page) | Page | Status | Demand (SERP) | Planner range |
|---|---|---|---|---|---|
| subscription tracker app | subscription tracker, subscription manager app, track subscriptions app | `/subscription-tracker` | to build | MIXED (store listings + indie trackers) | |
| cancel subscriptions app | app to cancel subscriptions, cancel unused subscriptions, find and cancel subscriptions | `/cancel-subscriptions` | to build | MIXED | |
| free trial reminder app | free trial tracker, trial reminder, forgot to cancel free trial | `/free-trial-reminders` | to build | WINNABLE (page 1 half off-topic) | |
| budgeting app for subscriptions | budgeting app for people who hate budgeting apps, simple budget app no bank | `/budgeting` | to build | WINNABLE | |
| subscription tracker without bank login | subscription tracker no bank account, privacy subscription tracker | `/compare/no-bank-login` | live | WINNABLE (indie trackers only) | |
| budget app that doesn't connect to bank account | budget app without bank linking, budget app no bank sync | `/compare/budget-app-no-bank-sync` | live | WINNABLE | |
| rocket money alternative | rocket money alternative without plaid | `/compare/rocket-money-alternative` | live | not checked today | |
| monarch alternative | monarch money alternative | `/compare/monarch-alternative` | live | not checked today | |
| ynab alternative one time purchase | ynab alternative no subscription, ynab alternative lifetime | `/compare/ynab-alternative` | live | WINNABLE | |

Rule for the four new pages: `/subscription-tracker` must NOT lead with "without bank login" in its H1 (that query belongs to `/compare/no-bank-login`); it says "No bank login required" once, in the body, and links the compare page.

## Long-tail (one page per query; each links its parent money page in-body)

| Family | Pages | Parent money page | Demand |
|---|---|---|---|
| how to cancel {service} | `/cancel/{slug}` (509 exist; curate the top 20 first, `content/cancel-guides/top-20-verified.md`) | `/cancel-subscriptions` | HARD for big brands, WINNABLE with the trap modifier ("without fee", "before annual fee", "auto renewal refund") |
| how to cancel {service} without fee / before the annual fee | same guide pages, H2 sections, not separate pages | `/cancel-subscriptions` | WINNABLE (Adobe, Planet Fitness, Peloton checked) |
| subscription audit checklist | `/blog/subscription-audit-checklist` | `/subscription-tracker` | not checked (SEO.md §12 names it as link bait) |
| free trials that charge automatically / forgot to cancel a free trial | `/blog/free-trials-that-convert` | `/free-trial-reminders` | WINNABLE (page 1 for the app query is thin) |
| cancelled but still charged / how to know a subscription is really cancelled | `/blog/verified-cancelled` | `/cancel-subscriptions` | not checked |
| budgeting without linking a bank | `/blog/budgeting-without-a-bank-link` | `/budgeting` | WINNABLE (the money query's page 1 is blogs) |
| how much am I spending on subscriptions (calculator) | later: interactive, no invented averages | `/subscription-tracker` | not checked |

## What is deliberately not targeted

- "budget app", "budgeting app", "subscription" head terms (SEO.md §0: unwinnable).
- "best subscription tracker apps 2026": publisher territory; handled by outreach, not a page.
- Competitor brand names in store keywords (Apple rejects them; `store-listing.md`). On the website they are fine on the compare pages, where every claim is dated.

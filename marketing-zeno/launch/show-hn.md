# Show HN draft

Rules read at news.ycombinator.com/showhn.html on 2026-10-01: "Show HN is for something you've made that other people can play with"; not for "blog posts, sign-up pages, newsletters, lists, and other reading material"; not for landing pages or things requiring sign-up to try; title must begin with "Show HN"; the maker should be around to discuss.

Consequence: post only on the day the app is installable without a sign-up wall (local-only mode exists, so this is true once a store build or a direct APK is available). The website alone would be removed as a landing page.

**Title (≤80 chars):** Show HN: Zeno – subscription tracker with no bank login, local-first SQLCipher DB

**URL:** https://<domain> (or the Play Store link if the site is judged a landing page; the `/cancel` catalog is usable without the app and may be the better URL)

**Maker comment (post immediately):**

I built Zeno because every subscription tracker I tried started by asking for my bank login through Plaid. Zeno never does. Discovery runs from Gmail receipts you scan (read-only OAuth, parsed on the phone, only when you tap scan) or a CSV statement you export yourself. The database is SQLite with SQLCipher on the device; you can use the app without an account.

Things HN might care about:
- Reminders at 7 days, 3 days and the day of a renewal; free trials flagged before they convert.
- "Cancelled" is a pending state until the next renewal date passes with no matching charge.
- The cancellation catalog (509 services rated easy/medium/hard/dark-pattern, with steps) is public at /cancel and doesn't need the app. Caveat: {curated count} entries are hand-verified; the rest say "general steps".
- The AI coach is optional, consent-gated, and sends names/categories/amounts only.
- Monorepo: Expo app, Next.js site, Fastify API. Sync is off at launch and will not be advertised until it is end-to-end encrypted.

Pricing: free for 10 subscriptions; Pro $3.99/mo or $29.99/yr; Lifetime $79.99 once.

What it can't do: no bank sync means it misses charges with no receipt and no statement line you import. I'd rather be honest about that than add the bank login.

I'll be here for questions.

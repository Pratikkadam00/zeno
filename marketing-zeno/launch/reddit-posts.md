# Reddit drafts (the owner posts, disclosed, after reading each community's rules page)

What was verifiable today: reddit.com is blocked from this session, so no subreddit rules page was read directly. Secondary sources read today say r/personalfinance removes any link to a financial product and bans "spammers, solicitors, and self-interested shills", and that r/PFtools exists for pitching personal-finance tools in a single post with no promotional commenting elsewhere. Reddit's site-wide guidance is the 90/10 rule. **Before posting anywhere: open reddit.com/r/{sub}/about/rules, read it, and paste the relevant rule into `GROWTH_LOG.md`.** If a community forbids self-promotion, do not post there; comment only when someone asks for exactly this and disclose.

## 1. r/PFtools (the one community built for this)

Title: I built a subscription tracker that never asks for a bank login (free for 10 subscriptions, one-time Pro option)

Body:

Disclosure: I'm the developer.

Zeno is a subscription tracker for people who won't hand a bank login to an app. It finds subscriptions from Gmail receipts you scan (read-only, on the phone, only when you tap scan) or a CSV statement you export from your bank, then reminds you 7 days, 3 days and the morning before each renewal. Free trials are flagged before they convert. Each service has a cancellation guide; after you cancel, Zeno keeps it "pending" until the next renewal passes without a charge, then calls it cancelled.

Data stays in an encrypted database on the phone. You can use it with no account.

Pricing: free for 10 subscriptions with every reminder and guide. Pro ($3.99/mo or $29.99/yr) adds unlimited subscriptions, category budgets and envelopes. Lifetime is $79.99 once.

Honest limits: no bank sync at all, by design, so it won't catch a charge that never produced a receipt or isn't in a statement you import. The cancellation catalog has 509 services; {curated count} are hand-verified and the rest show general steps and say so.

Site: {url}. Android/iOS: {store links}. Happy to answer anything.

## 2. r/ynab — comment-only playbook (do not post a thread)

When a thread asks for alternatives because of the price or bank-sync problems, reply like this and only if the question fits:

"Developer here, so discount accordingly. If the problem is specifically the $109/yr, Zeno (mine) has a $79.99 lifetime option and no bank login; it's a subscription tracker with a monthly budget cap, not a full envelope budget like YNAB, so it only fits if subscriptions are the main thing you're tracking. YNAB's pricing is from their page this week."

Never reply to more than one thread a week. Never reply where the rules forbid it.

## 3. r/privacy — comment-only, and only when someone asks for a tracker without bank access

"Disclosure: I build Zeno. It discovers subscriptions from receipts you scan or a CSV you export, never from a bank connection; the database is SQLCipher on the phone; you can skip creating an account entirely. Sync is off at launch. The AI coach is optional and sends only names, categories and amounts if you turn it on. Code details are on the site's developers page if you want to check the claims."

## 4. r/androidapps / r/iosapps

Many app subreddits require a "Dev" flair and a promo-code offer; read the rule first. Draft:

Title: [DEV] Zeno — subscription tracker with no bank login, CSV and Gmail-receipt import, lifetime price option

Body: as the r/PFtools post, plus what the free tier includes and that there is no trial claim.

## What not to do

- No second account, no friends upvoting, no "I found this app" posts.
- No invented numbers in any reply.
- No replies to the competitor-recommendation threads with a drive-by link; answer the question first.

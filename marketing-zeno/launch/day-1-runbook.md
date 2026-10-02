# Day-1 runbook (the launch day: first store listing live)

Prerequisites, all true before picking the date: website on the final domain; Search Console sitemap accepted; waitlist sink working and the list exported; 15 directory listings already live for two weeks; Product Hunt account aged 30+ days; the four money pages shipped; the top-20 guides curated; screenshots in the consoles; the Cookie Policy updated if analytics is on.

| Time (Pacific) | Action | Owner |
|---|---|---|
| T-7 days | Schedule the Product Hunt launch for 12:01 am. Draft the waitlist email (below). Send outreach template A to the 20 sites with "launching {date}". | owner |
| 12:01 am | Product Hunt goes live. Post the maker comment. | owner |
| 7:00 am | Waitlist email to every signup: founding members get 3 months of Pro (the homepage promise; honour it exactly), store links, PH link ("feedback welcome", no vote ask). | owner |
| 8:00 am | Show HN (`show-hn.md`). r/PFtools post (`reddit-posts.md`). | owner |
| all day | Answer every comment on PH and HN within the hour. | owner |
| 6:00 pm | Second outreach pass: reply-all to anyone who answered template A with the live links. | owner |
| next morning | Log in `GROWTH_LOG.md`: PH rank and upvotes, HN points, installs per store console, waitlist sends/opens, Vercel Analytics referrers. Numbers copied from the tools. | owner |

## Waitlist email (draft)

Subject: Zeno is live. Your 3 months of Pro are inside.

You joined the Zeno waitlist because you wanted a subscription tracker that doesn't ask for your bank login. It's on the {App Store / Play Store} today.

What it does: finds subscriptions from receipts you scan or a statement you import, warns you 7 days, 3 days and the morning before each renewal, and only calls something cancelled after the next renewal passes with no charge.

Founding members get Pro free for 3 months: {how the code/offer is redeemed; must match what RevenueCat is configured to do}.

If you have five minutes, the Product Hunt page is where feedback helps most: {link}.

{owner name}

Do not send until the redemption mechanism is confirmed working in the store; a promise that fails on day 1 is the story.

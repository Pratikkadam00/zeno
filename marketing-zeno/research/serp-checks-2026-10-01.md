# SERP checks, 2026-10-01

Method: each query was run through the session's web search tool (US results) on 2026-10-01 and the first page of results was read. No search-volume tool was available in this session; volumes are NOT stated anywhere in this folder. Demand is inferred from (a) whether Google returns a page of purpose-built results for the exact phrase and (b) who ranks. The owner can get Keyword Planner ranges (0-100 / 100-1K / 1K-10K / 10K-100K buckets, free, no campaign needed) and should paste them into `GROWTH_LOG.md`.

Verdict key: WINNABLE = page 1 is small apps, thin blogs, or forums; HARD = page 1 is official help pages plus national tech press; MIXED = both.

## Money / intent queries

| Query | Who ranks on page 1 (2026-10-01) | Verdict | Zeno page |
|---|---|---|---|
| subscription tracker without bank login | Subby (Play Store + subby.online), subremind.me, recurno.com, tracksubscriptions.com, pennyroute.com, getfinny.app blog, lowermysubs.com blog | WINNABLE. Every result is an indie tracker's own site. The exact phrase appears in three competitors' H1s, so the phrase has demand. | `/compare/no-bank-login` (exists) |
| subscription tracker app | App Store (SubList), Play Store (Subby, TrackBills), resubs.app, trackmysubs.com, tracksubscriptions.com, senticmoney.com, shopify.com blog | MIXED. Store listings own the top, then indie trackers. A 700-1,000-word money page can take a page-1 slot; store listings can't be outranked. | `/subscription-tracker` (to build) |
| budget app that doesn't connect to bank account | defineyourdollars blog, koody.com, pocketclear.app, budgetvault.app, moneypeas.app, App Store | WINNABLE. All indie blogs written for this exact phrase; none has a one-time price. | `/compare/budget-app-no-bank-sync` (exists) and `/budgeting` (to build) |
| YNAB alternative one time purchase | financialaha.com, ekspeer.com, stillwareltd.com, aitoolpick.org, budgetvault.app, envelopebudget.com, fortune.com | WINNABLE. Mostly spreadsheet sellers and small apps (Zeroed $39.99 once, Actual Budget $29 suggested). Zeno's $79.99 lifetime is pricier than those, so the page must sell the trial-to-verified-cancel loop, not the price alone. | `/compare/ynab-alternative` (exists) |
| free trial reminder app | Play Store (TrialGuard), a Chrome extension, trackallsubs.com blog, App Store (Trial Alert), generic reminder apps, appointment-reminder noise | WINNABLE and under-served. Half the page is off-topic (appointment reminders). | `/free-trial-reminders` (to build) |
| cancel subscriptions app | Play Store (SubNova, Subscription Stopper), pocketguard.com blog, Apple + Google Play official cancel pages, rocketmoney.com, App Store | MIXED. Store pages and Rocket Money hold the top; one blog slot is open. | `/cancel-subscriptions` (to build) |
| best subscription tracker apps 2026 | cnbc.com/select, resubs.app, trackallsubs.com, openpr.com, getfinny.app, aimoneyvault.app, lowermysubs.com, subsly.app | HARD for Zeno's own site; these are the OUTREACH targets (see `launch/outreach-list.md`). | none; earn a mention |

## "How to cancel X" queries (the catalog's territory)

| Query | Page 1 (2026-10-01) | Verdict | Angle that wins |
|---|---|---|---|
| how to cancel netflix subscription | help.netflix.com, Yahoo Tech, Android Police, Engadget, privacy.com blog, emma-app.com, xpendy.com, justanswer | HARD for the plain query. Indie trackers (Emma, Xpendy, Privacy.com) do hold slots. | Netflix is `dark_pattern` in the catalog; the angle is "what Netflix shows you on the way out", not the three clicks. |
| how to cancel amazon prime membership | amazon.com help, aboutamazon.com, tomsguide, techradar, justanswer | HARD. | Refund rule for unused benefits; the retention-offer sequence (catalog already has 6 steps). |
| how to cancel adobe creative cloud without fee | androidpolice, setproduct.com, shotkit.com, prodesigntools.com, resubs.app, suprascribe.com, vestelonflow.com, solidtechsky.com, Adobe community | WINNABLE. Page 1 is small blogs. The "fee" modifier is the demand. | The 14-day window, the 50 % early-termination fee, the plan-switch trick. Catalog already warns about the fee. |
| how to cancel spotify premium | support.spotify.com, community.spotify.com, justanswer, getsby.com, resubs.app, usesparrow.com, reverbico.com | MIXED. Indie trackers hold 3 slots. | Billed-through-Apple/Google trap; trial cancels immediately. |
| how to cancel chatgpt plus subscription | eskimo.travel, gmelius.com, suprmind.ai, juma.ai, cabina.ai, glbgpt.com, felloai.com, moneypilot.com, tomsguide | WINNABLE. Nine small blogs, no OpenAI page on page 1. | "Cancel on the platform you subscribed on" plus the 24-hour-before-renewal rule. Catalog step 1 says chat.openai.com; the live product is chatgpt.com. |
| how to cancel hulu subscription | a stray PDF, five justanswer pages, xpendy, goodreads spam, Yahoo | WINNABLE. Page 1 is junk. | Hulu can't be cancelled in the app, browser only; the "pause instead" offer. |
| how to cancel xbox game pass | privacy.com, dundle.com, engadget, asurion, androidpolice, gamerant, recharge.com, techradar, tomsguide | HARD (tech press). | 30-day refund rule. |
| how to cancel audible membership | help.audible.com, amazonforum, makeheadway.com, resubs.app, lovelyaudiobooks.info, technology.org, tomsguide | MIXED. | App can't cancel; credits are lost but bought titles stay. |
| how to cancel nordvpn auto renewal refund | privacy.com, engadget, gizmodo, experte.com, cloudwards, resubs.app, vpnranks, wizcase, techradar, tomsguide | HARD (VPN affiliates). | Skip for now. |
| how to cancel youtube premium | slashgear, privacy.com, yahoo, justanswer, resubs.app, seesubs blog, tomsguide | MIXED. | youtube.com/paid_memberships; pause option. |
| how to cancel peloton membership | privacy.com, support.onepeloton.com, leahingram.com, justanswer, resubs.app | WINNABLE. | Must be primary account holder; phone number 1-866-679-9129 (from Peloton's own support, read via search summary; confirm on the page before publishing). |
| how to cancel planet fitness membership | privacy.com, pocketguard, dailydot, gobankingrates, 19pine.ai, resubs.app, howtocancelplanetfitness.com | WINNABLE and NOT IN THE CATALOG. No gym chains at all in the 509 (health has Peloton, ClassPass, Equinox+). | In-person or certified mail; the annual fee date. Add Planet Fitness, LA Fitness, Anytime Fitness, 24 Hour Fitness to the catalog (owner decision; it is a code change). |

## What the pattern says

1. The plain "how to cancel {big brand}" query is owned by the brand's help page plus Tom's Guide / Engadget / Android Police. Zeno will not take #1 there with a 5-step list. The guides that rank from indie trackers (resubs.app on 7 of 13 queries, privacy.com on 6) are long, dated, and lead with the trap (fee, app-can't-cancel, billed-through-Apple).
2. The modifier queries ("without fee", "auto renewal refund", "before annual fee") are winnable and map exactly to the catalog's `hard` / `dark_pattern` ratings.
3. The money pages are all winnable or mixed. None of the current page-1 holders offers a one-time price plus a no-bank-login promise plus verified cancellation; that combination is the differentiator SEO.md §12 predicted.
4. Gyms are the biggest gap in the catalog for cancel-intent search (every "how to cancel {gym}" SERP is small blogs).

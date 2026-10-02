# Zeno — organic and paid growth plan

Written 2026-10-01 from the repo and from pages fetched in this session. Nothing in this folder touches `apps/` or `packages/`; where a step needs a code change it says "engineering" and the spec lives here for that session to pick up. Every number has a source in `research/` or `GROWTH_LOG.md`. Where a fact can go stale (prices, SERPs, whether a domain resolves) the file says when it was read.

Standing rails (from the owner's brief, binding on every file here): "No bank login required" is the required phrase. Banned anywhere: "100% on-device", "we never see your data", any automatic or background discovery claim, "no Plaid ever", invented statistics, "Most popular" or urgency badges, "encrypted sync". Every competitor claim carries the date it was verified.

---

## 0. Where we actually are (verified 2026-10-01)

| Fact | Evidence |
|---|---|
| **zeno.app is not ours.** It serves a 114-byte GoDaddy/Afternic "for sale" parking page. | `research/domain-check-2026-10-01.md` |
| The site is built (532 static pages: home, `/cancel` hub + 509 guides, 5 compare pages, 5 feature pages, legal, developers, partners) and not deployed anywhere. | `apps/web`, `ZENO_MASTER_PLAN.md` §4.1 |
| The app is pre-launch; no store listing exists; the EAS Android build quota resets 1 July 2026 per the owner's notes (re-check: that date has passed). | `docs/OPEN_ITEMS.md`, memory |
| The waitlist form fails loudly (HTTP 502) unless `WAITLIST_WEBHOOK_URL` is set in production. | `apps/web/app/api/waitlist/route.ts` |
| 305 of the 509 cancel guides are generated, not researched (F25). 53 of the 204 curated guides' links returned 404 to a logged-out visitor today. | `research/cancel-url-audit-2026-10-01.md` |
| Competitor prices on the compare pages are still correct (YNAB $109/yr, Monarch $99.99/yr). Rocket Money's price could not be read from its own site today; its Plaid dependence is quoted from its help centre. | `research/competitor-pricing-2026-10-01.md` |
| The intent queries Zeno wants are winnable: page 1 for "subscription tracker without bank login", "budget app that doesn't connect to bank account", "free trial reminder app", "YNAB alternative one time purchase" is indie apps and thin blogs. | `research/serp-checks-2026-10-01.md` |
| No analytics, no Search Console, no screenshots, no founder page, no backlinks, no directory listings, no newsletter. The legal pages promise "no analytics" today, so adding any must update the Cookie Policy first. | `apps/web/app/legal/cookies/page.tsx` §4 |

**The honest calibration from SEO.md §0 applies: a new domain needs 2-6 weeks after indexing to settle and 3-6 months to compete. "Maximum users on day 1" therefore comes from launch moments and the waitlist, not from SEO. SEO is what makes day 90 bigger than day 1.** The plan below is sequenced for both.

---

## 1. The plan, in priority order

Dates are relative to **D0 = the day the domain is chosen and DNS points at Vercel**, because nothing indexes before that. Today is 2026-10-01; if D0 is 2026-10-08, add a week to every date.

### Tier 1 — Unblock (owner, this week). Nothing else counts until these are done.

| # | What | Why | Deliverable | Who | Done when |
|---|---|---|---|---|---|
| 1.1 | **Decide the domain.** Either buy zeno.app from the Afternic listing, or pick a free name. Candidates that RDAP showed unregistered today: zenosubs.com, zenoledger.app, zenoapp.io. | Every canonical, JSON-LD `@id`, OG URL and the app's legal links are built from one env var; App Store review checks that the privacy URL resolves (COMPLIANCE.md §6). | `deploy/owner-checklist.md` step 1 | owner | `curl -sI https://<domain>` returns the Next.js site, not a parking page |
| 1.2 | **Deploy `apps/web` to Vercel** with Root Directory `apps/web`, `NEXT_PUBLIC_SITE_URL=https://<domain>`, `WAITLIST_WEBHOOK_URL=<endpoint>`. Add both apex and www; set the redirect in the Vercel dashboard (Vercel's own docs read today recommend www as primary; the repo's code redirects www to apex, so choose apex as primary in the dashboard to match the code, or ask engineering to flip the code). | ZENO_MASTER_PLAN.md 4.1 is the hard blocker. SEO.md §2.1: the host redirect must be 308 and path-preserving. | `deploy/owner-checklist.md` steps 2-5 | owner | the four curl checks in the checklist pass |
| 1.3 | **Search Console + Bing.** Add a Domain property, verify with the TXT record Google gives you, submit `/sitemap.xml`, request indexing for `/`, `/cancel`, the 5 compare pages. Then Bing Webmaster Tools, "Import from GSC". | SEO.md §10.1-10.2. Google's verification page (read today) confirms Domain properties verify by DNS TXT only. | `deploy/owner-checklist.md` steps 6-7 | owner | Pages report shows the sitemap as "Success" |
| 1.4 | **Analytics decision: Vercel Web Analytics, Hobby tier.** It is cookieless (visitors identified by a request hash discarded after 24 h), collects no personal identifier, 50,000 events/month free, and posts to the same origin so the site's `connect-src 'self'` CSP needs no change. Plausible ($9/mo for 10k pageviews) and Umami Cloud (free to 100k events) are the fallbacks if the owner prefers a non-Vercel vendor. Either way COMPLIANCE.md §8.9 requires: disclosed in the Cookie Policy before it is turned on, opt-in in the EEA. | The Cookie Policy currently says "Zeno does not run analytics on this website"; turning anything on without updating it is a truthfulness bug. | engineering spec in `deploy/owner-checklist.md` step 8 | owner decides; engineering adds the script and the policy paragraph | Vercel dashboard shows page views; Cookie Policy §4 updated in the same deploy |
| 1.5 | **Waitlist sink.** Set `WAITLIST_WEBHOOK_URL` to a Resend audience, a Zapier/Make hook, or a Google Sheet webhook. | Without it every signup is a 502. The founding-member promise on the homepage ("3 months of Pro at launch") is the day-1 acquisition offer; it needs a list to send to. | step 9 | owner | `curl -X POST /api/waitlist` returns 200 and the row appears |
| 1.6 | **Fix the three public-copy truthfulness bugs** (engineering, website only): (a) homepage Exhibit A says all 509 guides have "real, step-by-step cancellation instructions" while 305 are generic; (b) the `/cancel` hub and every guide must label the 305 generated entries honestly (OPEN_ITEMS F25: "unverified" label and no guessed link, or `noindex` until curated); (c) sitemap `lastModified` is a hard-coded 2026-06-13 for every URL (SEO.md §7.1 pitfall). | Honesty rails; YMYL trust; Google learns to ignore a lastmod that never changes. | `GROWTH_LOG.md` needs-the-owner table rows G1-G3 | owner decides F25 presentation; engineering ships | the words "verified" / "real" appear only on curated guides; sitemap dates differ per page |

### Tier 2 — Keyword architecture and the four money pages (weeks D0 to D0+3)

| # | What | Why | Deliverable | Who | Done when |
|---|---|---|---|---|---|
| 2.1 | **One page per intent**, per SEO.md §1.2 and §12. The map is in `keywords/keyword-architecture.md`: brand (homepage), five money intents (four new pages + the existing compare pages as the "complaint-language" layer), long-tail (cancel guides, then blog). | Two pages on one query cannibalise; the existing compare pages already own three intents, so the new pages take the other four. | `keywords/keyword-architecture.md` | me (done) | owner has pasted Keyword Planner ranges into `GROWTH_LOG.md` |
| 2.2 | **Build `/subscription-tracker`, `/cancel-subscriptions`, `/free-trial-reminders`, `/budgeting`.** Full copy, metadata, FAQ, JSON-LD spec and internal links are drafted in `content/money-pages/`. 700-1,000 words each, zero paragraphs shared with the homepage or each other, keyword-first titles under 60 characters, descriptions 140-160 characters (script-counted). Use `ContentShell`, `FAQ`, `JsonLd`, `ComparePageCta`; no new styling. | SEO.md §5.1: build money pages before content. The SERPs for all four were checked today and are winnable or mixed. | 4 markdown drafts, ready to port | me (drafts done); engineering ports | the pages are in `sitemap.ts` at priority 0.9, in the footer and linked from the homepage; Phase 8 curl checks pass |
| 2.3 | **Link mesh.** Footer links to every money page; each money page links 3 related cancel guides; each cancel guide links its parent money page in-body ("track it in a subscription tracker that needs no bank login" → `/subscription-tracker`). | SEO.md §5.2. The 509 guides are the biggest link reservoir on the site and today pass equity only to `/cancel`. | spec in `content/money-pages/README.md` | engineering | every page reachable in 2 clicks; no orphans |
| 2.4 | **`llms.txt` and an RSS feed** once a blog exists. | SEO.md §7.3-7.4; cheap, and answer engines cite it. | `content/llms.txt` draft | me (draft in this folder); engineering | `/llms.txt` returns 200 |

### Tier 3 — Content only Zeno can publish (weeks D0+1 to D0+8, continuous)

| # | What | Why | Deliverable | Who | Done when |
|---|---|---|---|---|---|
| 3.1 | **Curate the top 20 guides first.** Verified steps, the real cancel URL, the trap (fee, app-can't-cancel, billed-through-Apple) and the date verified, for the services whose SERP is winnable or where Zeno's catalog already rates them hard/dark-pattern. The verified data for the first batch is in `content/cancel-guides/top-20-verified.md` with the source URL for each line; six services could not be read today (Amazon help 503, Hulu/Xbox/Disney pages render client-side, HBO Max geo-blocked, Peloton support page broken) and are marked "owner/engineering to open in a browser". | F25 is a public honesty problem AND the content moat. The guides that rank from indie trackers today are long, dated, and lead with the trap. | the data file + a page template spec | me (research); engineering updates the catalog rows and the guide template | each curated guide shows "Verified {date}" from a real field, the trap paragraph, and the parent money-page link |
| 3.2 | **Guide template upgrade** (engineering spec): add `verifiedAt`, `trap`, `billedViaStores` fields; show "Difficulty" only when curated; add "What happens after you cancel" and "If you subscribed through Apple or Google" sections from data, not boilerplate; keep `HowTo` + `BreadcrumbList` JSON-LD. | Makes each page the most useful result, which is the only way past the official help page. | `content/cancel-guides/template-spec.md` | engineering | one curated guide passes the Rich Results test and reads better than resubs.app's for the same service |
| 3.3 | **Catalog gaps for cancel-intent search:** gyms (Planet Fitness, LA Fitness, Anytime Fitness, 24 Hour Fitness), none of which exist in the 509. "how to cancel planet fitness" has a page 1 of small blogs. | Highest-intent, lowest-competition cancel queries found today. | row in the needs-the-owner table | owner approves; engineering adds rows | pages live and indexed |
| 3.4 | **Blog, only with a parent money page.** First four posts, one per money page: the subscription audit checklist (parent `/subscription-tracker`), "the free trials that convert silently" (parent `/free-trial-reminders`), "cancelling is not the same as verified cancelled" (parent `/cancel-subscriptions`), "budgeting for people who refuse to link a bank" (parent `/budgeting`). Author = the Organization until a founder page exists; real publish dates from git. | SEO.md §6.2, §6.4. No data content until there are users (no invented averages). | outlines in `content/blog/outlines.md` | me (outlines); owner writes or approves drafts | each post links its parent in-body; `BlogPosting` JSON-LD dates match visible dates |
| 3.5 | **Founder/about page.** Real name, real photo, why Zeno refuses bank logins. | SEO.md §6.4: YMYL niches need a real person. The site today has "no social links pretending traction". | `content/about-page.md` brief; owner supplies the paragraph and photo | owner + engineering | `/about` live, linked from the footer and the Organization JSON-LD `founder` |

### Tier 4 — Launch assets (prepare now; fire in the launch week)

| # | What | Why | Deliverable | Who | Done when |
|---|---|---|---|---|---|
| 4.1 | **Product Hunt** listing: lifetime price as the hook, personal maker account aged 30+ days (create it now), 12:01 am Pacific, no vote asks. | ZENO_MASTER_PLAN 4.6; Product Hunt's own guide (read today): company accounts prohibited, schedule up to a month ahead, URL must not be a tracking link. | `launch/product-hunt.md` | me (draft); owner posts | listed; first comment posted; every comment answered same day |
| 4.2 | **Reddit, disclosed.** r/PFtools allows a single pitch post; r/personalfinance bans vendor promotion (verified from secondary sources today; reddit.com itself is blocked from this session, so the owner must read each community's rules page before posting). Drafts for r/PFtools, a comment-only playbook for r/ynab and r/privacy threads. | The audience detects astroturfing and it becomes the story. | `launch/reddit-posts.md` | owner reads rules, posts | posts stay up 48 h; replies answered |
| 4.3 | **Show HN** the day the APK/TestFlight is installable (Show HN rules read today: must be something people can try, no sign-up walls, no landing pages). | HN is the one community where "local-first, SQLCipher, no bank login, CSV-first" is the whole pitch. | `launch/show-hn.md` | owner | post live with a maker comment |
| 4.4 | **Directories:** AlternativeTo (account must be 7 days old; create now), SaaSHub (free, alternatives section), Product Hunt, plus the finance-tool pages. Entries drafted with the exact fields each form asks for. | SEO.md §10.5: 15-20 live listings are the first backlinks a new domain gets. | `launch/directories.md` | me (drafts); owner submits | 15 listings live, each linking the canonical host |
| 4.5 | **Outreach list of 20** sites that published subscription-tracker roundups this year, found live today, each with the angle and whether it is a competitor (competitors are listed so they are NOT pitched). | A mention in CNBC Select or Tom's Guide outranks every directory link. | `launch/outreach-list.md` | me (list + two email templates); owner sends | 20 sent, replies logged |
| 4.6 | **Day-1 stack.** The waitlist email (founding members, 3 months Pro, store links), PH, Show HN, r/PFtools, the directory links already live, the outreach emails sent the morning of. | Everything that can produce installs on day 1 is a human moment, not a ranking. | `launch/day-1-runbook.md` | owner | installs counted from the store consoles the next morning |

### Tier 5 — Store listing (owner captures; before submission)

| # | What | Why | Deliverable | Who | Done when |
|---|---|---|---|---|---|
| 5.1 | `store-listing.md` re-checked against limits read today: Apple name 30 / subtitle 30 / keywords 100 / promotional 170 / description 4000; Play title 30 / short 80 / full 4000. All fields are within limits. Three wording fixes proposed. | Limits can change; they were last checked in July. | `store/store-listing-check.md` | me (done); owner edits the file in `apps/mobile` via engineering | fields pasted into the consoles |
| 5.2 | **Screenshot set, 8 frames,** planned from real screens, captured on the release APK / iOS simulator at the sizes Apple lists today (1290×2796 or 1320×2868 for 6.9"; up to 10 per device) and Play's 1080 px minimum, 16:9 or 9:16, plus a 1024×500 feature graphic. | No screenshots exist; the app has no store build yet. | `store/screenshot-plan.md` | owner captures; design overlays per the design system | 8 PNGs per platform in the consoles |

### Tier 6 — Ads, last (not before Tiers 1-3 are live)

| # | What | Why | Deliverable | Who | Done when |
|---|---|---|---|---|---|
| 6.1 | A **Google Search exact-match test** on the intent terms, landing on the matching compare page, $10/day for 14 days, with a written stop rule. Google's financial-services certification list read today covers credit, loans, insurance, securities and crypto; a budgeting app is not on it, but the owner must confirm on the policy page before spending. | Paid is a lever only once the pages convert; the test tells us the real CPC and the conversion rate of the pages. | `ads/search-test.md` | owner | the stop rule fires or 14 days pass; results in `GROWTH_LOG.md` |
| 6.2 | Apple Ads Basic as the day-1 install channel if budget allows (install-intent search "subscription tracker" in the App Store). Figures read today are third-party ($100 starter credit, CPI benchmarks) and must be confirmed in the console. | Store search is where "subscription tracker app" demand actually converts. | same file, §2 | owner | — |

---

## 2. How we will know it worked

| Horizon | Signal | Where to read it |
|---|---|---|
| D0+1 week | sitemap accepted; homepage + compare pages indexed (Pages report) | Search Console |
| D0+2 weeks | brand query "zeno subscription tracker" shows the site at #1 | Search Console Performance, query filter |
| D0+4 weeks | 15 directory links live; first impressions on the four money queries | GSC Performance, Links report |
| Launch day | waitlist emails sent; PH/HN/Reddit live; store installs > 0 | consoles, Vercel Analytics referrers |
| D0+12 weeks | at least one money page with impressions at position 5-15 to strengthen (SEO.md §10.3 ritual) | GSC |
| Monthly | `GROWTH_LOG.md` entry with every number copied from the tool, never estimated | this folder |

---

## 3. What this plan refuses to do

- No invented averages ("the average person wastes $X"). Data content waits for anonymised numbers from real users.
- No "verified" label on the 305 generated guides, and no "509 verified guides" anywhere, until F25 is fixed.
- No Family plan in marketing copy until OPEN_ITEMS F96 is decided (Family currently sells nothing beyond Pro).
- No free-trial promise in web or store copy (the paywall promises a trial only when the store offers one).
- No posting to any community by this session. Drafts only; the owner posts under their own name with disclosure.

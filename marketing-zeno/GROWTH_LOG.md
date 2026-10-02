# Zeno — Growth Log

Kept like `docs/HARDENING_LOG.md`: dated entries, every number copied from a tool result named next to it, nothing estimated. The plan is `MARKETING_ZENO.md`. Code is never edited from this folder; items that need code go to the engineering session via the table below.

Legend: `[x]` done and verified · `[~]` in progress · `[ ]` not started · `[!]` blocked (reason given)

---

## Tracker

- [~] **Tier 1 — Unblock** (all owner actions; `deploy/owner-checklist.md`)
  - [!] 1.1 Domain: zeno.app is parked for sale (verified 2026-10-01); owner must buy it or pick another
  - [ ] 1.2 Vercel deploy with `NEXT_PUBLIC_SITE_URL`, `WAITLIST_WEBHOOK_URL`; 308 www→apex verified by curl
  - [ ] 1.3 Search Console (DNS TXT) + sitemap + Bing import
  - [ ] 1.4 Analytics: Vercel Web Analytics recommended; Cookie Policy §4 must change in the same deploy (engineering)
  - [ ] 1.5 Waitlist webhook set and tested
  - [ ] 1.6 Public-copy truthfulness fixes G1-G3 (engineering, after owner decides F25)
- [~] **Tier 2 — Keyword architecture + money pages**
  - [x] 2.1 Keyword map written, SERPs checked live (`keywords/`, `research/serp-checks-2026-10-01.md`); owner to add Keyword Planner ranges
  - [x] 2.2 Four money-page drafts written and script-checked (entry 2026-10-02); engineering to port
  - [ ] 2.3 Link mesh (spec in `content/money-pages/README.md`)
  - [ ] 2.4 `llms.txt` (draft in `content/llms.txt`), RSS with the first post
- [~] **Tier 3 — Content**
  - [~] 3.1 Top-20 guide curation: 7 of 20 verified from the services' own pages; 13 need a human browser (`content/cancel-guides/top-20-verified.md`)
  - [ ] 3.2 Guide template upgrade (spec written)
  - [ ] 3.3 Gym chains added to the catalog (owner decision G5)
  - [ ] 3.4 Blog posts (outlines written)
  - [ ] 3.5 Founder page (brief written; owner supplies facts)
- [~] **Tier 4 — Launch assets**: PH, Reddit, Show HN, directories, outreach list, day-1 runbook all drafted; owner posts
- [x] **Tier 5 — Store listing**: limits re-checked 2026-10-01; all fields within limits; 3 wording notes for engineering
- [ ] **Tier 6 — Ads**: test designed with stop rules; gated on Tiers 1-3

---

## Needs the owner

| # | Decide / do | Options (my suggestion first) | Why | Where |
|---|---|---|---|---|
| G0 | **The domain.** Do you own zeno.app? It serves a GoDaddy/Afternic "for sale" page. | (a) buy it from the listing; (b) register one RDAP showed free on 2026-10-01: zenosubs.com, zenoledger.app, zenoapp.io; (c) another name | Every URL on the site and the app's legal links derive from it; App Store review checks the privacy URL. Nothing indexes until this is done. | `research/domain-check-2026-10-01.md` |
| G1 | Homepage Exhibit A caption says all 509 services come "each with real, step-by-step cancellation instructions"; 305 have generic steps (F25). | (a) compute the curated count and say "{n} with verified, step-by-step instructions"; (b) drop the clause | Honesty rail; it is the first number a visitor reads. | engineering: `apps/web/components/site/sections.tsx` |
| G2 | F25 presentation for the 305 generated guides (already in OPEN_ITEMS). | (a) "General steps, not yet verified" label, homepage link instead of the guessed `/account` path, keep indexed; (b) `noindex` until curated | 305 public pages say "difficulty: medium" as fact. | `content/cancel-guides/template-spec.md` |
| G3 | Sitemap `lastModified` is a fixed 2026-06-13 for all 527 URLs. | use commit dates / `verifiedAt` per URL | SEO.md §7.1: Google learns to ignore a lastmod that never changes. | engineering: `apps/web/app/sitemap.ts` |
| G4 | 53 of the 204 curated cancel URLs returned 404 to a logged-out visitor on 2026-10-01 (list in the entry below). | a human opens each with the table in `top-20-verified.md`; fix or mark auth-gated | Even the curated half cannot be called "verified" until then. | `research/cancel-url-audit-2026-10-01.md` |
| G5 | Add gym chains (Planet Fitness, LA Fitness, Anytime Fitness, 24 Hour Fitness) to the catalog. | yes | "how to cancel planet fitness" page 1 is small blogs; no gyms exist in the 509. | engineering: catalog rows |
| G6 | Analytics vendor. | (a) Vercel Web Analytics Hobby: cookieless, 50k events/mo free, no CSP change; (b) Plausible $9/mo; (c) Umami Cloud free tier | COMPLIANCE.md §8.9: disclose first, opt-in in EEA. The Cookie Policy currently says "no analytics". | `deploy/owner-checklist.md` §8 |
| G7 | Store copy wording (3 notes). | "No bank login required." instead of "No bank login, ever." in the Play short description; add "and the day of" to the reminder line; keep "verified" out | F45 (Plaid dormant) and accuracy. | `store/store-listing-check.md`; file lives in `apps/mobile` |
| G8 | Rocket Money price on `/compare/rocket-money-alternative`. | (a) keep "$7-14/mo" with a footnote citing CNBC Select / Greenlight reviews; (b) drop the number | Rocket Money's own premium page could not be read on 2026-10-01 (redirects to the app). The Plaid claim is verified from their help centre. | `research/competitor-pricing-2026-10-01.md` |
| G9 | Compare-page footnotes "verified July 2026" → "verified 1 October 2026" for YNAB and Monarch. | update | Both prices re-verified today and unchanged. | engineering: 2 page files |
| G10 | Keyword Planner ranges for the 9 money queries. | create a Google Ads account (no campaign, no card needed per guides read today), paste the buckets here | No volume tool was available in this session. | `keywords/keyword-architecture.md` |
| G11 | Reddit rules. | open reddit.com/r/{PFtools, ynab, privacy, androidapps}/about/rules and paste the self-promotion rule here before posting | reddit.com is blocked from this session. | `launch/reddit-posts.md` |
| G12 | Family plan in marketing. | keep it out of every page and listing until OPEN_ITEMS F96 is decided | Family currently sells nothing beyond Pro. | — |
| G13 | Founder page facts: name, photo, origin paragraph, entity, city. | send them | YMYL trust (SEO.md §6.4). | `content/about-page.md` |
| G14 | Mobile `apps/mobile/src/config/site.ts` default host must change with the domain. | add to `docs/OPEN_ITEMS.md` for the hardening session | Not this session's file. | — |

---

## Entries

### 2026-10-01 — Session start: read, verify, plan

**Read:** `SEO.md` (445 lines), `ZENO_MASTER_PLAN.md` (323), `COMPLIANCE.md` (161), `apps/mobile/store-listing.md` (81), `docs/OPEN_ITEMS.md` (125), `apps/web/app/**` (19 `page.tsx`), `apps/web/lib/site.ts`, `next.config.ts`, `sitemap.ts`, `robots.ts`, `faq-data.ts`, `sections.tsx`, `packages/service-catalog/src/services.ts`, the design-system blueprint.

**zeno.app today:**
```
curl -s -D - https://zeno.app      → HTTP/1.1 200, Content-Length: 114, body redirects to /lander
curl -s -D - https://zeno.app/lander → HTTP/1.1 307, Location: https://forsale.godaddy.com/forsale/zeno.app?...
```
RDAP via rdap.org (followed): zeno.app registered, status active, expires 2027-09-23. Candidate check: zenosubs.com, zenoledger.app, zenoapp.io returned RDAP 404 (no record); getzeno.app, zenoapp.com, usezeno.com, zeno.money, zenoledger.com, tryzeno.app, honestledger.app, zeno.finance all registered.

**Catalog counts (node over `services.ts`):** 204 `requestedRows` (curated) + 305 `expansionRows` (generated) = 509. 39 slugs have hand-written `guideOverrides`; the other 165 curated rows use `defaultCancelGuide(name)`. Curated rows by category: streaming 20, ai_tools 39, productivity 40, gaming 15, health 20, finance 15, education 20, music 15, cloud 8, security 12.

**Curated cancel-URL fetch** (`curl -L`, Chrome UA, 12 parallel): 200 ×122, 302 ×1, 401 ×2, 403 ×22, 404 ×53, 406 ×2, 429 ×1, 000 ×1. The 53 × 404: accounts.nintendo.com/subscription, app.copy.ai/account/billing, app.hey.com/account/billing, app.pluralsight.com/id/settings/billing, app.supabase.com/account/billing, bandcamp.com/account_settings, bumble.com/en/subscription, copilot.money/settings, eightsleep.com/account, framer.com/account/billing, get.mem.ai/settings, github.com/settings/billing, hinge.co/settings, home.personalcapital.com/app/settings, liveone.com/account, members.onepeloton.com/profile/billing, my.babbel.com/subscription, my.zwift.com/profile/subscription, readwise.io/accounts/settings, slack.com/intl/en-us/help/articles/billing-cancel, speechify.com/account, substack.com/account/billing, watch.sling.com/account, amazon.com/kindle-dbs/submanager, amazon.com/settings/musicsubscriptions, beatport.com/my-beatport/settings, betterment.com/app/settings/billing, carbonite.com/account, datacamp.com/settings/subscription, descript.com/account/billing, ea.com/ea-play/cancel, experian.com/membership, future.co/account, headspace.com/account, identityguard.com/account, idrive.com/account, lifelock.com/my-account, loom.com/looms/settings/account, max.com/account/subscription, myfitnesspal.com/account/manage_subscription, nike.com/membership/cancel, notion.so/profile/billing (×2 rows), nvidia.com/en-us/geforce-now/my-account, playstation.com/en-us/playstation-plus/manage, quicken.com/support/cancel, roblox.com/settings, rosettastone.com/account, skillshare.com/settings/membership, strava.com/settings/subscription, synthesia.io/account/billing, webull.com/account, weightwatchers.com/us/account. Reproduce: extract column 4 of `requestedRows`, `xargs -P 12 curl -s -o /dev/null -w '%{http_code}' -L --max-time 15 -A '<Chrome UA>'`.

**Competitor pages read:** ynab.com/pricing ($14.99/mo, $109/yr, 34-day trial, no lifetime); monarch.com/pricing in the browser pane (Core $99.99/yr, Plus $199.99/yr, 7-day trial with card, "Connect to 13,000+ banks"); help.rocketmoney.com article 931156 ("We rely on our secure linking provider, Plaid to support bank connections."); rocketmoney.com/premium redirects to app.rocketmoney.com and shows only "Please use the Rocket Money mobile app". Details: `research/competitor-pricing-2026-10-01.md`.

**SERPs run (US):** 7 money queries, 13 "how to cancel" queries. Verdicts in `research/serp-checks-2026-10-01.md`.

**Official cancel pages read:** Netflix (help node 407), Spotify (cancel-premium), Adobe (cancel-adobe-subscription, in the browser pane; page dated 2026-07-24), YouTube (answer 6308278), Audible (cancel-membership), Apple (118428). Failed: Amazon help 503; OpenAI help 403; Hulu, Xbox, Disney+ help pages render client-side (empty); NordVPN article 404; HBO Max help geo-redirected; Peloton support "CSS Error"; Planet Fitness FAQ 403; Paramount+ article 404.

**Platform docs read:** Vercel add-a-domain and deploying-and-redirecting (dashboard redirect; Vercel recommends www primary; the repo's code redirects www→apex); Vercel Web Analytics privacy (no cookies, 24-hour hash, data points listed) and pricing (Hobby 50,000 events/month, Pro $0.03 per 1K); Google Search Console verification (Domain property = DNS TXT or CNAME only); Apple product page (name 30, subtitle 30, promo 170, keywords 100, 10 screenshots, 3 previews), App Store Connect reference (promo 170, description 4000, keywords 100 bytes), Apple screenshot specs (6.9": 1260×2736 / 1290×2796 / 1320×2868; 1-10 per device; iPad 13" required if the app runs on iPad); Google Play listing help (title 30, short 80, full 4000) and preview assets (min 2 screenshots, 4 at 1080 px for large-format, feature graphic 1024×500); Product Hunt launch guide (company accounts prohibited; 12:01 am PT; schedule up to 1 month; no shortened/UTM URLs); Show HN rules.

**Blocked from this session:** reddit.com (browser pane refused the host); search summaries only for subreddit rules.

**Written:** `MARKETING_ZENO.md`, `deploy/owner-checklist.md`, `keywords/keyword-architecture.md`, `research/*` (4 files), `content/cancel-guides/top-20-verified.md` + `template-spec.md`, `launch/*` (6 files), `store/*` (2), `ads/search-test.md`, `content/blog/outlines.md`, `content/llms.txt`.

### 2026-10-02 — Money pages drafted and script-checked

Four drafts in `content/money-pages/`. Measured with node over the files (title = bare title + ` | Zeno`; description = the string in the metadata block; words = body between "## Copy" and "### Related guides", markdown stripped):

| Page | Title chars | Description chars | Body words |
|---|---|---|---|
| subscription-tracker | 52 | 157 | 732 |
| cancel-subscriptions | 60 | 155 (trimmed from 164) | 757 |
| free-trial-reminders | 56 | 157 | 712 |
| budgeting | 52 | 155 (trimmed from 165) | 705 |

All within SEO.md limits (title ≤60, description 140-160, body 700-1,000). Banned-phrase grep over the folder: hits only in the three sentences that list the banned phrases.

Also written: `content/money-pages/README.md` (porting rules + link mesh), `content/about-page.md`, this log, `README.md`.

Next: owner answers G0 (the domain). Then engineering ports Tier 2 and fixes G1-G3; owner runs `deploy/owner-checklist.md`.

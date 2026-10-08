# Website tracker

The live tracker for `docs/WEB_PLAN.md`. One row per check. A row moves to **pass** only
with its evidence named (a test, a script's saved output, a file in `docs/web-evidence/`,
a measurement); a **fail** names its finding (F‹n›) and moves to pass when the fix is
proven. Order of work: W1, W3, W2, W4, W5, W6, W7, W8.

**Status:** ⬜ to do · 🔄 in progress · ✅ pass · ❌ fail (finding open) · 🔒 needs the owner
· ⏸ blocked (says why)

**Summary (2026-10-09):** 69 checks. 34 done (W1 and W4 complete; W3 all but the contact page; W2 all but the browser measurement and the lawyer); 9 need the owner (🔒); 1 blocked on the owner's mail set-up (⏸); the rest are mine.

---

## W1 · Voice

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W1.1 | Copy lint test written: em dashes, banned phrases, placeholders, sentence length, first heading; fails on today's site (bite check) | ✅ | `apps/web/app/copy-lint.test.tsx`, 22 tests; on the 2026-10-08 site 10 rules failed (dashes on 19 pages, 'take back' on 533, 'the honest way', 'we mean it', 'who refuse', 'THE CASE', 2 long sentences, 4 weak h1s) |
| W1.2 | Home: hero rewritten | ✅ | `Hero.tsx`; lint green; `Hero.test.tsx` |
| W1.3 | Home: the four sections (case, method, refusal, bill) rewritten as plain sections | ✅ | `sections.tsx` (catalogue, how it works, bank login); labels in `page.tsx` and `pen.tsx`; `sections.test.tsx` |
| W1.4 | Home: pricing copy rewritten; every plan line matches the app and the store products | ✅ | `sections.tsx` PLANS; prices pinned by `seo.test.tsx` to the app's offers |
| W1.5 | Home: FAQ rewritten; answers checked against the app | ✅ | `faq-data.ts`; `layout-and-home.test.tsx` (FAQPage JSON-LD) |
| W1.6 | Footer tagline and footer copy rewritten (every page) | ✅ | `Footer.tsx`, `ComparePageCta.tsx`; lint green on all 537 pages |
| W1.7 | The five compare pages rewritten; competitor facts re-checked with the date | ✅ | 5 pages; YNAB $109/yr and Monarch $99.99/yr read from their pricing pages on 2026-10-08; an unverifiable Monarch CSV claim removed; `truthfulness.test.tsx` |
| W1.8 | Features hub, cancel hub, blog index, 404 rewritten | ✅ | cancel hub lead rewritten; features hub, blog index and 404 pass the lint unchanged |
| W1.9 | Landing pages: light pass | ✅ | pass the lint unchanged (already in the voice) |
| W1.10 | Blog posts: light pass | ✅ | pass the lint unchanged |
| W1.11 | Truthfulness rail extended to the rewritten copy | ✅ | `truthfulness.test.tsx` pins updated to the new sentences (reminders, F166 wording, guides, privacy events, Monarch) |
| W1.12 | Copy lint green on GitHub; every page read aloud once, nothing template-like | ✅ | GitHub: every check green for 6fb0c9f (CI, CodeQL, gitleaks, semgrep, ZAP); every page's rendered text was read during the rewrite; the owner's own read is welcome |

## W2 · Legal

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W2.1 | D18: the legal entity (name, form, country, address) | ✅ | D18 decided by the owner 2026-10-08: the name Zeno, no address; written into the Terms, the privacy policy and /about |
| W2.2 | D19: governing law and venue | ✅ | D19: India, with consumers keeping their own country's protection (the owner left the wording to me, 2026-10-08); Terms §14; the lawyer confirms (W2.9) |
| W2.3 | Terms rewritten to the plan's list; billing section equals the pricing table | ✅ | `app/legal/terms/page.tsx`, 16 sections; plan list and prices pinned to the pricing section by `legal-agreement.test.tsx` |
| W2.4 | Apple's required EULA clauses and Google Play terms present | ✅ | Terms §11 (Apple's minimum EULA terms: no Apple obligation, warranty refund, claims, export compliance, third-party beneficiary; Google likewise) |
| W2.5 | Privacy policy rewritten: controller, purposes with bases, retention per category, providers with location, transfers, rights with deadline, EU/UK and California, children | ✅ | `app/legal/privacy/page.tsx`, 16 sections; retention from the API's constants, providers from the code, data items from `docs/STORE_DATA_SAFETY.md` |
| W2.6 | Cookie policy checked against what the site actually stores (measured in a browser) | 🔄 | the text is true to the code (`truthfulness.test.tsx`: no cookie API used, one localStorage key); the browser measurement of what is stored is W7 |
| W2.7 | Test: legal pages agree with the pricing table, the provider list in code, and the data-safety draft | ✅ | `app/legal/legal-agreement.test.tsx`, 14 tests: plans, prices, household size, token lifetimes, providers, the coach stores nothing, export and deletion, data-safety list |
| W2.8 | Test: no "draft", "to be confirmed", "at launch" in the legal pages; dates set by content | ✅ | same test: no 'draft', 'to be confirmed', 'finalised at launch', 'pre-launch notice'; bite-checked (a 'draft' inserted in the Terms failed it); dates set 2026-10-08 |
| W2.9 | Lawyer's review | 🔒 | OWNER_GUIDE step 13 |

## W3 · Pages

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W3.1 | About page | ✅ | `app/about/page.tsx` (who, why, how built, how paid for, what it is not, reach us) |
| W3.2 | Contact page with the four addresses | ⏸ | F223: the addresses bounce until the owner sets up mail |
| W3.3 | D20: the six planned-feature pages folded into one Roadmap page (recommended) or kept | ✅ | D20 recommended and taken: `app/roadmap/page.tsx`; the five addresses 308 to /roadmap (`next.config.ts`; `every-route.spec.ts` checks each) |
| W3.4 | Sample ledger dates computed from today; catalogue date computed; competitor-price dates with a 90-day test | ✅ | relative days in the sample ledger; catalogue cite computed; competitor dates re-read 2026-10-08; `app/dates.test.tsx` fails on any typed date older than 90 days |
| W3.5 | Footer: entity line, computed year | ✅ | year computed (`Footer.tsx`); the entity line is the name Zeno, nothing more (D18) |
| W3.6 | Byline and updated date on every post | ✅ | `blog/[slug]/page.tsx`: 'By Zeno · date · updated date · read time'; `updated` on a post sets dateModified |
| W3.7 | Test: every sitemap page has 150+ words of its own and a next step | ✅ | `app/substance.test.tsx`: 150 words of its own, one h1, a link onward on every page; guides held at the measured floor of 49 words |
| W3.8 | Test: no date on the site older than 90 days except publication dates | ✅ | `app/dates.test.tsx` (90 days; publication dates exempt; no future dates; at most 6 typed dates on the site) |

## W4 · Blog and images

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W4.1 | Image pipeline: SVG source → WebP at two sizes with sharp; a script and a test | ✅ | `scripts/site-art.ts`: SVG drawn in code, palette read from `globals.css`, sharp renders WebP at 1200 and 600 wide; sources committed beside the renders; `app/art.test.tsx` |
| W4.2 | Hero and one figure for each of the four posts, drawn in code, alt text | ✅ | 8 posts × (hero + figure), 16 drawings; data figures computed from the catalogue; every alt text 10+ words (tested) |
| W4.3 | Per-post OG images generated | ✅ | `public/og/blog-<slug>.png` for every post, title filled from the catalogue figures; 1200 × 630 (tested) |
| W4.4 | OG images for the home, landing and compare pages | ✅ | 21 pages in `lib/og-pages.ts` (home, 4 landings, features ×3, roadmap, about, compare ×6, cancel hub, blog, legal ×3); card title = the page's h1 (tested); `lib/seo.ts` picks the page's card |
| W4.5 | Four new posts written from catalogue data, dates spread | ✅ | `app/blog/posts-2026-10.ts`: hardest to cancel, what a subscription costs, easy or hard by category, website or app store; figures as {TOKEN}s and service lists built from the catalogue; dated 2026-10-08 (a future date is a lie the dates test refuses) |
| W4.6 | Reading time, author, updated date on posts | ✅ | 'By Zeno · date · updated · N min read' (W3.6); `updated` sets dateModified |
| W4.7 | RSS feed validates (W3C validator result saved) | ✅ | W3C feed validator on the live feed, 2026-10-08: valid, 0 errors, 0 warnings (`docs/web-evidence/feed-validation-2026-10-08.txt`); the W4 posts use the same template |
| W4.8 | Test: every post has a hero and a figure under 120 KB with alt text; every page its own OG image | ✅ | `app/art.test.tsx`: hero + figure per post, WebP < 120 KB at both widths with SVG source, no external reference in any SVG, every page and post has its own 1200 × 630 card |

## W5 · SEO

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W5.1 | OG and Twitter cards checked in the validators, one per template | ⬜ | |
| W5.2 | JSON-LD per template checked in the Rich Results test | ⬜ | |
| W5.3 | Breadcrumbs on guides and posts | ⬜ | |
| W5.4 | FAQ schema on landing pages with FAQs | ⬜ | |
| W5.5 | Internal links tested: posts → two guides + one landing; guides → hub + three neighbours | ⬜ | |
| W5.6 | `llms.txt` tested against the sitemap | ⬜ | |
| W5.7 | Search Console: sitemap submitted, coverage report saved | 🔒 | owner; report to `docs/web-evidence/` |
| W5.8 | Bing imported from Search Console | 🔒 | owner |
| W5.9 | D16 trigger watched (general guides in "Crawled, not indexed") | ⬜ | re-read early December |

## W6 · Performance and technical

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W6.1 | Lighthouse mobile and desktop on one page per template; scores saved | ⬜ | |
| W6.2 | Playwright vitals assertions made hard | ⬜ | |
| W6.3 | Font subsetting and preload checked | ⬜ | |
| W6.4 | HTML validated on every template | ⬜ | |
| W6.5 | Link checker, internal and external, nightly | ⬜ | |
| W6.6 | No console errors on any page | ⬜ | |
| W6.7 | Caching headers for static assets | ⬜ | |
| W6.8 | Print stylesheet for guides and posts | ⬜ | |

## W7 · Testing the presentation

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W7.1 | Spell check in CI with a project dictionary | ⬜ | |
| W7.2 | Visual baselines, every template, light and dark, phone and desktop | ⬜ | = U2.6 |
| W7.3 | Firefox project | ⬜ | = U5.7 |
| W7.4 | WebKit project | ⬜ | = U5.8 |
| W7.5 | Keyboard-only through every page | ⬜ | = U3.8 |
| W7.6 | 200 % zoom | ⬜ | = U3.9 |
| W7.7 | Forced colours | ⬜ | = U3.13 |
| W7.8 | Waitlist end to end: the row lands in the sheet; what the sign-up sees | 🔒 | needs read access to the owner's sheet |
| W7.9 | Theme toggle; external links `rel="noopener"` in a new tab | ⬜ | |

## W8 · Launch readiness

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W8.1 | D21: waitlist double opt-in (recommended: confirmation email via Resend) | 🔒 | owner decision; then I build it |
| W8.2 | Analytics decision recorded (none today; if ever, cookieless and self-hosted) | 🔒 | owner decision |
| W8.3 | Press kit page | ⬜ | needs W4 images |
| W8.4 | Social profiles claimed, linking here | 🔒 | owner |
| W8.5 | Uptime monitor extended to the website | 🔒 | owner, with OWNER_GUIDE step 9 |
| W8.6 | OWNER_GUIDE updated with the website steps | ⬜ | |

---

## Findings from this plan

| # | Finding | Severity | Status |
|---|---|---|---|
| F224 | Dates typed into the site went stale: the sample ledger renewed in July and August while it was October; the catalogue was cited as July 2026; competitor prices 'verified July 2026' | Medium (trust) | Fixed 2026-10-08: relative days, computed cite, prices re-read with the date; the 90-day test is W3.8 |
| F225 | The Terms described Pro as 'advanced discovery, deeper insights, and cancellation guides' and listed a Business tier for sale; the pricing sells Pro as unlimited subscriptions plus two budgeting features, guides free, and no Business plan | High (a contract term contradicting the price list) | Fixed 2026-10-08 in the plan list; the test that the legal pages agree with the pricing is W2.7 |
| F226 | The site's own voice: 227 em dashes, a courtroom metaphor on the home page, self-praise ('the honest way', 'priced like we mean it') | Medium (reads as template or machine-written) | Fixed 2026-10-08 (W1); locked by the copy lint |

## Log

**2026-10-09:** W4. Sixteen pictures drawn in code (`scripts/site-art.ts`) and rendered to WebP, a share card per page from one table of titles held equal to the pages' h1s, heroes and figures on all eight posts, four new posts written from the catalogue's data with every figure a token filled at render, and the feed validated at the W3C.

**2026-10-08, night:** W3 and W2. The five placeholder pages became /roadmap with permanent redirects; /about written; Family Vault and Spend Twin written from the server's and app's rules; the features hub and compare pages filled out; bylines; three new tests (dates, substance, legal agreement). The Terms and privacy policy rewritten in full with Zeno as the operator and India's law; the cookie policy's draft notes removed.

**2026-10-08, evening:** W1 done except the GitHub read. The lint was written first and failed on the old site on 10 of its rules (the bite check); the home page, compare pages, feature pages, cancel hub, legal pages and the shared call to action were rewritten until it passed; 13 tests that pinned the old sentences were updated. Three findings: F224 stale dates, F225 Terms against pricing, F226 the voice itself.

**2026-10-08:** plan and tracker written from a measured baseline: 227 em dashes, the
home page's trial-metaphor copy, stale July dates in the sample ledger and catalogue
citation, Terms that contradict the pricing and name no entity or law, six planned-feature
pages, no About, no bylines, no images, vitals asserted softly, Lighthouse never run.

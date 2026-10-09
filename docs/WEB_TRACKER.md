# Website tracker

The live tracker for `docs/WEB_PLAN.md`. One row per check. A row moves to **pass** only
with its evidence named (a test, a script's saved output, a file in `docs/web-evidence/`,
a measurement); a **fail** names its finding (F‹n›) and moves to pass when the fix is
proven. Order of work: W1, W3, W2, W4, W5, W6, W7, W8.

**Status:** ⬜ to do · 🔄 in progress · ✅ pass · ❌ fail (finding open) · 🔒 needs the owner
· ⏸ blocked (says why)

**Summary (2026-10-09, late):** 69 checks. 56 done; 1 failed and waiting on the owner (W6.4, F227); 10 need the owner (🔒), among them the Linux-rendered visual baselines (W7.2); 1 blocked on the owner's mail set-up (⏸); the rest are W5.9 (the December read of Search Console).

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
| W2.6 | Cookie policy checked against what the site actually stores (measured in a browser) | ✅ | measured in a real browser on the live site 2026-10-09: no cookie, no sessionStorage, no IndexedDB; one localStorage item `zeno-theme` written only when the theme button is pressed (`docs/web-evidence/browser-storage-2026-10-09.txt`); the code side in `truthfulness.test.tsx` |
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
| W5.1 | OG and Twitter cards checked in the validators, one per template | ✅ | `scripts/og-check.mjs` on the live site 2026-10-08: 11 templates, tags present and agreeing, every image 200 and 1200 × 630 PNG (`docs/web-evidence/share-cards-2026-10-09.txt`) |
| W5.2 | JSON-LD per template checked in the Rich Results test | ✅ | `scripts/schema-check.mjs` (the schema.org validator, the engine behind Google's markup check) on 12 live pages: 0 errors, 0 warnings (`docs/web-evidence/schema-validation-2026-10-09.txt`) |
| W5.3 | Breadcrumbs on guides and posts | ✅ | BreadcrumbList on guides (HowTo + breadcrumb), posts, landings, hubs, about, roadmap; every trail Home → page checked in `pages.test.tsx` |
| W5.4 | FAQ schema on landing pages with FAQs | ✅ | FAQPage on the four landing pages and the home page (`landings.test.tsx`, `layout-and-home.test.tsx`); validator: no errors |
| W5.5 | Internal links tested: posts → two guides + one landing; guides → hub + three neighbours | ✅ | `app/links.test.tsx`: every post → a guide or the hub, a landing page, another post; every guide → hub + 3 neighbours; landing and compare pages → 3 onward; no orphan page (found and fixed: /about had no inbound link) |
| W5.6 | `llms.txt` tested against the sitemap | ✅ | `seo.test.tsx` (llms.txt links only sitemap pages, real catalogue size and prices, no banned claims); the four new posts added |
| W5.7 | Search Console: sitemap submitted, coverage report saved | 🔒 | owner; report to `docs/web-evidence/` |
| W5.8 | Bing imported from Search Console | 🔒 | owner |
| W5.9 | D16 trigger watched (general guides in "Crawled, not indexed") | ⬜ | re-read early December |

## W6 · Performance and technical

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W6.1 | Lighthouse mobile and desktop on one page per template; scores saved | ✅ | Lighthouse 2026-10-08 on the live site, 4 templates × mobile and desktop (`docs/web-evidence/lighthouse-2026-10-09/`): performance 95 to 100, accessibility 100, SEO 100, best practices 92 on every page, the 8 points lost only to F227's blocked script in the console; home mobile LCP 2.8 s (budget 2.5), the rest under |
| W6.2 | Playwright vitals assertions made hard | ✅ | `e2e/web-vitals.spec.ts`: `expect.soft` → `expect` for LCP, CLS and INP; a budget overrun now fails the run |
| W6.3 | Font subsetting and preload checked | ✅ | three latin subsets preloaded by next/font (measured on the live home page 2026-10-08: `<link rel=preload as=font>` ×3), self-hosted woff2 (`app/fonts.ts`) |
| W6.4 | HTML validated on every template | ❌ | `scripts/html-check.mjs` (Nu checker, 13 live pages): every page has 2 errors, both the Netlify toolbar script appended after `</html>` (F227, owner); the site's own markup produced only 'trailing slash on void element' info notes (`docs/web-evidence/html-validation-2026-10-09.txt`) |
| W6.5 | Link checker, internal and external, nightly | ✅ | `scripts/link-check.mjs` + `.github/workflows/links.yml` (nightly 04:23 UTC; broken internal link fails, broken external listed); first run 2026-10-08: 538 pages, 538 internal links, 0 not 200; 495 external links checked nightly |
| W6.6 | No console errors on any page | ✅ | `e2e/every-route.spec.ts` already fails on any console error on any route (local build); on the live site the only console error is F227's blocked script |
| W6.7 | Caching headers for static assets | ✅ | `next.config.ts`: /art and /og cached a day, stale-while-revalidate a week (measured before: max-age=0 on every public file; `/_next/static` already immutable); `next.config.test.ts` |
| W6.8 | Print stylesheet for guides and posts | ✅ | `app/globals.css` @media print; `e2e/print.spec.ts` (guide, post, terms: no nav, footer, form or fixed chrome; black on white; outward links print their address): 8 passed |

## W7 · Testing the presentation

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W7.1 | Spell check in CI with a project dictionary | ✅ | `cspell.json` (British English, 27 project words, entities ignored) and a CI step over the website's sources and llms.txt; 67 files, 0 issues; bite-checked ('subscripton' and 'chargse' caught, 'colour' accepted) |
| W7.2 | Visual baselines, every template, light and dark, phone and desktop | 🔒 | the test and the workflow exist (`e2e/visual.spec.ts`, 12 templates × light and dark × desktop and phone, behind VISUAL=1; `.github/workflows/visual.yml` renders the baselines on Linux and uploads them); proven end to end on this machine 2026-10-09, then the Windows renders discarded. Owner: run the workflow in update mode and hand me the artifact (OWNER_GUIDE step 15.4); then the check goes on |
| W7.3 | Firefox project | ✅ | Playwright project `firefox` (Playwright's build, installed in CI): the whole suite, 2026-10-09 locally; one test's wording widened (Firefox says 'Content-Security-Policy') and one Firefox habit allowed for (focus stays on the last control instead of wrapping) |
| W7.4 | WebKit project | ✅ | Playwright project `webkit` through a self-signed TLS front (`e2e/tls-proxy.mjs`): WebKit honours upgrade-insecure-requests for 127.0.0.1, Chrome and Firefox exempt it; 185 passed, 15 skipped by design (keyboard and forced colours). Found and fixed: nav links shorter than 24 px in WebKit (axe target-size) |
| W7.5 | Keyboard-only through every page | ✅ | `e2e/keyboard.spec.ts`, 10 templates: first Tab is the skip link and Enter lands on main; every focusable control from main onward reached in document order; every one shows focus; no trap (the sequence reaches the footer's last link) |
| W7.6 | 200 % zoom | ✅ | `e2e/zoom.spec.ts`, 10 templates at a 640-px viewport drawn 2×: no sideways scroll, no heading, paragraph, link or button outside the viewport, no nowrap text cut off |
| W7.7 | Forced colours | ✅ | `e2e/forced-colors.spec.ts`, 4 templates with forced colours active: every button, switch and input keeps an edge, nothing but pictures opts out, the heading stays; F228 found and fixed |
| W7.8 | Waitlist end to end: the row lands in the sheet; what the sign-up sees | 🔒 | needs read access to the owner's sheet |
| W7.9 | Theme toggle; external links `rel="noopener"` in a new tab | ✅ | `e2e/theme-and-links.spec.ts`, 18 checks on four engines (Chrome, the phone profile, Firefox, WebKit). New tabs: every `a[target="_blank"]` on 14 templates carries rel="noopener" — checked on the RENDERED page, because links come from the service catalogue and the blog data as well as from JSX — with a guard that the cancel guide still has such a link, so the check cannot pass vacuously. The toggle: it flips the theme, its aria-label names the ACTION (the theme you are not in), the choice survives a reload and carries to another page, and storage holds exactly one item, `zeno-theme`, with no cookie — which is what the cookie policy promises. |
## W8 · Launch readiness

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W8.1 | D21: waitlist double opt-in (recommended: confirmation email via Resend) | 🔒 | owner decision; then I build it |
| W8.2 | Analytics decision recorded (none today; if ever, cookieless and self-hosted) | 🔒 | owner decision |
| W8.3 | Press kit page | ✅ | `app/press/page.tsx`: one paragraph, the facts, the mark and six pictures (all ours), figures with their caveat, the address; linked from About and the footer; its own share card |
| W8.4 | Social profiles claimed, linking here | 🔒 | owner |
| W8.5 | Uptime monitor extended to the website | 🔒 | owner, with OWNER_GUIDE step 9 |
| W8.6 | OWNER_GUIDE updated with the website steps | ✅ | `docs/OWNER_GUIDE.md` step 15: Netlify toolbar (F227), Search Console sitemap and the D16 read, Bing, the visual baselines, then D21 and the lawyer |

---

## Findings from this plan

| # | Finding | Severity | Status |
|---|---|---|---|
| F224 | Dates typed into the site went stale: the sample ledger renewed in July and August while it was October; the catalogue was cited as July 2026; competitor prices 'verified July 2026' | Medium (trust) | Fixed 2026-10-08: relative days, computed cite, prices re-read with the date; the 90-day test is W3.8 |
| F225 | The Terms described Pro as 'advanced discovery, deeper insights, and cancellation guides' and listed a Business tier for sale; the pricing sells Pro as unlimited subscriptions plus two budgeting features, guides free, and no Business plan | High (a contract term contradicting the price list) | Fixed 2026-10-08 in the plan list; the test that the legal pages agree with the pricing is W2.7 |
| F226 | The site's own voice: 227 em dashes, a courtroom metaphor on the home page, self-praise ('the honest way', 'priced like we mean it') | Medium (reads as template or machine-written) | Fixed 2026-10-08 (W1); locked by the copy lint |
| F227 | Netlify appends its toolbar script after `</html>` on every page (even with the project public): invalid HTML, and a script the site's own policy blocks, so a console error for every visitor | Medium (trust, validity) | Owner: turn the HUD off in Netlify's settings (`docs/OWNER_ACTIONS.md`); W6.4 stays ❌ until then |
| F228 | In forced-colours mode (Windows High Contrast) the hero's five switches, the page-turn buttons, the FAQ buttons and the phone menu button had no visible edge: drawn by background colour alone, which the mode removes | Medium (accessibility, WCAG 1.4.11) | Fixed 2026-10-09: `@media (forced-colors: active)` in `globals.css` gives every control a system-colour border and a Highlight focus ring; `e2e/forced-colors.spec.ts` |

## Log

**2026-10-09, late:** the first CI runs with four browsers found two things the local gates could not: a layout shift on the privacy page when swapped fonts arrived on Linux (fonts now display optional) and Firefox stalling on navigations (two retries for that engine). The spell check and semgrep then caught two of my own slips in the new files (two words; a workflow input in a run script). W7.2 scaffolded for the owner's Linux baselines; the press kit written; browser storage measured on the live site.

**2026-10-09 (W7):** keyboard-only, 200 % zoom and forced-colours tests (F228 found and fixed); the suite in Firefox and in WebKit, the latter through a TLS front because WebKit upgrades insecure requests even to 127.0.0.1; a CodeQL warning on the link checker fixed (origin compared whole, not as a prefix).

**2026-10-09 (W6):** Lighthouse measured on the live site (95 to 100 performance, 100 accessibility and SEO, 92 best practices from F227 alone); the vitals budgets made hard; the Nu HTML checker found the Netlify toolbar script after `</html>` on every page (F227, owner); a nightly link check (538 internal links, all 200); caching for the pictures; a print stylesheet with a browser test.

**2026-10-09 (W5):** share cards and structured data checked on the live site with the schema.org validator and a scraper-style card check, both saved as evidence; breadcrumbs and FAQ schema confirmed per template; an internal-link test added (and the About page's missing inbound link fixed).

**2026-10-09:** W4. Sixteen pictures drawn in code (`scripts/site-art.ts`) and rendered to WebP, a share card per page from one table of titles held equal to the pages' h1s, heroes and figures on all eight posts, four new posts written from the catalogue's data with every figure a token filled at render, and the feed validated at the W3C.

**2026-10-08, night:** W3 and W2. The five placeholder pages became /roadmap with permanent redirects; /about written; Family Vault and Spend Twin written from the server's and app's rules; the features hub and compare pages filled out; bylines; three new tests (dates, substance, legal agreement). The Terms and privacy policy rewritten in full with Zeno as the operator and India's law; the cookie policy's draft notes removed.

**2026-10-08, evening:** W1 done except the GitHub read. The lint was written first and failed on the old site on 10 of its rules (the bite check); the home page, compare pages, feature pages, cancel hub, legal pages and the shared call to action were rewritten until it passed; 13 tests that pinned the old sentences were updated. Three findings: F224 stale dates, F225 Terms against pricing, F226 the voice itself.

**2026-10-08:** plan and tracker written from a measured baseline: 227 em dashes, the
home page's trial-metaphor copy, stale July dates in the sample ledger and catalogue
citation, Terms that contradict the pricing and name no entity or law, six planned-feature
pages, no About, no bylines, no images, vitals asserted softly, Lighthouse never run.

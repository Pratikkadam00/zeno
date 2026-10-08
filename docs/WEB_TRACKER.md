# Website tracker

The live tracker for `docs/WEB_PLAN.md`. One row per check. A row moves to **pass** only
with its evidence named (a test, a script's saved output, a file in `docs/web-evidence/`,
a measurement); a **fail** names its finding (F‹n›) and moves to pass when the fix is
proven. Order of work: W1, W3, W2, W4, W5, W6, W7, W8.

**Status:** ⬜ to do · 🔄 in progress · ✅ pass · ❌ fail (finding open) · 🔒 needs the owner
· ⏸ blocked (says why)

**Summary (2026-10-08):** 69 checks. 0 done; 11 need the owner (🔒); 1 blocked on the owner's mail set-up (⏸); the rest are mine.

---

## W1 · Voice

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W1.1 | Copy lint test written: em dashes, banned phrases, placeholders, sentence length, first heading; fails on today's site (bite check) | ⬜ | |
| W1.2 | Home: hero rewritten | ⬜ | |
| W1.3 | Home: the four sections (case, method, refusal, bill) rewritten as plain sections | ⬜ | |
| W1.4 | Home: pricing copy rewritten; every plan line matches the app and the store products | ⬜ | |
| W1.5 | Home: FAQ rewritten; answers checked against the app | ⬜ | |
| W1.6 | Footer tagline and footer copy rewritten (every page) | ⬜ | |
| W1.7 | The five compare pages rewritten; competitor facts re-checked with the date | ⬜ | |
| W1.8 | Features hub, cancel hub, blog index, 404 rewritten | ⬜ | |
| W1.9 | Landing pages: light pass | ⬜ | |
| W1.10 | Blog posts: light pass | ⬜ | |
| W1.11 | Truthfulness rail extended to the rewritten copy | ⬜ | |
| W1.12 | Copy lint green on GitHub; every page read aloud once, nothing template-like | ⬜ | |

## W2 · Legal

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W2.1 | D18: the legal entity (name, form, country, address) | 🔒 | owner decision |
| W2.2 | D19: governing law and venue | 🔒 | owner decision |
| W2.3 | Terms rewritten to the plan's list; billing section equals the pricing table | ⬜ | after W2.1, W2.2 |
| W2.4 | Apple's required EULA clauses and Google Play terms present | ⬜ | |
| W2.5 | Privacy policy rewritten: controller, purposes with bases, retention per category, providers with location, transfers, rights with deadline, EU/UK and California, children | ⬜ | |
| W2.6 | Cookie policy checked against what the site actually stores (measured in a browser) | ⬜ | |
| W2.7 | Test: legal pages agree with the pricing table, the provider list in code, and the data-safety draft | ⬜ | |
| W2.8 | Test: no "draft", "to be confirmed", "at launch" in the legal pages; dates set by content | ⬜ | |
| W2.9 | Lawyer's review | 🔒 | OWNER_GUIDE step 13 |

## W3 · Pages

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W3.1 | About page | ⬜ | needs W2.1 for the entity line |
| W3.2 | Contact page with the four addresses | ⏸ | F223: the addresses bounce until the owner sets up mail |
| W3.3 | D20: the six planned-feature pages folded into one Roadmap page (recommended) or kept | 🔒 | owner decision |
| W3.4 | Sample ledger dates computed from today; catalogue date computed; competitor-price dates with a 90-day test | ⬜ | |
| W3.5 | Footer: entity line, computed year | ⬜ | needs W2.1 |
| W3.6 | Byline and updated date on every post | ⬜ | |
| W3.7 | Test: every sitemap page has 150+ words of its own and a next step | ⬜ | |
| W3.8 | Test: no date on the site older than 90 days except publication dates | ⬜ | |

## W4 · Blog and images

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| W4.1 | Image pipeline: SVG source → WebP at two sizes with sharp; a script and a test | ⬜ | |
| W4.2 | Hero and one figure for each of the four posts, drawn in code, alt text | ⬜ | |
| W4.3 | Per-post OG images generated | ⬜ | |
| W4.4 | OG images for the home, landing and compare pages | ⬜ | |
| W4.5 | Four new posts written from catalogue data, dates spread | ⬜ | |
| W4.6 | Reading time, author, updated date on posts | ⬜ | |
| W4.7 | RSS feed validates (W3C validator result saved) | ⬜ | |
| W4.8 | Test: every post has a hero and a figure under 120 KB with alt text; every page its own OG image | ⬜ | |

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
| — | none recorded yet (the baseline's defects become findings as each phase reaches them) | | |

## Log

**2026-10-08:** plan and tracker written from a measured baseline: 227 em dashes, the
home page's trial-metaphor copy, stale July dates in the sample ledger and catalogue
citation, Terms that contradict the pricing and name no entity or law, six planned-feature
pages, no About, no bylines, no images, vitals asserted softly, Lighthouse never run.

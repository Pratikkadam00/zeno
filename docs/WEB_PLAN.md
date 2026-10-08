# Website plan: copy, legal, content, SEO, testing (written 2026-10-08)

The hardening programme tested the website's code and security (P4, P5: 335 Playwright
tests, headers, script policy, axe, DAST). This plan is about the website as a **reader
sees it**: what it says, whether it sounds like a person wrote it, whether the legal pages
would stand up, whether every page earns its place, whether the blog looks like a
publication, and whether search engines and browsers measure it as a professional site.

Progress is tracked in **`docs/WEB_TRACKER.md`**, one row per check. The rules are the same
as every other tracker here: nothing passes without named evidence; one item at a time; a
defect becomes a finding (F‹n›) with a test that fails on the old text or code, so it cannot
come back.

---

## Where we are today (measured 2026-10-08)

| Area | Measured | Verdict |
|---|---|---|
| Pages | 27 templates; 537 URLs in the sitemap (510 cancellation guides, 470 of them general-step); 7 indexed by Google so far | Structure is sound; the long tail is thin (D16) |
| Copy, machine tells | **227 em dashes** in the site's source (26 in the home sections alone, 19 in the privacy policy); "Whether you…" 3; "not just" 2 | The single loudest tell of machine-written text, on every page |
| Copy, voice | Home page staged as a trial: THE CASE / THE METHOD / THE REFUSAL / THE BILL, one word per line; "Priced like we mean it"; "Enough to stop the bleeding"; "we're not ironic about recurring charges"; "no guilt copy, no 'most popular' theater"; the tagline "the honest way to take back your subscriptions" in the hero and in the footer of every page | Theatrical and self-congratulating; the landing pages and the blog, by contrast, read plainly and well |
| Stale content | Sample ledger renews "JUL 28", "AUG 2", "TRIAL CONVERTS JUL 12" (it is October); "ZENO CANCELLATION CATALOG · JULY 2026"; competitor prices "verified July 2026"; Terms "Last updated June 13, 2026" next to a privacy policy of October 4 | Dates that drift tell a reader nobody is home |
| Legal | Terms name no legal entity, no country, no governing law ("to be confirmed at launch"); describe Pro as "advanced discovery, deeper insights, and cancellation guides" while the pricing sells Pro as unlimited subscriptions plus two budgeting features and gives the guides away free; list a "Business" tier as an offered plan; no consumer-withdrawal, app-store (Apple's required EULA terms) or complaints clauses. Privacy policy: "operated by the Zeno team", no controller identity or address; the contact addresses bounce (F223) | Drafts, as they say themselves. Not fit to be relied on |
| Planned-feature pages | 6 pages say "Planned · not available today" (Widgets + Watch, Open Banking, Business, Developers, Partners, and most of Features); each is one paragraph and a mock-up | Honest, but six near-empty pages on a pre-launch site read as filler to a reader and as thin content to Google |
| Company | No About page, no author on any post, no press or contact page; the footer says "© 2026 Zeno" and nothing else | Search engines rate a new domain on who stands behind it (E-E-A-T); today, no one does |
| Blog | 4 posts, every one dated 2026-10-04, no byline, no image anywhere on the site (0 `<img>` elements; one shared `og.png` for all 537 URLs) | Reads as generated in a batch; nothing to share on social beyond a generic card |
| Performance | Playwright measures LCP, CLS and INP on every template but asserts them with `expect.soft`, so a budget overrun never fails the run; Lighthouse never run; PageSpeed's public quota was exhausted today | We do not know the scores |
| Testing | 335 Playwright tests (routes, headers, policy, axe, dark mode, phone and desktop), Chrome only; no visual baselines, no spell check, no copy lint, no link checker, no HTML validation, no cross-browser | Strong on security, blind on presentation |
| Waitlist | Form to an Apps Script sheet; same answer for repeat sign-ups; rate limited; no confirmation email, no double opt-in | Works; the list cannot prove consent per address |

---

## House style (applies to every word on the site; W1 turns it into a test)

1. **No em dashes, no en dashes as punctuation.** Use a full stop, a comma, or a colon.
2. **Plain sentences.** One idea each. No one-word-per-line headlines, no "exhibits", no
   trial metaphors, no manifesto voice ("we refuse", "priced like we mean it").
3. **No self-praise.** Never "honest", "genuinely", "truly", "actually" about ourselves. Say
   what the product does; the reader decides whether that is honest.
4. **No lists of three for rhythm.** Three items when there are three things, not for sound.
5. **Banned phrases:** "seamless", "effortless", "unlock", "supercharge", "empower", "journey",
   "game-changer", "peace of mind", "take control", "take back", "stress-free", "no more X",
   "say goodbye to", "whether you're", "it's not X, it's Y", "in today's world", "imagine",
   "look no further", "the honest way", "theater/theatre" (as a sneer), "we get it".
6. **Numbers come from the catalogue or the code** (the existing `{SERVICE_COUNT}` tokens),
   never typed in. Dates on the site are either computed or carried with a test that
   fails when they are more than 90 days old.
7. **Every claim about the app is one the app makes true** (the truthfulness rail,
   `app/truthfulness.test.tsx`, extended to the rewritten copy).
8. **Required phrase** stays: "No bank login required."
9. **Competitors** are described from their own public pages, with the date checked, never
   with adjectives.
10. **Legal pages** are written for a reader, in the same voice, with the formal content a
    lawyer expects (entity, law, venue, rights, retention, transfers, billing, Apple and
    Google terms), and say "draft" nowhere once the owner's decisions are in.

---

## The phases

### W1 · Voice: the copy rewritten and locked

Rewrite the home page (hero, the four sections, pricing, FAQ, footer), the five compare
pages, the Features hub, the cancel hub and the 404 in the house style; the landing pages
and blog posts get a light pass (they are mostly already in it). Then a **copy lint test**
in CI over every rendered page: zero em dashes, zero banned phrases, no "undefined",
"lorem" or "TODO", no sentence over 35 words in body copy, every page's first heading a
real sentence. The lint is the bite check: it fails on today's site.
**Gate:** the lint is green on GitHub; a human read of every page (the owner, or me aloud)
finds nothing that sounds like a template.

### W2 · Legal: pages a lawyer would only need to sign off, not rewrite

Needs two owner decisions first (`OWNER_ACTIONS.md` D18: the legal entity and country;
D19: the governing law and venue, which usually follow). Then: Terms rewritten (entity,
law, venue, eligibility, acceptable use, plans and billing **matching the pricing exactly**,
app-store terms including Apple's required EULA clauses, cancellation and refund routes,
consumer-withdrawal rights where they apply, disclaimers, liability, complaints, changes);
Privacy policy rewritten (controller, each purpose with its legal basis, each category with
its retention period, each provider with its role and location, international transfers,
the Google Limited Use statement, rights and how to exercise them with a deadline, the
EU/UK and California sections, children, changes); Cookie policy kept short and true.
Dates set by content, and a test that the legal pages agree with the pricing table, the
provider list in the code, and the data-safety draft. The lawyer's review (OWNER_GUIDE step
13) is the final gate, not mine.
**Gate:** tests green; no "draft", "to be confirmed" or "at launch" left in the legal pages.

### W3 · Pages: every page earns its place

An **About** page (who makes Zeno, why, how it is funded, how to reach us); a **Contact**
page that names the four addresses once F223 makes them work; a byline on every post. The
six planned-feature pages: owner decision D20, fold them into one **Roadmap** page (my
recommendation: one honest page beats six empty ones, and the redirects keep any link
alive) or keep them. The stale strings fixed and guarded: the sample ledger's dates
computed from today, the catalogue date computed from the catalogue, competitor-price
dates carried with a 90-day test. Footer: entity line, year computed.
**Gate:** every page in the sitemap has at least 150 words of its own, a purpose, and a
next step; no date on the site older than 90 days unless it is a publication date.

### W4 · Blog and images, all our own

Every post gets a hero image and at least one figure, **drawn in code**: SVG illustrations
and diagrams in the site's palette (the ledger, a renewal calendar, the three places
subscriptions hide, the cancel-button maze), rasterised with sharp to WebP at two sizes,
with alt text that says what the picture shows. No stock, no scraping, no generated
photographs: everything is vector art committed as source, so it can be regenerated and
nobody else holds a copyright on it. Per-post **Open Graph images** (title on the brand
card) generated the same way, and one per landing and compare page. Four more posts in the
plan's voice, on dates spread out, each written from the catalogue's data (for example: the
services with the hardest cancellations, measured; what a year of forgotten trials costs,
computed). Reading time, author, updated date, and an RSS feed that validates.
**Gate:** a test that every post has a hero and a figure under 120 KB each with alt text;
every page has its own OG image; the feed validates.

### W5 · SEO: measured, not assumed

Per-page OG images (W4) and Twitter cards checked in the validators; title and description
length tests already exist, extend to the new pages; JSON-LD per page type checked with
Google's Rich Results test on one of each; breadcrumbs on guides and posts; FAQ schema on
the landing pages that carry FAQs; internal links: every post links to two guides and one
landing page, every guide to its hub and three neighbours (tested); `lastmod` only when
content changes (already); Search Console read weekly by the owner and the D16 trigger
watched; Bing imported. An `llms.txt` that matches the site (exists; test it against the
sitemap).
**Gate:** every item has a test or a saved validator result; the Search Console coverage
report attached in `docs/web-evidence/` with the date.

### W6 · Performance and technical quality

Lighthouse (mobile and desktop) on one page of each template, scores saved; target 95+ on
all four categories, with the actual numbers recorded whatever they are. The Playwright
vitals assertions made **hard** (they are soft today). Font subsetting checked
(self-hosted already), image sizes budgeted (W4), HTML validated (Nu validator) on every
template, a link checker over every internal and external link nightly, no console errors
on any page, caching headers for static assets, the 404 served as 404 (already). Printing:
a guide printed looks like a guide (print stylesheet).
**Gate:** scores and validator outputs in `docs/web-evidence/`; the nightly link check green.

### W7 · Testing the presentation

Spell check in CI (cspell with a project dictionary); the copy lint (W1); visual baselines
on every template, light and dark, phone and desktop (`toHaveScreenshot`; this is U2.6 of
the UI plan, done here); Firefox and WebKit projects (U5.7, U5.8); keyboard-only and 200 %
zoom (U3.8, U3.9); forced colours (U3.13); the waitlist end to end including the row
landing in the sheet (owner's sheet, read-only check) and what the sign-up sees afterwards;
the theme toggle; every external link opens in a new tab with `rel="noopener"`.
**Gate:** all of it on GitHub, green, with the baselines committed.

### W8 · Launch readiness

Owner items, gathered: Search Console sitemap submitted and the coverage report read;
Bing; social profiles claimed and linking here; the waitlist's double opt-in decision (D21:
my recommendation is a confirmation email through Resend, so every address on the list has
proved it is real and willing); analytics decision (today none, which the cookie policy
promises; if ever added, a cookieless, self-hosted counter and a policy update the same
day); a press kit page (logo, screenshots, one paragraph, contact); the uptime monitor
extended to the website.
**Gate:** the owner's list in `OWNER_GUIDE.md` updated with these steps.

---

## Order and cost

W1 first (the voice is what the owner asked for, and the lint locks it), then W3 and W2
together as the owner's decisions arrive (D18 to D21), then W4, W5, W6, W7, W8. Everything
except the decisions, the lawyer and the accounts runs on this machine and GitHub. An
honest estimate: W1 two sessions, W2 two, W3 one, W4 three (eight images and four posts
take time to do well), W5 one, W6 one, W7 two, W8 the owner's.

# SEO.md — The Playbook

A reusable, execution-grade SEO system. Built from the full technical SEO overhaul of **flickapp.in** (every rule here was actually shipped and verified there — including the bugs). Written for Next.js App Router on Vercel, adaptable to any stack.

Use it for: **Zeno** (subscription manager + budgeting), **Meridian** (off-plan property brokers), and every future project. Starter kits for both are at the bottom.

---

## 0. How ranking actually works (read this once, believe it)

```
Rank = Relevance × Authority × Time
```

- **Relevance** — everything in Phases 1–8. You control 100% of it in code. It gets you *eligible* to rank.
- **Authority** — backlinks, brand searches, reviews, age. Code cannot create this. Phase 9 is how you build it.
- **Time** — a new domain takes 2–6 weeks after indexing to settle, 3–6 months to compete on real terms. Nothing skips this.

Honest calibration:
- You will **never** rank #1 for a head term like "camera", "budget", or "real estate". Wikipedia and billion-dollar brands own those.
- You **can** rank #1 for intent terms: "disposable camera app for weddings", "subscription tracker without bank login", "off plan projects in Dubai Hills". That's where buyers are anyway.
- Brand terms ("zeno app", "meridian brokers") are winnable in weeks **if** you claim the brand SERP (Phase 9.4).

**The single biggest mistake**: shipping perfect technical SEO and zero backlinks, then waiting. Technical SEO is a *gate*, not an *engine*. Do Phase 9 with the same seriousness as the code.

---

## 1. Phase 0 — Before writing any code

### 1.1 Pick the canonical host — once, forever
- Decide `www.example.com` **or** `example.com`. Never both. (Flick uses www.)
- Every canonical, sitemap URL, schema `@id`, and OG URL uses this exact host for the life of the project.

### 1.2 Keyword architecture (30 minutes, on paper)
Build a three-tier map before creating a single page:

| Tier | What | Example (Flick) | Page type |
|---|---|---|---|
| Brand | `{brand} app`, `{brand} reviews` | "flick app" | Homepage |
| Money (transactional) | "{category} app for {event/niche}" | "disposable camera app for weddings" | Landing page, one per intent |
| Long-tail (informational) | how-to / comparison / alternatives queries | "how to collect photos from wedding guests" | Blog post, one per query |

Rules:
- **One page = one primary keyword.** Two pages targeting the same query cannibalize each other.
- Every long-tail post must have a "parent" money page it links to.
- Verify demand before writing: type the query into Google — if autocomplete finishes it and the results are weak (forums, thin listicles, generic tools), it's winnable.

### 1.3 Competitor recon (15 minutes per money keyword)
Google your money keywords. For each top-3 result note: word count, page type, what's missing (no pricing? no FAQ? no local angle?). Your page must be *more useful*, not just present.

---

## 2. Phase 1 — Technical foundation (non-negotiable, do first)

### 2.1 Host redirect: 308, permanent, path-preserving
- Non-canonical host → canonical host must return **HTTP 308** (not 307/302).
- On Vercel this is set in the **dashboard**, not code: Project → Settings → Domains → apex domain → Redirect to www → status **308 Permanent**.
- ⚠️ Vercel defaults to **307 Temporary**. A 307 makes Google index BOTH host versions as duplicates. This was Flick's single worst issue.
- If the redirect is dashboard-level, do **not** also add a code-level redirect — it will never be reached.

**Verify** (must show 308 and the full path preserved):
```bash
curl -sI https://example.com/blog | grep -iE "^HTTP|^location"
# HTTP/1.1 308 Permanent Redirect
# Location: https://www.example.com/blog
```

### 2.2 `metadataBase` in the root layout
```ts
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://www.example.com'),
  ...
}
```
Without it, relative OG/canonical URLs resolve wrong or not at all.

### 2.3 Canonicals
- Every indexable page: `alternates: { canonical: '/its-own-path' }` — self-referencing, on the canonical host.
- Never canonical two different pages to each other "to consolidate". One page, one canonical, itself.

### 2.4 HTTPS + security headers
HSTS, X-Content-Type-Options, etc. Not ranking factors per se, but Chrome flags and trust signals. Set once in `next.config.js` `headers()`.

---

## 3. Phase 2 — Metadata system

### 3.1 Title rules
- **Keyword-first, brand-last**: `Disposable Camera App for Weddings | Brand` — NOT `Brand | Disposable Camera...`. On a low-authority domain the first characters are the highest-value real estate.
- ≤ 60 characters including the ` | Brand` suffix (Google truncates ~600px).
- Root layout sets a template:
  ```ts
  title: { default: 'Primary Keyword Phrase | Brand', template: '%s | Brand' }
  ```
- ⚠️ **PITFALL (hit on Flick):** the `%s | Brand` template applies to every *nested* route but NOT to the root page itself. So nested pages set `title: 'Keyword Phrase'` (no suffix — template adds it) while the homepage sets the full string. If you see `... | Brand | Brand` in the tab, this is why.

### 3.2 Meta description rules
- **140–160 characters.** Under 140 wastes the slot; over 160 gets truncated mid-sentence. Count characters, don't eyeball. (All 4 Flick landing pages shipped at 166–174 and had to be trimmed.)
- Formula: `{What it is with primary keyword}. {How it works in one clause}. {Differentiator}.`
- It's ad copy for the click, not a keyword bag. Google bolds matching words — include the primary keyword naturally once.

### 3.3 OpenGraph + Twitter — the shallow-merge trap
⚠️ **PITFALL (the Flick Twitter bug):** Next.js **shallow-merges** metadata by top-level key. If a child page defines `twitter: { title }` it *replaces the entire parent twitter object* — losing `card`. And if a child defines `openGraph` but no `twitter`, Twitter falls back to the **site-wide** defaults, not the page's OG values.

**Rule: every indexable page declares its own complete `openGraph` AND `twitter` blocks:**
```ts
const TITLE = 'Page Keyword Phrase | Brand';
const DESCRIPTION = '...140-160 chars...';
const URL = 'https://www.example.com/path';
const OG_IMG = 'https://www.example.com/opengraph-image';

export const metadata: Metadata = {
  title: 'Page Keyword Phrase',            // template appends | Brand
  description: DESCRIPTION,
  alternates: { canonical: '/path' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: 'website',
    images: [{ url: OG_IMG, alt: TITLE }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION,
    images: [{ url: OG_IMG, alt: TITLE }] }
};
```

### 3.4 OG images
- 1200×630. **JPEG under ~150 KB** (Flick shipped a 1.9 MB PNG og:image — social crawlers time out on those; it also bloated the page).
- `alt` = the page title, never the generic site tagline.
- ⚠️ **PITFALL:** the Next.js `opengraph-image.tsx` file convention at the app root does **not** cascade to nested routes like `/blog/[slug]` — nested pages emit NO og:image unless you explicitly set `images:` in their metadata. Verify with curl, don't assume.
- ⚠️ **PITFALL (cost us a production 404):** check `.gitignore` for global `*.png` / `*.jpg` rules before committing images. Add exceptions: `!apps/web/public/assets/*.jpg`. Then verify the file is actually in `git status`.

---

## 4. Phase 3 — Structured data (JSON-LD)

### 4.1 Architecture: one entity graph, referenced everywhere
- **Root layout** (every page): `Organization` + `WebSite`, with stable `@id`s:
  ```
  https://www.example.com/#org
  https://www.example.com/#website
  ```
- **Page-level schema references them** via `isPartOf: { '@id': '...#website' }` / `publisher: { '@id': '...#org' }` instead of re-declaring. One entity, many references — this is how Google builds a knowledge panel.
- Render server-side: `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />`
- **No `SearchAction`** — sitelinks search box is deprecated.

### 4.2 Schema per page type

| Page | Schema (in one `@graph`) |
|---|---|
| Root layout | `Organization` (name, url, logo — a real asset you verified exists), `WebSite` |
| Homepage | `SoftwareApplication`/`WebApplication` (category, OS, description, real `offers` with real prices) + `FAQPage` (only if FAQs are visibly rendered) |
| Landing page | `WebPage` + `BreadcrumbList` + `FAQPage` (visible FAQs only) |
| Blog index | `Blog` + `ItemList` (all posts) + `BreadcrumbList` |
| Blog post | `BlogPosting` (headline, description, url, `datePublished`, `dateModified`, author = Organization, publisher, image, mainEntityOfPage) + `BreadcrumbList` |
| Real-estate listing (Meridian) | `RealEstateListing` / `Residence` + `Offer`; agency pages: `RealEstateAgent` |
| Finance tool (Zeno) | `SoftwareApplication` with `applicationCategory: 'FinanceApplication'` |

### 4.3 The honesty rules (protect you from a manual action)
- **NO fabricated `aggregateRating` or `review`.** Fake review markup is the #1 cause of structured-data manual penalties.
- **NO invented dates.** Recover real publish dates from git: `git log --follow --format=%aI -- <file> | tail -1`.
- **FAQ schema must mirror visible FAQs verbatim** — same questions, same answers, same count. (Flick's homepage schema had 5 truncated FAQs while the page showed 6 — that mismatch is a spam signal. Fixed to verbatim.)
- Schema prices must equal visible prices, exactly.
- Note: FAQ *rich results* are restricted to high-authority sites since 2023 — you won't see the dropdown in SERPs. Ship the markup anyway; it's an entity/relevance signal.

### 4.4 Dates: visible + structured, matching
- Every article shows `Published {date} · Updated {date}` visibly (Flick uses the Space Mono eyebrow style).
- The same values go into `datePublished` / `dateModified`. Visible ≠ structured is a trust problem.
- Google shows dates in snippets — articles without them look stale and get skipped.

---

## 5. Phase 4 — Site architecture & internal linking

### 5.1 The page-type triangle
```
            Homepage (brand + primary keyword)
           /        \
   Money pages ——— Content pages
   (/weddings)      (/blog/*)
   convert          earn long-tail traffic
```
- **Money pages** (3–6 of them): one per buying intent. This is what converts.
- **Content pages**: one per informational query. They exist to rank long-tail AND to pass links to money pages.
- ⚠️ Most projects build ONLY informational content and wonder why traffic doesn't convert. Build the money pages first.

### 5.2 Internal linking rules (the mesh)
1. **Every content page → its parent money page**, once, *in-body*, with a keyword-adjacent anchor ("disposable camera app for weddings" → `/weddings`), placed where it reads naturally — not bolted to the end.
2. **Every money page → 3 related content pages** ("Related guides" block).
3. **Global footer → all money pages** (so every indexed page passes equity to them; on Flick this went in both the marketing footer and the legal-pages footer).
4. Homepage links every money page.
5. No orphans: every page reachable within 2 clicks of the homepage.
6. Anchor text = descriptive keywords, never "click here".

### 5.3 URL design
- Short, lowercase, hyphenated, keyword-bearing: `/weddings`, `/blog/subscription-audit-checklist`.
- No dates in URLs, no `/blog/2026/06/...` (kills evergreen updates).
- **Never change a published slug.** If you must: 308 redirect old → new in `next.config.js` `redirects()` with `permanent: true`.

---

## 6. Phase 5 — Content system

### 6.1 Money / landing page formula (proven structure)
```
1. Hero: H1 (primary keyword, natural phrasing) + one-line value + CTA
2. Intro: 2 paragraphs naming the exact pain (write to ONE persona)
3. How-it-works: 3 steps, condensed
4. Why-this-beats-alternatives: 4 items, specific to THIS intent
5. Comparison prose: vs the 2 alternatives buyers actually consider
6. Pricing anchor: the ONE relevant tier + link to full pricing
7. FAQ: 4–6 page-specific Q/As (visible + FAQPage schema, verbatim)
8. Final CTA
9. Related guides: 3 internal links
```
- **700–1,000 words**, unique. Zero paragraphs shared with the homepage, the matching blog post, or sibling landing pages. (Flick's four pages shipped at 878–922 words each — count with a script, don't guess.)
- Each page written for its distinct persona: Flick's `/indian-weddings` speaks to multi-day functions and elders who won't install apps; `/corporate` to privacy and ZIP export. Same product, different pain.

### 6.2 Article formula
- Target ONE query. The H1 answers it; the first paragraph delivers the answer in 2–3 sentences (snippet bait), the rest earns depth.
- 1,200–2,000 words for competitive queries, 700+ minimum.
- Include the honest comparison table competitors are afraid to write (naming alternatives builds trust and ranks for "X vs Y").
- End with a natural bridge to the money page (this doubles as the mesh link).

### 6.3 Tone rules (Flick house style — keep for all projects)
- Direct sentences. No exclamation marks. No em-dash overuse. No "Whether you're…" constructions. No marketing filler ("game-changing", "seamless"). Read it aloud; if a human wouldn't say it, cut it.

### 6.4 E-E-A-T on a new domain
- Author = the Organization (fine at launch — never invent fake human authors with fake credentials).
- Add a real founder/about page once possible; real names + real photos outrank anonymity in YMYL-adjacent niches (Zeno = finance, Meridian = property — **both are YMYL**; Google holds them to higher trust standards. Case studies, real numbers, and visible company info matter double there).

---

## 7. Phase 6 — Sitemap, robots, feeds

### 7.1 Sitemap (`app/sitemap.ts`)
- Only indexable, 200-status, self-canonical pages. No auth-gated routes, no redirects, no 404s.
- ⚠️ **PITFALL:** `lastModified: new Date()` stamps every URL with the build time — every deploy tells Google "everything changed", which teaches it to ignore your lastmod entirely. Use real content dates, updated only when content actually changes.
- Priorities: homepage 1.0 → money pages 0.9 → blog index 0.7 → posts 0.7 → legal 0.3.
- New page → sitemap in the same commit. Make it a checklist habit.

### 7.2 Robots (`app/robots.ts`)
- Allow all; disallow only genuinely private/dynamic routes (`/api/`, `/dashboard`, per-user pages).
- Single `Sitemap:` line pointing at the canonical host.
- ⚠️ Don't blindly "clean up" existing disallows — Flick's `/gallery/`, `/r/` disallows protect private guest galleries. Understand a rule before deleting it.

### 7.3 RSS feed (cheap, almost nobody does it)
- `app/blog/feed.xml/route.ts` → RSS 2.0 from a single shared posts module, real pubDates, `force-static`.
- Advertise it: `alternates: { types: { 'application/rss+xml': '/blog/feed.xml' } }` on the blog index.
- Keep post metadata (slug/title/excerpt/date) in ONE shared `posts.ts` consumed by index page, ItemList schema, and feed — one source of truth.

### 7.4 llms.txt (the modern edge)
- `public/llms.txt`: markdown — one-paragraph product summary (with real pricing), then linked lists of money pages, top guides, support/legal.
- ChatGPT search, Perplexity, and Claude increasingly answer "best X app" queries — this file is how they cite you accurately. Competitors don't have one. 15 minutes, real differentiation.

---

## 8. Phase 7 — Performance (Core Web Vitals)

- **Images are 90% of the problem.** Rules: max 1200px wide for content images, JPEG/WebP, under ~150 KB each, `loading="lazy"` below the fold, explicit dimensions to prevent CLS. (Flick's homepage carried three ~1.8 MB PNGs = 5.4 MB → re-encoded to ~90 KB JPEGs each = 280 KB total.)
- Fonts: `display=swap`, preconnect to font hosts, subset if possible.
- Ship zero JS you don't need on content pages. Static prerender everything marketing (`○` in the build output).
- Measure: PageSpeed Insights on homepage + one money page + one article. Fix anything red on mobile. Target LCP < 2.5s on 4G.

---

## 9. Phase 8 — Verification protocol (definition of done)

Run ALL of these before calling any SEO work finished. Every check here caught a real bug on Flick.

```bash
# 1. Host redirect is 308 + path-preserving
curl -sI https://example.com/blog | grep -iE "^HTTP|^location"

# 2. Every sitemap URL returns 200 (not 3xx/404)
for u in $(curl -s https://www.example.com/sitemap.xml | grep -o '<loc>[^<]*' | sed 's/<loc>//'); do
  echo "$(curl -s -o /dev/null -w '%{http_code}' $u)  $u"; done

# 3. Titles: no doubled "| Brand", correct keyword-first order
curl -s https://www.example.com/ | grep -o '<title>[^<]*</title>'

# 4. Per-page twitter + og values (not site defaults) — spot-check 2 nested pages
curl -s https://www.example.com/blog/some-post | grep -oE '(og:title|twitter:title|og:image)[^>]*'
```

```js
// 5. Every JSON-LD block parses + expected types present (run against dev server)
const html = await (await fetch('http://localhost:3000/page')).text();
const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
blocks.forEach(b => console.log(Object.values(JSON.parse(b[1])['@graph'] ?? [JSON.parse(b[1])]).map(n => n['@type'])));
```

- 6. `next build` passes with **zero new warnings**; all marketing pages show `○` (static).
- 7. Meta description lengths: script-count every page, assert 140–160.
- 8. Visible dates == schema dates on every article.
- 9. Images: committed to git (check `.gitignore`!), served 200, each < 200 KB.
- 10. Rich Results Test (search.google.com/test/rich-results) on one page per schema type.
- 11. ⚠️ **PITFALL:** running `next build` while the dev server is running corrupts `.next` — restart the dev server before re-verifying locally.
- 12. ⚠️ **PITFALL (Windows):** repo files may be CRLF. Scripted edits that write LF flip every line ending and turn a 14-line diff into a full-file rewrite — normalize back to CRLF after scripted edits, and verify with `git diff --stat` before committing.
- 13. ⚠️ **PITFALL:** if marketing pages animate content in with JS (`opacity: 0` until a scroll library runs), any new page reusing those CSS classes without the JS renders INVISIBLE content. Google renders JS but don't gamble — new static pages must not depend on animation hooks. (Flick's landing pages deliberately omit every `data-reveal` attribute.)

---

## 10. Phase 9 — Launch & authority (the part code can't do)

Do these in week 1 after shipping. **This list outweighs all the code above.**

1. **Google Search Console**: verify domain property → submit sitemap → *Request Indexing* manually for homepage + every money page + blog index. New domains wait weeks without this.
2. **Bing Webmaster Tools**: "Import from GSC" (2 clicks). Bing feeds ChatGPT search and Copilot.
3. **GSC weekly ritual** (30 min): Pages report → chase "Discovered – currently not indexed" (usually = weak internal links or thin content); Performance report → find queries with impressions at position 5–15 → strengthen those pages (better title, more depth, more internal links). This iteration loop is where positions 8→3 happen.
4. **Claim the brand SERP**: register the brand on X, Instagram, LinkedIn, YouTube, Crunchbase, GitHub — bio links to the site. The goal: searching "{brand} app" shows YOUR cluster filling page 1.
5. **Directory blitz (15–20 links)**: Product Hunt, AlternativeTo, SaaSHub, Capterra, G2, BetaList, Uneed, MicroLaunch + niche directories (weddings → WeddingWire etc.; finance → fintech directories; real estate → property portals, agency registers). Each live listing = a real backlink to a domain that has none. **Highest-leverage hour you can spend.**
6. **Product Hunt launch** with a self-promo thread. Even mid-tier = strong link + brand-search spike (brand searches are themselves a ranking signal).
7. **One real case study** with real numbers and photos as soon as a customer exists. Case studies earn natural links and convert.
8. **5 honest reviews** on the directories that allow them — own the "{brand} review" SERP before anyone else defines it.

---

## 11. Pitfall registry (every one of these actually happened)

| # | Pitfall | Cost | Prevention |
|---|---|---|---|
| 1 | Vercel apex redirect defaults to **307** | Google indexed duplicate hosts | Dashboard → 308; verify with curl |
| 2 | Next.js metadata **shallow-merge** — child `twitter` replaces parent whole; missing child `twitter` falls back to site-wide | All posts shared one Twitter card | Full `openGraph` + `twitter` on every page |
| 3 | Title template `%s \| Brand` double-applies if page title already has suffix | `…\| Flick \| Flick` in tabs | Nested pages: bare title; root: full string |
| 4 | `lastModified: new Date()` in sitemap | Google learns to ignore your lastmod | Real content dates only |
| 5 | Root `opengraph-image.tsx` doesn't cascade to nested routes | Blog posts had NO og:image at all | Explicit `images:` per page; verify with curl |
| 6 | Global `*.jpg` in `.gitignore` swallowed new images | Production 404 on og:image | Check ignore rules; verify files staged |
| 7 | 1.9 MB PNGs as og/content images | Slow LCP, social crawler timeouts | ≤150 KB JPEG, 1200px, verify sizes |
| 8 | FAQ schema ≠ visible FAQs (5 truncated vs 6 shown) | Spam-signal mismatch | Schema mirrors visible text verbatim |
| 9 | Meta descriptions 166–174 chars | Truncated in SERPs | Script-count 140–160, assert in review |
| 10 | CRLF repo + LF-writing scripts | Full-file diffs, unreviewable commits | Normalize to repo line endings after scripted edits |
| 11 | Reusing animation CSS (`opacity:0` until JS) on static pages | Invisible content | New pages never depend on animation hooks |
| 12 | `next build` while dev server runs | Corrupted `.next`, phantom empty pages | Stop dev server, or restart it after builds |
| 13 | Deleting robots disallows you don't understand | Would have exposed private user galleries | Understand every rule before "cleanup" |
| 14 | Fabricated ratings/reviews/dates in schema | Manual action risk (site-wide penalty) | Real, verifiable values only — no exceptions |

---

## 12. Starter kit — ZENO (subscription manager + budgeting)

**⚠️ YMYL niche** (personal finance): Google applies higher trust standards. Real company info, visible privacy stance, and honest claims matter double.

### Positioning & keyword map
| Tier | Keywords |
|---|---|
| Brand | zeno app, zeno subscription tracker |
| Money | subscription tracker app, subscription manager app, cancel unused subscriptions app, budgeting app for subscriptions, bill reminder app |
| Long-tail | how much am I spending on subscriptions, forgotten free trials that charge, average person subscription spending 2026, notion/spreadsheet subscription tracker template vs app, how to cancel {Netflix/Prime/…} (one per big service — huge search volume, maps perfectly to the product) |

### Money pages to build
- `/subscription-tracker` — primary head term
- `/cancel-subscriptions` — highest buying intent ("I'm bleeding money")
- `/free-trial-reminders` — sharp pain, low competition
- `/budgeting` — the budgeting side, one page (don't fight Mint/YNAB head-on; angle: "budgeting for people who hate budgeting apps")

### Schema
- `SoftwareApplication` with `applicationCategory: 'FinanceApplication'`, real `offers`.
- FAQPage on each money page (visible Q/As: "Does Zeno connect to my bank?" — privacy questions ARE the buying objection in this niche; answer honestly and prominently).

### Content angles that win links
- Data content: "The average person pays for N subscriptions and forgets X%" — even from your own anonymized user data once you have it, this earns organic backlinks better than any outreach.
- "How to cancel X" library — each post is a magnet for exactly the person who needs Zeno, with a natural in-body bridge.
- A free "subscription audit checklist" (downloadable) as link bait.

### Directories
Product Hunt, AlternativeTo (list as alternative to Rocket Money / Bobby / TrackMySubs), SaaSHub, fintech directories, r/personalfinance tool threads (read the self-promo rules first).

---

## 13. Starter kit — MERIDIAN (off-plan property brokers)

**⚠️ YMYL + partially LOCAL SEO.** Real estate rankings are geographic — this changes the playbook meaningfully vs a SaaS.

### Positioning & keyword map
| Tier | Keywords |
|---|---|
| Brand | meridian brokers, meridian off plan |
| Money | off plan projects in {city/area}, off plan property {city}, new launch properties {area}, {developer name} new projects, payment plan properties {city} |
| Long-tail | what is off plan property, off plan vs ready property, off plan payment plans explained, is off plan safe in {market}, {area} property price guide 2026 |

### The architecture that wins real estate
```
/                          — brand + market positioning
/off-plan/{city}           — one money page per city served
/off-plan/{city}/{area}    — one per key area (this is where rankings live:
                             "off plan dubai hills" beats "off plan dubai" for intent)
/projects/{project-slug}   — one page PER PROJECT/development
/developers/{developer}    — one per developer (people search developer names)
/guides/*                  — the long-tail content
```
- **Project pages are the goldmine**: every new launch is a fresh keyword with buyer intent and near-zero competition in week one. Publish the project page the day a launch is announced — being first to index for "{project name} price" wins the whole launch cycle. Include: real prices, real payment plan, real handover date, floor plans, location, honest pros/cons.

### Schema
- Site-wide: `Organization` + `RealEstateAgent` (with real address/phone → this also feeds local SEO).
- Project pages: `RealEstateListing` (+ `Offer` with real starting price; `availability`).
- Area guides: `WebPage` + `BreadcrumbList` (Home → City → Area).
- FAQPage per money page (visible: "What deposit is required?", "What happens if the project is delayed?" — the trust objections).

### Local & trust layer (non-optional in this niche)
- **Google Business Profile** — create, verify, categorize as real estate agency, collect reviews there. For "off plan broker near me" / map-pack queries this outranks everything else you can do.
- Consistent NAP (name/address/phone) across site footer, GBP, and every portal listing.
- License/RERA numbers (or local equivalent) visible in the footer — YMYL trust + a real differentiator vs sketchy competitors.
- List the agency on every property portal that allows broker profiles (each = backlink + lead source).

### Content angles
- Area guides with real data (average prices, handover pipelines, rental yields) — brokers with real numbers earn links from forums and expat communities.
- Honest "off plan risks" content — counterintuitive, but the broker who explains risks wins the trust (and the deal) from serious buyers.
- Developer comparison pages — high intent, nobody writes them honestly.

---

## 14. New-project launch checklist (print this)

**Before build**
- [ ] Canonical host chosen; keyword map (brand/money/long-tail) written; competitors checked

**Technical (Phase 1–3)**
- [ ] 308 host redirect verified via curl
- [ ] `metadataBase` set; self-canonical on every page
- [ ] Titles keyword-first ≤60 chars; no template doubling (check nested + root)
- [ ] Descriptions 140–160 (script-counted)
- [ ] Full `openGraph` + `twitter` per page; og:image ≤150 KB JPEG with page-specific alt
- [ ] JSON-LD: Org+WebSite site-wide; correct type per page; all parse; zero fabricated values
- [ ] Visible dates == schema dates on articles

**Architecture & content (Phase 4–6)**
- [ ] 3–6 money pages, 700–1,000 unique words, full landing formula
- [ ] Link mesh: post→money in-body, money→3 posts, footer→money pages, no orphans
- [ ] Sitemap: all 200s, real lastmod, new pages added same-commit
- [ ] robots.ts correct; RSS feed live + advertised; llms.txt live

**Performance & verification (Phase 7–8)**
- [ ] All images ≤150 KB, committed (gitignore checked!), served 200
- [ ] `next build` clean; marketing pages static; PSI mobile green-ish
- [ ] Full Phase 8 curl/JSON checks run and passing

**Launch week (Phase 9)**
- [ ] GSC verified, sitemap submitted, money pages manually indexed
- [ ] Bing WMT imported
- [ ] Brand claimed on 6+ platforms
- [ ] 15–20 directory listings live
- [ ] Product Hunt scheduled
- [ ] Weekly GSC ritual on the calendar

---

*Built from the flickapp.in SEO overhaul, 2026-07. Every rule here shipped to production and every pitfall in §11 was hit for real. Update this file when a new project teaches a new lesson.*

# Owner checklist — unblock the website (one line each, exact values)

Every step here needs an account only the owner has. Tick in order. Sources read 2026-10-01: Vercel domain docs, Google Search Console verification page, Vercel Web Analytics privacy and pricing pages (links in `GROWTH_LOG.md`).

## 1. Domain

- [ ] Decide: buy zeno.app from the Afternic listing (it is parked for sale; `research/domain-check-2026-10-01.md`), or register one of the names RDAP showed free today: `zenosubs.com`, `zenoledger.app`, `zenoapp.io`. Confirm availability at the registrar; RDAP "no record" is strong but not a guarantee.
- [ ] Create the mailboxes `privacy@<domain>` and `legal@<domain>` (the site derives both from the host; COMPLIANCE.md names `privacy@` as the data-request channel).
- [ ] Tell the engineering session the final host so `apps/mobile/src/config/site.ts` and `docs/OPEN_ITEMS.md` are updated (mobile is not this session's file).

## 2. Vercel project

- [ ] Import the GitHub repo. **Root Directory: `apps/web`.** Framework: Next.js. Build command: leave default (`npm run build` already builds `@zeno/shared` and `@zeno/service-catalog` first; verified in `apps/web/package.json`). Node 20+.
- [ ] Environment variables (Production):
  - `NEXT_PUBLIC_SITE_URL` = `https://<domain>` (bare origin, no path, no trailing slash; the build throws on anything else)
  - `WAITLIST_WEBHOOK_URL` = the endpoint from step 9
  - do NOT set `SHOW_PUBLIC_ANALYTICS` (keeps the sample-data `/analytics` page a 404 in production)
  - `TRUST_PROXY_HOPS` = leave unset (defaults to 1 in production, which matches Vercel's single proxy hop per the route's own comment)
- [ ] First deploy is production by definition (Vercel docs). Check the build log for `○` (static) on `/`, `/cancel`, `/compare/*` and the count of 532 pages.

## 3. Domains in Vercel (Settings → Domains)

- [ ] Add `<domain>` (apex) and `www.<domain>`.
- [ ] Set the redirect **www → apex** (Edit on the www domain → "Redirect to" apex). The repo's `next.config.ts` already 308-redirects www to apex in code; the dashboard redirect must agree. Vercel's docs read today recommend www as primary for CDN reasons; if the owner prefers www, ask engineering to flip the code redirect AND `NEXT_PUBLIC_SITE_URL` in the same change. Pick one, forever (SEO.md §1.1).
- [ ] At the registrar: apex `A` record to the IP Vercel shows on the domain card (its docs cite 76.76.21.21), `www` `CNAME` to the value Vercel shows. Keep MX records for the mailboxes.

## 4. Verify (copy-paste; all four must pass)

```bash
curl -sI https://www.<domain>/compare/ynab-alternative | grep -iE "^HTTP|^location"
```
Expect `308` and `Location: https://<domain>/compare/ynab-alternative` (path preserved; a 307 means the dashboard redirect is set to Temporary — change it).

```bash
curl -s https://<domain>/ | grep -o '<link rel="canonical"[^>]*>'
```
Expect `href="https://<domain>/"`.

```bash
curl -s https://<domain>/sitemap.xml | grep -c '<loc>'
```
Expect 527 (18 static + 509 guides, from `sitemap.ts`).

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<domain>/cancel/netflix
```
Expect 200.

## 5. Security headers sanity

```bash
curl -sI https://<domain>/ | grep -iE "strict-transport|content-security-policy"
```
Both present (set in `next.config.ts`). Nothing to change.

## 6. Google Search Console

- [ ] Add a **Domain** property for `<domain>`. Verification is DNS only: add the `TXT` record Google shows (`google-site-verification=...`) at the registrar, wait, Verify.
- [ ] Sitemaps → submit `https://<domain>/sitemap.xml`.
- [ ] URL Inspection → Request indexing for `/`, `/cancel`, `/compare/no-bank-login`, `/compare/budget-app-no-bank-sync`, `/compare/rocket-money-alternative`, `/compare/monarch-alternative`, `/compare/ynab-alternative` (and the four money pages when they ship).
- [ ] Put the weekly 30-minute GSC ritual (SEO.md §10.3) on the calendar.

## 7. Bing Webmaster Tools

- [ ] Sign in → "Import from Google Search Console" → pick the property. (Bing feeds Copilot and ChatGPT search.)

## 8. Analytics (decision, then engineering)

Recommended: **Vercel Web Analytics on the Hobby plan.** Facts read on vercel.com today: no cookies; visitors identified by a request hash discarded after 24 hours; data points are timestamp, URL, referrer, filtered query params, country/region/city, OS, browser, device type; 50,000 events/month free, collection pauses above that; events are same-origin (so the site's `connect-src 'self'` CSP needs no change).

- [ ] Owner: enable Web Analytics on the project in the Vercel dashboard.
- [ ] Engineering: add `@vercel/analytics` `<Analytics />` to `apps/web/app/layout.tsx`; update `apps/web/app/legal/cookies/page.tsx` §4 (it currently says "Zeno does not run analytics on this website") and the privacy page line "We do not run website or product analytics today"; for EEA visitors load the script only after consent (COMPLIANCE.md §8.9: "opt-in in the EEA and disclose it"). Same deploy for the script and the policy text, never the script first.

Fallbacks if a non-Vercel vendor is preferred: Plausible (reviews read today put the Starter tier at $9/month for 10k pageviews; would need `script-src`/`connect-src` CSP entries) or Umami Cloud (reviews: free Hobby tier to 100k events/month; same CSP note).

## 9. Waitlist webhook

- [ ] Pick a sink and set `WAITLIST_WEBHOOK_URL` to it. The route POSTs JSON `{ email, ... }` (see the route for the exact body). Options: a Resend audience endpoint via a tiny proxy, a Zapier/Make catch hook, or a Google Apps Script web app that appends to a Sheet.
- [ ] Test after deploy:

```bash
curl -s -X POST https://<domain>/api/waitlist -H 'content-type: application/json' -d '{"email":"owner+test@<domain>"}'
```
Expect `{"ok":true}` and the row in the sink. A 502 means the variable is missing.

## 10. Brand SERP (15 minutes)

- [ ] Register the handle on X, Instagram, LinkedIn (company page), YouTube, GitHub org, Crunchbase; bio link to `https://<domain>`. Goal: "zeno subscription tracker" page 1 is ours.
- [ ] Create the Product Hunt maker account (personal, not company) and the AlternativeTo account now; both need to age (30 days / 7 days) before launch.

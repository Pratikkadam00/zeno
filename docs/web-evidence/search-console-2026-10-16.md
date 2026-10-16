# Search Console read, 2026-10-16 — why the traffic is low, and what changed

The owner shared the Performance report (Queries tab, screenshot) twelve days after
the site went live (Netlify 2026-10-04; the Search Console property is dated the same
day). This file records what it showed, what was measured in response, and what was
changed. Average position and the Pages tab were not in the screenshot; both are
asked for in `docs/OWNER_ACTIONS.md`.

## What the report showed

315 queries in the period. The top ten by clicks:

| Query | Clicks | Impressions |
|---|---:|---:|
| zenoapp | 1 | 11 |
| zenoapp pro | 1 | 3 |
| total av cancel subscription | 1 | 1 |
| i got songster plus if i cancel the subscription now do i still can use the plus things for thismonth | 0 | 31 |
| tunnelbear-renewal | 0 | 18 |
| how to cancel clue plus | 0 | 11 |
| hey cancel | 0 | 8 |
| how to cancel songsterr subscription | 0 | 8 |
| cancel wordpress subscription | 0 | 8 |
| mixcloud cancel subscription | 0 | 7 |

Three clicks in total, two of them on the brand. Every non-brand query is a
cancellation guide, and every one of those earned zero clicks.

## What that says

1. **Authority, not relevance.** The site is twelve days old with no inbound links
   (`docs/OWNER_ACTIONS.md`: "zenoapp.in has none yet"). The sitemap was submitted and Bing
   imported at set-up, the owner says (corrected 2026-10-16: this file first said otherwise,
   from a tracker row that had not been updated). `SEO.md` §0: rank is relevance × authority × time, and a new domain takes
   "2–6 weeks after indexing to settle". Nothing on the page side changes that; it is
   the largest factor and it is the owner's list in §10.
2. **The guides Google shows are the thin ones.** Songsterr Plus, Clue Plus, Mixcloud
   Premium, TunnelBear, TotalAV and WordPress.com are all expansion-row services: the
   same five general steps, a guessed `<website>/account` link, and a search
   description that ended "We haven't verified the exact flow yet". Measured live before
   the change: `/cancel/tunnelbear` 243 words; `/cancel/netflix`, a *researched* guide,
   193. Zero clicks at 18 and 31 impressions is what a low position plus a snippet that
   leads with what the page has not done looks like.
3. **The questions were not the ones the page answered.** The highest-impression query
   (31) asks whether access continues after cancelling. "tunnelbear-renewal" (18) is
   about a renewal. "how to cancel X" from someone who pays through an app store is
   answered by Apple's or Google's screen, not the service's. The guide had none of
   this.

## Measured: the guessed cancellation links (F242)

The one unique thing a general guide offered was the service's cancellation link, which
for expansion rows is `<website>/account`, a guess (F25). Fourteen sampled with `curl -I`
on 2026-10-16:

| Status | Count | Examples |
|---|---:|---|
| 404 | 4 | craft.do, macpaw.com/cleanmymac, seekingalpha.com, loom.com |
| 403 | 1 | chegg.com |
| 301/302/307 redirect | 8 | substack, lastpass, sentry, asana, flickr, tunein, creativelive, mlb |
| 200 | 1 | substack.com/account |

Roughly a third of the links were broken outright, and the redirects' destinations were
not checked. A guide whose "direct link to the cancellation page" is a 404 is worse than
one with no link.

## What changed in code (this commit)

- **Every guide gained the service-independent half it was missing**
  (`apps/web/lib/guide-content.ts`): how to tell who bills you; Apple's and Google's own
  cancellation steps, quoted from their support pages (read 2026-10-16); what happens to
  access after cancelling, attributed to Google where Google says it; how to confirm a
  cancellation, using the app's own definition of verified; refunds, deferring to whoever
  billed you; and the usual price from the catalogue, with the yearly figure multiplied
  rather than rounded. Three visible questions with FAQPage schema from the same text.
  Nothing asserts any service's own policy, because the catalogue does not know it.
- **The search description for a general guide** still begins "General steps" (F171) and
  now says what the page answers instead of what it has not verified.
- **A guessed `<website>/account` link is replaced by the homepage** on the page (F242);
  a hand-written link is kept. The catalogue itself is unchanged (D5 covers the app).
- **The sitemap dates every guide 2026-10-16**, a real content change.

Measured after the build: see the commit message for the word counts.

## What this does not do

It does not create authority. Until the owner's list in `docs/OWNER_ACTIONS.md` is done
(request indexing, directories, brand profiles; the sitemap and Bing are done), the guides compete on
content alone from a twelve-day-old domain. Read this report again in thirty days with
the Pages tab and average position visible.

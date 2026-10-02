# Money pages: how to port them (engineering) and the link mesh

Four drafts in this folder, one per intent (`keywords/keyword-architecture.md`). Each file has a metadata block and the copy in the SEO.md §6.1 order: H1, lead, two intro paragraphs, three steps, four "why" items, comparison prose vs two alternatives, pricing anchor, 5 FAQs, final CTA, 3 related guides, and the in-body mesh links.

## Porting rules

- Route: `apps/web/app/<slug>/page.tsx`, static, `ContentShell` + `FAQ` + `JsonLd` + `ComparePageCta` (the waitlist CTA), no new CSS modules.
- Title: bare keyword phrase in `title` (the root template adds ` | Zeno`); full string in `openGraph.title` and `twitter.title`. Check the tab for a doubled suffix (SEO.md §3.1 pitfall).
- Description: use the string in the file; `node -e` count must be 140-160 (the counts in each file were measured on 2026-10-02 with the script in `GROWTH_LOG.md`).
- Full `openGraph` and `twitter` blocks on every page (shallow-merge trap, SEO.md §3.3).
- `FAQPage` JSON-LD must equal the visible 5 FAQs verbatim, same count.
- Prices in `SoftwareApplication.offers` must equal the visible prices exactly.
- Every number in the copy is from the repo (509 services, 480 with a price, 10 free subscriptions, $3.99/$29.99/$79.99) or a dated competitor page (`research/competitor-pricing-2026-10-01.md`). If a price changes in `paywall.tsx` or RevenueCat, change it here the same day.
- Word counts (body copy only, measured 2026-10-02): see `GROWTH_LOG.md`. Target 700-1,000; do not pad.
- No animation hooks on these pages (SEO.md §9.13).

## Link mesh (SEO.md §5.2)

| From | To | Anchor / placement |
|---|---|---|
| Footer (marketing and legal) | all four money pages + `/cancel` + the 5 compare pages | descriptive labels under a "Guides" column |
| Homepage | all four money pages | in the Method section's three items and the FAQ answers ("see the subscription tracker page") |
| Each money page | 3 related guides | the "Related guides" block in each draft |
| Each cancel guide | `/cancel-subscriptions` | one in-body sentence in the new "Make sure it actually stopped" paragraph (`content/cancel-guides/template-spec.md`) |
| Each compare page | its sibling money page | one in-body link: no-bank-login → `/subscription-tracker`; budget-app-no-bank-sync → `/budgeting`; ynab/monarch → `/budgeting`; rocket-money → `/cancel-subscriptions` |
| Each blog post | its parent money page | in-body, keyword-adjacent anchor, where it reads naturally |

## Sitemap

Add the four at priority 0.9 with a real `lastModified` (the commit date), in the same commit as the pages.

## Done when

`npm run typecheck --workspace @zeno/web && npm run lint --workspace @zeno/web && npm run build --workspace @zeno/web` exits 0; the four pages show `○` in the build output; the Phase 8 curl checks in SEO.md §9 pass on a local `next start`.

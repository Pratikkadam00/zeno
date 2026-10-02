# Cancel-guide page template: what changes (engineering spec, website only)

Current page: `apps/web/app/cancel/[slug]/page.tsx` renders difficulty badge, numbered steps, an external "Open {service} cancellation page" link, 6 related guides, `HowTo` + `BreadcrumbList` JSON-LD. Metadata title is `How to cancel {name} — Zeno` (brand-last, good) and the description is a template sentence that includes "difficulty: medium" for 305 unresearched entries.

## Data (catalog, `packages/service-catalog`)

Add optional fields to `Service`: `verifiedAt: string | null`, `trap: string | null`, `billedViaStores: boolean`, `afterCancel: string | null`, `sourceUrl: string | null`. Expansion rows get `null`/`false`. The 20 rows in `top-20-verified.md` fill them.

## Page

1. **Title** stays `How to cancel {name}`; add ` ({year})` only for curated guides whose `verifiedAt` is set, so the SERP shows a current year without lying on the generic ones.
2. **Meta description** (140-160 characters, script-counted): curated → `How to cancel {name}: the exact steps from {name}'s own help page, the trap to avoid, and what happens after you cancel. Verified {Month YYYY}.`; generic → `General steps to find the cancellation setting for {name}, plus how to cancel if you subscribed through Apple or Google. Not yet verified for this service.`
3. **Eyebrow**: curated → `Cancellation guide · Verified {date}`; generic → `Cancellation guide · General steps`.
4. **Difficulty badge**: render only when curated (OPEN_ITEMS F25).
5. **Sections, in order**: the trap (one short paragraph, from `trap`); the steps; "If you subscribed through Apple or Google" (Apple's 118428 steps and Play's subscriptions page, shown when `billedViaStores`); "After you cancel" (`afterCancel`); "Make sure it actually stopped" — one paragraph, same on every guide, that explains Zeno marks a cancellation pending until the next renewal passes without a charge, with the in-body link to `/cancel-subscriptions` (the parent money page, SEO.md §5.2 rule 1). Then related guides and the hub link, as now.
6. **External link**: curated → `sourceUrl`/`cancelUrl`; generic → the service homepage (`website`), labelled "Open {name}". Never a guessed `/account` path.
7. **JSON-LD**: keep `HowTo` (steps from data) and `BreadcrumbList`; add `dateModified` = `verifiedAt` when set. No ratings, no reviews (SEO.md §4.3).
8. **Sitemap**: `lastModified` = `verifiedAt` for curated guides; for generic ones use the date of the last catalog commit that touched them (SEO.md §7.1), never `new Date()`.
9. **Hub** (`/cancel`): two groups per category, "Verified guides" first, then "General steps"; the H1's count stays computed. The homepage Exhibit A caption changes from "each with real, step-by-step cancellation instructions" to "{curatedCount} with verified, step-by-step instructions" computed from the data.

## Word budget

Curated guides should land at 400-700 words of real content (the trap, the steps, the store block, after-cancel, the verification paragraph). That beats the official help page on usefulness without padding.

## Done when

- One curated guide (Netflix) is rebuilt, passes the Rich Results test, and a side-by-side read against resubs.app/resources/how-to-cancel-netflix shows every fact Zeno states is sourced.
- No generic guide shows "Difficulty: medium" or a guessed link.
- `npm run typecheck --workspace @zeno/web && npm run lint --workspace @zeno/web && npm run build --workspace @zeno/web` exits 0.

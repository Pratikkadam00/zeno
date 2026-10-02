# Store listing re-check (limits read 2026-10-01)

Sources: developer.apple.com/app-store/product-page (name 30, subtitle 30, promotional text 170, keywords 100 characters comma-separated no spaces, up to 10 screenshots, up to 3 app previews of 30 s); App Store Connect reference (promotional text 170, description 4000, keywords "up to 100 bytes"); Apple screenshot specifications page (6.9" display 1260×2736, 1290×2796 or 1320×2868 portrait; 6.5" 1284×2778 or 1242×2688; "one to 10 screenshots"); Google Play store listing help (app name 30, short description 80, full description 4000); Play preview-asset page (minimum two screenshots; at least four at 1080 px minimum in 16:9 or 9:16 for large-format placement; JPEG or 24-bit PNG no alpha; feature graphic 1024×500).

## `apps/mobile/store-listing.md` against the limits

| Field | Limit today | Current | Verdict |
|---|---|---|---|
| App Store name | 30 | "Zeno: Subscription Tracker" (26) | OK |
| App Store subtitle | 30 | "Track & cancel, no bank login" (29) | OK |
| App Store keywords | 100 chars / 100 bytes | 97 ASCII chars | OK; ASCII so bytes = chars |
| Promotional text | 170 | 139 | OK |
| Play title | 30 | 26 | OK |
| Play short description | 80 | "Find, track & cancel subscriptions. No bank login, ever. Pay once, own it." (74) | OK, but see wording note 1 |
| Full description | 4000 | well under | OK |

## Wording notes (truthfulness, not limits)

1. "No bank login, ever." The brief's REQUIRED phrase is "No bank login required". "Ever" is the locked onboarding promise ("No bank login. Ever."), so it is allowed, but OPEN_ITEMS F45 flags that Plaid exists dormant and "ever"/"never see your bank" become false the day it ships. Recommend the store copy use "No bank login required." so it never needs a resubmission. Proposed 80-char line (71): "Find, track & cancel subscriptions. No bank login required. Pay once, own it."
2. Full description, line "processed on your device, encrypted, never sent anywhere just to find a subscription": true today (discovery is local). Keep.
3. Full description, "A heads-up 7 and 3 days before any renewal": the app also reminds the morning of. Add "and the day of" for accuracy.
4. Full description, "One-tap cancellation guides for hundreds of services": true (509). Do not write "verified" (F25).
5. No trial is mentioned anywhere in the store copy. Keep it that way until the store offers (F134) exist.
6. Family is not mentioned. Keep it out until F96 is decided.
7. Age rating: COMPLIANCE.md §3 says rate 17+/Teen and never opt into "made for kids"; the minimum age in-app is 16.

These are edits to a file in `apps/mobile`, so the engineering session applies them; this folder only records them.

## Keywords (App Store) — keep, with one check

`subscription tracker,cancel subscription,budget app,bill tracker,recurring charges,trial reminder` (97). Apple's page says the limit is 100 characters; Connect's reference says "100 bytes". Identical for ASCII. No competitor names (Apple rejects them).

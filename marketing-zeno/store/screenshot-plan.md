# Screenshot plan (8 frames per platform; the owner captures from the real app)

Sizes read 2026-10-01: iPhone 6.9" 1290×2796 (or 1260×2736 / 1320×2868), up to 10; iPad 13" required if the app runs on iPad (check `app.config.ts` `supportsTablet` before deciding). Play: minimum 2, at least 4 at 1080 px minimum, 9:16 portrait, PNG 24-bit no alpha; feature graphic 1024×500 without prominent icon-like branding.

Capture rules: release build (memory: debug + Metro wedges the emulator); a ledger with real-looking but owner-entered subscriptions (no sample-data flag in release builds, F138); no invented totals in overlays, the number in the caption must equal the number on screen; light theme for frames 1-7, dark for frame 8; captions in the Honest Ledger type (Space Grotesk display, JetBrains Mono for money) per the design system.

| # | Screen | Caption (≤6 words) | Why first/here |
|---|---|---|---|
| 1 | Dashboard ledger with monthly total | Know what you pay. | the H1 promise; must be frame 1 (store search shows 1-3) |
| 2 | Notifications screen: a 7-day and a 3-day reminder listed | Warned before every charge. | locked promise #3 |
| 3 | Discover: CSV import results list | Import a statement. No bank login required. | the differentiator, with the required phrase verbatim |
| 4 | Cancel guide for Netflix with difficulty tag | Real cancellation steps. | the catalog |
| 5 | Subscription detail in "pending verification" state after cancel | Cancelled means verified. | the honest loop |
| 6 | Budget screen with a monthly cap | A budget cap, free. | budgeting side |
| 7 | Paywall with Lifetime selected | Pay once. $79.99. | pricing hook (number must match the live RevenueCat price) |
| 8 | Settings → App lock / "No account" row, dark theme | Your data stays on your device. | locked promise #2, verbatim |

Feature graphic (Play, 1024×500): the ledger paper texture, the wordmark small, the line "Know what you pay. Cancel before it charges." No icon duplicate.

App preview video (optional, ≤30 s): import CSV → results → set a reminder → cancel → pending → verified. Only if captured from the real app.

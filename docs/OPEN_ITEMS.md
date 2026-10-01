# Zeno — Open items

**One place for everything not yet solved.** Each item says who acts, exactly what to
do, and where the full evidence lives (finding numbers point into
`docs/HARDENING_LOG.md`). When an item is done it is removed from here and its log
entry marked fixed. Last updated 2026-10-01, after P3.3.

---

## 1. Needs you (owner)

Nothing here can be done from this machine: each needs your account, a dashboard, a
real sample, or a product decision.

### Decisions

| # | Decide | Options (my suggestion first) | Why it matters |
|---|---|---|---|
| F96 | What the **Family plan** sells | (a) gate the Family Vault behind the Family plan, and I add a server-side entitlement check on household create/join; or (b) reword the paywall so it doesn't imply something Pro lacks | The paywall sells "Family plan, up to 5 members, $6.99/mo", but household sharing with up to 5 members is free to everyone today (the server caps members regardless of plan; `app/family.tsx` checks no plan). So the plan gives nothing beyond Pro while saying it does. |
| F90 | Boot **refusals or warnings** for risky production settings | (a) keep warnings (today); or (b) make them refuse to boot, after you confirm in the Render dashboard that none of these is set: `DEMO_LOGIN_PASSWORD`, `ALLOW_UNVERIFIED_OAUTH_TOKENS`, a `*` or `http://` CORS origin, an `http://` `MONITORING_WEBHOOK_URL` or `COACH_BASE_URL` | The plan says "refuse to boot". I made them warnings because `main` auto-deploys and a dashboard value I can't see could take the API down. Each is already blocked at request time. |
| F77 | **Logout** and the access token | (a) accept it (the token dies within 15 minutes); or (b) I add a per-session revocation list | After logout, the 15-minute access token keeps working until it expires. The refresh token is revoked at once. |
| F45 | Paywall line **"…and we never see your bank."** | (a) change it to "…and no bank login required." now; or (b) keep it and reword when Plaid ships | True today (bank connect is dev-only). It becomes false the day Plaid ships. |
| F25 | How to present **305 of 509 catalog entries** that hold unresearched data (a guessed cancel link, "difficulty: medium", generic steps) | e.g. an "unverified" label and the homepage instead of a guessed link, or `noindex` on the website until curated | They are shown as fact in the app and on 305 public cancel-guide pages. |

### Actions in your accounts

| # | Do this | Where | Why |
|---|---|---|---|
| F7 | Protect `main`: require the CI and CodeQL checks, block force-push and deletion | GitHub → Settings → Branches (steps in the P0.6 log entry) | Anything can land on, or erase, the branch that auto-deploys to production. |
| F8 | Turn on secret-scanning **push protection**, Dependabot **alerts** and **security updates** | GitHub → Settings → Code security | Free for public repos; can't be checked or set from here without your login. |
| F4 | Confirm the Render service is **Blueprint-managed**, so `render.yaml`'s "deploy only after CI passes" applies. If it was created by hand, set "Auto-Deploy: After CI checks pass" | Render dashboard → the API service | Otherwise a red CI still deploys. |
| F2 | Confirm a deploy of `064fc52` or later is live | Render dashboard → Deploys | Before it, all visitors shared one rate-limit bucket. Every later push should have deployed it; the dashboard is the only proof. |
| F3 | One log check: the request log's `remoteAddress` for a request you make should equal your public IP. If it shows a Cloudflare IP, set `TRUST_PROXY_HOPS=2` | Render → Logs | Rate limits must key on the real client. |
| — | **Nightly fuzz** has never run (GitHub shows 0 runs; the 03:17 UTC schedule didn't fire). Start it once by hand | GitHub → Actions → Nightly fuzz → Run workflow | It passed locally (10 000 runs per route). I'll check the next scheduled run too. |
| — | **RevenueCat:** set **both** `REVENUECAT_SECRET_KEY` and `REVENUECAT_WEBHOOK_AUTH` on Render, and the public SDK keys in the app build | Render; RevenueCat dashboard; EAS env | Since P2.8 a webhook only asks the server to re-check with RevenueCat; without the secret key every user reads as free (the server now warns about this at boot). |
| — | **Sentry:** create the project and set `EXPO_PUBLIC_SENTRY_DSN`, plus org, project and auth token for the source-map and R8 mapping upload | Sentry; EAS env | Until then crash reporting is off, and once on, an R8-obfuscated release crash can't be read without the mapping. |
| F11 | **Google client IDs** (A3). Then I move Google sign-in and Gmail connect off the custom-scheme redirect | Google Cloud console | Google's own guide says custom URI schemes are no longer supported on Android, so these sign-ins are likely rejected there. I can't confirm or fix without the IDs. |
| F19 | One **real Wells Fargo CSV export** (redact it) | send the file | The detector assumes a header row WF may not have. If wrong, the first transaction is silently dropped. |
| — | Before shipping iOS: the annual **encryption self-classification** report (BIS / NSA) | export compliance | `app.config.ts` declares non-exempt encryption (SQLCipher), relying on the mass-market exemption, which requires the filing. |

---

## 2. Mine, scheduled (no input needed)

| # | Item | When |
|---|---|---|
| — | P3.4–P3.9: the PIN review, deep links, no secret in the bundle, screen capture on the lock screens, tests for all 29 screens, a static scan of the release APK | P3, next, in order |
| F14 | The PIN lockout uses the device clock, so moving the clock forward skips the 15-minute wait (each cycle still costs 10 attempts) | P3.4 |
| F16 | SQLCipher encryption of the local database is configured but never proven on a device (check the file header or `PRAGMA cipher_version`; the release build isn't debuggable, so it needs a rooted emulator image or a debug check) | P3 gate |
| F1 | `ServiceAutocomplete.tsx` has no test | P3.8 |
| F29 | The Settings screen's *use* of the new inbox count isn't covered by a screen test yet (the hook itself is, at 100 %) | P3.8 |
| F94 | A translucent Settings sheet, seen once on device and not reproduced in 5 attempts | P3.8 / P5 |
| F21 | `Date.parse` silently shifts impossible dates ("02/30" becomes 2 March) | P6 |
| — | R8 warns about RevenueCat's Amazon Appstore SDK ("may be assumed not reachable" in later R8 versions). Not used for Google Play; re-check on each RevenueCat upgrade | each RevenueCat upgrade |
| — | Sentry and RevenueCat code paths haven't run under R8 (no keys yet). Re-run the device smoke when the keys exist, and in the Sentry UI check one JS error and one native crash for scrubbed content (P3.3: a native crash skips `beforeSend`; only its breadcrumbs are scrubbed, by `beforeBreadcrumb`) | after the keys above |
| — | Size the webhook's 30/min limit, and an edge rate limiter (the app's is per instance) | P8 |

---

## 3. Solved today from this list

| # | What was wrong | Fixed |
|---|---|---|
| F29 | Settings' "Connected inboxes" always said "None connected", even with Gmail connected | It now reads the device's real list on every visit ("1 inbox", "Unavailable" if the keychain can't be read). |
| F18 | CSV import labelled every amount USD, even from a non-US bank | US bank formats stay USD. Other files use the currency their own amounts show (€, £, ₹, Rs., CA$, A$, ISO codes). A file of bare numbers uses **your home currency**, an assumption I've stated here, not hidden. Better still would be letting you pick the currency at review; that is a design change, so it's not done. |
| F95 | Found while fixing F18: amounts written **CA$** (how the app itself writes Canadian dollars) were detected as **Australian** dollars, in email receipts and CSVs | CA$ now counts as CAD. |
| F15 | "Do paid server features check the plan on the server?" (due in P2, never confirmed) | Confirmed: every Pro feature (unlimited subscriptions, category and envelope budgets) runs only on the device, and the AI coach is free, so the server holds nothing paid to gate. The real gap this exposed is F96 above. |

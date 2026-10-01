# Zeno — Open items

**One place for everything not yet solved.** Each item says who acts, exactly what to
do, and where the full evidence lives (finding numbers point into
`docs/HARDENING_LOG.md`). When an item is done it is removed from here and its log
entry marked fixed. Last updated 2026-10-01, after P3.8b.

---

## 1. Needs you (owner)

Nothing here can be done from this machine: each needs your account, a dashboard, a
real sample, or a product decision.

### Decisions

| # | Decide | Options (my suggestion first) | Why it matters |
|---|---|---|---|
| F96 | What the **Family plan** sells | (a) gate the Family Vault behind the Family plan, and I add a server-side entitlement check on household create/join; or (b) reword the paywall so it doesn't imply something Pro lacks | The paywall sells "Family plan, up to 5 members, $6.99/mo", but household sharing with up to 5 members is free to everyone today (the server caps members regardless of plan; `app/family.tsx` checks no plan). So the plan gives nothing beyond Pro while saying it does. |
| F14 | What stops someone who holds the **unlocked phone** and moves its **clock forward** past each PIN lockout | (a) build a small native clock that keeps counting through sleep and ignores the wall clock (Android `elapsedRealtime`); a reboot still resets it; or (b) accept it as it is; or (c) an opt-in "erase Zeno's data after N wrong PINs", as iPhones offer (data loss if a child plays with it) | Without a trusted clock, each clock change wins one guess after the first 10. A 4-digit PIN can take up to 9,990 manual clock changes. The uptime clock already installed stops during sleep, so it can't tell a moved clock from a sleeping phone. |
| F104 | Two **photo-read permissions** the screen-capture library adds for a feature Zeno doesn't use | (a) let me download an Android 13 emulator image (a large download) to prove they can be removed safely, then remove them; or (b) keep them and file Google Play's photo-permission declaration | The third one, `DETECT_SCREEN_CAPTURE`, must stay: removing it crashed the app at launch, as I found on the emulator. Removing the other two looks safe from the library's code, but has not been run on an Android 13 phone. |
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
| F101 | The real **store listing links** (App Store id, Play package page), once published | send them | "Rate Zeno" opens Apple's store front page on every platform, Android included. |
| F19 | One **real Wells Fargo CSV export** (redact it) | send the file | The detector assumes a header row WF may not have. If wrong, the first transaction is silently dropped. |
| — | Before shipping iOS: the annual **encryption self-classification** report (BIS / NSA) | export compliance | `app.config.ts` declares non-exempt encryption (SQLCipher), relying on the mass-market exemption, which requires the filing. |

---

## 2. Mine, scheduled (no input needed)

| # | Item | When |
|---|---|---|
| — | P3.8–P3.9: tests for all 29 screens, a static scan of the release APK (incl. why the APK declares `SYSTEM_ALERT_WINDOW` and `WRITE_EXTERNAL_STORAGE`) | P3, next, in order |
| F106 | Once, right after the first unlock on a fresh install, screenshots of the unlocked app came back black (the block itself was already off); not reproduced in 2 tries | P5 |
| F103 | The **web build fails on CI now and then**: it downloads the site's three Google fonts at build time, and that download sometimes fails on the runner (likely cause; the next occurrence's report will confirm it). Fix: serve the same font files from the repo, so the build needs no network | P4 (website), or sooner if you want it |
| F16 | SQLCipher encryption of the local database is configured but never proven on a device (check the file header or `PRAGMA cipher_version`; the release build isn't debuggable, so it needs a rooted emulator image or a debug check) | P3 gate |
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
| F97 / F102 | The **intermittent account-deletion test** on CI | It was a real bug: on the production database server, a save still in flight when an account was deleted could land after the delete and bring the data back (a bank token included), and two quick saves could leave the older one. Saves to one record now happen in order, and deletion waits for saves already under way. The test also had its own bug (a wait that never waited), now fixed. |
| F107 | Found in P3.8b: users who turned on **reduce motion** still saw a component's first animation (the "verified" stamp slammed in, with its buzz) | The app now remembers the setting once it is read at launch, so later screens start still. |
| F1 | `ServiceAutocomplete` (the name suggestions on "Add subscription") had no test | 8 tests against the real catalog. |
| F105 | Found in P3.7: while the app was **locked**, a screen reader (or any app with accessibility access) could still **read the whole ledger** behind the lock screen, every amount included | The app is now hidden from accessibility services whenever the lock is showing; proven on the emulator (locked: only the lock screen; unlocked: the ledger again). |
| F100 | Found in P3.5: a **sign-in link someone else sent** signed the phone into **their** account with one tap, and a junk link signed you out | A link now works only on the phone that asked for it, for the email typed there, before it expires, and never while someone is signed in. A link for a different account is thrown away. |
| F98 | Found in P3.4: Settings → App lock checked the PIN with **no attempt limit**, so anyone holding the unlocked app could try every PIN there, learn it, and turn the lock off | It now counts against the same 10 attempts and lockout as the lock screen. Separately, wrong PINs after the 10th now lock for longer each time (15 min, 30 min, 1 h … up to 24 h) instead of a flat 15 minutes. |
| F99 | An intermittent CI failure in the screen tests (twice) | Found once CI could report it: the first test in a suite timed out while CI's cold cache transformed the app's modules (about 2 s even on a fast machine; the limit was 5 s). The limit is now 30 s. |
| F15 | "Do paid server features check the plan on the server?" (due in P2, never confirmed) | Confirmed: every Pro feature (unlimited subscriptions, category and envelope budgets) runs only on the device, and the AI coach is free, so the server holds nothing paid to gate. The real gap this exposed is F96 above. |

# Zeno — Open items

**One place for everything not yet solved.** Each item says who acts, exactly what to
do, and where the full evidence lives (finding numbers point into
`docs/HARDENING_LOG.md`). When an item is done it is removed from here and its log
entry marked fixed. Last updated 2026-10-02, after FX.4.

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
| F114 | The Gmail card's promise **"Scanned on your device — nothing leaves your phone"** | (a) "Scanned on your device — your emails never reach Zeno's servers" (true: verified in the code); or (b) keep it | Emails really are read only on the phone. But "nothing" is absolute: after an import the app sends an anonymous "import completed" event, and with sync on, encrypted copies of what you save go to the server. |
| F90 | Boot **refusals or warnings** for risky production settings | (a) keep warnings (today); or (b) make them refuse to boot, after you confirm in the Render dashboard that none of these is set: `DEMO_LOGIN_PASSWORD`, `ALLOW_UNVERIFIED_OAUTH_TOKENS`, a `*` or `http://` CORS origin, an `http://` `MONITORING_WEBHOOK_URL` or `COACH_BASE_URL` | The plan says "refuse to boot". I made them warnings because `main` auto-deploys and a dashboard value I can't see could take the API down. Each is already blocked at request time. |
| F77 | **Logout** and the access token | (a) accept it (the token dies within 15 minutes); or (b) I add a per-session revocation list | After logout, the 15-minute access token keeps working until it expires. The refresh token is revoked at once. |
| F45 | Paywall line **"…and we never see your bank."** (and Settings' "We never ask for your bank login", Profile's "We never see your bank login") | (a) change it to "…and no bank login required." now; or (b) keep it and reword when Plaid ships | True today (bank connect is dev-only). It becomes false the day Plaid ships. |
| F146 | The design's **"Every closed month is stamped into your Year in Review"** | (a) leave it out, as now; or (b) I build it (Year in Review gains a budget section from the recap's months) | The recap claimed it, as Pro; neither part was true, so the line is gone. |
| F140 | **Envelopes** (sold as Pro) can't be set up: every envelope is "New envelope", $100, with only a "Log $5" button | (a) a design for the envelope editor (name, amount, a spend of any size), which I then build; or (b) take envelopes off the paywall until it exists | It's one of the three things Pro sells. The design only drew it as a locked row. |
| F138 | **Sample data** for new users | (a) none in release builds, as now: a new ledger starts empty, as onboarding says; or (b) an opt-in "Try it with sample data" on the empty ledger, clearly labelled, no reminders, removable in one tap | Until P3.8e-2, every new user's ledger started with 5 subscriptions that weren't theirs ($107.46/mo), with real reminders for them, and 5 of the 10 free slots used. Development builds still get the samples. |
| F127 | What **"Export my data"** covers | (a) keep the export to subscriptions and their notes, as the row now says; or (b) I add budgets and price history to the file, as the design's "EVERYTHING, AS CSV" promises | Until P3.8e-1 the row said "everything" and the file lacked even the notes. Notes are in now, and the row says what the file holds. |
| F25 | How to present **305 of 509 catalog entries** that hold unresearched data (a guessed cancel link, "difficulty: medium", generic steps) | e.g. an "unverified" label and the homepage instead of a guessed link, or `noindex` on the website until curated | They are shown as fact in the app and on 305 public cancel-guide pages. |
| F161 | The **widget snapshot** (next renewal's name and amount, the monthly total) is written in plaintext to app-private storage, though no widget ships yet | (a) stop writing it until a widget ships, then move it to an encrypted shared store; or (b) keep it (app-private, not backed up, erased with the data) | Data minimisation (MASVS-PRIVACY-1); read off the emulator with root in the P3 gate. |
| — | The **MASVS controls marked "decision"** in `docs/MASVS_CHECKLIST.md`: certificate pinning (NETWORK-2), forced updates (CODE-2), the minimum Android version, 24 today (CODE-1), root/tamper/debugger detection (RESILIENCE-1 to 4), and the PIN for erase/export (AUTH-3) | each row there has the options | They are product and operations trade-offs, not defects. |

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
| F134 | Set up the **Pro free trial** in both stores so the paywall can offer it: an App Store introductory offer (free, 1 week if you keep the design's "7-day"), and on Google Play a **new-customer-acquisition** offer (not "developer determined", which Play shows even to people who already had a trial) | App Store Connect; Play Console | The paywall now promises a trial only when the store offers this user one. Without these offers it says "Subscribe" and "Charged today", which is true but loses the trial. |
| F101 | The real **store listing links** (App Store id, Play package page), once published | send them | "Rate Zeno" opens Apple's store front page on every platform, Android included. |
| F19 | One **real Wells Fargo CSV export** (redact it) | send the file | The detector assumes a header row WF may not have. If wrong, the first transaction is silently dropped. |
| — | Before shipping iOS: the annual **encryption self-classification** report (BIS / NSA) | export compliance | `app.config.ts` declares non-exempt encryption (SQLCipher), relying on the mass-market exemption, which requires the filing. |

---

## 2. Mine, scheduled (no input needed)

| # | Item | When |
|---|---|---|
| — | **FX.5-FX.6** (the fix pass), then **P4** | next, in order |
| F163 | A **paused** subscription counts $0 in the spend history, even for months paid before the pause (needs the pause intervals) | FX.6 |
| F106 | Once, right after the first unlock on a fresh install, screenshots of the unlocked app came back black (the block itself was already off); not reproduced in 2 tries | P5 |
| F94 | A translucent Settings sheet, seen once on device and not reproduced in 5 attempts | P3.8 / P5 |
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
| F131 | Found in P3.8e-1: a subscription with an **unknown billing cycle** showed its price as **"/month"** | No cycle is shown when the app doesn't know it. |
| F130 | Found in P3.8e-1: a **yearly plan's price rise** read "$99.00 → $119.00**/mo**" | It shows the plan's own cycle now ("/year"). |
| F129 | Found in P3.8e-1: **Notifications' "Upcoming reminders" weren't the real ones**: reminders you'd switched off, wrong days for free trials, quiet hours ignored | The screen now lists exactly what the phone will show. |
| F128 | Found in P3.8e-1: Profile said the lock used **"Face ID + PIN"** on every phone, even without biometrics, and on Android | It says "PIN" or "PIN + biometrics", as the phone allows. |
| F126 | Found in P3.8e-1: Settings showed **"Version 1.0.0"**; the app is 0.1.0 | Shows the real version. |
| F125 | Found in P3.8e-1: Settings and Profile showed an **internal account id where your email belongs** (or a made-up "you@example.com") | Your email is shown now. |
| F124 | Found in P3.8e-1: Settings' **"Push notifications" switch did nothing** | It's now "Renewal reminders" (as designed) and really turns every reminder off and on. |
| F103 | The **website build failed on CI now and then**, downloading its fonts from Google | The fonts are in the repo; the site builds with the network blocked. |
| F162 | With Settings' sheet open, a **screen reader could move to the controls behind it** | The sheet is its own window; checked with TalkBack. |
| F147 | The spend history counted a **cancelled subscription as $0**, even for the months it was paid | It counts each one up to the day it was cancelled. |
| F21 | `Date.parse` kept impossible dates as a different day, and read US and month-name dates as local time (a day early for UTC+ users) | One strict UTC parser for every CSV and receipt date. |
| F159 | Found in the P3 gate: **the app lock could be bypassed**: a menu, editor or alert left open when the app locked stayed on top and kept working (Pause ran on a locked app) | Modals now hide while locked and the lock is the topmost window; verified on the emulator. |
| F157 | Found in the P3 gate: the **headline totals counted cancelled and paused plans** ($25.49 over lines that added to $15.49) | One rule for every total; the numbers agree on the device. |
| F160 | Found in the P3 gate: **a paused subscription could never be resumed** | "Resume subscription" in its menu. |
| F156 | Found in the P3 gate: three preview screens showed their **raw route name as the title** ("public-api") | Proper titles; a test covers every route. |
| F158 | Found in the P3 gate: the widget data said **"today" for a renewal tomorrow** | Counts calendar days. |
| F16 | SQLCipher never proven on a device | Proven in the P3 gate: the database file is encrypted on disk. |
| F112 | Whether screen readers reach buttons nested in other buttons | Checked with TalkBack in the P3 gate: they do. |
| F155 | Found in P3.9: **the app asked for "draw over other apps" and shared-storage write** without using either (Expo's template adds them) | Both removed from the APK. |
| F154 | Found in P3.8f-3: **opening the app from a sign-in link could leave you signed out** (the session saved, the screen on sign-in) | The sign-in now always sticks. |
| F153 | Found in P3.8f-2: **"Notify me when it's ready" was a fake waitlist** ("You're on the list ✓"); nothing was recorded | Removed. |
| F151 | Found in P3.8f-2: two **developer screens (sandbox bank, server status) could be opened in the released app** by a link | Development builds only. |
| F150 | Found in P3.8f-2: **"Leave household" could leave you in it**, still sharing your total, when the connection dropped | It leaves only when the server confirms, and says so if not. |
| F148 | Found in P3.8f-2: your **family saw your internal account id** as your name | Your email's name, or "Member". |
| F147 | Found in P3.8f-2: Year in Review said **"You spent"** (and shared it) for an estimate that leaves out cancelled subscriptions | It says "committed on the subscriptions you track now". |
| F146, F149, F152 | Found in P3.8f-2: the recap promised budgets feed Year in Review (as Pro); a join code could be short; Widgets promised to tell you when it ships | Each fixed. |
| F145 | Found in P3.8f-1: the coach said cancelling its picks would **"get under" your budget when they didn't** | It says so only when it's true. |
| F144 | Found in P3.8f-1: setting a budget **started at $5**, not the suggested amount, and Start saved $5 | It starts at the suggestion. |
| F143 | Found in P3.8f-1: the budget recap gave a **brand-new user a "5-month streak" to share**, and called an estimate "Actually spent" | Only months after you set the budget count, and it says "Estimated spend". |
| F142 | Found in P3.8f-1: the coach told users to **"add an AI key on the server"** | It says coaching isn't available right now. |
| F141 | Found in P3.8f-1: the budget marked the **free** Spend Coach as **Pro** | Badge removed. |
| F139 | Found in P3.8f-1: the budget's cut list read **"$99.00/mo · $1,188.00/yr"** for a $99 yearly plan | Each shows its own cycle. |
| F138 | Found in P3.8e-2: **every new user's ledger started with 5 sample subscriptions** (Adobe, Netflix…) as if they were theirs, with real reminders | A new ledger starts empty now, as onboarding says (your decision on an opt-in sample is above). |
| F137 | Found in P3.8e-2: a purchase that left Pro **inactive still said "Zeno Pro is active"** | It says Pro isn't active yet and points to Restore purchases. |
| F136 | Found in P3.8e-2: buying **Family said "Welcome to Pro"** | Names the plan bought. |
| F135 | Found in P3.8e-2: closing the store's purchase sheet **showed an error** | Silent now; real failures still show. |
| F134 | Found in P3.8e-2: the paywall **always promised "7-day free trial · No charge until trial ends"**, even to someone the store would charge at once | It promises a trial only when the store offers you one (store setup is above). |
| F133 | Found in P3.8e-2: the paywall promised **"we'll remind you before [the trial] ends"**; nothing does | The promise is gone. |
| F132 | Found in P3.8e-2: **Android showed "Continue with Apple"**, which can only fail there | iOS only now. |
| F123 | Found in P3.8d-2: Add subscription **started every price at $9.99**, so a service with no known price was saved at $9.99 unless you noticed | The amount starts empty now; Save waits for one. |
| F122 | Found in P3.8d-2: Add subscription read **"1,99" as $1.00** and "1e3" as $1,000 | Only a plain amount (up to 2 decimals) can be saved. |
| F121 | Found in P3.8d-2: **a note typed on Add subscription was thrown away** | Saved now. |
| F120 | Found in P3.8d-2: **Add subscription's reminder switches did nothing**; every new subscription got all three reminders | The switches you set are the reminders you get. |
| F119 | Found in P3.8d-2: after cancelling a **$99 yearly plan**, the card said "**Every month +$99.00**" | Labelled by the real cycle now (every week / month / quarter / year). The cancel guide also no longer claims a yearly saving for an unknown cycle (F117). |
| F118 | Found in P3.8d: opened from a notification at a cold start, a subscription's **edit form showed no name and $0.00** | The form now fills from the subscription when you start editing. |
| F117 | Found in P3.8d: for a subscription with an **unknown billing cycle** the app **invented a yearly cost** (and a "you're saving $X/yr") | No yearly figure is claimed without a known cycle. |
| F116 | Found in P3.8d: the estimated **charge history was wrong for anything billed on the 29th–31st** (31 Mar, 3 Mar, 3 Feb…) | Now 31 Mar, 28 Feb, 31 Jan. |
| F115 | Found in P3.8d: typing an impossible date like **30 February** saved it as **2 March** | Refused now, here and in Discover. |
| F113 | Found in P3.8c-2: in Discover, **editing a found subscription's price turned $9.99 into $999**, a partial date was replaced by another date, and **clearing the date crashed the app** | Fixed: the fields keep what you type and Save waits for a valid amount and date. |
| F110 | Found in P3.8c: **Insights showed every saving 100× too small** ("Save $0.22/mo" for a $22 saving) | Fixed. |
| F111 | Found in P3.8c: in **US time zones** the calendar's day panel was headed with the **day before** the one you tapped | Fixed (measured in New York and Los Angeles time). |
| F109 | Found in P3.8c: screen-reader users heard a subscription row **without its price or date** | The row now announces what it shows. |
| F108 | Found in P3.8c: an empty "Ways to save" heading on the dashboard | It now appears only when there is a saving to show. |
| F107 | Found in P3.8b: users who turned on **reduce motion** still saw a component's first animation (the "verified" stamp slammed in, with its buzz) | The app now remembers the setting once it is read at launch, so later screens start still. |
| F1 | `ServiceAutocomplete` (the name suggestions on "Add subscription") had no test | 8 tests against the real catalog. |
| F105 | Found in P3.7: while the app was **locked**, a screen reader (or any app with accessibility access) could still **read the whole ledger** behind the lock screen, every amount included | The app is now hidden from accessibility services whenever the lock is showing; proven on the emulator (locked: only the lock screen; unlocked: the ledger again). |
| F100 | Found in P3.5: a **sign-in link someone else sent** signed the phone into **their** account with one tap, and a junk link signed you out | A link now works only on the phone that asked for it, for the email typed there, before it expires, and never while someone is signed in. A link for a different account is thrown away. |
| F98 | Found in P3.4: Settings → App lock checked the PIN with **no attempt limit**, so anyone holding the unlocked app could try every PIN there, learn it, and turn the lock off | It now counts against the same 10 attempts and lockout as the lock screen. Separately, wrong PINs after the 10th now lock for longer each time (15 min, 30 min, 1 h … up to 24 h) instead of a flat 15 minutes. |
| F99 | An intermittent CI failure in the screen tests (twice) | Found once CI could report it: the first test in a suite timed out while CI's cold cache transformed the app's modules (about 2 s even on a fast machine; the limit was 5 s). The limit is now 30 s. |
| F15 | "Do paid server features check the plan on the server?" (due in P2, never confirmed) | Confirmed: every Pro feature (unlimited subscriptions, category and envelope budgets) runs only on the device, and the AI coach is free, so the server holds nothing paid to gate. The real gap this exposed is F96 above. |

# Zeno — Open items

**One place for everything not yet solved.** Each item says who acts, exactly what to
do, and where the full evidence lives (finding numbers point into
`docs/HARDENING_LOG.md`). When an item is done it is removed from here and its log
entry marked fixed. Last updated 2026-10-04, in P5; the owner items moved to OWNER_ACTIONS.md.

---

## 1. Needs you (owner)

Moved to its own file, **`docs/OWNER_ACTIONS.md`** (2026-10-02): the account actions,
the decisions with a sourced recommendation each, and the tests only you can run.
Nothing that needs you is kept here, so there is one list to work from.

---

## 2. Mine, scheduled (no input needed)

| # | Item | When |
|---|---|---|
| — | **P5 done (2026-10-04):** 13 Maestro flows and the 17-screen accessibility audit green on GitHub's emulator and locally. Left: read the first *scheduled* run (due ~10:00 UTC 2026-10-05; same job) and then P6 | next session |
| — | Blog: four posts live (2026-10-04); more posts as real material comes (each must pass the truthfulness rail and quote no figure the catalog can't back) | as written |
| — | SEO: re-measure the live site after the next deploy (Lighthouse: heading order fixed, hubs live, general-guide labels); after the owner makes the Netlify project public, confirm the console error is gone; after Search Console has ~60 days of data, D16 | next deploy; ~2026-12 |
| F200 | On a wide screen, text typed in the first ~65 ms after the homepage loads is lost (the page switches to its book layout); too fast for a person, it only tripped a test | design-level, if ever |
| F199 | Made-up cancel-guide addresses each put an "error" line in the website server's log (the visitor gets the right "not found" page) | P8 (log alerting) / Next upgrades |
| F191 | A rare native crash (1 in ~33) right after "Continue without an account": react-native-screens + Reanimated re-entering a fragment transaction. No released fix; re-test on each screens/reanimated upgrade; the nightly run counts it | each upgrade |
| — | ZAP's "CSP: style-src unsafe-inline" (10055-6) on the website accepted until 2027-03-31 (`.zap-accepted.json`, reasons in the P4.5 log): re-review then, or sooner if the site ever shows user data | by 2027-03-31 |
| — | `braces` advisory accepted until 2026-11-30 (no fix exists; only Expo's developer CLI reaches it): re-check for a fixed release | by 2026-11-30 |
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
| F186 | Building the website **left a copy of every secret in the build environment on disk** (inside the build tool's cache) | That cache is off; our builds never reused it. CI now builds with a decoy value in every secret and fails if any shows up in the build. |
| F184 / F185 | The website's hidden analytics address showed a **bare error page** (no language set, the dark theme ignored), and the site had **no icon** in browser tabs | It shows the site's own "Page not found"; the site uses Zeno's icon. |
| F202 | **Near midnight the app was a day off your own calendar**: "today" was the UTC date, so a renewal could read "today" (and count as charged) when it was tomorrow where you are | "Today" is your phone's date, everywhere in the app. |
| F178 | The app's **faint grey labels and the green "verified" ink were below the accessibility standard** (WCAG AA), as the website's were | Darkened (lightened in dark mode) by the smallest step that passes; measured on the phone screen. |
| F192 | If the phone blocked Zeno's notifications, the app **still said renewal reminders were on** | It says they're blocked and opens the phone's settings. |
| F193 | After a scan, Discover said **"You could be saving $X/year in subscriptions you'd forgotten about"** (the full cost, called saving) | "These cost you $X/year, at their current prices". |
| F196 / F197 | The Calendar's **"Projected year" and "This month" disagreed** with the subscription screen and the Ledger | Both now use the same figures. |
| F188 | A cancellation could be marked **"Verified cancelled, no charge found"** a month before the charge it was meant to check | It can be confirmed only after that date; a charge can be reported any time. |
| F189 | Cancelling a plan **erased the charge it had already made** this month from "Charged so far" | Charges before the cancellation still count; later ones don't. |
| F190 | Family offered Create and Join to people without an account, which could only fail | It says a household needs an account and offers Sign in. |
| F183 | Anyone could make the website's server **write files to its disk without limit**, by asking for made-up cancel-guide addresses | Made-up addresses get the ready-made "not found" page; nothing is written. |
| — | The website allowed **any inline script** to run, so one HTML-injection bug would have been enough for an attack | Each page now allows only its own scripts, by fingerprint; an injected one is blocked (tested in Chrome). |
| F182 | **Imported renewal dates showed a day early** everywhere west of UTC (the Americas) | They show the day they name, in every timezone; tests run in six zones. |
| F181 | The Calendar's "N RENEWALS" could **disagree with the month's total** beside it at a month's edge (west of UTC) | Both count the same renewals now; the tests also run far from UTC in CI. |
| F180 | On a slow phone the **homepage took ~2.9 s to show anything** (Google's "good" line is 2.5 s) | ~1.9-2.4 s now: the browser lays out only what's on screen first. |
| F179 | On a wide screen, the **menu's "Pricing", "FAQ" and other section links did nothing** on the homepage (its page-turning mode) | They turn to that section. |
| F177 | **Text on every page was too faint** for the accessibility standard (WCAG AA): small grey labels, the "medium" difficulty badge, a green label, in both themes | Each colour darkened (or lightened in dark mode) by the smallest step that passes; the design is unchanged otherwise. |
| F176 | Three small overstatements ("the exact amount", "protected by a biometric app lock", "cancel in one tap") | Stated exactly. |
| F175 | The privacy policy said **no product analytics** (the app sends anonymous counts of four events), named only **Groq** (Claude is the default), claimed to record the **referring page**, and gave the wrong link lifetime | Each now matches the code, and a test keeps them matched. |
| F174 | The cookie policy described **cookies and consent controls that don't exist** | It says what's true: no cookies; one stored item, your theme choice. |
| F173 | The Monarch comparison said Monarch **requires** a bank connection; its own help center documents manual accounts | Corrected. |
| F172 | Four feature pages showed **unavailable features as available** (Business, Public API, Partners, Widgets), with unlabelled example data; the sample dashboard said **"Live"** | Marked "Planned · not available today"; examples labelled; "Sample data". |
| F171 | The homepage said **every** catalog service has real step-by-step instructions; **39 of 509** do, 470 carry general steps | The claim is now true; what to do about the 470 is your D5. |
| F166 | The site said a cancellation is verified once a **statement shows no charge**; the app checks that **no charge was recorded** by the renewal date | The site now says exactly what the app does. |
| F170 | "Skip to content" **went nowhere on the legal pages** (and the sample analytics page) | It jumps past the navigation there too. |
| F169 | Without JavaScript, the **homepage below the hero was invisible** (every section started at opacity 0 and only scripts revealed it) | Shown finished when scripts never ran; unchanged with them. |
| F168 | The footer's "How it works", "Pricing", "FAQ" and "Join the waitlist" **did nothing on every page but the homepage** | They link to the homepage's sections from anywhere. |
| F167 | After a waitlist error, typing again left the **error message on screen** | It clears as you type. |
| F165 | The structured data (JSON-LD) didn't escape `<`, so catalog text containing `</script>` could have broken out of its tag | Escaped as Next's guide says. |
| F164 | Insights' monthly chart gave a **screen reader the months but not the amounts** | Each month reads with its amount. |
| F163 | A **paused subscription counted $0** in the spend history, even for months paid before the pause | Pauses are recorded; history skips only the months inside one. |
| F94, F106 | A see-through Settings sheet, and black screenshots after a first unlock, each seen once | **Not reproduced** in FX.5's measured attempts (closed, not claimed fixed); P5 keeps watching. |
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

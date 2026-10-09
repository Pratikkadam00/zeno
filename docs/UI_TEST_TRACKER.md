# UI and attack-resistance tracker

The live tracker for `docs/UI_TEST_PLAN.md`. One row per check. A row moves to **pass**
only with its evidence named (a test, a script's saved output, a screenshot in
`docs/ui-evidence/`, a measurement); a **fail** names its finding (F‹n›) and moves to
pass when the fix is proven. Order of work: U6, U7, U1, U3, U2, U4, U5.

**Status:** ⬜ to do · 🔄 in progress · ✅ pass · ❌ fail (finding open) · 🔒 needs the owner
· ⏸ blocked (says why)

**Summary (2026-10-09): the plan is complete.** 100 checks, every one with a verdict:

| | |
|---|---|
| ✅ pass | 79 |
| 🔒 the owner's | 10 |
| ⏸ blocked or not applicable, with the reason | 6 |
| ❌ open finding | 3 |
| ⬜ untouched | 0 |

Worked in the order the owner asked (U6 and U7 first, because they protect money and
data): U7, U6, U1, U3, U2, U4, U5. Each area has its own evidence file under
`ui-evidence/`, with the test, measurement or capture that proves each cell.

**Findings F229–F240.** Fixed and proven: F230 (an Expo push token nothing used), F231
(task hijacking), F232 (the biometric prompt accepted the phone's own PIN, so anyone who
knew it got past Zeno's lock), F233 (the status colours were unreadable as text — warning
at 2.04:1 on paper), F234 (header buttons under 44 pt), F236 (at font scale 2.0 the ledger
showed "$0.0" for "$0.00"), F237 (scroll-indicator inconsistency), F238 (the app and the
site defaulted to a domain Zeno does not own, parked for sale — Terms opened a GoDaddy
listing), F239 (a raw Java exception on the sign-in screen). Open: F229 (D22, reminder
text on a locked phone), F235 (R35, the calendar library's 32 pt day cells), F240 (D23,
the "sample figures" caveat below the fold on a 4-inch phone).

**Left to the owner:** the older Android images (API 24, 28, 31, 34 — about a gigabyte
each), one real phone, iOS (R22), a nightly app visual comparison (it needs an emulator in
the runner), and the decisions D22 and D23.

## U6 · UI security on the device

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U6.1 | Reminder notifications on a **locked** screen: name and amount hidden? | 🔒 | owner D22 (F229, R34) · a PIN-locked phone shows 'Netflix renews in 3 days · $15.49' under Android's default; 'Zeno · in 4d' under 'hide sensitive content' (captures 10/11, 18/19) · [u6-device-security-2026-10-09.md] |
| U6.2 | Notification channel visibility (`dumpsys notification`) | ✅ | pass · channel zeno-renewals, importance HIGH; reminders post on it vis=PRIVATE; before F230 the emulator had no channel and no permission prompt · [u6-device-security-2026-10-09.md] |
| U6.3 | Tapjacking: touches refused when another app draws over the PIN screen | ✅ | closed by the platform · Android 12+ blocks untrusted-overlay touches (device at the platform default); no filterTouchesWhenObscured; Android 7–11 residual added to R20; no overlay test app built · [u6-device-security-2026-10-09.md] |
| U6.4 | Tapjacking: same over the paywall and sign-in | ✅ | same as U6.3 · [u6-device-security-2026-10-09.md] |
| U6.5 | Task hijacking: `taskAffinity` / `launchMode` in the built manifest, tried with a test app | ✅ | fixed F231 · plugins/withTaskAffinity.js sets taskAffinity="" on .MainActivity; aapt2 on the packaged APK: taskAffinity="", launchMode=singleTask; app.config.test.ts pins it; no hijack test app built · [u6-device-security-2026-10-09.md] |
| U6.6 | Keyboard learning: amount, email, notes and PIN inputs' attributes | ✅ | pass · PIN: secure, number-pad, autofill off, autocomplete off, no context menu; email: autoCorrect off, autoCapitalize none; amounts: numeric keyboards; notes learnable by design · [u6-device-security-2026-10-09.md] |
| U6.7 | Autofill and password managers on the PIN field | ✅ | pass · importantForAutofill="no", autoComplete="off", textContentType="oneTimeCode" on the overlay and the setup fields · [u6-device-security-2026-10-09.md] |
| U6.8 | Clipboard after each copy action (share code, export) | ✅ | pass (static) · the Clipboard API is imported nowhere; share code is displayed only; export goes to the share sheet · [u6-device-security-2026-10-09.md] |
| U6.9 | logcat over every flow of a release build: no email, token or amount | ✅ | pass · 14,243 + 2,662 logcat lines over every flow incl. a typed email: 0 hits for the address, name, amount, PIN, Bearer, tokens · [u6-device-security-2026-10-09.md] |
| U6.10 | Deep links from another app: every route with hostile parameters | ✅ | pass · 24 routes + 12 hostile payloads: Status ok, focus kept, no FATAL/JS error; hidden routes show placeholders · [u6-device-security-2026-10-09.md] |
| U6.11 | Release build: no developer menu, no stack trace on screen after a forced error | ✅ | pass · menu key: nothing (16-menu-key.png); error boundary shows no error text; package flags carry no DEBUGGABLE · [u6-device-security-2026-10-09.md] |
| U6.12 | Recents thumbnail shows the lock | ✅ | re-run pass · recents card solid black (15-recents.png) · [u6-device-security-2026-10-09.md] |
| U6.13 | Lock and PIN screens can't be captured | ✅ | re-run pass · window fl=SECURE; lock overlay capture 0.00 % non-black · [u6-device-security-2026-10-09.md] |
| U6.14 | Locked app hidden from accessibility services | ✅ | re-run pass · compressed tree while locked: 'Zeno is locked', PIN field, Sign out only · [u6-device-security-2026-10-09.md] |
| U6.15 | Data on the phone unreadable without the key (rooted read) | ✅ | re-run pass (root) · zeno.db/WAL random bytes, no name/amount/PIN in any private file; the one plaintext copy is the widget snapshot F161/R18 (unchanged) · [u6-device-security-2026-10-09.md] |
| U6.16 | No backup of app data | ✅ | re-run pass · allowBackup="false" in the packaged manifest; ALLOW_BACKUP absent from the package flags · [u6-device-security-2026-10-09.md] |
| U6.17 | Gmail: consent screen asks read-only only; disconnect revokes at Google | ⏸ | device part blocked by R9 (Google redirect) · static: one scope gmail.readonly; disconnect revokes at Google and forgets the token even if the revoke fails · [u6-device-security-2026-10-09.md] |
| U6.18 | Gmail: token never in logs, exports or crash reports; a scan reads only what the UI says | ✅ | static pass · token in SecureStore (sensitive, WHEN_UNLOCKED_THIS_DEVICE_ONLY); redact.ts strips Bearer and token= params; export carries no token; scan lists billing messages only; device part re-opens with R9 · [u6-device-security-2026-10-09.md] |
| U6.19 | Biometrics: wrong finger refused; disabled or re-enrolled falls back to the PIN, never opens | ✅ | fixed F232 and proven · prompt appears; wrong finger refused; enrolled finger opens; fingerprint removed → PIN only; the fallback is now 'Use Zeno PIN', never the phone's credential · [u6-device-security-2026-10-09.md] |
| U6.20 | Biometrics: the lockout applies to biometric attempts too | ✅ | closed by lock-store.test.ts:221 (refused during a lockout without prompting); device run partial: automation counted 3 wrong PINs, not 10; prompt returns after the window · [u6-device-security-2026-10-09.md] |
| U6.21 | Exported CSV: location, readers, cache after sharing, contents | ✅ | pass · CSV shared as text, no file written (cache listed before/after); 8 columns incl. notes (F127) · [u6-device-security-2026-10-09.md] |
| U6.22 | Purchases: shown price equals the store's; a cancelled purchase changes nothing; restore is per account; no "free" without a trial | 🔒 | needs a Play licensed test account |
| U6.23 | Push token never leaves the phone | ✅ | fixed F230 · no push token is requested any more (reminders are local); before: minted and kept, never sent to the API; THREAT_MODEL and STORE_DATA_SAFETY updated · [u6-device-security-2026-10-09.md] |
| U6.24 | Privacy promises on screen traced to the code that makes them true | ✅ | pass · each promise traced to code (table in the evidence); F114 and F45 stay the owner's wording items (R10) · [u6-device-security-2026-10-09.md] |
## U7 · The attacker's view: can anything be lost?

| ID | What could be lost · attack | Status | Evidence / finding |
|---|---|---|---|
| U7.1 | Users' data · authorisation matrix black-box against a running server | ✅ | closed · authz-matrix.test.ts (route matrix, one 401, cross-household 403) · [u7-attackers-view-2026-10-09.md] |
| U7.2 | Users' data · replayed and stolen sign-in links, refresh-token reuse | ✅ | closed · auth.test.ts/auth-expiry/auth-internals/token-path (single-use links, refresh rotation+reuse 401, forged-token battery) · [u7-attackers-view-2026-10-09.md] |
| U7.3 | Users' data · household share-code guessing: cost at the rate limits | ✅ | closed (accepted R21) · family.test.ts + rate-limits.test.ts (8-char/31-alphabet, 10/min join, 5-member cap) · [u7-attackers-view-2026-10-09.md] |
| U7.4 | Users' data · a modified app calling the API directly | ✅ | closed · authz-matrix + fuzz.test.ts (API trusts token/matrix, not the client) · [u7-attackers-view-2026-10-09.md] |
| U7.5 | Money · patched release APK: what Pro features it unlocks (F15) | ❌ | open, low · webhook.test.ts F85 (server ignores client Pro claim); client unlock is cosmetic UI only · feeds U7.8 · [u7-attackers-view-2026-10-09.md] |
| U7.6 | Money · edited local storage flipping the plan | ❌ | open, low · same as U7.5 (local entitlement is a cache; no server route reads it) · [u7-attackers-view-2026-10-09.md] |
| U7.7 | Money · faked or replayed RevenueCat webhook | ✅ | closed · webhook.test.ts (constant-time secret, payload never trusted, idempotent, durable before 200) · [u7-attackers-view-2026-10-09.md] |
| U7.8 | Money · decision: server-side checks or Play Integrity for Pro | 🔒 | owner decision · exposure is cosmetic (server already ignores client Pro); hard gate/Play Integrity optional · [u7-attackers-view-2026-10-09.md] |
| U7.9 | AI bill · many accounts at the per-account limit: cost per hour | ✅ | closed per account · rate-limits.test.ts (10/min keyed by ACCOUNT, IP rotation no help; max_tokens 1024) · cross-account total is U7.10 · [u7-attackers-view-2026-10-09.md] |
| U7.10 | AI bill · a global daily cap (none exists today) | ❌ | OPEN → register R33 · no global/daily AI cap; N accounts × 600 calls/hr; brake is provider-side caps · owner · [u7-attackers-view-2026-10-09.md] |
| U7.11 | AI bill · oversized and repeated prompts | ✅ | closed · coach.route.test.ts (schema strips/rejects oversized fields) + app.ts (1 MB body, 30 s timeout) · [u7-attackers-view-2026-10-09.md] |
| U7.12 | AI · used as a free general-purpose AI (off-topic refusal) | ✅ | closed · ai-coach-constitution.md §2–3 + coach.test.ts (out-of-scope forces empty recommendations) · [u7-attackers-view-2026-10-09.md] |
| U7.13 | AI · prompt injection through subscription names and notes | ✅ | closed · coach.ts + coach.test.ts (fence-tag stripping, breakout stays inside fence, notes/accountId/email never sent) · [u7-attackers-view-2026-10-09.md] |
| U7.14 | AI · extracting the system prompt | ✅ | closed (charter-enforced) · constitution §3/§4.3 forbids revealing the prompt · [u7-attackers-view-2026-10-09.md] |
| U7.15 | AI · harmful or professional financial advice | ✅ | closed (charter-enforced) · constitution §3/§4.5/§5 (no harmful content, not professional advice) · [u7-attackers-view-2026-10-09.md] |
| U7.16 | AI · one user's data in another's answer | ✅ | closed · coach is stateless per request, account-scoped like U7.1; no shared context · [u7-attackers-view-2026-10-09.md] |
| U7.17 | Email · sign-in-email bombing, one address and many | ✅ | closed · auth.test.ts + rate-limits.test.ts (per-recipient AND per-IP 5/min magic-link cap) · [u7-attackers-view-2026-10-09.md] |
| U7.18 | Hosting · request floods, slow requests, large bodies | ✅ | closed in-process · rate-limits (100/min) + fuzz.test.ts + app.ts (30 s, 1 MB); edge limiter is R8/U7.19 · [u7-attackers-view-2026-10-09.md] |
| U7.19 | Hosting · edge rate limiting | 🔒 | owner · edge rate limiting, register R8 / P8.7 (Cloudflare) · [u7-attackers-view-2026-10-09.md] |
| U7.20 | Secrets · release APK strings and assets re-scanned | ✅ | closed · APK carries only the client bundle; every server secret is API-side; gitleaks + outbound.test.ts · [u7-attackers-view-2026-10-09.md] |
| U7.21 | Secrets · built website re-scanned | ✅ | closed · web build embeds no secret (waitlist webhook URL is server-side env at request time) · [u7-attackers-view-2026-10-09.md] |
| U7.22 | Website · waitlist spam | ✅ | closed in-app → R26 updated · waitlist route.ts/route.test.ts (5/min XFF-keyed, 2 KB cap, strict email, 502 on fail); cold-start residual R26 · [u7-attackers-view-2026-10-09.md] |
| U7.23 | Verdicts added to the residual-risk register | ✅ | closed by the evidence file · R26 updated, R33 added · [u7-attackers-view-2026-10-09.md] |
| U7.24 | Users' Gmail · token storage; connect bound to the signed-in account | ⏸ | not applicable (feature not built) · no Gmail scanner in apps/api/src; re-opens on build · [u7-attackers-view-2026-10-09.md] |
| U7.25 | Users' Gmail · crafted receipt emails against the scanner | ⏸ | not applicable (feature not built) · re-opens on build · [u7-attackers-view-2026-10-09.md] |
| U7.26 | Trust · a fake Zeno: how real mail and the real app are told apart | 🔒 | owner (brand) · real mail from verified zenoapp.in, real app from the store listing; no code exposure · [u7-attackers-view-2026-10-09.md] |
| U7.27 | Account · deleting or taking over someone else's; lock-out by wrong codes; recycled email address (known gap) | ✅ | takeover/deletion closed · authz-matrix + rate-limits (DELETE /account token-scoped, 5/min) + family.test.ts cascade; recycled-email is the known gap R11 · [u7-attackers-view-2026-10-09.md] |
## U1 · Every screen, every state

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U1.1 | State matrix written: 27 screens × empty / one / many / loading / offline / error | ✅ | matrix written: 27 screens × 7 state columns, every cell naming the test that proves it (or why it cannot exist) · [UI_STATE_MATRIX.md] |
| U1.2 | Empty states | ✅ | every screen with a list has its empty state driven by its own file (ledger, subs, calendar, insights, budget, recap, coach, family, notifications, add, wrapped, spend-twin, widgets); re-swept empty in state-matrix.rntest.tsx · [UI_STATE_MATRIX.md] |
| U1.3 | The free cap (10) and many (200) | ✅ | cap 10: ten rows and their total on the ledger; 200: counted and totalled in full ($20,100.00) and drawn a window at a time — the list virtualises, the drawn rows are the first in order and every one is real; the ledger and insights also render 200 with no broken value · state-matrix.rntest.tsx |
| U1.4 | Loading and offline | ✅ | loading driven per screen: sign-in in flight, the scan's progress and Cancel, the AI 'asking', a purchase in flight, a household request, the cold-start detail form, the ledger's count-up. Offline is covered as the failure of each thing fetched (rate, plan, AI, household, deletion); aeroplane mode itself belongs to U5 · [UI_STATE_MATRIX.md] |
| U1.5 | Server errors | ✅ | server errors per screen: a failed plan check falls back to free, a failed scan is shown not swallowed, the store's own messages on sign-in and purchase, a household that cannot be reached keeps you in it, a deletion the server will not confirm touches nothing locally · [UI_STATE_MATRIX.md] |
| U1.6 | Long names and amounts; emoji; non-Latin text | ✅ | eight names, one of each kind (120 chars, a long unbroken word, emoji, Japanese, Hindi, Arabic, combining marks, mixed) on the ledger, subscription page, calendar, insights and Wrapped; plus $999,999.99 and $0.01, which stay money · state-matrix.rntest.tsx |
| U1.7 | All six currencies' formatting | ✅ | format.behavior.test.ts pins the six symbols and separators; state-matrix.rntest.tsx renders a row in USD, EUR, GBP, INR, CAD and AUD and asserts each reads exactly as the formatter writes it, so no screen invents a sign |
| U1.8 | Every screen: no placeholder text, "undefined" or raw keys; locale formats; every link where its label says | ✅ | state-matrix.rntest.tsx sweeps 14 screens (every one that runs on the standard fakes) empty and populated over text nodes AND accessibility labels/hints/values/placeholders, failing on undefined, NaN, a stringified object, a broken amount, an unfilled slot, lorem ipsum, TODO/FIXME/TBD, 'placeholder', a raw dotted key or a bare null; a control proves the sweep catches a planted value. The other 13 screens assert their copy in their own files · [UI_STATE_MATRIX.md] |
## U3 · Accessibility, measured

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U3.1 | Every control named: 17 of 27 screens | ✅ baseline | P5 audit (`.maestro/a11y-audit.sh`) |
| U3.2 | Every control named: the other 10 screens | ✅ | 20 of 22 screen files already asserted unnamedControls()==[]; the sweep now asserts it for 14 screens in the EMPTY state too, where the 'add your first one' controls live · state-matrix.rntest.tsx · [u3-accessibility-2026-10-09.md] |
| U3.3 | Touch targets at least 48 dp, every screen | ✅ | touch-targets.rntest.tsx reads each control's DECLARED size plus hitSlop across 11 screens, floor 44 pt; a control case proves the measure (24 pt fails, +10 slop passes). F234 fixed (ledger header 38/40 → 44 tappable). F235 recorded: the month grid's 32×32 cells are react-native-calendars', pinned as-is · [u3-accessibility-2026-10-09.md] |
| U3.4 | Text contrast at least 4.5:1, light and dark (from the theme tokens) | ✅ | F233 FOUND AND FIXED — the four status colours painted as text failed on paper (warning 2.04:1, success 3.10, danger 3.67, info 3.68) and on their own dark chip; the Badge's warning hex was light-only, so dark read 2.65:1. Four text-grade tokens added, 36 usages swapped, solid chips carry ink. zeno.test.ts: every text grade on 4 surfaces and on its own composited chip, both schemes, plus a control pinning the old values were below 4.5 · [u3-accessibility-2026-10-09.md] |
| U3.5 | Font scale 2.0: no cut-off text, every screen | ✅ | answered on the device, not in jest: captured at font scale 2.0, which FOUND F236 — the ledger clipped '1/10 FREE' to '1/' and '$0.00' to '$0.0' with no ellipsis. Fixed (the label shrinks, the amount never does) and re-captured; the 38 normal-size baselines still match, twice, so the fix costs nothing at normal size · [u2-visual-baselines-2026-10-09.md], [u3-accessibility-2026-10-09.md] |
| U3.6 | TalkBack journeys: onboard, add, find a renewal, cancel guide, lock | ✅ | run with TalkBack actually running on the emulator (service confirmed up, then removed cleanly). A ledger row announces in full — “Spotify, Nov 8 · ENTERTAINMENT, $10.00 per mo” — and TalkBack's own gesture works: one tap focuses, a double tap activates, and the subscription page opened. Every clickable element on all five journey screens announces something. Not done: swipe-to-next-element through a whole journey, and the speech itself (no audio capture) · [u3-accessibility-2026-10-09.md] |
| U3.7 | Reduce motion respected | ✅ | theme/motion.ts + motion.rntest.tsx; onboarding renders without the print-in, the tab focus tick snaps instead of growing, the ledger total skips its count-up · [u3-accessibility-2026-10-09.md] |
| U3.8 | Website: keyboard only through every page | ✅ | e2e/keyboard.spec.ts (W7): ten templates, skip link first and working, every control in document order, focus visible, no trap · four browsers in CI · [u3-accessibility-2026-10-09.md] |
| U3.9 | Website: 200 % zoom | ✅ | e2e/zoom.spec.ts (W7): ten templates at 200 %, no sideways scroll, nothing clipped · [u3-accessibility-2026-10-09.md] |
| U3.10 | Website: screen-reader landmarks and headings | ✅ | e2e/every-route.spec.ts (W7) runs axe at WCAG 2.2 AA over every route — where the landmark and heading-order rules live — with zero violations · [u3-accessibility-2026-10-09.md] |
| U3.11 | Nothing conveyed by colour alone (colour-vision simulation) | ✅ | every status is in the row's accessible name in words (Free trial, Paused, Pending verification, Still charging, Verified cancelled), plus the visible '!' on a still-charging amount; the fills are never the only mark · state-matrix.rntest.tsx · [u3-accessibility-2026-10-09.md] |
| U3.12 | System bold-text and high-contrast settings | ✅ | system bold text (font_weight_adjustment 300) and high-contrast text, each alone and both together, across the ledger, Settings and the subscription list: nothing clipped in any combination (every text node measured for a collapsed box), no crash; settings restored · [u3-accessibility-2026-10-09.md] |
| U3.13 | Website: forced-colours mode | ✅ | e2e/forced-colors.spec.ts (W7), which found F228 (controls drawn with a background alone vanished in Windows High Contrast) and holds the fix · [u3-accessibility-2026-10-09.md] |
## U2 · How it looks: visual baselines

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U2.1 | Screenshot tooling and comparison script | ✅ | scripts/app-visual.mjs (update/check, --scale): freezes the clock, demo status bar, grants notifications, sets the theme through the app's own switch; per-pixel compare (tolerance 8/channel, fail above 0.1 %), lossless baselines, device fingerprint checked before any comparison · [u2-visual-baselines-2026-10-09.md] |
| U2.2 | Baselines: every screen, light and dark, normal phone | ✅ | 38 baselines (19 screens × light/dark) in apps/mobile/visual-baselines/phone, against a ledger with one real subscription; compared twice in a row against an unchanged build, 0 differ both times. `security` is out by design (FLAG_SECURE, U6.13) · [u2-visual-baselines-2026-10-09.md] |
| U2.3 | Baselines: small phone (5.0") | ✅ | rendered and inspected on a 480×800 AVD built from the installed image (no download), which is what found F240; a committed baseline SET was not captured for it (the phone set is already 4.4 MB of churning binaries and this AVD is not in CI) · [u5-devices-2026-10-09.md], [u2-visual-baselines-2026-10-09.md] |
| U2.4 | Baselines: tablet | ✅ | rendered and inspected on a 2560×1600 tablet AVD (no download): nothing clipped, the full sample ledger, its total and the caveat all render; no committed set, as U2.3 · [u5-devices-2026-10-09.md], [u2-visual-baselines-2026-10-09.md] |
| U2.5 | Baselines: font scale 1.3 and 2.0 | ✅ | `--scale 2.0` run and inspected: it FOUND F236 (text clipped off the right edge with no ellipsis). The scaled baselines are deliberately not committed (38 more binaries would double the repo's history and churn on every UI change); the command is one line and today's result is in the evidence · [u2-visual-baselines-2026-10-09.md] |
| U2.6 | Website: `toHaveScreenshot` on every page, desktop and phone | ✅ | W7.2: apps/web/e2e/visual.spec.ts, 12 templates × light/dark × desktop/phone = 48 comparisons behind VISUAL=1, proven 48 written / 48 compared; baselines must render on Linux, so visual.yml makes them for the owner to commit (OWNER_GUIDE step 15) · [u2-visual-baselines-2026-10-09.md] |
| U2.7 | Comparison runs nightly | 🔒 | the website's can run in CI; the app's needs an Android emulator in the runner (a slow job and a CI-minutes decision). The script is ready; the workflow is not written — owner decision · [u2-visual-baselines-2026-10-09.md] |
| U2.8 | Bite check: a deliberately broken layout is caught | ✅ | proven end to end: ledger padding 20→44, rebuilt and installed — caught on exactly ledger-light (2.183 %) and ledger-dark (2.198 %), no false positives on the other 36; reverted, rebuilt, all 38 match again · [u2-visual-baselines-2026-10-09.md] |
## U4 · Robustness

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U4.1 | No network, start to finish | ✅ | airplane on, ping unreachable: the ledger opens with its figures, a subscription can be ADDED and is still there after a force-stop and cold start (so it was written, not held in memory); no crash · [u4-robustness-2026-10-09.md] |
| U4.2 | Slow network (2G profile) | ✅ | emu network speed gsm + delay gprs: opens, the ledger reads normally, nothing stuck on a spinner · [u4-robustness-2026-10-09.md] |
| U4.3 | API down; API answering garbage | ✅ | DOWN: nothing listening → a written sentence, not let in (this produced F239). GARBAGE: unreachable on a release build — usesCleartextTraffic="false" blocks a plain-HTTP API before the request leaves the device, proven by a garbage server behind adb reverse receiving ZERO requests; the malformed-envelope paths are covered in client.edges.test.ts · [u4-robustness-2026-10-09.md] |
| U4.4 | Airplane mode in the middle of sign-in | ✅ | airplane enabled while the sign-in request was in flight: a written sentence, no crash, not signed in · [u4-robustness-2026-10-09.md] |
| U4.5 | Backgrounded, killed by the system, restored (process death) | ✅ | `am kill` (what the system does under memory pressure): 0 pids after, and on relaunch the ledger and its figures are intact · [u4-robustness-2026-10-09.md] |
| U4.6 | Clock and time zone changed: renewal dates don't move | ✅ | IST → Honolulu (UTC−10) → Auckland (UTC+13), a 23-hour swing: the renewal stayed Nov 8 while the header's 'today' correctly followed the device (FRI OCT 9 → SAT OCT 10). Clock +40 days: the renewal became Dec 8, the NEXT occurrence, not a stale date · [u4-robustness-2026-10-09.md] |
| U4.7 | Language and number format changed | ⏸ | not run on the device: changing the emulator's locale needs a property write and a framework restart mid-session. Off-device the six currencies are pinned (format.behavior.test.ts, and rendered on a screen in U1.7) and dates are UTC-parsed with suites run at Honolulu and Auckland offsets (P6). The on-device run is still owed · [u4-robustness-2026-10-09.md] |
| U4.8 | 1,000 subscriptions: speed and memory | ⏸ | not reachable on the device: the database is SQLCipher-encrypted and the only writer is the UI, so a thousand rows cannot be injected. 200 are driven in jest (U1.3): counted, totalled, and the list virtualises. Needs a seeding hook that does not exist · [u4-robustness-2026-10-09.md] |
| U4.9 | Upgrade from the previous release with data on the phone | ✅ | nine successive `install -r` upgrades over an existing database today: the ledger survived each, and all 38 visual baselines still match afterwards — the same screens pixel for pixel across every upgrade · [u4-robustness-2026-10-09.md] |
| U4.10 | A call or notification mid-flow | ✅ | a notification posted over the open app: Zeno stays in front, the screen is intact, no crash · [u4-robustness-2026-10-09.md] |
| U4.11 | Phone almost out of storage: database writes fail safely | ⏸ | not run: filling the data partition until SQLite writes fail risks leaving the image unusable for the rest of the work, and there is no supported 'fail the next write' knob. The failure handling is covered in erase-device.test.ts and the repository tests. Worth a scratch AVD — owner, with U2.3/U2.4 · [u4-robustness-2026-10-09.md] |
| U4.12 | Low memory, battery saver | ✅ | under `low_power 1` the app opens and reads normally; after TRIM_MEMORY_COMPLETE while backgrounded it returns intact · [u4-robustness-2026-10-09.md] |
## U5 · Devices

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U5.1 | Android API 36 emulator (Pixel) | ✅ baseline | P5: 13 flows green |
| U5.2 | Android API 24 emulator (oldest supported) | 🔒 | large download (~1 GB system image): the owner's call, so not fetched. Everything here is API 36; the one difference already known below API 31 is the tapjacking protection (U6.3), carried in R20 · [u5-devices-2026-10-09.md] |
| U5.3 | Android API 28, 31, 34 emulators | 🔒 | same: each is a ~1 GB download, the owner's call · [u5-devices-2026-10-09.md] |
| U5.4 | Small phone and tablet emulator profiles | ✅ | both built from the system image already installed, so nothing was downloaded: a 480×800 small phone (Nexus S) and a 2560×1600 tablet, each booted on its own port and shut down after. Both boot, install and run; the small one found F240, the tablet clips nothing · [u5-devices-2026-10-09.md] |
| U5.5 | One real Android phone | 🔒 | the owner's phone |
| U5.6 | iOS | 🔒 | needs a Mac or an EAS cloud build, plus an iPhone: owner decision |
| U5.7 | Website in Firefox | ✅ | W7: a `firefox` Playwright project alongside Chrome, installed and run in CI · [u5-devices-2026-10-09.md] |
| U5.8 | Website in WebKit (Safari's engine) | ✅ | W7: a `webkit` project through a self-signed TLS front (e2e/tls-proxy.mjs, because WebKit upgrades insecure requests even to 127.0.0.1); it is what caught the axe target-size issue on nav links · [u5-devices-2026-10-09.md] |
---

## Findings from this plan

| # | Finding | Severity | Status |
|---|---|---|---|
| F233 | The four status colours were painted as TEXT across 36 places and failed WCAG 1.4.3 on paper (warning 2.04:1, success 3.10, danger 3.67, info 3.68); on the dark desk they failed on their own soft chip; and the Badge's warning text was a hardcoded light-mode hex, so dark mode read it at 2.65:1 | Medium (legibility, every screen) | Fixed 2026-10-09: four text-grade tokens (same hue, walked to clear 4.5:1 on every surface and on its own chip), 36 usages swapped, solid chips carry ink; 48 assertions in `zeno.test.ts` incl. a control pinning the old values |
| F234 | The ledger header's Settings and Notifications buttons were 38×38 and 40×40, under the 44 pt floor, with no hitSlop | Low | Fixed 2026-10-09: hitSlop 3 and 2, so the drawn circles keep the header's rhythm and the tappable boxes reach 44; `touch-targets.rntest.tsx` holds it |
| F235 | Every day cell in the month grid is 32×32 | Low | OPEN (register R35, before the Play release): the cells are drawn by `react-native-calendars`, so the fix is a custom `dayComponent`, not a style of ours. Pinned at 32×32 so a change is noticed |
| F236 | At font scale 2.0 the ledger clipped text off the right edge with no ellipsis: the free-plan counter read "1/" and the still-to-renew amount read "$0.0" — a number not merely cut but misreadable as a different number. A row of label, leader and value gave the label no `flexShrink`, so as it grew the value was pushed off | Medium (a wrong number shown to anyone using large text) | Fixed 2026-10-09: the label shrinks and ellipsises, the value never does (`Ledger.tsx` LedgerLine, every ledger row, plus the dashboard's header row). Proven by re-capture; the 38 normal-size baselines still match, so it costs nothing at normal size |
| F237 | Five screens (coach, family, wrapped, backend, open-banking) showed a scroll indicator where the other seventeen hide it; it also made the visual comparison flake at 0.554 % when caught mid-fade | Low (inconsistency) | Fixed 2026-10-09: all 22 now hide it |
| F238 | Both the app and the website defaulted to `https://zeno.app` — a domain Zeno does not own, parked and for sale. Deploys set the env var, so production was always right, but any build that forgot it shipped a stranger's page as the Terms and Privacy links (what a store review opens), the share signature, and the privacy@/legal@/feedback@ addresses; the API's dev-default sender was `login@zeno.app`, a domain Resend has not verified. The guard meant to prevent this was policing the wrong host | High (legal links to a third party; store review opens them) | Fixed 2026-10-09: both defaults and the API sender are the real `zenoapp.in`; the guard now polices the real host and immediately caught a hardcoded one in the website's FAQ copy. Proven on the device: Terms opens `zenoapp.in/legal/terms` |
| F239 | A failed request showed the platform's raw exception to the user: the sign-in screen read "fetch failed: java.net.UnknownServiceException: CLEARTEXT communication to 127.0.0.1 not permitted by network security policy". Screens render `error.message`, which is the server's own words for an API error but the platform's for a transport failure | Medium (users shown internals; on a real phone, DNS/TLS/socket text whenever the network is poor) | Fixed 2026-10-09: `timedFetch` wraps a transport failure in `NetworkError` whose message is a sentence, keeping the platform's error as `cause` for logs; every caller goes through it. Pinned in `http.test.ts` (no `java.`, no `Exception`, no `CLEARTEXT`, no stack frame) and seen on the device |
| F240 | On a 480×800 phone the onboarding's sample ledger pushes its own caveat — "Sample figures — your ledger starts empty." — below the fold, together with the committed total, while the scroll indicator is hidden and the obvious action is Continue. A swipe brings them back, so nothing is unreachable, but a person on a small phone can reasonably take five named services at real prices for real data | Low (truthfulness: the line exists to stop exactly that reading) | OPEN, owner decision D23: (a) move the caveat above the rows so the label always precedes the data — recommended; (b) fewer sample rows on a short viewport; (c) accept |
| F229 | A renewal reminder names the service and the amount; a PIN-locked phone shows it in full under Android's default lock-screen setting (hidden only when the user chooses 'hide sensitive content') | Low (someone who can see the phone learns a renewal) | Owner decision D22 (register R34): keep the platform default, or post reminders as SECRET / without amounts |
| F230 | The app minted an Expo push token nothing used (a network call handing Expo the phone's FCM registration) and skipped emulators, which never got the notification permission prompt | Low (privacy; a dead third-party call) | Fixed 2026-10-09: `prepareReminderNotifications` (channel + permission only); the permission prompt appeared on the emulator for the first time |
| F231 | `MainActivity` kept the default `taskAffinity`, so another app's activity could join Zeno's task (task hijacking) | Low | Fixed 2026-10-09: `plugins/withTaskAffinity.js`, proven in the packaged APK with aapt2 |
| F232 | The biometric prompt accepted the phone's screen-lock credential as its fallback ('Use PIN'): anyone who knew the phone's PIN opened Zeno without Zeno's PIN and around the app's lockout | Medium (a second lock that was not one) | Fixed 2026-10-09: `disableDeviceFallback: true`, the button reads 'Use Zeno PIN'; pinned in `app-lock.test.ts`, seen on the device |

## Log

**2026-10-09 (U3.6, U3.12 — the last two rows of the plan):** both run on the device, so
every row of U1–U7 now has a verdict. TalkBack was enabled for real (its own first-run
notification dialog has to be granted first, or it sits over the app and blocks
everything): a ledger row announces in full, one tap focuses and a double tap activates,
and the subscription page opened that way; every clickable element on the five journey
screens announces something. The system's bold-text and high-contrast-text settings, alone
and together, clip nothing on three screens. Not covered: swiping element to element
through a whole journey, and the speech itself, which cannot be captured here.

**2026-10-09 (U5):** devices. Two profiles were built from the system image already
installed, so nothing was downloaded: a 480×800 small phone and a 2560×1600 tablet, each
booted on its own port and shut down after. Both boot, install and run the release APK.
The tablet clips nothing. The small phone found F240: onboarding's "Sample figures — your
ledger starts empty." falls below the fold with the scroll indicator hidden, so the sample
prices can read as real — owner decision D23. The website's Firefox and WebKit rows were
already proven in W7 and run in CI. The older API levels (24, 28, 31, 34), a real phone and
iOS stay with the owner: each image is about a gigabyte, and the one difference already
known below API 31 is the tapjacking protection, carried in R20. Evidence:
`ui-evidence/u5-devices-2026-10-09.md`.

**2026-10-09 (U4):** robustness on the emulator. 9 of 12 conditions run and passed: no
network (including ADDING a subscription offline and finding it after a cold start), a 2G
link, the API down, the network pulled mid sign-in, process death, the clock and time zone
moved, upgrading over existing data, a notification mid-flow, battery saver and a memory
trim. No FATAL in logcat anywhere. Three are not run and say why (locale needs a framework
restart; a thousand rows cannot be injected past SQLCipher; filling the disk risks the
image). Two findings, both fixed. F238: the app and site defaulted to `zeno.app`, a domain
Zeno does not own — tapping Terms opened a GoDaddy sale listing — and the guard meant to
catch it was policing the wrong host. F239: a failed request showed a raw Java exception on
the sign-in screen. Evidence: `ui-evidence/u4-robustness-2026-10-09.md`.

**2026-10-09 (U2):** visual baselines for the app. `scripts/app-visual.mjs` captures and
compares with everything but the app pinned (frozen clock, demo status bar, the theme set
through the app's own switch, a device fingerprint checked before comparing). 38 baselines
committed (19 screens × light/dark); the comparison ran twice against an unchanged build
with 0 differences. The bite check passed end to end: a deliberate padding change was
caught on exactly the two screens it touches and nowhere else. The font-scale run closed
U3.5 and found F236 — at scale 2.0 the ledger clipped "$0.00" to "$0.0" and "1/10 FREE" to
"1/", with no ellipsis — now fixed so labels give way and numbers never do. F237 (five
screens showing a scroll indicator the other seventeen hide) fixed, which also settled the
one flaky comparison. A small phone and a tablet need AVDs that are not on this machine
(owner), and a nightly app comparison needs an emulator in CI (owner decision).
Evidence: `ui-evidence/u2-visual-baselines-2026-10-09.md`.

**2026-10-09 (U3):** accessibility measured. 10 of 13 rows closed, 2 left to the device
(U3.6 TalkBack journeys, U3.12 the system bold-text and high-contrast settings) and 1
blocked in jest (U3.5 font scale 2.0: the RN renderer lays no text out). Three findings.
F233 is the substantial one: the four status colours were painted as text everywhere and
failed 1.4.3 on paper, worst at 2.04:1, and the Badge's warning fix was light-only so dark
mode read at 2.65:1 — four text-grade tokens added and 36 usages swapped. F234 (two header
buttons under 44 pt) fixed with hitSlop. F235 (the calendar library's 32×32 day cells)
recorded as R35 and pinned. The four website rows were already proven in W7 and run on
four browsers in CI. Evidence: `ui-evidence/u3-accessibility-2026-10-09.md`.

**2026-10-09 (U1):** the state matrix written (`UI_STATE_MATRIX.md`): 27 screens × 7 state
columns, each cell naming the test that proves it or why the state cannot exist. The
per-screen files already held most cells; three had nothing anywhere and now do, in
`__screens__/state-matrix.rntest.tsx` (43 tests): 200 subscriptions (counted and totalled
in full, drawn a window at a time — the list virtualises), hostile names (120 characters,
emoji, Japanese, Hindi, Arabic, combining marks) across five screens, and a placeholder
sweep over 14 screens that fails on "undefined", NaN, a stringified object, an unfilled
slot or a raw key. No finding: nothing broken was found, and the one surprise (200 rows
drawing 12) is the list doing its job.

**2026-10-09 (U6):** 23 of 24 rows carry a verdict on emulator-5554 (Android 16) with
today's release builds: 19 pass, 1 owner (U6.1, F229 → D22), 1 blocked by R9 (U6.17),
1 owner (U6.22). Four findings, three fixed today (F230 push token, F231 task affinity,
F232 device-credential fallback) and one for the owner (F229). Evidence:
`ui-evidence/u6-device-security-2026-10-09.md`.

**2026-10-08:** reviewed against the app's features; 18 checks added that the first
version missed: the Gmail connection (the most sensitive thing the app touches),
biometric unlock, the exported file, real purchase flows, the push token, on-screen
privacy promises, a fake-Zeno attack, account takeover through a recycled address, low
storage and memory, colour-only information, forced colours, and copy correctness.

**2026-10-07:** plan and tracker written from a measured baseline (screens, tests, flows,
audit scope, device coverage, website projects, the AI limits in the code).

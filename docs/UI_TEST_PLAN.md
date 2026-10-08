# UI and attack-resistance test plan (written 2026-10-07)

The hardening programme (P0 to P8, `docs/HARDENING_LOG.md`) tested the **code**: logic,
API, security controls, every screen's behaviour in jest. This plan tests the **product a
person holds**, head to toe: every screen as it looks and behaves on real devices, for
every kind of user, in every condition, and then the same app through an attacker's eyes,
so that nothing can be lost: not users' data, not money, not the AI budget.

Progress is tracked in **`docs/UI_TEST_TRACKER.md`** (one row per check, with its status
and evidence). Same rules as the hardening programme: no guessing (every "pass" names its
evidence: a test, a script's output, a screenshot, a measurement); one item at a time; a
bug found becomes a finding (F‹n›) with a test that fails on the old code.

**Honest limit:** no test plan makes an app "unhackable". What this plan does is try every
known way in, prove each one is closed (or name who decides when it can't be), and put a
number on what is still at risk. The outside penetration test (`OWNER_GUIDE.md` step 13)
remains the check on my own work.

---

## Where we are today (measured 2026-10-07, not assumed)

| Area | What exists | Gap |
|---|---|---|
| Screen behaviour | jest tests for **all 27 screens** (22 files under `apps/mobile/src/__screens__`, the rest in `src/security`), held at 100 % lines | They run in a simulated renderer: nothing about how a screen **looks** |
| End-to-end | **13 Maestro flows** on an Android emulator (onboarding, sign-in gate, add, cancel guide, app lock, family, coach consent, notifications blocked, CSV import, calendar, insights, dark mode), nightly on GitHub | Happy paths mostly; one device (Pixel, Android 16) |
| Accessibility | An audit that every control has a name for TalkBack, on **17 of 27 screens** | Not checked: contrast, touch-target size, large fonts, focus order, the other 10 screens |
| On-device security (P3) | Storage encrypted (rooted check), no backups, screenshots of the lock blocked, locked app hidden from accessibility, overlays hidden while locked | Not checked: notifications on the lock screen, overlay attacks (tapjacking), task hijacking, keyboard learning, clipboard, logcat, the Gmail connection end to end, biometrics, the exported file, real purchase flows |
| Visual | **Nothing** compares screens against a known-good picture, in the app or on the website | Any layout break ships unseen |
| Devices | One emulator image (API 36); the app supports Android 7.0 (API 24) up | No small phone, tablet, old Android, real device; **iOS never run** |
| Website | 335 Playwright tests: every page, security headers, script policy, axe, dark mode, desktop and phone sizes | Chrome only; no visual baselines; keyboard-only and 200 % zoom untested |
| Attacker's view | API authorisation matrix, fuzzing, ASVS review, DAST nightly | No end-to-end attempt to **steal money or AI budget**; Pro is unlocked on the phone (F15) |

---

## The phases

Each phase ends with a gate, read the same way as before: green on GitHub where it runs
in CI, or evidence files in `docs/ui-evidence/` where it runs on a device.

### U1 · Every screen, every state

For each of the 27 screens: empty, one item, many items (the free cap of 10; 200),
loading, offline, server error, very long names and amounts, emoji and non-Latin text,
every currency (USD, EUR, GBP, INR, CAD, AUD) with its formatting. Also, on every screen: every
piece of text is real copy (no placeholder, no "undefined", no raw key), dates and
currency follow the phone's locale, and every link and button leads where its label says. jest first (fast,
in CI), then the screens that change shape on the emulator.
**Gate:** a state matrix in the tracker, every cell tested.

### U2 · How it looks: visual baselines

A known-good screenshot of every screen in light and dark, on a small phone (5.0"), a
normal phone and a tablet, at font scale 1.0, 1.3 and 2.0. A script compares each run
against the baseline and fails on a difference above a threshold; a deliberate change
updates the baseline in the same commit. Website: Playwright `toHaveScreenshot` on every
page, desktop and phone.
**Gate:** baselines committed; the comparison runs nightly; a deliberately broken layout
is caught (bite check).

### U3 · Accessibility, measured

The audit extended to all 27 screens, plus: every touch target at least 48 dp; text
contrast at least 4.5:1 (computed from the theme's colour tokens, light and dark); every
screen usable at font scale 2.0 without cut-off text; TalkBack journeys for the five core
tasks (onboard, add, find a renewal, cancel guide, lock and unlock); reduce-motion
respected; nothing conveyed by colour alone (the colour-vision simulators on the emulator);
the system's bold-text and high-contrast settings. Website: keyboard-only through every
page, 200 % zoom, screen reader landmarks, the browser's own forced-colours mode.
**Gate:** each criterion is a script or test with its output saved.

### U4 · Robustness: conditions real people hit

No network, slow network (2G profile), the API down or answering garbage, airplane mode
in the middle of sign-in; the app backgrounded, killed by the system and restored
(process death), force-stopped; the phone almost out of storage (writes to the database fail), low memory, battery saver; the clock and time zone changed (renewal dates must not
move); the language and number format changed; 1,000 subscriptions (speed, memory);
upgrading from the previous release with data on the phone (the database migrates, the
PIN still works); a phone call or notification arriving mid-flow.
**Gate:** each condition run on the emulator with its result and evidence.

### U5 · Devices

Android emulators at API 24 (the oldest supported), 28, 31, 34 and 36, a small phone and
a tablet; Chrome, Firefox and WebKit (Safari's engine) for the website. **Needs the
owner:** the older emulator images are large downloads (I ask before each); one real
Android phone; and iOS needs a Mac or an EAS cloud build plus an iPhone (owner decision).
**Gate:** the core flows and the visual baselines pass on every image in the matrix.

### U6 · UI security on the device (MASVS, beyond P3)

| Check | How |
|---|---|
| Notification text on a **locked** screen (names and amounts) | lock the emulator, fire a reminder, screenshot; Android's channel visibility read with `dumpsys notification` |
| **Tapjacking**: another app drawing over Zeno to steal taps | an overlay test app over the PIN and payment screens; touches must be refused when obscured |
| **Task hijacking** (StrandHogg-style): a fake app slotted into Zeno's task | inspect `taskAffinity` / `launchMode` in the built manifest; try it with a test app |
| **Keyboard learning** of amounts, emails, notes; autofill on the PIN | check each input's attributes; type into them and read the keyboard's suggestions |
| **Clipboard**: anything sensitive copied (share code, exports) | read the clipboard after each copy; Android 13+'s sensitive-content flag |
| **logcat** in a release build | run every flow with `adb logcat` captured; search it for emails, tokens, amounts |
| Deep links from another app with hostile parameters | `adb am start` with every route and malformed, oversized and injected values |
| No developer menu, no stack trace on screen, in release | shake, the dev-menu key, a forced error |
| Recents thumbnail, screenshots, screen recording | re-run the P3 checks on the current build |
| **Gmail connection**: the consent screen asks for read-only only; disconnecting revokes the token at Google; the token never appears in logs, exports or crash reports; a scan reads nothing but what the UI says it reads | Google's permissions page after connecting; Google's "third-party access" page after disconnecting; logcat and a crash report during a scan |
| **Biometric unlock**: a wrong finger or face is refused; biometrics disabled or re-enrolled falls back to the PIN, never to "open"; the lockout applies to biometrics too | emulator fingerprint commands (`adb -e emu finger touch`), enrolment changed between launches |
| **Exported CSV file**: where it lands, who can read it, whether it stays in the cache after sharing, and what it contains (notes are personal data) | share, then list the app's cache and the share target's copy; open the file |
| **Purchase screens**: the price shown equals the store's price; a cancelled purchase leaves the plan unchanged; "Restore purchases" restores only this account's; the paywall never says "free" when the store has no trial (F134) | Play Billing's test cards on the emulator with a licensed test account (needs the owner's Play Console setup) |
| **The push token** stays on the phone: never sent to our API or shown | logcat and the API's request log during notification setup |
| **Privacy promises on screen match the code**: "No bank login required", "scans only when you tap", "nothing is sent" on the coach consent | each sentence found on the device and traced to the code that makes it true (the truthfulness rail, extended to the app) |

**Gate:** every row has its evidence; a failure becomes a finding and a fix.

### U7 · The attacker's view: can anything be lost?

For each thing of value: how someone could take it, the test that tries, and what stops
it. Run against the API in its production configuration on this machine (never against
production users), and the release APK on the emulator.

| What could be lost | The attacks tried | What is checked |
|---|---|---|
| **Users' data** (another person's account or household) | stolen or replayed sign-in links, cross-account requests, guessing household codes, token forgery, a modified app calling the API directly | the authorisation matrix re-run black-box against a running server; code-guessing costs measured against the rate limits |
| **Your money: Pro without paying** | a modified APK (Pro is unlocked on the phone, F15), edited local storage, a faked RevenueCat webhook, replaying another person's purchase | decompile and patch the release APK to see what a patched build unlocks; webhook spoofing (tested on the API); the **decision** on server-side checks or Play Integrity |
| **Your money: AI bill** | many accounts each calling the coach at its limit; huge prompts; using the coach as a free general-purpose AI | the per-account limit (10/min), the input limits, **whether there is any global daily cap** (today: none found; measure it), off-topic refusal |
| **The AI itself** | prompt injection through subscription names and notes, extracting the system prompt, making it give harmful financial advice, leaking one user's data into another's answer | a fixed attack set sent to the coach (local, the real provider, a capped budget) with each answer checked |
| **Your email reputation and Resend bill** | sign-in-email bombing of one address, many addresses, using our mails to spam | the per-address limit; a cap per IP; the mail's fixed content |
| **Hosting** (Render hours, uptime) | floods of requests, slow requests, large bodies | the limits per route and globally; the request timeout; the body cap; edge limiting (owner, P8.7) |
| **Secrets** | keys in the APK, the website's build, logs, error messages, the git history | re-scan the release APK and the built site; gitleaks; the log-hygiene tests |
| **The website** | waitlist spam, script injection, defacement | the waitlist route's validation; the script policy; DAST |
| **Users' Gmail** | a stolen Gmail token from the phone; a sign-in link that connects someone else's inbox; the scanner tricked by a crafted email (prompt-injection-style receipts) | the token's storage (keychain, device-only); the connect flow bound to the signed-in account; crafted receipt emails against the parser (it must never run anything, only read amounts) |
| **Users' trust: a fake Zeno** | a look-alike app or website collecting sign-ins; our sign-in email imitated | what our real emails and app can be told apart by (sender domain with DMARC at reject, the app's signing key); a note in the FAQ |
| **The account itself** | taking over an account through the email address (a changed or recycled address), deleting someone else's account, locking a user out by spamming wrong codes | account deletion needs the caller's own token (tested); the wrong-code budget leaves the link working (F80); recycled-address takeover is a **known gap** (sign-in is by email control): record it with its owner |

**Gate:** a written verdict per row (closed with its evidence, or an open risk with its
owner and cost), added to the residual-risk register in `SECURITY_AUDIT_2026-10.md`.

---

## Order and cost

U6 and U7 first: they protect money and data. Then U1, U3, U2, U4, U5. Everything I can
do runs on this machine and GitHub; what needs the owner is marked in the tracker
(emulator image downloads, a real phone, iOS, decisions). An honest estimate is several
sessions per phase; sessions stay about an hour each.

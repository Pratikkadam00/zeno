# UI and attack-resistance tracker

The live tracker for `docs/UI_TEST_PLAN.md`. One row per check. A row moves to **pass**
only with its evidence named (a test, a script's saved output, a screenshot in
`docs/ui-evidence/`, a measurement); a **fail** names its finding (F‹n›) and moves to
pass when the fix is proven. Order of work: U6, U7, U1, U3, U2, U4, U5.

**Status:** ⬜ to do · 🔄 in progress · ✅ pass · ❌ fail (finding open) · 🔒 needs the owner
· ⏸ blocked (says why)

**Summary (2026-10-07):** 82 checks. 7 were already proven before this plan (P3, P5)
and are carried in as baseline, marked ✅ with their original evidence (the U6 ones are
re-run on the current build). 0 new checks done yet; 6 need the owner (🔒).

---

## U6 · UI security on the device

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U6.1 | Reminder notifications on a **locked** screen: name and amount hidden? | ⬜ | |
| U6.2 | Notification channel visibility (`dumpsys notification`) | ⬜ | |
| U6.3 | Tapjacking: touches refused when another app draws over the PIN screen | ⬜ | |
| U6.4 | Tapjacking: same over the paywall and sign-in | ⬜ | |
| U6.5 | Task hijacking: `taskAffinity` / `launchMode` in the built manifest, tried with a test app | ⬜ | |
| U6.6 | Keyboard learning: amount, email, notes and PIN inputs' attributes | ⬜ | |
| U6.7 | Autofill and password managers on the PIN field | ⬜ | |
| U6.8 | Clipboard after each copy action (share code, export) | ⬜ | |
| U6.9 | logcat over every flow of a release build: no email, token or amount | ⬜ | |
| U6.10 | Deep links from another app: every route with hostile parameters | ⬜ | |
| U6.11 | Release build: no developer menu, no stack trace on screen after a forced error | ⬜ | |
| U6.12 | Recents thumbnail shows the lock | ✅ baseline | P3.4 (device, 2026-10-02); re-run ⬜ |
| U6.13 | Lock and PIN screens can't be captured | ✅ baseline | P3.7 (0 % non-black); re-run ⬜ |
| U6.14 | Locked app hidden from accessibility services | ✅ baseline | F105 (device); re-run ⬜ |
| U6.15 | Data on the phone unreadable without the key (rooted read) | ✅ baseline | F16 (device); re-run ⬜ |
| U6.16 | No backup of app data | ✅ baseline | P3.9 (`allowBackup=false`); re-run ⬜ |

## U7 · The attacker's view: can anything be lost?

| ID | What could be lost · attack | Status | Evidence / finding |
|---|---|---|---|
| U7.1 | Users' data · authorisation matrix black-box against a running server | ⬜ | |
| U7.2 | Users' data · replayed and stolen sign-in links, refresh-token reuse | ⬜ | |
| U7.3 | Users' data · household share-code guessing: cost at the rate limits | ⬜ | |
| U7.4 | Users' data · a modified app calling the API directly | ⬜ | |
| U7.5 | Money · patched release APK: what Pro features it unlocks (F15) | ⬜ | |
| U7.6 | Money · edited local storage flipping the plan | ⬜ | |
| U7.7 | Money · faked or replayed RevenueCat webhook | ⬜ | |
| U7.8 | Money · decision: server-side checks or Play Integrity for Pro | 🔒 | after U7.5 measures the exposure |
| U7.9 | AI bill · many accounts at the per-account limit: cost per hour | ⬜ | |
| U7.10 | AI bill · a global daily cap (none exists today) | ⬜ | |
| U7.11 | AI bill · oversized and repeated prompts | ⬜ | |
| U7.12 | AI · used as a free general-purpose AI (off-topic refusal) | ⬜ | |
| U7.13 | AI · prompt injection through subscription names and notes | ⬜ | |
| U7.14 | AI · extracting the system prompt | ⬜ | |
| U7.15 | AI · harmful or professional financial advice | ⬜ | |
| U7.16 | AI · one user's data in another's answer | ⬜ | |
| U7.17 | Email · sign-in-email bombing, one address and many | ⬜ | |
| U7.18 | Hosting · request floods, slow requests, large bodies | ⬜ | |
| U7.19 | Hosting · edge rate limiting | 🔒 | P8.7 (Cloudflare) |
| U7.20 | Secrets · release APK strings and assets re-scanned | ⬜ | |
| U7.21 | Secrets · built website re-scanned | ⬜ | |
| U7.22 | Website · waitlist spam | ⬜ | |
| U7.23 | Verdicts added to the residual-risk register | ⬜ | |

## U1 · Every screen, every state

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U1.1 | State matrix written: 27 screens × empty / one / many / loading / offline / error | ⬜ | |
| U1.2 | Empty states | ⬜ | |
| U1.3 | The free cap (10) and many (200) | ⬜ | |
| U1.4 | Loading and offline | ⬜ | |
| U1.5 | Server errors | ⬜ | |
| U1.6 | Long names and amounts; emoji; non-Latin text | ⬜ | |
| U1.7 | All six currencies' formatting | ⬜ | |

## U3 · Accessibility, measured

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U3.1 | Every control named: 17 of 27 screens | ✅ baseline | P5 audit (`.maestro/a11y-audit.sh`) |
| U3.2 | Every control named: the other 10 screens | ⬜ | |
| U3.3 | Touch targets at least 48 dp, every screen | ⬜ | |
| U3.4 | Text contrast at least 4.5:1, light and dark (from the theme tokens) | ⬜ | |
| U3.5 | Font scale 2.0: no cut-off text, every screen | ⬜ | |
| U3.6 | TalkBack journeys: onboard, add, find a renewal, cancel guide, lock | ⬜ | |
| U3.7 | Reduce motion respected | ⬜ | |
| U3.8 | Website: keyboard only through every page | ⬜ | |
| U3.9 | Website: 200 % zoom | ⬜ | |
| U3.10 | Website: screen-reader landmarks and headings | ⬜ | |

## U2 · How it looks: visual baselines

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U2.1 | Screenshot tooling and comparison script | ⬜ | |
| U2.2 | Baselines: every screen, light and dark, normal phone | ⬜ | |
| U2.3 | Baselines: small phone (5.0") | ⬜ | |
| U2.4 | Baselines: tablet | ⬜ | |
| U2.5 | Baselines: font scale 1.3 and 2.0 | ⬜ | |
| U2.6 | Website: `toHaveScreenshot` on every page, desktop and phone | ⬜ | |
| U2.7 | Comparison runs nightly | ⬜ | |
| U2.8 | Bite check: a deliberately broken layout is caught | ⬜ | |

## U4 · Robustness

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U4.1 | No network, start to finish | ⬜ | |
| U4.2 | Slow network (2G profile) | ⬜ | |
| U4.3 | API down; API answering garbage | ⬜ | |
| U4.4 | Airplane mode in the middle of sign-in | ⬜ | |
| U4.5 | Backgrounded, killed by the system, restored (process death) | ⬜ | |
| U4.6 | Clock and time zone changed: renewal dates don't move | ⬜ | |
| U4.7 | Language and number format changed | ⬜ | |
| U4.8 | 1,000 subscriptions: speed and memory | ⬜ | |
| U4.9 | Upgrade from the previous release with data on the phone | ⬜ | |
| U4.10 | A call or notification mid-flow | ⬜ | |

## U5 · Devices

| ID | Check | Status | Evidence / finding |
|---|---|---|---|
| U5.1 | Android API 36 emulator (Pixel) | ✅ baseline | P5: 13 flows green |
| U5.2 | Android API 24 emulator (oldest supported) | 🔒 | large download: ask the owner first |
| U5.3 | Android API 28, 31, 34 emulators | 🔒 | large downloads: ask the owner first |
| U5.4 | Small phone and tablet emulator profiles | ⬜ | |
| U5.5 | One real Android phone | 🔒 | the owner's phone |
| U5.6 | iOS | 🔒 | needs a Mac or an EAS cloud build, plus an iPhone: owner decision |
| U5.7 | Website in Firefox | ⬜ | |
| U5.8 | Website in WebKit (Safari's engine) | ⬜ | |

---

## Findings from this plan

| # | Finding | Severity | Status |
|---|---|---|---|
| — | none yet | | |

## Log

**2026-10-07:** plan and tracker written from a measured baseline (screens, tests, flows,
audit scope, device coverage, website projects, the AI limits in the code).

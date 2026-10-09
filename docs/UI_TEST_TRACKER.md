# UI and attack-resistance tracker

The live tracker for `docs/UI_TEST_PLAN.md`. One row per check. A row moves to **pass**
only with its evidence named (a test, a script's saved output, a screenshot in
`docs/ui-evidence/`, a measurement); a **fail** names its finding (F‹n›) and moves to
pass when the fix is proven. Order of work: U6, U7, U1, U3, U2, U4, U5.

**Status:** ⬜ to do · 🔄 in progress · ✅ pass · ❌ fail (finding open) · 🔒 needs the owner
· ⏸ blocked (says why)

**Summary (2026-10-08):** 100 checks (18 added in the 2026-10-08 review). 7 were already proven before this plan (P3, P5)
and are carried in as baseline, marked ✅ with their original evidence (the U6 ones are
re-run on the current build). 0 new checks done yet; 7 need the owner (🔒).

**U7 verdicts (2026-10-09):** all 27 rows carry a verdict, evidenced against the API's
own suite (45 files, 622 tests green on 2026-10-09) — see
`ui-evidence/u7-attackers-view-2026-10-09.md`. 18 closed, 2 open-low (U7.5/U7.6, cosmetic
client-side Pro unlock the server already ignores), 1 open-medium added to the register as
R33 (U7.10, no global daily AI cap), 2 not applicable (U7.24/U7.25, Gmail scanner not
built), 4 owner (U7.8, U7.19, U7.26, and the recycled-email gap under U7.27/R11). R26
updated (the waitlist now has its own per-IP limiter). U6 is next.

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
| U6.17 | Gmail: consent screen asks read-only only; disconnect revokes at Google | ⬜ | |
| U6.18 | Gmail: token never in logs, exports or crash reports; a scan reads only what the UI says | ⬜ | |
| U6.19 | Biometrics: wrong finger refused; disabled or re-enrolled falls back to the PIN, never opens | ⬜ | |
| U6.20 | Biometrics: the lockout applies to biometric attempts too | ⬜ | |
| U6.21 | Exported CSV: location, readers, cache after sharing, contents | ⬜ | |
| U6.22 | Purchases: shown price equals the store's; a cancelled purchase changes nothing; restore is per account; no "free" without a trial | 🔒 | needs a Play licensed test account |
| U6.23 | Push token never leaves the phone | ⬜ | |
| U6.24 | Privacy promises on screen traced to the code that makes them true | ⬜ | |

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
| U1.1 | State matrix written: 27 screens × empty / one / many / loading / offline / error | ⬜ | |
| U1.2 | Empty states | ⬜ | |
| U1.3 | The free cap (10) and many (200) | ⬜ | |
| U1.4 | Loading and offline | ⬜ | |
| U1.5 | Server errors | ⬜ | |
| U1.6 | Long names and amounts; emoji; non-Latin text | ⬜ | |
| U1.7 | All six currencies' formatting | ⬜ | |
| U1.8 | Every screen: no placeholder text, "undefined" or raw keys; locale formats; every link where its label says | ⬜ | |

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
| U3.11 | Nothing conveyed by colour alone (colour-vision simulation) | ⬜ | |
| U3.12 | System bold-text and high-contrast settings | ⬜ | |
| U3.13 | Website: forced-colours mode | ⬜ | |

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
| U4.11 | Phone almost out of storage: database writes fail safely | ⬜ | |
| U4.12 | Low memory, battery saver | ⬜ | |

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

**2026-10-08:** reviewed against the app's features; 18 checks added that the first
version missed: the Gmail connection (the most sensitive thing the app touches),
biometric unlock, the exported file, real purchase flows, the push token, on-screen
privacy promises, a fake-Zeno attack, account takeover through a recycled address, low
storage and memory, colour-only information, forced colours, and copy correctness.

**2026-10-07:** plan and tracker written from a measured baseline (screens, tests, flows,
audit scope, device coverage, website projects, the AI limits in the code).

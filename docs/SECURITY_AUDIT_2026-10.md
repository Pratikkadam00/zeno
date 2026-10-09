# Zeno — security audit, October 2026 (P7.4)

**Date:** 2026-10-05. **Replaces:** `docs/SECURITY_AUDIT_2026-07.md` (kept for the record).
**Covers:** the API (Fastify, Render), the website (Next.js, Netlify), the Android app
(React Native, Expo), and the repository and CI that build them, at commit `93baf7f` and
later. **Method:** the hardening programme P0 to P7 (`docs/HARDENING_LOG.md`): every
claim below is a test, a CI job, a measurement on the live hosts or the device, or a
document written from the code; nothing is "believed".

## 1. Verdict

**The code is in a state to soft-launch on Android, once the owner's account actions in
section 5 marked "before launch" are done.** No defect in the code is open above Low; my
Medium items are P8 operations work (R8). The highest risks left are operational, and each is the owner's: `main` can be
force-pushed (F7), keys that were pasted into a chat are not yet rotated, and the
production database expires on 2026-11-03 with no tested restore.

What stands behind that (each on GitHub, not a local run, as of 2026-10-05):

| Check | Where | State |
|---|---|---|
| Types, lint, unit and integration tests (2,283 vitest, 223 website component, 571 jest), coverage floors, the website build, 335 browser tests | CI, every push | green on `93baf7f` |
| CodeQL (security-extended), zero findings gate | every push | green on `93baf7f` (it was red on 2 pushes, fixed in `70ad986`) |
| Dependency audit, blocking on high and critical | every push | green; 4 advisories accepted with reasons and expiry dates |
| Secret scan over the full history (gitleaks) | every push; and before each push by hand | no leaks |
| Website DAST (ZAP), nightly | schedule | green |
| API fuzzing (10,000 runs per route), nightly | schedule | green |
| 13 Android flows and a 17-screen accessibility audit on an emulator | schedule (2026-10-05 11:23 UTC) | green |
| Mutation testing with floors (shared 92 %, API 88 %, app logic 89 %) | nightly | **not yet run**: first schedule 2026-10-06 02:47 UTC (the P6 gate) |

## 2. Against the standards

**OWASP ASVS 5.0, Levels 1 and 2** (`docs/ASVS_CHECKLIST.md`, generated from OWASP's
published file; 253 requirements): **158 met, 79 not applicable, 12 partial, 4 open.**
Every met row names its evidence; every partial or open row names its owner, and none is
mine. Documents ASVS asks for, written from the code: `docs/THREAT_MODEL.md`,
`docs/AUTH_AND_SESSIONS.md`, `docs/INPUT_VALIDATION.md`, `docs/CRYPTOGRAPHY.md`,
`docs/DATA_AND_LOGGING.md`, `docs/COMPONENTS_AND_LOAD.md`.

**OWASP MASVS 2.1** (`docs/MASVS_CHECKLIST.md`; 24 controls): 11 met, 7 partial, 5 not
met, 1 not applicable. Every row names the tests that hold it (41); the not-met ones
(pinning, forced updates, root and tamper detection, anti-debugging) are one owner
decision with a recommendation (`docs/OWNER_ACTIONS.md` D12).

**Findings:** 220 recorded (F1 to F222). 21 are not closed, and every one is in the
register below; one (F6) is a working rule, not a defect. The rest are fixed, each with a
test that fails on the old code.

## 3. What changed since July

July's audit ran automated checks and a code review; its main finding was dependency
advisories. Since then:

- **The server** was rebuilt for production (P0 to P2): real Postgres with encrypted
  storage of provider tokens, an authorisation matrix over every route, fuzzing, rate
  limits on every route, and a fail-closed auth guard. It runs on Render from a
  Blueprint and deploys only when CI passes.
- **The app** (P3, P5): SQLCipher storage, a PIN lock with a persisted lockout, nothing
  sensitive in backups or logs, sign-in links bound to the phone that asked, every modal
  hidden while locked; 13 end-to-end flows on an emulator.
- **The website** (P4): a script policy without `unsafe-inline` scripts, nightly DAST,
  every public claim held to the code by tests.
- **Testing depth** (P6): mutation testing with floors and property-based tests; both
  found real defects (mutation testing F205 to F207, property tests F215).
- **This review** (P7): the threat model, ASVS and MASVS, and 7 fixes from reading the
  standards against the code: F216 (a token's not-before date), F217 (no caching of API
  answers), F218 (outbound calls followed redirects), F219 (a repeated query parameter),
  F220 (an older sign-in link stayed usable), F221 (signing in again left the old session
  alive), F222 (sign-in links were used up by a GET with the token in the URL). Plus a
  security-event log naming account, method and outcome.

## 4. What this audit does not cover

- **iOS has never run on a device.** No iOS behaviour is verified.
- **No external penetration test.** Every test here was written by the same author as
  the code; DAST and fuzzing are automated.
- **Render's and Netlify's own controls** (their load balancers, disks, staff access)
  are trusted, not tested. Request smuggling was tested against the API itself, not
  Render's proxy in front of it.
- **Sentry and RevenueCat** have not run in a release build (no keys yet).
- **Legal sufficiency** of the privacy policy and terms (a lawyer's call; every factual
  statement in them was checked against the code in P4.1c).

## 5. Residual-risk register

Severity is the risk if nothing is done. Dates are the target I propose for each: the
owner may move them, and each item is re-checked on its date. "Before launch" items
block the soft launch.

| # | Risk | Severity | Owner | Target date | Source |
|---|---|---|---|---|---|
| R1 | `main` is not protected: anyone with push access (or a stolen token) can force-push or delete the branch that deploys to production. Checked 2026-10-05: `protected: false` | High | owner | 2026-10-12, before launch | F7; `OWNER_ACTIONS.md` §1 |
| R2 | Keys pasted into a chat (Groq, Resend, Plaid sandbox, a JWT pair) are not rotated: treat them as public | High | owner | 2026-10-12, before launch | `OWNER_ACTIONS.md` §1 |
| R3 | The production database expires on 2026-11-03 (Render free plan), and no restore has ever been tested | High | owner | 2026-11-01 | Threat model §3.3; P8 |
| R4 | GitHub secret-scanning push protection and Dependabot alerts not confirmed on | Medium | owner | 2026-10-12 | F8 |
| R5 | The client IP behind Render's proxy is unverified, so per-IP rate limits may key on the proxy | Medium | owner (one log check) | 2026-10-12 | F3 |
| R6 | Routes the app doesn't use are live in production (`/sync`, `/public-api/keys`, `/business/summary`, open-banking intents) and a Plaid development adapter | Medium | owner (decision) | 2026-10-19 | ASVS V15.2.3; D17 |
| R7 | Logs: Render workspace sign-in (2FA, members) unconfirmed; retention unconfirmed against the privacy policy's 30 days; no separate system for alerting beyond the 5xx webhook | Medium | owner | 2026-10-31 | ASVS V16.4.2, V16.4.3; P8 |
| R8 | Rate limits are per process with one instance; no edge limiter in front | Medium | me | 2026-10-31 (P8) | Threat model; `OPEN_ITEMS.md` |
| R9 | Google sign-in and Gmail connect use a custom-scheme redirect that Google no longer supports on Android | High (feature) | owner (client IDs), then me | before the Play release | F11 |
| R10 | Product truthfulness: the Family plan sells what is free (F96), Envelopes can't be set up (F140), the Gmail card's "nothing leaves your phone" (F114), "never see your bank login" if Plaid ships (F45), the ledger headline's label (F187), 305 general cancel guides presented as researched (F25) | Medium (High for F25 on public pages) | owner (decisions D1, D2, D4, D5, D15) | before selling Pro / before launch | `OWNER_ACTIONS.md` §2 |
| R11 | Sign-in decisions: no second factor, no absolute session lifetime, no "sign out of all devices" | Low | owner (D17) | 2026-10-19 | ASVS V6.3.3, V7.3.2, V7.4.5, V7.5.2 |
| R12 | JWT signing key is RSA 2048 (about 112-bit security); the 3072-bit pair is ready | Low | owner | 2026-10-12 (with R2) | ASVS V11.2.3 |
| R13 | Postgres connection is encrypted but its certificate isn't verified (Render's internal network); the API connects as the database owner | Low | owner | 2026-10-31 (P8) | ASVS V12.3.2, V13.2.2 |
| R14 | No network-level outbound allowlist (the code's allowlist is enforced by test) | Low | owner (accept or move host) | 2026-10-31 (P8) | ASVS V13.2.5 |
| R15 | Someone holding an unlocked phone can move its clock past the PIN lockout (one guess per cycle) | Low | owner (D9) | 2026-10-19 | F14 |
| R16 | An access token keeps working up to 15 minutes after sign-out | Low | owner (D7) | 2026-10-19 | F77 |
| R17 | Production refuses to boot on fewer bad settings than planned (others only warn) | Low | owner (D8) | 2026-10-19 | F90 |
| R18 | The widget snapshot is written in plaintext before any widget ships | Low | owner (D10) | 2026-10-19 | F161 |
| R19 | Two photo-read permissions from `expo-screen-capture` | Low | owner (D3) | before the Play release | F104 |
| R20 | MASVS: no certificate pinning, no forced updates, minimum Android 7.0 (so no OS block on tapjacking overlays below Android 12, U6.3), no root or tamper detection | Low (for this app) | owner (D12) | 2026-10-19 | MASVS checklist; U6.3 (2026-10-09) |
| R21 | Household share code is about 40 bits (typed by people; rate-limited, 5 members at most) | Low | owner (accept, D17) | 2026-10-19 | ASVS V11.5.1 |
| R22 | iOS never run on a device | Medium | owner (device or cloud build), then me | before the iOS release | §4 |
| R23 | Sentry and RevenueCat untested in a release build; a native crash skips the event scrubber (breadcrumbs are scrubbed) | Medium | owner (keys), then me | when the keys exist | `OPEN_ITEMS.md` |
| R24 | Accepted advisories: `braces` and `node-forge` (developer tools; no fix exists), `image-size` ×2 (build time) | Low | me | 2026-11-30 and 2026-12-31 (their expiries) | `.audit-allowlist.json` |
| R25 | Website style policy allows `unsafe-inline` styles | Low | me | 2027-03-31 | `.zap-accepted.json` |
| R26 | The waitlist function now has its own per-IP limiter (5/min, trusted-hop XFF keying, 2 KB body cap, strict email validation — `apps/web/app/api/waitlist/route.ts`), but the in-memory counter resets on cold start, so a platform/WAF limiter is still wanted in front | Low | me | 2026-10-31 (P8) | Threat model §3.4; U7.22 (2026-10-09) |
| R27 | A rare native crash after "Continue without an account" (react-native-screens with Reanimated; no released fix) | Low | me | each upgrade of either | F191 |
| R28 | Wells Fargo CSV: the first row is assumed to be a header; a real export may lose its first transaction | Medium (data) | owner (one sample file) | before launch | F19 |
| R29 | Small items: "Rate Zeno" opens Apple's store on Android (F101); what "Export my data" covers (F127, D6); made-up guide addresses log an error line (F199); text typed in the homepage's first 65 ms is lost (F200) | Low | owner (F101, F127); me (F199, F200) | before the store release; P8 | log |
| R30 | The privacy policy, cookie policy and terms are drafts not reviewed by a lawyer | Medium (legal) | owner | before launch | `OWNER_ACTIONS.md` §1 |
| R31 | **Closed 2026-10-06:** each successful change to a user's data (household created, joined, spend changed, left; account deleted) is now an audit event naming the account and household (`apps/api/src/security-events.test.ts`). Was: no audit trail of what users change | Low | me | 2026-10-06 (closed) | Threat model §6 |
| R32 | The contact addresses receive no mail (no MX record): data requests to `privacy@` and vulnerability reports to `security@` bounce | High (legal) | owner | 2026-10-12, before launch | F223 |
| R33 | No global or daily AI spend cap: the coach is limited 10/min **per account**, but N accounts can drive up to N×600 coach calls/hour (each ≤1024 output tokens). The only global brake is provider-side spend limits on the Groq/Anthropic account plus the rate-limited account-creation path | Medium (cost) | owner (set a global daily token/spend cap, or accept with provider-side caps) | 2026-10-31 (P8) | U7.10 (2026-10-09) |
| R34 | A renewal reminder's service name and amount show in full on a PIN-locked phone under Android's default lock-screen setting (hidden only when the user picks 'hide sensitive content'); the app can only go further by posting reminders as SECRET or without amounts | Low | owner (D22) | 2026-10-19 | F229; U6.1 (2026-10-09) |

## 6. Next

P8 (production operations: backups and a restore drill, edge rate limiting, alerting,
the database's paid plan), the owner's items above, and the P6 gate's first nightly
mutation run. This report is next revised at the P8 gate or at launch, whichever is first.

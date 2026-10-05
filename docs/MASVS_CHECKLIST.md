# MASVS checklist — Zeno mobile (P3 gate 2026-10-02; refreshed in P7.3, 2026-10-05)

Against **OWASP MASVS v2.1.0**. The control statements below are copied from the
`OWASP/masvs` repository (`controls/MASVS-*.md`), not from memory.

**What changed in P7.3.** Every row's evidence now names the automated tests that hold it
(file › test name, all under `apps/mobile/` unless a path says otherwise), next to what
was seen on the device in P3. Rows were updated for P4 to P7.2: the sign-in fixes F220
to F222, the dependency allowlist now holding 4 advisories, and mutation testing of the
app's logic (P6.5: a nightly floor of 89 %, `stryker.mobile.config.mjs`). No status
changed, so nothing was marked better than its evidence.

**Scope of the evidence:**
- **Tests** run on every push (CI) and, for the logic under `src/`, under mutation testing.
- **The device:** Android only. The release APK (R8, Hermes) was built from a clean
  prebuild and driven on emulator-5554 (API 36, `sdk_gphone64_x86_64`, rooted for the
  storage check) on 2026-10-02. **iOS has never been run;** no iOS line is verified on a
  device.
- "Log" means `docs/HARDENING_LOG.md`. "F‹n›" is a finding row there.

**Status values:** **Met** (holds, with the evidence shown); **Partial** (the gap is
named); **Not met** (not implemented; names who decides); **N/A** (nothing to apply to).

## STORAGE

| Control | Status | Tests | Seen on the device / other evidence |
|---|---|---|---|
| **MASVS-STORAGE-1** The app securely stores sensitive data. | **Met** (one residual, F161) | `src/storage/database.real.test.ts` › "issues PRAGMA key FIRST, with the secure-store key, single quotes escaped, then migrates"; `src/security/secure-store.test.ts` › "never writes the database encryption key to localStorage", "returns the SAME database key on repeated calls without ever touching localStorage"; `src/auth/authStore.flows.test.ts` › "verification POSTs the token in the body (never in the URL), stores the session device-only, and forgets the request"; `src/security/app-lock.test.ts` › "stores a versioned, salted hash — not the raw PIN — using real PBKDF2 (v3)" | SQLCipher (`app.config.ts` `useSQLCipher: true`); the key is 2 × `Crypto.randomUUID()` in SecureStore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. **On the device (F16):** `zeno.db` begins with random bytes, not `SQLite format 3\0`; "Netflix", "Spotify" and "15.49" are in none of the app's 31 data files. **Residual:** the widget snapshot in AsyncStorage is plaintext (next renewal's name and amount, the monthly total), app-private and not backed up; whether to write it before a widget ships is F161 (the owner's). |
| **MASVS-STORAGE-2** The app prevents leakage of sensitive data. | **Met** | `app.config.test.ts` › "Android Auto Backup is off, R8 minify and resource shrinking are on, and release traffic is TLS only"; `babel.config.test.ts` › "production strips console.log/info/debug/trace and keeps error and warn"; `src/monitoring/report.test.ts` › "does not call Sentry.init when no DSN is configured", "calls Sentry.init exactly once: error capture only, no default PII, no screenshot, every event and breadcrumb scrubbed"; `src/monitoring/scrub-edges.test.ts` and `sentry-scrub.test.ts` (F213); `src/security/security-screen.rntest.tsx` › "P3.7: screen capture" | `allowBackup=false` in the built manifest (`aapt2`, P3.9); console calls counted 0 / 0 / 0 / 0 in the release bundle (P3.2). **On the device:** every lock screenshot 0 % non-black below the status bar (P3.7); the locked tree held only the lock (F105). No secret in the bundle (P3.6, P3.9: gitleaks over the files and every binary's strings). |

## CRYPTO

| Control | Status | Tests | Other evidence |
|---|---|---|---|
| **MASVS-CRYPTO-1** The app employs current strong cryptography and uses it according to industry best practices. | **Met** | `src/security/app-lock.test.ts` › "stores a versioned, salted hash — not the raw PIN — using real PBKDF2 (v3)", "verifies a legacy v2 (1000-round chained SHA-256) hash and transparently upgrades it to v3", "rejects every malformed v3 field (zero/negative iterations, empty salt, empty hash)" | PIN: PBKDF2-HMAC-SHA256, 600,000 iterations, 16-byte salt, native `react-native-quick-crypto`, `timingSafeEqual`. Data at rest: SQLCipher 4.7.0 (AES-256 with a per-page HMAC-SHA512). Randomness: `expo-crypto`. The whole inventory: `docs/CRYPTOGRAPHY.md`. |
| **MASVS-CRYPTO-2** The app performs key management according to industry best practices. | **Partial** | `src/security/secure-store.test.ts` (above); `src/security/erase-device.test.ts` › "what each scope erases" | Keys are made on the device, held in the keystore device-bound, never backed up; lifecycle in `docs/CRYPTOGRAPHY.md`. **Gap:** no rotation of the database key (deferred in `docs/SECURITY_ARCHITECTURE.md`). |

## AUTH

| Control | Status | Tests | Seen on the device / other evidence |
|---|---|---|---|
| **MASVS-AUTH-1** The app uses secure authentication and authorization protocols and follows the relevant best practices. | **Met** | `src/auth/authStore.flows.test.ts` › "with no request from this device it is refused WITHOUT a server call, and the session on the phone survives" (F100), "a token with no readable email claim is discarded the same way", "a sign-in link verified while the launch read is pending stays signed in" (F154), "the old refresh token is revoked, after the new session is stored" (F221); `src/__screens__/login.rntest.tsx` › "every sign-in is disabled until the 16+ / Terms box is ticked; every control is named"; server: `apps/api/src/authz-matrix.test.ts`, `apps/api/src/routes/auth.test.ts` › "the first link is refused after a second is requested; the second works" (F220), `apps/api/src/http-message.test.ts` › "a sign-in link is used up by POST only; the old GET with the token in its URL is gone" (F222) | The server side: `docs/AUTH_AND_SESSIONS.md` and the ASVS checklist (V6 to V10). **On the device:** sign-in stays disabled until the consent is checked. |
| **MASVS-AUTH-2** The app performs local authentication securely according to the platform best practices. | **Met** (Android, PIN path) | `src/security/lock-store.test.ts` › "a wrong PIN counts the attempt, persists it, and says how many are left", "the 10th wrong PIN starts a persisted 15-minute lockout", "during a lockout even the CORRECT PIN is refused, without checking it", "after the lockout has elapsed, a wrong PIN re-locks at once (the counter was kept)", "re-engages the lock on re-hydrate even though nothing touched auth session state"; `src/security/LockOverlay.rntest.tsx` › "keeps digits only, caps at 8, and never renders the PIN in clear" | **On the device:** the lock engaged on return from the background; the 10th wrong PIN gave the 15-minute lockout, which survived a force-stop. **Not verified:** biometrics on a device. **Open:** moving the clock past the lockout on an unlocked phone (F14, the owner's). |
| **MASVS-AUTH-3** The app secures sensitive operations with additional authentication. | **Partial** | `src/security/security-screen.rntest.tsx` › "turning the lock off (F98)": "a wrong PIN goes through the COUNTED check…", "the right PIN turns the lock off and leaves the screen", "a keychain failure fails CLOSED…"; `src/__screens__/settings.rntest.tsx` › "Delete all my data: Cancel keeps everything; Delete erases it and goes to the ledger" | Turning the lock off asks for the PIN, inside the attempt limit. **Gap:** erase, cancel-account and export ask only for a confirmation (or none); with the lock on, all sit behind it. `OWNER_ACTIONS.md` D12 recommends no PIN for them; the owner decides. |

## NETWORK

| Control | Status | Tests | Other evidence |
|---|---|---|---|
| **MASVS-NETWORK-1** The app secures all network traffic according to the current best practices. | **Met** | `app.config.test.ts` › "every store-bound EAS profile sets an https API, so no release build gets the cleartext fallback", "Android Auto Backup is off, R8 minify and resource shrinking are on, and release traffic is TLS only" | `usesCleartextTraffic=false` in the built manifest (P3.9); system trust store, no user CAs. The API and website accept only TLS 1.2 and 1.3 with forward-secret AEAD suites (`scripts/tls-check.mjs`, measured 2026-10-05). |
| **MASVS-NETWORK-2** The app performs identity pinning for all remote endpoints under the developer's control. | **Not met** (decision) | — | No pinning. D12 recommends not now (the API uses Render's shared certificate, which Render rotates); the owner decides. |

## PLATFORM

| Control | Status | Tests | Other evidence |
|---|---|---|---|
| **MASVS-PLATFORM-1** The app uses IPC mechanisms securely. | **Met** | `src/utils/deep-link.test.ts`; `src/__screens__/root-layout.rntest.tsx` › "a link arriving while open is handled too; a repeated token param uses the first", "a refused link stays on screen (the store shows why): no navigation, no unhandled rejection"; `src/utils/external-link.test.ts` › "isAllowedExternalUrl", "refuses without opening anything" | Exported components in the built APK, each with a reason (P3.9); every provider `exported=false`. |
| **MASVS-PLATFORM-2** The app uses WebViews securely. | **N/A** | — | No WebView dependency; OAuth and cancellation pages open in the system browser. |
| **MASVS-PLATFORM-3** The app uses the user interface securely. | **Met** (after F159) | `src/security/AppModal.rntest.tsx` › "an open menu is hidden the moment the app locks, and back after unlocking", "before the lock has loaded (fail-closed): hidden"; an eslint rule forbids a raw `Modal` | **On the device:** the locked tree held only the lock; a tap where Pause was did nothing. App-wide `FLAG_SECURE` is the owner's call (P3.7). **Not verified:** iOS's action sheet over the lock. |

## CODE

| Control | Status | Tests | Other evidence |
|---|---|---|---|
| **MASVS-CODE-1** The app requires an up-to-date platform version. | **Partial** (decision) | — | `targetSdkVersion` 36; `minSdkVersion` 24 (P3.9). D12 recommends keeping 24 for launch and revisiting with Play Console's device numbers; the owner decides. |
| **MASVS-CODE-2** The app has a mechanism for enforcing app updates. | **Not met** (decision) | — | No update mechanism and no server-side minimum version. D12 recommends yes; the owner decides; not built. |
| **MASVS-CODE-3** The app only uses software components without known vulnerabilities. | **Met** (with listed exceptions) | `scripts/audit-gate.test.ts`; the blocking audit job in `.github/workflows/ci.yml` and `release.yml` | High and critical advisories block CI unless allowlisted with a reason and an expiry. On 2026-10-05: 4 accepted, none in the app bundle (`image-size` × 2, `node-forge`, `braces`; build and developer tools). Time frames: `docs/COMPONENTS_AND_LOAD.md`. |
| **MASVS-CODE-4** The app validates and sanitizes all untrusted inputs. | **Met** | `src/utils/amount-text.test.ts` › "isAmountText (F113, F122)"; `src/security/security-screen.rntest.tsx` › "only digits reach the check, at most 8"; `src/__screens__/settings.rntest.tsx` › "Export shares a CSV of every subscription, notes included (F127), formula-like text neutralised"; the deep-link tests (PLATFORM-1); `src/properties.test.ts` › "the readers never throw, and never invent a charge" (P6.4) | CSV import uses the shared parser (`packages/shared`, mutation-tested at a 92 % floor). The server validates its own inputs (`docs/INPUT_VALIDATION.md`). |

## RESILIENCE

| Control | Status | Tests | Other evidence |
|---|---|---|---|
| **MASVS-RESILIENCE-1** The app validates the integrity of the platform. | **Not met** (decision) | — | No root or jailbreak detection. |
| **MASVS-RESILIENCE-2** The app implements anti-tampering mechanisms. | **Not met** (decision) | — | No run-time integrity check (no Play Integrity). |
| **MASVS-RESILIENCE-3** The app implements anti-static analysis mechanisms. | **Partial** | `app.config.test.ts` › "Android Auto Backup is off, R8 minify and resource shrinking are on, and release traffic is TLS only" | R8 obfuscates the release build; JS ships as Hermes bytecode (P3.9). |
| **MASVS-RESILIENCE-4** The app implements anti-dynamic analysis techniques. | **Not met** (decision) | — | Not debuggable in release (P3.9). No debugger, hooking or emulator detection. |

The four RESILIENCE controls are one owner decision (D12 recommends not now, Play Integrity
later if abuse appears). Zeno keeps the user's own data on their own phone and moves no money.

## PRIVACY

| Control | Status | Tests | Seen on the device / other evidence |
|---|---|---|---|
| **MASVS-PRIVACY-1** The app minimizes access to sensitive data and resources. | **Partial** | `app.config.test.ts` › "P3.9 (F155): the prebuild template's unused permissions", "the module still declares exactly the three permissions reviewed in F104 (re-review on any upgrade that changes them)" | No bank login; Discover scans only when tapped (seen on the device). **Open:** the two photo-read permissions from `expo-screen-capture` (F104) and the widget snapshot (F161), both the owner's. |
| **MASVS-PRIVACY-2** The app prevents identification of the user. | **Partial** | `src/__screens__/root-layout.rntest.tsx` › "local-only: RevenueCat's own anonymous id, the plan read from it, no account bound", "signed out: RevenueCat is reset so the next account doesn't inherit purchases"; `src/monitoring/report.test.ts` (no default PII) | Local-only mode needs no account. **Open:** `installreferrer` 2.2 is in the APK (P3.9); which code reads it is not established, so it is not claimed either way. |
| **MASVS-PRIVACY-3** The app is transparent about data collection and usage. | **Partial** | `src/__screens__/login.rntest.tsx` › "every sign-in is disabled until the 16+ / Terms box is ticked; every control is named"; `src/__screens__/settings.rntest.tsx` › "AI coaching: off by default; turning it on says what is sent" | **Open:** the store data-safety forms (the owner, at submission). |
| **MASVS-PRIVACY-4** The app offers user control over their data. | **Met** | `src/__screens__/settings.rntest.tsx` › "Export shares a CSV of every subscription, notes included (F127), formula-like text neutralised", "Delete all my data: Cancel keeps everything; Delete erases it and goes to the ledger", "Delete all my data names what could not be erased", "F124: 'Renewal reminders' really turns reminders off, and the choice is kept"; `src/security/erase-device.test.ts` | Erase this device, cancel the account (server deletion: `apps/api/src/storage/real-pg.test.ts` › "DELETE /account: once it answers, NO row of that user remains in the database, and other users are untouched"). |

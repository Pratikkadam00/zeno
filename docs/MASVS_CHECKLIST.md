# MASVS checklist — Zeno mobile (P3 gate, 2026-10-02)

Against **OWASP MASVS v2.1.0**. The control statements below are copied from the
`OWASP/masvs` repository (`controls/MASVS-*.md`), not from memory.

**Scope of the evidence:**
- **Android only.** The release APK (R8, Hermes) was built from a clean prebuild of
  HEAD, and driven on emulator-5554 (API 36, `sdk_gphone64_x86_64`, rooted for the
  storage check) on 2026-10-02.
- **iOS has never been run.** No iOS line below is verified on a device.
- "Log" means `docs/HARDENING_LOG.md`. "F‹n›" is a finding row there.

**Status values:**
- **Met:** the control holds, with the evidence shown.
- **Partial:** part of it holds; the gap is named.
- **Not met:** not implemented. Each one names who decides.
- **N/A:** the app has nothing the control applies to.

## STORAGE

| Control | Status | Evidence |
|---|---|---|
| **MASVS-STORAGE-1** The app securely stores sensitive data. | **Met** (one residual, F161) | The subscriptions database is SQLCipher (`app.config.ts` `useSQLCipher: true`). Its key is 2 × `Crypto.randomUUID()`, kept in SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (`src/security/secure-store.ts` `getOrCreateDatabaseKey`). **On the device (F16, closed):** `zeno.db` begins with random bytes, not `SQLite format 3\0`. "Netflix", "Spotify" and "15.49" appear in none of the app's 31 data files (database, WAL, caches, prefs). The PIN hash, session and magic-link request are in SecureStore (P3.4, P3.5). **Residual:** the widget snapshot in AsyncStorage (`RKStorage`) is plaintext. It holds the next renewal's name and amount and the monthly total. It is app-private (root was needed to read it) and is not backed up (F92). Whether to write it at all before a widget ships is F161. |
| **MASVS-STORAGE-2** The app prevents leakage of sensitive data. | **Met** | Android Auto Backup is off: `allowBackup=false` in the built manifest (P3.1, F92; `aapt2 dump xmltree` in P3.9). `console.log`, `info`, `debug` and `trace` are stripped from the release bundle (P3.2: counted 0 / 0 / 0 / 0). Sentry gets scrubbed events, `sendDefaultPii` is false and asserted, and it is inert without a DSN (P3.3). The switcher thumbnail shows the lock, which engages on the way out (`_layout.tsx`, P3.4). The lock and PIN screens can't be captured: on the device today every lock screenshot was 0 % non-black below the status bar (P3.7). The locked app is hidden from accessibility services: today's locked tree held only the lock (F105). No secret is in the bundle (P3.6, P3.9: gitleaks over the files and over the strings of every binary). |

## CRYPTO

| Control | Status | Evidence |
|---|---|---|
| **MASVS-CRYPTO-1** The app employs current strong cryptography and uses it according to industry best practices. | **Met** | PIN: PBKDF2-HMAC-SHA256, 600,000 iterations, a 16-byte random salt per PIN, a 32-byte key, native `react-native-quick-crypto`, compared with `timingSafeEqual`. Older hashes are upgraded on use (P3.4). Data at rest: SQLCipher. Randomness: `expo-crypto`. No home-made cryptography. |
| **MASVS-CRYPTO-2** The app performs key management according to industry best practices. | **Partial** | Keys are made on the device and held in the platform keystore, device-bound (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`), never backed up. **Gap:** there is no key rotation for the database key. It is listed as deferred in `docs/SECURITY_ARCHITECTURE.md` ("Add key rotation…"). |

## AUTH

| Control | Status | Evidence |
|---|---|---|
| **MASVS-AUTH-1** The app uses secure authentication and authorization protocols and follows the relevant best practices. | **Met** | The server side is P2 (real Postgres, an authorization matrix, fuzzing; gate passed). Sign-in links work only for the phone that asked: no request, an expired one, or an email claim that doesn't match means no session (F100, P3.5). A sign-in during launch is no longer undone by a stale keychain read (F154). The session lives in SecureStore. On the device today, all sign-in methods stay disabled until the 16+ consent is checked. |
| **MASVS-AUTH-2** The app performs local authentication securely according to the platform best practices. | **Met** (Android, PIN path) | **On the device today:** the lock engaged on return from the background. Wrong PINs counted down from "9 attempts left". The 10th gave "Too many attempts. Try again in 15 minutes." The lockout survived a force-stop and restart, and the correct PIN was refused during it ("Try again later"). The correct PIN unlocked before the lockout. **Not verified:** biometrics on a device (the emulator has none enrolled). **Open:** someone holding the unlocked phone who moves its clock past the lockout (F14, the owner's). |
| **MASVS-AUTH-3** The app secures sensitive operations with additional authentication. | **Partial** | Turning the app lock off asks for the PIN, inside the attempt limit (F98). **Gap:** no other operation asks for the PIN. Erasing the device's data or cancelling the account asks for a confirmation (`Alert`, `app/settings.tsx`); "Export my data" opens the share sheet directly. (While the app lock is on, all of them sit behind it.) Whether they should is a product call, not filed as a defect. |

## NETWORK

| Control | Status | Evidence |
|---|---|---|
| **MASVS-NETWORK-1** The app secures all network traffic according to the current best practices. | **Met** | The built release manifest has `usesCleartextTraffic=false` (P3.1, P3.9). Every store-bound EAS profile sets an https API, enforced by `app.config.test.ts` ("every store-bound EAS profile sets an https API…"). The system trust store is used, with no user-CA opt-in. |
| **MASVS-NETWORK-2** The app performs identity pinning for all remote endpoints under the developer's control. | **Not met** (decision) | There is no certificate pinning. It is listed as deferred in `docs/SECURITY_ARCHITECTURE.md` ("Add certificate pinning after native networking layer is finalized"). The owner decides, with the API host's certificate-rotation plan. |

## PLATFORM

| Control | Status | Evidence |
|---|---|---|
| **MASVS-PLATFORM-1** The app uses IPC mechanisms securely. | **Met** | Exported components in the built APK (P3.9), each with a reason: `MainActivity` (the launcher, `zeno://`), plus receivers guarded by `c2dm…SEND`, Amazon IAP's `NOTIFY` and `DUMP`. Every provider has `exported=false`. Every `zeno://` route validates its parameters, and outbound links are `https:`/`mailto:` on an allowlist (P3.5). The one link handler is the sign-in link (F100). |
| **MASVS-PLATFORM-2** The app uses WebViews securely. | **N/A** | There is no WebView dependency (`apps/mobile/package.json` has no `react-native-webview`, and no screen renders one). Google OAuth and cancellation pages open in the system browser (`expo-web-browser`, `Linking`). |
| **MASVS-PLATFORM-3** The app uses the user interface securely. | **Met** (after F159) | **F159, found and fixed today:** a menu, editor or alert left open when the app locked stayed above the lock and kept working (Pause ran on a locked app). Now every modal goes through `AppModal`, which hides while locked (an eslint rule forbids a raw `Modal`), and the lock itself is the topmost window. **Re-run on the device:** the locked tree held only the lock. A tap where Pause was did nothing. A Delete alert left open sat under the lock and was still there after unlocking. The lock screens can't be captured (STORAGE-2). App-wide `FLAG_SECURE` is the owner's call (P3.7). **Not verified:** iOS's action sheet (`ActionSheetIOS`) over the lock. |

## CODE

| Control | Status | Evidence |
|---|---|---|
| **MASVS-CODE-1** The app requires an up-to-date platform version. | **Partial** (decision) | `targetSdkVersion` 36 (current); `minSdkVersion` 24, Android 7.0 (`aapt2 dump badging`, P3.9). That minimum is Expo's default, and it admits devices that no longer get security updates. Raising it is the owner's call (it costs reach). |
| **MASVS-CODE-2** The app has a mechanism for enforcing app updates. | **Not met** (decision) | `expo.modules.updates.ENABLED=false` in the built manifest, and the API has no minimum-version check. Options are a store in-app update prompt or a server-side minimum version. The owner decides. |
| **MASVS-CODE-3** The app only uses software components without known vulnerabilities. | **Met** (with listed exceptions) | CI's blocking audit gate (`scripts/audit-gate.mjs`, in `ci.yml` and `release.yml`) fails on any high or critical advisory not in `.audit-allowlist.json`. Every entry there has a reason and an expiry. Today it holds 3, all build or developer tools, none in the app bundle: `image-size` × 2 (Metro, build time) and `node-forge` (Expo's CLI; no patched release; expires 2026-11-30). The gate passed on `6d8a9cb`. |
| **MASVS-CODE-4** The app validates and sanitizes all untrusted inputs. | **Met** | Deep-link parameters (P3.5). Amounts go through `isAmountText` (F122). PINs are digits only, 4 to 8 (P3.4). CSV import uses shared `csv/parse-utils` (P1 logic at 100 %). The sign-in link token is checked against the stored request and the JWT email claim (F100). The server validates its own inputs (P2, fuzzed). |

## RESILIENCE

| Control | Status | Evidence |
|---|---|---|
| **MASVS-RESILIENCE-1** The app validates the integrity of the platform. | **Not met** (decision) | No root or jailbreak detection. |
| **MASVS-RESILIENCE-2** The app implements anti-tampering mechanisms. | **Not met** (decision) | No signature or integrity checks at run time (no Play Integrity call). |
| **MASVS-RESILIENCE-3** The app implements anti-static analysis mechanisms. | **Partial** | R8 shrinks and obfuscates the release build (P3.1: obfuscated class names in the dex), and the JS ships as Hermes bytecode (P3.9). Nothing beyond that. |
| **MASVS-RESILIENCE-4** The app implements anti-dynamic analysis techniques. | **Not met** (decision) | Not debuggable in release (P3.9). No debugger, hooking or emulator detection. |

The RESILIENCE controls are for apps whose threat model includes the user's own device
(MASVS's resilience profile). The four together are one owner decision. Zeno keeps the
user's own data on their own phone, so the case for them is weaker than for a banking
app.

## PRIVACY

| Control | Status | Evidence |
|---|---|---|
| **MASVS-PRIVACY-1** The app minimizes access to sensitive data and resources. | **Partial** | Unused template permissions removed (F155). No bank login (the onboarding copy, seen on the device). Discover scans only when tapped ("Zeno scans only when you tap scan", seen on the device). **Open:** the two photo-read permissions from `expo-screen-capture` (F104, the owner's), and the plaintext widget snapshot written before any widget ships (F161). |
| **MASVS-PRIVACY-2** The app prevents identification of the user. | **Partial** | Local-only mode needs no account. RevenueCat then uses its own anonymous id (the root layout's tests). Sentry sends no default PII and an inferred IP of `never` (P3.3). **Open:** `installreferrer` 2.2 is in the APK (P3.9). Which code reads it is not established, so it is not claimed either way. |
| **MASVS-PRIVACY-3** The app is transparent about data collection and usage. | **Partial** | The 16+ consent with Terms and Privacy links (seen on the device; each reachable by TalkBack). AI Coach data sharing is behind its own consent switch (`coachAiConsent`). **Open:** the store data-safety forms are not written yet (the owner, at submission). The store listing's privacy wording goes to the marketing session's rails. |
| **MASVS-PRIVACY-4** The app offers user control over their data. | **Met** | "Export my data" (CSV of subscriptions and notes). Erase this device, or cancel the account (F27; the export's scope is F127, the owner's). Reminders switch (F124). AI Coach consent switch. |

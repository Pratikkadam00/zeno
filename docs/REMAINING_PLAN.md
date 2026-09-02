# Zeno — what's left (2026-08-25)

Development is **complete**. Every screen is ported, the legacy kit is retired,
security is patched. What remains is verification, owner actions, and deploy.

Gates as of HEAD: repo typecheck 0 errors · repo lint 0 problems ·
vitest 517/517 (55 files) · RN component tests 22/22 · web build 532 pages.

---

## A. SHIP BLOCKERS — nothing can launch until these are done

### A1. Domain (OWNER — blocks store review)
`zeno.app` appears in **19 files**, including the Terms and Privacy Policy links
and the feedback address. The domain is parked/for-sale, i.e. not owned.
Apple and Google both **require a reachable privacy-policy URL**, so the app
fails review as-is; worse, whoever buys the domain controls what your users see.

Work once the domain exists (small, mechanical):
1. Add one `SITE_URL` constant per app (there is none today).
2. Replace the 19 hardcoded references.
3. Re-run gates; update `apps/web` sitemap/robots/SEO metadata.

### A3. Service keys (OWNER — also blocks release builds)
RevenueCat products + "pro" entitlement, Resend domain verification, Google
OAuth client IDs, Sentry DSN. Supply via EAS/Render env, never the repo.

**Note this also fixes a build failure**: `./gradlew assembleRelease` currently
dies at `createBundleReleaseJsAndAssets_SentryUpload` because Sentry has no
org/project/auth token. Until A3 lands, release builds need
`SENTRY_DISABLE_AUTO_UPLOAD=true`.

### A7. US export self-classification (OWNER — legal, before shipping)
The app declares `usesNonExemptEncryption: true` (SQLCipher). File the annual
BIS/NSA self-classification under the mass-market exemption (ECCN 5D992.c), and
add Apple's `ITSEncryptionExportComplianceCode` to app.config.ts when issued.

---

## B. VERIFICATION — the largest untested surface

**~17 of ~20 screens have never been run.** Only onboarding beats 1-3 have been
seen. Everything else is verified structurally (types, lint, 539 tests, DS
fidelity) — which does NOT catch this class of bug. Two real examples already
found by looking rather than testing: the wrong app icon shipped, and a cancel
celebration that was invisible because the screen navigated away instantly.
Both passed every test.

### B1. Device / emulator walkthrough
Per screen: correct ledger rendering, dark mode, reduced motion, a11y labels,
and that each flow completes. See "Device-testing rules" below before starting.

### B2. Remaining M7 items
- Coverage ratchet (P5.5) — set a CI floor now that suites are stable.
- Adversarial review of the M3-M6 diff.
- MASVS spot re-check (`/security-review` on the track diff).
- Store screenshots from `Zeno Design System/app_store/`.
- EAS preview build — ONLY after the owner confirms quota.

---

## C. DEPLOY (blocked on A1/A3)

- **A10** website deploy target (Render vs Vercel). Web is deploy-ready today.
- **A5** Render: attach Postgres, set `DATABASE_URL`, redeploy `main`
  (the live build is behind and in-memory).
- **A6** store assets: screenshots, privacy questionnaire, Play data-safety form.

---

## D. DEFERRED (explicitly not now)

- **Phase 6 — sync done right** (~3 days): client-side encryption before upload,
  real vector-clock comparison, idempotent push, conflict tests. Sync is
  server-complete but dead code and is not advertised. Do NOT re-enable it
  without P6.1 encryption.
- **4 remaining npm advisories**: `image-size` DoS reachable only through Metro
  (build-time). Fix is semver-major and breaks the Expo 56 pin. Revisit when
  Expo bumps Metro.
- **Plaid**: code retained, untested, stays in dev.

---

## Device-testing rules (written after wasting hours getting this wrong)

The failure mode: unbounded `until` loops and background tasks waiting on adb
commands that had wedged, retried instead of aborted. Rules now:

1. **Never** poll a device in an unbounded loop, and never background an adb
   command. Every adb call runs in the foreground with an explicit timeout.
2. **One hang = stop.** If a screencap or adb call exceeds its timeout ONCE,
   abandon the device path immediately and report. Do not retry, do not wait.
3. **Two attempts per screen, maximum.** Then move on and record it unverified.
4. **Announce a budget before starting** (e.g. "20 minutes, 6 screens") and stop
   at it whether or not it's finished.
5. **Check liveness first**: `adb shell echo ping` must return before anything
   else. If the app is in `D` state (uninterruptible I/O), stop — that emulator
   is saturated and will not recover while the app runs.
6. **Leave nothing running.** Kill the emulator and any Metro process at the end.

### Known-good sequence (verified working)
```
adb.exe = C:\Users\Pratik\AppData\Local\Android\Sdk\platform-tools\adb.exe
emulator.exe -avd SubRadar_API_36 -no-snapshot-save -no-boot-anim
adb shell svc power stayon true          # avoid dimmed screenshots
npx expo start --dev-client --clear      # WAIT for "Android Bundled" in the log
adb reverse tcp:8081 tcp:8081
adb shell monkey -p app.zeno.mobile -c android.intent.category.LAUNCHER 1
adb shell screencap -p /sdcard/x.png && adb pull /sdcard/x.png   # never exec-out via PowerShell (BOM corrupts it)
adb shell dumpsys window | grep mCurrentFocus   # confirm the app is foreground before tapping
```

### Honest capability assessment
This machine's emulator is marginal for this app: the **debug** build saturates
its disk (41% iowait, app in `D` state, screencap hangs), while the **release**
build idles at 0% but produces a 167MB universal APK that stalls `adb install`.
The untried fix is a single-ABI build:
`./gradlew assembleRelease -PreactNativeArchitectures=x86_64` (~40MB).

Three ways to get the screens verified, in order of reliability:
1. **Owner runs the app, sends screenshots** — most reliable, zero risk of the
   loop above. I review against the DS and fix what's wrong.
2. **I drive it under the rules above**, single-ABI release build, strict budget.
3. **Defer to a faster machine / physical device.**

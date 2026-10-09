# U6 · UI security on the device

**Date:** 2026-10-09 · **Device:** emulator-5554 (AVD SubRadar_API_36, Android 16, API 36,
`userdebug` image, 1080×2400) · **Builds:** the release APK of 2026-10-03 for the "before"
measurements, then two single-ABI release builds made today with the fixes (13:25 and
13:37). Every tap was found in the accessibility tree, never guessed; every adb call had a
timeout. Captures are in this session's scratchpad (`dev/01-launch.png` … `41-…png`); the
rows below quote what the tree and `dumpsys` said.

**Four findings, three fixed today, one for the owner:**

| # | Finding | State |
|---|---|---|
| F229 | A renewal reminder names the service and the amount, and a locked phone shows it in full under Android's default lock-screen setting | owner decision D22 (register R34) |
| F230 | The app minted an Expo push token nothing used (handing Expo the phone's FCM registration), and skipped emulators so they never got the notification permission prompt | fixed, proven on the device |
| F231 | `MainActivity` had the default `taskAffinity`, so another app's activity could sit on Zeno's task | fixed, proven in the packaged APK |
| F232 | The biometric prompt accepted the phone's screen-lock credential as its fallback ("Use PIN"), so anyone who knew the phone's PIN opened Zeno without Zeno's PIN and around the app's lockout | fixed, proven on the device |

---

## U6.1 · Reminder on a locked screen (F229)

Setup: one subscription (Netflix, $15.49, renewing in 7 days), the device locked with a
PIN, the scheduled alarm fired by moving the clock (`cmd alarm set-time`). On the
2026-10-03 build the reminder posted on Expo's fallback channel; on today's build on the
app's own channel `zeno-renewals`. The lock screen looked the same on both:

- **Android's default** ("show sensitive content"): the lock screen shows
  "⚠️ Netflix renews in 3 days — $15.49 · Tap to cancel now" in full
  (`10-secure-lock-default.png`, `18-after-lock-default.png`).
- **"Hide sensitive content"** (the user's setting, `lock_screen_allow_private_notifications 0`):
  the lock screen shows "Zeno • in 4d" and nothing else (`11-…hidden.png`, `19-…hidden.png`).

So the OS already treats the reminder as private (every record showed `vis=PRIVATE`, the
platform default for a notification) and the **user's** lock-screen setting decides whether
the text is redacted. The app's only stronger options are to post the reminder as SECRET
(not shown on the lock screen at all) or to keep the name and amount out of the text, and
either costs the reminder most of its use. That is a product choice: **D22 for the owner**
(register R34). The code now also asks for `lockscreenVisibility: PRIVATE` on the channel;
Android 16 discarded that at creation (`dumpsys` read `mLockscreenVisibility=-1000` after
the call), so it changes nothing here and is kept only because it is harmless.
**Verdict: owner (D22), exposure measured.**

## U6.2 · Channel visibility (`dumpsys notification`)

Before the fix the emulator had **no** Zeno channel: `registerForPushNotifications` returned
"unsupported" on `!Device.isDevice` before creating one, and the reminder went to
`expo_notifications_fallback_notification_channel`; the emulator was also never asked for
POST_NOTIFICATIONS (granted by hand with `pm grant` for the "before" run). After the fix
(F230): `zeno-renewals`, importance 4 (HIGH), the reminders post on it (`channel=zeno-renewals
vis=PRIVATE` ×3), and the permission dialog "Allow Zeno to send you notifications?" appeared
on the emulator for the first time (`34-emulator-permission-prompt.png`). **Verdict: pass.**

## U6.3 / U6.4 · Tapjacking over the PIN, paywall and sign-in

Not tried with an overlay test app (none was built). The facts: the app sets no
`filterTouchesWhenObscured` anywhere; Android 12 and later block touches that pass through
an untrusted overlay by default, and this device runs that default
(`settings get global block_untrusted_touches` → unset, platform default "block"). Phones
on Android 7 to 11 (minSdk 24) do not have that protection. Low for this app; added to the
MASVS acceptance row R20. **Verdict: closed by the platform on Android 12+; residual below
noted in R20.**

## U6.5 · Task hijacking (F231)

The prebuild template sets `launchMode="singleTask"` but leaves `taskAffinity` at its
default (the package name), so another app's activity declaring the same affinity could
join Zeno's task. Fix: `apps/mobile/plugins/withTaskAffinity.js` sets
`android:taskAffinity=""` on `.MainActivity` at every prebuild; `app.config.test.ts` pins the
plugin and its effect. Proof in the packaged APK:
`aapt2 dump xmltree` → `android:taskAffinity=""`, `launchMode=2` (singleTask) on
`app.zeno.mobile.MainActivity`. Not tried with a hijacking test app. **Verdict: fixed.**

## U6.6 / U6.7 · Keyboard learning and autofill

- **PIN** (`LockOverlay.tsx`, `security.tsx`): `secureTextEntry`, `keyboardType="number-pad"`,
  `importantForAutofill="no"`, `autoComplete="off"`, `textContentType="oneTimeCode"`,
  `autoCorrect={false}`, `contextMenuHidden`. Nothing for a keyboard to learn or an autofill
  service to offer.
- **Email** (`login.tsx`): `autoCorrect={false}`, `autoCapitalize="none"`,
  `autoComplete="email"` (autofill of one's own address is wanted).
- **Amounts**: numeric keyboards (`decimal-pad`, `number-pad`), which keep no dictionary.
- **Notes**: free text with the normal keyboard, learnable by design (they are the user's
  own words on their own phone). Noted, not changed.
**Verdict: pass.**

## U6.8 · Clipboard

No code path writes the clipboard: the Clipboard API is not imported anywhere in the app;
the household share code is displayed (`CodeBoxes`) with no copy action; the export goes
to the share sheet (U6.21). **Verdict: pass (static).**

## U6.9 · logcat over every flow (release build)

Two captures: 14,243 lines over the deep-link battery, export and sign-in screens, and
2,662 lines over a fresh install with an email typed on the sign-in screen
(`33-login-typed.png` shows it in the field). Hits for the typed address
(`pratik.probe@example.invalid`): 0. For "Netflix", "15.49", the PIN, "Bearer",
"ExponentPushToken", "access_token", "refreshToken": 0 each (the only "15.49" and "0000"
matches were timestamps and flag values in system lines). **Verdict: pass.**

## U6.10 · Deep links with hostile parameters

All 24 routes opened by `am start -d zeno://<route>`, then 12 hostile values on the two
parameterised routes and elsewhere: `../../etc/passwd`, `%2e%2e%2f…`,
`<script>alert(1)</script>`, `' OR 1=1 --`, a 2,000-character id, `%00%ff`, an unknown
route, `add?name=<b>x</b>&amount=1e309`, `?x=%`, `settings#../`. Every start returned
`Status: ok`, focus stayed on `MainActivity`, and logcat held no `FATAL`, `AndroidRuntime`
or JS error. The five routes the navigation never reaches (`open-banking`, `backend`,
`business`, `public-api`, `partners`) show "This screen isn't part of this version of
Zeno." or a "coming soon" page (`13-route-*.png`). **Verdict: pass.**

## U6.11 · Release build: no developer menu, no stack trace

The menu key (`keyevent 82`) in the release build: nothing (`16-menu-key.png`). The root
error boundary (`AppErrorBoundary.tsx`) renders "Something went wrong … Try again" and no
error text. `dumpsys package` flags: `HAS_CODE ALLOW_CLEAR_USER_DATA` only, no
`DEBUGGABLE`. A forced error was not injected (no hook exists in release). **Verdict: pass.**

## U6.12–U6.16 · The P3 baselines re-run on today's build

- **U6.12 recents:** the Zeno card in the recents view is solid black (`15-recents.png`).
- **U6.13 capture:** the app window carries `SECURE` (`dumpsys window`: `fl=… SECURE …`);
  a screencap of the lock overlay is 0.00 % non-black (PIL over 2,592,000 pixels).
- **U6.14 accessibility while locked:** the compressed tree holds "Zeno is locked", "Enter
  your PIN to continue.", the PIN field and "Sign out" — nothing of the ledger.
- **U6.15 rooted read:** with `adb root` the data directory was pulled. `zeno.db` and its WAL
  begin with random bytes and contain none of "Netflix", "15.49", the PIN or the category;
  nor do the four `shared_prefs` files, the HTTP cache (one entry: the exchange-rate call to
  `open.er-api.com`) or the asset cache. The one plaintext copy is the widget snapshot in
  AsyncStorage (`RKStorage`, key `zeno.widget.snapshot.v1`: the next renewal's name and
  amount), which is the known F161 / R18, re-confirmed today.
- **U6.16 backup:** `allowBackup="false"` in the packaged manifest; `ALLOW_BACKUP` absent from
  the package flags.
**Verdict: pass (R18 unchanged).**

## U6.17 / U6.18 · Gmail

The device part needs a Google sign-in, which R9 blocks on Android (custom-scheme
redirect). From the code: the OAuth request asks for exactly one scope,
`https://www.googleapis.com/auth/gmail.readonly` (`emailScanner.ts:60`); disconnecting
calls Google's revoke endpoint and forgets the local token even when the revoke fails
(`:408–445`). The token lives in SecureStore (`sensitive`, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`,
`secure-store.ts:118`); the crash scrubber strips `Bearer …` and `token=`/`access_token=`
query values (`redact.ts`); the CSV export carries no token; a scan lists only billing
messages (`listBillingMessageRefs`) and parses them on the phone. **Verdict: static pass;
device part re-opens with R9.**

## U6.19 / U6.20 · Biometrics (F232)

A fingerprint was enrolled on the emulator (`BIOMETRIC_ENROLL`, `emu finger touch 1`).
On a cold start with Zeno's PIN set, the system prompt "Unlock Zeno" appears
(`27-bio-prompt.png`). A wrong finger (`emu finger touch 2`, not enrolled) leaves the app
locked (`28-bio-wrong.png`); the enrolled finger opens the ledger (`29-bio-right.png`).
With the fingerprint and device PIN removed (`locksettings clear`), a cold start shows only
Zeno's PIN overlay, no prompt, and the PIN opens it (`32-no-biometrics.png`).

**F232**: the prompt's fallback button was the phone's screen-lock credential
(`disableDeviceFallback: false`, labelled "Use PIN"): ten entries typed there went into the
system's device-PIN dialog, not Zeno's. Fixed: `disableDeviceFallback: true`,
`cancelLabel: "Use Zeno PIN"`, pinned in `app-lock.test.ts`; on the fixed build the button
reads "Use Zeno PIN" and leads to Zeno's own overlay (`35-prompt-zeno-pin-label.png`).

**U6.20**: `lock-store.ts:108` refuses biometrics during a lockout before prompting;
`lock-store.test.ts:221` ("biometrics: refused during a lockout without prompting; success
unlocks; failure keeps the lock") proves it. On the device the input automation registered
three wrong PINs, not ten ("Incorrect PIN. 7 attempts left."), so the tenth-PIN lockout was
not reached by hand; moving the clock past a lockout window brought the prompt back and the
enrolled finger opened the app. **Verdict: U6.19 fixed and proven; U6.20 closed by the unit
test, device run partial (stated).**

## U6.21 · Exported CSV

"Export my data" builds the CSV in memory and hands it to the share sheet as **text**
("Sharing text", `17-export-share.png`); no file is written: the app's cache held only
fonts, the HTTP cache and compiled code before and after. Contents: name, amount,
currency, cycle, next renewal, status, category, notes — the notes are personal data and
are in by decision (F127). Who can read it is whoever the user shares it with.
**Verdict: pass.**

## U6.22 · Purchases

Needs a Play licensed test account (owner). **Verdict: owner.**

## U6.23 · Push token (F230)

Every reminder is a local notification (`scheduleNotificationAsync`); no server sends
anything. Yet `registerForPushNotifications` called `getExpoPushTokenAsync` and kept the
result in SecureStore — a network call that hands Expo's push service the phone's FCM
registration, for a token nothing read (no caller, and the API has no field for it). Fixed:
`prepareReminderNotifications` creates the channel and asks for the permission, nothing
else; the `isDevice` gate (there for the token) is gone, so emulators are prepared too
(U6.2). `clearStoredPushToken` stays so an erase removes the token older builds saved.
THREAT_MODEL.md and STORE_DATA_SAFETY.md updated. **Verdict: fixed.**

## U6.24 · Privacy promises on screen, traced to the code

| On screen | Where | What makes it true |
|---|---|---|
| "No bank login required." / "never see your bank login" | index, dashboard, paywall, profile | No Plaid in the release build: `open-banking` shows "not part of this version" (U6.10); the API's Plaid adapter is development-only (R6). Stays true until Plaid ships (F45). |
| "Zeno scans only when you tap scan." | discover | No background task of any kind (`BackgroundFetch`, `TaskManager`: none); a scan runs from the tap. |
| "Scanned on your device — nothing leaves your phone" (Gmail card) | discover | Requests go from the phone to Google's Gmail API with the user's token; parsing is on the phone; nothing goes to Zeno's API. The wording is the known F114 (R10, owner D4). |
| "On-device by default … Nothing is sent anywhere." | coach | The built-in insights are computed on the phone; the AI coach runs only after "Enable AI coaching" (consent, `coach.tsx`) and then posts to `/coach` (`client.ts:143`). The sentence sits in the on-device section. |
| "stays on your device" | index, profile | SQLCipher database (U6.15); sync routes unused (THREAT_MODEL §1). |

**Verdict: pass; F114 and F45 remain the owner's wording items (R10).**

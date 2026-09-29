# On-device test findings — 2026-09-29 (emulator-5554, RELEASE build)

**The emulator blocker is solved.** A single-ABI release APK
(`-PreactNativeArchitectures=x86_64`, 71MB vs the 167MB universal) installs in
**8 seconds** and runs with **0% iowait / 289% idle**. Every previous attempt
failed because the debug build saturated the virtual disk and the universal APK
stalled `adb install`. Screens are now trivially testable.

Build command:
```
cd apps/mobile/android
SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew assembleRelease -x lint -PreactNativeArchitectures=x86_64
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Screens seen (6)
Onboarding beats 1–3 · Dashboard · Subscriptions · Calendar · Insights ·
Subscription detail.

## ✅ Confirmed correct
- **Dashboard**: dated caps-mono masthead, `$107.46` adding-machine figure,
  category rule bar, LedgerLines with dotted leaders, ink FAB, ruled tab bar.
- **Subscriptions**: filters render as TEXT TICKS with an accent underline (no
  pill chips) and `SERVICE / AMOUNT · NEXT` column heads — the slop audit's
  central demand, confirmed on device.
- **Detail**: AmountDisplay whole/cents split, the three LedgerLines, CHARGE
  HISTORY column heads, and the honest "ESTIMATED FROM YOUR BILLING CYCLE" note.
- **Calendar**: the summary block (This month / Next 7 days / Projected year).
- **Insights**: "WHERE IT GOES" as ledger lines with colour ticks + inline bars.

## ❌ THE REAL FINDING: the ports are PARTIAL

Every screen I ported has the signature section correct and the SURROUNDING
CHROME still in the old visual language. Structural verification could never
catch this — the code compiles, lints and passes 539 tests either way.

Specifically, still un-ported:

1. **Pill chips survive in three places** — the exact pattern the slop audit
   bans. Detail screen: `entertainment` and `Dark pattern` render as rounded
   pills. Calendar: the "This week" list shows `1 day` / `2 days` / `5 days` as
   rounded pink/amber pills. These must become text ticks.
2. **Floating rounded cards with shadows** instead of paper + hairline rule:
   Calendar's month grid and upcoming list; Insights' Budget row, MONTHLY SPEND
   chart and insight card; Detail's "Renews in 1 day" alert and notification rows.
3. **Solid danger buttons**: Detail's "Cancel Subscription" is a filled red
   pill; the kit's `danger` variant is OUTLINED. The small "Cancel" inside the
   alert card is likewise a solid red pill.
4. **Tinted icon tiles** (soft-coloured rounded squares behind icons) on the
   Insights Budget row, the Detail alert, and the notification row — the ledger
   language uses a pen-weight mark on paper, not a tinted tile.
5. **MONTHLY SPEND chart** still uses rounded-rect bars in a card; the ledger
   treatment is typographic/ruled.
6. **Possible bug — empty icon box**: the Insights "Monthly overview" card
   renders an EMPTY grey rounded square where its icon should be. Needs
   investigation; it may be a missing/failed icon reference rather than styling.

## What this means
M3/M4/M5/M6 were reported complete on structural grounds. They are complete in
STRUCTURE and incomplete in FINISH. The remaining work is a consistent,
mechanical pass over the un-ported chrome listed above, screen by screen, then
re-verify on device using the now-working release-APK loop.

---

# Second pass — 2026-09-29, full drive (27 of 27 screens, 4 flows, dark mode)

**Every screen has now been seen on device**, plus four flows end to end:
Add (search → prefill → save → dashboard arithmetic exact: 107.46 → 117.46,
cap 5 → 6/10), Settings → LedgerSheet (TearEdge, current value checked,
currency-honesty footnote), Cancel (guide → external page → mark → **Stamp** →
Done → dashboard), Login (16+ gate disables all three methods until checked).
Dark mode verified across dashboard, settings, coach, cancel, detail, add.

## Bugs found and fixed this pass (all verified on the rebuilt APK)
1. **Cancel Stamp never rendered — TWO independent causes.** (a) setCancelSuccess
   sat behind `await cancelNotificationsForSubscription()`, which stalls when
   POST_NOTIFICATIONS was never granted; the `void` swallowed it. (b) The
   success card lives inside `showConfirm ? … : null`, and the direct
   "mark as cancelled" path never set showConfirm — state written into an
   unmounted branch. Proven by three taps that persisted pending-verification
   (Netflix, Adobe, Midjourney) without rendering, then a fourth (Disney) that
   rendered after both fixes. Neither fix alone was sufficient.
2. **Every primary button ~1.3:1 in dark mode.** darkScheme.inkPanel #171B2A on
   the #0A0C13 desk. New buttonPrimaryBg/Pressed/Text tokens invert in dark
   (paper on desk). Kit Button + four hand-painted primaries swept. Then the
   Discover icon vanished (paper-on-paper) — fixed to follow the text token.
3. **Add screen footer let the form paint over the button.** zIndex/elevation
   did NOT fix it (verified); footer is now a flex sibling, not an overlay.
4. **Green primaries → ink**: Security, Add Subscription, Send sign-in link
   (brand tile + checked checkbox deliberately stay accent).
5. **Profile banner** "…or your data" — false once AI coaching is on; removed.
   A fixed-string sweep could not catch it (words split by "bank login or").
6. **Header padding regressions** (my `<Screen>` removal) in wrapped, family,
   backend, open-banking; widgets was a wholesale rewrite and already padded.
7. **Insights "Monthly overview" icon invisible** — spend_summary's accent
   equalled its tile background.

## Findings logged, not changed
- "Charged so far" sums active subs including ones not yet charged this month
  (pre-existing semantic; label implies a charge occurred). Check against spec.
- Midjourney's "Open cancellation page" renders disabled (grey) — catalog entry
  likely lacks a cancel URL. Adobe/Disney/Netflix have one.
- The post-visit "Did you cancel it?" state does not survive a re-mount.
- "Yes, I cancelled" is green: defensible (money-positive act); confirm vs DS.
- FAB "+" is the Discover tab's button by design (DiscoverTabButton). A plus
  that doesn't add is a UX question for the DS TabBar spec, not a defect.
- Still in the full-rewrite bucket (old chrome, no defects): Settings, Discover
  hub, Add form (pill quick-picks, segmented billing), Login, Cancel guide
  (circled steps, tinted cards), tinted icon tiles on Insights/Profile/Notifs.

## Method notes that held
Capture BEFORE every tap; size-guard taps against the last verified capture
(guard reads the file length directly — an earlier guard returned an array and
`$null -lt 0.01` is TRUE in PowerShell, so it "passed" while broken); deep-link
between screens, never BACK from a root tab; re-verify every fix on a rebuilt
APK — two "fixes" this pass did not work until re-tested.

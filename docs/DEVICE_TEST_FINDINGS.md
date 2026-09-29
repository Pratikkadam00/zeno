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

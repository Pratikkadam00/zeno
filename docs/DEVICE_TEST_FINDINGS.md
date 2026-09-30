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
- ~~"Charged so far" sums subs not yet charged~~ **CORRECTED (fourth pass):** it
  is right — it sums subs whose charge already landed this calendar month
  (Adobe Sep 1, Midjourney Sep 4 …), and "Still to renew" is the rest of the
  month. 91.97 + 15.49 = 107.46 checks. My earlier note was wrong.
- **Real inconsistency instead:** the "Still to renew" line mixes windows — its
  sub-label `N THIS WEEK` counts the next 7 days, its value is the rest of the
  calendar month. Seen as `2 THIS WEEK · $0.00` once Netflix went pending.
  Needs a product call on which window the line means.
- ~~Midjourney's "Open cancellation page" renders disabled — likely lacks a
  cancel URL~~ **CORRECTED (fifth pass): the "likely" was wrong.** Midjourney's
  catalog row carries `https://www.midjourney.com/account`; `parseRequestedRows`
  skips any row without a URL and `parseExpansionRows` synthesizes one, so no
  service can lack one; and the button has no URL-dependent disabled state
  (`ctaButton` is a plain `theme.text` fill). The grey frame was transient and
  is not reproducible from code. Lesson kept: "likely" does not belong in this
  file.
- The post-visit "Did you cancel it?" state does not survive a re-mount.
- "Yes, I cancelled" is green: defensible (money-positive act); confirm vs DS.
- FAB "+" is the Discover tab's button by design (DiscoverTabButton). A plus
  that doesn't add is a UX question for the DS TabBar spec, not a defect.
- ~~Still in the full-rewrite bucket~~ **DONE 2026-09-29 (third pass):** Settings,
  Discover hub, Add form, Login, Cancel guide, and the tinted icon tiles on
  Insights / Profile / Notifications are all ported and verified on device.
  See the third-pass section below.

## Method notes that held
Capture BEFORE every tap; size-guard taps against the last verified capture
(guard reads the file length directly — an earlier guard returned an array and
`$null -lt 0.01` is TRUE in PowerShell, so it "passed" while broken); deep-link
between screens, never BACK from a root tab; re-verify every fix on a rebuilt
APK — two "fixes" this pass did not work until re-tested.

---

# Third pass — 2026-09-29, the rewrite bucket (7 commits, each verified on device)

Every screen the second pass flagged as "old chrome, no defects" is now in the
ledger language. Method per screen: read the DS mockup's SLOP AUDIT, port
structure + copy, preserve every handler and a11y label, replace styles by key
with a single-match / balanced-brace assertion, gate, rebuild, verify on device.

| Screen | Slop-audit move | Verified |
|---|---|---|
| Settings | icon-tile rows → ink glyph rows; privacy as pull-quote; SectionHeads | light + dark |
| Add form | pill quick-picks → text ticks; long card → sections on paper; rule-framed stepper | dark |
| Discover hub | cards → ruled rows; tinted tiles → rule squares; "MOST COMPLETE" → "RECOMMENDED"; honest intro line | dark |
| Cancel guide | tinted difficulty card → ink block; circled steps → mono 01/02 on ruled rows; savings as ledger line | dark |
| Login | consent gate moved to TOP ("sign the line"); rule-framed input; outlined providers; alert-bar errors | light |
| Notifications / Profile / Insights | last tinted icon tiles → rule squares with ink glyphs; Profile banner → pull-quote | light |

## Mistakes caught by re-verifying on device (all fixed before the next commit)
- Add: I rule-framed `renewBlock` (the section column) instead of
  `renewStepperRow` (the date box) — inferred from a style NAME, not the markup.
  Label wrapped, stepper pushed off-screen. Fixed by reading the JSX.
- Cancel guide: the tier tint was applied INLINE per tier, overriding the style
  I replaced; and `stepCircleUpcoming` never matched my key grep because those
  keys are column-aligned (`key:    {`). The style helper now matches `:\s*{`.
- Login: an assertion stopped me painting Apple's button black — the brand
  constant is `#FFFFFF`. Apple's HIG allows white-with-outline; that is what
  shipped. Google is outlined (permitted).

## Deliberately NOT done (need product/logic decisions, not style)
- Cancel guide: the DS's three difficulty tick bars, and its primary/secondary
  role swap ("I cancelled it" primary, "Open …'s page" secondary).
- Login: the DS's "Or keep it on this phone" local-only path — a new entry
  point into the auth funnel; today local-only lives on onboarding beat 3.
- Add: the hand-rolled billing control already has the Segmented shape; swapping
  to the kit component touches handler wiring for no visual gain.
- Discover: the CSV how-to expander and Gmail bullets stay inline; the DS moves
  them into per-method sub-stages (a stage restructure, not chrome).

---

# Fourth pass — 2026-09-29, reduced motion + accessibility (release APK)

Closes the two testing gaps named in the previous report. Method, not vibes:

## Reduced motion
RN on Android reports reduce-motion when `Settings.Global.TRANSITION_ANIMATION_SCALE`
is `0` (read from RN's `AccessibilityInfoModule.kt`, not assumed). Set that plus the
other two scales the OS toggle sets, cleared data, relaunched.
- Onboarding beat 1 at **6s = 16s byte-identical** (125,827 / 125,829): the
  print-in landed at its final state instantly — all five rows present.
- Dashboard at **3s = 13s** (231,831 / 231,836): `$107.46` at final value, no
  count-up frame.
- Cancel Stamp at **1s = 3s** (193,669 / 193,669): stamp at rest, savings lines
  printed, Done present.
**No animation-gated element stuck invisible.** Scales restored to 1/1/1.

## Accessibility
`uiautomator dump` of the accessibility tree on **ten screens** (dashboard,
subscriptions, detail, settings, add, cancel guide, insights, calendar, coach),
parsed for clickable nodes with no text or content-desc on themselves or a
descendant.
- **Zero unlabeled controls on all ten.** Cancel guide's four: "Go back",
  "Open Disney+ Family cancellation page", "Mark Disney+ Family as cancelled",
  "Having trouble?".
- One false positive investigated to the source: Calendar's month arrows
  (`undefined.header.leftArrow/rightArrow`) have no label — but
  react-native-calendars sets `importantForAccessibility='no-hide-descendants'`
  on both (header/index.js:105) and exposes the header as an `accessible`
  `adjustable` control with increment/decrement actions (line 125). The dump
  confirms the header is focusable and carries "September 2026". TalkBack never
  lands on the arrows; month changes by the adjustable gesture. **Not a defect.**
  (Hygiene: the app passes no `testID` to `<Calendar>`, hence `undefined.*`.)
- **TalkBack enabled for real** (`com.google.android.marvin.talkback` is on this
  image): its focus rectangle landed on the first control (profile button) on
  the dashboard. Its first-run permission dialog took focus once; dismissed.
  Setting cleared afterwards with `settings delete` — `put ""` is rejected as
  "Bad arguments" and silently leaves the service enabled.

## Still not tested
iOS (no simulator run, ever) · physical hardware · TalkBack gesture-by-gesture
narration (the tree is verified; spoken output is not observable via adb).

---

# Fifth pass — 2026-09-29, CI and the release gate (read the workflows, not the badge)

- **The 22 RN component tests never ran in CI.** `npm test` is `vitest run`,
  which excludes `*.rntest.tsx` by design, and neither workflow had a jest step.
  Fixed: root `test:rn` script + a step in ci.yml and release.yml.
- **The release workflow could not pass.** Its blocking `npm audit
  --audit-level=high` exits 1 today (verified) on the two `image-size`
  advisories reachable only through Metro at build time, whose fix is a
  semver-major Expo 56 pins against. Replaced with `scripts/audit-gate.mjs` +
  `.audit-allowlist.json`: same high/critical bar, but each accepted advisory
  carries a reason and an **expiry** (2026-12-31); an unlisted advisory or an
  expired acceptance fails. Proven on the real tree in both directions; 8 unit
  tests on the pure `evaluate()`.
- **Coverage ratchet (P5.5) live.** Scoped to the logic vitest executes (RN
  screens/components → jest; Next pages/components → web build). Floors are the
  measured level — 62.81 / 55.77 / 62.93 / 63.43 — with `autoUpdate`, so they
  only rise. `npm run test:coverage` is a CI step. **Consequence to know:** the
  floor is exact, so a change that adds untested logic fails CI until tests
  land. That is the intended discipline; the escape hatch is writing the test.
- Mistake caught and fixed: my first workflow edit landed double-spaced (YAML
  tolerated it, so CI still ran); collapsed and re-verified line by line.

---

# Sixth pass — 2026-09-30, MASVS re-check of the mobile surface changed since the audit

Scope: every mobile file changed since `bc3a46d` (the last full security audit)
plus the new gate script. Checked by grep and by reading, then fixed on device.

## Clean
- No sensitive logging in any changed file.
- Deep links: the only mount-time effects on `subscription/[id]` and
  `subscription/cancel/[id]` reset animation values. No param triggers a write.
- `scripts/audit-gate.mjs` shells out to a constant string; no interpolation.
- PIN is rendered as dots only (`"•".repeat(pin.length)`), never as digits.

## Fixed
1. **PIN inputs were autofill targets.** The LockOverlay's hidden `TextInput`
   and both Security-screen PIN fields had `secureTextEntry` but no autofill
   opt-out — Android autofill and iOS Password AutoFill treat such a field as a
   PASSWORD field and offer to save or fill it through a password manager. A
   device PIN must never reach one. Added `importantForAutofill="no"`,
   `autoComplete="off"`, `textContentType="oneTimeCode"` (opts out of credential
   AutoFill without losing the number pad), `autoCorrect={false}`,
   `spellCheck={false}`, `contextMenuHidden` (overlay only).
2. **App-switcher thumbnail showed the live ledger (MASVS-PLATFORM-3).** The
   lock engaged only on RETURN to foreground; the OS snapshots the app on the
   way OUT, so recents showed amounts and services. Now `lockNow()` also fires
   on active → inactive|background (iOS reports "inactive" first and snapshots
   after, so that is the reliable point). Because the overlay can now mount
   while backgrounded, its one automatic biometric attempt is deferred until
   `AppState` is active — firing it into a backgrounded activity would fail and
   burn the attempt. `lockNow` was already a no-op unless app-lock is enabled.

   **Verified on device (release APK):** PIN set → dashboard unlocked → HOME →
   recents switcher shows the LOCK COVER, not the ledger → return is locked →
   PIN unlocks to the dashboard. The set of transitions that lock is unchanged
   by construction (the old code fired on the return edge of the same cycle);
   only the timing moved earlier. Not verifiable here: the biometric deferral —
   this emulator has no enrolled biometrics.

## Observed, pre-existing, left alone
A foreground deep link (`am start` to a running app) cycles the activity
through pause/resume and re-locks the app. The old code did the same on the
resume edge. Arguably correct (any pause is potential exposure); logged.

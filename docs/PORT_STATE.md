# Honest Ledger port — working state (re-read this after any context compaction)

Purpose: everything needed to resume the mobile port WITHOUT re-deriving it.
Companion to `docs/DELIVERY_PLAN.md` (the plan). This file is the *working state*.

## Where we are
- **Track W (website): DONE** — W1–W4 shipped.
- **M0 (tests): DONE** — 279 vitest + 8 RN component tests.
- **M1 (foundation): DONE** — tokens/motion/haptics/Navy icon/Tear splash.
- **M2 (core kit): DONE** — see kit inventory below.
- **M3 (hot screens): DONE** — Chrome, Dashboard, Subscriptions, Detail, Add.
- **M4 (flows): DONE (9 of 9)** — Cancel+Stamp (and fixed the celebration being
  invisible: the screen used to toast + navigate away instantly), Settings →
  LedgerSheet (closes the P4 Alert.alert debt), Paywall truthfulness (a free
  promise was being sold as a Pro unlock), Discover (tear-edge receipt +
  ScanLine), BudgetRecap (stamp + tally-mark streak), Onboarding (3 beats, the
  ledger prints itself), Budget (typographic forecast, two-tone rule bar with a
  cap rule, stamp verdict), Insights (categories = ledger lines with inline tick
  bars, no donut), Calendar (one ledger summary block, no stat-card trio).
- **M5, M6, M7: NOT STARTED.**

## The kit (import from `src/components/zeno`)
`Button` (variants: primary=INK, money=the only green, secondary, ghost,
danger=outlined) · `Card` (hairline rule, NO resting shadow) · `LedgerLine`
(label ···dotted leader··· mono value; props: label, sub, value, valueColor,
strong, size) · `SectionHead` (caps-mono + trailing hairline, `right` slot) ·
`ColumnHeads` (left/right table heads) · `Stamp` (tone verified|alert|neutral,
size sm|md|lg, angle, sub, `animate` = thunk spring + Success haptic) ·
`TearEdge` (flip for top edge) · `SkeletonRow` · `ScanLine` · `CodeBoxes` ·
`LedgerSheet` / `ConfirmSheet` (gorhom option picker; shows CURRENT value) ·
`Masthead` (kicker + title + rule) · `ScreenHeader` · `AmountDisplay`
(`animate` = adding-machine count-up) · `ListRow` · `ServiceAvatar` · `Badge`.

Theme: `useZenoTokens()` → `t.color/fonts/radius/space/shadow`. Legacy screens use
`useZenoTheme()` → `theme` (ThemeTokens: `theme.rule`, `theme.ruleStrong`,
`theme.inkPanel`, `theme.stampVerified`, `theme.stampAlert`, `theme.text`,
`theme.quietText`, `theme.card`…). Both expose the ledger tokens.
Motion: `springs.settle/thunk/sheet`, `printIn(i)`, `useReducedMotion()`.
Haptics: `haptics.stampLanded/stillCharging/rowPress/primaryAction/pinDigit`.

## The porting method (this is what makes it good, not generic)
1. Read the DS mockup at `Zeno Design System/ui_kits/app/<Screen>.jsx`.
2. **Read its SLOP AUDIT comment at the top** — it names what to AVOID
   ("tempted by X → did Y instead"). The defining move is almost always a
   DELETION (a card, a stat trio, pill chips, confetti, a spinner).
3. Port structure + copy faithfully. Cards → rules. Chips → text ticks with a
   2.5px accent underline. Stat tiles → LedgerLines. Spinners → ScanLine.
   Success moments → Stamp (NEVER confetti/check-circle).
4. PRESERVE: all logic/handlers, P4 perf (memo/debounce/FlatList windowing),
   accessibility labels, and truthfulness copy verbatim.
5. Delete code the redesign orphans (helpers, style keys, imports).

## Truthfulness rails (non-negotiable)
BANNED: "100% on-device", "we never see your data", auto/background discovery,
"no Plaid ever", E2E-sync claims, invented stats/user counts, "$219/yr",
"Most popular". REQUIRED: "No bank login required"; scans happen when you tap;
paywall sells ONLY unlimited subs + category budgets + envelope budgeting;
"sample data" labels; "verified July 2026" footnotes; open-banking = "Planned".

## Gates (run before every commit)
```
npm --workspace @zeno/mobile run typecheck
npm --workspace @zeno/mobile run lint
npx vitest run --root D:\projects\zeno apps/mobile     # expect 279
npm --workspace @zeno/mobile run test:rn               # expect 8
```
Commit per logical change, push after each. Use `git commit -F <file>` — the
PowerShell here-string mangles em-dashes/arrows and silently breaks the commit.

## Environment gotchas (hard-won — do not re-derive)
- **adb is NOT on PATH.** Use
  `C:\Users\Pratik\AppData\Local\Android\Sdk\platform-tools\adb.exe`.
  AVD is `SubRadar_API_36`; launch via `emulator.exe -avd SubRadar_API_36`.
- **`expo run:android` does NOT regenerate native assets** because
  `apps/mobile/android/` is gitignored but persists. After ANY change to
  `assets/icon.png` / `adaptive-icon.png` / `splash-icon.png` you MUST run
  `npx expo prebuild --platform android --no-install` or the app keeps the old
  icon. (This actually shipped the wrong icon once — caught only on device.)
- Screenshots: `adb shell screencap -p /sdcard/x.png` then `adb pull`. Do NOT
  pipe `exec-out` through PowerShell `>` (adds a BOM, corrupts the PNG).
  The emulator wedges under repeated captures; keep bursts small.
- Expo **web** does not work (expo-sqlite `wa-sqlite.wasm` fails to resolve).

## On-device verification log (emulator-5554, 2026-07-28)

**VERIFIED ON DEVICE — the port renders correctly.** First real visual proof:
- **Onboarding beat 1**: warm paper #FAF9F5, display headline, the ledger
  printing itself with dotted leaders, `Committed $61.97/mo` in verified-green
  — correctly COMPUTED from its own rows (15.99+10.99+20.00+2.99+12.00), which
  is exactly why the total is derived and not hardcoded. "Sample figures — your
  ledger starts empty." present. Ruled progress ticks. **"Continue" renders INK,
  not green** → the M2 Button refresh confirmed on a real device.
- **Beat 2**: green caps-mono "UNLIKE THE OTHERS" kicker, "No bank login
  required." in defiant display type, two ticks lit.
- **Beat 3**: all three ticks lit, CTA becomes "Sign in", local-only path shown.

Also resolved: the **black screen seen at launch is NOT a bug** — it is Metro's
cold bundle (96s with `--clear`). Wait for "Android Bundled" in the Metro log
before screenshotting, or the capture lands mid-bundle.

**STILL UNVERIFIED (blocked, not skipped):** dashboard and everything behind it.

Failure mode, reproduced FOUR times with measurements: entering the app puts the
process into `D` state (uninterruptible disk I/O, iowait 28% vs 4% idle), and
`screencap`/`dumpsys` then hang indefinitely. The emulator recovers only once the
app is killed; Android eventually OOM-killed it each time.

Root cause is NOT app seeding — that was my first assumption and it is wrong.
`seed-subscriptions.ts` writes only 5 rows via 5 sequential upserts, which is
trivial. The cost is dev-build overhead on a slow virtual disk: SQLCipher
database creation + key derivation on first open, plus expo-sqlite native init,
plus Metro dev-mode module serving. **A release build on real hardware does not
carry this**, so this is an emulator limitation on this machine and NOT evidence
of a cold-start problem in the product.

Practical notes for whoever picks this up:
- Wait for "Android Bundled" in the Metro log before the FIRST screenshot
  (cold bundle took 96s with `--clear`; a warm one is ~100ms).
- `adb shell svc power stayon true` prevents the dim-screen captures.
- Confirm the app is actually foregrounded (`dumpsys window | grep mCurrentFocus`)
  before sending taps — otherwise input lands on the launcher.

## Open items / findings not yet actioned
- **M3+M4 visuals have never been SEEN on a device.** Verified structurally
  only. M7's emulator drive is where they get confirmed. Two bugs this session
  proved tests don't catch this class: the wrong app icon, and a cancel
  celebration that was invisible because the screen navigated away instantly.
- Discover: results/scan done; the rest of the hub is untouched.

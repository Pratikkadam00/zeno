# Honest Ledger port — working state (re-read this after any context compaction)

Purpose: everything needed to resume the mobile port WITHOUT re-deriving it.
Companion to `docs/DELIVERY_PLAN.md` (the plan). This file is the *working state*.

## Where we are
- **Track W (website): DONE** — W1–W4 shipped.
- **M0 (tests): DONE** — 279 vitest + 8 RN component tests.
- **M1 (foundation): DONE** — tokens/motion/haptics/Navy icon/Tear splash.
- **M2 (core kit): DONE** — see kit inventory below.
- **M3 (hot screens): DONE** — Chrome, Dashboard, Subscriptions, Detail, Add.
- **M4 (flows): 5 of 9** — DONE: Cancel+Stamp, Settings→LedgerSheet, Paywall
  truthfulness, Discover (receipt + ScanLine), BudgetRecap.
  **REMAINING: Onboarding (`app/index.tsx`, 110 ln), Calendar
  (`app/(tabs)/calendar.tsx`, 466), Insights (`app/(tabs)/analytics.tsx`, 444),
  Budget (`app/budget.tsx`, 423).**
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

## Open items / findings not yet actioned
- **M3+M4 visuals have never been SEEN on a device.** Verified structurally
  only. M7's emulator drive is where they get confirmed. Two bugs this session
  proved tests don't catch this class: the wrong app icon, and a cancel
  celebration that was invisible because the screen navigated away instantly.
- Discover: results/scan done; the rest of the hub is untouched.

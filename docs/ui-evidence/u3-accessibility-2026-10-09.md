# U3 · Accessibility, measured

**Date:** 2026-10-09. The gate asks that each criterion be a script or test with its
output saved, so every row below is a test that runs in CI, not a reading taken once.

**Three findings, two fixed here, one recorded:**

| # | Finding | State |
|---|---|---|
| F233 | The four status colours were painted as TEXT all over the app and failed WCAG 1.4.3 on paper: warning 2.04:1, success 3.10, danger 3.67, info 3.68. On the dark desk they failed on their own soft chip. The Badge's warning text was a hardcoded light-mode hex, so in dark mode it read at 2.65:1 | fixed |
| F234 | The ledger header's two icon buttons were 38×38 and 40×40, under the 44 pt floor, with no hitSlop | fixed |
| F235 | The month grid's day cells are 32×32, drawn by `react-native-calendars` | open, recorded (register R35) |

---

## U3.4 · Text contrast, computed from the tokens (the big one)

`src/theme/zeno.test.ts` already computed WCAG ratios for the primary, secondary and
tertiary text, the buttons and the stamps, light and dark. What it had never checked was
the four **status** colours, and those are used as text on a dozen screens.

Measured, light scheme, on a white card:

| Token | As text | Needed |
|---|---|---|
| `warning` #F5A524 | **2.04:1** | 4.5:1 |
| `success` #02A85F | **3.10:1** | 4.5:1 |
| `danger` #F43F5E | **3.67:1** | 4.5:1 |
| `info` #3B82F6 | **3.68:1** | 4.5:1 |

Those painted 36 pieces of real text: the saving on an insight, the cancel link on the
calendar, the scan's error and cap notices, the paywall's saving badge, the delete rows
in Settings, the trial and still-charging chips, the lock screen's error. The amber one
at 2.04:1 is barely legible on paper for anyone.

Two more, found by the same measurement:

- **Soft chips.** A badge's text sat on its own tinted chip: success 2.79:1, danger 3.09,
  info 3.18. Warning had already been patched with a hardcoded `#B45309`, which is right
  on paper (4.56:1) but was used in **both** schemes, so on the dark chip it read at
  2.65:1 — a fix for one scheme quietly breaking the other.
- **Solid chips.** White on a solid status chip: 3.10:1 on the green, 3.67 on the red,
  3.68 on the blue.

**The fix.** The four status tokens are now **fill grade** — dots, bars, chips, borders,
icons — and four new **text grade** tokens carry anything that is read:

| | light | dark |
|---|---|---|
| `successText` | `#028048` | `#02AD62` |
| `warningText` | `#9A6207` | `#F5A524` (already passed) |
| `dangerText` | `#D50C2F` | `#F65E78` |
| `infoText` | `#5895F7`… `#0B62F0` light | `#5895F7` |

Each is the **same hue** walked down in lightness (or up, on the dark desk) until it
clears 4.5:1 on paper, card, sunken and raised **and** on its own soft chip. All 36 text
usages now take the text grade; fills, borders and `withAlpha()` keep the fill grade.
Solid badges carry ink, except the neutral chip, which is the one dark fill and keeps
white (ink on it would be 1.34:1 — a regression the test now blocks).

**Proof.** `zeno.test.ts` grew 48 assertions: every text grade on all four surfaces and
on its own chip, both schemes, with a `flatten()` helper that composites the dark chips
(they are `rgba(…, 0.16)`, so a chip is only as readable as what shows through it). A
control test pins that the *old* fill grades really were below 4.5:1, so the finding
cannot be quietly undone. 135 assertions in that file now pass.

## U3.3 · Touch targets

`__screens__/touch-targets.rntest.tsx` walks eleven screens for anything with a button,
link, tab, switch, checkbox or radio role, and reads the size it **declares** — its
`height`/`minHeight` and `width`/`minWidth`, grown by its `hitSlop`. A control that
declares no size takes it from its content, which this renderer does not lay out, so it
is counted apart rather than passed off as fine. What this catches is a control *shrunk
in code* below 44 pt, and a control case proves the measure works: a 24 pt icon fails, the
same icon with 10 pt of slop passes, and `hitSlop` as a number or as an object both count.

**F234:** the ledger header's Settings button was 38×38 and its Notifications button
40×40. Both now carry `hitSlop` (3 and 2), so the drawn circles keep the header's rhythm
and the tappable boxes reach 44.

**F235:** every day cell in the month grid is 32×32. Those are drawn by
`react-native-calendars`, not by Zeno, so the fix is to supply a custom `dayComponent`
rather than change a style of ours. Recorded as R35, and pinned by a test that asserts
they are 32×32 today, so the day that changes — or the library starts drawing them at 44
— the suite says so instead of quietly passing.

## U3.2 · Every control named

Twenty of the twenty-two screen files already asserted `unnamedControls() == []`, but
almost always once, with data on the screen. The sweep in `state-matrix.rntest.tsx` now
asserts it for fourteen screens **in the empty state too**, which is where a control
rendered only when there is nothing to show (the "add your first one" buttons) lives.
All pass.

## U3.11 · Nothing said with colour alone

Each status has a colour: the amber trial chip, the red still-charging stamp, the green
verified one. The ledger names every one of them **in words** in the row's accessible
name — "Free trial", "Paused", "Pending verification", "Still charging", "Verified
cancelled" — so a reader who cannot tell the fills apart still gets the status. Pinned
directly in `state-matrix.rntest.tsx` across all six statuses, plus the still-charging
row's visible "!" beside the amount, so the red is never the only mark.

A note on the fill grades, now that they are only fills: amber on paper is 1.94:1, below
the 3:1 that 1.4.11 asks of a graphic that carries meaning on its own. It never does —
every status fill sits beside the word, which is exactly what this row proves. The test
asserts the pairs that *are* load-bearing: a button filled success or danger carries text
that clears 4.5:1.

## U3.7 · Reduce motion

Already held: `theme/motion.ts` with `motion.rntest.tsx`, the onboarding ledger appearing
without its print-in, the tab focus tick snapping instead of growing, and the ledger total
skipping its count-up. Re-run green in this pass.

## The website rows (U3.8, U3.9, U3.10, U3.13)

Proven in the W7 pass and running in CI on four browsers:

- **U3.8 keyboard only** — `e2e/keyboard.spec.ts`: ten templates, the skip link first and
  working, every control reached in document order, focus visible on each, no trap.
- **U3.9 200 % zoom** — `e2e/zoom.spec.ts`: ten templates, no sideways scroll, nothing clipped.
- **U3.10 landmarks and headings** — `e2e/every-route.spec.ts` runs axe at WCAG 2.2 AA over
  every route, which is where the landmark and heading-order rules live; zero violations.
- **U3.13 forced colours** — `e2e/forced-colors.spec.ts`, which found F228 (controls drawn
  with a background alone vanished in Windows High Contrast) and now holds the fix.

## U3.6 · TalkBack (added later the same day)

Run with TalkBack genuinely running, not simulated: the service was enabled and confirmed
up in `dumpsys accessibility`, then removed cleanly afterwards (a `put ""` is rejected;
`settings delete` is the way). One trap first — enabling TalkBack raises **its own**
first-run notification dialog, which sits over the app and blocks every gesture until the
Accessibility Suite is granted `POST_NOTIFICATIONS`. That is what a first attempt hit.

With it running:

- A ledger row announces in full: **“Spotify, Nov 8 · ENTERTAINMENT, $10.00 per mo”** — the
  name, the date, the category and the amount, in one phrase.
- **TalkBack's own gesture works**: a single tap only focuses, a double tap activates. Done
  that way, the Spotify row opened its subscription page. This is the part a jest test
  cannot answer, because it is the platform intercepting touches.
- Every clickable element on all five journey screens (ledger, subscription page, the
  ledger list, add, security) announces something — checked against the *compressed*
  accessibility tree, which is what a screen reader actually consumes.
- No crash, and the lock screen's PIN field is properly labelled under TalkBack.

**Not covered:** swiping element to element through an entire journey, and the speech
itself, which this setup cannot capture (there is no audio out of the emulator here). What
is proven is that the journeys are reachable and correctly announced, not how they sound.

## U3.12 · the system's bold-text and high-contrast settings

`font_weight_adjustment 300` (the system's "bold text") and `high_text_contrast_enabled 1`,
each alone and both together, over the ledger, Settings and the subscription list. Every
text node's box was measured; a collapsed box is text the screen cannot show. **Nothing
clipped in any of the four combinations**, and no crash. Both settings restored afterwards.

## Still open

- **U3.1** stays as its P5 baseline (the `.maestro/a11y-audit.sh` audit of 17 screens);
  U3.2 above is the part that extends it.
- **U3.5** was answered later the same day by the device run in U2
  (`ui-evidence/u2-visual-baselines-2026-10-09.md`), which found and fixed F236.

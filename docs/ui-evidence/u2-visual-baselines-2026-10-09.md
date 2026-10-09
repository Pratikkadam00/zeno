# U2 · How it looks: visual baselines

**Date:** 2026-10-09 · **Device:** emulator-5554 (AVD SubRadar_API_36, Android 16,
1080×2400, 440 dpi). The gate asks for baselines committed, a comparison that runs, and a
deliberately broken layout being caught.

**Two findings, both fixed:**

| # | Finding | State |
|---|---|---|
| F236 | At font scale 2.0 the ledger clipped text at the right edge with no ellipsis: the free-plan counter read "1/" and an amount read "$0.0" | fixed |
| F237 | Five screens showed a scroll indicator where the other seventeen hide it | fixed |

---

## U2.1 · The tooling

`scripts/app-visual.mjs`, `--mode update` or `--mode check`, with `--scale`.

A screenshot only means anything if everything except the app is pinned, so before it
captures, the script:

- **freezes the device clock** to a fixed instant, because the ledger prints today's date
  and every renewal is relative to it — without this a baseline rots overnight;
- **puts the status bar in SystemUI's demo mode**: clock at 10:00, full battery, full
  signal, no notification icons;
- **grants the notification permission**, because a fresh install asks on first launch and
  that dialog sits over whatever is captured next (it poisoned a run before this was added);
- **sets the theme through the app's own Settings switch**, because the app reads its
  scheme from its own storage, not from the system — with a retry, since changing the font
  scale is a configuration change that restarts the activity under the dump.

Comparison is per-pixel on the raw RGB: a pixel differs when any channel moves by more
than 8 (the emulator's GPU dithers gradients by a unit), and a screen fails when more
than 0.1 % of its pixels differ. Baselines are written **losslessly** at maximum
compression: a palette would quantise the gradients, and an early attempt at that made 80 %
of the dark screens "differ" against a picture the device never drew.

Baselines belong to **one device**. The fingerprint (AVD name, SDK, release, size,
density) is written beside them and checked before any comparison, so running elsewhere
fails loudly instead of reporting hundreds of false differences.

Two screens are deliberately out of the set:

- **`security`**, because it sets FLAG_SECURE so a PIN can never be screenshotted (U6.13
  proves that) and `screencap` returns black. It also leaves the flag on long enough to
  blacken whatever is captured next, which is how it was found.
- **A subscription's page** has no fixed deep link, because its id is generated on the
  device, so the script opens the ledger and presses the first row.

## U2.2 · The baselines

38 of them in `apps/mobile/visual-baselines/phone`: 19 screens × light and dark. The
device fingerprint is in `visual-baselines/device.txt`. Captured against a ledger holding
one subscription (Spotify, $10.00/mo, renewing 8 November), added through the app's own
Add flow, so the ledger, the calendar, the insights and the subscription page all have
something real on them.

**The comparison is stable**: run twice in a row against an unchanged build, 38 compared,
0 differ, twice.

## U2.8 · The bite check

The point of a baseline is that it fails when it should. A deliberate break — the ledger
body's horizontal padding from 20 to 44 — was built, installed and compared:

```
compared 38

2 differ:
  ledger-light: 2.183 % of pixels differ
  ledger-dark: 2.198 % of pixels differ
```

Exactly the two screens that change, and **no false positives on the other 36**. Reverted,
rebuilt, reinstalled, and all 38 match again. The failing captures are written out as
`FAILED-*.png` so the difference can be looked at rather than guessed.

## U2.5 and U3.5 · Font scale, and what it found

Running `--mode update --scale 2.0` is what closed U3.5, which jest cannot answer (the RN
test renderer lays no text out). It found **F236** straight away. On the ledger at double
font size:

- `COMMITTED THIS MONTH ⋯ 1/10 FREE` ran off the right edge and read **`1/`**;
- `Still to renew 0 RENEWALS ⋯ $0.00` ran off and read **`$0.0`** — a number that is not
  just cut but *misreadable as a different number*.

The cause is the same in both: a row of label, dotted leader and value, where the label
has no `flexShrink`, so as it grows the value is pushed off the edge. Neither ellipsised;
they were simply clipped.

**The fix** is that the label gives way and the amount never does — `flexShrink: 1` and
`numberOfLines={1}` on the label, `flexShrink: 0` on the value, in `Ledger.tsx`'s
`LedgerLine` (every ledger row across the app) and in the dashboard's own header row.
After it, the same screen reads `COMMITTED TH… ⋯ 1/10 FREE` and `Still to ren… 0 RENEWA… ⋯
$0.00`: labels ellipsise, **every number is whole**.

That the fix is safe at normal size is not an opinion: all 38 normal-size baselines still
matched after it, twice.

The scaled baselines are **not committed** (`.gitignore`). 38 more binaries would double
the repo's history and churn on every deliberate UI change, for a check that is worth
running when type or layout moves rather than every day. The command is one line and its
result today is this section.

## F237 · The scroll indicator

`coach-light` flaked at 0.554 % between two runs: a scroll indicator caught mid-fade. It
was not a test artefact — 17 screens set `showsVerticalScrollIndicator={false}` and five
(coach, family, wrapped, backend, open-banking) did not. Made consistent, which both fixed
the inconsistency and settled the comparison.

## U2.6 · The website

Done in W7.2 and unchanged here: `apps/web/e2e/visual.spec.ts` compares twelve templates,
light and dark, desktop and phone (48 comparisons) behind `VISUAL=1`, proven end to end on
this machine (48 written, 48 compared). Its baselines must be rendered on Linux, where CI
renders, so `.github/workflows/visual.yml` produces them in "update" mode and uploads them
for the owner to commit (OWNER_GUIDE step 15).

## Not done

- **U2.3 small phone (5.0") and U2.4 tablet.** Both need AVDs this machine does not have,
  and creating them means downloading system images — which needs the owner's say-so.
  Owner item.
- **U2.7 nightly.** The website's comparison can run in CI; the app's needs an Android
  emulator in the runner (`reactivecircus/android-emulator-runner`), which is a slow job
  and a decision about CI minutes. The script is ready for it; the workflow is not written.
  Owner decision.

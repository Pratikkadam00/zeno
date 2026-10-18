# Flow (UI journey) test plan — where it stands on 2026-10-17

The owner asked: is flow testing done, or does it still need doing? The short answer,
measured from the repo rather than assumed: **the nightly flows cover 13 journeys and
every screen's accessibility; about ten journeys people will actually take have no flow
yet.** Three of those need nothing from the owner and are listed first. The rest wait on
keys, accounts or a real phone.

Sources read for this page: `.maestro/*.yaml` (13 flows), `.maestro/a11y-audit.sh`
(17 screens), `docs/UI_TEST_PLAN.md` and `docs/UI_TEST_TRACKER.md` (U1–U7, verdicted
2026-10-09: 79 pass, 10 the owner's), `apps/web/e2e/*.spec.ts` (11 Playwright specs),
and the route list under `apps/mobile/app/`.

## 1. What runs every night today (GitHub, release APK, API 36 emulator)

| Flow | Journey it walks |
|---|---|
| 01-onboarding-local | three slides, skip, continue without an account, the empty ledger |
| 02-sign-in-gate | sign-in screen: email code request, consent tick, Back to the last slide (F243), guest route |
| 03-add-from-catalog | add Netflix from the catalogue, it appears on the ledger |
| 04-add-write-in | add a service the catalogue does not know |
| 05-cancel-guide-stamp | open a subscription, the cancel guide, stamp it cancelled |
| 06-app-lock | set a PIN, lock, a wrong PIN ("Incorrect PIN, N attempts"), unlock |
| 07-family-needs-account | Family asks for an account when local-only; Exit local-only mode lands on the sign-in screen |
| 08-coach-consent | set a monthly budget, start tracking it, then the coach's consent screen before any AI call |
| 09-notifications-blocked | the app's answer when notifications are denied |
| 10-discover-csv-import | Discover → import the fixture CSV → rows land |
| 11-calendar | the calendar tab with a renewal on it |
| 12-insights | the insights tab with data |
| 13-dark-mode | the Dark mode switch in Settings, on and off, and what it renders |
| a11y audit | 17 screens: every control named (dashboard, subscriptions, calendar, analytics, discover, settings, notifications, profile, security, family, coach, budget, paywall, wrapped, spend-twin, widgets, subscription/add) |

Each flow starts from `pm clear` (common/fresh-local-start.yaml). A product change can
break the nightly run: F243's first version did, and the run caught it (fixed in ab85461).

## 2. Covered by other layers, not by a nightly flow

- **The ⊕ quick-pick arc (F244).** Hold, slide, release cannot be written in Maestro
  (it has long-press, not hold-then-drag). Covered by `tabs-layout.rntest.tsx` (the
  gesture's own handlers), and by a scripted adb proof on 2026-10-17
  (`docs/ui-evidence/f244-*.png`). The accessibility actions (TalkBack's list of the three
  picks) are unit-tested; TalkBack itself was not driven. **Owner, two minutes on a
  phone:** turn TalkBack on, focus the ⊕, swipe up/down to the actions menu, confirm the
  three picks are listed and work.
- **Web journeys.** Playwright walks every route, the homepage, the waitlist and the
  guides, keyboard, zoom, forced colours, print, viewports and visual baselines. The
  checkout on `/pro` renders prices and the form; **the Razorpay modal has never been
  opened** (needs test keys, `docs/RAZORPAY_WEB_CHECKOUT.md`).
- **Security journeys** (U6, U7): verdicted on 2026-10-09 with evidence files; not
  repeated here.

## 3. Journeys with no flow — I can write these now, nothing needed from the owner

| # | Journey | Why it matters | Flow to add |
|---|---|---|---|
| F-A ✅ 2026-10-18 | **Edit and delete a subscription** (`subscription/[id]`): change the amount and cycle, save, see the ledger total move; delete, see it gone and the total move back | the second most common thing after adding; never walked end to end | 14-edit-and-delete.yaml |
| F-B | **Settings: display currency** (`settings.tsx`): change it, see every amount on the ledger, calendar and insights re-render in it | currency is shown on every screen and no flow changes it (the theme switch is covered by 13) | 15-settings-currency.yaml |
| F-C ✅ 2026-10-18 | **Exit local-only → sign-in → Back → last slide → guest again, data intact** (`profile.tsx`, `login.tsx`) | 07 stops at the sign-in screen; the Back from THIS path is the one F243 fixed and the nightly only walks Back from onboarding's own sign-in | 16-exit-local-only-and-back.yaml |
| F-D | **Budget: exceed it and read the recap** (`budget.tsx`, `budget-recap.tsx`): with a budget set (08 does that), add enough to pass it, see the over-budget state and the recap's figures | the numbers on a money screen; 08 sets the budget and leaves | 17-budget-exceeded.yaml |
| F-E ✅ 2026-10-18 | **Security: replace the PIN, then the full lockout** (`security.tsx`): there is no "change PIN" control, so off (current PIN, a wrong one counted) and on with a new one; old PIN refused, new one works; ten wrong PINs → "Try again in 15 minutes", the right PIN refused meanwhile, through a cold start | 06 sets a PIN and tries one wrong PIN; it never replaces the PIN or reaches the lockout | 18-pin-reset-and-lockout.yaml |
| F-F | **Process death with a lock set**: background, `am kill`, relaunch → lock screen first, data intact after unlock | the one thing a flow can prove that unit tests cannot | 19-process-death.yaml (uses `runScript`/adb from run.sh) |
| F-G | **CSV import, bad file**: a non-CSV, an empty file, a CSV with no amount column → an error the person can read, nothing half-imported | 10 covers the happy path only | 20-discover-csv-bad-file.yaml + two fixtures |
| F-H | **Reminders follow the ledger** (`notifications.tsx`), permission granted: a renewal in 3 days is listed as scheduled; stamp it cancelled → gone; a new subscription → listed | 09 walks the permission-denied state only; reminders are the product's promise ("seven days out, three days out, the morning of") | 21-reminders-follow-the-ledger.yaml |
| F-I | **Deep links from the website**: `zenoapp.in/cancel/<slug>` and the app's own `zeno://` routes open the right screen (U6.10 proved they do not crash; nothing proves they land right) | the guides are the pages Google shows | 22-deep-links.yaml |

**Done 2026-10-18** (passed on emulator-5554, release APK of ab85461): F-A, F-C, F-E.
Writing them found one thing worth knowing for every future flow: on the edit form,
Maestro's `hideKeyboard` sends Back and leaves the form, dropping the edit; flow 14
closes the keyboard by tapping a heading instead.

Cost: about one working session for F-A to F-E, a second for F-F to F-I. Each is
added to `.maestro/run.sh` and runs nightly from then on.

## 4. Journeys that wait on the owner

| # | Journey | Blocked on | Who |
|---|---|---|---|
| O-1 | **Magic-link sign-in end to end**: request a code to samaltman1998@gmail.com, enter it, land on the ledger, sign out | the owner reads the code from that inbox; the link redeems only on the requesting device | owner + me, five minutes together |
| O-2 | **Gmail scan**: connect, consent (read-only scope), scan, rows appear, disconnect revokes | R9 (Google's redirect for the test client) | owner (Google Cloud console) |
| O-3 | **Pro purchase in the app**: paywall → Play sheet → test card → Pro on; cancel → unchanged; restore | a Play licensed test account (U6.22, P6 in `PLAY_RELEASE.md`) | owner |
| O-4 | **Pro purchase on the web**: `/pro` → email code → consent → Razorpay modal (test card) → "Pro is on" → the app shows Pro | Razorpay **test** keys as files in `zeno-keys` | owner (keys), then me |
| O-5 | **Refund path**: a refund in Razorpay's dashboard → `refund.processed` → the grant revoked | O-4 first | owner + me |
| O-6 | **A real phone**: the 13 flows plus the arc by hand on the owner's Android (P15) | the phone | owner, ten minutes, I write the checklist |
| O-7 | **Older Android** (API 24/28/31/34 images, ~1 GB each) | the owner's go-ahead on the downloads (U5) | owner says yes, I run them |
| O-8 | **iOS** | a Mac or an EAS cloud build, plus an iPhone | owner decision |

## 5. Order I would do it in

1. F-C, F-A, F-E (the three that touch money, data and the lock) — next session.
2. F-B, F-D, F-G, F-H.
3. F-F, F-I.
4. O-1 the first time the owner has five minutes; O-4/O-5 the day the test keys land.

Verdicts go in `docs/UI_TEST_TRACKER.md` under a new "Flows" section, one row per flow,
with the nightly run's URL as the evidence, the same way U1–U7 were closed.

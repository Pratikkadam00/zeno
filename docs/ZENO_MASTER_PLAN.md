# Zeno Master Plan — Design-led Build & Beat-Rocket-Money Roadmap

> **This is the single source of truth for building the Zeno app.** Every screen, token,
> and flow must trace back to the **Zeno Design System** at the repo root:
> `D:\projects\zeno\Zeno Design System\`.
> If anything here and the design system disagree, the design system wins — update this doc.

---

## 0. The one rule

**The design is already done.** Do not re-invent layout, color, type, or flows. The
`Zeno Design System/` folder is authoritative and contains:

| What | Where | Use it for |
|---|---|---|
| **Design tokens** | `tokens/*.css` (colors, typography, spacing, radius, shadows, motion, fonts) | The exact values every screen uses |
| **Brand + voice** | `readme.md`, `guidelines/*.card.html` | How Zeno looks and talks (sentence case, 2nd person, no emoji, show the $ figure) |
| **Core components** | `components/core/*.jsx` + `*.prompt.md` | Button, IconButton, Card, AmountDisplay, ListRow, ProgressBar, Badge, CategoryTag, ServiceAvatar, Input, Switch, SegmentedControl, Icon |
| **UX architecture spec** | `Zeno UX Architecture.html` | The full IA, screen inventory, 6 flows, state matrix, and the budgeting add-on |
| **Reference app screens** | `ui_kits/app/*.jsx` | The actual designed screens to port (Home, Subscriptions, Discover, Calendar, Insights, SubscriptionDetail, Add, CancelFlow, Budget, BudgetRecap, Onboarding, Paywall, Settings, Chrome) |

**Brand fixed points (memorize):** Zeno Green `#00C26E` with **dark ink text, never white-on-green**.
Warm-white paper `#F8F8F6`, cool ink neutrals, 8-color category palette, full dark theme.
Type: **Space Grotesk** (display) · **Hanken Grotesk** (UI/body, 15px) · **JetBrains Mono** (every money value, tabular).
Icons: **Lucide**, 2px stroke. **No emoji, ever.** Cards: 16px radius, hairline border + soft shadow.

---

## 1. The target architecture (from the spec — this is the destination)

The current app has **4 tabs** (Home/dashboard, Calendar, Discover, Analytics), a 9-item
feature grid, no dedicated subscriptions list, mock charge history, a locked renewal date,
self-reported cancellation, and no budgeting. The spec moves us to:

**5-tab bar with a center action:**
`Home · Subscriptions · [Discover — center] · Calendar · Insights`
Settings lives behind a gear in the Home header (chrome, not a tab).

**The eight committed flow changes** (all already decided in the spec, §01):
1. First discovery scan is **free** and is the onboarding destination.
2. **New Subscriptions tab** = the full searchable/filterable list (was buried in Analytics).
3. **De-clutter Home** — remove the 9-item grid; tools live in Insights/Settings; dev screens hidden.
4. **Verified cancellation** lifecycle: Guided → Pending verification → Verified / Still-being-charged.
5. **Editable renewal date** on manual add (was locked to +30 days).
6. **Real charge history** on detail (was mock).
7. **Onboarding resequenced** — value before configuration; mode/theme choice removed from the path.
8. **Visible trust + easy exit** — privacy inline at connect/import; export/delete/cancel-Zeno top-level in Settings.

**Tiers:** Free = 10 subs (D2) + first scan + manual + calendar + reminders + cancel-with-verify +
Free-Trial Guardian + Price-Hike Radar. Pro = unlimited + repeat auto-discovery + analytics +
AI Coach + Wrapped + Spend Twin + widgets/watch + full budgeting. Family = 5 members, combined total only.

---

## 2. How to read this plan

The user's instruction: **"first we design the current flow, then we design and develop the
remaining."** So:

- **Phase 0** builds the bridge that lets the web design system render natively.
- **Phase 1** re-skins + re-architects the screens that **already exist** in the app ("current flow").
- **Phase 2** builds the **remaining** designed-but-unbuilt features (verified cancel, real history, notifications inbox, **budgeting**).
- **Phase 3** adds the beat-Rocket-Money differentiators, styled in the design system.
- **Phase 4** is launch hardening + the continuous "stay ahead" loop.

Each phase lists: **goal · work · source of truth · done-when.**

---

## Phase 0 — Design foundation in React Native (the bridge)

**Goal:** make the web design system usable natively, so every screen uses identical tokens
and components. Nothing visual ships until this exists.

**Work:**
- Build an **RN theme module** (`apps/mobile/src/theme`) that mirrors `tokens/*.css` 1:1:
  colors (light + dark via `[data-theme="dark"]`), the 4px spacing scale, radius scale,
  typography scale, shadows (map to RN shadow/elevation), motion durations + easings.
  This **replaces** the existing genz/millennial/genx token sets (see Decision D1).
- Load the three fonts via `expo-font`: **Space Grotesk**, **Hanken Grotesk**, **JetBrains Mono**.
  Wire a money/`<AmountDisplay>` style that uses JetBrains Mono with tabular figures.
- Add **`lucide-react-native`**; replace every emoji/Unicode glyph in the app with Lucide icons.
- Port the **12 core components** to RN (View/Text/Pressable), matching
  `components/core/*.jsx` behavior and the usage in each `*.prompt.md`. Use
  `ui_kits/app/_primitives.jsx` as the canonical reference (it's a self-contained copy).
- Establish light/dark theming via context (the single Zeno brand).

**Source of truth:** `tokens/`, `components/core/`, `ui_kits/app/_primitives.jsx`, `readme.md`.

**Done when:** a throwaway test screen built only from the new RN components is visually
indistinguishable from the design system's rendering, in both light and dark.

---

## Phase 1 — Re-architect + re-skin the CURRENT flow

**Goal:** every screen that exists today is rebuilt to the spec's IA and the Zeno brand,
keeping all current functionality. This is the "design the current flow" half.

**Work (in order):**
1. **Navigation → 5-tab IA.** Add the center **Discover** action and the **Subscriptions** tab;
   move Settings to a Home-header gear; **remove the 9-item grid**; hide **Backend** + **Open-Banking**
   behind the version-tap gesture (Settings → About ×7); **remove Business / Public API / Partners**
   from app nav. Ref: spec §02, `Chrome.jsx`.
2. **Onboarding (OB-1…4).** Resequence to value-before-config; free first scan; trust beats;
   drop the forced mode pick. Ref: `OnboardingScreen.jsx`, spec §03 + Flow A.
3. **Home / Triage (HOME).** Spend summary + free counter, Needs-attention (trials/hikes/renewals),
   Upcoming renewals, 1–2 savings previews. Ref: `HomeScreen.jsx`.
4. **Subscriptions tab (SUBS — NEW).** Full list: search, sort, filter
   (Active / Paused / Pending cancel / Cancelled). Ref: `SubscriptionsScreen.jsx`.
5. **Discover hub + methods (DSC-0/E/C/M/R).** Re-skin; inline trust panels. Ref: `DiscoverScreen.jsx`.
6. **Calendar (CAL).** Ref: `CalendarScreen.jsx`.
7. **Insights (INS — was Analytics).** Trend chart, category breakdown, insight flags, tool entries.
   Ref: `InsightsScreen.jsx`.
8. **Subscription detail (SUB-D) + Edit (SUB-E).** Wire **editable renewal date** (Change 5).
   Ref: `SubscriptionDetailScreen.jsx`.
9. **Manual add (DSC-M).** Editable next-renewal date + optional last-charged seed. Ref: `AddSubscriptionScreen.jsx`.
10. **Settings (SET).** **Data & Privacy** top-level: export, delete all, cancel Zeno. Ref: `SettingsScreen.jsx`.
11. **Paywall (PAY).** Monthly/annual + 7-day trial + Family + restore. Ref: `PaywallScreen.jsx`.

**Source of truth:** `Zeno UX Architecture.html` §02–§05, `ui_kits/app/*.jsx`.

**Done when:** all existing features work under the new 5-tab IA in the Zeno brand (light+dark),
with no feature regressions vs today.

---

## Phase 2 — Build the REMAINING designed features

**Goal:** ship the designed-but-unbuilt pieces — including budgeting in full.

**Work:**
1. **Verified cancellation (CXL, Change 4).** Lifecycle states Guided → **Pending verification** →
   **Verified cancelled** / **Still being charged — needs attention**. Re-check engine runs against
   the next email receipt / CSV import / renewal date. Ref: `CancelFlowScreen.jsx`, spec Flow D + cancellation state matrix.
2. **Real charge history (SUB-D, Change 6).** Wire to the historical-spend data already tracked;
   states for none / a few months / long history. Ref: spec §05 charge-history matrix.
3. **Notifications inbox (NOTE — new).** Persistent record of every alert (renewal, trial, hike,
   verification result), each linking to its subscription.
4. **Budgeting add-on (whole spec §06).** Subscription-first, forecast-led, no bank login:
   - **BUD-SET (Free):** set a monthly cap; live forecast from renewal dates; suggested cap.
   - **BUD overview:** forward status hero (projected month-end vs cap), **get-back-under** panel
     that hands a sub into the cancel+verify flow, forecast list of upcoming renewals.
   - **BUD-CAT (Pro):** per-category caps (uses Zeno's existing categories; CSV-enriched "as of [date]").
   - **BUD-ENV (Pro):** manual fund-and-spend envelopes (Goodbudget-style, no import needed).
   - **Income context (optional)** + **BUD-REC monthly recap** → rolls into Wrapped.
   - **Home status card** + **Insights → Budget** entry; alerts reuse notifications + quiet hours.
   - Ref: `BudgetScreen.jsx`, `BudgetRecapScreen.jsx`, spec §06 (screens, flows a–g, state matrix, integrations).

**Done when:** budgeting is usable from tracked subscriptions alone (free tier), a cancellation
can reach a *verified* end state, and detail shows real charges.

---

## Phase 3 — Beat-Rocket-Money differentiators (styled in the design system)

**Goal:** close the trust/coverage gaps the competitive research surfaced (see
`POSITIONING` work / deep-research findings). Every item rendered in the Zeno brand.

- **Apple / Google subscription coverage** — parse App Store / Play receipt emails (the category
  Rocket Money admits it can't see).
- **Data export + frictionless exit** — one-tap export; deepen Change 8 ("your data is yours").
- **Accuracy guards** — duplicate-charge detection; "this looks like a one-off, not a subscription."
- **AI Coach ↔ budget** — "to hit your $X budget, cancel these two → save $Y" (deterministic fallback).

**Done when:** the documented Rocket Money 1-star themes (hard to cancel, can't verify, missed
App/Play subs, lost data, no export) each have a concrete Zeno answer in-product.

---

## Phase 4 — Launch hardening + continuous loop

**Goal:** the unfinished infra ("whatever previous is missing") + staying ahead on new data.

- **Persistence:** replace in-memory server stores (auth, household, Plaid item, sync blobs) with a real DB
  (Render free tier resets memory on restart today).
- **Render env:** `API_HOST=0.0.0.0`, `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL` — so magic-link login works in prod.
- **Web:** full CSP + finish security headers.
- **Auth:** real Google native OAuth client IDs (iOS/Android).
- **Billing:** verify a RevenueCat sandbox purchase end-to-end before launch.
- **Build:** EAS Android build (free quota resets **~Jul 1 2026**; config already correct).
- **Continuous "beat Rocket Money" loop:** quarterly competitive re-scan via the deep-research
  harness; mine our own app-store reviews; keep a short feature-parity tracker.

**Done when:** a tester installs the build, logs in, adds/discovers subs, upgrades in sandbox,
restarts the server, and loses nothing.

---

## Decisions — LOCKED (2026-06-23)

- **D1 — Single brand.** ✅ Retire the 3 generational modes (Pulse/Clarity/Command). Adopt the
  single **Zeno brand** with light + dark only. Phase 0 collapses the 3-mode token system to one.
- **D2 — Pricing (data-anchored).** ✅
  - **No "pay what you want"** — fixed, transparent price (Rocket Money's pay-what-you-want model is a
    documented source of surprise-charge/confusion complaints; this is a deliberate anti-RM trust play).
  - **Zeno Pro: $3.99/mo or $29.99/yr** (annual ≈ 37% off). Undercuts RM's effective **$7–14/mo** by ~half
    for a price-sensitive privacy segment (sourced).
  - **Family: $6.99/mo** (5 members).
  - **7-day free trial WITH a pre-charge reminder** (point our own Free-Trial Guardian at our trial — directly
    answers RM's #1 surprise-charge complaint) + **easy cancel + prorated refund** (anti-RM / anti-FTC-settlement).
  - **Free tier tracks up to 10 subscriptions**, and the **first discovery scan shows ALL found subs even beyond 10**
    (the "aha" is never broken — user picks which 10 to keep free). Conversion triggers: crossing 10, *repeat*
    auto-discovery, Pro tools, category/envelope budgeting. *(The "10" is a product judgment for the
    aha-vs-convert tradeoff, NOT a claimed statistic — tune with real funnel data later.)*
- **D3 — Business / Public API / Partners.** ✅ Remove from consumer nav, but **keep the files / comment the
  route entries** (don't delete) — recoverable later. They're stubs today.

---

## Cross-session note

This plan + the `Zeno Design System/` folder are the durable references. A memory entry points
here so future sessions reuse the same design. When in doubt, open `Zeno UX Architecture.html`
and the matching `ui_kits/app/*.jsx` screen before writing any UI.

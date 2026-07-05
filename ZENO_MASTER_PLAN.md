# ZENO — Master Implementation Plan (Phases 0–5)

**Document purpose:** Single source of truth for a Claude Code agent implementing Zeno's repositioning, monetization, viral-loop, and distribution work. Everything in §2 (Verified Codebase Facts) comes from a code audit run inside the Zeno repo on 2026-07-04. Everything in §1.2 (Market Research) comes from web research run 2026-07-04 with sources named. Anything NOT verified is listed in §3 (Known Unknowns) and MUST be inspected or asked about before use.

---

## 1. Operating Rules for the Implementing Agent (non-negotiable)

1. **Zero guessing.** Never assume anything about the codebase, APIs, dependencies, or UI elements. If a file path, function signature, or component property is not in active context, do not hallucinate it — inspect the file or stop and ask.
2. **Verify before modifying.** Before changing any file: state which file is being changed, then read its exact current contents with tools. Only then edit.
3. **This document may be stale.** File paths and line numbers below were true at audit time (2026-07-04). If the repo has drifted, **the repo wins** — flag the discrepancy, re-verify, then proceed.
4. **Incremental steps only.** No mass rewrites from memory. Each change = smallest reviewable diff. If a task is large, break it into minor steps.
5. **Phase gates are hard.** Do not start a phase whose listed gates are unresolved. Phase 0 items require answers from the founder (Pratik) — ask, don't invent.
6. **Copy strings are locked positioning.** The three onboarding promises ("No bank login. Ever." / "Your data stays on your device" / "Warned before you're charged.") are the product's identity. Every change must be checked against them: nothing may contradict them.

---

## 1.1 Product Context

- **Zeno** = subscription tracker + budgeting app. Monorepo: Expo mobile app, Next.js web, Fastify API.
- **Positioning (already live in-app, verbatim from `apps/mobile/app/index.tsx`):** headline "The honest way to take back your subscriptions."; body "Built for people who refuse to hand a bank login to an app."
- **Strategic thesis:** the personal-finance category's incumbents are hated for three *structural* reasons — subscription price fatigue, bank-sync (Plaid) breakage, and bank-credential privacy fear. Zeno's architecture (local-first SQLCipher DB, no consumer Plaid surface, CSV-first discovery) already avoids all three. The work is: close the gaps where the app contradicts its own promises (Phase 1), monetize in a way that IS the marketing (Phase 2), build share loops (Phase 3), then distribute (Phase 4), then harden (Phase 5).

## 1.2 Market Research Basis (web research, 2026-07-04 — sources named; treat as market signal, not code fact)

| Finding | Detail | Source |
|---|---|---|
| YNAB price pain | $109/yr, no free tier; cost is "the biggest caveat" per a 582-review / 37-subreddit analysis; couples pay $180/yr | aitooldiscovery.com YNAB Reddit guide (May 2026); NerdWallet best-budget-apps (2026) |
| Monarch reliability pain | $99.99/yr; most consistent complaint across subreddits = Plaid bank connections breaking / constant re-auth, esp. smaller banks & credit unions | aitooldiscovery.com Monarch Reddit guide (2026) |
| Privacy demand | Privacy-focused users called "a growing group on Reddit"; trend toward refusing to hand bank login data to third-party apps | getfinny.app Reddit roundup (Apr 2026) |
| Free alternative too technical | Actual Budget (free, self-hosted) "dismissed as too technical for most users"; thread literally asked for options "for us dumb dumbs" | aitooldiscovery.com YNAB Reddit guide (May 2026) |
| Local-first / one-time demand | Analysis of 9,363 Reddit "I wish there was an app" posts: users want local-only, privacy-first, one-time-purchase tools; verbatim ask: "budget app that doesn't connect to my bank account" | digitalbiztalk.com (Jan 2026) |
| Cheap-subscription lane already contested | Finny at $1.99/mo; Budgety at ~$57/yr (early pricing) attack incumbents on price | getfinny.app; mybudgety.com (2026) |
| **Zeno's open lane** | **Local-first + no bank credentials + lifetime pricing** — none of the checked competitors claim this combination | synthesis of the above |
| SERP expectation | Google removed HowTo rich results (2023) and restricted FAQ rich results to a narrow set of sites — keep existing JSON-LD but do not expect rich snippets from it; rankings must come from content quality + internal linking | known platform change; verify current state before relying on it |

---

## 2. VERIFIED CODEBASE FACTS (audit 2026-07-04 — re-verify any line number before editing)

### 2.1 Stack & structure
- **Monorepo:** npm workspaces `["apps/*", "packages/*"]` (root `package.json`). Top level: `apps/` (mobile, web, api), `packages/` (shared, service-catalog), `docs/`, `.github/`, `scripts/`, design-asset dirs (`Zeno Design System/`, `button design/`, `figma buttons/`).
- **Mobile** (`apps/mobile/package.json`): Expo SDK ~56.0.11, React Native 0.85.3, expo-router ~56.2.10, React 19.2.3, expo-sqlite ~56.0.5 (SQLCipher-keyed), zustand ^5.0.13, react-native-purchases ^10.1.2 (RevenueCat), expo-secure-store, expo-local-authentication, expo-auth-session.
- **Web** (`apps/web/package.json`): Next.js ^16.2.6 **App Router** (`apps/web/app/` exists, no `pages/`), React 19.2.3, tailwindcss ^4.3.0, @base-ui/react, motion. No state-management lib, no react-query.
- **API** (`apps/api/package.json`): Fastify ^5.8.5 (run via `tsx src/server.ts`, Node >=20.11.0), pg ^8.22.0 (Postgres, raw — **no ORM**), ioredis ^5.11.1 (rate-limit), zod ^4.1.13, @anthropic-ai/sdk ^0.69.0.
- **Payments:** RevenueCat only. Stripe/Razorpay: **not found** in repo.

### 2.2 Data architecture
- **Source of truth = local device DB.** Encrypted SQLite `zeno.db` (SQLCipher `PRAGMA key`) — `apps/mobile/src/storage/database.ts`.
- **Server Postgres `kv_store`** (`apps/api/src/storage/pg.ts`) holds ONLY: client-side **ciphertext** sync blobs, auth sessions, entitlement cache, households, and AES-256-GCM-sealed Plaid tokens (`sealValue` in same file).
- `SECURITY.md` verbatim: "No plaintext financial data ever lands on the server. The client device's SQLCipher DB is the source of truth for a user's subscriptions."
- **Offline:** full CRUD, analytics, notifications, budgeting work offline (`apps/mobile/src/data/subscription-store.tsx`). Network-dependent (fail gracefully per `apps/mobile/src/api/client.ts` — entitlement fetch null → treated as free): sign-in (magic link / Apple / Google), cloud sync, Plaid connect, AI coach, Family Vault, RevenueCat entitlement refresh.
- **No zero-account use today:** unauthenticated users are redirected to `/login` at `apps/mobile/app/_layout.tsx:144`; only `/` (onboarding) and `/login` are public. API is fail-closed: every route requires a verified RS256 token unless allow-listed (`apps/api/src/auth-guard.ts:13`).

### 2.3 Plaid footprint (exhaustive, per audit)
- **API endpoints** in `apps/api/src/app.ts`: `POST /api/v1/plaid/link-token`, `POST /api/v1/plaid/exchange`, `POST /api/v1/plaid/transactions`, `POST /api/v1/plaid/sandbox/public-token` (dev-only). Logic: `apps/api/src/plaid.ts`.
- **Token storage:** server-side, keyed to user, in-memory by default; mirrored to `kv_store` (namespace `plaid`) only if `STORAGE_ENCRYPTION_KEY` is set, AES-256-GCM sealed; client receives only `itemId`, never the token.
- **Mobile:** single dev-only screen `apps/mobile/app/open-banking.tsx`, NOT linked from any consumer surface (comment at `apps/mobile/app/_layout.tsx:220`). Absent from onboarding/discovery.
- **Web:** marketing page `apps/web/app/features/open-banking/page.tsx` (describes it as optional/read-only) + `/api/v1/open-banking/providers` listing.
- `PLAID_ENV` defaults to `"sandbox"` (`apps/api/src/plaid.ts:5`); unset `PLAID_CLIENT_ID`/`SECRET` → endpoints return 503 "not configured". **Production approval: not found in repo.**
- No dedicated Plaid DB table; shared `kv_store`.

### 2.4 Export / deletion
- CSV export exists: one-tap "Export my data" (fields: name, amount, currency, billingCycle, nextRenewalDate, status, category) — `apps/mobile/app/settings.tsx:103`.
- Device-side deletion exists: "Delete all my data" and "Cancel my Zeno account" both hard-delete local rows via `clearAllSubscriptions` (`DELETE FROM subscriptions`) — `apps/mobile/src/storage/subscription-repository.ts:96`.
- **Server-side / GDPR account-deletion endpoint: NOT FOUND.** No API route erases cloud `kv_store` data.

### 2.5 Onboarding flow & locked copy (verbatim)
Flow: `apps/mobile/app/index.tsx` (onboarding) → `apps/mobile/app/login.tsx` → empty dashboard `apps/mobile/app/(tabs)/dashboard.tsx:94` ("Let's find what you're paying for."; primary "Discover subscriptions", ghost "Add one manually") → `apps/mobile/app/(tabs)/discover.tsx` (CSV "Import bank statement" badged **"MOST COMPLETE"** = primary; "Scan Gmail receipts" = secondary; **Plaid absent**) → `apps/mobile/app/subscription/add.tsx` (search "600+ services").
- Onboarding copy (`index.tsx`): headline "The honest way to take back your subscriptions."; body "Built for people who refuse to hand a bank login to an app."; beats "No bank login. Ever." / "Your data stays on your device" / "Warned before you're charged." Buttons: "Get started" / "Already have an account? Sign in."
- Login tagline (`login.tsx`): "Know what you pay." Magic link ("Send sign-in link") → Apple → Google; age/consent gate required first.
- Paywall (`apps/mobile/app/paywall.tsx`): "Zeno Pro" / "Unlock everything." / "Save more."; hero "Ongoing auto-discovery, 7 and 3-day alerts, cancel guides for 400+ services — and we never see your bank."; CTA "Start 7-day free trial" / "No charge until trial ends · we'll remind you before it does"; social proof "14,000+ people saving money with Zeno."
- **App-store listing metadata: NOT FOUND in repo** (`apps/mobile/app.config.ts` = app name "Zeno" + build/permission config; `eas.json` = build config only).

### 2.6 Feature inventory
- Tabs (`apps/mobile/app/(tabs)/`): dashboard, subscriptions, discover, analytics, calendar.
- Other screens (`apps/mobile/app/`): subscription detail/add/cancel, budget, budget-recap, paywall, coach, wrapped (year-in-review), family, widgets, notifications, settings, profile, security, **spend-twin**, plus **unlinked dormant stubs**: business.tsx, partners.tsx, public-api.tsx, backend.tsx, open-banking.tsx (kept for future B2B; comment `_layout.tsx:220`).
- `src/` modules: api, auth, billing, data, discovery, finance, insights, monitoring, notifications, security, storage, theme, utils, widgets.
- **Budgeting exists (all three forms):** `apps/mobile/app/budget.tsx`, `apps/mobile/src/finance/`, `apps/mobile/src/data/budget-store.ts` — overall monthly cap (free), per-category budgets (Pro-gated), manual envelope allocation (Pro-gated), forecast-vs-actual, monthly recap with **under-cap streak counter** (`apps/mobile/app/budget-recap.tsx`).
- **CSV import exists:** parser `packages/shared/src/csv/recurring.ts` + `packages/shared/src/csv/parse-utils.ts`, wrapped by `apps/mobile/src/discovery/csvParser.ts`. Handles flexible headers; named formats Chase, Bank of America, Wells Fargo, Citi, Capital One + generic; ISO-8601 and US MM/DD/YYYY dates; US (1,234.56) and EU (1.234,56) decimals; parenthesized negatives; infers weekly/monthly/quarterly/annual cadence with a confidence score.
- **Multi-currency: partial.** `Money = {amountMinor, currency}`, `CurrencyCode = USD|EUR|GBP|INR|CAD|AUD` (`packages/shared/src/domain.ts:1`, validated in `packages/shared/src/schemas.ts`). Per-subscription currency stored correctly; **no FX conversion, no cross-currency aggregation; some UI hardcodes `$` (e.g. `budget.tsx` money formatter).**

### 2.7 Pricing / billing (current)
- RevenueCat: client `react-native-purchases`; server verification `apps/api/src/billing.ts` + webhook.
- Fallback display prices `apps/mobile/app/paywall.tsx:19`: Pro $3.99/mo or $29.99/yr ("Save 37%"), Family $6.99/mo (up to 5). Live prices come from the RevenueCat dashboard; code strings are labeled fallbacks.
- Product IDs `zeno_pro_monthly` / `zeno_pro_annual` / `zeno_family_monthly` (`apps/mobile/src/billing/revenueCat.ts:23`).
- Pro-gated: per-category budgets, manual envelopes, AI coach, year-in-review (Wrapped), and (per paywall copy) ongoing auto-discovery + 7/3-day alerts + cancel deep-links.
- Free tier cap: `FREE_LIMIT = 10` at `apps/mobile/app/(tabs)/dashboard.tsx:19` and `apps/mobile/app/subscription/add.tsx:59`; 11th add → paywall.
- **Lifetime/one-time: NOT FOUND.** `BillingPlan = free|pro|family`, `ProBillingPeriod = monthly|annual` (`apps/mobile/src/billing/revenueCat.ts`). Subscription-only today.

### 2.8 Web & SEO (current)
- Domain `https://zeno.app` hardcoded at `apps/web/app/layout.tsx:12`, `sitemap.ts`, `robots.ts`.
- **Hosting: web deployment NOT configured in repo** — `render.yaml` declares only the API service; no `vercel.json`, no web service block.
- Rendering: mostly SSG — home, developers, partners, all `features/*`, all `legal/*`, `cancel/[slug]` (pre-rendered via `generateStaticParams`, **~600 slugs**). `/analytics` is dynamic/SSR and 404s in prod unless `SHOW_PUBLIC_ANALYTICS=1` (`apps/web/app/analytics/page.tsx:9`). `POST /api/waitlist` dynamic.
- Public routes: `/`, `/analytics` (env-gated), `/developers`, `/partners`, `/features/business`, `/features/family-vault`, `/features/open-banking`, `/features/spend-twin`, `/features/widgets-watch`, `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/cancel/[slug]` (~600), `POST /api/waitlist`, `/sitemap.xml`, `/robots.txt`. **No `/cancel` index/hub page exists.**
- SEO state: `sitemap.ts` includes home/features/legal/cancel slugs. `robots.ts` allows all agents + points to sitemap; `/analytics` excluded via page-level noindex. **Canonicals partial**: explicit on root (`alternates.canonical: "/"`) and per-slug cancel guides; `features/*` and `legal/*` lack explicit self-canonicals. Unique meta title/description per page: yes (cancel guides via `generateMetadata`). JSON-LD: Organization + WebSite (root layout), FAQPage (home), HowTo (each cancel guide). OG: shared `/og.png` (1200×630). **Redirects (www/https/trailing-slash): NOT configured in code** — `apps/web/next.config.ts` has no `redirects()`/`trailingSlash`; CSP sets upgrade-insecure-requests only.

### 2.9 State & health
- `apps/mobile/src/monitoring/report.ts`: `captureError()` is a dependency-free **console.error seam — NOT Sentry**; no @sentry package anywhere in repo.
- Dormant unlinked screens (see 2.6). One feature flag off by default: `SHOW_PUBLIC_ANALYTICS`.
- TODO/FIXME/HACK: none found in `apps/web` or `packages`.
- Untracked doc in working tree: `SEO.md`; `docs/PRODUCTION_READINESS.md` is committed.

---

## 3. KNOWN UNKNOWNS — inspect or ask BEFORE relying on (never assume)

**Founder decisions received 2026-07-05 (see §3.1 for the record):** U1/U2/U5 answered ("pre-launch, none true"), U8 answered (show all, cap tracked only), U9 answered ($79.99), U10 answered (keep dormant). Remaining open: U3 (partially resolved by code read — see §3.1), U4 (needs RevenueCat dashboard access), U6, U7.

| # | Unknown | How to resolve |
|---|---|---|
| U1 | Is Zeno live on the App Store / Play Store? Install / active / paying numbers? | **RESOLVED 2026-07-05: not live anywhere. Pre-launch.** |
| U2 | Does zeno.app resolve today? Where is web hosted (if anywhere)? Search Console / analytics connected? | **RESOLVED 2026-07-05: not live. No web hosting yet.** |
| U3 | Does `apps/api/src/billing.ts` + the RevenueCat setup tolerate **anonymous app user IDs** (required for Phase 1 local-only mode)? | **PARTIALLY RESOLVED by code read 2026-07-05** (see §3.1) — client already degrades gracefully to a RevenueCat-native (anonymous) entitlement check when there's no Zeno auth token. Dashboard-side anonymous-ID behavior still unverified. |
| U4 | Can a **non-consumable lifetime product** map to the `pro` entitlement in the current RevenueCat project? | Still open — RevenueCat dashboard access needed (not in repo). Code shows entitlement matching is by string ID (`pro`/`zeno_pro` or product ID) — see §3.1 for exactly what to configure. |
| U5 | Is "14,000+ people saving money with Zeno" (paywall.tsx) true and current? | **RESOLVED 2026-07-05: not current/substantiated (pre-launch). Removing per Phase 1.3.** |
| U6 | What does `apps/mobile/app/spend-twin.tsx` actually do? (Audit names the screen only.) | Read the file before Phase 3 item 4. |
| U7 | Exact behavior of the "Scan Gmail receipts" discovery path (privacy implications for copy audit). | Read `apps/mobile/src/discovery/` before Phase 1 item 3. |
| U8 | Free-cap philosophy: what should FREE_LIMIT be, and should discovery results ever be truncated? | **RESOLVED 2026-07-05: discovery always shows everything found; the cap applies only to actively tracked/alerted subscriptions.** |
| U9 | Lifetime price point — $79.99 is a **recommendation** (≈2.7× the $29.99 annual; undercuts YNAB's $109 *per year* forever), not a decision. | **RESOLVED 2026-07-05: confirmed $79.99.** |
| U10 | Plaid: kill or keep dormant? | **RESOLVED 2026-07-05: keep dormant as-is. No Plaid code/pages touched.** |

### 3.1 Founder decision record (2026-07-05)

- **Plaid (U10):** keep dormant. Phase 1.3 scope narrows to the copy/claim audit only — no changes to `apps/api/src/plaid.ts`, the 4 Plaid endpoints, `apps/mobile/app/open-banking.tsx`, or `apps/web/app/features/open-banking/page.tsx`.
- **Lifetime price (U9):** $79.99 confirmed for Phase 2.1.
- **Free-cap philosophy (U8):** discovery results are always fully visible; `FREE_LIMIT` gates only ongoing tracked/alerted subscriptions, not what's shown from a scan/import. Implements the plan's own Phase 1.4 recommended shape.
- **Launch status (U1/U2/U5):** pre-launch — not on app stores, zeno.app not resolving, "14,000+ people saving money with Zeno" is not a current/real number. Per Phase 1.3 ("Remove or substantiate... per U5"): **removing** the claim from `apps/mobile/app/paywall.tsx` rather than substantiating it.
- **U3 (anonymous RevenueCat IDs), code-verified 2026-07-05:** `apps/mobile/src/billing/revenueCat.ts` — `identifyRevenueCatUser(accountId)` is only called when a Zeno `accountId` exists (post-auth); it is never called for a local-only user, so RevenueCat's SDK falls back to its own auto-generated anonymous device ID. `checkStatus()` calls the server (`getServerEntitlement()` in `apps/mobile/src/api/client.ts`), which 401s for an unauthenticated user; that function returns `null` on a non-ok response (not a throw), so `checkStatus()`'s `if (server && ...)` guard is false and it falls through to `return clientPlan` — the plan read straight from RevenueCat's local `CustomerInfo`. **Conclusion: a local-only (no-account) user can already purchase and have Pro recognized client-side via RevenueCat's native anonymous ID — no code change needed for the purchase path itself.** The gap is server-verified entitlement (used by server-side Pro features like the AI coach, which the plan already keeps auth-gated in 1.1) — that remains unavailable to local-only users, which matches the plan's own scoping, not a new gap.
- **U4 (lifetime→entitlement mapping):** code fact — `getPlanFromCustomerInfo` in the same file checks `activeEntitlements["pro"] / ["zeno_pro"]` OR active-product IDs `zeno_pro_monthly` / `zeno_pro_annual` explicitly. A new `zeno_pro_lifetime` non-consumable product must either (a) be attached to the existing `pro` entitlement in the RevenueCat dashboard — no code change needed, picked up automatically by the entitlement-ID check — or (b) if kept as a separate/no entitlement, needs `zeno_pro_lifetime` added to the product-ID check in `getPlanFromCustomerInfo` (mirroring `hasActiveProduct` calls already there for the two subscription products). **(a) is recommended** — still needs the founder/dashboard to confirm the `pro` entitlement exists and can take a non-consumable attachment; not verifiable from the repo.

---

## 4. PHASED PLAN

Sequencing logic: **fix the hate before driving traffic** (launching into a forced-signup wall wastes any spike) → **monetization before viral push** (capture the spike when it comes) → loops → distribution → hardening.

### PHASE 0 — Verify & Decide (gates; no code)
| # | Gate | Resolves |
|---|---|---|
| 0.1 | Founder answers U1 + U2 (store status, numbers, domain/hosting, Search Console) | Blocks Phase 4 entirely |
| 0.2 | Resolve U3 + U4 (RevenueCat anonymous IDs; lifetime non-consumable mapping) by reading `billing.ts` + dashboard | Blocks Phase 1.1 and Phase 2.1 |
| 0.3 | Founder answers U5 (14,000+ claim) | Blocks Phase 1.3 |
| 0.4 | Founder decides U10 (Plaid kill vs dormant). If KILL: scope = 4 endpoints in `apps/api/src/app.ts`, `apps/api/src/plaid.ts`, `apps/mobile/app/open-banking.tsx`, `apps/web/app/features/open-banking/page.tsx`, `/api/v1/open-banking/providers`, sitemap entry | Blocks Phase 1.3 / 1.5-equivalent cleanup |
| 0.5 | Founder decides U8 (free-cap philosophy) and U9 (lifetime price) | Blocks Phase 1.4 and 2.1 |

**Exit:** all five answered in writing. No later phase starts against an unknown.

### PHASE 1 — Remove the Hate (app must match its own promises)
Goal: a skeptical privacy-focused user cannot catch the app contradicting itself.

**1.1 Local-only mode (no forced account).** ✅ DONE (commit pending)
- Contradiction today: onboarding promises "Your data stays on your device", but `apps/mobile/app/_layout.tsx:144` redirects all unauthenticated users to `/login`, and the API is fail-closed (`apps/api/src/auth-guard.ts:13`) — while §2.2 confirms all core CRUD runs offline on local SQLite.
- Change: add "Continue without an account" on `apps/mobile/app/index.tsx`. Local-only users get: full CRUD, discovery (CSV import path — verify it needs no API call first), budgets, analytics, calendar, notifications, export, delete. Auth-gated (unchanged): cloud sync, AI coach, Family Vault, anything server-side.
- Verify first: `_layout.tsx` routing logic; whether CSV discovery touches the API; RevenueCat anonymous-ID handling (U3) so a local-only user can still buy Pro/lifetime.
- Acceptance: fresh install → skip account → import CSV → see results → set budget → export → delete, all in airplane mode after install.
- **Implementation notes:**
  - Verified `subscription-store.tsx`, `budget-store.tsx`, and `lock-store.ts` have zero `accountId`/`useAuthStore` references — local SQLite, budgets, and app-lock were already fully device-scoped, independent of auth. CSV import (`parseCSV`) and the service catalog are local/bundled — zero API calls. Notification scheduling and widget snapshot are local-only too. This meant the only real blockers were the routing gate and the RevenueCat-binding effect.
  - `authStore.ts`: new `AuthStatus` value `"local_only"`, a `continueLocalOnly()` action, and a SecureStore-persisted flag (`zeno.auth.localOnly.v1`, checked only when no session exists so it never overrides a real login) so the choice survives app restarts. `logout()` and a successful `setAuthenticated()` both clear the flag — so a real login always supersedes it, and exiting local-only mode is a full reset, not a silent fall-through on next launch. 5 unit tests (`authStore.test.ts`) cover the full state-machine (set, restore-across-restart, fallback-to-anonymous when never chosen, flag cleared by logout, real-login-then-logout never resurrects local-only).
  - `_layout.tsx`: new `canUseApp = isAuthenticated || status === "local_only"` drives the routing gate, the lock-overlay render, and the notification/widget-scheduling effect (previously all keyed on `isAuthenticated` alone). RevenueCat-binding effect: previously skipped `initRevenueCat()`/`checkStatus()` entirely whenever `!accountId` — meaning even if this state had existed, purchases would never have been recognized. Now local-only initializes RevenueCat (anonymous device id) and reads the plan client-side; `checkStatus()` already fell back to the client result whenever the server call 401s (verified code fact, §3.1 U3), so this needed no change beyond not skipping it.
  - `index.tsx`: "Continue without an account" as a clearly-labeled secondary link (not a hidden skip), below "Sign in" — routes straight to `/dashboard`.
  - `profile.tsx` / `settings.tsx`: honest copy for local-only — no fake placeholder email, "No account — data stays on this device" in place of an Account ID, "Exit local-only mode" (doesn't delete data) instead of "Sign out", and "Cancel my Zeno account" (which implies deleting server data) is hidden since there's no server account to cancel — "Delete all my data" already covers the local-only equivalent. `cancelAccount()` also guards against calling the server delete endpoint when there's no account (defense-in-depth).
  - Every screen consuming `useAuthStore` was swept for a crash risk on `accountId: null` — `family.tsx` already null-coalesces it; server-gated screens (family, coach, cloud sync) degrade to a graceful failure via existing try/catch-return-null client functions, not a crash — matching "Auth-gated (unchanged)" exactly.

**1.2 Server-side account deletion.** ✅ DONE (commit `76562b9`)
- Today: "Cancel my Zeno account" only deletes local rows (`apps/mobile/src/storage/subscription-repository.ts:96`); cloud `kv_store` (sync blobs, sessions, sealed Plaid tokens, households, entitlement cache) is never purged. Apple requires apps with account creation to offer in-app account deletion that actually deletes.
- Change: new authenticated `DELETE /api/v1/account` in `apps/api` — purge every `kv_store` namespace for the user, revoke sessions, remove Plaid items if any; wire the existing settings action to call it, then run local wipe; confirm irreversibility in UI copy.
- Verify first: full list of `kv_store` namespaces in `apps/api/src/storage/pg.ts` and everywhere `kv_store` is written.
- Acceptance: after deletion, direct DB inspection shows zero rows for that user across all namespaces; old session tokens rejected.
- **Implementation notes:** `sync`/`family`/`auth_*` namespaces aren't keyed directly by userId (composite key, household id, token hash) — added per-module purge functions (`deleteEntitlementForUser`, `deletePlaidItem`, `deleteUserSyncData`, `removeUserFromAllHouseholds`, `revokeAllSessionsForAccount`) that each know their own key shape, called from the new route. Mobile `confirmCancelAccount` now calls the server FIRST and only wipes locally on server confirmation (previously silent server-side no-op). **Residual, not fixed:** a still-valid 15-min access token isn't revoked (stateless RS256 JWT, no revocation list) — pre-existing property of the auth design; refresh tokens ARE revoked immediately, satisfying "old session tokens rejected."

**1.3 Kill trust contradictions (copy + surfaces).** ✅ DONE (commit `76562b9`) — scope narrowed by the Plaid-dormant decision
- ~~Execute the Phase 0.4 Plaid decision across the full footprint~~ — **founder decided keep dormant; zero Plaid files touched.**
- Removed the unsubstantiated "14,000+ people..." block from `paywall.tsx` per U5 (pre-launch, not real) — deleted the claim, its avatar-stack decoration, and 5 now-unused styles, rather than substantiating it.
- Audited mobile + web copy (grep sweep for other stat claims and bank-login-adjacent phrasing): no other contradictions found. Every "no bank login" occurrence affirms the promise.
- Acceptance met: no consumer surface mentions bank login/connection except to say it is not required.

**1.4 Fix the import-vs-paywall collision.** ✅ DONE (commit pending)
- Today: `FREE_LIMIT = 10` (`dashboard.tsx:19`, `add.tsx:59`) can slam a paywall mid-first-import — CSV badged "MOST COMPLETE" can find >10, making the rage moment coincide with the first-value moment.
- Change (per 0.5 decision): discovery results are ALWAYS fully visible; the cap applies only to ongoing tracked/alerted subscriptions; picker UI when over cap.
- **Verify-first finding (repo won over the plan's assumption):** `discover.tsx`'s `addSelected()` called `addSubscription` directly, bypassing `add.tsx`'s cap check entirely — so today's actual bug is the OPPOSITE of what was assumed: bulk discovery-import silently added unlimited items with zero cap enforcement, rather than interrupting mid-scan. The scan/results view (`setResults(...)` in both `handleImportCSV` and the Gmail-scan handler) was already fully un-truncated.
- Implementation: new pure `applyFreeCap(selected, remainingSlots)` helper (`src/discovery/discovery-helpers.ts`, unit-tested) clamps to the first N selected items when over the free cap; `discover.tsx` now shows an honest pre-tap notice + adjusted button label ("Add N of M — Free plan") and, after adding up to the cap, routes to `/paywall` with a toast explaining the rest wasn't added. Pro/family pass `remainingSlots = Infinity` — never clamped.
- Acceptance met: CSV/Gmail results always show everything found; free user's selection is capped only at the add step; paywall appears with honest copy, not mid-scan.

**1.5 Currency honesty.** ⚠️ PARTIALLY DONE (commit pending) — per-item display fixed; aggregate totals explicitly deferred, see below.
- Today: per-item currency stored incl. INR (`packages/shared/src/domain.ts:1`) but `budget.tsx` money formatter hardcodes `$`; totals assume one currency.
- Change: single shared formatter using stored currency everywhere; "home currency" setting; totals/budgets labeled with home currency and mixed-currency items surfaced honestly (excluded-with-notice or listed separately — pick one, consistently). NO FX conversion in this phase.
- Verify first: grep all hardcoded currency symbols/formatters across `apps/mobile` and `apps/web`.
- Acceptance: INR-only dataset shows ₹ everywhere; mixed USD+INR dataset never silently sums across currencies.
- **What "verify first" actually found — the plan's premise was wrong, repo wins:** the assumption was that per-item currency was already varying and only the FORMATTER was hardcoded. In reality: manual add (`subscription/add.tsx`) has no currency picker and `subscription-store.tsx`'s `addSubscription` hardcoded `currency: "USD"` unconditionally; CSV import (`csvParser.ts`) also hardcodes USD (correct — the 5 supported bank formats are all US banks); only Gmail-scan (`emailScanner.ts`'s `detectCurrency`, which finds USD/EUR/GBP) ever detects a non-USD currency — and that detected value was **silently discarded** before ever reaching `addSubscription` (`discover.tsx`'s `addSelected()` never passed it through). So today, literally every subscription in the app is USD regardless of source — the "mixed currency" scenario the acceptance criteria describes couldn't previously occur at all.
- **Fixed (real, verified bugs, not hypothetical):**
  - The currency-discard bug: `CreateSubscriptionInput` now accepts `currency` (`subscription-store.tsx`); `discover.tsx` threads the detected currency through via a new `toCurrencyCode()` validator (`discovery-helpers.ts`, unit-tested) that narrows to the app's supported `CurrencyCode` union, falling back to USD for anything unrecognized.
  - Per-item display consolidated onto the existing (already-correct, previously under-used) `formatMoney`/new `currencySymbol` helpers (`apps/mobile/src/utils/format.ts`) in: `discover.tsx` results list, `notificationService.ts` renewal-reminder bodies (threaded currency through `_layout.tsx`'s and `subscription/[id].tsx`'s notification-subscription builders), `subscription/[id].tsx`'s edit-form currency prefix, `budget.tsx`'s per-subscription cut-candidate row, `subscriptions.tsx`'s list row, and — found only by grepping every `formatMoney(` call site, not just the original hardcoded-`$` list — two real bugs in `analytics.tsx` (list row + its accessibility label) and **six** in `insightsEngine.ts` (unused/duplicate/trial-ending/cancellation-reminder/spend-summary insight messages), all of which silently said "$" for a non-USD subscription's own insight.
  - Caught and fixed one bug this work would otherwise have introduced: `detectAnnualSavings` compares a subscription's amount against the service catalog's `defaultAnnualPrice`, which has no currency field (i.e. is implicitly USD-only) — once non-USD subscriptions can exist, that comparison is meaningless for them. Now skipped for non-USD subscriptions rather than shown with a currency label slapped on a wrong number.
  - 9 new unit tests across `insightsEngine.test.ts`, `discovery-helpers.test.ts`, and a new `format.test.ts`.
- **Explicitly NOT done — deferred, not silently skipped:** AGGREGATE totals (dashboard's `totalMonthlyMinor`, `budget.tsx`/`budget-recap.tsx`'s forecast/cap/headroom, `analytics.tsx`'s category breakdown and grand total, `coach.tsx`, `spend-twin.tsx`, `wrapped.tsx`, and `packages/shared`'s `createSpendSummary`/`createAnalyticsSnapshot`/`createSpendTwin`) still sum raw minor-unit numbers across all active subscriptions regardless of currency, and `family.ts`'s server contract (`FamilyMember.monthlySpendMinor: number`) has zero currency context at all. Verified this is genuinely large: touches the shared package's core summary functions, the server API contract, and 6+ mobile screens — not a formatter swap. Given non-USD subscriptions were, until this fix, never actually created, mixed-currency aggregates are now possible but still rare (only via Gmail-detected EUR/GBP receipts). **Recommend as a follow-up, not invented here**: decide exclude-with-notice vs. list-separately (the plan's own open choice) before touching the shared summary functions, since that redesign has real product-shape decisions and a much bigger blast radius than this pass.
- A "home currency" setting was also not built — there is no settings persistence precedent for it beyond the generic `app_meta` key-value store (`readAppMeta`/`writeAppMeta`, already used for notification prefs/quiet hours/price history); a home-currency preference would follow that same pattern if/when the aggregate-totals follow-up above is picked up.

**Phase 1 exit:** a no-account user can install → import → see everything found → budget, fully offline — and deleting removes everything locally AND server-side in two taps. **Status: 1.1–1.4 fully done; 1.5 partially done** (per-item currency display is honest everywhere; aggregate-total currency-mixing is a scoped, documented follow-up, not silently dropped).

### PHASE 2 — Pricing People Don't Hate
**2.1 Lifetime SKU** ✅ CODE DONE (commit pending) — one manual dashboard step remains, see below. Price $79.99 confirmed with the founder 2026-07-05.
- Touchpoints (from §2.7): product list `apps/mobile/src/billing/revenueCat.ts:23` (+ new `zeno_pro_lifetime` non-consumable), `BillingPlan`/period types, server mapping + webhook in `apps/api/src/billing.ts`, third card on `apps/mobile/app/paywall.tsx`.
- Verify first: U4 (dashboard mapping); how `billing.ts` normalizes RevenueCat events for non-subscriptions; restore-purchases path.
- Acceptance: sandbox purchase of lifetime → `pro` entitlement active, survives reinstall + restore, webhook recorded server-side, paywall shows three options with lifetime framed against "YNAB is $109 every year".
- **Verify-first finding that changed the implementation — read the actual `react-native-purchases` SDK type declarations (not assumed):** a non-consumable (lifetime) purchase does **not** appear in `CustomerInfo.activeSubscriptions` or `.subscriptionsByProductIdentifier` — those track subscriptions only. It appears in `allPurchasedProductIdentifiers` instead (once bought, always owned — no expiry concept). A naive copy of the existing `hasActiveProduct` check (built for the two subscription SKUs) onto the lifetime product would have silently never recognized a lifetime purchase client-side. Added a separate `hasNonConsumableProduct()` check instead.
- **Implementation (dashboard-configuration-agnostic by design — works whether or not the lifetime product is attached to the `pro` entitlement in RevenueCat):**
  - `revenueCat.ts`: `zeno_pro_lifetime` added to `revenueCatProductIds`; `ZenoOfferings.proLifetime` sourced from the SDK's dedicated `offering.lifetime` slot (confirmed in the type declarations, mirroring the existing `.monthly`/`.annual` pattern); new `purchaseLifetime()` (mirrors `purchaseFamily()` — no "period" concept for a one-time purchase); `getPlanFromCustomerInfo` grants `pro` if EITHER the entitlement is active (works if the dashboard attaches the product to `pro`/`zeno_pro`, since RevenueCat documents `expirationDate: null` for lifetime access) OR the new non-consumable check finds it (works even if it isn't attached to an entitlement).
  - `billing.ts` (server) needed **no code changes** — verified `planFromEntitlements` already treats `expires_date: null` as active-forever, and `applyWebhookEvent`'s downgrade check only fires for EXPIRATION/CANCELLATION/SUBSCRIPTION_PAUSED event types, none of which a non-consumable purchase ever sends. This is conditional on the dashboard step below.
  - `paywall.tsx`: third toggle option ("Lifetime", priced live via the existing `getPackagePrice` pattern, fallback $79.99), CTA and subtext branch per selection ("Buy once for $X" / "One-time payment · no recurring charge, ever" — no free-trial claim, since App Store/Play Store don't offer trials on non-consumables), and the YNAB-anchor line ("YNAB charges $109 — every single year. This is once, ever.") shown only when lifetime is selected.
  - Tests: 3 new cases in `revenueCat.test.ts` (lifetime granted via `allPurchasedProductIdentifiers`, not granted from subscription-only fields alone, works alongside the entitlement path) + 2 in `billing.test.ts` (`planFromEntitlements` with `expires_date: null`, an `INITIAL_PURCHASE` webhook with no `expiration_at_ms`).
- **One manual step outside this repo, not code-fixable:** confirm in the RevenueCat dashboard that `zeno_pro_lifetime` is configured as a non-consumable product (App Store/Play Store) — attaching it to the `pro`/`zeno_pro` entitlement is recommended (makes the server REST/webhook path work with zero further code) but not required for the client to recognize it, since `hasNonConsumableProduct` covers that case independently.

**2.2 Re-draw gates around the growth loop.** ✅ VERIFIED ALREADY TRUE — no code change needed.
- Move **Wrapped (year-in-review) from Pro-gated → free** (`apps/mobile/app/wrapped.tsx` + wherever the gate lives — find it, likely entitlement checks near `src/billing/`): a paywalled share artifact is a growth engine with the engine removed. Keep Pro on tools: per-category budgets, envelopes, AI coach, ongoing auto-discovery, 7/3-day alerts, cancel deep-links.
- **Verify-first finding: the premise was wrong — there is no Pro gate on Wrapped anywhere in this repo, and never was.** Checked `wrapped.tsx` (no plan/auth reference at all), its only entry point in `settings.tsx:186` (an unconditional row in the "Household & tools" section, not wrapped in any `plan === "free"` check), `_layout.tsx`'s route registration (no gate), and `paywall.tsx`'s copy (zero mention of Wrapped/Year-in-Review as a Pro feature, so it isn't even marketed as gated). `buildYearInReview()` (`packages/shared`) is a pure function over `Subscription[]` with no auth/plan dependency, and `useSubscriptionStore()` already works fully for local-only users (Phase 1.1). So the acceptance criterion was already met before this session started.
- Acceptance: free account (and local-only user) can open and complete Wrapped end-to-end. **Met — verified, not changed.**

**2.3 Paywall copy pass.** ✅ DONE (same commit as 2.1) — folded in since it's the same screen/diff.
Add lifetime anchor framing; KEEP and elevate the existing honest-trial line ("No charge until trial ends · we'll remind you before it does") — it is the anti-dark-pattern this category is hated for.
- The monthly/annual trial line is **unchanged** (kept, per the instruction). Lifetime gets its own distinct honest line rather than reusing trial language that doesn't apply to a one-time purchase: "One-time payment · no recurring charge, ever."

**Phase 2 exit:** three-way paywall (monthly / annual / lifetime) purchasable end-to-end in sandbox; Wrapped free. **Status: all three items done** — 2.1/2.3 code-complete pending the one RevenueCat dashboard step noted above (not code); 2.2 was already true.

### PHASE 3 — Build the Viral Loops (in-product, BEFORE traffic)
All cards: client-rendered from the existing design system (design tokens live in repo per §2.1 asset dirs — locate the mobile theme module `apps/mobile/src/theme` and reuse), small Zeno wordmark watermark, deep link on every card (store links until Phase 4 ships web).

**3.1 "Found money" card** — post-import in the `discover.tsx` flow: "Zeno found ₹X/year I forgot I was paying." Fires at minute one; the single most shareable number the app produces. Verify first: what the import-results screen currently renders and where annualized totals are computed (`src/finance/` or `src/insights/`).
**3.2 Wrapped share cards** (`wrapped.tsx`, now free): total annual spend, top forgotten subscription, weirdest recurring charge — one designed card per stat, native share sheet.
**3.3 Budget streak card** — `budget-recap.tsx` already has an under-cap streak counter; add "N months under budget" share card. Streak = retention mechanic + recurring share trigger.
**3.4 spend-twin evaluation** — read `apps/mobile/app/spend-twin.tsx` FIRST (U6); only if it supports a "people like you pay X" comparison safely (no server dependency violating local-only) spec a share card; otherwise skip.
**Acceptance:** each loop = designed card via native share sheet in ≤2 taps; zero network required to render (local-only users included).

### PHASE 4 — Distribution (only after Phases 1–3)
**4.1 Deploy the web app — HARD BLOCKER.** No web deploy exists (`render.yaml` = API only). Deploy `apps/web` (host per founder; Vercel is the default fit for Next.js App Router), point zeno.app, connect Search Console + analytics. Nothing below starts until zeno.app resolves.
**4.2 Redirect + canonical hygiene.** Add apex/www + trailing-slash 301s (host-level or `next.config.ts` `redirects()` — currently absent); add explicit self-canonicals to all `features/*` and `legal/*` pages (root + cancel guides already have them).
**4.3 /cancel hub.** ~600 `cancel/[slug]` pages exist with NO index page — the biggest existing SEO asset is orphaned. Build `/cancel` hub: category clusters, search/filter, related-guide cross-links on every guide, BreadcrumbList JSON-LD, hub added to sitemap. Expectation: rankings come from guide quality + internal linking, not the HowTo markup (see §1.2 SERP row).
**4.4 Complaint-language landing pages.** One page = one incumbent + one verified complaint (§1.2 is the keyword list): "subscription tracker without bank login" · "budget app that doesn't connect to your bank" · "Rocket Money alternative without Plaid" · "Monarch alternative — no bank sync to break" · after 2.1 ships: "YNAB alternative one-time purchase" (a claim only Zeno can honestly make among checked competitors). Each: unique meta, self-canonical, honest comparison table, CTA to stores.
**4.5 ASO.** Commit store metadata (none in repo — §2.5): title/subtitle/description built from the three promises + lifetime pricing; screenshots from the Phase 3 card designs.
**4.6 Launch moments.** Product Hunt with lifetime pricing as the hook; founder-disclosed participation in the exact communities from §1.2 (r/ynab "alternatives" threads, privacy-focused budget threads). No astroturfing — this audience detects it and it becomes the story.
**Phase 4 exit:** site live, clean crawl (redirects + canonicals verified), hub indexed, ≥5 comparison pages published, store listings rewritten, one coordinated launch executed.

### PHASE 5 — Harden & Compound
**5.1 Real crash reporting** — replace the intentional console.error seam (`apps/mobile/src/monitoring/report.ts` — NOT Sentry today) with actual monitoring (Sentry or equivalent) **before Phase 4 traffic lands** (may run parallel to Phase 4 prep).
**5.2 FX conversion** for true multi-currency totals — schema is ready (`domain.ts`); add rate source + home-currency aggregation; upgrade the Phase 1.5 honest-labeling into real conversion.
**5.3 Funnel instrumentation** (privacy-respecting, aggregate-only, consistent with positioning): import completion rate, share-card generation rate, free-cap hit rate, paywall→purchase by SKU. Revisit the 0.5 cap decision with this data.
**5.4 Iterate pricing/gates from conversion data**, not opinion. Includes evaluating whether lifetime price moves after launch-window pricing.

---

## 5. Definition of Done (whole plan)
1. Fresh install, airplane mode, no account: import → track → budget → share card → export → delete (local) all work.
2. Authenticated user: account deletion provably purges server data.
3. Paywall: monthly / annual / lifetime all purchasable; Wrapped free.
4. zeno.app live: 301-clean, canonical-complete, /cancel hub + ≥5 complaint-language pages indexed.
5. Store listings aligned to the three promises; every public claim verifiable.
6. Crash reporting + aggregate funnel metrics live.
7. Zero copy anywhere contradicting: "No bank login. Ever." / "Your data stays on your device" / "Warned before you're charged."

## 6. How to run this document
Work one phase per Claude Code session (or smaller). Per session: (1) restate the phase items being attempted, (2) re-verify every file path/line cited here against the live repo before editing, (3) implement as minimal diffs, (4) report acceptance-criteria status + any §3 unknowns resolved, updating this file's Known Unknowns table. If the repo contradicts this document anywhere — repo wins, flag it, update the doc.

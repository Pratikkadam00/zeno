# Zeno — Remaining Work (Phased Plan)

Status snapshot: the consumer app is **feature-complete and green** (full typecheck clean,
123/123 tests, CI gating every push). What remains is mostly **not coding** — store/build/
infra provisioning, on-device QA, and pre-scale hardening — plus two real UI gaps and a few
optional code tasks.

Legend — **Owner:** 🧑 you (account/infra/decision) · 🤖 Claude (code I can do now) · 👥 both.
Every item is grounded in the codebase; nothing speculative. The one explicitly *won't-fix*
item is called out as such.

---

## Phase 0 — Decisions & prerequisites (unblocks everything)
**Goal:** make the choices the rest of the plan depends on. **Owner: 🧑**
- [ ] Confirm launch surface order (Android first — iOS needs an Apple Developer acct + build).
- [ ] Decide datastore: Render Postgres is already wired in `render.yaml` — approve provisioning.
- [ ] Decide whether to add a **web/Stripe purchase path** later, or stay IAP-only (RevenueCat).
  *(Today: IAP-only; see "By design" below.)*
- [ ] Decide if **B2B stubs** (business / public-api / partners) stay future-only for v1 (default: yes).

**Done when:** these four answers are written down; no code depends on guessing them.

---

## Phase 1 — Code completion (the clean tasks I can do now) — Owner: 🤖
**Goal:** close the real in-app gaps and CI hole. No external decisions needed.
- [ ] **Profile screen.** `Settings → Profile` is a no-op with no screen ([settings.tsx:140](../apps/mobile/app/settings.tsx#L140)).
      Build a profile screen (email, plan, sign-out, manage-account) and wire the row.
- [ ] **App-icon screen.** `Settings → App icon` is a no-op ([settings.tsx:149](../apps/mobile/app/settings.tsx#L149)).
      Either build an alternate-icon picker (`expo-alternate-app-icons`) or remove the row honestly.
- [ ] **CI dependency audit.** `.github/workflows/ci.yml` runs typecheck + tests but no `npm audit`.
      Add a non-blocking `npm audit --audit-level=high` step (Expo transitive advisories noted).
- [ ] **On-device verification of the new app-lock** (set PIN, background/foreground, biometric,
      lockout, sign-out). Code is typecheck-clean but unrun on a device.

**Done when:** no dead Settings rows remain, CI surfaces vulns, app-lock verified on a device.

---

## Phase 2 — Backend provisioning & deploy — Owner: 🧑 (🤖 wrote the code/config)
**Goal:** turn on durability + secrets in production.
- [ ] Provision **Render Postgres** (re-sync the Blueprint, or add the DB + `DATABASE_URL`).
- [ ] Set **`STORAGE_ENCRYPTION_KEY`** (32-byte hex) so Plaid tokens persist (AES-256-GCM); else
      they stay in-memory by design.
- [ ] Set production secrets in Render: `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`, `RESEND_API_KEY` +
      `RESEND_FROM_EMAIL`, `REVENUECAT_SECRET_KEY` + `REVENUECAT_WEBHOOK_AUTH`, Google/Apple client IDs.
- [ ] Set **`TRUST_PROXY_HOPS`** if Render uses more than 1 proxy hop (default 1 is correct for Render).
- [ ] Verify boot: `/api/v1/health` 200, Postgres rehydrate log line appears.

**Done when:** a redeploy no longer drops sessions/sync/entitlements; secrets are out of any `.env`.

---

## Phase 3 — Payments & store setup — Owner: 🧑 (code is ready)
**Goal:** make Pro/Family actually purchasable. Payments are **App Store / Google Play IAP via
RevenueCat** — Zeno never touches a card. ([revenueCat.ts](../apps/mobile/src/billing/revenueCat.ts))
- [ ] Create the 3 products in **App Store Connect** and **Google Play Console**:
      `zeno_pro_monthly`, `zeno_pro_annual`, `zeno_family_monthly`.
- [ ] Link them in the **RevenueCat dashboard**; set entitlements `pro` / `family`.
- [ ] Set public SDK keys: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
- [ ] Configure the RevenueCat **webhook** → `/api/v1/billing/webhook` with `REVENUECAT_WEBHOOK_AUTH`.
- [ ] Test a sandbox purchase end-to-end → server entitlement flips to pro/family.

**Done when:** a sandbox purchase unlocks Pro and the server verifies it independently.

---

## Phase 4 — Builds — Owner: 🧑
**Goal:** produce installable apps.
- [ ] **EAS Android build** (task in progress). Blocked by the **free EAS build quota** — per the
      deployment notes it resets ~**Jul 1 2026**; until then build locally via Gradle, upgrade, or wait.
- [ ] **iOS build** (needs Apple Developer account + signing) — not yet attempted.
- [ ] Smoke-test each build against the live API.

**Done when:** signed Android (and iOS, if in scope) builds install and reach the API.

---

## Phase 5 — Full QA / verification — Owner: 👥
**Goal:** prove every flow works on real devices (tasks #34/#35).
- [ ] Drive every UI flow on device; confirm each API endpoint returns 200.
- [ ] Fix bugs found on the spot; re-run typecheck + tests; push.
- [ ] Verify discovery (Gmail scan, CSV import), cancellation loop, budgeting, coach, family,
      widgets, wrapped, paywall/purchase, app-lock.

**Done when:** a full manual pass is clean and any fixes are committed.

---

## Phase 6 — Security & scale hardening (pre-traffic) — Owner: 👥
**Goal:** the SECURITY.md "before scale" checklist. None block a soft launch; all matter before real traffic.
- [ ] **Redis-backed rate limiter** (multi-instance). trustProxy is fixed; the store is still in-memory.
      🤖 can scaffold behind a `REDIS_URL` flag (inert until set).
- [ ] **Web CSP nonce** for `script-src`/`style-src` (needs live testing; no current XSS sink).
- [ ] **Secrets manager / KMS** for production + **encryption-key rotation**.
- [ ] **Monitoring/alerting** on 401/429 spikes and error rates.
- [ ] **Key rotation** for anything ever shared in plaintext.
- [ ] **Mobile cert/key pinning** (optional defense-in-depth).
- [ ] **Pen-test / external security review** before public launch.

**Done when:** rate limiting is shared-state, monitoring is live, and a review has signed off.

---

## Phase 7 — Launch & post-launch — Owner: 🧑
- [ ] Replace web "Coming soon to iOS & Android" with real store links ([sections.tsx:416](../apps/web/components/site/sections.tsx#L416)).
- [ ] Store listings, screenshots, privacy nutrition labels (privacy/terms pages already exist).
- [ ] Staged rollout; watch monitoring + RevenueCat; iterate from Phase 5 QA findings.

---

## By design — NOT being "fixed" (stated honestly)
- **Server-side free-tier (10-sub) enforcement.** The server stores client-encrypted blobs it
  cannot read, so it can't count subscriptions without breaking the E2E-encryption model that is
  the product's core promise. The limit stays client-side; gate a *Pro feature* on the verified
  entitlement if revenue enforcement is needed.

---

## What is already DONE (so the plan reads honestly)
Audit remediation (app-lock real, rate-limit proxy keying, entitlement TTL, vectorClock bound,
family code hardening + per-owner cap, constant-time OTP, demo-cred gating, expiry sweep, public
analytics gated); Postgres persistence + AES-256-GCM Plaid encryption; web CSP resource directives;
CSV quarterly + charge-history fixes. All green: typecheck clean, 123/123 tests, CI enforced.

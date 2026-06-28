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

## Phase 1 — Code completion (the clean tasks I can do now) — Owner: 🤖 ✅ DONE (84a0e33)
**Goal:** close the real in-app gaps and CI hole. No external decisions needed.
- [x] **Profile screen.** Built `app/profile.tsx` (email, plan + manage, app-lock status, account
      id, privacy note, sign out); wired the Settings → Profile row; registered in the stack.
- [x] **App-icon row.** Removed honestly — no alternate-icon assets exist, so the row advertised a
      feature that did nothing. (Revisit as a real picker only once alternate icons are designed.)
- [x] **CI dependency audit.** Added `npm audit --audit-level=high` to `.github/workflows/ci.yml`
      (gates on high/critical; current Expo moderate/low advisories reported, not fatal).
- [ ] **On-device verification of the app-lock + Profile** (set PIN, background/foreground,
      biometric, lockout, sign-out; open Profile). Code is typecheck-clean but **unrun on a device**
      — folded into Phase 5 device QA (deploy later).

**Verified:** full typecheck clean, 123/123 tests, audit gate exits 0. Device QA pending.

---

## Phase 2 — Backend provisioning & deploy — Owner: 🧑 (🤖 code/config DONE)
**Goal:** turn on durability + secrets in production. **Code/config side is complete** — the
Blueprint, persistence, encryption, a boot-log readiness line, and a smoke test are all in. What
remains is dashboard actions only you can do.

**Runbook (do in order, in the Render dashboard):**
1. **Provision Postgres.** New → Blueprint → this repo (creates `zeno-db` + auto-wires
   `DATABASE_URL`). For an existing service: add a free Postgres, then set `DATABASE_URL` from its
   *Internal* connection string.
2. **Generate + set `STORAGE_ENCRYPTION_KEY`** (enables encrypted Plaid-token persistence):
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` → paste into Render.
   Don't paste the key into chat. Without it, Plaid tokens stay in-memory by design.
3. **Set the remaining `sync:false` secrets** (already listed in `render.yaml`): `JWT_PRIVATE_KEY`/
   `JWT_PUBLIC_KEY` (RS256 PEM — already generated locally), `RESEND_API_KEY` + `RESEND_FROM_EMAIL`,
   `REVENUECAT_SECRET_KEY` + `REVENUECAT_WEBHOOK_AUTH`, Google/Apple client IDs. (Plaid/Anthropic/Groq optional.)
4. **`TRUST_PROXY_HOPS`** — leave unset (defaults to 1 in prod, correct for Render); set only if more hops.
5. **Deploy** (autoDeploy on push, or manual).

**Verify (no secrets needed):**
- Render boot log shows: `[zeno] persistence=postgres token-encryption=on env=production`
  and `[pg] storage ready — rehydrated N record(s)`.
- `npm run smoke https://<your-api>` → all 4 checks pass (health 200, auth-guard 401, catalog 200).
- Redeploy once and confirm you stay logged in (sessions/sync survived).

**Done when:** the boot log shows `persistence=postgres`, smoke passes, and a redeploy no longer
drops sessions/sync/entitlements; all secrets live in Render, not in any `.env`.

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

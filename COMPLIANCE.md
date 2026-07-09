# Zeno — Legal & Privacy Compliance

> ⚠️ **Not legal advice.** This is an engineering compliance posture written by the
> dev team to track what Zeno does with data and what's required before a public
> launch. It is **not** a substitute for a lawyer. Before you launch publicly —
> and especially before you collect data from real users at scale — have a
> privacy lawyer (or a service like Termly / iubenda / TerraTrue / Osano) review
> the app, the data flows, and the Privacy Policy / Terms.

Last reviewed: 2026-06-15

---

## 1. The short version

Zeno is **privacy-first by design**, which makes compliance much easier:

- Sensitive financial data (your subscriptions, amounts, renewals) is stored
  **encrypted on the device**, not on Zeno servers.
- Cloud sync is **not enabled at launch**. The sync endpoints exist but store an
  opaque payload without client-side end-to-end encryption yet, so we do not
  advertise or rely on "encrypted sync" until P6 ships real E2E encryption.
- We **never** ask for or store bank login credentials.
- We **don't sell** personal data and don't use it for third-party ad targeting.

This document tracks the regulations that still apply and the concrete controls
in the codebase.

---

## 2. Data inventory (what we collect, where it lives, who sees it)

| Data | Where stored | Shared with | Notes |
|---|---|---|---|
| Email address | Auth provider / server | Email delivery provider | For sign-in (magic link / Apple / Google) + waitlist |
| Subscriptions, amounts, renewals, notes | **On device** (encrypted SQLite/SQLCipher) | No one | Never uploaded in plaintext |
| Sync payload | Server | No one | Sync **disabled at launch**; not yet client-side encrypted (E2E deferred to P6) |
| Plan / entitlement status | Server + RevenueCat | RevenueCat (billing) | No card numbers — handled by app stores |
| AI coach input | Sent per-request to AI provider (Groq) | AI provider | Subscription **summary only** — no name/email/bank data, no email-discovered items; consent-gated |
| Bank transactions | On device, via aggregator | Plaid (planned) | **Planned/optional, not enabled**; Zeno never sees bank credentials |
| Diagnostics / crash logs | Sentry (only if enabled) | Sentry | Inert until DSN set; aggregated, no subscription contents; no product analytics |

---

## 3. Under-13 / minors (COPPA, the thing you asked about)

**Risk:** US COPPA imposes heavy obligations (verifiable parental consent, etc.)
on services that are *directed to children under 13* or that *knowingly collect*
data from them. The well-publicized fines come from apps that ignored this.

**Zeno's posture:** Zeno is a personal-finance tool **not directed to children**,
with a stated minimum age and an age gate.

Controls in place:
- ✅ **Age gate at sign-in** — users must check "I'm at least 16 and agree to the
  Terms & Privacy Policy" before any sign-in method is enabled
  (`apps/mobile/app/login.tsx`, `MINIMUM_AGE = 16`).
- ✅ **Privacy Policy "Children's Privacy" section** states the Service is for users
  16+ (13+ only where local law permits with consent) and that we don't knowingly
  collect from children, with a deletion contact
  (`apps/web/app/legal/privacy/page.tsx` §9).
- ✅ App is **not designed, marketed, or themed for children** (finance tool).

Before launch:
- [ ] Confirm the minimum age with counsel for your launch markets. **18+** is the
  safest for a money app; 16+ also avoids COPPA. Lowering below 13 is strongly
  discouraged. Change `MINIMUM_AGE` if counsel advises.
- [ ] In **app-store age ratings**, rate the app accordingly (e.g., 17+/Teen) and
  do **not** opt into "made for kids" / Designed-for-Families.
- [ ] Keep marketing imagery and copy non-child-directed.

---

## 4. GDPR / UK GDPR (EU/EEA/UK users)

| Requirement | Status |
|---|---|
| Lawful basis (contract / consent / legitimate interest) | ✅ Described in Privacy Policy §3 |
| Data minimization | ✅ On-device-first architecture |
| Right to access / export | ⚠️ Partial — local data is user-visible; add an in-app **export** (CSV/JSON) before launch |
| Right to erasure | ✅ "Delete all data" in Settings + uninstall; ⚠️ add server **account deletion** (see §6) |
| Consent for optional processing (Gmail scan, analytics, AI coach) | ✅ Opt-in by design; ⚠️ ensure each is genuinely opt-in with clear UI |
| Data Processing Agreements with sub-processors | [ ] Sign DPAs with each provider (email, RevenueCat, Plaid, AI provider, analytics) |
| EU representative / DPO (if thresholds met) | [ ] Assess with counsel |

---

## 5. CCPA / CPRA (California) and other US state laws

- ✅ Privacy Policy discloses categories collected, purposes, and that we **don't
  sell/share** personal data.
- [ ] Add a "Do Not Sell or Share My Personal Information" statement/link if any
  data sharing ever qualifies as a "sale/share" (currently none).
- [ ] Provide the access/delete request channel (already: `privacy@zeno.app`).

---

## 6. App Store requirements (Apple & Google) — launch blockers

These are hard requirements; the app **will be rejected** without them.

| Requirement | Status |
|---|---|
| **Working Privacy Policy URL** (not example.com) | ✅ Mobile now links to `https://zeno.app/legal/privacy` & `/legal/terms` — ⚠️ the web app **must be deployed at that domain** |
| **Apple Privacy "Nutrition Labels"** (App Store Connect) | [ ] Fill out: email (contact), purchases (plan), identifiers, diagnostics; declare data **not** linked to identity where true |
| **Google Play Data Safety form** | [ ] Mirror the same disclosures |
| **In-app account deletion** (Apple guideline 5.1.1(v)) | ⚠️ Settings has "Delete all data" + sign-out; add an explicit **Delete account** that also removes server-side account/sync data |
| Age rating questionnaire | [ ] Complete honestly (see §3) |
| Sign in with Apple (if offering other social logins) | ✅ Apple sign-in present alongside Google |
| Permission usage strings (FaceID, notifications) | ✅ Set in `app.config.ts` |

---

## 7. Third-party / feature-specific obligations

**Plaid (optional bank connect)** — if enabled in production:
- [ ] Surface Plaid's end-user privacy notice in the connect flow.
- [ ] Comply with Plaid's developer policy and data-use limits.
- [ ] Keep it opt-in; never required to use the app.

**AI coach (Groq / Anthropic)** — ✅ disclosed in Privacy Policy §6:
- ✅ Only an anonymized subscription **summary** is sent (no name/email/bank).
- ✅ A **constitution + security layer** keeps it on-topic and resistant to misuse
  (`apps/api/src/ai-coach-constitution.md`).
- [ ] Confirm the chosen provider's data-retention / no-train terms for API data
  and reflect them if needed.

**Gmail scan (optional)** — ✅ read-only, on-device, opt-in, disconnect anytime
(Privacy Policy §5). [ ] If you use restricted Google scopes, you may need a
**Google CASA security assessment** before production OAuth verification.

**RevenueCat / billing** — ✅ no card data stored by Zeno; handled by app stores.

---

## 8. Pre-launch checklist (do these before public release)

1. [ ] **Lawyer review** of Privacy Policy, Terms, and data flows.
2. [ ] **Deploy the web app at `https://zeno.app`** so the legal links resolve
   (App Store review checks them).
3. [ ] **Finalize the Privacy Policy** (remove the "pre-launch / waitlist" notice,
   set the real entity name + address, confirm sub-processor list).
4. [ ] **Add in-app account deletion** (server account + sync wipe), not just local.
5. [ ] **Add data export** (CSV/JSON) for GDPR access requests.
6. [ ] **Fill app-store privacy disclosures** (Apple labels + Play Data Safety).
7. [ ] **Set age rating** and confirm `MINIMUM_AGE` with counsel.
8. [ ] **Sign DPAs** with all sub-processors; confirm AI-provider data terms.
9. [ ] Decide on **analytics**: if added, make it opt-in in the EEA and disclose it.
10. [ ] If Plaid/Gmail restricted scopes go live, complete the relevant **provider
    security reviews** (Plaid policy, Google CASA).

---

## 9. What's already done in code (this pass)

- Age + consent gate at sign-in (16+), gating every auth method.
- Real legal URLs in the app (`zeno.app/legal/...`) replacing `example.com`.
- Privacy Policy updated to disclose the AI coach and optional bank aggregator.
- AI coach constitution + anti-jailbreak/scope security layer.
- Privacy-first architecture: on-device encryption, no bank credentials, no data
  sale. (Cloud sync stays disabled until P6 ships real end-to-end encryption.)

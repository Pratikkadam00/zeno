# Owner actions — only the things that need you

Everything I could do myself is done (the fix pass, FX, closed 2026-10-02). This file
holds only what needs **your** account, **your** decision, or **your** device. Each
item says exactly what to do and what I do once you have. Evidence for every
recommendation is linked; nothing here is from memory.

**How I chose recommendations (your rule, 2026-10-02):** good for the user and good for
the business, never feeling off to the user, and where there's slack, tilted to our
side, modelled on what large companies verifiably do today.

Finding numbers (F…) point to rows in `docs/HARDENING_LOG.md` for the full detail.

---

## 1. Account actions (minutes each)

| # | Do this | Where | Why |
|---|---|---|---|
| F7 | Protect `main`: require the CI and CodeQL checks; block force-push and deletion | GitHub → Settings → Branches (steps in the P0.6 log entry) | Anything can land on, or erase, the branch that auto-deploys to production. |
| F8 | Turn on secret-scanning **push protection**, Dependabot **alerts** and **security updates** | GitHub → Settings → Code security | Free for public repos; I can't set it without your login. |
| F4 | Confirm the Render service is **Blueprint-managed**. If it was created by hand, set "Auto-Deploy: After CI checks pass" | Render → the API service | Otherwise a red CI still deploys. |
| F2 | Confirm a deploy of `064fc52` or later is live | Render → Deploys | Before it, all visitors shared one rate-limit bucket. |
| F3 | Make one request yourself and check the request log's `remoteAddress` equals your public IP. If it shows a Cloudflare IP, set `TRUST_PROXY_HOPS=2` | Render → Logs | Rate limits must key on the real visitor. |
| — | Run **Nightly fuzz** once by hand (it has never run; the schedule didn't fire) | GitHub → Actions → Nightly fuzz → Run workflow | It passed locally (10,000 runs per route); this proves it on CI. |
| — | **RevenueCat:** set `REVENUECAT_SECRET_KEY` and `REVENUECAT_WEBHOOK_AUTH` on Render, and the public SDK keys in the app build | Render; RevenueCat; EAS env | Without the secret key every user reads as free. |
| — | **Sentry:** create the project; set `EXPO_PUBLIC_SENTRY_DSN`, plus org, project and auth token for source-map and R8 mapping upload | Sentry; EAS env | Until then crash reporting is off, and an obfuscated release crash can't be read. |
| F11 | Create the **Google client IDs** (A3) and send them | Google Cloud console | Google's guide says custom URI schemes are no longer supported on Android, so Google sign-in and Gmail connect are likely rejected there. I migrate them once I have the IDs. |
| F134 | Set up the **Pro free trial**: an App Store introductory offer (free, 1 week to match "7-day"), and on Google Play a **new-customer-acquisition** offer (not "developer determined", which Play shows even to people who already had a trial) | App Store Connect; Play Console | The paywall offers a trial only when the store does. |
| F101 | Send the real **store listing links** (App Store id, Play package page) once published | — | "Rate Zeno" opens Apple's store front on every platform, Android included. |
| F19 | Send one **real Wells Fargo CSV export** (redact it) | — | The detector assumes a header row WF may not have; if wrong, the first transaction is silently dropped. |
| — | Confirm **where the website is hosted** and that the privacy policy names that host (it says Render runs "the website and API"; `render.yaml` deploys only the API). Whatever the host, its build command must be `npm run build --workspace @zeno/web` (not a bare `next build`) | your hosting account | The policy must name every processor (P4.1c). The build script writes each page's script policy after `next build` (P4.3); a bare `next build` skips it: the site still works, with the weaker policy. Also give the build step only what it needs: `WAITLIST_WEBHOOK_URL` is read at run time, not while building (P4.4). |
| — | Confirm **which AI coach provider** is set on Render (`COACH_PROVIDER`, or whichever of `ANTHROPIC_API_KEY` / `GROQ_API_KEY` exists) | Render → API → Environment | The policy now names both; if only one is ever used, I narrow it to that one. |
| — | Confirm **Render's log retention** on your plan is 30 days or less | Render → Logs / plan | The privacy policy says server logs are kept "up to 30 days". |
| — | Before launch: have the **privacy policy, cookie policy and terms** reviewed by a lawyer | — | They say they are pre-launch drafts. P4.1c made every factual statement in them match the code; legal sufficiency is a lawyer's call. |
| — | Before shipping iOS: file the annual **encryption self-classification** report (BIS / NSA) | export compliance | The app declares non-exempt encryption (SQLCipher) under the mass-market exemption, which requires it. |

---

## 2. Decisions

Each: my recommendation first, then why, then what I do after you choose. Reply with
the number and "yes", or the option you prefer.

### D1 · F96 — what the Family plan sells
- **Today:** the paywall sells "Family plan, up to 5 members, $6.99/mo", but household
  sharing is **free for everyone**. So the plan gives nothing beyond Pro while saying
  it does.
- **Recommendation: make sharing (Family Vault) part of the Family plan only.** Free
  and Pro users see it locked, with the Family plan offered.
- **Why:** the two closest competitors include household sharing in their paid plan,
  and neither gives it away free: YNAB ($14.99/mo or $109/yr) includes up to 5 others
  ([YNAB](https://www.ynab.com/features/subscription-sharing)), and Monarch lets you "invite partners, family members or even a financial advisor at
  no extra cost" ($99.99/yr) ([Experian review](https://www.experian.com/blogs/ask-experian/monarch-money-review/)).
  Zeno's Family plan at $6.99 is still under half of either. It keeps the paywall true
  and turns a free feature into the upsell it was designed to be.
- **Then I:** add a server-side entitlement check on household create/join, and the
  locked state in the app.

### D2 · F140 — Envelopes, sold as Pro, can't be set up
- **Recommendation: take Envelopes off the paywall now; build the editor later.**
- **Why:** Apple requires that "before asking a customer to subscribe, you should
  clearly describe what the user will get" (3.1.2(c)), and that functionality "should
  be clear to end users and App Review" (2.3.1(a))
  ([guidelines](https://developer.apple.com/app-store/review/guidelines/)). Selling a
  feature that doesn't work invites rejection and refunds.
- **Then I:** remove it from the paywall copy. When you want it built, I need the
  design of the envelope editor (name, amount, a spend of any size).

### D3 · F104 — two photo permissions Zeno doesn't use
- **Recommendation: remove them.** I need your OK to download an Android 13 emulator
  image (a large download; I'll tell you its exact size before starting) to prove it's
  safe first.
- **Why:** Google Play allows these permissions only for apps "whose core functionality
  revolves around broad access to Photos and Videos", with a Play Console declaration,
  enforced since 28 May 2025, with removal for non-compliant apps
  ([Play policy](https://support.google.com/googleplay/android-developer/answer/14115180)).
  Zeno can't truthfully make that declaration.
- **Then I:** test on Android 13, remove them, and verify the APK.

### D4 · F45 and F114 — absolute privacy wording
- **Today:** the paywall says "…and we never see your bank" (Settings and Profile say
  similar), and the Gmail card says "nothing leaves your phone". The **website** has the
  same kind of line (found in P4.1c): "Bank login: NEVER" (homepage), "Sees your bank
  credentials: Never" (two compare pages), "We never ask for bank credentials" (FAQ).
  The same choice applies to all of them.
- **Recommendation: switch to the exact, still-strong versions now:** "…and no bank
  login required", and "Scanned on your device — your emails never reach Zeno's
  servers" (verified true in the code).
- **Why:** the FTC has acted against apps whose absolute privacy promises turned out
  untrue, e.g. GoodRx (2023) and Premom (2023)
  ([FTC 2023 privacy report](https://www.ftc.gov/system/files/ftc_gov/pdf/2024.03.21-PrivacyandDataSecurityUpdate-508.pdf)).
  "Never" breaks the day Plaid ships, and "nothing" is already not literal (an
  anonymous import event).
- **Then I:** change the strings and their tests.

### D5 · F25 and F171 — most cancel guides are general steps, not researched ones
- **Measured (P4.1c):** of the 509 catalog services, **39** have cancellation steps
  written for that service; **470** show the same five general steps ("Go to X and sign
  in", "Open Account, Profile, or Settings", …). F25 counted 305 with a guessed cancel
  link (`<website>/account`) and a default "medium" difficulty. The site no longer claims
  every guide is researched (F171), but the 470 pages still exist and are indexed.
- **Recommendation: in the app, label them "general steps, not yet verified" and link
  the service's homepage instead of a guessed cancel URL; on the website, `noindex`
  the general-step pages until each is written.**
- **Why:** Google's spam policy targets "many pages … generated for the primary purpose
  of manipulating search rankings and not helping users" (scaled content abuse)
  ([Google](https://developers.google.com/search/docs/essentials/spam-policies)). 470
  near-identical pages can drag down the 39 real guides. Honest labels also protect trust.
- **Then I:** add the label and homepage link, and the `noindex` (computed from the
  catalog, so a page indexes itself the day its steps are written).

### D6 · F127 — what "Export my data" covers
- **Recommendation: add budgets and price history to the export.**
- **Why:** under GDPR Article 20, people may receive the personal data "they have
  provided … in a structured, commonly used and machine-readable format"
  ([Art. 20](https://gdpr-info.eu/art-20-gdpr/)). Budgets are typed in by the user. It's
  cheap, and complete exports build trust.
- **Then I:** extend the CSV and the row's wording.

### D7 · F77 — logout and the 15-minute access token
- **Recommendation: add server-side session revocation at logout.**
- **Why:** OWASP ASVS 3.3.1: "Verify that logout and expiration invalidate the session
  token" ([ASVS](https://github.com/OWASP/ASVS/blob/v4.0.3/4.0/en/0x12-V3-Session-management.md)).
  It's a finance app.
- **Then I:** a revocation list keyed by session id, kept until the token expires.

### D8 · F90 — risky production settings: warn or refuse to boot
- **Recommendation: refuse to boot,** once you've checked in Render that none of these
  is set: `DEMO_LOGIN_PASSWORD`, `ALLOW_UNVERIFIED_OAUTH_TOKENS`, a `*` or `http://`
  CORS origin, an `http://` `MONITORING_WEBHOOK_URL` or `COACH_BASE_URL`.
- **Why:** a misconfiguration then fails loudly at deploy instead of quietly in
  production. I didn't flip it blind, because `main` auto-deploys and I can't see
  Render's values.
- **Then I:** switch the warnings to refusals.

### D9 · F14 — the clock trick against the PIN lockout
- **Recommendation: accept it for now; later, add an opt-in "erase Zeno's data after
  10 wrong PINs".**
- **Why:** it needs someone holding the unlocked phone. Apple's own answer is an
  opt-in "Erase Data" after 10 failed passcodes, off until the user turns it on
  ([Apple](https://support.apple.com/en-au/guide/iphone/iph14a867ae/ios)). A trusted
  native clock costs a native module for a rare case.
- **Then I:** nothing now; the opt-in setting when you want it.

### D10 · F161 — the widget snapshot stored in plain text
- **Recommendation: stop writing it until a widget ships.**
- **Why:** it stores the next renewal and the monthly total for a feature that doesn't
  exist yet. There's no business cost, and it's one less thing to explain.
- **Then I:** stop the write, and move it to an encrypted shared store when widgets
  ship.

### D11 · F138 and F146 — small product calls
- **F138, sample data: keep the ledger empty, as now** (onboarding promises "your
  ledger starts empty"). Revisit with the activation numbers from the funnel events
  the app already records.
- **F146, budget stamps in Year in Review: leave it out.** There's no evidence of
  demand, and it would need a new section.

### D12 · the MASVS decisions (`docs/MASVS_CHECKLIST.md`)
- **Forced updates (CODE-2): yes.** A server-side minimum version, plus Google Play's
  "immediate" in-app update flow, which Google describes as "best for cases where an
  update is critical to the core functionality" (Android 5.0+)
  ([Android](https://developer.android.com/guide/playcore/in-app-updates)). It lets us
  retire a broken version instead of supporting it.
- **Certificate pinning (NETWORK-2): not now.** Android warns that without a backup key
  a certificate change means "you must push out an update to the app to restore
  connectivity" ([Android](https://developer.android.com/privacy-and-security/security-config)).
  Our API uses Render's shared certificate (`CN=onrender.com`, issued by Google Trust
  Services, valid 21 Sep to 20 Dec 2026, so about 90 days), which Render rotates, not
  us. Revisit with our own domain and certificate.
- **Minimum Android version (CODE-1): keep 24 for launch.** Decide with Play Console's
  real device numbers after launch, not a guess.
- **Root/tamper detection (RESILIENCE): not now.** Zeno doesn't move money. Add Play
  Integrity later if abuse appears.
- **The PIN for erase/export (AUTH-3): no.** With the app lock on, opening the app
  already takes the PIN.

### D13 · the founding-member promise: "3 months of Pro free at launch"
- **Today:** the homepage (pricing footnote, FAQ, closing section) promises founding
  waitlist members 3 months of Pro free at launch. Nothing in the app or the waitlist
  can deliver it yet; it is a promise to every person who signs up.
- **Recommendation: keep it, and honour it with each store's own codes.** Apple's
  subscription **offer codes** give a free period on an auto-renewable subscription
  (one-time-use codes, created in batches of 500 to 25,000, each valid up to six months)
  ([Apple](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes/)).
  Google Play **promo codes** give a subscription a free trial of 3 to 90 days (up to
  10,000 one-time codes per quarter per product)
  ([Google](https://support.google.com/googleplay/android-developer/answer/6321495?hl=en)).
  At launch, email each waitlist address one code. Let the subscription renew at the
  standard price afterwards (the store default), and say so in that email.
- **Why:** it is the reason people join, it costs nothing until they'd otherwise pay,
  and an unkept promise to a list of early adopters is the worst kind of first
  impression (and an FTC "deceptive" risk). The alternative, removing the line now, is
  honest too, but loses the waitlist's main hook.
- **Then I:** nothing until launch; at launch, the email and the code handling, and the
  site's wording if you choose to drop it instead.

### D14 · HSTS preload: put zeno.app on the browsers' HTTPS-only list?
- **Today:** the site's HSTS header already carries `preload`, which is one of the
  list's requirements; nothing is submitted, so it does nothing yet.
- **Recommendation: yes, after launch, once every subdomain you use serves HTTPS**
  (including any added by an email, help-desk or marketing tool). Submit at
  hstspreload.org.
- **Why:** browsers then never make a plain-HTTP request to zeno.app, even on a
  visitor's first visit, which closes the one gap HSTS leaves. The catch, in the list's
  own words: "inclusion in the preload list cannot easily be undone. Domains can be
  removed, but it takes months for a change to reach users with a Chrome update", and
  it applies to all subdomains, "including internal subdomains"
  ([hstspreload.org](https://hstspreload.org/)). So it is a commitment for the domain,
  which is why it's yours.
- **Then I:** check the requirements against the live site before you submit; if you
  say no, I drop `preload` from the header.

---

## 3. Tests only you can run

| What | Why it needs you |
|---|---|
| **Biometric unlock** on a real phone (fingerprint or face) | The emulator has none enrolled; the PIN path is verified, biometrics never were. |
| **iOS**, any of it | No iOS build has ever been run. |
| **Google sign-in and Gmail connect** after F11 | Needs the real client IDs. |
| **A real Pro purchase** in store sandbox (RevenueCat), and the trial after F134 | Needs your store accounts and keys. |
| **Renewal reminders** on a real phone across a reboot | The emulator verifies scheduling, not real-world delivery timing. |
| **Play data-safety form and App Store privacy labels** | Only you can submit them; I'll draft the answers from the code when you ask. |

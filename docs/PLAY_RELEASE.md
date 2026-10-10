# Play Store release — what blocks it, in order (2026-10-10)

The single ordered list of what stands between today and a live Google Play release.
**Everything here needs the owner**: an account, a decision, a payment, or a device.
Everything code-fixable is done — the UI plan (`docs/UI_TEST_TRACKER.md`) and the website
plan (`docs/WEB_TRACKER.md`) have no open findings left that I can close myself.

Each row says: what you do, where, why it blocks, and what I do once it's done.
Evidence is cited as `file:line` or a doc; nothing here is from memory.

**Status key:** ⬜ not started · 🔄 in progress · ✅ done

| # | Item | Status |
|---|---|---|
| P1 | Mail for `zenoapp.in` (F223) | ⬜ |
| P2 | Rotate the four exposed credentials | ⬜ |
| P3 | Play Console account + the production-access path | ⬜ |
| P4 | Decide D1, D2, D3 (the paywall's truth, and two photo permissions) | ⬜ |
| P5 | First internal-test build uploaded | ⬜ |
| P6 | Play in-app products + RevenueCat wiring | ⬜ |
| P7 | Sentry project + DSN | ⬜ |
| P8 | Google client IDs (F11) | ⬜ |
| P9 | The Pro free trial as a store offer (F134) | ⬜ |
| P10 | `zeno-db` upgraded before 3 November 2026 | ⬜ |
| P11 | Screenshots + feature graphic | ⬜ |
| P12 | Play "App content": every declaration | ⬜ |
| P13 | A lawyer's read of the privacy policy and terms | ⬜ |
| P14 | Uptime alerts on the API | ⬜ |
| P15 | Install on your own phone and use it for a week | ⬜ |

---

## P1 · Mail for `zenoapp.in` — finding F223

**Do:** set up forwarding for `privacy@`, `legal@`, `security@` and `feedback@zenoapp.in`
to your inbox, with any custom-domain mail service (ImprovMX and Zoho Mail both have a
free tier — check the current terms). It gives you MX records to add at GoDaddy's DNS.
Then send one test mail to each of the four.

**Where:** the mail service, then GoDaddy → DNS.

**Why it blocks:** `zenoapp.in` has no MX record (checked 2026-10-05 against Google's and
Cloudflare's resolvers), so all four addresses bounce today — while the privacy policy
tells people to send data requests to `privacy@`, the terms name `legal@`,
`/.well-known/security.txt` names `security@`, and the app's feedback button opens
`feedback@`. Play requires a privacy policy with a working contact, and a privacy law's
response deadline runs from when the request was sent, not from when you read it.

**It also unblocks:** P12's deletion URL, and the last High risk on the website side.

**Then I:** verify the MX records and re-test the four addresses from outside, then close
F223 and web row W3.2.

---

## P2 · Rotate the four exposed credentials

**Do:**
1. **Groq** — delete the old key at Groq, create a new one, set it on Render.
2. **Resend** — same.
3. **Plaid** — rotate the sandbox secret.
4. **The JWT signing pair** — follow `docs/RUNBOOKS.md` §1 with the ready 3072-bit pair in
   your `zeno-keys\prod\` folder: in one save, `JWT_PUBLIC_KEY_PREVIOUS` = the current
   public key, and `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` = the new pair. Delete
   `JWT_PUBLIC_KEY_PREVIOUS` fifteen minutes later, then the old files.

**Where:** Groq; Resend; Plaid; Render.

**Why it blocks:** those four were pasted into a chat transcript on 2026-10-04 — treat
them as public. The JWT pair signs every session token in the app; a leaked private key
means anyone can mint a valid session for any account. The swap also moves the API from
RSA 2048 (~112 bits) to 3072 (~128), which is what ASVS V11.2.3 asks for. With the
overlap nobody is signed out and no request is refused — that is tested.

**Then I:** re-run the token-path tests against the live API and confirm the startup log
line, so we know the new key is the one in use.

---

## P3 · Play Console account, and the path to production access

**Do:**
1. If you don't have one: create the Google Play developer account (one-time $25).
2. Tell me whether it is a **personal** or an **organisation** account.
3. Create the app entry: name `Zeno: Subscription Tracker`, package `app.zeno.mobile`.
4. Read, in the Console itself, what Google currently requires before it will grant
   **production** access. For personal accounts created after late 2023 Google has
   required a closed test run with a minimum number of testers for a continuous period
   before you can apply — the exact numbers have changed more than once, so take them
   from the Console's own wording rather than from me, and tell me what it says.

**Where:** play.google.com/console.

**Why it blocks:** nothing can be uploaded without the app entry, and if the testing
requirement applies to your account then the earliest possible public launch is that
window plus review time. That date drives everything else, so it is worth knowing now.

**Then I:** work the rest of this list backwards from the date you give me.

---

## P4 · Three decisions

These are the open decisions that touch the release. Full write-ups: `docs/OWNER_ACTIONS.md`
§2. Reply with the number and "yes", or the option you prefer.

**D1 (F96) — what the Family plan sells.** The paywall sells "Family plan, up to 5
members, $6.99/mo", but household sharing is free for everyone, so the plan gives nothing
beyond Pro while saying it does. *My recommendation:* make sharing part of the Family plan
only. *Why:* YNAB ($14.99/mo) and Monarch ($99.99/yr) both include household sharing in
the paid plan and neither gives it away; Zeno's $6.99 is still under half of either.
*Then I:* add the server-side entitlement check on household create/join, and the locked
state in the app.

**D2 (F140) — Envelopes are sold as Pro but can't be set up.** *My recommendation:* take
Envelopes off the paywall now, build the editor later. *Why:* Apple's guideline 3.1.2(c)
requires you to describe what the subscriber gets, and 2.3.1(a) that functionality be
clear to review; Play's equivalent is the misrepresentation policy. Selling a feature
that doesn't work invites rejection and refunds. *Then I:* remove it from the paywall copy
and its tests.

**D3 (F104) — two photo permissions Zeno doesn't use.** The release build still carries
`READ_EXTERNAL_STORAGE` and `READ_MEDIA_IMAGES`, contributed by expo-screen-capture
([app.config.ts:67](../apps/mobile/app.config.ts:67) explains why they are not blocked
yet). Play allows these only for apps "whose core functionality revolves around broad
access to Photos and Videos", with a Console declaration, enforced since 28 May 2025 —
a declaration Zeno cannot truthfully make. *My recommendation:* remove them. *What I need
first:* your OK to download an Android 13 emulator image (I'll tell you the exact size
before starting; roughly 1 GB) so I can prove removing them doesn't crash the module on
the API level where it actually reads them. *Then I:* test on 13, remove them, and
re-verify the release APK.

---

## P5 · The first internal-test build

**Do:** nothing yet — this is mine, but it needs P4 decided (the build must not ship the
paywall as it stands) and a Play app entry from P3. Then **confirm the EAS cloud build**,
which I will not start without you saying so.

**What I do:** run the production EAS build, hand you the artifact, and you upload it to
the **internal testing** track (not production).

**Why it comes here:** Play won't let you create in-app products, finish the content
rating, or capture real screenshots until a build exists in a track. P6, P11 and parts of
P12 all wait on this.

---

## P6 · Play in-app products, then RevenueCat

**Do:**
1. In Play Console, create the subscriptions `zeno_pro_monthly`, `zeno_pro_annual`,
   `zeno_family_monthly`, and the one-time product `zeno_pro_lifetime`.
2. In RevenueCat: the entitlements `pro` and `family`, those four products, and the
   **webhook** — URL `https://zeno-api-5dwv.onrender.com/api/v1/billing/webhook`,
   Authorization = the value in `zeno-keys\prod\REVENUECAT_WEBHOOK_AUTH.txt`.
3. Send me the **public** Android SDK key (`goog_…`). Never the secret `sk_…` one — the
   build refuses it by design ([app.config.ts:8](../apps/mobile/app.config.ts:8)).

**Why it blocks:** [eas.json](../apps/mobile/eas.json) sets only `PUBLIC_API_BASE_URL` on
the production profile, and `initRevenueCat` returns `false` when no key is configured
([revenueCat.ts:37](../apps/mobile/src/billing/revenueCat.ts:37)). A release built today
ships a paywall that cannot take money. Without the webhook, a purchase is only noticed
the next time the app asks.

**Then I:** put the public key in the build's env, and run the purchase and restore flows
against Play's test track.

**Razorpay (owner decision, 2026-10-10):** the website will also sell Pro through Razorpay, which Play permits because the purchase happens outside the app. That is a second path to the same entitlement, not a replacement — P6 stays exactly as it is. Design and the keys it needs: `docs/RAZORPAY_WEB_CHECKOUT.md`.

---

## P7 · Sentry

**Do:** create the Sentry project; send me the DSN, and set the org, project and auth
token for source-map and R8 mapping upload.

**Why it blocks:** the release is R8-minified and resource-shrunk
([app.config.ts:121](../apps/mobile/app.config.ts:121)). With no DSN, crash reporting is
off — and the first production crash would arrive, if at all, as an unreadable obfuscated
stack. It also changes a Play data-safety answer (crash logs: No today, Yes once set).

**Then I:** set `EXPO_PUBLIC_SENTRY_DSN`, wire the mapping upload, and prove it by
triggering one test crash in a release build and reading the symbolicated stack.

---

## P8 · Google client IDs — finding F11

**Do:** create the Android, Web and iOS OAuth client IDs in Google Cloud and send them.

**Why it blocks:** Google sign-in and the Gmail receipt scan have no client IDs today
([app.config.ts:152](../apps/mobile/app.config.ts:152)), and Google's own guidance is that
custom URI schemes are no longer supported for Android clients — so this path is likely
to be refused by Google rather than merely broken. Gmail scanning is one of the two ways
Zeno finds subscriptions, so shipping it dead is a product problem as much as a policy one.

**Then I:** migrate the auth flow to the supported scheme and verify both flows on-device.

---

## P9 · The Pro free trial — finding F134

**Do:** on Play, create a **new-customer-acquisition** offer on `zeno_pro_monthly` (not
"developer determined", which Play also shows to people who already had a trial), one
week, to match the "7-day" wording. On Apple, the equivalent introductory offer when iOS
comes.

**Why it blocks:** the paywall offers a trial only when the store actually has one, so
today the copy and the purchase sheet would disagree.

**Then I:** verify the paywall shows the trial, and that it doesn't show it to someone
who already used one.

---

## P10 · `zeno-db` — a hard date

**Do:** upgrade `zeno-db` to a paid Render plan **before 3 November 2026**, or accept
losing its data.

**Where:** Render → `zeno-db`.

**Why it blocks:** Render deletes free databases when they expire. Today that costs
nothing real — there are no live users. After launch it would be every account.
**24 days from today.**

**Then I:** re-run the restore drill (`docs/RUNBOOKS.md` §5) against the upgraded instance.

---

## P11 · Screenshots and the feature graphic

**Do:** nothing yet; this needs P5's build. Then you (or I, on the emulator) capture them
and you upload.

**What Play wants:** at least two phone screenshots, a 1024×500 feature graphic, and the
512×512 icon. `apps/mobile/assets/` has the icon, adaptive icon and splash and nothing
else, and [store-listing.md](../apps/mobile/store-listing.md) says so itself: there are no
card designs to render from, so these must be captures of the real app.

**The listing text is already written** — title, short and full description, keywords, all
within the current character limits — in `apps/mobile/store-listing.md`.

**Then I:** capture a consistent set on the emulator at the right resolutions, with the
clock frozen and the demo status bar on (the tooling exists: `scripts/app-visual.mjs`).

---

## P12 · Play "App content" — every declaration

**Do:** work through the whole section. The ones with substance:

1. **Privacy policy URL** — `https://zenoapp.in/legal/privacy`.
2. **Data safety** — fill it from `docs/STORE_DATA_SAFETY.md`, which is drafted from what
   the release build actually sends, each answer citing its code. Three things to settle
   before submitting: (a) add each SDK vendor's own guidance (RevenueCat, Sentry, Play
   Billing); (b) decide whether the four anonymous product events stay on without asking,
   or go behind a setting; (c) give Play a **web link for deletion requests** — none
   exists. Once P1's mail works, a short page saying "email privacy@zenoapp.in from your
   account's address" satisfies it. In-app deletion already exists and is tested.
3. **App access** — the reviewer needs to get past the sign-in. Zeno works without an
   account, so the honest answer is that all functionality is available without
   restriction, with a note that an optional account uses an email link. If you'd rather
   they test a signed-in account, that needs a demo mailbox they can read.
4. **Content rating** questionnaire, **target audience** (not children), **ads** (none),
   **financial features** declaration, **government app** (no), **news** (no).

**Why it blocks:** the Console won't let you release without them, and a wrong
data-safety answer is a policy violation that can pull a live app.

**Then I:** re-read the data-safety draft against the build you actually upload, so the
answers match that binary and not an earlier one. I'll also build the deletion-request
page if you want it on the site rather than as a plain mail link.

---

## P13 · A lawyer's read

**Do:** have the **privacy policy, cookie policy and terms** reviewed before launch, and
settle D18 (the legal entity behind Zeno) and D19 (governing law and venue).

**Why it blocks:** the pages say they are pre-launch drafts. P4.1c made every factual
statement in them match the code — what the app sends, to whom, and for how long it is
kept — and the website's truthfulness tests hold that line. Legal sufficiency is a
lawyer's call, not mine, and the entity and venue are blanks only you can fill.

**Then I:** apply their edits and re-run the legal-agreement and truthfulness tests.

---

## P14 · Uptime alerts

**Do:** put an outside monitor (UptimeRobot, Better Stack — free tiers) on
`https://zeno-api-5dwv.onrender.com/api/v1/health/ready`, every 5 minutes, alerting your
email. Details in `docs/RUNBOOKS.md` §6.

**Why it blocks:** today nobody is told when the API or its database is down. Not GitHub's
scheduler — here it fired twice in eleven hours. Do this after P10, since a monitor also
keeps the instance awake.

**Then I:** nothing; it's yours. I'll add the URL to the runbook once it exists.

---

## P15 · Your own phone, for a week

**Do:** install P5's internal-test build on your real phone and use it as you would.

**Why it blocks:** everything in this programme has been verified on one emulator
(`SubRadar_API_36`). Nothing has ever run on real hardware, on a real Android version
other than 36, or on iOS at all. Battery behaviour, the notification timing on a locked
phone (D22), real Gmail accounts and real CSV exports are all things an emulator cannot
tell us.

**Then I:** fix what you find, which is the only test on this list that can still surface
something new.

---

## Not blocking Play, but queued behind it

- **F101** — "Rate Zeno" opens Apple's store front on every platform. Send the Play
  listing URL once the app is published and I'll fix it.
- **F7, F8** — branch protection on `main`, and secret-scanning push protection plus
  Dependabot. Worth doing anyway: `main` auto-deploys the API.
- **D22, D23, R35** — three open UI findings, all cosmetic or informational; decisions in
  `docs/OWNER_ACTIONS.md`.
- **F19** — one redacted real Wells Fargo CSV export, to check an assumption the detector
  makes about its header row.
- **iOS** — the BIS/NSA encryption self-classification report must be filed before an
  App Store submission (the app declares non-exempt encryption because of SQLCipher).
  Nothing for Play.
- **Search Console / Bing / social profiles / Product Hunt** — the launch-week list in
  `docs/OWNER_ACTIONS.md`.

---

## What is already done and verified

So you know what isn't on this list: the API is live on Render with Postgres and token
encryption on; the website is live on `zenoapp.in` with every security header, valid HTML
and no open findings; the UI test plan is complete (100 checks, 79 pass, evidence in
`docs/ui-evidence/`); CI is green on `13fd9fd` across all four workflows — typecheck and
test, gitleaks over full history, semgrep, CodeQL.

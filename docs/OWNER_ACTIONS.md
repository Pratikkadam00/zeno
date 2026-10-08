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
| — | **Delete the old hand-made Render service `zeno`** (zeno-zw8i.onrender.com). Its replacement is live since 2026-10-04: the API runs from the Blueprint as `zeno-api` + `zeno-db` (https://zeno-api-5dwv.onrender.com, smoke test passed), which also closes F4 (deploys only after CI passes) | Render → `zeno` → Settings → Delete | It has no database and has failed every deploy since `f33ea30`; it still deploys on every push. |
| — | **`zeno-db` expires on November 3, 2026** (Render deletes it then): upgrade it to a paid plan before that date, or accept losing its data (no real users yet) | Render → `zeno-db` | Render's free databases expire; the data goes with it. |
| — | Check the startup log reads `[zeno] persistence=postgres token-encryption=on env=production` | Render → `zeno-api` → Logs | Confirms the database and the storage key from inside the server (not visible from outside). |
| — | **Keys pasted in chat on 2026-10-04:** delete the old Groq and Resend keys at their providers (new ones are in Render) and rotate the Plaid sandbox secret | Groq; Resend; Plaid | They are in a chat transcript; treat them as public. |
| — | GoDaddy: **2-step verification**, **domain lock** and **auto-renew** on for `zenoapp.in` | GoDaddy → Account; the domain's settings | Free; this is what actually protects the domain (the paid "protection" add-on isn't needed). |
| F3 | Make one request yourself and check the request log's `remoteAddress` equals your public IP. If it shows a Cloudflare IP, set `TRUST_PROXY_HOPS=2` | Render → Logs | Rate limits must key on the real visitor. |
| — | Run **Nightly fuzz** once by hand (it has never run; the schedule didn't fire) | GitHub → Actions → Nightly fuzz → Run workflow | It passed locally (10,000 runs per route); this proves it on CI. |
| — | **RevenueCat:** the secret key and webhook password are on Render (2026-10-04). Left: the **webhook** (URL `https://zeno-api-5dwv.onrender.com/api/v1/billing/webhook`, Authorization = `zeno-keys\prod\REVENUECAT_WEBHOOK_AUTH.txt`), the entitlements `pro`/`family` and products `zeno_pro_monthly`, `zeno_pro_annual`, `zeno_pro_lifetime`, `zeno_family_monthly`, and the public SDK keys in the app build once the store apps exist | RevenueCat; EAS env | Without the webhook, purchases are only picked up when the app asks. |
| — | **Sentry:** create the project; set `EXPO_PUBLIC_SENTRY_DSN`, plus org, project and auth token for source-map and R8 mapping upload | Sentry; EAS env | Until then crash reporting is off, and an obfuscated release crash can't be read. |
| F11 | Create the **Google client IDs** (A3) and send them | Google Cloud console | Google's guide says custom URI schemes are no longer supported on Android, so Google sign-in and Gmail connect are likely rejected there. I migrate them once I have the IDs. |
| F134 | Set up the **Pro free trial**: an App Store introductory offer (free, 1 week to match "7-day"), and on Google Play a **new-customer-acquisition** offer (not "developer determined", which Play shows even to people who already had a trial) | App Store Connect; Play Console | The paywall offers a trial only when the store does. |
| F101 | Send the real **store listing links** (App Store id, Play package page) once published | — | "Rate Zeno" opens Apple's store front on every platform, Android included. |
| F19 | Send one **real Wells Fargo CSV export** (redact it) | — | The detector assumes a header row WF may not have; if wrong, the first transaction is silently dropped. |
| — | Website: **hosted on Netlify** since 2026-10-04 (`zenoapp-in.netlify.app`; checked from outside: every security header, each page's script policy, 404s, the waitlist route's validation; the privacy policy now names Netlify and Render). Left: set the build command to `npm run build --workspace @zeno/web` (it runs the root build, which also typechecks the whole repo), the waitlist goes to a private Google Sheet through an Apps Script web app (`WAITLIST_WEBHOOK_URL`, working 2026-10-04; script changes: Manage deployments → Edit → New version keeps the URL), and `zenoapp.in` is connected (external DNS at GoDaddy, Let's Encrypt certificate, http and www redirect; checked 2026-10-04) | Netlify; GoDaddy | Until the webhook is set, waitlist sign-ups fail. |
| — | AI coach: **Groq** is set on Render (2026-10-04), no `COACH_PROVIDER`, no Anthropic key. Say whether Claude will be added; if not, I narrow the privacy policy to Groq | — | The policy names both providers. |
| F227 | **Netlify still injects its toolbar script into every page** (`/.netlify/scripts/hud?variant=public`, measured 2026-10-08 after the project was made public): it is appended after `</html>`, which makes every page invalid HTML (the W3C checker stops at it: `docs/web-evidence/html-validation-2026-10-09.txt`), and the site's script policy blocks it, so every visitor's console shows a security error. In the Netlify site's settings, find the HUD / toolbar / "Netlify Drawer" option and turn it off (its name moves between releases). I re-measure after | Netlify → the site's settings | Clean, valid pages for every visitor; the nightly checks go green on their own. |
| — | **Netlify: make the project public.** While it is private, Netlify injects its pre-launch toolbar script (`/.netlify/scripts/hud`) into every page; our script policy blocks its inner script, so every visitor's browser logs a security error (measured 2026-10-04 in a plain browser and in Lighthouse). Netlify's docs: the toolbar "stops appearing when you make the project public" | Netlify → the project's settings (visibility) | Clean console for every visitor; the badge doesn't belong on a public site. I re-measure after. |
| — | **After the SEO pass deploys (2026-10-05), the launch-week list from SEO.md §10, which code cannot do:** (1) Search Console → URL inspection → *Request indexing* for `/`, `/compare`, `/cancel`, `/blog` and `/features`; (2) claim the name on X, Instagram, LinkedIn, YouTube, Crunchbase and GitHub, each bio linking to zenoapp.in; (3) listings on Product Hunt (when the app ships), AlternativeTo (as an alternative to Rocket Money, Bobby, TrackMySubs), SaaSHub, BetaList; (4) a 30-minute Search Console look each week: queries at positions 5 to 15 are the pages to strengthen. Each listing is a link from a site Google already trusts; zenoapp.in has none yet | search.google.com/search-console; the sites named | SEO.md: "technical SEO is a gate, not an engine". The code side is done and tested; ranking now depends on links and time. |
| — | **Google Search Console:** the Domain property `zenoapp.in` exists (2026-10-04). Left: **Sitemaps → add** `https://zenoapp.in/sitemap.xml` (the one sitemap covers every page, the blog included), then **Bing Webmaster Tools → Import from Google Search Console**. Data appears after a day or so | search.google.com/search-console; bing.com/webmasters | The sitemap tells Google what to crawl first; the reports show what it indexed and why not (D16 needs that data). |
| — | **Swap the API's signing key to 3072 bits** (ASVS V11.2.3): follow `docs/RUNBOOKS.md` §1 with the ready pair `zeno-keys\prod\JWT_PRIVATE_KEY_3072.pem` / `JWT_PUBLIC_KEY_3072.pem`: in one save, `JWT_PUBLIC_KEY_PREVIOUS` = the current public key, `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` = the 3072-bit pair; delete `JWT_PUBLIC_KEY_PREVIOUS` 15 minutes later, then the old files | Render | RSA 2048 is about 112 bits of security; ASVS asks for 128 (3072). With the overlap nobody is signed out and no request is refused (tested). Also rotates the pair that was pasted into a chat. |
| — | **Render account:** confirm two-step sign-in is on, and list who is in the workspace (ASVS V16.4.2: whoever is there can read the logs and every secret) | Render → Account settings; Team | The logs and keys are only as safe as that login. |
| F223 | **Make the contact addresses receive mail.** `zenoapp.in` has no MX record (checked 2026-10-05 with Google's and Cloudflare's resolvers), so `privacy@`, `legal@`, `security@` and `feedback@zenoapp.in` cannot receive anything, though the privacy policy tells people to send data requests to `privacy@`, the terms name `legal@`, the app's feedback button opens `feedback@` and `/.well-known/security.txt` names `security@`. Set up forwarding of those four to your inbox with any mail-forwarding or mailbox service for a custom domain (for example ImprovMX or Zoho Mail; check its current free tier); it gives you MX records to add. Then send one test mail to each | GoDaddy (DNS) | Data-protection requests and vulnerability reports are bouncing; a privacy law's response deadline runs from the request, received or not. |
| — | **DNS hardening for `zenoapp.in`** (measured 2026-10-05): (1) a **CAA** record `0 issue "letsencrypt.org"` (the site's certificate is Let's Encrypt's, through Netlify; no other CA may then issue for the domain); (2) turn on **DNSSEC** in GoDaddy's DNS settings (none today); (3) after two weeks of DMARC reports with nothing failing, change `_dmarc` from `p=quarantine` to **`p=reject`** (spoofed "Zeno" mail is then refused, not filed as spam). Its reports go to GoDaddy's address (`dmarc_rua@onsecureserver.net`): to read them yourself, set `rua=mailto:` to an address of yours once F223 is done | GoDaddy → DNS | Stops another CA issuing a certificate for the site, protects the DNS answers, and stops mail forged as Zeno. |
| — | **Uptime alerts** (`docs/RUNBOOKS.md` §6): an outside monitor (for example UptimeRobot or Better Stack, free tier) on `https://zeno-api-5dwv.onrender.com/api/v1/health/ready` every 5 minutes, alerting you by email. Not GitHub's schedule: here it fired twice in 11 hours. It keeps the free instance awake (free hours), so set it up once `zeno-api` is paid or the old `zeno` service is deleted | the monitor's site | Today nobody is told when the API or its database is down. |
| — | **Play data-safety form:** fill it from `docs/STORE_DATA_SAFETY.md` (drafted from what the release build sends; each answer cites its code). Before submitting: add each SDK vendor's own guidance (RevenueCat, Sentry, Play Billing), decide whether the four anonymous product events stay on without asking (else they need a setting), and give Play a **web link for deletion requests** (none exists; a page saying "email privacy@zenoapp.in from your account's address" works once F223's mail does) | Play Console → App content → Data safety | A wrong data-safety answer is a policy violation that can pull the app. |
| — | Confirm **Render's and Netlify's log retention** on your plans are 30 days or less | Render → Logs / plan | The privacy policy says server logs are kept "up to 30 days". |
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

### D16 · the 470 general cancellation guides: offered to search engines, or not?

**Measured (2026-10-04):** 509 guides; 39 have steps written for their service; 470 carry the
same five general steps with the service's name filled in (one template, measured by
replacing the name and domain and counting distinct texts), ~34 words of steps each, every
one with the service's own cancellation link. Google's spam policy: "Scaled content abuse is
when many pages are generated for the primary purpose of manipulating search rankings and
not helping users" (developers.google.com/search/docs/essentials/spam-policies). Our pages
are not made to game rankings and each offers one real thing (the service's cancel link), but
470 near-identical pages on a brand-new domain are what that policy, and Google's "thin
content" assessments, look at. Since today each general guide says it is general (on the page
and in its search description), and the sitemap ranks it below the 39 real ones.

**Options:** (a) keep them indexed (today's setting), (b) keep them on the site and linked but
tell search engines not to index them (`INDEX_GENERAL_GUIDES = false` in
`apps/web/lib/guides.ts`: one line; the 39 real guides stay indexed) until each gets its own
steps (D5). **My recommendation:** (a) for now, because they are honestly labelled and each
carries a unique link, then read Search Console after ~60 days: if most of the 470 sit in
"Crawled, currently not indexed", or any manual action appears, switch to (b) the same day.
Writing real steps (D5) is what actually earns rankings for those 470 names.

### D15 · F187 — what the ledger's headline number means
- **Today:** the headline says "COMMITTED THIS MONTH" but shows the monthly average of
  every plan (a $120-a-year gym counts $10). The two lines under it are this month's
  real charges. With only monthly plans they agree; with a yearly plan the card reads
  "$10.00" over "Charged so far $0.00 · Still to renew $0.00".
- **Recommendation: keep the number, change the label to "COMMITTED PER MONTH".** The
  monthly average is the figure people compare month to month and the one the paywall,
  Insights and the coach already use; a one-line label change makes it true and keeps
  the design. The alternative, making the headline this month's real total, makes a
  yearly renewal month spike and every other month look cheaper than it is.
- **Then I:** change the label (or the number, if you choose that), with a test, and
  re-run the ledger flows on the emulator. The Calendar's "This month" shows the same
  figure (F197, as the design has it), so it follows your choice too.

### D17 · the ASVS decisions (`docs/ASVS_CHECKLIST.md`, P7.2)
- **A second factor (V6.3.3): not before launch.** Every sign-in already proves control
  of the inbox (link or code) or of the Apple or Google account, and the server holds no
  subscription data to take. Revisit if the server ever holds a user's money data.
- **An absolute session lifetime (V7.3.2): yes, 1 year.** Today a refresh token renews
  itself forever while it is used. A yearly email sign-in costs a user almost nothing
  and bounds how long a stolen phone's session lives.
- **"Sign out of all devices" (V7.4.5, V7.5.2): yes, after launch.** One button in
  Settings that ends every session of the account (and, for you, the same as a script).
  A full list of sessions can wait.
- **The household share code (V11.5.1): keep 8 characters.** People type it; guessing is
  rate-limited and a household holds 5 people at most.
- **Routes the app doesn't use (V15.2.3): switch them off in production** (`/sync`,
  `/public-api/keys`, `/business/summary`, the open-banking intents): they are attack
  surface that serves nobody. Turned back on when the app needs them.
- **Then I:** build what you said yes to, each with its test, and update the checklist.

### D18 · the legal entity behind Zeno (`docs/WEB_PLAN.md` W2)
**Decided 2026-10-08 (owner): the name Zeno, no address, no personal data on the site. Done: Terms, privacy policy, /about, footer.**
- **Today:** the Terms say "the Zeno team", name no company, country or address; the
  privacy policy names no data controller. A reader cannot tell who they are contracting
  with, and a privacy law requires the controller's identity.
- **Decide:** the exact legal name (you as an individual trading as Zeno, or a company),
  the country, and a postal address that can appear on the site (a registered-agent or
  mailbox address is fine). If you plan to form a company before launch, say so and the
  pages carry a placeholder test that fails until the name is in.
- **Then I:** write the entity into the Terms, the privacy policy, the About page and the
  footer, with one source of truth in `apps/web/lib/site.ts`.

### D19 · governing law and venue
**Decided 2026-10-08: the owner left it to me; written as India's law and courts, with consumers elsewhere keeping their own country's protection (Terms §14). The lawyer confirms.**
- **Today:** "the laws of the jurisdiction in which Zeno is established … confirmed at
  launch". That is not a term.
- **Recommendation:** the law and courts of the country from D18, with the standard carve-out
  that consumers keep the protection of their own country's law. A lawyer (OWNER_GUIDE
  step 13) confirms it; I draft it.

### D20 · the six "planned, not available today" pages
**Decided 2026-10-08: the owner said "do the best"; the recommendation was taken. /roadmap replaces the five pages; each old address redirects for good.**
- **Today:** Widgets + Watch, Open Banking, Business, Developers, Partners and most of the
  Features hub each hold one paragraph and a mock-up. Honest, and thin.
- **Recommendation: fold them into one Roadmap page** that lists what is planned, in
  order, with one line each, and redirect the six addresses to it (no link breaks). One
  real page reads better than six empty ones, and Google does not count six thin pages
  against a new domain. The alternative is to keep them and write each up to a real page,
  which costs time on features that do not exist.

### D21 · waitlist double opt-in
**Deferred 2026-10-08 (owner): "confirmation email will do later". Left on the list.**
- **Today:** an address typed into the form goes straight onto the list. Nobody proves
  they own it; a typo or a prank lands on the list and gets launch mail.
- **Recommendation: yes.** A confirmation email through Resend with one link; the address
  joins the list only when the link is opened. It costs a template and one route, and it
  is what a mailing law expects (consent that can be shown per address).

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

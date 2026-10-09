# Your step-by-step guide (written 2026-10-06)

Everything left that only you can do, in the order to do it. Each step says where to go,
what to click or type, how to check it worked, and what to send me after. Menu names on
other companies' sites can shift slightly; if a label differs, look for the closest one.

**Two rules for every step:** never paste a key, password or token into a chat (with me
or anyone); and when a step says "tell me", a one-line message is enough, such as
"step 1 done".

---

## Today: about 45 minutes

### Step 1 · Protect `main` on GitHub (10 min) — risk R1, High

Right now anyone with push access (or a stolen GitHub token) can overwrite or delete the
branch that deploys to production.

1. github.com → the `zeno` repository → **Settings** → **Rules** → **Rulesets** →
   **New ruleset** → **New branch ruleset**.
2. Name: `main`. Enforcement status: **Active**. Target branches: **Add target** →
   **Include default branch**.
3. Tick **Restrict deletions** and **Block force pushes**.
4. **Leave "Require status checks to pass" off for now.** With it on, every change must
   go through a pull request, including mine; we can switch to that later if you want.
5. **Create**.

**Tell me** "step 1 done": I re-read GitHub to confirm the branch shows as protected.

### Step 2 · Turn on GitHub's free security features (3 min) — R4

1. Repository → **Settings** → **Code security** (sometimes "Code security and analysis").
2. Enable **Secret scanning** and its **Push protection** (blocks a push that contains a
   secret), **Dependabot alerts**, and **Dependabot security updates**.

**Tell me** "step 2 done".

### Step 3 · Replace the keys that were pasted into a chat (15 min) — R2, High

Treat these as public. For each one: make a new key at the provider, put it in Render,
then delete the old one at the provider.

Render: dashboard.render.com → **zeno-api** → **Environment** → find the variable →
**Edit** → paste the new value → **Save changes** (the API redeploys by itself).

| Provider | Where to make a new key | Render variable |
|---|---|---|
| Groq | console.groq.com → **API Keys** → **Create API Key** | `GROQ_API_KEY` |
| Resend | resend.com → **API Keys** → **Create API Key** (sending access is enough) | `RESEND_API_KEY` |
| Plaid (sandbox) | dashboard.plaid.com → **Developers** → **Keys** → rotate the **Sandbox** secret | `PLAID_SECRET` |

After all three are saved and the deploy finishes: delete the old Groq and Resend keys
at their sites (Plaid's rotation replaces the old secret itself).

**Check:** send yourself a sign-in email from the app or `zenoapp.in` (Resend works); the
AI coach answers a question (Groq works).

### Step 4 · Swap to the stronger signing key (10 min) — R12, and rotates the pasted JWT pair

The new 3072-bit pair is already made, in `C:\Users\Pratik\zeno-keys\prod\`. Nobody is
signed out, and no request fails, if you do it in this order.

1. Open `JWT_PUBLIC_KEY.pem` (the CURRENT public key) in Notepad and copy all of it.
2. Render → **zeno-api** → **Environment** → **Add Environment Variable**:
   key `JWT_PUBLIC_KEY_PREVIOUS`, value = what you copied.
3. In the **same** edit, change `JWT_PRIVATE_KEY` to the contents of
   `JWT_PRIVATE_KEY_3072.pem`, and `JWT_PUBLIC_KEY` to the contents of
   `JWT_PUBLIC_KEY_3072.pem`. **Save changes** once.
4. Wait for the deploy to finish, then **wait 15 more minutes**.
5. Delete the variable `JWT_PUBLIC_KEY_PREVIOUS` and save.
6. In the key folder: delete the old `JWT_PRIVATE_KEY.pem` and `JWT_PUBLIC_KEY.pem`, then
   rename the two `_3072` files to those names (so the folder holds only the live pair).

**Check:** the app still works after step 5 (open it, pull to refresh).
**Tell me** "steps 3 and 4 done".

---

## This week: about an hour

### Step 5 · Make the contact email addresses work (15 min) — R32, High

`privacy@`, `legal@`, `security@` and `feedback@zenoapp.in` all bounce today: the domain
has no mail record. The privacy policy tells people to send data requests to `privacy@`.

1. Pick a mail-forwarding service for a custom domain (for example ImprovMX or Zoho Mail;
   check their current free plan). Add the domain `zenoapp.in` there.
2. Create forwards for **privacy**, **legal**, **security** and **feedback** to your own
   inbox (or one catch-all).
3. The service shows **MX records** (and usually an SPF value). Add them at GoDaddy:
   godaddy.com → **My Products** → `zenoapp.in` → **DNS** → **Add New Record**.
   Don't delete the existing records (the Resend ones are needed for sign-in emails).
4. Wait about an hour, then send a test mail to each of the four addresses.

**Tell me** "step 5 done": I re-check the DNS from outside.

### Step 6 · Three DNS records that protect the domain (15 min)

All at GoDaddy → `zenoapp.in` → **DNS**.

1. **CAA** (only Let's Encrypt may issue certificates for the site): **Add New Record** →
   Type **CAA** → Name `@` → Flags `0` → Tag `issue` → Value `letsencrypt.org` → Save.
2. **DNSSEC**: in the domain's settings, find **DNSSEC** and turn it on (GoDaddy may
   offer it only with their own nameservers, which you use).
3. **DMARC to reject**, in two weeks, not today: once step 5 works, edit the TXT record
   named `_dmarc`, and change `p=quarantine` to `p=reject` (and, if you like, set
   `rua=mailto:` to an address of yours so the reports come to you).

**Tell me** "step 6 done (CAA, DNSSEC)".

### Step 7 · Tidy Render (15 min)

1. **Delete the old service `zeno`** (zeno-zw8i.onrender.com): Render → `zeno` →
   **Settings** → **Delete Web Service**. It has no database, fails every deploy, and
   uses free hours. (`zeno-api` is the live one.)
2. **Read the startup log**: Render → `zeno-api` → **Logs**; find the line starting
   `[zeno] persistence=` and check it says `persistence=postgres token-encryption=on
   env=production`.
3. **Check your client IP (F3)**: open `https://zeno-api-5dwv.onrender.com/api/v1/health`
   in your browser, then search the Logs for that request and look at `remoteAddress`.
   It should be your own public IP (search "what is my IP" to see it). If it's a
   different address, tell me what it starts with.
4. **Render account safety**: Account settings → turn on **two-factor authentication**;
   in the workspace's **Members**, check only you are there.
5. **Log retention**: on your plan's page, check how long Render keeps logs. The privacy
   policy says "up to 30 days"; tell me the number.

**Tell me** what steps 2, 3 and 5 showed.

---

## Before 1 November (hard deadline: Render deletes the database on 3 November)

### Step 8 · Keep the database (10 min, then a drill with me) — R3, High

1. Render → **zeno-db** → **Upgrade** (or Settings → Instance type) → choose the
   cheapest paid plan. Note what backups it includes.
2. Then tell me, and we run the restore drill together (`docs/RUNBOOKS.md` §5): you
   copy the external connection string into a terminal on your machine; I guide the
   commands. It proves a backup can actually be restored.

---

## Before launch

### Step 9 · Uptime alerts (10 min, after step 8 or after deleting the old service)

At UptimeRobot or Better Stack (free plan): a new **HTTP(s)** monitor on
`https://zeno-api-5dwv.onrender.com/api/v1/health/ready`, every 5 minutes, keyword
`"status":"ready"`, alerts to your email. (It keeps the free server awake, which is why it
waits until the database is paid or the old service is gone.)

### Step 10 · Google sign-in on Android (F11)

Google no longer allows the redirect the app uses for Google sign-in and Gmail on
Android. In Google Cloud Console → **APIs & Services** → **Credentials**, create OAuth
client IDs (Android, iOS, Web) and send me the **client IDs** (they are public, safe to
send). I do the rest.

### Step 11 · RevenueCat and Sentry

- **RevenueCat**: add the webhook (URL
  `https://zeno-api-5dwv.onrender.com/api/v1/billing/webhook`, Authorization = the
  contents of `zeno-keys\prod\REVENUECAT_WEBHOOK_AUTH.txt`), the entitlements `pro` and
  `family`, and the products listed in `docs/OWNER_ACTIONS.md`.
- **Sentry**: create the project and put its DSN in the EAS build settings as
  `EXPO_PUBLIC_SENTRY_DSN`. Then tell me; I test crash reports in a release build.

### Step 12 · Play Store data-safety form

Play Console → your app → **App content** → **Data safety**. Fill it from
`docs/STORE_DATA_SAFETY.md` (each answer is there with its reason). Before submitting,
read its "For the owner to confirm" list: SDK vendors' own guidance, the anonymous usage
events, and a web page for deletion requests (needs step 5's email).

### Step 13 · People to book

- **A lawyer** to review the privacy policy, cookie policy and terms (they say they are
  drafts).
- **A penetration test** from an outside firm: every test so far was written by the same
  author as the code. Book early; they often have weeks of lead time.
- **Cloudflare in front of the API** (rate limiting and a firewall at the edge): this
  needs your Cloudflare account and a DNS change; tell me when you want to do it and I'll
  write the exact steps for your setup.

### Step 15 · The website (added 2026-10-09, from `docs/WEB_PLAN.md`)

1. **Netlify: turn off the toolbar script** (F227, 5 min). Netlify → the site → the settings for the
   HUD / toolbar / "Netlify Drawer" (the name moves between releases) → off. It is appended to every
   page after `</html>`, which makes the HTML invalid and shows an error in every visitor's console.
   **Tell me** "step 15.1 done": I re-run the HTML and Lighthouse checks.
2. **Search Console: submit the sitemap and read the report** (10 min). Sitemaps → add
   `https://zenoapp.in/sitemap.xml`. Then Pages → "Why pages aren't indexed" → click the
   "Crawled, currently not indexed" row and tell me whether the URLs are all `/cancel/...`
   guides (D16) or include the home page, /compare or /blog (a different problem).
3. **Bing Webmaster Tools** (5 min): bing.com/webmasters → Import from Google Search Console.
4. **Visual baselines** (10 min, once). GitHub → Actions → "Visual baselines" → Run workflow →
   mode **update**. When it finishes, download the artifact `visual-update` (a zip) and put its
   `visual.spec.ts-snapshots` folder under `apps/web/e2e/` in the repository, then tell me; I
   commit it and switch the check on. (They must be rendered on Linux, where CI renders; my
   machine renders text differently, so I cannot make them here.)
5. **Later, when you want it:** the waitlist confirmation email (D21) and the lawyer's read of the
   Terms and privacy policy (step 13), which are now full documents rather than drafts.

### Step 16 · The app, tested end to end (added 2026-10-09, from `docs/UI_TEST_PLAN.md`)

The UI and attack-resistance plan is finished: 100 checks, every one with a verdict, in
`docs/UI_TEST_TRACKER.md`, with the evidence per area in `docs/ui-evidence/`. Nine findings
were fixed along the way. Three need you, and none is urgent:

1. **D22 · what a reminder shows on a locked phone** (2 min read). "Netflix renews in 3 days
   · $15.49" appears in full on a locked phone under Android's default; only someone who has
   turned on "hide sensitive content" sees it redacted. That is how most banking apps behave
   and the amount is the point of the reminder, so my recommendation is to keep it. Say "D22
   keep" or "D22 drop the amount".
2. **D23 · the sample ledger on a small phone** (2 min read). Onboarding shows five real
   services at real prices with "Sample figures — your ledger starts empty." underneath. On a
   4-inch phone that line falls below the fold, so the sample can read as real data. I
   recommend moving the line above the rows. Say "D23 yes" and I will do it.
3. **A global cap on the AI bill** (R33). The coach is limited to 10 requests a minute per
   account, but nothing caps the total across accounts, so the only brake is the spend limit
   on the Groq or Anthropic account itself. Either set one there (quickest) or tell me to add
   a daily cap in the API.

**Things only a real device or a download can answer**, whenever you have a spare hour:

- The older Android versions (API 24, 28, 31, 34). Each system image is about a gigabyte, so
  I have not downloaded any; everything so far is API 36. Say the word and I will fetch them
  one at a time. The one difference already known below Android 12 is that the system does
  not block tapjacking overlays (R20).
- **Your own phone**: biometrics on a real sensor, and face unlock, which an emulator cannot
  really test.
- **iOS** (R22): needs a Mac or an EAS cloud build, plus an iPhone. I will not start a cloud
  build without you asking.

### Step 14 · Your decisions

`docs/OWNER_ACTIONS.md` section 2 has the decisions D1 to D23, each with my recommendation
and why. Reply with the number and "yes", or the option you prefer, for example "D7 yes,
D12 yes, D17: yes to all". Most are five-minute reads.

---

**Fastest order if you only have one evening:** steps 1, 2, 3, 4, 5. Those close all the
High risks except the database, which has a hard date of 3 November (step 8).

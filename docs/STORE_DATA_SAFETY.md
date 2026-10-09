# Store data-safety answers — draft from the code (P8.9, 2026-10-06)

A draft of Google Play's **Data safety** form for the Android release, written from what
the release build actually sends off the phone (read in `apps/mobile` on 2026-10-06).
The owner fills in the form at submission; this is the evidence to fill it from. Play's
definitions: **collected** = sent off the device by the app or an SDK in it; **shared** =
sent to a third party, except a service provider processing it on our behalf.

Re-check this file whenever a screen or SDK starts sending something new.

## What leaves the phone, and where it goes

| Data | Sent when | To | Evidence |
|---|---|---|---|
| Email address | signing in with an email link or code | our API; Resend delivers the sign-in email | `src/auth/authStore.ts` (`/auth/magic-link`) |
| Apple or Google identity token (holds the account's email and id) | signing in with Apple or Google | our API, which verifies it with Apple or Google | `src/auth/authStore.ts` (`/auth/apple`, `/auth/google`) |
| Account id | every signed-in request (inside the access token) | our API | `src/api/client.ts` (`authHeaders`) |
| Subscription names, categories, monthly amounts, insights, the question asked | the AI coach, only after its consent switch is on | our API, then the AI provider (Groq today) | `app/coach.tsx`; `apps/api/src/coach.ts` |
| A display name, the monthly total and currency | creating or joining a household | our API; the household's members see them | `src/api/client.ts` (`/family/create`, `/family/join`) |
| Purchases and the account id (or RevenueCat's own anonymous id when signed out) | buying or restoring Pro or Family | RevenueCat and Google Play Billing | `app/_layout.tsx` (RevenueCat); `src/__screens__/root-layout.rntest.tsx` |
| Four product events (`import_completed` with its source, `share_card_generated` with which card, `free_cap_hit`, `paywall_purchase_completed`) | those actions | our API; no account id or device id is sent, and the server keeps only counts | `src/api/client.ts` (`recordFunnelEvent`); `apps/api/src/metrics.ts` |
| Crash and error reports, scrubbed of amounts, names, emails and tokens | an error, **only if a Sentry DSN is set at build time** (none is today) | Sentry | `src/monitoring/report.ts`; `scrub-edges.test.ts` |

**Never leaves the phone:** the subscription list itself (SQLCipher on the device), notes,
budgets, the PIN, Gmail message content (read on the phone, never sent to our API), the
Gmail token, CSV files imported (no push token exists: reminders are local notifications). The exchange-rate table is downloaded
from a public rate service without sending anything about the user. Bank connection
(Plaid) is not in the release build (`app/open-banking.tsx` shows it only in development).

## Draft answers

**Does the app collect or share any of the required user data types?** Yes.

**Is all of the user data collected by the app encrypted in transit?** Yes (HTTPS only;
cleartext refused by the release manifest, `app.config.test.ts`).

**Do you provide a way for users to request that their data is deleted?** Yes: in the app,
Settings → delete the account (server data erased: `apps/api/src/storage/real-pg.test.ts`)
and "Delete all my data" on the phone. Play also asks for a web link to request deletion:
**none exists yet** (owner: a page or a form, once F223's mail works, e.g. "email
privacy@zenoapp.in from the account's address").

| Play data type | Collected | Shared | Optional | Purposes |
|---|---|---|---|---|
| Personal info → Email address | Yes | No (Resend is a service provider) | Yes (the app works without an account) | Account management |
| Personal info → Name | Yes (the household display name; Apple may also pass a name at first sign-in) | No | Yes | App functionality (households) |
| Personal info → User IDs | Yes (account id) | No | Yes | Account management, app functionality |
| Financial info → Purchase history | Yes (through RevenueCat and Google Play) | No (service providers) | Yes | App functionality (unlocking Pro) |
| Financial info → Other financial info | Yes (amounts for the AI coach and the household total) | No (the AI provider processes on our behalf) | Yes (behind the coach's consent switch; households are opt-in) | App functionality |
| App activity → App interactions | Yes (the four product events) | No | No (sent without asking) | Analytics |
| App info and performance → Crash logs, Diagnostics | Only if Sentry is configured at build time; answer **No** for a build without a DSN, **Yes** once one is set | No | No | App functionality (stability) |

## For the owner to confirm before submitting

1. **Third-party SDKs' own collection** (RevenueCat, Sentry, Google Play Billing, Expo
   modules): copy each vendor's published data-safety guidance for the version in the
   build; this file covers what our code sends, not what an SDK adds by itself.
2. **The product events are sent without asking.** They carry no identifier and the server
   keeps only counts, but they are still "collected" by Play's definition. Either declare
   App interactions as above, or put them behind a setting.
3. **Data deletion web link** (above).
4. **`installreferrer`** is in the APK (P3.9) and which code reads it is not established;
   if RevenueCat or another SDK reads it, its guidance will say so.
5. **IP addresses:** the API's request log records the client IP of every request (kept up
   to 30 days, `docs/DATA_AND_LOGGING.md`). Whether that is declared follows Play's own
   guidance on IP addresses at the time of submission.
6. **iOS:** the App Store's privacy "nutrition label" follows from the same table. The iOS
   **privacy manifest** (`PrivacyInfo.xcprivacy`, required-reason APIs) is not configured
   in `app.config.ts`, and cannot be produced or checked without an iOS build: generate
   Xcode's privacy report at the first iOS build and add `ios.privacyManifests` to match.

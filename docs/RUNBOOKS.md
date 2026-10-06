# Runbooks (P8, 2026-10-05)

Step-by-step procedures for the production operations that need care. Each step says
where, and what to check after. All settings named here are environment variables on
Render → `zeno-api` → Environment unless said otherwise; saving them redeploys the API.
Key material lives in the owner's folder `zeno-keys\prod\`; never paste it into a chat,
an issue or a commit. Background: `docs/CRYPTOGRAPHY.md` (every key and its lifecycle).

## 1. Swap the JWT signing key (rotation, or a suspected leak)

Access tokens live 15 minutes; refresh tokens are not JWTs and are unaffected. With the
overlap below nobody is signed out and no request is refused.

1. Make the new pair (on your machine, never on a shared one):
   `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out JWT_PRIVATE_KEY_new.pem`
   then `openssl pkey -in JWT_PRIVATE_KEY_new.pem -pubout -out JWT_PUBLIC_KEY_new.pem`.
   (The 3072-bit pair `JWT_PRIVATE_KEY_3072.pem` / `JWT_PUBLIC_KEY_3072.pem` is already made.)
2. In Render, in one save: `JWT_PUBLIC_KEY_PREVIOUS` = the **current** public key;
   `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` = the new pair; optionally `JWT_KEY_ID` = a new
   name (for example `zeno-rs256-2026-10`).
3. After the deploy: open the app, pull to refresh anything that calls the API; it works.
4. **15 minutes later**, delete `JWT_PUBLIC_KEY_PREVIOUS` (every token signed by the old key
   has expired). For a suspected leak, delete it at once instead: users' requests may be
   refused for up to 15 minutes until the app's next refresh, which is the point.
5. Delete the old key files.

Held by `apps/api/src/routes/auth-key-rotation.test.ts` (a previous-key token verifies;
any other key is refused).

## 2. Rotate the storage encryption key

It seals stored Plaid access tokens (AES-256-GCM); each sealed value names its key.

1. Make a key: `openssl rand -hex 32`.
2. In Render, in one save: `STORAGE_ENCRYPTION_KEYS_PREVIOUS` = the current key (comma-
   separate if there are several); `STORAGE_ENCRYPTION_KEY` = the new one.
3. Check the startup log: `token-encryption=on`.
4. New values are sealed with the new key; old ones still open with a previous key.
   **There is no re-seal job**, so keep the old key in `..._PREVIOUS` for as long as any
   value sealed with it may be read (until those Plaid items are re-linked or deleted).

Held by `apps/api/src/storage/pg.test.ts` and `pg-gcm.test.ts` (rotation, tamper).

## 3. Rotate the RevenueCat webhook secret

1. Make one: `openssl rand -hex 32`.
2. Set it in RevenueCat (the webhook's Authorization value) and in Render
   (`REVENUECAT_WEBHOOK_AUTH`) within a few minutes of each other. Webhooks in between
   are refused with 401; RevenueCat retries them (5 times), and the app re-checks
   purchases itself, so nothing is lost.
3. Check: RevenueCat → the webhook → send a test event; it answers 200.

## 4. A secret was exposed (pasted, committed, logged)

1. Treat it as public from the moment it was exposed.
2. Rotate it at its source first (the provider's dashboard: Groq, Resend, Plaid,
   RevenueCat), then update Render. For our own keys use sections 1 to 3.
3. If it was committed: rotating is the fix; rewriting git history does not un-publish
   it (the repository is public, and gitleaks scans the whole history on every push).
4. Write it in `docs/HARDENING_LOG.md` with the time window it was exposed.

## 5. Back up and restore the database (drill)

The free Render database has no backups and is deleted on **2026-11-03**. Before then,
move `zeno-db` to a paid plan (Render's paid plans include backups; check what the chosen
plan keeps and for how long), and run this drill once,
then after every major change to storage:

1. Render → `zeno-db` → Info: copy the **external** connection string (you only need it
   for the drill; it is a secret).
2. On your machine: `pg_dump --format=custom --no-owner "<external url>" > zeno-drill.dump`.
3. Restore into a throwaway local database:
   `createdb zeno_drill && pg_restore --no-owner --dbname=zeno_drill zeno-drill.dump`.
4. Point a local API at it (`DATABASE_URL=postgres://localhost/zeno_drill`,
   `DATABASE_SSL=disable`, the same `STORAGE_ENCRYPTION_KEY`) and check
   `/api/v1/health/ready` answers `"postgres":"ok"`, and that a known account's
   household and billing rows are there.
5. Delete the dump and the local database; write the date, the row counts and the time
   it took in `docs/HARDENING_LOG.md`.

## 6. Uptime alerts

**Use an outside monitor for alerts, not GitHub's schedule.** GitHub runs scheduled
workflows on a best-effort basis, and on this repository it is far off: on 2026-10-05/06
the 15-minute uptime schedule fired twice in about 11 hours, and the nightly jobs ran 6
to 7 hours after their slot. An alert that late is no alert.

1. **The alert:** a free external monitor (for example UptimeRobot or Better Stack; check
   their current free tier) checking `https://zeno-api-5dwv.onrender.com/api/v1/health/ready`
   every 5 minutes, alerting by email when it is not 200 or the body lacks
   `"status":"ready"`. Each check wakes a sleeping free Render instance, so in practice
   this keeps it awake and spends the workspace's free hours (750 a month, shared with
   every free service, the old `zeno` service included): do it once `zeno-api` is on a
   paid plan, or after deleting the old service.
2. **The manual check:** `.github/workflows/uptime.yml` runs `scripts/uptime-check.mjs`
   (200, "ready", every check "ok"; one retry for a waking instance): Actions → Uptime →
   Run workflow, or locally `node scripts/uptime-check.mjs`. Its schedule only runs if the
   repository variable `UPTIME_CHECKS` is `on`, and is a backstop at best. Held by
   `scripts/uptime-check.test.ts`.

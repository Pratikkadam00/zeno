# Cryptography: inventory and key policy (P7.2, 2026-10-05)

Every key, algorithm and certificate Zeno uses, read from the code on 2026-10-05, with
where each key may and may not be used, how it is made, stored, rotated and destroyed.
This is the inventory ASVS 5.0 asks for in V11.1.2 and the key policy in V11.1.1 (it
follows NIST SP 800-57 Part 1's lifecycle: generation, distribution, storage, use,
rotation, destruction). Review it whenever a key, library or algorithm changes, and at
least at every security audit (`docs/SECURITY_AUDIT_*.md`).

All server cryptography is Node.js `node:crypto` (OpenSSL 3, bundled with Node 24). The
phone uses `react-native-quick-crypto` (OpenSSL, native), `expo-crypto` (the platform's
CSPRNG) and SQLCipher 4.7.0 (OpenSSL provider). No cryptography is written by hand.

## Keys

| Key | Algorithm, size | Used for (only) | Never used for | Made by | Stored | Rotation | Destroyed |
|---|---|---|---|---|---|---|---|
| JWT signing key | RSA 2048, RS256 (RSASSA-PKCS1-v1_5, SHA-256) | signing our 15-minute access tokens | anything else: no encryption, no other token | the owner, OpenSSL, offline | Render environment `JWT_PRIVATE_KEY`; owner's key folder | **due:** a 3072-bit pair is ready (`OWNER_ACTIONS.md`); then on suspicion of exposure. Without downtime: the old public key stays in `JWT_PUBLIC_KEY_PREVIOUS` for 15 minutes (`docs/RUNBOOKS.md` §1) | replaced in Render; `JWT_PUBLIC_KEY_PREVIOUS` and the old files deleted after 15 minutes (the last token it signed has expired) |
| JWT public key | RSA 2048 | verifying our access tokens | — (public) | with the above | Render `JWT_PUBLIC_KEY` | with the above | with the above |
| Storage encryption key | AES-256 (32 random bytes) | sealing stored Plaid access tokens (AES-256-GCM) | signing, hashing, any other data | the owner, `openssl rand` | Render `STORAGE_ENCRYPTION_KEY`; owner's key folder | new key in `STORAGE_ENCRYPTION_KEY`, old ones in `STORAGE_ENCRYPTION_KEYS_PREVIOUS` until every row is re-sealed; each envelope names its key (`kid`, a fingerprint) | removed from `..._PREVIOUS` once no row names it |
| Billing webhook secret | 32+ random bytes, shared with RevenueCat | authenticating RevenueCat's webhook | anything else | the owner | Render `REVENUECAT_WEBHOOK_AUTH`; RevenueCat | on suspicion of exposure (both sides at once) | replaced on both sides |
| Metrics token | random | reading `/metrics` | anything else | the owner | Render `METRICS_TOKEN` | on suspicion of exposure | replaced |
| Provider API keys (Resend, AI provider, RevenueCat secret, Plaid) | the provider's | calling that provider only | — | the provider | Render environment | at the provider; **the keys pasted into a chat must be rotated** (`OWNER_ACTIONS.md`) | revoked at the provider |
| Device database key | 2 × UUIDv4 from the platform CSPRNG (244 random bits), as a SQLCipher passphrase | opening the phone's SQLCipher database | leaving the phone | the app, at first launch | Keychain / Keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (not in backups) | not rotated (the data never leaves the device); erased with the app's data | "Erase this device" or uninstall |
| PIN verifier | PBKDF2-HMAC-SHA256, 600,000 iterations, 16-byte random salt | checking the app-lock PIN | — | the app | Keychain / Keystore | whenever the PIN changes | with the PIN |

Apple's and Google's identity-token keys are theirs: fetched from their JWKS endpoints
over TLS, cached, and used only to verify their RS256 tokens.

## Algorithms and where they are used

| Purpose | Algorithm | Where |
|---|---|---|
| Access tokens (ours) | RS256 | `apps/api/src/routes/auth.ts` (`verifyAccessToken`); `alg` must be RS256: `none`, and HS256 signed with the public key, are refused (`auth-guard.test.ts`, `authz-matrix.test.ts`) |
| Apple / Google identity tokens | RS256, keys from JWKS | `auth.ts` (`verifyRemoteJwt`) |
| Stored Plaid tokens | AES-256-GCM, 96-bit random IV per seal, 128-bit tag | `apps/api/src/storage/pg.ts` (`sealValue`, `openValue`); a modified envelope does not open (`pg.test.ts`) |
| Refresh tokens and sign-in links at rest | SHA-256 (the tokens are 256 random bits, so a fast hash is right) | `auth.ts` (`hashToken`) |
| Sign-in codes at rest | not hashed: stored with their link's record. Six digits would fall to any hash by trying all million; what protects a code is its 10-minute life and the wrong-guess budget | `auth.ts` (`MagicLinkRecord`) |
| Secret comparison (webhook, metrics, nonce, codes) | constant-time (`timingSafeEqual`, over SHA-256 digests where lengths differ) | `apps/api/src/billing.ts`, `apps/api/src/app.ts`, `auth.ts` |
| Random values | `crypto.randomBytes`, `crypto.randomInt`, `crypto.randomUUID` (OpenSSL CSPRNG); on the phone `expo-crypto` | sign-in link token: 256 bits; refresh token: 256 bits; sign-in code: 6 digits; household share code: 8 characters from 31 (about 40 bits); ids: 64 bits or UUIDv4 |
| Phone database | SQLCipher 4.7.0 defaults: AES-256-CBC per page with a random IV, HMAC-SHA512 per page (encrypt-then-MAC), key from PBKDF2-HMAC-SHA512 with 256,000 iterations | `apps/mobile/src/storage/database.ts`; `apps/mobile/app.config.ts` (`useSQLCipher`) |
| App-lock PIN | PBKDF2-HMAC-SHA256, 600,000 iterations (OWASP's current figure) | `apps/mobile/src/security/app-lock.ts` |
| TLS | TLS 1.2 and 1.3 only; on TLS 1.2 only ECDHE with AES-GCM (RSA key exchange and CBC suites refused). Measured on the live hosts 2026-10-05 with `scripts/tls-check.mjs` | Render (API), Netlify (website) |

Not used anywhere: MD5, SHA-1, ECB, RSA encryption (and so PKCS#1 v1.5 encryption
padding), DES/3DES, RC4, `Math.random` for anything secret. CodeQL scans every push for
weak cryptography.

## Certificates

| Certificate | Issued by | Renewed by |
|---|---|---|
| `zeno-api-5dwv.onrender.com` | Google Trust Services (WE1), through Render | Render, automatically |
| `zenoapp.in`, `www.zenoapp.in` | Let's Encrypt (YE1), through Netlify | Netlify, automatically |
| Render internal Postgres | self-signed by Render; **not verified** (Render does not support verification on the internal network; accepted risk, P0.3) | Render |

## Known gaps

- **RSA 2048 gives about 112 bits of security**, under ASVS's 128 (V11.2.3). The 3072-bit
  pair is generated; the owner puts it into Render (`OWNER_ACTIONS.md`). Swapping it logs
  no one out: only access tokens (15 minutes) are signed with it.
- **The household share code has about 40 bits.** It is typed by people, so it is short on
  purpose; guessing is bounded by the join route's rate limit and the 5-member cap, and a
  code reveals only that household's names and totals. Recorded as a partial (V11.5.1).
- **Crypto agility (V11.2.2):** the algorithm is a named constant at each use (RS256 in
  the token header; `aes-256-gcm` with a key id in each envelope; PBKDF2 with a version
  and iteration count stored next to each PIN verifier, which already migrated once, v2
  to v3). Changing an algorithm is a code change and a release, not a setting.

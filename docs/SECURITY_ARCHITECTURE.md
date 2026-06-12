# Security Architecture

## Current Implementation

- Mobile uses `expo-secure-store` for database keys, theme preference, PIN hash, and OAuth token storage.
- Mobile app config enables `expo-sqlite` SQLCipher for development builds.
- SQLite migrations create local tables for profiles, subscriptions, renewal events, notification preferences, imports, sync outbox, and audit events.
- API sync endpoints accept encrypted changes only; plaintext financial records are rejected by schema.
- API auth issues RS256 access tokens, rotates refresh tokens, and stores only hashed refresh-token IDs server-side.
- Magic-link auth uses short-lived random six-digit codes. Dev code/link echoes are only returned when the local dev mail adapter is active and `NODE_ENV !== "production"`.
- Local demo login is for emulator/dev QA only. It is unavailable in production and can be disabled with `DEMO_LOGIN_ENABLED=false`.

## Data Boundaries

- Local device: subscription names, renewal dates, prices, categories, import batches, audit events.
- Server: account ID, hashed email, plan, theme preference, encrypted sync envelopes when implemented.
- Never committed: provider secrets, private keys, OAuth tokens, bank credentials, raw CSVs.

## CSV Lifecycle

1. User selects exported bank CSV.
2. Parser maps rows in memory.
3. Recurring detector produces normalized candidates.
4. User confirms candidates.
5. Only normalized subscriptions and import metadata are written to encrypted SQLite.
6. Raw CSV text is discarded.

## Dev-Build Constraint

SQLCipher is not supported in Expo Go. The app is intentionally configured for Expo development builds so encryption config plugins are applied before testing security-sensitive flows.

## Deferred Production Work

- Add key rotation and encrypted sync payload format.
- Add certificate pinning after native networking layer is finalized.
- Add OWASP ZAP and mobile security test jobs in CI.
- Add one-tap local data export and wipe flows.
- Add a dependency-audit gate once current upstream moderate findings in Next/PostCSS and Expo/xcode/uuid have non-breaking patched releases.

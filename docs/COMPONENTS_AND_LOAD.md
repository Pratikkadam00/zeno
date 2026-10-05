# Third-party components and costly functions (P7.2, 2026-10-05)

Two decisions ASVS 5.0 asks to have written down: how fast a vulnerable or outdated
component must be dealt with (V15.1.1), and which functions cost a lot to run and how
they are kept from taking the service down (V15.1.3).

## 1. Remediation time frames

| Case | Deadline | How it is held |
|---|---|---|
| A **high or critical** advisory in any installed package | before the next deploy: CI fails on it, and `main` deploys only when CI passes | `scripts/audit-gate.mjs` (blocking on every push) |
| An exception to the above (no fix exists, or the code is unreachable) | accepted only with a written reason and an expiry of at most 3 months; re-reviewed when it expires | `.audit-allowlist.json`; the gate fails on an expired entry |
| A **moderate or low** advisory | reviewed within 30 days of it appearing; fixed within 90 days where it reaches the API, the website or the app bundle, else recorded with its reach | the weekly Dependabot run and this file |
| Routine version updates | proposed weekly (7-day cooldown against malicious releases); patch updates merged when green; Expo / React Native minor and major versions only as a deliberate SDK upgrade | `.github/dependabot.yml` |
| The inventory itself | a CycloneDX SBOM of the whole lockfile on every CI run, kept 30 days; every package from the npm registry, pinned by the lockfile's integrity hashes; Actions pinned by commit SHA | `.github/workflows/ci.yml` |

**State on 2026-10-05** (`npm audit`): 0 critical. 58 packages flagged high, all from 4
advisories, each accepted with a reason and an expiry (`image-size` ×2 to 2026-12-31,
`node-forge` and `braces` to 2026-11-30); none reaches the API, the website or the app
bundle. 4 moderate advisories, reviewed today, none reaching the API or website at run
time (`npm ls --omit=dev` for both is empty for each):

| Advisory | Package | Reach |
|---|---|---|
| GHSA-82fw-gwwq-j7x9 | vitest, @vitest/mocker (< 4.1.11) | test runner only; fix: vitest 4.1.11, due by 2027-01-03 |
| GHSA-q8mj-m7cp-5q26 | qs | Expo build tooling only |
| GHSA-w5hq-g745-h8pq | uuid (< 11.1.1) | Expo build tooling only |
| GHSA-vcc3-ghjq-m6fr | decode-uri-component | Expo build tooling only |

## 2. Costly functions and their limits

| Function | Why it costs | Limits |
|---|---|---|
| AI coach (`POST /api/v1/coach`) | each call is a paid model request lasting seconds | 10 per account per minute; input bounded (200 subscriptions, a 500-character question); one deadline of 30 s for the whole call, retries included; on failure or timeout the app falls back to its on-device advice |
| Sign-in email (`POST /auth/magic-link`) | a paid email, and a way to spam a third party | 5 per address per 15 minutes, plus the route's per-IP limit |
| Apple / Google sign-in | may fetch the provider's keys | key refetch at most once per 30 s per provider, whatever the requests say (F83) |
| Sync push | up to 100 changes per call | 100 changes, 8 KB per payload, 1 MB per body, 1,000 entities per account |
| Every route | — | a per-route limit under a global 100 per minute per IP; 30 s request timeout; 8 s deadline on every outbound call |
| App-lock PIN check (phone) | PBKDF2, 600,000 iterations | runs on the user's own phone, only when they enter a PIN |

The single API instance means one heavy client can still slow others before its limit
bites; scaling past one instance is planned work (`docs/SCALE_FOUNDATION.md`).

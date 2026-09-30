# Zeno — Hardening Log

Live tracker and findings log for `docs/PRODUCTION_HARDENING_PLAN.md`.
Every entry records **what was done, the command that proved it, what was found, and
what still needs fixing**. Nothing here is estimated: if a line says "verified", the
evidence is next to it.

Legend: `[x]` done and verified · `[~]` in progress · `[ ]` not started · `[!]` blocked (reason given)

---

## Tracker

- [x] **P0 — Foundations: CI hardening, secret scan, coverage scope** (P0.6 waits on the owner)
  - [x] P0.1 Coverage scope: exclude generated `.next/**`; guard against unexplained `v8 ignore`
  - [x] P0.2 Secret scan: gitleaks over full git history (local) + CI job on every push/PR
  - [x] P0.3 Static analysis (SAST): CodeQL workflow + semgrep with zero-findings gate
  - [x] P0.4 Workflow hygiene: SHA-pinned actions, least-privilege `permissions`, `concurrency`, audit gate blocking in CI
  - [x] P0.5 Dependabot (npm + GitHub Actions) + SBOM on release
  - [!] P0.6 Branch protection on `main` (owner action — documented; `main` verified UNPROTECTED)
  - [x] P0 gate: all standing gates green locally; new CI jobs green on GitHub
- [~] **P1 — Tier 1 logic to 100 % coverage** (order = risk; each sub closes the findings named)
  - [x] P1.1 `apps/api/src/server.ts` (0 %) — boot, env matrix, logger; **fixes F9** (tokens in request logs)
  - [x] P1.2 `apps/mobile/src/security/*` — secure-store, lock-store (48 %), app-lock; **fixes F13** (Gmail SecureStore key)
  - [x] P1.3 `apps/mobile/src/discovery/*` (emailScanner 48 %, csvParser, helpers) + shared receipts — untrusted email/CSV input; **fixes F12, F17, F20**
  - [ ] P1.4 `apps/mobile/src/auth/authStore.ts` (51 %) — token lifecycle; **verdict on F10/F11** (with the API side)
  - [ ] P1.5 `apps/mobile/src/storage/database.ts` (59 %) + `subscription-repository.ts` (0 %)
  - [ ] P1.6 `apps/mobile/src/billing/revenueCat.ts` (55 %)
  - [ ] P1.7 `packages/service-catalog/src/services.ts` (0 %) — catalog invariants for all 509 entries
  - [ ] P1.8 React providers under jest with their own coverage floor: `subscription-store.tsx` (601 lines), `budget-store.tsx`, `theme-provider.tsx`, `LockOverlay.tsx`
  - [ ] P1.9 remaining 0 % / low files (theme, notifications, widgets, api/config, format, subscription-ui, open-banking, analytics-flag, utils, next.config, app.config)
  - [ ] P1.10 `apps/api/src/plaid.ts` (21 %) — pure parts; sandbox flows stay dev-only by standing instruction
  - [ ] P1.11 gate: Tier 1 at 100 % lines / statements / functions, ≥ 95 % branches; jest floor; green on GitHub
- [ ] **P2 — API on real Postgres, authorization matrix, fuzzing**
- [ ] **P3 — Mobile hardening (MASVS) + tests for all 29 screens**
- [ ] **P4 — Website component tests, Playwright, CSP, DAST**
- [ ] **P5 — Mobile end-to-end (Maestro on the emulator)**
- [ ] **P6 — Mutation + property-based testing**
- [ ] **P7 — Security verification v2 with evidence**
- [ ] **P8 — Infrastructure and operations (owner-driven)**

---

## Open findings / fixes needed

Items found during the work that are not yet fixed. Each has an owner and the phase
that closes it.

| # | Finding | Severity | Owner | Closes in |
|---|---|---|---|---|
| F1 | `apps/mobile/components/subscriptions/ServiceAutocomplete.tsx` (RN component, also exports `servicePriceLabel`) has no test in any runner | Test gap | me | P3 (screen/component tests) |
| F2 | **Production API likely ran with per-client rate limiting broken** from the 2026-09-29 deploy of `9eb4721` until `064fc52` deploys: Fastify 5.12.5 made the numeric `trustProxy: 1` trust nobody, so every visitor shared the load balancer's rate-limit bucket (one noisy client could 429 everyone, incl. login). Render auto-deploys `main` and starts with `tsx` (no typecheck), so the type break did not stop the deploy. **Fixed in code**; the owner should confirm the Render deploy of `064fc52`+ is live. | High (availability of auth) | owner: confirm deploy | P0.2 (fixed) |
| F3 | Whether the address Render's load balancer appends is the real client or a Cloudflare edge is unverified (Render staff, May 2021: "we set the first IP in the list to the real client IP"). With 1 trusted hop, request.ip is the LAST appended address. Check in Render logs: the pino request log's `remoteAddress` for your own request should equal your public IP. If it shows a Cloudflare IP, set `TRUST_PROXY_HOPS=2`. | Medium (rate-limit granularity) | owner: one log check | P8 |
| F4 | Render builds with `npm install` (not `npm ci`) and deploys every push to `main` regardless of CI status (`autoDeploy: true`), and the start command (`tsx`) never typechecks. A red CI does not stop a deploy. | High (process) | **fixed in `render.yaml` (P0.4)**; owner: confirm the Render service is Blueprint-managed so the change applies (if it was created by hand, set "Auto-Deploy: After CI checks pass" in the dashboard) | P0.4 |
| F5 | CI ran **Node 20, end-of-life since 2026-04-30**. Production was worse-defined: Render reads `engines`, and per Render's docs an unbounded range like our `>=20.11.0` "always resolves to the latest release" — whatever Node major is newest, not an LTS. | High (unpatched / unpinned runtime) | **fixed (P0.4)**: `.node-version` = 24 (Render reads it before `engines`), engines `>=24 <25`, CI via `node-version-file` | P0.4 |
| F7 | **`main` is not protected** (GitHub API: `protected: false`, required checks `[]`): force-push and branch deletion are allowed, and nothing requires checks before code lands. | High (integrity of the deploy branch) | owner: the P0.6 steps below | P0.6 |
| F8 | GitHub's own free protections for public repos are not verifiable without owner auth: secret-scanning **push protection** (rejects a push that contains a secret, server-side), Dependabot **alerts** and **security updates**. | Medium | owner: enable in Settings → Code security | P0.6 |
| F9 | **FIXED in P1.1.** ~~Magic-link login tokens are written to production logs.~~ Fastify's default request log includes `req.url` with the query string, and `GET /api/v1/auth/verify?token=…` carries the raw token. Verified by a probe with the exact production logger config: the log line held `"url":"/api/v1/auth/verify?token=PROBE-SECRET-MAGIC-TOKEN-123"`. Single-use limits it, but a verify that fails before consuming the token (e.g. 429) leaves a working login token in Render's logs. | High (credential in logs) | me | P1 (`server.ts`) |
| F14 | The PIN lockout window is measured with the device clock, so someone holding the unlocked phone can move the clock forward past the 15-minute lockout (each cycle still costs 10 attempts and a trip to Settings). No trusted time source on-device; rollback detection is possible. | Low | me | P3 (MASVS) |
| F15 | `checkStatus` trusts the server's plan but falls back to the client's RevenueCat view when the server is unreachable. Client-only features are bypassable by any modified client regardless; what matters is that PAID SERVER features (coach, family, sync) check entitlement server-side. | Medium (to confirm) | me | P2 (authz matrix) |
| F16 | Local DB encryption is configured (`useSQLCipher: true` in app.config; `expo.sqlite.useSQLCipher=true` in the generated gradle.properties), but never PROVEN at runtime: needs `PRAGMA cipher_version` on a device, or a check that the file header of `zeno.db` is not the plaintext "SQLite format 3". | Medium (unverified claim) | me | P3 (on device) |
| F10 | Google sign-in: a nonce is sent to Google but NOT to our API (`/auth/google` gets only the token), so the server cannot bind the ID token to this sign-in (replay of a stolen token). Apple sign-in requests no nonce at all. Needs the server side read in full before a verdict. | Medium (to confirm) | me | P1 (`authStore.ts`) + P2 |
| F11 | Google sign-in uses the implicit ID-token flow returned to the custom scheme `zeno://auth/google`, and Gmail connect also uses expo-auth-session. **Google's own native-app guide, verbatim: "Custom URI schemes are no longer supported on Android and Chrome apps."** So on Android these flows are likely REJECTED by Google, not just weaker. Cannot be confirmed at runtime without the real Google client IDs (A3). Likely fix: Google's native Credential Manager / Sign in with Google SDK, or App Links redirects. | **High (likely broken on Android)** | owner: client IDs (A3); me: migrate | P3 |
| F12 | **FIXED in P1.3** (revocation, label); sender-spoofing part ACCEPTED as low with evidence (see P1.3). ~~Gmail: disconnect revokes with the token in the URL query (`…/revoke?token=`); the fallback account label embeds the first 8 characters of the access token; known billing senders are trusted from the spoofable `From` header alone (no DKIM/SPF check). | Low–Medium | me | P1 (`emailScanner.ts`) |
| F13 | **FIXED in P1.2.** ~~Gmail connect fails on every real device.~~ Tokens are stored under `zeno.oauth.gmail.acct.<address>`, but expo-secure-store 56.0.4 rejects keys outside `/^[\w.-]+$/` (source: `ensureValidKey` in `build/SecureStore.js`, applied to get/set/delete), and an address contains `@`. The existing tests pass only because their fake SecureStore does not enforce that rule. | High (feature broken on device) | me | P1.2 |
| F17 | **FIXED in P1.3.** ~~Store receipts: the app name ran across line breaks and kept heading words ("App Store receipt
Netflix (Monthly)" → "Store receipt Netflix"), so a real Netflix App Store receipt matched nothing.~~ | Medium (correctness) | me | P1.3 |
| F18 | CSV import labels every detection USD. Correct for the five US bank formats it recognises; a "Generic" CSV from a non-US bank would be mislabelled (engineering standards: currency honesty). | Medium | me | P1.9 (with the shared money parser) |
| F19 | Wells Fargo CSV: detected by a first row of 5 cells with ≥2 `*`, and that first row is then dropped as a "header". If real WF exports have no header row, the first transaction is silently lost; if their placeholder cells differ, the format is not detected at all. Needs a REAL (redacted) Wells Fargo export to verify. | Medium (unverified assumption) | owner: one sample file | P1.9 |
| F20 | **FIXED in P1.3.** ~~CSV merchant cleanup stripped ANY last word of 2+ letters ("APPLE MUSIC" → "Apple", "DISNEY PLUS" → "Disney"): distinct subscriptions merged into one group with an averaged amount, and groups whose amounts then differed were dropped.~~ | High (wrong / missing detections) | me | P1.3 |
| F21 | `Date.parse` is lenient: "02/30/2026" becomes 2 March, "February 31, 2026" becomes 3 March. Receipt/CSV dates can silently shift. | Low (correctness) | me | P6 (property tests) |
| F22 | **A stale compiled `packages/service-catalog/src/services.js` (tracked, last changed 2026-06-14) SHADOWS `services.ts`.** `index.ts` exports from `"./services.js"`; a probe proved Vitest loads the `.js` file (a different module instance from `services.ts`). Data is identical today (probe: 0 differences over 509 entries, same exports), but any edit to `services.ts` is silently ignored wherever the `.js` wins, and coverage measured the wrong file (why `services.ts` showed 0 %). The `.js` may be load-bearing for Metro, which does not map `./x.js` to `x.ts`, so removal must be verified per consumer (Vitest, Next build, Metro bundle, API dist). | Medium (silent-edit trap) | me | P1.7 |
| F6 | My earlier session reports said "all gates green" from LOCAL runs only; GitHub CI had been red for 13 pushes (since `9eb4721`). From now on a gate counts as green only when the GitHub run for that commit is green. | Process | me | — (rule adopted) |

---

## Log

### Baseline (before P0) — main @ `f01ba09`, 2026-09-30

Measured, from `PRODUCTION_HARDENING_PLAN.md` §1:

| Gate | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors |
| vitest | 550 / 550 tests, 60 files |
| RN (jest-expo) | 22 / 22 tests, 2 files |
| Coverage (Tier 1) | lines 63.55 %, statements 62.86 %, functions 63.01 %, branches 55.95 % |
| Web build | OK, 509 guides |
| Audit gate | PASS |

Tooling on this machine: `gitleaks`, `semgrep`, `docker`, `go`, `gh` absent;
`winget`, `pip` 24.0, `npm` 11.12.1 (has `npm sbom`) present.

### P0.1 — Coverage scope + ignore guard — DONE 2026-09-30

**What was wrong (found by listing every file in the coverage summary):**
- Two generated Next.js files (`apps/web/.next/types/validator.ts`,
  `apps/web/.next/dev/types/validator.ts`, 23 lines each, 0 %) were counted in the
  Tier 1 scope. The scope therefore changed depending on whether `next dev` had run.
- `apps/mobile/components/subscriptions/ServiceAutocomplete.tsx` (a React Native UI
  component, 20 lines, 0 %) escaped the existing `apps/mobile/src/components/**`
  exclusion because it lives outside `src/`. It cannot run under vitest's node
  environment; it belongs to Tier 2 (tracked as F1).
- Nothing stopped anyone from reaching the floor by hiding code: zero ignore comments
  existed (`grep -rnE '(v8|istanbul|c8) ignore'` → none), but no rule governed them.

**What was done:**
- `vitest.config.ts`: excluded `**/.next/**` and `apps/mobile/components/**`, each with
  a comment giving the reason. Config files (`next.config.ts`, which builds the CSP and
  security headers, and `app.config.ts`) deliberately stay in scope.
- New `scripts/coverage-ignore-guard.test.ts`: every `v8|c8|istanbul|node:coverage
  ignore` comment in `apps/`, `packages/`, `scripts/` must read
  `ignore next|start -- <reason, 15+ chars>`; `ignore file` is banned outright
  (scope changes belong in the config). 6 self-tests prove the rule; 1 repo scan.

**Evidence:**
- Probe (temporary files, removed): under the installed `@vitest/coverage-v8`, an
  `ignore next -- reason` line and an `ignore start -- reason … stop` block both
  dropped out of the report, while an un-ignored control line was still reported
  uncovered (`Uncovered Line #s: 16`). So the required format is one the tool honours.
- Bite test: appending `/* v8 ignore next */` to `apps/web/lib/utils.ts` made the guard
  fail with `apps/web/lib/utils.ts:8 missing a reason`; file restored byte-identical
  (`git diff --quiet`).
- Full run: 61 files / 557 tests pass. Scope 90 → 87 files.

| Coverage | Before | After | Covered count |
|---|---:|---:|---|
| Lines | 63.55 % | 64.64 % | 2,501 → 2,501 (unchanged) |
| Statements | 62.86 % | 63.95 % | 2,656 → 2,656 |
| Functions | 63.01 % | 63.72 % | 564 → 564 |
| Branches | 55.95 % | 56.43 % | 1,569 → 1,569 |

The rise is **only** the removal of 66 uncovered lines that were never ours to test,
not new testing. The ratchet wrote the new floors into `vitest.config.ts`.

### P0.2 — Secret scan (gitleaks) — and the CI outage it uncovered — 2026-09-30

**Tool:** gitleaks 8.30.1, installed with `winget install --id Gitleaks.Gitleaks --scope user`
(official package: publisher Gitleaks LLC, MIT; winget verified the installer hash).

**Full-history scan (every commit, every ref):**
`gitleaks git --log-opts="--all" --redact` → 253 commits, 6.19 MB, **2 findings**, both
rule `generic-api-key`. Each was read at its commit, not judged from the rule name:

| Finding | What the line really is | Verdict |
|---|---|---|
| `apps/api/src/storage/pg.test.ts:5` @ `9bd56ae` | the constant `TEST_KEY`, whose value is the sequential hex 0011…ccddeeff repeated twice: a throwaway AES key for the encryption round-trip test | False positive |
| `apps/mobile/src/data/subscription-store.tsx:73` @ `788b30a` | the constant `quietHoursMetaKey`, whose value is the text notification.quietHours.v1: the name of a local SQLite row | False positive |

Both are allowlisted in the new `.gitleaksignore` by **exact fingerprint**
(commit:path:rule:line) with the reason, so any other line — or a new secret on
the same line later — still fails. Re-scan: **no leaks found**, exit 0. Also clean:
uncommitted changes (`--pre-commit`) and the untracked design-handoff folder
(`gitleaks dir`, 1.24 MB) in case it is ever committed by accident.

**Bite test:** a throwaway repo in the scratchpad with a randomly generated
GitHub-token-shaped string → `leaks found: 1`. Repo deleted.

**CI job:** new `secret-scan` job in `ci.yml` — full-history checkout
(`fetch-depth: 0`, `persist-credentials: false`), gitleaks 8.30.1 downloaded and
verified against the SHA-256 from the release's official checksums file
(`551f6fc8…70eb`; verified locally: `sha256sum --check` → OK, archive holds the
`gitleaks` binary at its root), then the same redacted full-history scan.

#### Incident found while checking CI: GitHub CI red on 13 consecutive pushes

Reading the GitHub API (the repo is public) showed CI **failing on every push
since `9eb4721` (2026-09-29)**, while my local runs said green. Step: Typecheck,
6 errors in `apps/api/src/app.ts`.

- **Root cause (code):** `9eb4721` moved fastify 5.8.5 → 5.12.5. In 5.12 a
  numeric `trustProxy` is fail-closed at runtime (`lib/request.js`: "Hop-count-only
  trust cannot validate the immediate peer. Fail closed") and the types dropped
  `number`. Our production default was the number `1`.
- **Root cause (why local was green):** `tsc -b` trusts `.tsbuildinfo` and does
  not notice upgraded `node_modules`; `tsc -b --force` reproduced CI's 6 errors
  exactly. Every installed package matched the lockfile (1,573 checked, 0 drift).
- **Security impact (reproduced by test before the fix):** in production mode
  `request.ip` was the load balancer (`10.20.30.40`) for every visitor, and a
  second client got `429` after the first exhausted the limit → finding F2.
- **Fix `064fc52`:** explicit hop function `(addr, hop) => hop < N` (the
  semantics production ran before the upgrade), strict `TRUST_PROXY_HOPS` parsing
  (digits only, max 5). No code reads `request.host`/`protocol`, so trusting the
  proxy hop opens no host-header path (grep-verified). `typecheck:refs` now uses
  `tsc -b --force` (+1.5 s). New `trust-proxy.test.ts`: 9 tests, 5 of which
  failed on the old code.
- **Second defect found by a fresh-clone run (`253016e`):** a Windows clone
  (`core.autocrlf=true`) checked `scripts/audit-gate.mjs` out with CRLF (66 CR
  bytes; git blob 0) and vitest could not import it — 10 tests silently dropped.
  Converting to LF → 10/10 pass. Fixed with `.gitattributes` (`* text=auto
  eol=lf`, binaries explicit); `git add --renormalize .` changed no stored content.
- **Fresh clone + `npm ci`, every CI step:** typecheck 0 · lint 0 · vitest
  566/566 · RN 22/22 · coverage floor PASS · web build OK · audit gate PASS.

**P0.2 closed:** GitHub run `36717148673` @ `b2e6ea3`: both jobs green (build, secret
scan). The first CI run of the job (`c8cdba2`) had failed on a finding in THIS log (it
quoted the flagged assignment); reproduced in a fresh GitHub clone with CI's exact
command, allowlisted by fingerprint, reworded. Rule adopted: scan after committing,
before pushing.

### P0.3 — Static analysis (semgrep + CodeQL) — 2026-09-30

**semgrep 1.178.0** (isolated venv in the scratchpad), packs: OWASP Top 10, Node,
JavaScript, TypeScript, React, Next.js, GitHub Actions. First run over `apps packages
scripts` (291 files): **2 findings**, both in `apps/api/src/storage/pg.ts`, both read in
full before judging:

| Finding | What it really is | Resolution |
|---|---|---|
| `bypass-tls-verification` pg.ts:48 | Postgres TLS with `rejectUnauthorized: false` for EVERY host | **Accepted for Render's internal URL, fixed everywhere else.** Render docs, verbatim: "Because these certificates are self-signed, internal connections do not support sslmode=verify-ca or sslmode=verify-full." `render.yaml` wires the internal connection string. New explicit `DATABASE_SSL` modes: `require` (default, Render internal), `verify` (full verification, optional `DATABASE_CA_CERT`), `disable` (local). A typo resolves to `verify` (never weaker) and is FATAL at production boot (`config.ts`). Inline `nosemgrep` with the reason; `--disable-nosem` proves the suppression is what hides it. |
| `gcm-no-tag-length` pg.ts:187 | AES-256-GCM decipher without `authTagLength`: Node accepts tags down to 4 bytes | **Fixed:** tag length pinned to 16 on cipher and decipher; envelopes shorter than iv+tag+1 rejected. Honest note: not exploitable before, because the fixed 16-byte slice mixed tag and ciphertext, so a short tag never authenticated. The spy test `pg-gcm.test.ts` asserts the option and FAILS when it is removed (bite-checked). |

- 4 semgrep parse errors are a semgrep JSX limitation (a literal `&` in page text:
  discover.tsx, legal/cookies, legal/privacy, legal/terms); partial parsing still scans
  the rest of each file. CodeQL parses them fully.
- Scanning `.` also covered the workflows: **4 × `github-actions-mutable-action-tag`**
  (`@v4` in ci.yml / release.yml). Fixed here so the gate goes live green: pinned to
  `actions/checkout@d23441a4… # v6.1.0` and `actions/setup-node@24997072… # v6.5.0`
  (SHAs from `git ls-remote`; manifests read at those commits: both `using: node24`).
- `.semgrepignore`: tests (they contain the patterns they assert against), design
  mockups, generated output. Final local scan: **0 results, 271 files, exit 0**.
- CI: `sast-semgrep` job (image `semgrep/semgrep:1.178.0@sha256:32e45996…`, `--error`).
- **CodeQL** (`.github/workflows/codeql.yml`): `github/codeql-action@2892aa5e… # v4.38.2`,
  `security-extended`, build-mode none, weekly schedule; least-privilege permissions.
  CodeQL never fails a job on findings by itself and the Security tab needs write
  access, so new `scripts/sarif-gate.mjs` prints each result as a run annotation and
  exits 1 on any; it refuses to pass when no SARIF exists. 11 tests.
- Tests added: TLS modes (5), GCM (3 + spy), config validation (3). Local gates:
  typecheck 0 · lint 0 · vitest 589/589 (64 files) · lines 64.97 %.

#### CodeQL's first run: 6 findings (gate failed the job, as designed)

GitHub run `36717800798` @ `a3fd4a7`: CI green (build, secret scan, semgrep); CodeQL's
analysis succeeded and **the SARIF gate failed on 6 results**, read from the run
annotations. Each was read in the code before judging:

| Rule | Where | What it really was | Fix |
|---|---|---|---|
| `js/log-injection` ×2 + `js/tainted-format-string` ×2 | pg.ts persist/delete failure logs | **Real, and a privacy leak.** The key went into the FIRST `console.error` argument. Keys are raw **email addresses** (`auth_legacy`), client-chosen sync record ids, and RevenueCat user ids from webhook payloads, so a DB outage would write emails into production logs; a client could also forge log lines with CR/LF or garble them with `%s`/`%o`. | Constant message + `{ op, namespace, keyRef }`, where `keyRef` = first 12 hex of SHA-256(key): correlatable, not the key. Same treatment for the clear-failure log. Test plants an email + newline + `%s %o %c` key: only the constant message and hash are logged. **Bite-checked:** the old log line fails both tests. |
| `js/user-controlled-bypass` | auth-guard.ts:60 | `token ? verifyAccessToken(token) : null`: whether verification RAN depended on the client. Not a bypass (both paths end in 401), but the pattern is the one real bypasses use. | Verify unconditionally: `verifyAccessToken(readBearer(h) ?? "")`; `verifyAccessToken("")` returns null at its first check (existing test). New `auth-guard.test.ts` (12 tests): 10 malformed header shapes incl. `alg: none` all return the SAME 401 body; an unknown route stays a 404. Confirmed from Fastify's source that the guard's public check uses the server-registered route pattern (`config.url = prefix + path`), and the 404 context has none. |
| `js/bad-tag-filter` | emailScanner.ts:536 | The `<script>` stripper missed `</script >`, `</SCRIPT` + newline + `>`, `</script foo>`. Output is only parsed (no WebView/innerHTML in the app), so no XSS, but surviving script text fed the amount parser. | End tags with whitespace/attributes; comments stripped first. Test: three hidden `$0.99` in a spaced-end-tag script no longer outvote the real `$15.49`. **Bite-checked:** 4 new tests fail on the old regexes. |

Tooling note learned the hard way: backslash escapes typed into a Bash command are
collapsed by the tool layer (`\n` arrived as a real newline; `\b` as a backspace), which
twice broke an edit and once silently voided a bite check. Scripts with backslashes are
now written with the file-write tool.

Local gates after the fixes: typecheck 0 · lint 0 · vitest 609/609 (65 files) · RN
22/22 · lines 65.11 % · semgrep 0 results over 273 files.

**P0.3 closed:** GitHub runs @ `ba5d7e3`: CI `36719137562` success (build, secret scan,
semgrep); CodeQL `36719137564` success (**0 findings**: the scanner itself accepts all
six fixes, including the hashed log reference).

### P0.4 — Workflow hygiene, Node runtime, deploy gating — 2026-09-30

- **Actions pinned by SHA** (done in P0.3 so the SAST gate went live green); semgrep's
  `github-actions` pack now enforces it on every run.
- **Least privilege:** `permissions: contents: read` at workflow level in `ci.yml` and
  `release.yml` (CodeQL already job-scoped: `contents: read`, `security-events: write`,
  `actions: read`). No job writes to the repo.
- **Concurrency:** `ci-${{ github.ref }}`; a newer push to the same PR cancels the stale
  run; `main` runs are never cancelled, so every main commit gets a full verdict.
- **Timeouts:** build 25 min, secret scan 10, semgrep 15, CodeQL 30, release 25 (a hung
  job can no longer burn the default 6 hours).
- **Audit gate BLOCKING in CI** (was report-only). Reason: `main` now deploys once checks
  pass, so a report-only audit would let a known high/critical ship. Exceptions stay
  reviewed + expiring in `.audit-allowlist.json`.
- **Node 24 everywhere (F5):** new `.node-version` = `24`; `engines` `>=24 <25` in the
  root and `apps/api` (bounded, per Render's docs); CI, release and CodeQL read
  `node-version-file: .node-version`. The lockfile change is metadata only
  (`npm install --package-lock-only`: two `engines` fields, no package versions).
- **Deploy gating (F4):** `render.yaml` `autoDeploy: true` → `autoDeployTrigger:
  checksPass` (Render blueprint spec: "Trigger a deploy only if the linked branch's CI
  checks pass"); build `npm install` → `npm ci` (exact lockfile; same dev-dependency
  behaviour, and the build already needs `tsc` from dev dependencies).
- semgrep over the edited workflows + `render.yaml` (github-actions + OWASP packs): 0.

**P0.4 closed:** GitHub @ `cb7cc53`: CI `36719796423` success (build, secret scan,
semgrep) and CodeQL `36719796450` success. The build job's annotations no longer carry
GitHub's "Node.js 20 is deprecated" warning (Node 24 from `.node-version` took effect).
Fresh-clone + `npm ci` on Node 24 before the push: every CI step exit 0.

### P0.5 — Dependabot + SBOM — 2026-09-30

- **`.github/dependabot.yml`** (npm at the root, which covers every workspace through the
  single lockfile; github-actions). Design decisions, each from GitHub's options
  reference rather than memory:
  - **No `ignore` rules at all:** "the `ignore` option applies to both version and
    security updates", so ignoring the Expo packages would also block their security
    fixes. Instead the 34 Expo/React-Native-coupled packages are **grouped**
    (`expo-sdk` minor+patch, `expo-sdk-major`), so an SDK move arrives as ONE PR, which
    CI verifies and a human checks with `npx expo install --check`.
  - **`cooldown` 7 days** (14 for majors) on version updates only; security updates are
    never delayed. semgrep's `dependabot-missing-cooldown` rule (OWASP pack) rejected my
    first draft's 5 days; raised to 7.
  - Validated against the SchemaStore dependabot-2.0 JSON schema: 0 errors. Whether
    GitHub accepts it is confirmed only when Dependabot runs (first scheduled Monday).
- **SBOM:** `npm sbom --sbom-format cyclonedx` (CycloneDX 1.5) generated on the runner
  and uploaded as an artifact in CI (30 days) and in the release gate (90 days).
  **Found while building it:** `npm sbom --omit dev` silently DROPS shipped packages
  here: `expo` and `react-native` are absent, though `npm ls expo --omit dev` shows
  them in the production tree through `@zeno/mobile`. The full SBOM (1,268 components
  locally) includes them and marks dev-only packages with
  `cdx:npm:package:development=true`; the 126 lockfile names it lacks locally are other
  platforms' optional binaries (`@esbuild/darwin-*`, …) not installed on Windows. So
  the full SBOM is the complete, honest inventory.
- `sbom.cdx.json` added to `.gitignore`.
- Runner OS pinned to `ubuntu-24.04` in all jobs: GitHub's run notice says
  `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19; an image change under the build
  should be a deliberate upgrade, not a surprise red CI.

**P0.5 closed:** GitHub @ `dad71a2`: CI `36720317959` success, every job on
`ubuntu-24.04` (label confirms the pin); CodeQL `36720317989` success; artifact
`sbom-cyclonedx` uploaded (236,973 bytes, expires 2026-10-30). **Dependabot accepted
the config and ran at once**, opening two grouped PRs:

- [Pratikkadam00/zeno#1](https://github.com/Pratikkadam00/zeno/pull/1): actions
  group, `actions/checkout` v6.1.0 → v7.0.1 and `actions/setup-node` v6.5.0 → v7.0.0.
  Confirms Dependabot rewrites SHA pins AND their `# vX` comments. Both are MAJOR
  bumps: review the changelogs before merging (not merged).
- [Pratikkadam00/zeno#2](https://github.com/Pratikkadam00/zeno/pull/2): the Expo
  group, 9 updates, including **react-native 0.85.3 → 0.87.1** labelled "minor".
  React Native minors are breaking and Expo SDK 56 pins 0.85, so merging it would
  break the app. **Config flaw found by the first real run; fixed:** the Expo/RN
  group is now `expo-sdk-patch` (patch only, routine) and `expo-sdk-upgrade` (minor +
  major together: an SDK upgrade done deliberately with `npx expo install --fix`,
  never merged as-is). Schema 0 errors, semgrep 0. Do not merge #2.

### P0 gate — DONE 2026-09-30 (P0.6 owner-blocked)

| Gate | Local | GitHub |
|---|---|---|
| Typecheck (forced), lint | 0 / 0 | green |
| vitest | 609 / 609 (65 files) | green |
| RN (jest) | 22 / 22 | green |
| Coverage floor | lines 65.11 % | green |
| Web build (509 guides) | OK | green |
| Audit gate (now blocking) | PASS | green |
| Secret scan, full history | 0 leaks, 3 reviewed fingerprints | green |
| semgrep (7 packs) | 0 results, 273 files | green |
| CodeQL security-extended | — | green, 0 findings |
| SBOM | 1,268 components | artifact uploaded |

Found and fixed during P0: CI red for 13 pushes (F6); per-client rate limiting
broken in production by a dependency bump (F2); Postgres TLS unverified for every
host; unpinned GCM tag length; PII and log injection in storage logs; a bypass-shaped
auth check; an incomplete script-tag filter; Windows CRLF dropping a test suite;
Node 20 EOL / unbounded production Node; deploys not waiting for CI (F4); Dependabot
grouping that would have shipped a breaking React Native bump.

Found and queued for P1 (not yet fixed): magic-link tokens in production request
logs (F9, verified by probe); Gmail connect broken on every device (F13); OIDC nonce
and implicit-flow questions (F10, F11); Gmail token handling (F12).

### P0.6 — Branch protection — OWNER ACTION (verified state + exact steps)

Verified 2026-09-30 via `GET /repos/Pratikkadam00/zeno/branches/main`: **`protected:
false`**, required checks `[]` (F7). I will not change repository security settings
with the credentials on this machine; this is yours. Steps (github.com → the repo):

1. **Settings → Rules → Rulesets → New ruleset → New branch ruleset.** Name `main`,
   Enforcement **Active**, Target branches → **Include default branch**.
2. Tick **Restrict deletions** and **Block force pushes** (no workflow change).
3. Tick **Require status checks to pass**, add: `typecheck & test`,
   `secret scan (gitleaks, full history)`, `SAST (semgrep, zero findings)`,
   `CodeQL (javascript-typescript, security-extended)`. Note: this makes direct pushes
   to `main` impossible (checks run after a push), so work moves to pull requests,
   merged only when green. Recommended; your call.
4. **Settings → Code security:** enable **Secret scanning → Push protection**,
   **Dependabot alerts**, **Dependabot security updates** (F8).

When you have done it, tell me and I will re-read the API to confirm `protected: true`.

---

## P1 — Tier 1 logic to 100 %

Baseline at P1 start (`c23e336`): lines 65.11 %, statements 64.34 %, functions
63.89 %, branches 57.15 % over 87 files; 23 files at 0 %.

### P1.1 — API process entry (`server.ts`) + F9 — 2026-09-30

**Problem:** `server.ts` (0 % covered) did all its work at import time (config check,
build, storage, timers, signal handlers, listen), so nothing in it could be tested
without a real process and port. Reading it for coverage surfaced F9.

**F9, fixed:** the production logger's request serializer logged `req.url` WITH the
query string. A probe with the exact production config logged
`"url":"/api/v1/auth/verify?token=PROBE-SECRET-MAGIC-TOKEN-123"` on the "incoming
request" line. New `server-options.ts`: `serializeRequest` mirrors Fastify 5's default
`req` serializer field for field (read from `node_modules/fastify/lib/logger-pino.js`)
except that `url` is the path only; custom serializers override the defaults per
`lib/logger-factory.js:126`. The redaction list is unchanged and now lives beside it.

**Restructure (behaviour unchanged):** `start.ts` holds the lifecycle with injected
dependencies (process, timers, storage, app builder, console); `server.ts` is a
3-line entry point (`dotenv/config` + `startServer()`).

**Tests (30 new):**
- `server-options.test.ts` (8): `pathOnly` edge cases; serializer fields; logger levels
  (info in production, debug elsewhere, `LOG_LEVEL` wins); redaction list; and the
  **end-to-end F9 regression**: the real app with the production logger config, a
  GET with `?token=`, and a POST carrying a query secret, a bearer header and a body
  token. None of the four secrets appear in any log line; the path does.
- `start.test.ts` (21): boot order; readiness line both ways; single-instance warning
  (on / acknowledged / off); sweeper interval + unref; SIGTERM and SIGINT graceful
  shutdown (close → storage → clear backstop → exit 0, second signal ignored);
  failing close → exit 1; hung drain → hard-exit backstop → exit 1; unhandled
  rejection logged without exit; uncaught exception → graceful shutdown; listen
  failure → exit 1; `listenAddress` precedence; real `defaultDeps` wiring.
- `server.test.ts` (1): the entry point starts the server exactly once.

**Bite check:** with the new serializer removed, the F9 tests fail (3 of 8); restored,
8/8 pass.

**Coverage:** `server.ts`, `start.ts`, `server-options.ts` all **100 %** lines,
branches, functions, statements. Tier 1 overall: lines 65.11 % → 66.28 %.

Gates: typecheck 0 (forced) · lint 0 · vitest 631/631 (68 files) · semgrep 0 over
275 files.

### P1.2 — Mobile security modules + F13 — 2026-09-30

Measured gaps first (per-line JSON coverage): `secure-store.ts` native path, legacy
theme mappings, account removal, index parsing; `lock-store.ts` lockNow, enableWithPin,
every failure/lockout path, biometrics; `app-lock.ts` 4 branches.

**F13, fixed:** SecureStore rejects any key outside `/^[\w.-]+$/` in get/set/delete
(expo-secure-store 56.0.4 `build/SecureStore.js`, `ensureValidKey`), and the Gmail
token key embedded the raw address (`@`, often `+`), so connecting Gmail threw on every
phone. The old tests passed because they all mock `Platform.OS = "web"` with a lenient
fake. New `secureStoreKeySegment`: `[A-Za-z0-9.-]` pass through; every other UTF-16
unit, including `_` itself, becomes `_` + 4 hex, which is injective and always valid.
No migration: no key of the old form could ever have been written on a device.

**Other changes:**
- `app-lock.ts`: the four-field check now yields a typed tuple, which removes three
  unreachable `?? ""` fallbacks instead of ignoring them.
- `secure-store.ts`: `deleteItem` needs no sensitivity flag. On web it removes the key
  from both stores. The old non-sensitive delete branch had no caller.

**Tests (+27):**
- New `secure-store.native.test.ts` (12). The fake enforces the real library's key
  rule, copied from its source, and a test proves the fake rejects exactly what the
  library rejects. Covers: key encoding (2,000 generated inputs, always valid, zero
  collisions, plus hand-picked near-collisions); the F13 regression on iOS and Android
  (connect, list, read, remove, re-save, with `+` and mixed case); device-only storage
  options and no biometric prompt; corrupt, non-array and mixed indexes; the database
  key created once; PIN hash and lock state round trips; theme mapping on native.
- Web suite (+2): no `window` at all; delete clears both stores.
- `app-lock` (+3): every malformed v3 field; the wrong field count; a wrong PIN against
  legacy v1 (not upgraded).
- `lock-store` (+10): lockNow; enableWithPin; wrong PIN with remaining count and
  singular; the 10th failure starts a persisted 15-minute lockout; the correct PIN is
  refused, unchecked, during a lockout; after expiry a wrong PIN re-locks at once and
  the right PIN clears everything; hydrate restores a lockout; biometrics refused during
  a lockout (no prompt), failure keeps the lock, success resets.

**Bite check (F13):** with the raw-address key restored, 4 of the new tests fail
("Invalid key provided to SecureStore"). With the fix, 12/12 pass.

**Coverage:** `app-lock.ts`, `lock-store.ts`, `secure-store.ts`: **0 uncovered lines,
branches or functions.** Tier 1 lines 66.28 % → 67.22 %.

Gates: typecheck 0 · lint 0 · vitest 658/658 (69 files) · RN 22/22 · semgrep 0.
New findings recorded while reading: F14 (clock-based lockout), F15 (paid features
must check the plan on the server), F16 (SQLCipher configured but not proven on a
device).

### P1.3 — Discovery (Gmail, CSV, receipts): untrusted input — 2026-09-30

Scope grew from `emailScanner.ts` to the whole discovery folder plus the shared receipt
module: every file there parses untrusted input (emails, bank exports).

**Measured start:** emailScanner 48 % (the whole Gmail network flow untested),
csvParser with ~22 uncovered lines, helpers 4 branches, shared receipts 6.

**Fixes:**
- **F12 (token handling):** revocation now `POST https://oauth2.googleapis.com/revoke`
  with the token in a form-encoded BODY (Google's documented endpoint; RFC 7009 §2.1),
  not a GET with `?token=` on the legacy endpoint. The fallback account label is random
  (`inbox-<uuid8>`), not the token's first 8 characters.
- **F12 (sender spoofing) ACCEPTED as low, with evidence:** detections are opt-in (a
  checkbox per result; only selected ones are added, `discover.tsx`), and the cancel
  link ever opened comes from OUR catalog (`service.cancellationUrl`, `cancel/[id].tsx`),
  never from the email. A forged "netflix.com" mail can show a misleading suggestion, not
  plant a link. DKIM/DMARC parsing deferred: the header format can't be verified against
  real Gmail here.
- **F17:** `extractStoreAppName` (packages/shared): name words separated by spaces/tabs
  only (a name no longer crosses lines), and a stray leading "store" is noise. Found by
  PROBING the real functions rather than assuming.
- **F20:** CSV merchant cleanup strips only a trailing US state/territory code (explicit
  list) and/or US/USA. "APPLE MUSIC" now matches the catalog's `apple-music`.
- **Dead code removed, not ignored:** `csvParser` credit block (null on both paths) and
  an unreachable `amount <= 0`; `emailScanner` three `?? ""`/digit checks that could never
  fire; a redundant id lookup (id === slug for all 509 entries, now PINNED by a catalog
  invariant test); an unreachable re-check in `exchangeAuthorizationCode` (typed to the
  success variant instead); the helpers median `?? 0` after an empty-list guard.

**My own mistake, caught:** adding `expo-crypto` to the scanner broke the OLD test file
(it didn't mock that module; the real one pulls in React Native, which Flow-parse fails).
My check had filtered for `Tests ` and hid the "1 failed" line on `Test Files`. Fixed
with the mock; every check now shows `Test Files`.

**Tests (+95):** `emailScanner.flow.test.ts` (28; fake Gmail API: connect incl. PKCE and
no-code error, registry, paging + 400 cap, sender/subject gate, per-message failure
isolation, id encoding, every MIME body shape, UTF-8/Latin-1/invalid base64, date
fallbacks, progress across inboxes, revocation per RFC 7009, revoke-failure still forgets
locally); `emailScanner.parse.test.ts` (21); `csvParser.more.test.ts` (25; every bank
format, every row-rejection reason, all four cadences, merchant cleanup, dedupe both
ways, ordering); shared receipts (+11); helpers (+2); catalog invariant (+1).

**Bite checks:** F12 → 2 tests fail on the old code; F17 → 2 fail; F20 → 6 fail. All pass
with the fixes.

**Coverage:** emailScanner, csvParser, discovery-helpers, shared email-receipts: **0
uncovered lines, branches or functions.** Tier 1 lines 67.22 % → **71.20 %**.

Gates: typecheck 0 · lint 0 · vitest 746/746 (72 files) · RN 22/22 · semgrep 0.

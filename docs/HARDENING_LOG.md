# Zeno — Hardening Log

Live tracker and findings log for `docs/PRODUCTION_HARDENING_PLAN.md`.
Every entry records **what was done, the command that proved it, what was found, and
what still needs fixing**. Nothing here is estimated: if a line says "verified", the
evidence is next to it.

Legend: `[x]` done and verified · `[~]` in progress · `[ ]` not started · `[!]` blocked (reason given)

---

## Tracker

- [~] **P0 — Foundations: CI hardening, secret scan, coverage scope**
  - [x] P0.1 Coverage scope: exclude generated `.next/**`; guard against unexplained `v8 ignore`
  - [x] P0.2 Secret scan: gitleaks over full git history (local) + CI job on every push/PR
  - [~] P0.3 Static analysis (SAST): CodeQL workflow + semgrep with zero-findings gate
  - [ ] P0.4 Workflow hygiene: SHA-pinned actions, least-privilege `permissions`, `concurrency`, audit gate blocking in CI
  - [ ] P0.5 Dependabot (npm + GitHub Actions) + SBOM on release
  - [ ] P0.6 Branch protection on `main` (owner action — documented)
  - [ ] P0 gate: all standing gates green locally; new CI jobs green on GitHub
- [ ] **P1 — Tier 1 logic to 100 % coverage**
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
| F4 | Render builds with `npm install` (not `npm ci`) and deploys every push to `main` regardless of CI status (`autoDeploy: true`), and the start command (`tsx`) never typechecks. A red CI does not stop a deploy. | High (process) | me: propose render.yaml change; owner: apply in Render | P0.4 / P8 |
| F5 | CI and production run **Node 20, end-of-life since 2026-04-30** (no security fixes): `ci.yml`/`release.yml` pin `node-version: 20`; `apps/api` `engines: >=20.11.0`. This machine runs Node 24. | High (unpatched runtime) | me | P0.4 |
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

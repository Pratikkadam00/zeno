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
  - [ ] P0.2 Secret scan: gitleaks over full git history (local) + CI job on every push/PR
  - [ ] P0.3 Static analysis (SAST): CodeQL workflow + semgrep with zero-findings gate
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

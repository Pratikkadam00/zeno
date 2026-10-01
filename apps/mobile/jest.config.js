/**
 * Isolated jest project for React Native COMPONENT tests (P5.1).
 *
 * Why a second runner: the repo's unit tests run under Vitest in a node
 * environment, where `react-native` itself cannot be parsed (it ships Flow
 * syntax) — every existing mobile unit test stubs it. Rendering real RN
 * components therefore needs jest with the expo preset's transform pipeline.
 *
 * The two runners are kept strictly disjoint by file extension: jest owns
 * `*.rntest.tsx`, Vitest owns `*.test.ts(x)`. Vitest's glob (`apps/**\/*.test.tsx`)
 * does not match `.rntest.tsx`, and vitest.config.ts excludes it explicitly as
 * belt-and-braces, so neither runner ever picks up the other's files.
 *
 * Run with: npm run test:rn --workspace @zeno/mobile
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/*.rntest.tsx"],
  // "github-actions" (built into jest 29.7) turns each failure into a GitHub
  // annotation, readable from the public API; it is inert off GitHub Actions.
  // Without it a CI-only jest failure showed only "exit code 1".
  reporters: ["default", "github-actions"],
  // A suite's FIRST render pays for transforming the RN module graph, and CI
  // starts with a cold transform cache. Measured with --no-cache on a 24-core
  // dev machine: ~2.1 s for that first test (206 ms warm). On GitHub's runner it
  // passed jest's default 5 s (F99: security-screen.rntest.tsx's first test,
  // CI 36840880514). 30 s leaves margin; a test that truly hangs still fails.
  testTimeout: 30_000,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Reanimated 4 runs on react-native-worklets, whose `.native` entry throws
  // under jest ("Native part of Worklets doesn't seem to be initialized").
  // The package ships this resolver to strip `.native` extensions so the
  // non-native implementation is loaded instead.
  resolver: "react-native-worklets/jest/resolver.js",
  // The expo preset already transforms the RN/expo module graph; this keeps
  // our own workspace packages transformed too.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|@gorhom/.*|@zeno/.*))"
  ],

  // Coverage for the React providers/components that only this runner can
  // render (P1.8). They are EXCLUDED from Vitest's Tier 1 scope
  // (vitest.config.ts) and measured here instead, so no file drops out of every
  // floor. A file gets a per-file 100 % floor in coverageThreshold as soon as
  // its tests land; `npm run test:rn:coverage` (CI) fails below any floor.
  collectCoverageFrom: [
    "src/data/budget-store.tsx",
    "src/data/subscription-store.tsx",
    "src/theme/theme-provider.tsx",
    "src/theme/useZenoTokens.ts",
    "src/theme/motion.ts",
    "src/security/LockOverlay.tsx",
    "src/discovery/connected-inboxes.ts",
    "app/security.tsx",
    "src/security/screen-capture.ts",
    "src/security/HiddenWhileLocked.tsx"
  ],
  coverageReporters: ["text", "json-summary"],
  coverageThreshold: {
    "./src/data/budget-store.tsx": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./src/data/subscription-store.tsx": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./src/theme/theme-provider.tsx": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./src/theme/useZenoTokens.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./src/theme/motion.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./src/security/LockOverlay.tsx": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./src/discovery/connected-inboxes.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./app/security.tsx": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./src/security/screen-capture.ts": { statements: 100, branches: 100, functions: 100, lines: 100 },
    "./src/security/HiddenWhileLocked.tsx": { statements: 100, branches: 100, functions: 100, lines: 100 }
  }
};

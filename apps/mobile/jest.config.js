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
    // P3.8: every screen and every shared component, measured as a whole (the
    // directory floors below) as well as file by file where a file is done.
    "app/**/*.tsx",
    "src/components/**/*.{ts,tsx}",
    "components/**/*.tsx",
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
    // P3.8 ratchet. A DIRECTORY key is checked on the combined coverage of every
    // file under it (jest's CoverageReporter: a "path" threshold group), a glob
    // key file by file. Each P3.8 step raises these to what it measured; they
    // only ever go up, to 100 % lines. Started at the measured baseline:
    // app/ 117/1515 lines, src/components/ 118/307, components/ 0/20.
    // P3.8d-1 measured app/ at 670/1527 lines, 790/1763 statements.
    // P3.8d-2 measured app/ at 815/1528 lines, 961/1765 statements (jest
    // truncates: 53.33, 54.44).
    // P3.8e-1 measured app/ at 948/1523 lines, 1098/1757 statements (62.24,
    // 62.49).
    // P3.8e-2 measured app/ at 1137/1530 lines, 1313/1769 statements (74.31,
    // 74.22).
    // P3.8f-1 measured app/ at 1295/1528 lines, 1490/1758 statements (84.75,
    // 84.75).
    // P3.8f-2 measured app/ at 1426/1536 lines, 1642/1763 statements (92.83,
    // 93.13).
    // P3.8f-3 measured app/ at 1535/1535 lines, 1761/1762 statements (100,
    // 99.94): every screen tested. The one statement is calendar.tsx's guard
    // for a malformed day key, which its callers can't produce.
    "./app/": { lines: 100, statements: 99.94 },
    // Finished screens are held file by file. Exact paths, since "(tabs)" in a
    // glob is pattern syntax.
    "./app/_layout.tsx": { lines: 100, statements: 100 },
    "./app/(tabs)/analytics.tsx": { lines: 100, statements: 100 },
    "./app/(tabs)/dashboard.tsx": { lines: 100, statements: 100 },
    "./app/(tabs)/subscriptions.tsx": { lines: 100, statements: 100 },
    "./app/(tabs)/_layout.tsx": { lines: 100, statements: 100 },
    "./app/(tabs)/calendar.tsx": { lines: 100 },
    "./app/(tabs)/discover.tsx": { lines: 100, statements: 100 },
    "./app/subscription/[id].tsx": { lines: 100, statements: 100 },
    "./app/subscription/cancel/[id].tsx": { lines: 100, statements: 100 },
    "./app/subscription/add.tsx": { lines: 100, statements: 100 },
    "./app/settings.tsx": { lines: 100, statements: 100 },
    "./app/profile.tsx": { lines: 100, statements: 100 },
    "./app/notifications.tsx": { lines: 100, statements: 100 },
    "./app/login.tsx": { lines: 100, statements: 100 },
    "./app/paywall.tsx": { lines: 100, statements: 100 },
    "./app/index.tsx": { lines: 100, statements: 100 },
    "./app/budget.tsx": { lines: 100, statements: 100 },
    "./app/budget-recap.tsx": { lines: 100, statements: 100 },
    "./app/coach.tsx": { lines: 100, statements: 100 },
    "./app/family.tsx": { lines: 100, statements: 100 },
    "./app/wrapped.tsx": { lines: 100, statements: 100 },
    "./app/widgets.tsx": { lines: 100, statements: 100 },
    "./app/spend-twin.tsx": { lines: 100, statements: 100 },
    "./app/backend.tsx": { lines: 100, statements: 100 },
    "./app/open-banking.tsx": { lines: 100, statements: 100 },
    "./app/business.tsx": { lines: 100, statements: 100 },
    "./app/partners.tsx": { lines: 100, statements: 100 },
    "./app/public-api.tsx": { lines: 100, statements: 100 },
    // P3.8b: every shared component is fully covered, so each FILE is held at
    // 100 % (a glob key is checked file by file).
    "./src/components/**/*.{ts,tsx}": { lines: 100, statements: 100 },
    "./components/**/*.tsx": { lines: 100, statements: 100 },
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

import { defineConfig } from "vitest/config";
import { sharedResolve, webAtAlias } from "./vitest.shared";

export default defineConfig({
  plugins: [webAtAlias],
  resolve: sharedResolve,
  test: {
    include: [
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx",
      "packages/**/*.test.ts",
      "packages/**/*.test.tsx",
      "scripts/**/*.test.ts"
    ],
    // RN component tests (`*.rntest.tsx`) belong to the isolated jest project in
    // apps/mobile — react-native can't be parsed in this node environment. The
    // include globs above don't match that extension; this makes it explicit.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.rntest.tsx",
      // The website's pages and components (P4.1) run in their own config,
      // vitest.web.config.ts, with their own coverage floor: `npm run test:web`.
      "apps/web/app/**",
      "apps/web/components/**"
    ],
    environment: "node",
    setupFiles: ["./vitest.tz-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      // Without `all`, v8 only reports files actually imported by a test run —
      // untested modules silently vanish from the report instead of counting
      // as 0%, inflating the apparent coverage percentage.
      all: true,
      include: ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts", "packages/**/*.tsx"],
      // Scope = the logic vitest can actually execute. React Native screens and
      // components belong to the jest project (`test:rn`); Next.js pages and
      // components are exercised by the web build. Counting them here at 0%
      // would make the floor meaningless.
      exclude: [
        "apps/mobile/app/**",
        "apps/mobile/src/components/**",
        // Same kind of file as src/components (a React Native UI component that
        // vitest's node environment cannot render); it lives outside src/ so the
        // rule above missed it. Tier 2 (jest screen/component tests) owns it.
        "apps/mobile/components/**",
        // The jest screen-test harness (P3.8): test support, not shipped code.
        "apps/mobile/src/test-support/**",
        "apps/web/app/**",
        "apps/web/components/**",
        // The website tests' browser stand-ins (vitest.web.config.ts): test
        // support, not shipped code, like apps/mobile/src/test-support above.
        "apps/web/test-support/**",
        // The Playwright suite and its config (P4.2): tests run by Playwright
        // in a browser, not code vitest executes.
        "apps/web/e2e/**",
        "apps/web/playwright.config.ts",
        // React Native providers/components that vitest's node environment cannot
        // render. Measured by the jest project instead, with per-file floors
        // (apps/mobile/jest.config.js collectCoverageFrom / coverageThreshold) —
        // moved, not dropped: CI runs `npm run test:rn:coverage`.
        "apps/mobile/src/data/budget-store.tsx",
        "apps/mobile/src/data/subscription-store.tsx",
        "apps/mobile/src/theme/theme-provider.tsx",
        "apps/mobile/src/theme/useZenoTokens.ts",
        "apps/mobile/src/theme/motion.ts",
        "apps/mobile/src/security/LockOverlay.tsx",
        "apps/mobile/src/discovery/connected-inboxes.ts",
        "apps/mobile/src/security/screen-capture.ts",
        "apps/mobile/src/security/HiddenWhileLocked.tsx",
        "apps/mobile/src/security/AppModal.tsx",
        // Next.js build output (generated route-type validators). Not our code;
        // counting it made the scope depend on whether `next dev` had run.
        "**/.next/**",
        "**/*.test.*",
        // Shared test infrastructure (e.g. the real-SQLite adapter), not app code.
        "**/*.testutil.*",
        "**/*.rntest.*",
        "**/*.d.ts",
        "**/node_modules/**",
        "**/dist/**"
      ],
      // COVERAGE RATCHET (standards P5.5): floors = the measured level on
      // 2026-09-29 (autoUpdate wrote them on the first run). `autoUpdate` bumps
      // these numbers in this file whenever a run exceeds them, so the floor
      // only ever rises; a drop below any floor fails `npm run test:coverage`.
      thresholds: {
        statements: 100,
        branches: 99.7,
        functions: 100,
        lines: 100,
        autoUpdate: true
      }
      // Known gap: a few dozen never-imported apps/web/*.tsx files (ones
      // importing CSS modules, or hit by a rolldown "import type" parsing
      // quirk) fail v8's raw-parse fallback for uncovered files. They're
      // logged and excluded rather than crashing the run — an upstream
      // @vitest/coverage-v8 4.x limitation, not a project misconfiguration.
    }
  }
});

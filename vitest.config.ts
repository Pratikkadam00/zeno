import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@zeno/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@zeno/service-catalog": fileURLToPath(new URL("./packages/service-catalog/src/index.ts", import.meta.url))
    }
  },
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
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.rntest.tsx"],
    environment: "node",
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
        "apps/web/app/**",
        "apps/web/components/**",
        "**/*.test.*",
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
        statements: 62.84,
        branches: 55.95,
        functions: 63.01,
        lines: 63.53,
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

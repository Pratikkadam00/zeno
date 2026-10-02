import { defineConfig } from "vitest/config";
import { sharedResolve, webAtAlias } from "./vitest.shared";

// The website's pages and components (P4.1): rendered with React Testing
// Library in jsdom, measured against their OWN coverage floor. They are kept
// out of vitest.config.ts's floor on purpose: that floor is global and at
// 100 % lines, so it could only take a web file once that file was complete.
// This floor starts at the measured level and only rises (autoUpdate), the
// same ratchet as the jest project's per-directory floors.
export default defineConfig({
  plugins: [webAtAlias],
  resolve: sharedResolve,
  // apps/web/tsconfig.json says `jsx: "preserve"` (Next compiles JSX itself);
  // here the tests' JSX must be compiled, with React 19's automatic runtime.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["apps/web/app/**/*.test.{ts,tsx}", "apps/web/components/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    // Node by default (route handlers, fonts.ts); a component or page test opts
    // into the browser with a `// @vitest-environment jsdom` first line.
    environment: "node",
    setupFiles: ["apps/web/test-support/setup.ts"],
    // CSS modules resolve to their real class names, so a test can tell which
    // state class an element carries (e.g. the open mobile menu).
    css: { modules: { classNameStrategy: "non-scoped" } },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      reportsDirectory: "coverage-web",
      all: true,
      include: ["apps/web/app/**/*.{ts,tsx}", "apps/web/components/**/*.{ts,tsx}"],
      exclude: ["**/*.test.*", "**/*.d.ts", "**/.next/**"],
      // COVERAGE RATCHET: floors = the measured level; autoUpdate raises them in
      // this file on every full run that beats them, so they never fall.
      thresholds: {
        statements: 72.83,
        branches: 73.65,
        functions: 68,
        lines: 73.06,
        autoUpdate: true
      }
    }
  }
});

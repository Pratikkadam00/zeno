import { defineConfig } from "vitest/config";
import { sharedResolve } from "./vitest.shared";

// The test run Stryker mutates against (P6, stryker.config.mjs): every test that
// can reach the mutated code, since the question is "does ANY test notice this
// change". The shared packages' input schemas, for one, are tested through the
// API's routes. Stryker runs only the tests that cover each mutant ("perTest").
// The app's tests join in P6.3 (four of them switch zones mid-test and need the
// same care as vitest.tz-setup.ts describes).
export default defineConfig({
  resolve: sharedResolve,
  test: {
    include: ["packages/**/src/**/*.test.ts", "apps/api/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    setupFiles: ["./vitest.tz-setup.ts"]
  }
});

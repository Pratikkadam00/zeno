import { defineConfig } from "vitest/config";
import { sharedResolve } from "./vitest.shared";

// The test run Stryker mutates against (P6, stryker.config.mjs): every test that
// can reach the mutated code, since the question is "does ANY test notice this
// change". The shared packages' input schemas, for one, are tested through the
// API's routes. Stryker runs only the tests that cover each mutant ("perTest").
// The app's logic tests joined in P6.3; their zone-switching cases skip under
// Stryker only (`itZone`, vitest.tz-setup.ts).
export default defineConfig({
  resolve: sharedResolve,
  test: {
    include: ["packages/**/src/**/*.test.ts", "apps/api/src/**/*.test.ts", "apps/mobile/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    setupFiles: ["./vitest.tz-setup.ts"]
  }
});

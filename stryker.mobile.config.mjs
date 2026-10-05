// Mutation testing of the app's logic (P6.3): apps/mobile/src outside the React
// Native screens and components, which run only under jest (`*.rntest.tsx`) and
// cannot load in vitest's node environment. Same settings as the shared packages'
// run (stryker.config.mjs); the test set is vitest.mutation.config.ts, which
// holds the app's logic tests too.
// Run: npx stryker run stryker.mobile.config.mjs --concurrency 10 --mutate "<files>"
// (report: reports/mutation-mobile/)
import base from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...base,
  mutate: [
    "apps/mobile/src/**/*.ts",
    "!apps/mobile/src/**/*.test.ts",
    "!apps/mobile/src/**/*.d.ts",
    "!apps/mobile/src/**/*.testutil.ts",
    "!apps/mobile/src/test-support/**",
    // Component helpers, tested by the jest project with their components.
    "!apps/mobile/src/components/**",
    // React Native modules measured by the jest project instead (the same list
    // vitest.config.ts leaves out of its coverage, for the same reason).
    "!apps/mobile/src/theme/useZenoTokens.ts",
    "!apps/mobile/src/theme/motion.ts",
    "!apps/mobile/src/discovery/connected-inboxes.ts",
    "!apps/mobile/src/security/screen-capture.ts"
  ],
  htmlReporter: { fileName: "reports/mutation-mobile/mutation.html" },
  jsonReporter: { fileName: "reports/mutation-mobile/mutation.json" },
  // No floor until the first measurement (P6.3 sets it).
  thresholds: { high: 95, low: 90, break: null },
  tempDirName: ".stryker-tmp-mobile"
};

// Mutation testing of the API (P6.2). Same settings as the shared packages'
// run (stryker.config.mjs: UTC, the vitest runner, the same test set, which holds
// every package and API test); only what is mutated, the report and the floor differ.
// Run: npx stryker run stryker.api.config.mjs   (report: reports/mutation-api/)
import base from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...base,
  mutate: [
    "apps/api/src/**/*.ts",
    "!apps/api/src/**/*.test.ts",
    // Test helpers, not shipped code.
    "!apps/api/src/**/*.testutil.ts",
    // Seven lines that load .env and call startServer() (start.ts holds the logic).
    "!apps/api/src/server.ts"
  ],
  htmlReporter: { fileName: "reports/mutation-api/mutation.html" },
  jsonReporter: { fileName: "reports/mutation-api/mutation.json" },
  // The floor (P6.2, 2026-10-05): 88.95 % measured over the whole API, in four
  // batches (2,752 of 3,094 mutants caught), set just under it and only raised.
  thresholds: { high: 95, low: 90, break: 88 },
  tempDirName: ".stryker-tmp-api"
};

// Mutation testing (P6): Stryker changes the code one small edit at a time (a `<`
// to `<=`, a `+` to `-`, a branch removed) and re-runs the tests. A mutant the
// tests still pass on is a line the tests do not really check.
// Run: npx stryker run   (report: reports/mutation/mutation.html)

// Stryker runs vitest in worker threads, where a test's runtime TZ change is
// ignored (vitest.tz-setup.ts). Its workers are forked from this process and read
// TZ when they start, so the run is in UTC, like CI, not in the host's zone.
process.env.TZ = "UTC";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  vitest: { configFile: "vitest.mutation.config.ts", related: true },
  coverageAnalysis: "perTest",
  mutate: [
    "packages/shared/src/**/*.ts",
    "packages/service-catalog/src/**/*.ts",
    "!**/*.test.ts",
    "!**/index.ts"
  ],
  // The TypeScript checker is not used: a mutant that fails to compile is
  // reported as a compile error by vitest's transform anyway, and the checker
  // would double the run time.
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/mutation.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  thresholds: { high: 90, low: 85, break: null },
  tempDirName: ".stryker-tmp",
  concurrency: 4,
  timeoutMS: 10000
};

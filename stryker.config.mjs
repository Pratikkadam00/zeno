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
  // `break` is the floor: below it `stryker run` fails. Set just under the measured
  // score (92.44 % on 2026-10-05, P6.1), like the coverage floors, and only raised.
  // The margin covers the few mutants whose result is a timeout on a slow machine.
  thresholds: { high: 95, low: 90, break: 92 },
  tempDirName: ".stryker-tmp",
  concurrency: 4,
  timeoutMS: 10000
};

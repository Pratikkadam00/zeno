// Pull-request mode of the mutation runs (P6.5): mutate only the source files the
// pull request changed, and REPORT the score without failing on it. The floors
// (92 / 88 / 89 %) are whole-suite measures enforced nightly: one file can sit
// below its suite's floor while the suite is above it (the API's app.ts is 83 %
// in an 88.95 % API), so a per-file floor would fail honest pull requests.
//   STRYKER_SUITE   shared | api | mobile   (which suite's settings to use)
//   STRYKER_FILES   comma-separated source paths that changed in that suite
import shared from "./stryker.config.mjs";
import api from "./stryker.api.config.mjs";
import mobile from "./stryker.mobile.config.mjs";

const suites = { shared, api, mobile };
const suite = suites[process.env.STRYKER_SUITE ?? ""];
if (!suite) throw new Error(`STRYKER_SUITE must be one of ${Object.keys(suites).join(", ")}`);
const files = (process.env.STRYKER_FILES ?? "").split(",").map((f) => f.trim()).filter(Boolean);
if (files.length === 0) throw new Error("STRYKER_FILES is empty: nothing to mutate");

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...suite,
  // Only the changed files, still minus whatever the suite never mutates.
  mutate: [...files, ...suite.mutate.filter((pattern) => pattern.startsWith("!"))],
  thresholds: { ...suite.thresholds, break: null },
  reporters: ["clear-text", "json"],
  jsonReporter: { fileName: "reports/mutation-pr/mutation.json" },
  tempDirName: ".stryker-tmp-pr"
};

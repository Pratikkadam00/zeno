// Node on Windows ignores an IANA name in the TZ environment variable at
// startup (measured: Pacific/Kiritimati ran on the host's zone), but honours a
// change at runtime. ZENO_TEST_TZ applies the zone before any test runs, so a
// far-from-UTC run is real on every OS. CI's Linux honours TZ directly too.
if (process.env.ZENO_TEST_TZ) process.env.TZ = process.env.ZENO_TEST_TZ;

// Tests that switch zones mid-test (`process.env.TZ = "Asia/Kolkata"`) rely on
// Node re-reading TZ when it is assigned. It does in a forked process (vitest's
// default) but NOT in a worker thread given its own env object, which is how
// Stryker's mutation runs start vitest (measured 2026-10-04, P6.1): there the
// assignment is silently ignored and the test runs in the host's zone. Probe it,
// and let those tests skip ONLY under Stryker; anywhere else it is an error, so
// CI can never skip them quietly.
const probeInstant = new Date(Date.UTC(2026, 0, 1, 12));
const savedTz = process.env.TZ;
process.env.TZ = "Pacific/Kiritimati"; // UTC+14
const kiritimatiHour = probeInstant.getHours();
process.env.TZ = "America/Los_Angeles"; // UTC-8
const losAngelesHour = probeInstant.getHours();
if (savedTz === undefined) delete process.env.TZ;
else process.env.TZ = savedTz;

const zoneSwitchWorks = kiritimatiHour === 2 && losAngelesHour === 4;
if (!zoneSwitchWorks) {
  if (!process.env.STRYKER_MUTATOR_WORKER) {
    throw new Error("Assigning process.env.TZ no longer changes the zone in this test run; the zone tests would be meaningless.");
  }
  process.env.ZENO_ZONE_SWITCH_IGNORED = "1";
}

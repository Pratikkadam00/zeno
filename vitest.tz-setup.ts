// Node on Windows ignores an IANA name in the TZ environment variable at
// startup (measured: Pacific/Kiritimati ran on the host's zone), but honours a
// change at runtime. ZENO_TEST_TZ applies the zone before any test runs, so a
// far-from-UTC run is real on every OS. CI's Linux honours TZ directly too.
if (process.env.ZENO_TEST_TZ) process.env.TZ = process.env.ZENO_TEST_TZ;

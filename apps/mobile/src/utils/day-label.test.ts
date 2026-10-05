import { afterEach, describe, expect, it } from "vitest";
import { dayLabelInDays, formatDayLabel } from "./day-label";
import { formatMonthYear, formatShortDate } from "./subscription-ui";

// Switches the zone mid-test; skipped only where that is ignored (Stryker's
// worker threads, vitest.tz-setup.ts). Everywhere else the setup insists it works.
const itZone = process.env.ZENO_ZONE_SWITCH_IGNORED ? it.skip : it;

// Vitest honours a runtime TZ change (jest and Node's startup TZ on Windows
// don't), so each case really runs in its zone.
const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});
const ZONES = ["America/Los_Angeles", "America/New_York", "UTC", "Asia/Kolkata", "Pacific/Kiritimati", "Pacific/Honolulu"];

describe("F182: a renewal day label reads as the day it names, in every timezone", () => {
  itZone.each(ZONES)("%s", (tz) => {
    process.env.TZ = tz;
    // The zone applies (so a local formatter would shift these days).
    if (tz !== "UTC") expect(new Date("2026-10-07T00:00:00.000Z").getTimezoneOffset()).not.toBe(0);
    // How an imported "2026-10-07" is stored: midnight UTC.
    const label = "2026-10-07T00:00:00.000Z";
    expect(formatDayLabel(label, { month: "short", day: "numeric" })).toMatch(/\b7\b/);
    expect(formatShortDate(label)).toMatch(/Oct/);
    expect(formatShortDate(label)).toMatch(/\b7\b/);
    // The last day of a month stays in its month.
    expect(formatMonthYear("2026-10-31T00:00:00.000Z")).toMatch(/Oct/);
    expect(formatMonthYear("2026-11-01T00:00:00.000Z")).toMatch(/Nov/);
  });
});

describe("dayLabelInDays", () => {
  // 22:30 UTC on Oct 2 is still Oct 2 in the Americas and Honolulu, already
  // Oct 3 in Kolkata and Kiritimati: N days from the USER's date ("which
  // today?", P5), as a day label.
  itZone.each([
    ["America/Los_Angeles", "2026-10-02", "2026-11-01"],
    ["America/New_York", "2026-10-02", "2026-11-01"],
    ["UTC", "2026-10-02", "2026-11-01"],
    ["Pacific/Honolulu", "2026-10-02", "2026-11-01"],
    ["Asia/Kolkata", "2026-10-03", "2026-11-02"],
    ["Pacific/Kiritimati", "2026-10-03", "2026-11-02"]
  ])("%s: midnight UTC of the user's date, and 30 days on", (tz, today, in30) => {
    process.env.TZ = tz;
    const now = new Date("2026-10-02T22:30:00.000Z");
    expect(dayLabelInDays(0, now).toISOString()).toBe(`${today}T00:00:00.000Z`);
    expect(dayLabelInDays(30, now).toISOString()).toBe(`${in30}T00:00:00.000Z`);
  });

  it("defaults to now", () => {
    const today = new Date();
    expect(dayLabelInDays(0).getUTCDate()).toBe(today.getDate());
  });
});

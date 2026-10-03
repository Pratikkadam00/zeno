import { afterEach, describe, expect, it } from "vitest";
import { dayLabelInDays, formatDayLabel } from "./day-label";
import { formatMonthYear, formatShortDate } from "./subscription-ui";

// Vitest honours a runtime TZ change (jest and Node's startup TZ on Windows
// don't), so each case really runs in its zone.
const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});
const ZONES = ["America/Los_Angeles", "America/New_York", "UTC", "Asia/Kolkata", "Pacific/Kiritimati", "Pacific/Honolulu"];

describe("F182: a renewal day label reads as the day it names, in every timezone", () => {
  it.each(ZONES)("%s", (tz) => {
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
  it.each(ZONES)("%s: midnight UTC, N days after today's UTC day", (tz) => {
    process.env.TZ = tz;
    const now = new Date("2026-10-02T22:30:00.000Z");
    expect(dayLabelInDays(0, now).toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(dayLabelInDays(30, now).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("defaults to now", () => {
    const today = new Date();
    expect(dayLabelInDays(0).getUTCDate()).toBe(today.getUTCDate());
  });
});

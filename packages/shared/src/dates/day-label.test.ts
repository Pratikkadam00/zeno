import { afterEach, describe, expect, it } from "vitest";
import { currentMonth, dayLabelOf, daysFromToday, todayLabel } from "./day-label";

// Vitest honours a runtime TZ change, so each case really runs in its zone.
const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe("todayLabel: the user's calendar date, whatever the UTC date", () => {
  // 02:00 UTC on Oct 7 is still Oct 6 in New York and Los Angeles, Oct 7 in Kolkata.
  const instant = new Date("2026-10-07T02:00:00.000Z");
  it.each([
    ["America/New_York", "2026-10-06"],
    ["America/Los_Angeles", "2026-10-06"],
    ["UTC", "2026-10-07"],
    ["Asia/Kolkata", "2026-10-07"],
    ["Pacific/Kiritimati", "2026-10-07"]
  ])("%s: %s", (tz, day) => {
    process.env.TZ = tz;
    expect(new Date(todayLabel(instant)).toISOString()).toBe(`${day}T00:00:00.000Z`);
  });

  it("defaults to now", () => {
    const now = new Date();
    expect(new Date(todayLabel()).getUTCDate()).toBe(now.getDate());
  });
});

describe("daysFromToday", () => {
  it("counts from the user's day: the 7th's renewal is tomorrow at 22:00 on the 6th in New York, today in Kolkata", () => {
    const instant = new Date("2026-10-07T02:00:00.000Z");
    const renewal = "2026-10-07T00:00:00.000Z";
    process.env.TZ = "America/New_York";
    expect(daysFromToday(renewal, instant)).toBe(1);
    process.env.TZ = "Asia/Kolkata";
    expect(daysFromToday(renewal, instant)).toBe(0);
    expect(daysFromToday("2026-10-01T00:00:00.000Z", instant)).toBe(-6);
  });

  it("is NaN for an unreadable date", () => {
    expect(daysFromToday("whenever")).toBeNaN();
    expect(dayLabelOf("whenever")).toBeNaN();
  });

  it("a stored date with a time of day counts by its UTC day (labels are UTC days)", () => {
    expect(new Date(dayLabelOf("2026-10-07T23:59:00.000Z")).toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });
});

describe("currentMonth", () => {
  it("is the user's month: 20:00 UTC on Oct 31 is already November in Kolkata", () => {
    const instant = new Date("2026-10-31T20:00:00.000Z");
    process.env.TZ = "Asia/Kolkata";
    expect(currentMonth(instant)).toEqual({ year: 2026, month: 10 });
    process.env.TZ = "America/New_York";
    expect(currentMonth(instant)).toEqual({ year: 2026, month: 9 });
    expect(currentMonth().year).toBe(new Date().getFullYear());
  });
});

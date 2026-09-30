import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { themes, zenoLight } from "../theme/tokens";
import {
  categoryLabel,
  formatDaysLabel,
  formatMonthYear,
  formatRenewalDate,
  formatShortDate,
  getAvatarStyle,
  getCategoryColor,
  getDaysRemaining,
  getUrgencyBadge,
  rollRenewalForward,
  withAlpha
} from "./subscription-ui";

// Timezone switching: Node re-reads process.env.TZ on assignment. Deleting the
// variable does NOT restore the original zone, so it is put back by name.
const ORIGINAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
function inTimeZone<T>(tz: string, fn: () => T): T {
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    process.env.TZ = ORIGINAL_TZ;
  }
}

describe("rollRenewalForward — edge cases", () => {
  it("passes an empty string through as-is (a missing date, not a date to roll)", () => {
    expect(rollRenewalForward("", "monthly")).toBe("");
  });

  it("keeps a renewal that falls today even if its time of day has already passed (day-based, not instant-based)", () => {
    const now = new Date("2026-06-20T22:00:00.000Z");
    expect(rollRenewalForward("2026-06-20T08:00:00.000Z", "monthly", now)).toBe("2026-06-20T08:00:00.000Z");
    expect(rollRenewalForward("2026-06-20T08:00:00.000Z", "weekly", now)).toBe("2026-06-20T08:00:00.000Z");
  });

  it("weekly: keeps the weekday and the time to the minute across a year boundary", () => {
    // 2026-12-28 is a Monday; the next Monday on/after 2027-01-05 is 2027-01-11.
    expect(rollRenewalForward("2026-12-28T08:45:00.000Z", "weekly", new Date("2027-01-05T00:00:00.000Z"))).toBe("2027-01-11T08:45:00.000Z");
  });

  it("weekly: a future date is left on its own day", () => {
    expect(rollRenewalForward("2026-07-01T10:00:00.000Z", "weekly", new Date("2026-06-01T00:00:00.000Z"))).toBe("2026-07-01T10:00:00.000Z");
  });

  it("monthly: rolls across a year boundary", () => {
    expect(rollRenewalForward("2025-11-15T12:00:00.000Z", "monthly", new Date("2026-01-20T00:00:00.000Z"))).toBe("2026-02-15T12:00:00.000Z");
  });

  it("monthly: a 30th anchor survives February and returns to the 30th", () => {
    expect(rollRenewalForward("2026-01-30T00:00:00.000Z", "monthly", new Date("2026-02-10T00:00:00.000Z"))).toBe("2026-02-28T00:00:00.000Z");
    expect(rollRenewalForward("2026-01-30T00:00:00.000Z", "monthly", new Date("2026-03-01T00:00:00.000Z"))).toBe("2026-03-30T00:00:00.000Z");
  });

  it("quarterly: clamps a 31st anchor to short months and returns to the 31st in a long one", () => {
    const anchor = "2025-08-31T00:00:00.000Z"; // Aug 31 -> Nov 30 -> Feb 28 -> May 31
    expect(rollRenewalForward(anchor, "quarterly", new Date("2025-09-01T00:00:00.000Z"))).toBe("2025-11-30T00:00:00.000Z");
    expect(rollRenewalForward(anchor, "quarterly", new Date("2025-12-01T00:00:00.000Z"))).toBe("2026-02-28T00:00:00.000Z");
    expect(rollRenewalForward(anchor, "quarterly", new Date("2026-03-01T00:00:00.000Z"))).toBe("2026-05-31T00:00:00.000Z");
  });

  it("annual: a Feb 29 anchor lands on Feb 28 in common years and back on Feb 29 in the next leap year", () => {
    const leapDay = "2024-02-29T06:00:00.000Z";
    expect(rollRenewalForward(leapDay, "annual", new Date("2025-01-10T00:00:00.000Z"))).toBe("2025-02-28T06:00:00.000Z");
    expect(rollRenewalForward(leapDay, "annual", new Date("2026-03-01T00:00:00.000Z"))).toBe("2027-02-28T06:00:00.000Z");
    expect(rollRenewalForward(leapDay, "annual", new Date("2027-03-01T00:00:00.000Z"))).toBe("2028-02-29T06:00:00.000Z");
  });

  it("gives the same answer whatever the device timezone is (UTC-day arithmetic)", () => {
    const now = new Date("2026-03-01T03:00:00.000Z");
    const run = () => [
      rollRenewalForward("2026-01-31T23:30:00.000Z", "monthly", now),
      rollRenewalForward("2026-02-02T23:30:00.000Z", "weekly", now),
      rollRenewalForward("2025-11-30T00:15:00.000Z", "quarterly", now)
    ];
    const la = inTimeZone("America/Los_Angeles", run);
    const kolkata = inTimeZone("Asia/Kolkata", run);
    expect(la).toEqual(["2026-03-31T23:30:00.000Z", "2026-03-02T23:30:00.000Z", "2026-05-30T00:15:00.000Z"]);
    expect(kolkata).toEqual(la);
  });

  // Regression: the roll walked one cycle at a time and gave up after 1000
  // steps, so a date more than 1000 weeks (~19 years) overdue came back STILL
  // in the past. Epoch-0 (1970-01-01) is the classic "null timestamp" artifact
  // an import can produce. The store would then show that stale date forever.
  it("weekly: rolls a date decades overdue all the way to the next occurrence, keeping its weekday", () => {
    const now = new Date("2026-09-30T12:00:00.000Z"); // a Wednesday
    // 2000-01-03 is a Monday -> next Monday on/after 2026-09-30 is 2026-10-05.
    expect(rollRenewalForward("2000-01-03T07:30:00.000Z", "weekly", now)).toBe("2026-10-05T07:30:00.000Z");
    // 1970-01-01 is a Thursday -> next Thursday is 2026-10-01.
    expect(rollRenewalForward(new Date(0).toISOString(), "weekly", now)).toBe("2026-10-01T00:00:00.000Z");
  });

  // Same defect for month-stepped cycles: 1000 monthly steps is ~83 years, so a
  // spreadsheet's zero date (1899-12-30) imported as a renewal stayed in 1983.
  it("monthly/quarterly/annual: rolls a date a century overdue to the next occurrence on or after today", () => {
    const now = new Date("2026-09-30T12:00:00.000Z");
    expect(rollRenewalForward("1899-12-30T00:00:00.000Z", "monthly", now)).toBe("2026-09-30T00:00:00.000Z");
    expect(rollRenewalForward("1899-12-31T00:00:00.000Z", "monthly", now)).toBe("2026-09-30T00:00:00.000Z");
    expect(rollRenewalForward("1900-01-15T00:00:00.000Z", "monthly", now)).toBe("2026-10-15T00:00:00.000Z");
    // Quarterly from Jan 15, 1900: Jan/Apr/Jul/Oct 15 -> Oct 15, 2026.
    expect(rollRenewalForward("1900-01-15T00:00:00.000Z", "quarterly", now)).toBe("2026-10-15T00:00:00.000Z");
    expect(rollRenewalForward("1900-01-15T00:00:00.000Z", "annual", now)).toBe("2027-01-15T00:00:00.000Z");
  });

  it("never returns a date before today for any recurring cycle, across many anchors", () => {
    const now = new Date("2026-09-30T12:00:00.000Z");
    const todayUtc = Date.UTC(2026, 8, 30);
    const anchors = ["1901-03-31T00:00:00.000Z", "1950-02-28T10:00:00.000Z", "1988-08-31T23:59:00.000Z", "2012-02-29T00:00:00.000Z", "2026-09-29T23:59:00.000Z"];
    for (const anchor of anchors) {
      for (const cycle of ["weekly", "monthly", "quarterly", "annual"] as const) {
        const rolled = rollRenewalForward(anchor, cycle, now);
        expect(rolled, `${anchor} ${cycle}`).toBeDefined();
        const rolledMs = Date.parse(rolled ?? "");
        const rolledDay = Date.UTC(new Date(rolledMs).getUTCFullYear(), new Date(rolledMs).getUTCMonth(), new Date(rolledMs).getUTCDate());
        expect(rolledDay, `${anchor} ${cycle}`).toBeGreaterThanOrEqual(todayUtc);
      }
    }
  });
});

describe("getDaysRemaining — UTC-day arithmetic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T23:30:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts calendar days in UTC, so a renewal one hour away on the next UTC day is 1 day", () => {
    expect(getDaysRemaining("2026-06-02T00:30:00.000Z")).toBe(1);
    expect(getDaysRemaining("2026-06-01T00:00:00.000Z")).toBe(0);
    expect(getDaysRemaining("2026-06-11T12:00:00.000Z")).toBe(10);
  });

  it("does not depend on the device timezone", () => {
    const la = inTimeZone("America/Los_Angeles", () => getDaysRemaining("2026-06-02T00:30:00.000Z"));
    const kolkata = inTimeZone("Asia/Kolkata", () => getDaysRemaining("2026-06-02T00:30:00.000Z"));
    expect(la).toBe(1);
    expect(kolkata).toBe(1);
  });
});

describe("formatShortDate / formatRenewalDate / formatMonthYear", () => {
  // Noon UTC is the same calendar day in every zone from UTC-11 to UTC+11, so
  // these assertions hold on any CI machine regardless of its timezone. The
  // formatter uses the device locale, so only locale-stable parts are checked.
  const noonJune12 = "2026-06-12T12:00:00.000Z";

  it("returns the fallback for missing or unparseable dates", () => {
    expect(formatShortDate(undefined)).toBe("No date");
    expect(formatShortDate(null)).toBe("No date");
    expect(formatShortDate("")).toBe("No date");
    expect(formatShortDate("not-a-date")).toBe("No date");
    expect(formatShortDate("not-a-date", "Unknown")).toBe("Unknown");
  });

  it("formats a valid date as short month + day, without the year", () => {
    const text = formatShortDate(noonJune12);
    expect(text).toMatch(/Jun/);
    expect(text).toMatch(/\b12\b/);
    expect(text).not.toMatch(/2026/);
  });

  it("formatRenewalDate is the same function as formatShortDate", () => {
    expect(formatRenewalDate).toBe(formatShortDate);
  });

  it("formatMonthYear returns its fallback for missing or invalid dates", () => {
    expect(formatMonthYear(undefined)).toBe("—");
    expect(formatMonthYear(null)).toBe("—");
    expect(formatMonthYear("garbage")).toBe("—");
    expect(formatMonthYear("garbage", "n/a")).toBe("n/a");
  });

  it("formatMonthYear shows month and year but not the day", () => {
    const text = formatMonthYear(noonJune12);
    expect(text).toMatch(/Jun/);
    expect(text).toMatch(/2026/);
    expect(text).not.toMatch(/\b12\b/);
  });
});

describe("withAlpha", () => {
  it("converts #RRGGBB into rgba() with the given alpha", () => {
    expect(withAlpha("#FF453A", 0.15)).toBe("rgba(255,69,58,0.15)");
    expect(withAlpha("#000000", 1)).toBe("rgba(0,0,0,1)");
    expect(withAlpha("#0a84ff", 0.5)).toBe("rgba(10,132,255,0.5)");
  });

  it("returns anything that is not a 7-character #-prefixed colour unchanged", () => {
    expect(withAlpha("red", 0.5)).toBe("red");
    expect(withAlpha("#FFF", 0.5)).toBe("#FFF");
    expect(withAlpha("#FF453A80", 0.5)).toBe("#FF453A80");
    expect(withAlpha("FF453A0", 0.5)).toBe("FF453A0");
  });
});

describe("getCategoryColor / getAvatarStyle", () => {
  // themes.genz is a non-"millennial" id, which selects the `dark` accent set;
  // zenoLight carries the "millennial" id, which selects the `light` set.
  const nonMillennial = themes.genz;

  it("uses the deepened light accent for the millennial id and the bright accent otherwise", () => {
    expect(zenoLight.id).toBe("millennial");
    expect(nonMillennial.id).toBe("genz");
    expect(getCategoryColor("ai_tools", zenoLight)).toBe("#7C3AED");
    expect(getCategoryColor("ai_tools", nonMillennial)).toBe("#BF5AF2");
    expect(getCategoryColor("entertainment", zenoLight)).toBe("#DC2626");
    expect(getCategoryColor("music", nonMillennial)).toBe("#FF375F");
  });

  it("maps sibling categories to the same accent", () => {
    expect(getCategoryColor("streaming", zenoLight)).toBe(getCategoryColor("entertainment", zenoLight));
    expect(getCategoryColor("developer_tools", zenoLight)).toBe(getCategoryColor("ai_tools", zenoLight));
    expect(getCategoryColor("family", nonMillennial)).toBe(getCategoryColor("gaming", nonMillennial));
  });

  it("falls back to the theme's quiet text colour for an unknown category", () => {
    expect(getCategoryColor("other", zenoLight)).toBe(zenoLight.quietText);
    expect(getCategoryColor("not-a-category", nonMillennial)).toBe(nonMillennial.quietText);
  });

  it("builds an avatar chip from the accent: 15% tint behind the full-strength accent", () => {
    expect(getAvatarStyle("productivity", zenoLight)).toEqual({ bg: "rgba(37,99,235,0.15)", text: "#2563EB" });
    expect(getAvatarStyle("productivity", nonMillennial)).toEqual({ bg: "rgba(10,132,255,0.15)", text: "#0A84FF" });
  });

  it("falls back to neutral theme surfaces for an unknown category's avatar", () => {
    expect(getAvatarStyle("other", zenoLight)).toEqual({ bg: zenoLight.surfaceAlt, text: zenoLight.mutedText });
  });
});

describe("formatDaysLabel / getUrgencyBadge", () => {
  it("labels null, today, one day and many days", () => {
    expect(formatDaysLabel(null)).toBe("—");
    expect(formatDaysLabel(0)).toBe("TODAY");
    expect(formatDaysLabel(1)).toBe("1 day");
    expect(formatDaysLabel(2)).toBe("2 days");
    expect(formatDaysLabel(30)).toBe("30 days");
  });

  it("returns no badge when the days count is unknown", () => {
    expect(getUrgencyBadge(null, zenoLight)).toBeNull();
  });

  it("uses danger colours up to 3 days, warning up to 7, neutral beyond", () => {
    const danger = { bg: zenoLight.dangerSurface, text: zenoLight.danger };
    const warning = { bg: zenoLight.warningSurface, text: zenoLight.warning };
    const neutral = { bg: zenoLight.surfaceAlt, text: zenoLight.quietText };
    expect(getUrgencyBadge(0, zenoLight)).toEqual({ ...danger, label: "TODAY" });
    expect(getUrgencyBadge(3, zenoLight)).toEqual({ ...danger, label: "3 days" });
    expect(getUrgencyBadge(4, zenoLight)).toEqual({ ...warning, label: "4 days" });
    expect(getUrgencyBadge(7, zenoLight)).toEqual({ ...warning, label: "7 days" });
    expect(getUrgencyBadge(8, zenoLight)).toEqual({ ...neutral, label: "8 days" });
  });
});

describe("categoryLabel", () => {
  it("special-cases AI tools and otherwise sentence-cases the enum", () => {
    expect(categoryLabel("ai_tools")).toBe("AI tools");
    expect(categoryLabel("developer_tools")).toBe("Developer tools");
    expect(categoryLabel("entertainment")).toBe("Entertainment");
    expect(categoryLabel("other")).toBe("Other");
    expect(categoryLabel("")).toBe("");
  });
});

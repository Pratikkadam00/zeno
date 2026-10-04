import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { getEndingTrials } from "./trial-guardian";

// Switches the zone mid-test; skipped only where that is ignored (Stryker's
// worker threads, vitest.tz-setup.ts). Everywhere else the setup insists it works.
const itZone = process.env.ZENO_ZONE_SWITCH_IGNORED ? it.skip : it;

function trial(id: string, nextRenewalDate: string | undefined, over: Partial<Subscription> = {}): Subscription {
  const base: Subscription = {
    id,
    name: id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    category: "entertainment",
    price: { amountMinor: 999, currency: "USD" },
    billingCycle: "trial",
    status: "active",
    ownerProfileId: "p",
    source: "manual",
    ...over
  };
  return nextRenewalDate === undefined ? base : { ...base, nextRenewalDate };
}

const days = (result: ReturnType<typeof getEndingTrials>) => result.map((t) => [t.subscription.id, t.daysUntilEnd]);

// "now" is given as UTC instants, so these cases run with the device on UTC;
// "today" and "this month" are the user's ("which today?", P5).
const DEVICE_TZ = process.env.TZ;
beforeEach(() => {
  process.env.TZ = "UTC";
});
afterEach(() => {
  if (DEVICE_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = DEVICE_TZ;
});

describe("getEndingTrials — whole calendar days", () => {
  // 22:00 UTC on Jun 15 is already Jun 16 in Kiritimati: a trial ending Jun 16
  // ends tomorrow on UTC and today there ("which today?", P5).
  itZone("counts from the user's own date", () => {
    const now = new Date("2026-06-15T22:00:00.000Z");
    const list = [trial("t", "2026-06-16T00:00:00.000Z")];
    expect(days(getEndingTrials(list, now))).toEqual([["t", 1]]);
    process.env.TZ = "Pacific/Kiritimati";
    expect(days(getEndingTrials(list, now))).toEqual([["t", 0]]);
  });

  it("counts calendar days, not 24-hour periods", () => {
    const now = new Date("2026-06-15T23:59:00.000Z");
    const result = getEndingTrials([
      trial("tonight", "2026-06-15T23:59:59.000Z"),
      trial("just-after-midnight", "2026-06-16T00:01:00.000Z")
    ], now);
    expect(days(result)).toEqual([["tonight", 0], ["just-after-midnight", 1]]);
  });

  it("includes an earlier-today conversion as today (0), and excludes yesterday's", () => {
    const now = new Date("2026-06-15T18:00:00.000Z");
    const result = getEndingTrials([
      trial("this-morning", "2026-06-15T06:00:00.000Z"),
      trial("yesterday", "2026-06-14T23:00:00.000Z")
    ], now);
    expect(days(result)).toEqual([["this-morning", 0]]);
  });

  it("counts across 29 February in a leap year", () => {
    expect(days(getEndingTrials([trial("t", "2028-03-01T00:00:00.000Z")], new Date("2028-02-28T12:00:00.000Z")))).toEqual([["t", 2]]);
    expect(days(getEndingTrials([trial("t", "2027-03-01T00:00:00.000Z")], new Date("2027-02-28T12:00:00.000Z")))).toEqual([["t", 1]]);
  });

  it("includes the last day of the window and excludes the day after (default 30)", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const result = getEndingTrials([trial("edge", "2026-07-15T08:00:00.000Z"), trial("beyond", "2026-07-16T08:00:00.000Z")], now);
    expect(days(result)).toEqual([["edge", 30]]);
    expect(days(getEndingTrials([trial("edge", "2026-06-18T08:00:00.000Z")], now, 2))).toEqual([]);
  });
});

describe("getEndingTrials — which subscriptions count", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("skips trials with no date or a date it cannot parse", () => {
    expect(getEndingTrials([trial("undated", undefined), trial("bad", "not a date")], now)).toEqual([]);
  });

  it("keeps a trial in any status except cancelled or paused, and echoes its end date", () => {
    const result = getEndingTrials([trial("trial-status", "2026-06-20T00:00:00.000Z", { status: "trial" })], now);
    expect(result).toEqual([{ subscription: expect.objectContaining({ id: "trial-status" }), daysUntilEnd: 5, endsAt: "2026-06-20T00:00:00.000Z" }]);
  });
});

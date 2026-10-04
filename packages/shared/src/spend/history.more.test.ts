import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BillingCycle, Subscription } from "../domain";
import type { FxContext } from "./coach";
import { buildMonthlySpendHistory } from "./history";

// Switches the zone mid-test; skipped only where that is ignored (Stryker's
// worker threads, vitest.tz-setup.ts). Everywhere else the setup insists it works.
const itZone = process.env.ZENO_ZONE_SWITCH_IGNORED ? it.skip : it;

function sub(input: Partial<Subscription> & Pick<Subscription, "id">): Subscription {
  return {
    name: input.id,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    version: 1,
    category: "other",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "p",
    source: "manual",
    ...input
  };
}

const NOW = new Date(Date.UTC(2026, 5, 15)); // 15 June 2026
const fx: FxContext = { homeCurrency: "USD", rates: { USD: 1, INR: 95 } };
const amounts = (points: ReturnType<typeof buildMonthlySpendHistory>) => points.map((p) => p.amountMinor);

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

describe("buildMonthlySpendHistory — calendar", () => {
  it("walks back across a year boundary with the right year and label", () => {
    const points = buildMonthlySpendHistory([], 3, new Date(Date.UTC(2026, 0, 15)));
    expect(points.map((p) => [p.year, p.month, p.label])).toEqual([
      [2025, 10, "Nov"],
      [2025, 11, "Dec"],
      [2026, 0, "Jan"]
    ]);
  });

  it("never skips or repeats a month when 'now' is a month end (31 March of a leap year)", () => {
    const points = buildMonthlySpendHistory([], 3, new Date(Date.UTC(2024, 2, 31, 23, 59)));
    expect(points.map((p) => p.label)).toEqual(["Jan", "Feb", "Mar"]);
  });

  itZone("ends at the user's month: 23:30 UTC on 30 June is still June in New York, July in Kolkata", () => {
    const now = new Date(Date.UTC(2026, 5, 30, 23, 30));
    process.env.TZ = "America/New_York";
    expect(buildMonthlySpendHistory([], 1, now)[0]).toMatchObject({ year: 2026, month: 5, label: "Jun" });
    process.env.TZ = "Asia/Kolkata";
    expect(buildMonthlySpendHistory([], 1, now)[0]).toMatchObject({ year: 2026, month: 6, label: "Jul" });
  });
});

describe("buildMonthlySpendHistory — cycles", () => {
  it("charges the month-equivalent of a weekly price every month", () => {
    const points = buildMonthlySpendHistory([sub({ id: "w", billingCycle: "weekly", price: { amountMinor: 300, currency: "USD" } })], 2, NOW);
    expect(amounts(points)).toEqual([1300, 1300]); // 300 * 52 / 12
  });

  it("charges a quarterly price every third month from the renewal month, across the year boundary", () => {
    // Renews in May -> charged Feb, May, Aug, Nov.
    const quarterly = sub({ id: "q", billingCycle: "quarterly", price: { amountMinor: 3000, currency: "USD" }, nextRenewalDate: "2026-05-20T00:00:00.000Z" });
    const points = buildMonthlySpendHistory([quarterly], 12, NOW); // Jul 2025 .. Jun 2026
    expect(points.filter((p) => p.amountMinor > 0).map((p) => p.label)).toEqual(["Aug", "Nov", "Feb", "May"]);
  });

  it("anchors an annual or quarterly charge on createdAt when there is no renewal date", () => {
    const annual = sub({ id: "a", billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" }, createdAt: "2025-03-10T00:00:00.000Z" });
    const points = buildMonthlySpendHistory([annual], 6, NOW); // Jan..Jun 2026
    expect(points.filter((p) => p.amountMinor > 0).map((p) => p.label)).toEqual(["Mar"]);
  });

  it("anchors on createdAt when the renewal date cannot be parsed, instead of never charging", () => {
    // Before the fix new Date("not a date").getUTCMonth() was NaN, so the
    // annual charge matched no month and silently vanished from history.
    const annual = sub({ id: "a", billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" }, createdAt: "2025-03-10T00:00:00.000Z", nextRenewalDate: "not a date" });
    const quarterly = sub({ id: "q", billingCycle: "quarterly", price: { amountMinor: 3000, currency: "USD" }, createdAt: "2025-03-10T00:00:00.000Z", nextRenewalDate: "" });
    expect(amounts(buildMonthlySpendHistory([annual], 6, NOW))).toEqual([0, 0, 12000, 0, 0, 0]);
    expect(amounts(buildMonthlySpendHistory([quarterly], 6, NOW))).toEqual([0, 0, 3000, 0, 0, 3000]);
  });

  it("charges nothing for inactive, unknown-cycle or unrecognised-cycle subscriptions", () => {
    const points = buildMonthlySpendHistory([
      sub({ id: "c", status: "cancelled" }),
      // F163: a trial or unknown status is not billing either.
      sub({ id: "t", status: "trial" }),
      sub({ id: "s", status: "unknown" }),
      sub({ id: "u", billingCycle: "unknown" }),
      // Rows read back from storage are not re-validated; an unexpected cycle
      // string must contribute nothing rather than throw or guess.
      sub({ id: "x", billingCycle: "lifetime" as BillingCycle })
    ], 2, NOW);
    expect(amounts(points)).toEqual([0, 0]);
  });
});

describe("buildMonthlySpendHistory — a cancelled plan counts until it was cancelled (F147)", () => {
  // Jan..Jun 2026; the monthly plan renews on the 10th.
  const plan = (over: Partial<Subscription>) => sub({ id: "p", nextRenewalDate: "2026-04-10T00:00:00.000Z", ...over });

  it("cancelled on 5 April: January to March were paid, April's charge (the 10th) never happened", () => {
    const points = buildMonthlySpendHistory([plan({ status: "cancelled", cancellationRequestedAt: "2026-04-05T09:00:00.000Z" })], 6, NOW);
    expect(amounts(points)).toEqual([1000, 1000, 1000, 0, 0, 0]);
  });

  it("cancelled on 12 April, after April's charge: April counts too", () => {
    const points = buildMonthlySpendHistory([plan({ status: "cancelled", cancellationRequestedAt: "2026-04-12T09:00:00.000Z" })], 6, NOW);
    expect(amounts(points)).toEqual([1000, 1000, 1000, 1000, 0, 0]);
  });

  it("a reported cancel awaiting verification (pending) counts the same way", () => {
    const points = buildMonthlySpendHistory([plan({ status: "pending", cancellationRequestedAt: "2026-04-05T09:00:00.000Z" })], 6, NOW);
    expect(amounts(points)).toEqual([1000, 1000, 1000, 0, 0, 0]);
  });

  it("charged again after cancelling (attention): still billing, every month counts", () => {
    const points = buildMonthlySpendHistory([plan({ status: "attention", cancellationRequestedAt: "2026-04-05T09:00:00.000Z" })], 6, NOW);
    expect(amounts(points)).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
  });

  it("an annual plan cancelled before its renewal day is not charged that year; after it, it is", () => {
    const annual = (cancelled: string) => sub({ id: "a", billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" }, nextRenewalDate: "2026-03-20T00:00:00.000Z", status: "cancelled", cancellationRequestedAt: cancelled });
    expect(amounts(buildMonthlySpendHistory([annual("2026-03-15T00:00:00.000Z")], 6, NOW))).toEqual([0, 0, 0, 0, 0, 0]);
    expect(amounts(buildMonthlySpendHistory([annual("2026-03-25T00:00:00.000Z")], 6, NOW))).toEqual([0, 0, 12000, 0, 0, 0]);
  });

  it("a weekly plan counts the share of its cancellation month that came before the cancel", () => {
    // monthlyAmount of $10/week = round(1000 * 52 / 12) = 4333; cancelled at the
    // start of 16 April, so 15 of April's 30 days were billed: round(2166.5) = 2167.
    const weekly = sub({ id: "w", billingCycle: "weekly", status: "cancelled", cancellationRequestedAt: "2026-04-16T00:00:00.000Z" });
    expect(amounts(buildMonthlySpendHistory([weekly], 6, NOW))).toEqual([4333, 4333, 4333, 2167, 0, 0]);
  });

  it("a renewal day past the end of a short month charges on its last day (the 31st in February is the 28th)", () => {
    const late = plan({ nextRenewalDate: "2026-01-31T00:00:00.000Z", status: "cancelled", cancellationRequestedAt: "2026-02-28T12:00:00.000Z" });
    expect(amounts(buildMonthlySpendHistory([late], 6, NOW))).toEqual([1000, 1000, 0, 0, 0, 0]);
  });

  it("no invented date: a cancelled plan without one, or with an unreadable one, counts nothing; so does a paused plan", () => {
    const points = buildMonthlySpendHistory([
      plan({ id: "no-date", status: "cancelled" }),
      plan({ id: "bad-date", status: "cancelled", cancellationRequestedAt: "not a date" }),
      plan({ id: "paused", status: "paused" })
    ], 6, NOW);
    expect(amounts(points)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("buildMonthlySpendHistory — a pause stops the charges only while it lasts (F163)", () => {
  // Jan..Jun 2026; the monthly plan renews on the 10th.
  const plan = (over: Partial<Subscription>) => sub({ id: "p", nextRenewalDate: "2026-04-10T00:00:00.000Z", ...over });

  it("paused on 5 March and still paused: January and February were paid, nothing after", () => {
    const points = buildMonthlySpendHistory([plan({ status: "paused", pausedPeriods: [{ from: "2026-03-05T09:00:00.000Z" }] })], 6, NOW);
    expect(amounts(points)).toEqual([1000, 1000, 0, 0, 0, 0]);
  });

  it("paused 5 March, resumed 20 April: the two charges inside the pause are skipped, the rest count", () => {
    const points = buildMonthlySpendHistory([plan({ pausedPeriods: [{ from: "2026-03-05T09:00:00.000Z", to: "2026-04-20T09:00:00.000Z" }] })], 6, NOW);
    expect(amounts(points)).toEqual([1000, 1000, 0, 0, 1000, 1000]);
  });

  it("two pauses: each skips only its own charges", () => {
    const points = buildMonthlySpendHistory([plan({ pausedPeriods: [
      { from: "2026-01-05T00:00:00.000Z", to: "2026-01-20T00:00:00.000Z" },
      { from: "2026-05-01T00:00:00.000Z", to: "2026-05-15T00:00:00.000Z" }
    ] })], 6, NOW);
    expect(amounts(points)).toEqual([0, 1000, 1000, 1000, 0, 1000]);
  });

  it("a weekly plan counts the share of each month outside the pause", () => {
    // Paused from the start of 16 April to the start of 1 May: 15 of April's 30
    // days were billed, round(4333 / 2) = 2167; May onwards full again.
    const weekly = sub({ id: "w", billingCycle: "weekly", pausedPeriods: [{ from: "2026-04-16T00:00:00.000Z", to: "2026-05-01T00:00:00.000Z" }] });
    expect(amounts(buildMonthlySpendHistory([weekly], 6, NOW))).toEqual([4333, 4333, 4333, 2167, 4333, 4333]);
  });

  it("a cancel after a pause: the pause still skips its months, the cancel ends the rest", () => {
    const points = buildMonthlySpendHistory([plan({
      status: "cancelled",
      cancellationRequestedAt: "2026-05-20T00:00:00.000Z",
      pausedPeriods: [{ from: "2026-02-01T00:00:00.000Z", to: "2026-03-20T00:00:00.000Z" }]
    })], 6, NOW);
    expect(amounts(points)).toEqual([1000, 0, 0, 1000, 1000, 0]);
  });

  it("no invented date: still paused with no readable start counts nothing; a period with an unreadable start is ignored", () => {
    expect(amounts(buildMonthlySpendHistory([plan({ status: "paused", pausedPeriods: [{ from: "not a date" }] })], 6, NOW))).toEqual([0, 0, 0, 0, 0, 0]);
    expect(amounts(buildMonthlySpendHistory([plan({ pausedPeriods: [{ from: "not a date", to: "2026-04-20T00:00:00.000Z" }] })], 6, NOW))).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
  });
});

describe("buildMonthlySpendHistory — fx", () => {
  it("converts every cycle into the home currency", () => {
    const points = buildMonthlySpendHistory([
      sub({ id: "m", price: { amountMinor: 9500, currency: "INR" } }), // $1.00
      sub({ id: "w", billingCycle: "weekly", price: { amountMinor: 2280, currency: "INR" } }), // 2280*52/12 = 9880 paise = $1.04
      sub({ id: "q", billingCycle: "quarterly", price: { amountMinor: 19000, currency: "INR" }, nextRenewalDate: "2026-06-01T00:00:00.000Z" }), // $2.00 in Jun
      sub({ id: "a", billingCycle: "annual", price: { amountMinor: 1000, currency: "USD" }, nextRenewalDate: "2026-06-01T00:00:00.000Z" })
    ], 1, NOW, fx);
    expect(amounts(points)).toEqual([100 + 104 + 200 + 1000]);
  });

  it("contributes 0 (never a fabricated figure) for a currency with no rate, in every cycle", () => {
    const points = buildMonthlySpendHistory([
      sub({ id: "m", price: { amountMinor: 500, currency: "GBP" } }),
      sub({ id: "w", billingCycle: "weekly", price: { amountMinor: 500, currency: "GBP" } }),
      sub({ id: "a", billingCycle: "annual", price: { amountMinor: 500, currency: "GBP" }, nextRenewalDate: "2026-06-01T00:00:00.000Z" }),
      sub({ id: "usd", price: { amountMinor: 700, currency: "USD" } })
    ], 1, NOW, fx);
    expect(amounts(points)).toEqual([700]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { RATES_REFRESH_INTERVAL_MS, fetchLatestRates, isRateTableStale } from "./rates";

// P6.3: a failed or odd answer from the rate source must give NO table (the app
// then shows totals it can't convert as excluded, never a made-up rate). Stryker
// skipped each of these checks and no test noticed; a zero or negative rate kept
// would have priced subscriptions at nothing, or below nothing.

const answer = (body: unknown, ok = true) => vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok, json: async () => body } as Response);
afterEach(() => vi.restoreAllMocks());

describe("fetchLatestRates", () => {
  it("asks the free USD-pivot source", async () => {
    const spy = answer({ result: "success", rates: { USD: 1 } });
    await fetchLatestRates();
    expect(spy).toHaveBeenCalledWith("https://open.er-api.com/v6/latest/USD");
  });

  it("an HTTP error gives no table", async () => {
    answer({ result: "success", rates: { USD: 1, EUR: 0.9 } }, false);
    expect(await fetchLatestRates()).toBeNull();
  });

  it("a body that isn't a success, or has no rates, gives no table", async () => {
    answer({ result: "error", rates: { USD: 1 } });
    expect(await fetchLatestRates()).toBeNull();
    answer({ result: "success" });
    expect(await fetchLatestRates()).toBeNull();
  });

  it("keeps only positive numbers for the six supported currencies", async () => {
    answer({ result: "success", rates: { USD: 1, EUR: 0, GBP: -0.8, INR: "95", CAD: 1.36, XYZ: 5 } });
    expect(await fetchLatestRates()).toEqual({ USD: 1, CAD: 1.36 });
  });
});

describe("isRateTableStale", () => {
  it("is stale only once more than a day has passed", () => {
    expect(RATES_REFRESH_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
    const fetched = "2026-10-01T00:00:00.000Z";
    expect(isRateTableStale(fetched, new Date(Date.parse(fetched) + RATES_REFRESH_INTERVAL_MS))).toBe(false);
    expect(isRateTableStale(fetched, new Date(Date.parse(fetched) + RATES_REFRESH_INTERVAL_MS + 1))).toBe(true);
  });
});

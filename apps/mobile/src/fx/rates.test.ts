import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLatestRates, isRateTableStale, RATES_REFRESH_INTERVAL_MS } from "./rates";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockFetch(response: { ok: boolean; json: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

describe("fetchLatestRates", () => {
  it("returns a rate table for every supported currency on a successful response", async () => {
    mockFetch({
      ok: true,
      json: async () => ({
        result: "success",
        rates: { USD: 1, EUR: 0.9, GBP: 0.75, INR: 95, CAD: 1.4, AUD: 1.5, AED: 3.67 }
      })
    });

    const rates = await fetchLatestRates();
    expect(rates).toEqual({ USD: 1, EUR: 0.9, GBP: 0.75, INR: 95, CAD: 1.4, AUD: 1.5 });
  });

  it("returns null on an HTTP error, never throwing", async () => {
    mockFetch({ ok: false, json: async () => ({}) });
    await expect(fetchLatestRates()).resolves.toBeNull();
  });

  it("returns null when the API's own success flag is false", async () => {
    mockFetch({ ok: true, json: async () => ({ result: "error" }) });
    await expect(fetchLatestRates()).resolves.toBeNull();
  });

  it("returns null on a network failure, never throwing", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    await expect(fetchLatestRates()).resolves.toBeNull();
  });

  it("ignores non-numeric or zero rate values rather than including a bad rate", async () => {
    mockFetch({
      ok: true,
      json: async () => ({ result: "success", rates: { USD: 1, EUR: 0, GBP: "bad" } })
    });
    const rates = await fetchLatestRates();
    expect(rates).toEqual({ USD: 1 });
  });
});

describe("isRateTableStale", () => {
  const now = new Date("2026-07-06T12:00:00.000Z");

  it("is not stale just under the refresh interval", () => {
    const fetchedAt = new Date(now.getTime() - (RATES_REFRESH_INTERVAL_MS - 1000)).toISOString();
    expect(isRateTableStale(fetchedAt, now)).toBe(false);
  });

  it("is stale once past the refresh interval", () => {
    const fetchedAt = new Date(now.getTime() - (RATES_REFRESH_INTERVAL_MS + 1000)).toISOString();
    expect(isRateTableStale(fetchedAt, now)).toBe(true);
  });

  it("treats an unparseable timestamp as stale", () => {
    expect(isRateTableStale("not-a-date", now)).toBe(true);
  });
});

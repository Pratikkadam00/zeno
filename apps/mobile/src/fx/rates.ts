import type { ExchangeRates } from "@zeno/shared";

// Free, no-API-key-required USD-pivot rate table — verified live 2026-07-06
// (returns real current rates for all 6 of the app's supported currencies,
// updates once daily). exchangerate.host was checked as an alternative and
// ruled out: it now requires a paid access_key despite returning HTTP 200.
const RATES_URL = "https://open.er-api.com/v6/latest/USD";

// Matches the source's own daily update cadence (its response includes
// time_next_update_utc) — refetching more often than that buys nothing.
export const RATES_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const SUPPORTED_CURRENCIES: (keyof ExchangeRates)[] = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

type OpenErApiResponse = {
  result: string;
  rates: Record<string, number>;
};

/**
 * Fetches the latest USD-pivot rate table. Returns null on any network,
 * HTTP, or parse failure — never throws. Callers must fall back to a cached
 * table (if any) or treat FX conversion as unavailable (see
 * createSpendSummary's excludedCurrencyCount), matching the same
 * inert-until-available pattern used for RevenueCat/Sentry elsewhere in the
 * app, rather than blocking the caller or fabricating a rate.
 */
export async function fetchLatestRates(): Promise<ExchangeRates | null> {
  try {
    const response = await fetch(RATES_URL);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as OpenErApiResponse;
    if (data.result !== "success" || !data.rates) {
      return null;
    }

    const rates: ExchangeRates = {};
    for (const code of SUPPORTED_CURRENCIES) {
      const value = data.rates[code];
      if (typeof value === "number" && value > 0) {
        rates[code] = value;
      }
    }
    return Object.keys(rates).length > 0 ? rates : null;
  } catch {
    return null;
  }
}

export function isRateTableStale(fetchedAt: string, now: Date = new Date()): boolean {
  const fetchedMs = Date.parse(fetchedAt);
  if (Number.isNaN(fetchedMs)) {
    return true;
  }
  return now.getTime() - fetchedMs > RATES_REFRESH_INTERVAL_MS;
}

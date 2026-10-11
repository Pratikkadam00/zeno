// Where the website's own server reaches the Zeno API (D24: the web checkout).
//
// Server-only, deliberately. The browser never calls the API directly: the
// pages fetch same-origin routes under /api/checkout, which forward here. That
// keeps the site's `connect-src 'self'` intact — the strict policy is part of
// what the privacy pages claim, and one checkout should not cost it.
//
// Set API_BASE_URL in the hosting environment to point at a different API.
const DEFAULT_API_BASE_URL = "https://zeno-api-5dwv.onrender.com/api/v1";

export function apiBaseUrl(): string {
  const configured = process.env.API_BASE_URL?.trim();
  return (configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export type WebProduct = "pro_annual" | "pro_lifetime" | "family_annual";
export type WebCurrency = "INR" | "USD";

export type PricedProduct = {
  product: WebProduct;
  plan: "pro" | "family";
  amountMinor: number;
};

export type PriceList = {
  currency: WebCurrency;
  /** False when the API has no Razorpay keys: the page then offers nothing. */
  configured: boolean;
  products: PricedProduct[];
};

/** An empty list is a valid answer and the one the page shows today. */
export const NO_PRICES: PriceList = { currency: "INR", configured: false, products: [] };

/**
 * What the website may sell right now. Any failure — the API down, a shape we
 * do not recognise, a timeout — reads as "nothing for sale", because a
 * checkout that cannot quote a price must not guess one. The page then says
 * Pro is available in the app, which is true regardless.
 */
export async function fetchPrices(currency: WebCurrency = "INR", timeoutMs = 4_000): Promise<PriceList> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl()}/billing/razorpay/prices?currency=${currency}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) return NO_PRICES;
    const body = (await response.json()) as { data?: unknown };
    return parsePriceList(body.data);
  } catch {
    return NO_PRICES;
  } finally {
    clearTimeout(timer);
  }
}

/** Exported for tests: the shape check the page depends on. */
export function parsePriceList(data: unknown): PriceList {
  if (!data || typeof data !== "object") return NO_PRICES;
  const { currency, configured, products } = data as Record<string, unknown>;
  if (currency !== "INR" && currency !== "USD") return NO_PRICES;
  if (!Array.isArray(products)) return NO_PRICES;
  const parsed: PricedProduct[] = [];
  for (const entry of products) {
    if (!entry || typeof entry !== "object") continue;
    const { product, plan, amountMinor } = entry as Record<string, unknown>;
    const isProduct = product === "pro_annual" || product === "pro_lifetime" || product === "family_annual";
    const isPlan = plan === "pro" || plan === "family";
    // A price that is not a whole positive number is not a price.
    if (!isProduct || !isPlan || typeof amountMinor !== "number" || !Number.isInteger(amountMinor) || amountMinor <= 0) continue;
    parsed.push({ product, plan, amountMinor });
  }
  return { currency, configured: configured === true, products: parsed };
}

const PRODUCT_NAMES: Record<WebProduct, string> = {
  pro_annual: "Pro, one year",
  pro_lifetime: "Pro, lifetime",
  family_annual: "Family, one year"
};

export function productName(product: WebProduct): string {
  return PRODUCT_NAMES[product];
}

/**
 * A price for a human. The minor unit is the source of truth everywhere else;
 * this is the only place it becomes a string, and it never rounds: 49900 paise
 * is ₹499.00, not ₹499 and not ₹500.
 */
export function formatPrice(amountMinor: number, currency: WebCurrency): string {
  const major = (amountMinor / 100).toFixed(2);
  return currency === "INR" ? `₹${major}` : `$${major}`;
}

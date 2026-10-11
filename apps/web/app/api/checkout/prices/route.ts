import { NextResponse } from "next/server";
import { fetchPrices } from "@/lib/checkout-api";

// What /pro may offer, read from the Zeno API by our own server (D24).
//
// Same-origin on purpose: the browser asks this route, not the API directly,
// so the site keeps `connect-src 'self'` and the API's address stays a server
// detail. The page is static and asks on load, which is also what lets a price
// change take effect without rebuilding the site.
export const dynamic = "force-dynamic";

const CURRENCIES = new Set(["INR", "USD"]);

export async function GET(request: Request): Promise<NextResponse> {
  const asked = new URL(request.url).searchParams.get("currency");
  const currency = asked && CURRENCIES.has(asked) ? (asked as "INR" | "USD") : "INR";
  const prices = await fetchPrices(currency);
  return NextResponse.json(prices, {
    // A price is not secret, but it must not be served stale from a CDN after
    // the owner changes it; the API is the one place it lives.
    headers: { "cache-control": "no-store" }
  });
}

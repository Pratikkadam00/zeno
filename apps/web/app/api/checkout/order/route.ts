import { NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/checkout-api";

// Starting a purchase (D24). The page sends the product it chose, the currency,
// whether the buyer ticked the immediate-access box, and the access token it
// got from /api/checkout/session. This forwards all of it to the Zeno API,
// which decides the amount and binds the order to the account in that token —
// neither is anything the browser gets a say in.
export const dynamic = "force-dynamic";

const PRODUCTS = new Set(["pro_annual", "pro_lifetime", "family_annual"]);
const CURRENCIES = new Set(["INR", "USD"]);
const MAX_BODY_BYTES = 2_048;

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer \S+$/.test(authorization)) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const product = typeof body.product === "string" ? body.product : "";
  const currency = typeof body.currency === "string" && CURRENCIES.has(body.currency) ? body.currency : "INR";
  if (!PRODUCTS.has(product)) {
    return NextResponse.json({ error: "That is not something sold here." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${apiBaseUrl()}/billing/razorpay/order`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", accept: "application/json", authorization },
      body: JSON.stringify({
        product,
        currency,
        // Only an explicit true is consent; anything else is not given.
        acceptedImmediateAccess: body.acceptedImmediateAccess === true
      }),
      cache: "no-store"
    });
    const payload = (await response.json().catch(() => ({}))) as { data?: unknown; error?: { message?: string } };
    if (!response.ok) {
      // The API's message is written for a person (the envelope's contract), so
      // it can be shown as it stands; the status is passed through so the page
      // can tell "sign in again" from "not for sale".
      return NextResponse.json({ error: payload.error?.message ?? "Could not start the checkout." }, { status: response.status });
    }
    return NextResponse.json(payload.data ?? {}, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not reach the payment service. Please try again." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

import { NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/checkout-api";

// Signing in to buy on the website (D24).
//
// Two steps, both proxied server-side so the browser never calls the Zeno API
// directly: ask for a code, then exchange it. The code, not the link, because
// the sign-in email's link is `zeno://auth/verify`, a deep link into the app —
// no use to someone paying on a laptop. The same email carries a code, and the
// API's /auth/verify takes { email, code }.
//
// Nothing is stored here. The access token goes back to the page, which keeps
// it in memory for the length of the purchase and nowhere else.
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_048;
// The WHATWG HTML email shape, as the waitlist route uses: deliberately not RFC
// 5322, and free of nested quantifiers.
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const CODE_RE = /^[A-Za-z0-9]{6,12}$/;

type Body = { email?: unknown; code?: unknown };

function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

async function readBody(request: Request): Promise<Body | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Body) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await readBody(request);
  if (!body) return bad("Send a JSON body.");
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email.length === 0 || email.length > 254 || !EMAIL_RE.test(email)) return bad("That email address does not look right.");

  // A code field of the wrong type is an error, not an absent code: coercing
  // it would quietly re-send a new code instead of verifying the one given.
  if (body.code !== undefined && typeof body.code !== "string") return bad("That code does not look right.");
  const code = typeof body.code === "string" ? body.code.trim() : "";
  // No code yet: ask the API to send one.
  if (code.length === 0) {
    const response = await forward("/auth/magic-link", { email });
    if (!response.ok) return bad("Could not send the code. Please try again shortly.", 502);
    // Deliberately the same answer whether or not the address has an account:
    // the API treats sign-in and sign-up alike, and so does this.
    return NextResponse.json({ sent: true }, { headers: { "cache-control": "no-store" } });
  }

  if (!CODE_RE.test(code)) return bad("That code does not look right.");
  const response = await forward("/auth/verify", { email, code });
  if (!response.ok) return bad("That code is wrong or has expired. Ask for a new one.", 401);
  // A 200 that is not JSON (a proxy's error page, say) is an upstream failure,
  // not a sign-in.
  const payload = (await response.json().catch(() => ({}))) as { data?: { accessToken?: unknown } };
  const accessToken = payload.data?.accessToken;
  if (typeof accessToken !== "string" || accessToken.length === 0) return bad("Sign-in failed. Please try again.", 502);
  // Only the access token goes to the page. The refresh token the API also
  // issues stays here and is dropped: a checkout needs minutes, not thirty days.
  return NextResponse.json({ accessToken }, { headers: { "cache-control": "no-store" } });
}

async function forward(path: string, body: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    return await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
  } catch {
    return new Response(null, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

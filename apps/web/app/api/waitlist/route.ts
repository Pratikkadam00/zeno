import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// Waitlist intake. Validates the email and durably records it.
//
// Persistence order:
//   1. POST to WAITLIST_WEBHOOK_URL if set (Resend audience, Zapier, a Sheet, …).
//   2. Otherwise append to a local NDJSON file (durable for self-hosted / dev).
//   3. If neither works (e.g. a read-only serverless FS with no webhook), the
//      request FAILS LOUDLY (502) — never a silent {ok:true} that drops signups.
//      Set WAITLIST_WEBHOOK_URL in production.
//
// Client contract: POST { email } → 200 { ok: true } on success, else 4xx/502.
// Same pattern the WHATWG HTML living standard requires from <input type=email>
// — deliberately not a full RFC 5322 grammar (no quoted-string local parts, no
// bare/comment forms), which also keeps it free of nested-quantifier ReDoS risk.
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_EMAIL_LENGTH = 254;
// Cheap defense-in-depth against an oversized body: Content-Length is client-
// supplied and can be omitted/wrong, so this isn't a hard guarantee, but it
// short-circuits the obvious case before any parsing/buffering happens.
const MAX_BODY_BYTES = 2_048;

// Best-effort in-memory rate limit (per IP). Resets on cold start; a production
// deployment should also have a platform/WAF limiter in front.
const HITS = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = HITS.get(ip);
  if (!entry || now > entry.reset) {
    HITS.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

// How many reverse-proxy hops to trust for client-IP resolution, mirroring
// apps/api/src/app.ts's resolveTrustProxy(). A standard reverse proxy (Vercel
// included) APPENDS the peer address it actually observed as the LAST entry in
// X-Forwarded-For — everything before that is whatever the client declared,
// and is not trustworthy for rate-limit keying. Taking the FIRST entry (the
// prior bug here) lets a client rotate its own limiter bucket on every request
// by sending a fresh made-up leftmost value.
function trustedHopCount(): number {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw !== undefined) {
    const hops = Number.parseInt(raw, 10);
    if (Number.isInteger(hops) && hops >= 0) return hops;
  }
  return 1;
}

function resolveClientIp(request: Request): string {
  const header = request.headers.get("x-forwarded-for");
  if (!header) return "unknown";
  const hops = trustedHopCount();
  if (hops <= 0) return "unknown";
  const parts = header.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return "unknown";
  const index = parts.length - hops;
  return (index >= 0 ? parts[index] : parts[0]) ?? "unknown";
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

async function persist(email: string): Promise<void> {
  const record = JSON.stringify({ email, at: new Date().toISOString() });

  const webhook = process.env.WAITLIST_WEBHOOK_URL;
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: record
    });
    if (!res.ok) throw new Error(`waitlist webhook responded ${res.status}`);
    return;
  }

  const file = process.env.WAITLIST_FILE ?? ".data/waitlist.ndjson";
  try {
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, `${record}\n`, "utf8");
  } catch (error) {
    // Read-only serverless FS with no webhook: log a *masked* diagnostic (never
    // the raw address) and re-throw so the handler returns 502 instead of
    // pretending the signup was saved.
    console.warn(JSON.stringify({
      event: "waitlist.signup.unpersisted",
      email: maskEmail(email),
      at: new Date().toISOString(),
      note: "set WAITLIST_WEBHOOK_URL (or a writable WAITLIST_FILE) to capture signups"
    }));
    throw error instanceof Error ? error : new Error("waitlist persistence failed");
  }
}

export async function POST(request: Request) {
  const ip = resolveClientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "", 10);
  if (Number.isInteger(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Request body too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const rawEmail = typeof body === "object" && body !== null && "email" in body
    ? (body as { email: unknown }).email
    : undefined;
  // Reject non-string values outright — coercing an array/object via String()
  // (e.g. Array.prototype.toString joining ["a@b.com", "extra"] into
  // "a@b.com,extra") could smuggle extra text past validation.
  if (typeof rawEmail !== "string") {
    return NextResponse.json({ ok: false, error: "Please provide a valid email." }, { status: 422 });
  }
  const email = rawEmail.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email." }, { status: 422 });
  }

  try {
    await persist(email);
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save your signup. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

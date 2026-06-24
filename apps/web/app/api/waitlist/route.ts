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
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body === "object" && body && "email" in body
    ? String((body as { email: unknown }).email).trim().toLowerCase()
    : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email." }, { status: 422 });
  }

  try {
    await persist(email);
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save your signup. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

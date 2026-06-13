import { NextResponse } from "next/server";

// Lightweight, dependency-free waitlist intake. Validates the email and
// records it server-side. Wire `persist()` to Resend/a DB/Sheet when ready —
// the client contract (POST { email } → { ok }) stays the same.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function persist(email: string): Promise<void> {
  // Placeholder: log to the server so signups are captured in dev. Swap for
  // Resend audience / database insert in production.
  console.info(JSON.stringify({ event: "waitlist.signup", email, at: new Date().toISOString() }));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body === "object" && body && "email" in body ? String((body as { email: unknown }).email).trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email." }, { status: 422 });
  }

  await persist(email);
  return NextResponse.json({ ok: true });
}

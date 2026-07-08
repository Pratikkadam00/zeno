import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Each test uses a UNIQUE x-forwarded-for so the module-level per-IP rate limiter
// (shared across calls within one import) doesn't bleed between cases.
function post(email: unknown, ip: string, rawBody?: string): Request {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: rawBody ?? JSON.stringify({ email })
  });
}

const originalWebhook = process.env.WAITLIST_WEBHOOK_URL;

beforeEach(() => {
  // Route signups through a webhook so tests never touch the filesystem.
  process.env.WAITLIST_WEBHOOK_URL = "https://webhook.example.com/waitlist";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalWebhook === undefined) delete process.env.WAITLIST_WEBHOOK_URL;
  else process.env.WAITLIST_WEBHOOK_URL = originalWebhook;
});

describe("waitlist POST", () => {
  it("accepts a valid email and reports the webhook was called", async () => {
    const fetchMock = vi.fn((_url: string | URL | Request, _init?: RequestInit) =>
      Promise.resolve(new Response(null, { status: 200 }))
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(post("Person@Example.com ", "10.0.0.1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Email is normalized (trimmed + lowercased) before persistence.
    const body = JSON.parse((fetchMock.mock.calls[0]![1]!).body as string);
    expect(body.email).toBe("person@example.com");
  });

  it("rejects a malformed email with 422 and never calls the webhook", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(post("not-an-email", "10.0.0.2"));
    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an unparseable JSON body", async () => {
    const response = await POST(post(undefined, "10.0.0.3", "{not json"));
    expect(response.status).toBe(400);
  });

  it("fails loudly with 502 when the webhook rejects (never a silent ok)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))));

    const response = await POST(post("real@example.com", "10.0.0.4"));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false });
  });

  it("rate-limits a burst from one IP with 429", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 200 }))));
    const ip = "10.0.0.5";

    // First 5 succeed, the 6th within the window is limited.
    for (let i = 0; i < 5; i += 1) {
      const ok = await POST(post(`user${i}@example.com`, ip));
      expect(ok.status).toBe(200);
    }
    const limited = await POST(post("user6@example.com", ip));
    expect(limited.status).toBe(429);
  });

  it("keys the rate limiter off the trusted (last) X-Forwarded-For hop, not the client-declared first entry", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 200 }))));
    const realIp = "10.0.0.50";

    // An attacker declares a fresh, made-up leftmost IP on every request; the
    // trusted reverse proxy still appends the SAME real peer address as the
    // last entry each time. If the limiter is keyed off the last entry (fixed
    // behavior), this burst still gets capped despite the changing prefix.
    for (let i = 0; i < 5; i += 1) {
      const spoofedHeader = `${i}.${i}.${i}.${i}, ${realIp}`;
      const ok = await POST(post(`spoof${i}@example.com`, spoofedHeader));
      expect(ok.status).toBe(200);
    }
    const limited = await POST(post("overflow@example.com", `255.255.255.255, ${realIp}`));
    expect(limited.status).toBe(429);
  });

  it("rejects a non-string email (array-coercion smuggling) with 422", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);

    // Array.prototype.toString would join this into "a@b.com,attacker text",
    // which the old regex accepted — must be rejected outright as non-string.
    const response = await POST(post(["a@b.com", "attacker text"], "10.0.0.6"));
    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an email carrying HTML-special characters the old permissive regex let through", async () => {
    const response = await POST(post("a@b.com<script>alert(1)</script>", "10.0.0.7"));
    expect(response.status).toBe(422);
  });

  it("rejects an oversized email (>254 chars)", async () => {
    const response = await POST(post(`${"a".repeat(250)}@example.com`, "10.0.0.8"));
    expect(response.status).toBe(422);
  });

  it("rejects an oversized request body via Content-Length before parsing", async () => {
    // A synthetic Request built in-process (as here) doesn't auto-populate
    // Content-Length the way a real incoming HTTP request does — set it
    // explicitly to model what Next.js actually receives on the wire.
    const oversized = JSON.stringify({ email: "real@example.com", padding: "x".repeat(5_000) });
    const request = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "10.0.0.9",
        "content-length": String(Buffer.byteLength(oversized))
      },
      body: oversized
    });
    const response = await POST(request);
    expect(response.status).toBe(413);
  });
});

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
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/**
 * Signing in to buy. The page sends an email address, the API sends a code,
 * the page sends the code back. Everything here is about not leaking and not
 * trusting: the same answer whoever asks, the refresh token dropped, and no
 * upstream detail passed on.
 */
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/checkout/session", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });

const apiOk = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });

afterEach(() => vi.restoreAllMocks());

describe("asking for a code", () => {
  it("asks the API to send one, and says only that it was sent", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiOk({ sent: true }));
    const response = await POST(post({ email: "buyer@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: true });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/magic-link");
    expect(JSON.parse(init.body as string)).toEqual({ email: "buyer@example.com" });
  });

  it("gives the same answer whether or not the address has an account", async () => {
    // The API treats sign-in and sign-up alike; this must not become an
    // account-existence oracle by answering differently.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(apiOk({ sent: true }));
    const first = await POST(post({ email: "known@example.com" }));
    const second = await POST(post({ email: "unknown@example.com" }));
    expect(await first.json()).toEqual(await second.json());
    expect(first.status).toBe(second.status);
  });

  it("refuses an address that is not one", async () => {
    // The shape is the WHATWG one the waitlist route uses, not RFC 5322: a
    // dotless host like "a@b" is VALID there, so it is not in this list.
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(apiOk({ sent: true }));
    for (const email of ["", "   ", "not-an-email", "@example.com", "a b@example.com", `${"x".repeat(250)}@example.com`]) {
      expect((await POST(post({ email }))).status, email).toBe(400);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON, and an oversized one, without calling the API", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await POST(post("not json"))).status).toBe(400);
    expect((await POST(post({ email: "a@b.com" }, { "content-length": "99999" }))).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("turns an API failure into a plain message, never the upstream's", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Resend said no" } }), { status: 502 }));
    const response = await POST(post({ email: "buyer@example.com" }));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("Resend");
  });

  it("survives the API being unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    expect((await POST(post({ email: "buyer@example.com" }))).status).toBe(502);
  });
});

describe("exchanging the code", () => {
  it("returns the access token and nothing else", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiOk({
      accessToken: "access-token-value",
      refreshToken: "refresh-token-value",
      accountId: "acct_1",
      email: "buyer@example.com"
    }));
    const response = await POST(post({ email: "buyer@example.com", code: "123456" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ accessToken: "access-token-value" });
    // The refresh token is a thirty-day credential; a checkout needs minutes.
    expect(JSON.stringify(body)).not.toContain("refresh-token-value");
  });

  it("sends the code to the API's verify route", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiOk({ accessToken: "t" }));
    await POST(post({ email: "buyer@example.com", code: "123456" }));
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/verify");
    expect(JSON.parse(init.body as string)).toEqual({ email: "buyer@example.com", code: "123456" });
  });

  it("refuses a code of the wrong shape without asking the API", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    for (const code of ["12345", "1234567890123", "12 34 56", "<script>"]) {
      expect((await POST(post({ email: "a@b.com", code }))).status, code).toBe(400);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("says the code is wrong when the API rejects it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Invalid or expired magic link." } }), { status: 401 }));
    expect((await POST(post({ email: "a@b.com", code: "123456" }))).status).toBe(401);
  });

  it("does not hand the page a token the API did not give", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiOk({ accountId: "acct_1" }));
    const response = await POST(post({ email: "a@b.com", code: "123456" }));
    expect(response.status).toBe(502);
    expect(await response.json()).not.toHaveProperty("accessToken");
  });

  it("is never cached", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiOk({ accessToken: "t" }));
    expect((await POST(post({ email: "a@b.com", code: "123456" }))).headers.get("cache-control")).toBe("no-store");
  });
});

describe("bodies that are not what they claim", () => {
  it("refuses JSON that is not an object", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    for (const body of ["null", "123", '"a string"', "true"]) {
      expect((await POST(post(body))).status, body).toBe(400);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses a field of the wrong type rather than coercing it", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await POST(post({ email: 42 }))).status).toBe(400);
    expect((await POST(post({ email: "a@b.com", code: 123456 }))).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("survives the API being unreachable while exchanging a code", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    expect((await POST(post({ email: "a@b.com", code: "123456" }))).status).toBe(401);
  });

  it("survives a reply that is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<html>502</html>", { status: 200 }));
    expect((await POST(post({ email: "a@b.com", code: "123456" }))).status).toBe(502);
  });
});

describe("the timeout", () => {
  it("gives up rather than holding the page open", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) =>
      new Promise((_resolve, reject) => {
        (init as RequestInit).signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })
    );
    const pending = POST(post({ email: "a@b.com" }));
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await pending).status).toBe(502);
    vi.useRealTimers();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app";

// P6.2: our own access token's expiry, at the exact second. `exp` is the first
// second the token is no longer valid; Stryker turned `exp > now` into `>=` and
// no test noticed, because every expired-token test was minutes past it.
afterEach(() => {
  vi.useRealTimers();
});

describe("an access token at its expiry", () => {
  it("works up to the second before exp, and is refused at exp (15 minutes after issue)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const issuedAt = Date.UTC(2026, 9, 5, 12, 0, 0);
    vi.setSystemTime(issuedAt);
    const app = await buildApp();
    const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email: "expiry-edge@zeno.test" } });
    const raw = decodeURIComponent(String(requested.json().data.devLink).split("token=")[1] ?? "");
    const verified = await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}` });
    const { accessToken, expiresInSeconds } = verified.json().data as { accessToken: string; expiresInSeconds: number };
    expect(expiresInSeconds).toBe(15 * 60);
    const account = () => app.inject({ method: "GET", url: "/api/v1/account", headers: { authorization: `Bearer ${accessToken}` } });

    vi.setSystemTime(issuedAt + (expiresInSeconds - 1) * 1000);
    expect((await account()).statusCode).toBe(200);
    vi.setSystemTime(issuedAt + expiresInSeconds * 1000);
    expect((await account()).statusCode).toBe(401);
    await app.close();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app";
import { revokeAllSessionsForAccount, sweepExpiredAuth } from "./auth";

// P6.2: three things Stryker broke in routes/auth.ts that no test noticed.
//  1. Revoking one account's sessions could be made to revoke EVERYONE's: every
//     refresh session, pending sign-in link and pending code on the server.
//  2. The periodic sweep could be made to delete live sessions, or to wipe every
//     address's sign-in-email counter, which lifts the limit on email bombing.
//  3. The 15-minute window of that per-address limit could shrink to 250 ms.

type App = Awaited<ReturnType<typeof buildApp>>;
let ip = 0;
const nextIp = () => {
  ip += 1;
  return `10.77.${(ip >> 8) & 255}.${(ip & 255) || 1}`;
};

const requestLink = (app: App, email: string) =>
  app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email }, remoteAddress: nextIp() });

async function pending(app: App, email: string) {
  const data = (await requestLink(app, email)).json().data as { devLink: string; devCode: string };
  return { token: decodeURIComponent(data.devLink.split("token=")[1] ?? ""), code: data.devCode };
}
const verifyLink = (app: App, token: string) =>
  app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(token)}`, remoteAddress: nextIp() });
const verifyCode = (app: App, email: string, code: string) =>
  app.inject({ method: "POST", url: "/api/v1/auth/magic-link/verify", payload: { email, code }, remoteAddress: nextIp() });
const refresh = (app: App, refreshToken: string) =>
  app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken }, remoteAddress: nextIp() });

async function signedIn(app: App, email: string) {
  const data = (await verifyLink(app, (await pending(app, email)).token)).json().data as { accountId: string; refreshToken: string };
  return data;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("revoking one account's sessions touches only that account", () => {
  it("everyone else stays signed in, and their pending links and codes still work", async () => {
    const app = await buildApp();
    const leaving = await signedIn(app, "scope-leaving@zeno.test");
    const staying = await signedIn(app, "scope-staying@zeno.test");
    const linkWaiting = await pending(app, "scope-link@zeno.test");
    const codeWaiting = await pending(app, "scope-code@zeno.test");

    expect(await revokeAllSessionsForAccount(leaving.accountId)).toBe(true);

    expect((await refresh(app, leaving.refreshToken)).statusCode).toBe(401);
    expect((await refresh(app, staying.refreshToken)).statusCode).toBe(200);
    expect((await verifyLink(app, linkWaiting.token)).statusCode).toBe(200);
    expect((await verifyCode(app, "scope-code@zeno.test", codeWaiting.code)).statusCode).toBe(200);
    await app.close();
  });
});

describe("the periodic sweep", () => {
  it("keeps a live, unrotated session", async () => {
    const app = await buildApp();
    const session = await signedIn(app, "sweep-live@zeno.test");
    sweepExpiredAuth();
    expect((await refresh(app, session.refreshToken)).statusCode).toBe(200);
    await app.close();
  });
});

describe("the per-address limit on sign-in emails (5 per 15 minutes, any source IP)", () => {
  it("holds for the whole 15 minutes, survives a sweep, and lifts after it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.UTC(2026, 9, 5, 9, 0, 0);
    vi.setSystemTime(start);
    const app = await buildApp();
    const victim = "scope-victim@zeno.test";
    for (let i = 0; i < 5; i++) expect((await requestLink(app, victim)).statusCode, `send ${i + 1}`).toBe(200);
    expect((await requestLink(app, victim)).statusCode).toBe(429);

    vi.setSystemTime(start + 60_000);
    sweepExpiredAuth();
    expect((await requestLink(app, victim)).statusCode).toBe(429);

    vi.setSystemTime(start + 14 * 60_000);
    expect((await requestLink(app, victim)).statusCode).toBe(429);

    vi.setSystemTime(start + 15 * 60_000 + 1);
    expect((await requestLink(app, victim)).statusCode).toBe(200);
    await app.close();
  });
});

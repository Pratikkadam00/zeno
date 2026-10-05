import { createHash, createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * routes/auth.ts paths the other auth suites do not reach:
 *  - our OWN access-token checks past the signature (issuer, audience, subject,
 *    expiry). The tamper tests in auth.test.ts change the payload, so they stop
 *    at the signature and never exercise these; here the tokens are validly
 *    signed with a key loaded through JWT_PRIVATE_KEY / JWT_PUBLIC_KEY;
 *  - key loading (env PEM with escaped newlines; refusing ephemeral keys in production);
 *  - boot hydration and the expiry sweep, observed through the storage calls;
 *  - account deletion revoking pending magic links and codes;
 *  - the magic-link flow end to end (P2.6): enumeration safety, 10-minute
 *    expiry, single use, and the per-address wrong-code budget (F80);
 *  - real email delivery through Resend (request shape, HTML escaping, failures
 *    that never leak the address), demo login, legacy routes, and the dev-only
 *    unverified social flag (ignored in production).
 *
 * Each test imports a FRESH module graph (vi.resetModules) because auth.ts
 * reads its keys, issuer, audience and redirect URL at import time.
 */
const storage = vi.hoisted(() => ({
  hydrators: new Map<string, (entries: { key: string; value: unknown }[]) => void>(),
  deleted: [] as string[],
  persisted: [] as string[],
  persistedValues: new Map<string, unknown>(),
  persistResult: true
}));
vi.mock("../storage/pg", async (importOriginal) => {
  const real = await importOriginal<typeof import("../storage/pg")>();
  return {
    ...real,
    registerHydrator: (namespace: string, fn: (entries: { key: string; value: unknown }[]) => void) => {
      storage.hydrators.set(namespace, fn);
      real.registerHydrator(namespace, fn);
    },
    kvDelete: (namespace: string, key: string) => { storage.deleted.push(`${namespace}:${key}`); },
    kvDeleteAwait: async (namespace: string, key: string) => { storage.deleted.push(`${namespace}:${key}`); return true; },
    kvDeleteByValueField: async (namespace: string, field: string, value: string) => { storage.deleted.push(`${namespace}:${field}=${value}`); return true; },
    kvPersist: (namespace: string, key: string, value: unknown) => {
      storage.persisted.push(`${namespace}:${key}`);
      storage.persistedValues.set(`${namespace}:${key}`, value);
    },
    kvPersistAwait: async (namespace: string, key: string, value: unknown) => {
      storage.persisted.push(`${namespace}:${key}`);
      storage.persistedValues.set(`${namespace}:${key}`, value);
      return storage.persistResult;
    }
  };
});

const saved: Record<string, string | undefined> = {};
function setEnv(key: string, value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
beforeEach(() => {
  vi.resetModules();
  storage.hydrators.clear();
  storage.deleted.length = 0;
  storage.persisted.length = 0;
  storage.persistedValues.clear();
  storage.persistResult = true;
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
    delete saved[k];
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
function sign(payload: Record<string, unknown>): string {
  const head = b64({ alg: "RS256", typ: "JWT", kid: "k" });
  const body = b64(payload);
  const s = createSign("RSA-SHA256");
  s.update(`${head}.${body}`);
  s.end();
  return `${head}.${body}.${s.sign(privateKey, "base64url")}`;
}
const now = () => Math.floor(Date.now() / 1000);

async function loadAuth() {
  return import("./auth");
}
async function loadApp() {
  const { buildApp } = await import("../app");
  return buildApp();
}
type App = Awaited<ReturnType<typeof loadApp>>;
async function requestLink(app: App, email: string, remoteAddress = "127.0.0.1") {
  return (await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress, payload: { email } })).json().data as { devCode: string; devLink: string };
}
const tokenOf = (devLink: string) => decodeURIComponent(devLink.split("token=")[1]!);

describe("our own access tokens, validly signed (keys from JWT_PRIVATE_KEY / JWT_PUBLIC_KEY)", () => {
  beforeEach(() => {
    // Escaped newlines, the way a dashboard stores a PEM on one line.
    setEnv("JWT_PRIVATE_KEY", privateKey.replace(/\n/g, "\\n"));
    setEnv("JWT_PUBLIC_KEY", publicKey.replace(/\n/g, "\\n"));
    setEnv("JWT_KEY_ID", "env-key-7");
    setEnv("JWT_ISSUER", undefined);
    setEnv("JWT_AUDIENCE", undefined);
  });

  it("accepts the right issuer and audience (a string or a list containing it)", async () => {
    const { verifyAccessToken } = await loadAuth();
    expect(verifyAccessToken(sign({ sub: "acct_1", email: "a@x.com", iss: "zeno-api", aud: "zeno-mobile", exp: now() + 60 }))).toEqual({ sub: "acct_1", email: "a@x.com" });
    expect(verifyAccessToken(sign({ sub: "acct_1", iss: "zeno-api", aud: ["other", "zeno-mobile"], exp: now() + 60 }))).toEqual({ sub: "acct_1", email: null });
  });

  it("rejects a validly signed token with the wrong issuer, the wrong or no audience, no subject, or no expiry", async () => {
    const { verifyAccessToken } = await loadAuth();
    const good = { sub: "acct_1", iss: "zeno-api", aud: "zeno-mobile", exp: now() + 60 };
    expect(verifyAccessToken(sign({ ...good, iss: "someone-else" }))).toBeNull();
    expect(verifyAccessToken(sign({ ...good, aud: "zeno-web" }))).toBeNull();
    expect(verifyAccessToken(sign({ ...good, aud: ["zeno-web"] }))).toBeNull();
    const { aud: _aud, ...noAud } = good;
    expect(verifyAccessToken(sign(noAud))).toBeNull();
    const { sub: _sub, ...noSub } = good;
    expect(verifyAccessToken(sign(noSub))).toBeNull();
    const { exp: _exp, ...noExp } = good;
    expect(verifyAccessToken(sign(noExp))).toBeNull();
    expect(verifyAccessToken("not-base64.at-all.x")).toBeNull();
  });

  it("the sessions it issues carry the configured key id and verify", async () => {
    const app = await loadApp();
    const { verifyAccessToken } = await loadAuth();
    const { devLink } = await requestLink(app, "kid@zeno.test");
    const session = (await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: tokenOf(devLink) } })).json().data;
    const header = JSON.parse(Buffer.from(session.accessToken.split(".")[0], "base64url").toString());
    expect(header).toEqual({ alg: "RS256", typ: "JWT", kid: "env-key-7" });
    expect(verifyAccessToken(session.accessToken)?.sub).toBe(session.accountId);
  });
});

describe("key loading", () => {
  it("env keys without JWT_KEY_ID sign with the default key id", async () => {
    setEnv("JWT_PRIVATE_KEY", privateKey);
    setEnv("JWT_PUBLIC_KEY", publicKey);
    setEnv("JWT_KEY_ID", undefined);
    const app = await loadApp();
    const { devLink } = await requestLink(app, "default-kid@zeno.test");
    const session = (await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: tokenOf(devLink) } })).json().data;
    expect(JSON.parse(Buffer.from(session.accessToken.split(".")[0], "base64url").toString()).kid).toBe("zeno-rs256-env");
  });

  it("refuses to start in production without configured keys (no ephemeral keys)", async () => {
    setEnv("JWT_PRIVATE_KEY", undefined);
    setEnv("JWT_PUBLIC_KEY", undefined);
    setEnv("NODE_ENV", "production");
    await expect(loadAuth()).rejects.toThrow("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production.");
  });
});

describe("boot hydration and the expiry sweep", () => {
  it("hydration keeps only unexpired records; a hydrated refresh session works after a restart", async () => {
    const app = await loadApp();
    const future = Date.now() + 60_000;
    const past = Date.now() - 1;
    const { createHash } = await import("node:crypto");
    const refreshToken = "r".repeat(40);
    const hash = createHash("sha256").update(refreshToken).digest("base64url");
    storage.hydrators.get("auth_refresh")!([
      { key: hash, value: { accountId: "acct_h", email: "h@x.com", provider: "magic_link", expiresAt: future, rotatedAt: null } },
      { key: "stale", value: { accountId: "acct_s", email: "s@x.com", provider: "magic_link", expiresAt: past, rotatedAt: null } }
    ]);
    const code = "123456";
    storage.hydrators.get("auth_legacy")!([
      { key: "legacy@x.com", value: { accountId: "acct_l", email: "legacy@x.com", tokenHash: "th", code, expiresAt: future } },
      { key: "old@x.com", value: { accountId: "acct_o", email: "old@x.com", tokenHash: "th2", code, expiresAt: past } }
    ]);
    storage.hydrators.get("auth_magic")!([
      { key: "th", value: { accountId: "acct_l", email: "legacy@x.com", tokenHash: "th", code, expiresAt: future } },
      { key: "th-old", value: { accountId: "acct_o", email: "old@x.com", tokenHash: "th-old", code, expiresAt: past } }
    ]);
    // F81: the expired rows are deleted from the database, not just skipped;
    // the live ones are left alone.
    expect(storage.deleted.sort()).toEqual(["auth_legacy:old@x.com", "auth_magic:th-old", "auth_refresh:stale"]);
    const refreshed = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken } });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().data.accountId).toBe("acct_h");
    // This record predates the wrongAttempts field: a wrong guess counts from 0
    // (and does not destroy it), then the right code still works.
    const wrong = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link/verify", payload: { email: "legacy@x.com", code: "654321" } });
    expect(wrong.statusCode).toBe(401);
    expect(storage.persisted).toContain("auth_legacy:legacy@x.com");
    const legacy = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link/verify", payload: { email: "legacy@x.com", code } });
    expect(legacy.json().data.accountId).toBe("acct_l");
    const expired = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link/verify", payload: { email: "old@x.com", code } });
    expect(expired.statusCode).toBe(401);
  });

  it("the sweep reclaims expired links, codes, expired and ROTATED refresh sessions, and old rate-limit windows", async () => {
    const app = await loadApp();
    const { sweepExpiredAuth } = await loadAuth();
    const link = await requestLink(app, "sweep@zeno.test");
    const session = (await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: tokenOf(link.devLink) } })).json().data;
    await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken: session.refreshToken } }); // rotates it
    await requestLink(app, "pending@zeno.test"); // a pending link + code
    storage.deleted.length = 0;
    sweepExpiredAuth(); // now: only the rotated session is reclaimable
    expect(storage.deleted.filter((d) => d.startsWith("auth_refresh:"))).toHaveLength(1);
    expect(storage.deleted.some((d) => d.startsWith("auth_magic:") || d.startsWith("auth_legacy:"))).toBe(false);

    vi.useFakeTimers({ now: Date.now() + 31 * 24 * 60 * 60 * 1000 });
    storage.deleted.length = 0;
    sweepExpiredAuth(); // past every TTL: the pending link, its code, and the live session go
    expect(storage.deleted).toEqual(expect.arrayContaining([expect.stringMatching(/^auth_magic:/), "auth_legacy:pending@zeno.test", expect.stringMatching(/^auth_refresh:/)]));
    // The per-recipient send window was reclaimed too: a fresh address budget.
    vi.useRealTimers();
  });
});

describe("account deletion revokes pending sign-ins", () => {
  it("a pending magic link and its code stop working once the account's sessions are revoked", async () => {
    const app = await loadApp();
    const { revokeAllSessionsForAccount } = await loadAuth();
    const first = await requestLink(app, "gone@zeno.test");
    const session = (await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: tokenOf(first.devLink) } })).json().data;
    const pending = await requestLink(app, "gone@zeno.test");
    await requestLink(app, "someone-else@zeno.test");
    storage.deleted.length = 0;
    expect(await revokeAllSessionsForAccount(session.accountId)).toBe(true);
    // One database-side delete per namespace, by the accountId every auth record
    // carries (F75), so a retry also finds rows memory has already forgotten.
    expect(storage.deleted.sort()).toEqual([
      `auth_code_fail:accountId=${session.accountId}`,
      `auth_legacy:accountId=${session.accountId}`,
      `auth_magic:accountId=${session.accountId}`,
      `auth_refresh:accountId=${session.accountId}`
    ]);
    expect(storage.deleted.some((d) => d.includes("someone-else"))).toBe(false);
    const byLink = await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: tokenOf(pending.devLink) } });
    const byCode = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link/verify", payload: { email: "gone@zeno.test", code: pending.devCode } });
    const byRefresh = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken: session.refreshToken } });
    expect([byLink.statusCode, byCode.statusCode, byRefresh.statusCode]).toEqual([401, 401, 401]);
  });
});

describe("F76: a deleted account's access tokens stop working", () => {
  beforeEach(() => {
    setEnv("JWT_PRIVATE_KEY", privateKey);
    setEnv("JWT_PUBLIC_KEY", publicKey);
    setEnv("JWT_ISSUER", undefined);
    setEnv("JWT_AUDIENCE", undefined);
  });
  const claims = (over: Record<string, unknown> = {}) => ({ sub: "acct_gone", iss: "zeno-api", aud: "zeno-mobile", exp: now() + 600, ...over });

  it("tokens issued at or before the cut-off are rejected; a token with no iat fails closed; others are untouched", async () => {
    const { revokeAccessTokensForAccount, verifyAccessToken } = await loadAuth();
    const before = sign(claims({ iat: now() - 60 }));
    const sameSecond = sign(claims({ iat: now() }));
    const noIat = sign(claims());
    const otherAccount = sign(claims({ sub: "acct_other", iat: now() - 60 }));
    expect(verifyAccessToken(before)?.sub).toBe("acct_gone");
    expect(await revokeAccessTokensForAccount("acct_gone")).toBe(true);
    expect(verifyAccessToken(before)).toBeNull();
    expect(verifyAccessToken(sameSecond)).toBeNull();
    expect(verifyAccessToken(noIat)).toBeNull();
    expect(verifyAccessToken(otherAccount)?.sub).toBe("acct_other");
    // A token issued after the cut-off (the same email signing up again) works.
    expect(verifyAccessToken(sign(claims({ iat: now() + 2 }))))?.toMatchObject({ sub: "acct_gone" });
  });

  it("the stored record is keyed by a hash and holds only a timestamp (it is not a row of the deleted user)", async () => {
    const { revokeAccessTokensForAccount } = await loadAuth();
    await revokeAccessTokensForAccount("acct_gone");
    const [entry] = [...storage.persistedValues.entries()].filter(([k]) => k.startsWith("auth_revoked:"));
    expect(entry![0]).toMatch(/^auth_revoked:[0-9a-f]{64}$/);
    expect(entry![0]).not.toContain("acct_gone");
    expect(entry![1]).toEqual({ revokedAtSeconds: expect.any(Number) });
  });

  it("a refused save changes nothing: false, and the old token still works so the user can retry", async () => {
    const { revokeAccessTokensForAccount, verifyAccessToken } = await loadAuth();
    const before = sign(claims({ iat: now() - 60 }));
    storage.persistResult = false;
    expect(await revokeAccessTokensForAccount("acct_gone")).toBe(false);
    expect(verifyAccessToken(before)?.sub).toBe("acct_gone");
  });

  it("the cut-off survives a restart, and is swept (row deleted) once every older token has expired", async () => {
    const auth = await loadAuth();
    const before = sign(claims({ iat: now() - 60 }));
    await auth.revokeAccessTokensForAccount("acct_gone");
    const stored = [...storage.persistedValues.entries()].find(([k]) => k.startsWith("auth_revoked:"));
    expect(stored).toBeDefined();
    const [key, value] = stored!;
    // Restart: a fresh module graph, rebuilt only from the stored row.
    vi.resetModules();
    storage.hydrators.clear();
    const restarted = await loadAuth();
    storage.hydrators.get("auth_revoked")!([
      { key: key.slice("auth_revoked:".length), value },
      { key: "garbage", value: { revokedAtSeconds: "not a number" } }
    ]);
    expect(restarted.verifyAccessToken(before)).toBeNull();
    // A sweep while older tokens could still be valid KEEPS the cut-off.
    storage.deleted.length = 0;
    restarted.sweepExpiredAuth();
    expect(storage.deleted.filter((d) => d.startsWith("auth_revoked:"))).toEqual([]);
    expect(restarted.verifyAccessToken(before)).toBeNull();
    // 15 minutes and change later, nothing older than the cut-off can still be valid.
    vi.useFakeTimers({ now: Date.now() + 16 * 60 * 1000 });
    storage.deleted.length = 0;
    restarted.sweepExpiredAuth();
    expect(storage.deleted).toContain(key);
  });
});

describe("P2.6: magic links are enumeration-safe, expire, and work once", () => {
  it("an EXISTING account's email and a never-seen email are indistinguishable: same status, same body, same work", async () => {
    setEnv("RESEND_API_KEY", "re_test_key");
    const sent: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      sent.push(String(init?.body));
      return new Response("{}", { status: 200 });
    });
    const app = await loadApp();
    // Make "known" a real account: request a link and verify it from the email.
    await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: "192.0.2.1", payload: { email: "known@zeno.test" } });
    const emailed = JSON.parse(sent[0]!) as { text: string };
    const token = /token=([^\s]+)/.exec(emailed.text)![1]!;
    expect((await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: token }, remoteAddress: "192.0.2.1" })).statusCode).toBe(200);
    sent.length = 0;

    const known = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: "192.0.2.2", payload: { email: "known@zeno.test" } });
    const unknown = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: "192.0.2.3", payload: { email: "never-seen@zeno.test" } });
    expect(known.statusCode).toBe(200);
    expect(unknown.statusCode).toBe(known.statusCode);
    const strip = (b: Record<string, unknown>) => ({ ...b, meta: undefined });
    expect(strip(unknown.json())).toEqual(strip(known.json()));
    expect(known.json().data).toEqual({ delivered: true, channel: "resend", expiresInSeconds: 600 });
    // The same work for both: exactly one email each, no lookup that differs.
    expect(sent).toHaveLength(2);
  });

  it("a link and its code stop working after 10 minutes", async () => {
    const app = await loadApp();
    const { devLink, devCode } = await requestLink(app, "expiry@zeno.test");
    const now = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now + 10 * 60 * 1000 + 1000);
    const byLink = await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: tokenOf(devLink) } });
    const byCode = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link/verify", payload: { email: "expiry@zeno.test", code: devCode } });
    expect([byLink.statusCode, byCode.statusCode]).toEqual([401, 401]);
  });

  it("a link works exactly once", async () => {
    const app = await loadApp();
    const { devLink } = await requestLink(app, "once@zeno.test");
    const payload = { token: tokenOf(devLink) };
    expect((await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload })).statusCode).toBe(401);
  });
});

describe("F80: the 6-digit code has a per-address budget of wrong guesses, across every code sent", () => {
  // Each guess from its own address, as an attacker rotating IPs would (and so
  // the per-IP verify limit, 10/min, is not what stops these).
  let ip = 0;
  const guess = (app: App, email: string, code: string) =>
    app.inject({ method: "POST", url: "/api/v1/auth/magic-link/verify", remoteAddress: `198.51.100.${(ip++ % 250) + 1}`, payload: { email, code } });
  const wrongFor = (code: string) => (code === "000000" ? "000001" : "000000");
  async function wrongGuesses(app: App, email: string, code: string, n: number) {
    for (let i = 0; i < n; i += 1) expect((await guess(app, email, wrongFor(code))).statusCode).toBe(401);
  }
  const budgetRows = () => [...storage.persistedValues.entries()].filter(([k]) => k.startsWith("auth_code_fail:"));

  it("a fresh code does not refill it: 9 wrong guesses leave the right code working, the 10th spends it, and then even the RIGHT code is refused; the link still works", async () => {
    const app = await loadApp();
    const email = "target@zeno.test";
    const a = await requestLink(app, email);
    await wrongGuesses(app, email, a.devCode, 5); // code A is gone (its own 5-guess cap)
    const b = await requestLink(app, email);
    await wrongGuesses(app, email, b.devCode, 4); // 9 wrong for this address so far
    expect((await guess(app, email, b.devCode)).statusCode).toBe(200);
    const c = await requestLink(app, email);
    await wrongGuesses(app, email, c.devCode, 1); // the 10th: budget spent
    const refused = await guess(app, email, c.devCode);
    expect(refused.statusCode).toBe(401);
    expect(refused.json().error.message).toBe("Invalid or expired magic link code.");
    // The link is a 256-bit token, not guessable: the code budget does not touch it.
    expect((await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: tokenOf(c.devLink) } })).statusCode).toBe(200);
    // Another address is unaffected.
    const other = await requestLink(app, "bystander@zeno.test");
    expect((await guess(app, "bystander@zeno.test", other.devCode)).statusCode).toBe(200);
  });

  it("the budget is persisted, keyed by a hash of the address (holding a count, a window end and the account id), and survives a restart", async () => {
    const email = "restart@zeno.test";
    const first = await loadApp();
    for (let round = 0; round < 2; round += 1) {
      const { devCode } = await requestLink(first, email);
      await wrongGuesses(first, email, devCode, 5);
    }
    const rows = budgetRows();
    expect(rows).toHaveLength(1);
    const [key, value] = rows[0]!;
    expect(key).toMatch(/^auth_code_fail:[0-9a-f]{64}$/);
    expect(key).not.toContain("restart");
    expect(Object.keys(value as object).sort()).toEqual(["accountId", "count", "reset"]);
    expect(value).toMatchObject({ count: 10 });

    // A restart (the free tier spins down when idle) must not refill it.
    vi.resetModules();
    storage.hydrators.clear();
    const second = await loadApp();
    const expiredKey = createHash("sha256").update("expired@zeno.test").digest("hex");
    storage.hydrators.get("auth_code_fail")!([
      { key: key.slice("auth_code_fail:".length), value },
      { key: expiredKey, value: { accountId: "acct_x", count: 10, reset: Date.now() - 1 } }
    ]);
    const after = await requestLink(second, email);
    expect((await guess(second, email, after.devCode)).statusCode).toBe(401);
    // A spent budget whose window already ended is not brought back, and its
    // row is deleted (F81).
    expect(storage.deleted).toContain(`auth_code_fail:${expiredKey}`);
    const expired = await requestLink(second, "expired@zeno.test");
    expect((await guess(second, "expired@zeno.test", expired.devCode)).statusCode).toBe(200);
  });

  it("it refills after 24 hours (even before a sweep: a new window starts at 1), and the sweep reclaims the row once its window ends", async () => {
    const app = await loadApp();
    const { sweepExpiredAuth } = await loadAuth();
    const email = "window@zeno.test";
    for (let round = 0; round < 2; round += 1) {
      const { devCode } = await requestLink(app, email);
      await wrongGuesses(app, email, devCode, 5);
    }
    const [key] = budgetRows()[0]!;
    const start = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(start + 23 * 60 * 60 * 1000);
    storage.deleted.length = 0;
    sweepExpiredAuth();
    expect(storage.deleted).not.toContain(key);
    const early = await requestLink(app, email);
    expect((await guess(app, email, early.devCode)).statusCode).toBe(401);

    // Window over, no sweep yet: the spent budget no longer counts, and the
    // next wrong guess opens a NEW window at 1 (not 11).
    vi.setSystemTime(start + 24 * 60 * 60 * 1000 + 1000);
    const later = await requestLink(app, email);
    await wrongGuesses(app, email, later.devCode, 1);
    expect(storage.persistedValues.get(key)).toMatchObject({ count: 1 });
    expect((await guess(app, email, later.devCode)).statusCode).toBe(200);

    sweepExpiredAuth(); // the new window is still open: kept
    expect(storage.deleted).not.toContain(key);
    vi.setSystemTime(start + 48 * 60 * 60 * 1000 + 2000);
    sweepExpiredAuth();
    expect(storage.deleted).toContain(key);
  });

  it("deleting the account removes its budget (memory and database), like every other auth record", async () => {
    const app = await loadApp();
    const { revokeAllSessionsForAccount } = await loadAuth();
    const email = "leaving@zeno.test";
    for (let round = 0; round < 2; round += 1) {
      const { devCode } = await requestLink(app, email);
      await wrongGuesses(app, email, devCode, 5);
    }
    const accountId = (budgetRows()[0]![1] as { accountId: string }).accountId;
    // Another address's budget, part-spent (5 of 10), must survive this deletion.
    const bystander = "stays@zeno.test";
    const s1 = await requestLink(app, bystander, "203.0.113.1");
    await wrongGuesses(app, bystander, s1.devCode, 5);
    storage.deleted.length = 0;
    expect(await revokeAllSessionsForAccount(accountId)).toBe(true);
    expect(storage.deleted).toContain(`auth_code_fail:accountId=${accountId}`);
    const fresh = await requestLink(app, email);
    expect((await guess(app, email, fresh.devCode)).statusCode).toBe(200);
    // The bystander's 5 still count: 5 more spend the budget.
    const s2 = await requestLink(app, bystander, "203.0.113.1");
    await wrongGuesses(app, bystander, s2.devCode, 5);
    const s3 = await requestLink(app, bystander, "203.0.113.1");
    expect((await guess(app, bystander, s3.devCode)).statusCode).toBe(401);
  });
});

describe("email delivery through Resend", () => {
  it("sends one email to the address with the link HTML-escaped, and never returns the code or link", async () => {
    setEnv("RESEND_API_KEY", "re_test_key");
    setEnv("RESEND_FROM_EMAIL", "Zeno <login@example.test>");
    setEnv("MAGIC_LINK_REDIRECT_URL", 'https://zeno.app/verify?a=1&b="2"<x>');
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const app = await loadApp();
    const r = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email: "Reader@Example.test" } });
    expect(r.statusCode).toBe(200);
    expect(r.json().data).toEqual({ delivered: true, channel: "resend", expiresInSeconds: 600 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({ from: "Zeno <login@example.test>", to: ["reader@example.test"], subject: "Sign in to Zeno" });
    expect(body.html).toContain('href="https://zeno.app/verify?a=1&amp;b=&quot;2&quot;&lt;x&gt;?token=');
    expect(body.html).not.toContain('"2"<x>');
    expect(body.text).toMatch(/Code: \d{6}/);
  });

  it("a Resend failure is a generic 502, and the log never names the recipient", async () => {
    setEnv("RESEND_API_KEY", "re_test_key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = await loadApp();
    const r = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email: "private@example.test" } });
    expect(r.statusCode).toBe(502);
    expect(r.json().error).toEqual({ code: "UPSTREAM_ERROR", message: "Could not send the sign-in email right now. Please try again shortly." });
    expect(JSON.stringify(consoleError.mock.calls)).toContain("Resend failed with HTTP 500");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("private@example.test");
  });

  it("production without RESEND_API_KEY refuses to 'send' (502), and never returns a dev code", async () => {
    setEnv("RESEND_API_KEY", undefined);
    const app = await loadApp();
    vi.spyOn(console, "error").mockImplementation(() => {});
    setEnv("NODE_ENV", "production"); // read per request
    const r = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email: "prod@example.test" } });
    expect(r.statusCode).toBe(502);
    expect(r.body).not.toContain("devCode");
  });
});

describe("demo login", () => {
  it("off without a password, when disabled, and always in production", async () => {
    setEnv("DEMO_LOGIN_PASSWORD", undefined);
    const app = await loadApp();
    const post = (payload: object) => app.inject({ method: "POST", url: "/api/v1/auth/demo-login", payload });
    const creds = { email: "demo@zeno.local", password: "correct-horse" };
    expect((await post(creds)).statusCode).toBe(404);
    setEnv("DEMO_LOGIN_PASSWORD", "correct-horse");
    setEnv("DEMO_LOGIN_ENABLED", "false");
    expect((await post(creds)).statusCode).toBe(404);
    setEnv("DEMO_LOGIN_ENABLED", undefined);
    setEnv("NODE_ENV", "production");
    expect((await post(creds)).statusCode).toBe(404);
  });

  it("wrong credentials 401 (email or password), right ones sign in (a fresh app: the route allows 5/min)", async () => {
    setEnv("DEMO_LOGIN_PASSWORD", "correct-horse");
    const app = await loadApp();
    const post = (payload: object) => app.inject({ method: "POST", url: "/api/v1/auth/demo-login", payload });
    const creds = { email: "demo@zeno.local", password: "correct-horse" };
    expect((await post({ email: "demo@zeno.local", password: "short" })).statusCode).toBe(400);
    expect((await post({ ...creds, password: "wrong-password" })).statusCode).toBe(401);
    expect((await post({ ...creds, email: "other@zeno.local" })).statusCode).toBe(401);
    const ok = await post({ ...creds, email: "DEMO@Zeno.Local" }); // normalized before comparing
    expect(ok.statusCode).toBe(200);
    expect(ok.json().data.accountId).toMatch(/^acct_/);
  });
});

describe("request validation and the legacy routes", () => {
  it("each route rejects a malformed body with 400", async () => {
    const app = await loadApp();
    const bad = async (url: string, payload: object) => (await app.inject({ method: "POST", url, payload })).statusCode;
    expect(await bad("/api/v1/auth/magic-link/request", { email: "nope" })).toBe(400);
    expect(await bad("/api/v1/auth/magic-link/verify", { email: "a@x.com" })).toBe(400);
    expect(await bad("/api/v1/auth/google", {})).toBe(400);
    const verify = await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: {} });
    expect(verify.statusCode).toBe(400);
  });

  it("the legacy request route sends a link; an unknown token is 401", async () => {
    const app = await loadApp();
    const sent = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link/request", payload: { email: "legacy2@zeno.test" } });
    expect(sent.json().data.channel).toBe("dev_log");
    const unknown = await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: "u".repeat(43) } });
    expect(unknown.statusCode).toBe(401);
  });

  it("logout with no body is fine", async () => {
    const app = await loadApp();
    const r = await app.inject({ method: "POST", url: "/api/v1/auth/logout" });
    expect(r.json().data).toEqual({ loggedOut: true });
  });
});

describe("ALLOW_UNVERIFIED_OAUTH_TOKENS (development only)", () => {
  beforeEach(() => {
    for (const k of ["APPLE_CLIENT_ID", "APPLE_BUNDLE_ID", "GOOGLE_EXPO_CLIENT_ID", "GOOGLE_WEB_CLIENT_ID", "GOOGLE_IOS_CLIENT_ID", "GOOGLE_ANDROID_CLIENT_ID"]) setEnv(k, undefined);
  });
  const nonce = "n".repeat(16);

  it("in development, with no audiences configured, an unverified Apple / Google token is accepted as its own subject", async () => {
    setEnv("ALLOW_UNVERIFIED_OAUTH_TOKENS", "true");
    const app = await loadApp();
    const apple = await app.inject({ method: "POST", url: "/api/v1/auth/apple", payload: { identityToken: "apple-dev-token", nonce } });
    expect(apple.statusCode).toBe(200);
    expect(apple.json().data.accountId).toMatch(/^acct_apple_/);
    const google = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "google-dev-token", nonce } });
    expect(google.json().data.accountId).toMatch(/^acct_google_/);
    const byAccessToken = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { accessToken: "google-access-token" } });
    expect(byAccessToken.statusCode).toBe(200);
  });

  it("in production without the flag: refused, and no flag warning", async () => {
    setEnv("ALLOW_UNVERIFIED_OAUTH_TOKENS", undefined);
    const app = await loadApp();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setEnv("NODE_ENV", "production");
    const apple = await app.inject({ method: "POST", url: "/api/v1/auth/apple", payload: { identityToken: "apple-dev-token", nonce } });
    expect(apple.statusCode).toBe(401);
    expect(warn).not.toHaveBeenCalledWith("ALLOW_UNVERIFIED_OAUTH_TOKENS is ignored in production; real token verification is required.");
  });

  it("in production the flag is ignored with a warning: both routes refuse", async () => {
    setEnv("ALLOW_UNVERIFIED_OAUTH_TOKENS", "true");
    const app = await loadApp();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setEnv("NODE_ENV", "production");
    const apple = await app.inject({ method: "POST", url: "/api/v1/auth/apple", payload: { identityToken: "apple-dev-token", nonce } });
    const google = await app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: "google-dev-token", nonce } });
    expect([apple.statusCode, google.statusCode]).toEqual([401, 401]);
    expect(warn).toHaveBeenCalledWith("ALLOW_UNVERIFIED_OAUTH_TOKENS is ignored in production; real token verification is required.");
  });
});

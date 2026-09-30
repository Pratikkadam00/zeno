import { createSign, generateKeyPairSync } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P2.7: every call the API makes to another host.
 *  1. The INVENTORY: a scan of apps/api/src finds every outbound call site. Each
 *     one must be listed below; a new one fails this test until it is reviewed
 *     (its host, what reaches its URL, its deadline) and added.
 *  2. Each call site, run with fetch faked (no real network, and no Plaid or
 *     sandbox call): it reaches only its expected host and carries a deadline
 *     signal. The only request-derived part of any URL is the RevenueCat
 *     account id, and it can only ever be one path segment.
 *  3. What this found: F82 (the 5xx alert had no deadline and no bound), F83
 *     (any caller could force a JWKS re-fetch per request), F84 (one coach
 *     request could run for minutes after the app had given up).
 */
const SRC = fileURLToPath(new URL(".", import.meta.url));

type Callee = "fetch" | "fetchWithTimeout" | "new Anthropic" | "new Redis" | "new Pool";
const PATTERNS: Record<Callee, RegExp> = {
  fetch: /\bfetch\(/g,
  fetchWithTimeout: /(?<!function )\bfetchWithTimeout\(/g,
  "new Anthropic": /\bnew Anthropic\(/g,
  "new Redis": /\bnew Redis\(/g,
  "new Pool": /\bnew Pool\(/g
};
// Every outbound call site, by file, and what each one reaches.
const INVENTORY: Record<string, Partial<Record<Callee, number>>> = {
  "http.ts": { fetch: 1 }, // fetchWithTimeout itself: the ONLY direct fetch
  "app.ts": { fetchWithTimeout: 1, "new Redis": 1 }, // the 5xx alert (the operator's MONITORING_WEBHOOK_URL); the rate-limit store (REDIS_URL)
  "billing.ts": { fetchWithTimeout: 1 }, // RevenueCat
  "coach.ts": { fetchWithTimeout: 1, "new Anthropic": 1 }, // Groq / OpenAI-compatible (the operator's COACH_BASE_URL); Anthropic
  "plaid.ts": { fetchWithTimeout: 1 }, // Plaid (host fixed by PLAID_ENV)
  "routes/auth.ts": { fetchWithTimeout: 2 }, // Resend; the Apple / Google JWKS
  "storage/pg.ts": { "new Pool": 1 } // Postgres (DATABASE_URL)
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".ts") && !/\.(test|testutil)\.ts$/.test(entry.name) ? [path] : [];
  });
}
function scan(): Record<string, Partial<Record<Callee, number>>> {
  const found: Record<string, Partial<Record<Callee, number>>> = {};
  for (const file of sourceFiles(SRC)) {
    // Comment lines are prose, not calls.
    const code = readFileSync(file, "utf8").split("\n").filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join("\n");
    for (const [callee, pattern] of Object.entries(PATTERNS) as [Callee, RegExp][]) {
      const n = code.match(pattern)?.length ?? 0;
      if (n > 0) (found[relative(SRC, file).split("\\").join("/")] ??= {})[callee] = n;
    }
  }
  return found;
}

const ENV_KEYS = [
  "RESEND_API_KEY", "APPLE_CLIENT_ID", "APPLE_BUNDLE_ID", "GOOGLE_EXPO_CLIENT_ID", "GOOGLE_WEB_CLIENT_ID", "GOOGLE_IOS_CLIENT_ID",
  "GOOGLE_ANDROID_CLIENT_ID", "REVENUECAT_SECRET_KEY", "PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV", "COACH_PROVIDER", "GROQ_API_KEY",
  "ANTHROPIC_API_KEY", "COACH_BASE_URL", "AI_COACH_MODEL", "MONITORING_WEBHOOK_URL", "ALLOW_UNVERIFIED_OAUTH_TOKENS", "DATABASE_URL"
] as const;
const saved: Record<string, string | undefined> = {};

type Call = { url: string; init: RequestInit | undefined };
let calls: Call[] = [];
let respond: (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

const ANTHROPIC_REPLY = {
  id: "msg_1", type: "message", role: "assistant", model: "claude-opus-4-8", stop_reason: "end_turn", stop_sequence: null,
  content: [{ type: "text", text: JSON.stringify({ outOfScope: false, summary: "ok", recommendations: [] }) }],
  usage: { input_tokens: 1, output_tokens: 1 }
};
// What each real host answers, faked. Nothing leaves the machine.
function defaultReply(url: string): Response {
  const { host } = new URL(url);
  if (host === "appleid.apple.com" || host === "www.googleapis.com") return Response.json({ keys: [] });
  if (host === "api.revenuecat.com") return Response.json({ subscriber: { entitlements: {} } });
  if (host.endsWith("plaid.com")) return Response.json({ link_token: "link-sandbox-1", expiration: "2026-10-01T00:00:00Z" });
  if (host === "api.groq.com") return Response.json({ choices: [{ message: { content: JSON.stringify({ outOfScope: false, summary: "ok", recommendations: [] }) } }] });
  if (host === "api.anthropic.com") return Response.json(ANTHROPIC_REPLY);
  return Response.json({});
}

beforeEach(() => {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  calls = [];
  respond = defaultReply;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push({ url, init });
    return respond(url, init);
  });
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function loadApp() {
  const { buildApp } = await import("./app");
  return buildApp();
}
type App = Awaited<ReturnType<typeof loadApp>>;
const ip = (n: number) => `192.0.2.${n}`;

/** A session through the dev magic link (RESEND_API_KEY unset, so no email is sent). */
async function signIn(app: App, email: string) {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: ip(200), payload: { email } });
  const raw = decodeURIComponent(String(requested.json().data.devLink).split("token=")[1]!);
  const verified = await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}`, remoteAddress: ip(200) });
  return { authorization: `Bearer ${verified.json().data.accessToken as string}` };
}

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
const RAW_NONCE = "n".repeat(32);
const tokenWithKid = (kid: string) => `${b64({ alg: "RS256", typ: "JWT", kid })}.${b64({ sub: "x" })}.${"s".repeat(16)}`;
const COACH_BODY = { totalMonthlyMinor: 2500, currency: "CAD", subscriptions: [{ name: "Netflix", category: "entertainment", monthlyMinor: 2500, billingCycle: "monthly" }], question: "What can I cut?" };

describe("P2.7 the outbound-call inventory", () => {
  it("every outbound call site in the API is listed (a new one fails here until it is reviewed)", () => {
    expect(scan()).toEqual(INVENTORY);
  });

  it("every HTTP call goes through fetchWithTimeout: the only direct fetch is the helper itself", () => {
    expect(Object.entries(scan()).filter(([, found]) => found.fetch).map(([file]) => file)).toEqual(["http.ts"]);
  });
});

type Case = { name: string; env: Record<string, string>; host: string; run: (app: App) => Promise<unknown> };
const CASES: Case[] = [
  {
    name: "Resend (the magic-link email)", env: { RESEND_API_KEY: "re_test" }, host: "api.resend.com",
    run: (app) => app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email: "out@zeno.test" } })
  },
  {
    name: "Apple's signing keys", env: { APPLE_CLIENT_ID: "com.zeno.test" }, host: "appleid.apple.com",
    run: (app) => app.inject({ method: "POST", url: "/api/v1/auth/apple", payload: { identityToken: tokenWithKid("k"), nonce: RAW_NONCE } })
  },
  {
    name: "Google's signing keys", env: { GOOGLE_WEB_CLIENT_ID: "web.zeno.test" }, host: "www.googleapis.com",
    run: (app) => app.inject({ method: "POST", url: "/api/v1/auth/google", payload: { idToken: tokenWithKid("k"), nonce: RAW_NONCE } })
  },
  {
    name: "RevenueCat", env: { REVENUECAT_SECRET_KEY: "sk_test" }, host: "api.revenuecat.com",
    run: async (app) => app.inject({ method: "GET", url: "/api/v1/billing/entitlement", headers: await signIn(app, "rc@zeno.test") })
  },
  {
    name: "Plaid (faked: no Plaid or sandbox call)", env: { PLAID_CLIENT_ID: "client", PLAID_SECRET: "secret" }, host: "sandbox.plaid.com",
    run: async (app) => app.inject({ method: "POST", url: "/api/v1/plaid/link-token", headers: await signIn(app, "plaid@zeno.test") })
  },
  {
    name: "Groq (the coach)", env: { COACH_PROVIDER: "groq", GROQ_API_KEY: "gsk_test" }, host: "api.groq.com",
    run: async (app) => app.inject({ method: "POST", url: "/api/v1/coach", headers: await signIn(app, "groq@zeno.test"), payload: COACH_BODY })
  },
  {
    name: "Anthropic (the coach, through the real SDK)", env: { COACH_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-ant-test" }, host: "api.anthropic.com",
    run: async (app) => app.inject({ method: "POST", url: "/api/v1/coach", headers: await signIn(app, "claude@zeno.test"), payload: COACH_BODY })
  },
  {
    name: "the 5xx alert (the operator's collector)", env: { MONITORING_WEBHOOK_URL: "https://alerts.example.test/hook" }, host: "alerts.example.test",
    run: (app) => app.inject({ method: "GET", url: "/api/v1/capabilities" })
  }
];

describe("P2.7 each call site reaches only its own host, with a deadline", () => {
  for (const c of CASES) {
    it(c.name, async () => {
      Object.assign(process.env, c.env);
      const app = await loadApp();
      // A server error to alert about (registered before the first request).
      app.addHook("preHandler", async (request) => {
        if (request.url.startsWith("/api/v1/capabilities")) throw new Error("kaput");
      });
      await c.run(app);
      expect(calls.length, "the call was made").toBeGreaterThan(0);
      for (const call of calls) {
        expect(new URL(call.url).protocol).toBe("https:");
        expect(new URL(call.url).host).toBe(c.host);
        expect(call.init?.signal, `${call.url} has a deadline`).toBeInstanceOf(AbortSignal);
      }
    });
  }

  it("RevenueCat: the account id is the only request-derived part of any outbound URL, and it is only ever ONE path segment", async () => {
    process.env.REVENUECAT_SECRET_KEY = "sk_test";
    const { fetchEntitlement } = await import("./billing");
    const prefix = "/v1/subscribers/";
    await fc.assert(fc.asyncProperty(fc.oneof(fc.string(), fc.stringMatching(/^[A-Za-z0-9_.%/-]{0,12}$/)), async (id) => {
      calls = [];
      const outcome = await fetchEntitlement(id).then(() => "fetched", () => "refused");
      if (calls.length === 0) {
        expect(outcome).toBe("refused");
        return;
      }
      const url = new URL(calls[0]!.url);
      expect(url.host).toBe("api.revenuecat.com");
      expect(url.pathname.startsWith(prefix)).toBe(true);
      expect(decodeURIComponent(url.pathname.slice(prefix.length))).toBe(id);
    }), { numRuns: 300 });
    // The ids a URL parser would resolve AWAY from /subscribers/: refused before any call.
    for (const id of ["..", ".", "%2e%2e", "%2E.", "../x", "a/b", ""]) {
      calls = [];
      await expect(fetchEntitlement(id), id).rejects.toThrow("Refusing an unexpected account id.");
      expect(calls, id).toEqual([]);
    }
  });
});

describe("F82: the 5xx alert is bounded like every other outbound call", () => {
  async function failingApp() {
    process.env.MONITORING_WEBHOOK_URL = "https://alerts.example.test/hook";
    const app = await loadApp();
    app.addHook("preHandler", async (request) => {
      if (request.url.startsWith("/api/v1/capabilities")) throw new Error("kaput");
    });
    return app;
  }

  it("each alert has a 3-second deadline", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const app = await failingApp();
    expect((await app.inject({ method: "GET", url: "/api/v1/capabilities" })).statusCode).toBe(500);
    expect(calls).toHaveLength(1);
    expect(timeout).toHaveBeenCalledWith(3000);
    expect(calls[0]!.init?.signal).toBe(timeout.mock.results.at(-1)!.value);
  });

  it("a hung collector holds at most 5 alerts at once; the rest are dropped, and alerts resume once those settle", async () => {
    const hung: Array<() => void> = [];
    respond = () => new Promise<Response>((resolve) => hung.push(() => resolve(Response.json({}))));
    const app = await failingApp();
    for (let i = 1; i <= 8; i += 1) {
      expect((await app.inject({ method: "GET", url: "/api/v1/capabilities", remoteAddress: ip(i) })).statusCode).toBe(500);
    }
    expect(calls).toHaveLength(5);
    for (const settle of hung) settle();
    await new Promise((resolve) => setImmediate(resolve));
    respond = () => Response.json({});
    await app.inject({ method: "GET", url: "/api/v1/capabilities", remoteAddress: ip(9) });
    expect(calls).toHaveLength(6);
  });
});

describe("F83: a token with an unknown key id cannot make the API re-fetch Apple's or Google's keys on every request", () => {
  const google = (app: App, idToken: string, n: number) =>
    app.inject({ method: "POST", url: "/api/v1/auth/google", remoteAddress: ip(n), payload: { idToken, nonce: RAW_NONCE } });

  it("unknown key ids: one fetch, then no forced refresh for 30 s; after 30 s, one refresh is allowed", async () => {
    process.env.GOOGLE_WEB_CLIENT_ID = "web.zeno.test";
    const app = await loadApp();
    const start = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(start);
    for (let i = 1; i <= 5; i += 1) expect((await google(app, tokenWithKid(`random-${i}`), i)).statusCode).toBe(401);
    expect(calls).toHaveLength(1);
    vi.setSystemTime(start + 29_999);
    await google(app, tokenWithKid("random-6"), 6);
    expect(calls).toHaveLength(1);
    vi.setSystemTime(start + 30_000);
    await google(app, tokenWithKid("random-7"), 7);
    expect(calls).toHaveLength(2);
    await google(app, tokenWithKid("random-8"), 8);
    expect(calls).toHaveLength(2);
  });

  it("key rotation still works: a token signed with a NEW key signs in once the cached set is 30 s old", async () => {
    process.env.GOOGLE_WEB_CLIENT_ID = "web.zeno.test";
    const { nonceHash } = await import("./routes/auth");
    const oldKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const newKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwk = (key: typeof oldKey, kid: string) => ({ ...key.publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" });
    let published = [jwk(oldKey, "old")];
    respond = () => Response.json({ keys: published });
    const start = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(start);
    const app = await loadApp();
    const now = Math.floor(start / 1000);
    const head = b64({ alg: "RS256", typ: "JWT", kid: "new" });
    const body = b64({ iss: "https://accounts.google.com", aud: "web.zeno.test", sub: "google-user-1", iat: now, exp: now + 3600, nonce: nonceHash(RAW_NONCE) });
    const signer = createSign("RSA-SHA256");
    signer.update(`${head}.${body}`);
    const signed = `${head}.${body}.${signer.sign(newKey.privateKey, "base64url")}`;

    expect((await google(app, signed, 1)).statusCode).toBe(401); // "new" is not published yet
    published = [jwk(oldKey, "old"), jwk(newKey, "new")]; // Google rotates
    vi.setSystemTime(start + 30_000);
    const after = await google(app, signed, 2);
    expect(after.statusCode).toBe(200);
    expect(after.json().data.accountId).toMatch(/^acct_google_/);
    expect(calls).toHaveLength(2);
  });

  it("a malformed key set (a 200 without a keys list) is not cached: the next sign-in fetches again", async () => {
    process.env.GOOGLE_WEB_CLIENT_ID = "web.zeno.test";
    respond = () => Response.json({ unexpected: true });
    const app = await loadApp();
    expect((await google(app, tokenWithKid("k"), 1)).statusCode).toBe(401);
    expect((await google(app, tokenWithKid("k"), 2)).statusCode).toBe(401);
    expect(calls).toHaveLength(2);
  });
});

describe("F84: the coach answers within 30 s, however slow the provider (the app waits 35 s)", () => {
  const INPUT = { totalMonthlyMinor: 2500, currency: "CAD", subscriptions: [{ name: "Netflix", category: "entertainment", monthlyMinor: 2500, billingCycle: "monthly" as const }] };
  const DEADLINE = "AI provider did not answer within 30 s.";
  const settledOrPending = (p: Promise<string>) => Promise.race([p, Promise.resolve("pending")]);

  it("Anthropic (the real SDK): a 429 asking to retry in 59 s ends at the 30 s deadline, and no second attempt is ever sent", async () => {
    process.env.COACH_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    respond = () => new Response(JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "slow down" } }), {
      status: 429, headers: { "content-type": "application/json", "retry-after": "59" }
    });
    const { generateCoaching } = await import("./coach");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const outcome = generateCoaching(INPUT).then(() => "answered", (error: Error) => error.message);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(await settledOrPending(outcome)).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(await settledOrPending(outcome)).toBe(DEADLINE);
    expect(calls).toHaveLength(1);
    // Long after: the SDK's own retry wakes up, sees the aborted signal, and sends nothing.
    await vi.advanceTimersByTimeAsync(180_000);
    expect(calls).toHaveLength(1);
  });

  it("Groq: a provider that never answers is cut off at 30 s, and its request is aborted", async () => {
    process.env.COACH_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "gsk_test";
    respond = (_url, init) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    const { generateCoaching } = await import("./coach");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const outcome = generateCoaching(INPUT).then(() => "answered", (error: Error) => error.message);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await settledOrPending(outcome)).toBe(DEADLINE);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.init?.signal?.aborted).toBe(true);
  });

  it("a provider that answers in time is unaffected, and the timer does not outlive the call", async () => {
    process.env.COACH_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "gsk_test";
    const { generateCoaching } = await import("./coach");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const result = await generateCoaching(INPUT);
    expect(result).toMatchObject({ source: "ai", provider: "groq", summary: "ok" });
    expect(vi.getTimerCount()).toBe(0);
  });
});

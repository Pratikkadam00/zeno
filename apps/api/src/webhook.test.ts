import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P2.8: the RevenueCat webhook, end to end, with RevenueCat's REST API faked
 * (a per-user "truth" the fake answers from; nothing leaves the machine).
 *
 * RevenueCat retries a failed delivery up to 5 times over about 2.5 hours, may
 * deliver an event twice, and recommends calling GET /subscribers after any
 * webhook (https://www.revenuecat.com/docs/integrations/webhooks). Its
 * Authorization header is a static secret, not a signature over the body. So:
 *  - F85: a webhook's payload is never trusted, and arrival order does not
 *    matter: the entitlement is always RevenueCat's own answer;
 *  - F86: the secret compare is constant-time whatever the length;
 *  - F87: a lookup already in flight cannot put an older answer back after a
 *    webhook or an account deletion dropped it.
 */
const spy = vi.hoisted(() => ({ compares: [] as Array<[number, number]>, refuseDelete: false }));
vi.mock("node:crypto", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:crypto")>();
  return {
    ...real,
    timingSafeEqual: (a: NodeJS.ArrayBufferView, b: NodeJS.ArrayBufferView) => {
      spy.compares.push([a.byteLength, b.byteLength]);
      return real.timingSafeEqual(a, b);
    }
  };
});
vi.mock("./storage/pg", async (importOriginal) => {
  const real = await importOriginal<typeof import("./storage/pg")>();
  return { ...real, kvDeleteAwait: async (namespace: string, key: string) => (spy.refuseDelete ? false : real.kvDeleteAwait(namespace, key)) };
});

type Entitlements = Record<string, { expires_date: string | null }>;
const ENV_KEYS = ["REVENUECAT_SECRET_KEY", "REVENUECAT_WEBHOOK_AUTH", "DATABASE_URL"] as const;
const saved: Record<string, string | undefined> = {};
/** RevenueCat's own record, per app user id: what GET /subscribers answers. */
let truth: Record<string, Entitlements> = {};
let lookups: string[] = [];
/** While set, a lookup's answer (taken when it was ASKED) is held until it resolves. */
let hold: Promise<void> | null = null;

const inAMonth = () => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
const PRO = () => ({ pro: { expires_date: inAMonth() } });
const FAMILY = () => ({ family: { expires_date: inAMonth() } });

beforeEach(() => {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  process.env.REVENUECAT_SECRET_KEY = "rc-secret";
  process.env.REVENUECAT_WEBHOOK_AUTH = "hook-secret";
  truth = {};
  lookups = [];
  hold = null;
  spy.compares.length = 0;
  spy.refuseDelete = false;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const prefix = "https://api.revenuecat.com/v1/subscribers/";
    if (!url.startsWith(prefix)) throw new Error(`unexpected outbound request to ${url}`);
    const id = decodeURIComponent(url.slice(prefix.length));
    lookups.push(id);
    const answer = truth[id] ?? {};
    if (hold) await hold;
    return Response.json({ subscriber: { entitlements: answer } });
  });
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.restoreAllMocks();
});

let n = 0;
const nextIp = () => {
  n += 1;
  return `10.8.${Math.floor(n / 250) % 250}.${(n % 250) + 1}`;
};
async function boot() {
  const { buildApp } = await import("./app");
  const billing = await import("./billing");
  return { app: await buildApp(), billing };
}
type Booted = Awaited<ReturnType<typeof boot>>;
async function signIn({ app }: Booted, email: string) {
  const ip = nextIp();
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: ip, payload: { email } });
  const raw = decodeURIComponent(String(requested.json().data.devLink).split("token=")[1]!);
  const data = (await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}`, remoteAddress: ip })).json().data;
  return { accountId: data.accountId as string, headers: { authorization: `Bearer ${data.accessToken as string}` } };
}
const plan = async ({ app }: Booted, headers: Record<string, string>) =>
  (await app.inject({ method: "GET", url: "/api/v1/billing/entitlement", remoteAddress: nextIp(), headers })).json().data.plan as string;
const webhook = ({ app }: Booted, event: Record<string, unknown>, authorization = "Bearer hook-secret") =>
  app.inject({ method: "POST", url: "/api/v1/billing/webhook", remoteAddress: nextIp(), headers: { authorization }, payload: { event } });

describe("F85: a webhook's payload is never trusted; the entitlement is always RevenueCat's answer", () => {
  it("an authenticated webhook claiming Pro for someone RevenueCat has as free grants nothing", async () => {
    const booted = await boot();
    const user = await signIn(booted, "claims@zeno.test");
    const forged = await webhook(booted, { id: "evt-1", app_user_id: user.accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"], event_timestamp_ms: Date.now() });
    expect(forged.statusCode).toBe(200);
    expect(await plan(booted, user.headers)).toBe("free");
  });

  it("a late retry of an OLDER event does not overwrite newer state", async () => {
    const booted = await boot();
    const user = await signIn(booted, "retry@zeno.test");
    expect(await plan(booted, user.headers)).toBe("free");
    truth[user.accountId] = PRO(); // the user buys Pro
    const now = Date.now();
    await webhook(booted, { id: "evt-new", app_user_id: user.accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"], event_timestamp_ms: now });
    // RevenueCat retries an old EXPIRATION (from a previous subscription) 80 minutes late.
    await webhook(booted, { id: "evt-old", app_user_id: user.accountId, type: "EXPIRATION", entitlement_ids: ["pro"], event_timestamp_ms: now - 80 * 60_000 });
    expect(await plan(booted, user.headers)).toBe("pro");
  });

  it("a webhook makes the change visible at once: the next read asks RevenueCat instead of serving the 10-minute cache", async () => {
    const booted = await boot();
    const user = await signIn(booted, "fresh@zeno.test");
    expect(await plan(booted, user.headers)).toBe("free");
    expect(await plan(booted, user.headers)).toBe("free");
    expect(lookups).toEqual([user.accountId]); // the second read was the cache
    truth[user.accountId] = FAMILY();
    await webhook(booted, { app_user_id: user.accountId, type: "PRODUCT_CHANGE", entitlement_ids: ["pro"] });
    expect(await plan(booted, user.headers)).toBe("family");
    expect(lookups).toEqual([user.accountId, user.accountId]);
  });

  it("duplicates, any order, any claims: after any run of webhooks, a read is RevenueCat's answer", async () => {
    const booted = await boot();
    const { billing } = booted;
    const TYPES = ["INITIAL_PURCHASE", "RENEWAL", "CANCELLATION", "UNCANCELLATION", "EXPIRATION", "PRODUCT_CHANGE", "SUBSCRIPTION_PAUSED", "BILLING_ISSUE", "TRANSFER"];
    const event = fc.record({
      id: fc.constantFrom("evt-a", "evt-b", "evt-c"),
      type: fc.constantFrom(...TYPES),
      entitlement_ids: fc.subarray(["pro", "family", "zeno_pro", "zeno_family", "premium"]),
      expiration_at_ms: fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 4_000_000_000_000 })),
      event_timestamp_ms: fc.integer({ min: 0, max: 4_000_000_000_000 })
    });
    let run = 0;
    await fc.assert(fc.asyncProperty(
      fc.constantFrom<"free" | "pro" | "family">("free", "pro", "family"),
      fc.constantFrom<"free" | "pro" | "family">("free", "pro", "family"),
      fc.boolean(),
      fc.array(event, { minLength: 1, maxLength: 6 }),
      async (before, after, warm, events) => {
        run += 1;
        const id = `acct_prop_${run}`;
        const as = (p: string): Entitlements => (p === "pro" ? PRO() : p === "family" ? FAMILY() : {});
        const read = async () => (billing.getCachedEntitlement(id) ?? (await billing.fetchEntitlement(id))).plan;
        truth[id] = as(before);
        if (warm) expect(await read()).toBe(before);
        truth[id] = as(after);
        for (const e of events) {
          // A duplicate delivery is the same event again.
          for (const copy of e.id === "evt-a" ? [e, e] : [e]) expect((await webhook(booted, { ...copy, app_user_id: id })).statusCode).toBe(200);
        }
        expect(await read()).toBe(after);
      }
    ), { numRuns: 60 });
  });

  it("fields RevenueCat may change (a null list, a new event type, a far-future time) never make the webhook fail: only app_user_id is read", async () => {
    const booted = await boot();
    const odd = await webhook(booted, { app_user_id: "acct_odd", type: `SOME_FUTURE_TYPE_${"X".repeat(80)}`, entitlement_ids: null, expiration_at_ms: 1e20, event_timestamp_ms: -5 });
    expect(odd.statusCode).toBe(200);
  });
});

describe("P2.8: authentication, malformed bodies, durability", () => {
  it("a wrong secret is 401 and an authenticated malformed body is 400, and neither touches the cached entitlement", async () => {
    const booted = await boot();
    const user = await signIn(booted, "untouched@zeno.test");
    expect(await plan(booted, user.headers)).toBe("free");
    truth[user.accountId] = PRO();
    expect((await webhook(booted, { app_user_id: user.accountId }, "Bearer wrong")).statusCode).toBe(401);
    for (const bad of [{}, { app_user_id: "" }, { app_user_id: 42 }, { app_user_id: "x".repeat(257) }]) {
      const res = await webhook(booted, bad);
      expect(res.statusCode, JSON.stringify(bad).slice(0, 40)).toBe(400);
      expect(res.json().error.code).toBe("BAD_REQUEST");
    }
    expect(await plan(booted, user.headers)).toBe("free"); // still the cached answer
    expect(lookups).toEqual([user.accountId]);
  });

  it("the invalidation is durable before RevenueCat hears 200: a refused database delete answers 503, so RevenueCat retries", async () => {
    const booted = await boot();
    spy.refuseDelete = true;
    const refused = await webhook(booted, { app_user_id: "acct_retry" });
    expect(refused.statusCode).toBe(503);
    expect(refused.json().error.message).toBe("Could not record the billing event. Please retry.");
    spy.refuseDelete = false;
    expect((await webhook(booted, { app_user_id: "acct_retry" })).statusCode).toBe(200);
  });
});

describe("F86: the webhook secret compare is constant-time whatever the length", () => {
  it("every guess, short, right-length or long, is one compare of two 32-byte digests", async () => {
    process.env.REVENUECAT_WEBHOOK_AUTH = "hook-secret";
    const { verifyWebhookAuth } = await import("./billing");
    for (const guess of ["x", "hook-secreX", "hook-secret", "y".repeat(500), "Bearer x", "Bearer hook-secret"]) {
      spy.compares.length = 0;
      verifyWebhookAuth(guess);
      expect(spy.compares, guess.slice(0, 20)).toEqual([[32, 32]]);
    }
    expect(verifyWebhookAuth("Bearer hook-secret")).toBe(true);
    expect(verifyWebhookAuth("hook-secret")).toBe(true);
    expect(verifyWebhookAuth("Bearer hook-secreX")).toBe(false);
  });
});

describe("F87: a lookup already in flight cannot put an older answer back", () => {
  it("after a webhook: the read that raced it is not cached, so the next read asks RevenueCat again", async () => {
    const booted = await boot();
    const user = await signIn(booted, "race@zeno.test");
    let release!: () => void;
    hold = new Promise<void>((resolve) => { release = resolve; });
    const racing = plan(booted, user.headers); // asks RevenueCat: free (held)
    await vi.waitFor(() => expect(lookups).toHaveLength(1));
    truth[user.accountId] = PRO(); // the purchase lands
    expect((await webhook(booted, { app_user_id: user.accountId, type: "INITIAL_PURCHASE" })).statusCode).toBe(200);
    hold = null;
    release();
    expect(await racing).toBe("free"); // that caller asked before the purchase
    expect(await plan(booted, user.headers)).toBe("pro");
    expect(lookups).toHaveLength(2);
  });

  it("after an account deletion: a lookup that was in flight does not re-create the deleted user's billing entry", async () => {
    const booted = await boot();
    const user = await signIn(booted, "leaving@zeno.test");
    truth[user.accountId] = PRO();
    let release!: () => void;
    hold = new Promise<void>((resolve) => { release = resolve; });
    const racing = plan(booted, user.headers);
    await vi.waitFor(() => expect(lookups).toHaveLength(1));
    const deleted = await booted.app.inject({ method: "DELETE", url: "/api/v1/account", remoteAddress: nextIp(), headers: user.headers });
    expect(deleted.json().data).toEqual({ deleted: true });
    hold = null;
    release();
    await racing;
    expect(booted.billing.getCachedEntitlement(user.accountId)).toBeUndefined();
  });

  // P6.2: Stryker turned the counter's `?? 0` into `&& 0`; the first webhook then
  // set it to NaN, which never equals itself, so that user's answers were never
  // cached again, and no test read twice after a webhook.
  it("after a webhook, the next answer is cached again: two reads, one lookup", async () => {
    const booted = await boot();
    const user = await signIn(booted, "cached-again@zeno.test");
    truth[user.accountId] = PRO();
    expect((await webhook(booted, { app_user_id: user.accountId, type: "RENEWAL" })).statusCode).toBe(200);
    expect(await plan(booted, user.headers)).toBe("pro");
    expect(await plan(booted, user.headers)).toBe("pro");
    expect(lookups).toHaveLength(1);
  });

  it("an invalidation for one user does not cut off another user's lookup", async () => {
    const booted = await boot();
    truth.acct_keep = PRO();
    let release!: () => void;
    hold = new Promise<void>((resolve) => { release = resolve; });
    const racing = booted.billing.fetchEntitlement("acct_keep");
    await vi.waitFor(() => expect(lookups).toHaveLength(1));
    await webhook(booted, { app_user_id: "acct_other" });
    hold = null;
    release();
    await racing;
    expect(booted.billing.getCachedEntitlement("acct_keep")?.plan).toBe("pro");
  });
});

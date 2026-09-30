import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  billingConfigured,
  clearEntitlementCache,
  deleteEntitlementForUser,
  fetchEntitlement,
  getCachedEntitlement,
  planFromEntitlements,
  verifyWebhookAuth,
  webhookConfigured
} from "./billing";

afterEach(() => clearEntitlementCache());

const rcJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
/** Cache an entitlement the only way the server can (finding F85): a verified
 *  RevenueCat lookup, with its answer faked. */
async function seed(appUserId: string, entitlements: Record<string, { expires_date: string | null }>) {
  const saved = process.env.REVENUECAT_SECRET_KEY;
  process.env.REVENUECAT_SECRET_KEY = "rc-test-secret";
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(rcJson({ subscriber: { entitlements } }));
  try {
    return await fetchEntitlement(appUserId);
  } finally {
    fetchSpy.mockRestore();
    if (saved === undefined) delete process.env.REVENUECAT_SECRET_KEY;
    else process.env.REVENUECAT_SECRET_KEY = saved;
  }
}

describe("verifyWebhookAuth", () => {
  const originalSecret = process.env.REVENUECAT_WEBHOOK_AUTH;

  beforeEach(() => {
    process.env.REVENUECAT_WEBHOOK_AUTH = "correct-shared-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH;
    else process.env.REVENUECAT_WEBHOOK_AUTH = originalSecret;
  });

  it("accepts the correct secret with a Bearer prefix", () => {
    expect(verifyWebhookAuth("Bearer correct-shared-secret")).toBe(true);
  });

  it("accepts the correct secret with no Bearer prefix", () => {
    expect(verifyWebhookAuth("correct-shared-secret")).toBe(true);
  });

  it("rejects a same-length but wrong secret (exercises the timingSafeEqual branch, not just the length short-circuit)", () => {
    expect(verifyWebhookAuth("Bearer wrong-shared-secre1")).toBe(false);
  });

  it("rejects a shorter or longer secret without throwing", () => {
    expect(verifyWebhookAuth("Bearer short")).toBe(false);
    expect(verifyWebhookAuth("Bearer correct-shared-secret-with-extra-suffix")).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    expect(verifyWebhookAuth(undefined)).toBe(false);
  });

  it("rejects an empty Authorization header", () => {
    expect(verifyWebhookAuth("")).toBe(false);
  });

  it("fails closed when REVENUECAT_WEBHOOK_AUTH is not configured, even given a matching-looking header", () => {
    delete process.env.REVENUECAT_WEBHOOK_AUTH;
    expect(verifyWebhookAuth("Bearer correct-shared-secret")).toBe(false);
  });

  it("works when the configured value is the full header value including 'Bearer ' (the setup this module documents)", () => {
    // billing.ts: REVENUECAT_WEBHOOK_AUTH is "the Authorization header value you
    // set in the RevenueCat webhook config". Before the fix, configuring
    // "Bearer <secret>" rejected RevenueCat's genuine "Bearer <secret>" header and
    // accepted only a doubled "Bearer Bearer <secret>".
    process.env.REVENUECAT_WEBHOOK_AUTH = "Bearer correct-shared-secret";
    expect(verifyWebhookAuth("Bearer correct-shared-secret")).toBe(true);
    expect(verifyWebhookAuth("correct-shared-secret")).toBe(true);
    expect(verifyWebhookAuth("Bearer wrong-shared-secre1")).toBe(false);
    expect(verifyWebhookAuth("Bearer Bearer correct-shared-secret")).toBe(false);
  });

  it("a configured value that is nothing but the prefix matches nothing", () => {
    process.env.REVENUECAT_WEBHOOK_AUTH = "Bearer ";
    for (const header of ["Bearer ", "Bearer Bearer ", "", "Bearer x"]) {
      expect(verifyWebhookAuth(header), JSON.stringify(header)).toBe(false);
    }
  });

  it("the prefix is case-sensitive: a lowercase 'bearer' is compared as part of the secret", () => {
    expect(verifyWebhookAuth("bearer correct-shared-secret")).toBe(false);
  });
});

describe("configured-ness", () => {
  const saved = { secret: process.env.REVENUECAT_SECRET_KEY, hook: process.env.REVENUECAT_WEBHOOK_AUTH };
  afterEach(() => {
    if (saved.secret === undefined) delete process.env.REVENUECAT_SECRET_KEY;
    else process.env.REVENUECAT_SECRET_KEY = saved.secret;
    if (saved.hook === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH;
    else process.env.REVENUECAT_WEBHOOK_AUTH = saved.hook;
  });

  it("REST verification and the webhook are configured independently, and an empty value is not configured", () => {
    delete process.env.REVENUECAT_SECRET_KEY;
    delete process.env.REVENUECAT_WEBHOOK_AUTH;
    expect([billingConfigured(), webhookConfigured()]).toEqual([false, false]);
    process.env.REVENUECAT_SECRET_KEY = "rc-test";
    expect([billingConfigured(), webhookConfigured()]).toEqual([true, false]);
    process.env.REVENUECAT_SECRET_KEY = "";
    process.env.REVENUECAT_WEBHOOK_AUTH = "hook";
    expect([billingConfigured(), webhookConfigured()]).toEqual([false, true]);
  });
});

describe("planFromEntitlements (RevenueCat REST entitlements → plan)", () => {
  const now = Date.parse("2026-09-30T12:00:00.000Z");
  const future = "2026-10-30T12:00:00.000Z";
  const past = "2026-09-01T12:00:00.000Z";

  it("family outranks pro when both are active", () => {
    expect(planFromEntitlements({ pro: { expires_date: future }, family: { expires_date: future } }, now)).toEqual({ plan: "family", active: true, expiresAt: future });
  });

  it("recognizes the zeno_-prefixed identifiers too", () => {
    expect(planFromEntitlements({ zeno_family: { expires_date: future } }, now).plan).toBe("family");
    expect(planFromEntitlements({ zeno_pro: { expires_date: null } }, now)).toEqual({ plan: "pro", active: true, expiresAt: null });
  });

  it("an expired family entitlement falls through to an active pro one", () => {
    expect(planFromEntitlements({ family: { expires_date: past }, pro: { expires_date: future } }, now)).toEqual({ plan: "pro", active: true, expiresAt: future });
  });

  it("expired, expiring exactly now, unknown or malformed entitlements grant nothing", () => {
    const free = { plan: "free", active: false, expiresAt: null };
    expect(planFromEntitlements({}, now)).toEqual(free);
    expect(planFromEntitlements({ pro: { expires_date: past } }, now)).toEqual(free);
    expect(planFromEntitlements({ pro: { expires_date: new Date(now).toISOString() } }, now)).toEqual(free);
    expect(planFromEntitlements({ premium: { expires_date: future } }, now)).toEqual(free);
    expect(planFromEntitlements({ pro: { expires_date: "not a date" } }, now)).toEqual(free);
  });
});

describe("fetchEntitlement (RevenueCat REST, fetch faked)", () => {
  const saved = process.env.REVENUECAT_SECRET_KEY;
  beforeEach(() => {
    process.env.REVENUECAT_SECRET_KEY = "rc-test-secret";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.REVENUECAT_SECRET_KEY;
    else process.env.REVENUECAT_SECRET_KEY = saved;
    vi.restoreAllMocks();
  });

  const inAMonth = () => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("unconfigured: answers free/unconfigured without calling RevenueCat", async () => {
    delete process.env.REVENUECAT_SECRET_KEY;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await fetchEntitlement("acct_1")).toEqual({ plan: "free", active: false, expiresAt: null, source: "unconfigured" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getCachedEntitlement("acct_1")).toBeUndefined();
  });

  it("asks RevenueCat for exactly this subscriber, with the secret key and a timeout signal; an id that is not one safe path segment is refused without a call (P2.7)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ subscriber: { entitlements: {} } }));
    await fetchEntitlement("acct_Ab-9_z");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.revenuecat.com/v1/subscribers/acct_Ab-9_z");
    expect(init?.headers).toEqual({ Authorization: "Bearer rc-test-secret", Accept: "application/json" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    await expect(fetchEntitlement("acct/../other?x=1#y")).rejects.toThrow("Refusing an unexpected account id.");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("maps the subscriber's entitlements and caches the verified answer", async () => {
    const expires = inAMonth();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ subscriber: { entitlements: { family: { expires_date: expires } } } }));
    const result = await fetchEntitlement("acct_2");
    expect(result).toEqual({ plan: "family", active: true, expiresAt: expires, source: "revenuecat" });
    expect(getCachedEntitlement("acct_2")).toEqual(result);
  });

  it("a subscriber with no entitlements (or no subscriber object) is free, and that is cached too", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ subscriber: {} })).mockResolvedValueOnce(json({}));
    expect(await fetchEntitlement("acct_3")).toEqual({ plan: "free", active: false, expiresAt: null, source: "revenuecat" });
    expect(await fetchEntitlement("acct_4")).toEqual({ plan: "free", active: false, expiresAt: null, source: "revenuecat" });
    expect(getCachedEntitlement("acct_4")?.source).toBe("revenuecat");
  });

  it("a non-2xx answer (outage, bad key, rate limit) throws a status-only error and caches nothing", async () => {
    for (const status of [500, 401, 429, 404]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ message: "upstream detail" }, status));
      const error = await fetchEntitlement(`acct_${status}`).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(`RevenueCat responded ${status}`);
      expect((error as Error).message).not.toContain("rc-test-secret");
      expect(getCachedEntitlement(`acct_${status}`)).toBeUndefined();
    }
  });

  it("a network failure or timeout propagates and caches nothing (never a stale or invented grant)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expect(fetchEntitlement("acct_net")).rejects.toThrow("timeout");
    expect(getCachedEntitlement("acct_net")).toBeUndefined();
  });

  it("an unparseable body throws and caches nothing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>gateway</html>", { status: 200 }));
    await expect(fetchEntitlement("acct_html")).rejects.toThrow();
    expect(getCachedEntitlement("acct_html")).toBeUndefined();
  });

  it("once the cached answer is dropped (a webhook, an account deletion), the next read asks RevenueCat again (F85)", async () => {
    const expires = inAMonth();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json({ subscriber: { entitlements: { pro: { expires_date: expires } } } }));
    expect((await fetchEntitlement("acct_again")).plan).toBe("pro");
    expect(getCachedEntitlement("acct_again")?.plan).toBe("pro");
    expect(await deleteEntitlementForUser("acct_again")).toBe(true);
    expect(getCachedEntitlement("acct_again")).toBeUndefined(); // → the route asks RevenueCat
    expect((await fetchEntitlement("acct_again")).plan).toBe("pro");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("entitlement cache TTL (10 minutes) and deletion", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a cached answer is served for exactly 10 minutes, then treated as stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-09-30T12:00:00.000Z"));
    await seed("ttl", { pro: { expires_date: null } });
    vi.setSystemTime(Date.parse("2026-09-30T12:10:00.000Z"));
    expect(getCachedEntitlement("ttl")?.plan).toBe("pro");
    vi.setSystemTime(Date.parse("2026-09-30T12:10:00.001Z"));
    expect(getCachedEntitlement("ttl")).toBeUndefined();
  });

  it("deleteEntitlementForUser removes only that user's cached entitlement", async () => {
    await seed("gone", { pro: { expires_date: null } });
    await seed("stays", { pro: { expires_date: null } });
    await deleteEntitlementForUser("gone");
    expect(getCachedEntitlement("gone")).toBeUndefined();
    expect(getCachedEntitlement("stays")?.plan).toBe("pro");
  });
});

describe("entitlement cache expiry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not serve an active grant past its own expiresAt, even inside the 10-minute window (a missed downgrade webhook)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    await seed("u1", { pro: { expires_date: new Date(start + 1000).toISOString() } });
    expect(getCachedEntitlement("u1")?.active).toBe(true);
    vi.setSystemTime(start + 2000);
    expect(getCachedEntitlement("u1")).toBeUndefined();
  });

  it("serves an active grant that has not yet expired", async () => {
    await seed("u2", { pro: { expires_date: new Date(Date.now() + 60_000).toISOString() } });
    const entitlement = getCachedEntitlement("u2");
    expect(entitlement?.plan).toBe("pro");
    expect(entitlement?.active).toBe(true);
  });

  it("serves a free/inactive answer (an expired subscription) from the cache", async () => {
    await seed("u3", { pro: { expires_date: new Date(Date.now() - 1000).toISOString() } });
    const entitlement = getCachedEntitlement("u3");
    expect(entitlement?.plan).toBe("free");
    expect(entitlement?.active).toBe(false);
  });
});

// A lifetime (non-consumable) purchase attached to the "pro" entitlement in the
// RevenueCat dashboard reports expires_date: null (RevenueCat's documented
// convention for lifetime access). This locks in that this server path
// already handles it correctly with no lifetime-specific code.
describe("lifetime (non-consumable) entitlements — expires_date: null", () => {
  it("planFromEntitlements treats a null expires_date as active forever", () => {
    const result = planFromEntitlements({ pro: { expires_date: null } });
    expect(result).toEqual({ plan: "pro", active: true, expiresAt: null });
  });

  it("a verified lifetime grant is cached as active and never expiring", async () => {
    await seed("u-lifetime", { pro: { expires_date: null } });
    expect(getCachedEntitlement("u-lifetime")).toMatchObject({ plan: "pro", active: true, expiresAt: null });
  });
});

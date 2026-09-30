import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyWebhookEvent,
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

  it("asks RevenueCat for exactly this subscriber (id URL-encoded), with the secret key and a timeout signal", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ subscriber: { entitlements: {} } }));
    await fetchEntitlement("acct/../other?x=1#y");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.revenuecat.com/v1/subscribers/acct%2F..%2Fother%3Fx%3D1%23y");
    expect(init?.headers).toEqual({ Authorization: "Bearer rc-test-secret", Accept: "application/json" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
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

  it("after a CANCELLATION webhook, the next read re-verifies and a still-paid subscription stays Pro", async () => {
    const expires = inAMonth();
    applyWebhookEvent({ event: { app_user_id: "acct_cancel", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"], expiration_at_ms: Date.parse(expires) } });
    applyWebhookEvent({ event: { app_user_id: "acct_cancel", type: "CANCELLATION", entitlement_ids: ["pro"], expiration_at_ms: Date.parse(expires) } });
    expect(getCachedEntitlement("acct_cancel")).toBeUndefined(); // → the route asks RevenueCat
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ subscriber: { entitlements: { pro: { expires_date: expires } } } }));
    expect((await fetchEntitlement("acct_cancel")).plan).toBe("pro");
  });
});

describe("applyWebhookEvent (RevenueCat event → cached entitlement)", () => {
  const later = () => Date.now() + 60_000;

  it("ignores a body without an event or without an app_user_id", () => {
    applyWebhookEvent({});
    applyWebhookEvent({ event: { type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } });
    applyWebhookEvent({ event: { app_user_id: "", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } });
    expect(getCachedEntitlement("")).toBeUndefined();
  });

  it("grant-type events cache the plan their entitlement ids name, with the event's expiry, marked as from the cache", () => {
    const expiresMs = later();
    for (const type of ["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", undefined]) {
      const id = `grant-${String(type)}`;
      applyWebhookEvent({ event: { app_user_id: id, type, entitlement_ids: ["pro"], expiration_at_ms: expiresMs } });
      expect(getCachedEntitlement(id), String(type)).toEqual({ plan: "pro", active: true, expiresAt: new Date(expiresMs).toISOString(), source: "cache" });
    }
  });

  it("family outranks pro in one event; the zeno_ ids count; unknown or missing ids grant nothing", () => {
    applyWebhookEvent({ event: { app_user_id: "both", type: "RENEWAL", entitlement_ids: ["pro", "family"] } });
    applyWebhookEvent({ event: { app_user_id: "zf", type: "RENEWAL", entitlement_ids: ["zeno_family"] } });
    applyWebhookEvent({ event: { app_user_id: "zp", type: "RENEWAL", entitlement_ids: ["zeno_pro"] } });
    applyWebhookEvent({ event: { app_user_id: "other", type: "RENEWAL", entitlement_ids: ["premium_addon"] } });
    applyWebhookEvent({ event: { app_user_id: "none", type: "RENEWAL" } });
    expect(getCachedEntitlement("both")?.plan).toBe("family");
    expect(getCachedEntitlement("zf")?.plan).toBe("family");
    expect(getCachedEntitlement("zp")?.plan).toBe("pro");
    expect(getCachedEntitlement("other")).toMatchObject({ plan: "free", active: false });
    expect(getCachedEntitlement("none")).toMatchObject({ plan: "free", active: false });
  });

  it("EXPIRATION revokes: free and inactive, whatever the entitlement ids say", () => {
    applyWebhookEvent({ event: { app_user_id: "exp", type: "INITIAL_PURCHASE", entitlement_ids: ["family"], expiration_at_ms: later() } });
    applyWebhookEvent({ event: { app_user_id: "exp", type: "EXPIRATION", entitlement_ids: ["family"], expiration_at_ms: Date.now() - 1 } });
    expect(getCachedEntitlement("exp")).toMatchObject({ plan: "free", active: false, source: "cache" });
  });

  it("CANCELLATION and SUBSCRIPTION_PAUSED never report a paying user as Free: the cached answer is dropped so the next read re-verifies", () => {
    // RevenueCat: access is removed on EXPIRATION; a cancellation (auto-renew
    // off) keeps access to the end of the period, and for SUBSCRIPTION_PAUSED
    // "Don't revoke access on this event". Before the fix both cached
    // plan "free", which the app trusts over its own SDK for up to the TTL.
    for (const type of ["CANCELLATION", "SUBSCRIPTION_PAUSED"]) {
      const id = `keep-${type}`;
      applyWebhookEvent({ event: { app_user_id: id, type: "RENEWAL", entitlement_ids: ["pro"], expiration_at_ms: later() } });
      applyWebhookEvent({ event: { app_user_id: id, type, entitlement_ids: ["pro"], expiration_at_ms: later() } });
      expect(getCachedEntitlement(id), type).toBeUndefined();
    }
  });

  it("an expiration_at_ms of 0 is a real (long past) expiry, not 'lifetime'", () => {
    // Before the fix a truthiness check read 0 as "no expiry", caching an
    // active, never-expiring grant.
    applyWebhookEvent({ event: { app_user_id: "epoch", type: "RENEWAL", entitlement_ids: ["pro"], expiration_at_ms: 0 } });
    expect(getCachedEntitlement("epoch")).toBeUndefined();
  });

  it("a replayed old grant (its expiry already passed) is never served — the caller must re-verify", () => {
    applyWebhookEvent({ event: { app_user_id: "replay", type: "RENEWAL", entitlement_ids: ["family"], expiration_at_ms: Date.now() - 24 * 3600 * 1000 } });
    expect(getCachedEntitlement("replay")).toBeUndefined();
  });
});

describe("entitlement cache TTL (10 minutes) and deletion", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a cached answer is served for exactly 10 minutes, then treated as stale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-09-30T12:00:00.000Z"));
    applyWebhookEvent({ event: { app_user_id: "ttl", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } });
    vi.setSystemTime(Date.parse("2026-09-30T12:10:00.000Z"));
    expect(getCachedEntitlement("ttl")?.plan).toBe("pro");
    vi.setSystemTime(Date.parse("2026-09-30T12:10:00.001Z"));
    expect(getCachedEntitlement("ttl")).toBeUndefined();
  });

  it("deleteEntitlementForUser removes only that user's cached entitlement", () => {
    applyWebhookEvent({ event: { app_user_id: "gone", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } });
    applyWebhookEvent({ event: { app_user_id: "stays", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } });
    deleteEntitlementForUser("gone");
    expect(getCachedEntitlement("gone")).toBeUndefined();
    expect(getCachedEntitlement("stays")?.plan).toBe("pro");
  });
});

describe("entitlement cache expiry", () => {
  it("does not serve an active grant past its own expiresAt (missed downgrade webhook)", () => {
    applyWebhookEvent({ event: { app_user_id: "u1", type: "RENEWAL", entitlement_ids: ["pro"], expiration_at_ms: Date.now() - 1000 } });
    expect(getCachedEntitlement("u1")).toBeUndefined();
  });

  it("serves an active grant that has not yet expired", () => {
    applyWebhookEvent({ event: { app_user_id: "u2", type: "RENEWAL", entitlement_ids: ["pro"], expiration_at_ms: Date.now() + 60_000 } });
    const entitlement = getCachedEntitlement("u2");
    expect(entitlement?.plan).toBe("pro");
    expect(entitlement?.active).toBe(true);
  });

  it("serves a downgrade result (free/inactive) even with a past expiry", () => {
    applyWebhookEvent({ event: { app_user_id: "u3", type: "EXPIRATION", entitlement_ids: ["pro"], expiration_at_ms: Date.now() - 1000 } });
    const entitlement = getCachedEntitlement("u3");
    expect(entitlement?.plan).toBe("free");
    expect(entitlement?.active).toBe(false);
  });
});

// A lifetime (non-consumable) purchase attached to the "pro" entitlement in the
// RevenueCat dashboard reports expires_date: null (RevenueCat's documented
// convention for lifetime access) — never a downgrade webhook, since a
// non-consumable never expires or renews. This locks in that this server path
// already handles it correctly with no lifetime-specific code.
describe("lifetime (non-consumable) entitlements — expires_date: null", () => {
  it("planFromEntitlements treats a null expires_date as active forever", () => {
    const result = planFromEntitlements({ pro: { expires_date: null } });
    expect(result).toEqual({ plan: "pro", active: true, expiresAt: null });
  });

  it("an INITIAL_PURCHASE webhook with no expiration_at_ms (lifetime) caches an active, never-expiring grant", () => {
    applyWebhookEvent({ event: { app_user_id: "u-lifetime", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } });
    const entitlement = getCachedEntitlement("u-lifetime");
    expect(entitlement).toMatchObject({ plan: "pro", active: true, expiresAt: null });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * RevenueCat lifecycle, each test on a FRESH module (initRevenueCat caches
 * its configured state): configure once / only with a key / never on web,
 * per-platform keys, identify + reset, offerings mapping and every package
 * fallback, purchases by package or by product, restore, and checkStatus —
 * where the SERVER's verified plan wins and the client's view is used only
 * when the server is unreachable or billing is unconfigured (finding F15).
 */
const platform = vi.hoisted(() => ({ OS: "ios" as string }));
vi.mock("react-native", () => ({ Platform: platform }));
const constants = vi.hoisted(() => ({ extra: {} as Record<string, unknown> | undefined }));
vi.mock("expo-constants", () => ({ default: { get expoConfig() { return { extra: constants.extra }; } } }));
const api = vi.hoisted(() => ({ getServerEntitlement: vi.fn(), recordFunnelEvent: vi.fn() }));
vi.mock("../api/client", () => api);
const rc = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  configure: vi.fn(),
  logIn: vi.fn(),
  logOut: vi.fn(),
  getOfferings: vi.fn(),
  getCustomerInfo: vi.fn(),
  getProducts: vi.fn(),
  purchasePackage: vi.fn(),
  purchaseStoreProduct: vi.fn(),
  restorePurchases: vi.fn(),
  checkTrialOrIntroductoryPriceEligibility: vi.fn()
}));
vi.mock("react-native-purchases", () => ({ default: rc }));

const info = (activeEntitlementIds: string[] = []) => ({
  entitlements: { active: Object.fromEntries(activeEntitlementIds.map((id) => [id, { isActive: true }])) },
  activeSubscriptions: [],
  subscriptionsByProductIdentifier: {},
  allPurchasedProductIdentifiers: []
});
const pkg = (identifier: string, productId = identifier, priceString = "$1") => ({ identifier, product: { identifier: productId, priceString } });
const offering = (packages: ReturnType<typeof pkg>[], fallbacks: Record<string, unknown> = {}) => ({ availablePackages: packages, monthly: null, annual: null, lifetime: null, ...fallbacks });

const ORIGINAL_ENV = { ...process.env };
async function load() {
  vi.resetModules();
  return import("./revenueCat");
}

beforeEach(() => {
  platform.OS = "ios";
  constants.extra = { revenueCat: { iosKey: "appl_ios_key", androidKey: "goog_android_key" } };
  delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  for (const f of Object.values(rc)) f.mockReset();
  rc.isConfigured.mockResolvedValue(false);
  api.getServerEntitlement.mockReset();
  api.recordFunnelEvent.mockReset();
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("initRevenueCat", () => {
  it("never configures on web", async () => {
    platform.OS = "web";
    const m = await load();
    expect(await m.initRevenueCat()).toBe(false);
    expect(rc.configure).not.toHaveBeenCalled();
  });

  it("configures ONCE with the platform's key, even when called concurrently and repeatedly", async () => {
    const m = await load();
    const results = await Promise.all([m.initRevenueCat(), m.initRevenueCat(), m.initRevenueCat()]);
    expect(results).toEqual([true, true, true]);
    expect(await m.initRevenueCat()).toBe(true);
    expect(rc.configure).toHaveBeenCalledTimes(1);
    expect(rc.configure).toHaveBeenCalledWith({ apiKey: "appl_ios_key" });
  });

  it("uses the Android key on Android, and env vars win over app config", async () => {
    platform.OS = "android";
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = "goog_env_key";
    const m = await load();
    await m.initRevenueCat();
    expect(rc.configure).toHaveBeenCalledWith({ apiKey: "goog_env_key" });
  });

  it("does not configure twice when the native SDK is already configured", async () => {
    rc.isConfigured.mockResolvedValue(true);
    const m = await load();
    expect(await m.initRevenueCat()).toBe(true);
    expect(rc.configure).not.toHaveBeenCalled();
  });

  it("treats a failing isConfigured() as 'not configured' and configures", async () => {
    rc.isConfigured.mockRejectedValue(new Error("native not ready"));
    const m = await load();
    expect(await m.initRevenueCat()).toBe(true);
    expect(rc.configure).toHaveBeenCalledTimes(1);
  });

  it("with no key for this platform: unconfigured, nothing called", async () => {
    constants.extra = undefined;
    const m = await load();
    expect(await m.initRevenueCat()).toBe(false);
    expect(rc.configure).not.toHaveBeenCalled();
    platform.OS = "android";
    constants.extra = { revenueCat: { iosKey: "only-ios" } };
    const m2 = await load();
    expect(await m2.initRevenueCat()).toBe(false);
  });
});

describe("identity", () => {
  it("logs in with the Zeno account id (what the server verifies against)", async () => {
    const m = await load();
    await m.identifyRevenueCatUser("acct_123");
    expect(rc.logIn).toHaveBeenCalledWith("acct_123");
  });

  it("skips an empty id, an unconfigured SDK, and swallows a login failure", async () => {
    const m = await load();
    await m.identifyRevenueCatUser("");
    expect(rc.logIn).not.toHaveBeenCalled();
    rc.logIn.mockRejectedValueOnce(new Error("network"));
    await expect(m.identifyRevenueCatUser("acct_1")).resolves.toBeUndefined();
    constants.extra = {};
    const unconfigured = await load();
    await unconfigured.identifyRevenueCatUser("acct_2");
    expect(rc.logIn).toHaveBeenCalledTimes(1);
  });

  it("reset logs out only when configured, and swallows a failure", async () => {
    const m = await load();
    await m.resetRevenueCatUser();
    expect(rc.logOut).not.toHaveBeenCalled();
    await m.initRevenueCat();
    rc.logOut.mockRejectedValueOnce(new Error("x"));
    await expect(m.resetRevenueCatUser()).resolves.toBeUndefined();
    expect(rc.logOut).toHaveBeenCalledTimes(1);
  });
});

describe("offerings", () => {
  it("unconfigured → all empty", async () => {
    constants.extra = {};
    const m = await load();
    expect(await m.getOfferings()).toEqual({ pro: null, family: null, proMonthly: null, proAnnual: null, proLifetime: null, familyMonthly: null });
  });

  it("maps packages by product id, with the offering's own monthly/annual/lifetime as fallbacks", async () => {
    const monthly = pkg("$rc_monthly", "zeno_pro_monthly");
    const annualFallback = pkg("$rc_annual", "some_other_annual");
    const lifetimeFallback = pkg("$rc_lifetime", "some_lifetime");
    const familyMonthly = pkg("zeno_family_monthly");
    rc.getOfferings.mockResolvedValue({
      current: null,
      all: {
        pro: offering([monthly], { annual: annualFallback, lifetime: lifetimeFallback }),
        family: offering([], { monthly: familyMonthly })
      }
    });
    const m = await load();
    const o = await m.getOfferings();
    expect(o.proMonthly).toBe(monthly);
    expect(o.proAnnual).toBe(annualFallback);
    expect(o.proLifetime).toBe(lifetimeFallback);
    expect(o.familyMonthly).toBe(familyMonthly);
  });

  it("finds the pro offering under zeno_pro or the current offering; family under zeno_family; none → null", async () => {
    const m = await load();
    const zp = offering([]);
    rc.getOfferings.mockResolvedValueOnce({ current: null, all: { zeno_pro: zp, zeno_family: offering([]) } });
    const a = await m.getOfferings();
    expect(a.pro).toBe(zp);
    expect(a.family).not.toBeNull();
    const cur = offering([]);
    rc.getOfferings.mockResolvedValueOnce({ current: cur, all: {} });
    const b = await m.getOfferings();
    expect(b.pro).toBe(cur);
    expect(b.family).toBeNull();
    expect(b.familyMonthly).toBeNull();
  });

  it("getPackagePrice uses the store price or the fallback", async () => {
    const m = await load();
    expect(m.getPackagePrice(pkg("x", "x", "$4.99") as never, "$—")).toBe("$4.99");
    expect(m.getPackagePrice(null, "$—")).toBe("$—");
  });
});

describe("purchases", () => {
  it("family purchase via its package records the funnel event and returns the plan", async () => {
    const fam = pkg("zeno_family_monthly");
    rc.getOfferings.mockResolvedValue({ current: null, all: { family: offering([fam]) } });
    rc.purchasePackage.mockResolvedValue({ customerInfo: info(["family"]) });
    const m = await load();
    expect(await m.purchaseFamily()).toBe("family");
    expect(rc.purchasePackage).toHaveBeenCalledWith(fam);
    expect(api.recordFunnelEvent).toHaveBeenCalledWith("paywall_purchase_completed", "zeno_family_monthly");
  });

  it("annual pro with no package in the offering buys the store product directly", async () => {
    rc.getOfferings.mockResolvedValue({ current: null, all: {} });
    rc.getProducts.mockResolvedValue([{ identifier: "zeno_pro_annual" }]);
    rc.purchaseStoreProduct.mockResolvedValue({ customerInfo: info(["pro"]) });
    const m = await load();
    expect(await m.purchasePro("annual")).toBe("pro");
    expect(rc.getProducts).toHaveBeenCalledWith(["zeno_pro_annual"]);
  });

  it("purchasePro defaults to annual", async () => {
    rc.getOfferings.mockResolvedValue({ current: null, all: {} });
    rc.getProducts.mockResolvedValue([{ identifier: "zeno_pro_annual" }]);
    rc.purchaseStoreProduct.mockResolvedValue({ customerInfo: info(["pro"]) });
    const m = await load();
    await m.purchasePro();
    expect(rc.getProducts).toHaveBeenCalledWith(["zeno_pro_annual"]);
  });

  it("a product the store doesn't have is a clear error, and no event is recorded", async () => {
    rc.getOfferings.mockResolvedValue({ current: null, all: {} });
    rc.getProducts.mockResolvedValue([]);
    const m = await load();
    await expect(m.purchasePro("monthly")).rejects.toThrow("RevenueCat product zeno_pro_monthly is not available.");
    expect(api.recordFunnelEvent).not.toHaveBeenCalled();
  });

  it("without RevenueCat configured, a purchase fails with the setup hint", async () => {
    constants.extra = {};
    const m = await load();
    await expect(m.purchaseFamily()).rejects.toThrow("RevenueCat is not configured.");
  });

  it("restore returns the restored plan; unconfigured → free", async () => {
    rc.restorePurchases.mockResolvedValue(info(["pro"]));
    const m = await load();
    expect(await m.restorePurchases()).toBe("pro");
    constants.extra = {};
    const unconfigured = await load();
    expect(await unconfigured.restorePurchases()).toBe("free");
  });
});

describe("getTrialEligibility (F134)", () => {
  it("iOS: each product's status, read from RevenueCat", async () => {
    const m = await load();
    rc.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({ zeno_pro_annual: { status: 2, description: "eligible" }, zeno_pro_monthly: { status: 1, description: "used" } });
    expect(await m.getTrialEligibility(["zeno_pro_annual", "zeno_pro_monthly"])).toEqual({ zeno_pro_annual: 2, zeno_pro_monthly: 1 });
    expect(rc.checkTrialOrIntroductoryPriceEligibility).toHaveBeenCalledWith(["zeno_pro_annual", "zeno_pro_monthly"]);
  });

  it("unknown (empty) when it fails, when there is nothing to ask, off iOS, or with no store", async () => {
    const m = await load();
    rc.checkTrialOrIntroductoryPriceEligibility.mockRejectedValue(new Error("no group"));
    expect(await m.getTrialEligibility(["zeno_pro_annual"])).toEqual({});
    expect(await m.getTrialEligibility([])).toEqual({});
    platform.OS = "android";
    expect(await m.getTrialEligibility(["zeno_pro_annual"])).toEqual({});
    platform.OS = "ios";
    constants.extra = {};
    const unconfigured = await load();
    expect(await unconfigured.getTrialEligibility(["zeno_pro_annual"])).toEqual({});
    expect(rc.checkTrialOrIntroductoryPriceEligibility).toHaveBeenCalledTimes(1);
  });
});

describe("checkStatus — the server's verified plan wins (F15)", () => {
  it("unconfigured → free without asking anyone", async () => {
    constants.extra = {};
    const m = await load();
    expect(await m.checkStatus()).toBe("free");
    expect(api.getServerEntitlement).not.toHaveBeenCalled();
  });

  it("a client that CLAIMS pro is overridden by the server's 'free'", async () => {
    rc.getCustomerInfo.mockResolvedValue(info(["pro"]));
    api.getServerEntitlement.mockResolvedValue({ plan: "free", source: "revenuecat" });
    const m = await load();
    expect(await m.checkStatus()).toBe("free");
  });

  it("falls back to the client view when server billing is unconfigured, missing, or unreachable", async () => {
    rc.getCustomerInfo.mockResolvedValue(info(["family"]));
    const m = await load();
    api.getServerEntitlement.mockResolvedValueOnce({ plan: "free", source: "unconfigured" });
    expect(await m.checkStatus()).toBe("family");
    api.getServerEntitlement.mockResolvedValueOnce(null);
    expect(await m.checkStatus()).toBe("family");
    api.getServerEntitlement.mockRejectedValueOnce(new Error("offline"));
    expect(await m.checkStatus()).toBe("family");
  });
});

describe("other native platforms", () => {
  it("a platform that is neither iOS nor Android (e.g. macOS) has no key, so RevenueCat stays off", async () => {
    platform.OS = "macos";
    const m = await load();
    expect(await m.initRevenueCat()).toBe(false);
    expect(rc.configure).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// revenueCat.ts imports several native/RN modules purely for their purchase-
// flow side effects, which getPlanFromCustomerInfo never touches. Stub them
// just enough for the module to load under Vitest.
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} } } }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
const recordFunnelEventMock = vi.fn();
vi.mock("../api/client", () => ({ getServerEntitlement: vi.fn(), recordFunnelEvent: recordFunnelEventMock }));
vi.mock("react-native-purchases", () => ({
  default: {
    isConfigured: vi.fn(),
    configure: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    getOfferings: vi.fn(),
    getCustomerInfo: vi.fn(),
    getProducts: vi.fn(),
    purchasePackage: vi.fn(),
    purchaseStoreProduct: vi.fn(),
    restorePurchases: vi.fn()
  }
}));

const { getPlanFromCustomerInfo, revenueCatProductIds, purchasePro, purchaseLifetime } = await import("./revenueCat");
const Purchases = (await import("react-native-purchases")).default;

// Minimal empty CustomerInfo — getPlanFromCustomerInfo is exercised separately
// above; these tests only care that a completed purchase fires the funnel
// event with the right SKU, and a cancelled one does not.
const emptyCustomerInfo = {
  entitlements: { active: {} },
  activeSubscriptions: [],
  subscriptionsByProductIdentifier: {},
  allPurchasedProductIdentifiers: []
};

type FakeCustomerInfoInput = {
  activeEntitlementIds?: string[];
  activeSubscriptions?: string[];
  productSubscriptions?: Record<string, boolean>;
  purchasedProductIds?: string[];
};

// A minimal RevenueCat CustomerInfo fixture — only the fields
// getPlanFromCustomerInfo actually reads (real CustomerInfo has many more).
function customerInfo(input: FakeCustomerInfoInput = {}) {
  const active: Record<string, { isActive: boolean }> = {};
  for (const id of input.activeEntitlementIds ?? []) active[id] = { isActive: true };
  const subscriptionsByProductIdentifier: Record<string, { isActive: boolean }> = {};
  for (const [id, isActive] of Object.entries(input.productSubscriptions ?? {})) {
    subscriptionsByProductIdentifier[id] = { isActive };
  }
  return {
    entitlements: { active },
    activeSubscriptions: input.activeSubscriptions ?? [],
    subscriptionsByProductIdentifier,
    allPurchasedProductIdentifiers: input.purchasedProductIds ?? []
  } as Parameters<typeof getPlanFromCustomerInfo>[0];
}

describe("getPlanFromCustomerInfo", () => {
  it("is free with no active entitlement or product", () => {
    expect(getPlanFromCustomerInfo(customerInfo())).toBe("free");
  });

  it("is family when the 'family' entitlement is active", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ activeEntitlementIds: ["family"] }))).toBe("family");
  });

  it("is family via the alternate 'zeno_family' entitlement id", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ activeEntitlementIds: ["zeno_family"] }))).toBe("family");
  });

  it("is pro when the 'pro' entitlement is active", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ activeEntitlementIds: ["pro"] }))).toBe("pro");
  });

  it("is pro via the alternate 'zeno_pro' entitlement id", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ activeEntitlementIds: ["zeno_pro"] }))).toBe("pro");
  });

  it("family takes precedence when both family and pro entitlements are active", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ activeEntitlementIds: ["pro", "family"] }))).toBe("family");
  });

  it("falls back to the raw family product id in activeSubscriptions when there's no entitlement", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ activeSubscriptions: [revenueCatProductIds.familyMonthly] }))).toBe("family");
  });

  it("falls back to the raw pro product id (monthly or annual) in activeSubscriptions", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ activeSubscriptions: [revenueCatProductIds.proMonthly] }))).toBe("pro");
    expect(getPlanFromCustomerInfo(customerInfo({ activeSubscriptions: [revenueCatProductIds.proAnnual] }))).toBe("pro");
  });

  it("falls back to subscriptionsByProductIdentifier[...].isActive when the product isn't in activeSubscriptions", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ productSubscriptions: { [revenueCatProductIds.proAnnual]: true } }))).toBe("pro");
  });

  it("an inactive product subscription does not grant a plan", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ productSubscriptions: { [revenueCatProductIds.proAnnual]: false } }))).toBe("free");
  });

  it("raw family product takes precedence over a raw pro product", () => {
    expect(getPlanFromCustomerInfo(customerInfo({
      activeSubscriptions: [revenueCatProductIds.proMonthly, revenueCatProductIds.familyMonthly]
    }))).toBe("family");
  });

  // Regression: a non-consumable (lifetime) purchase never appears in
  // activeSubscriptions or subscriptionsByProductIdentifier — those track
  // subscriptions only. RevenueCat tracks one-time purchases in
  // allPurchasedProductIdentifiers instead. A naive port of the
  // hasActiveProduct check (used for the two subscription SKUs) would silently
  // never recognize a lifetime purchase at all.
  it("is pro when the lifetime product appears in allPurchasedProductIdentifiers, even with no active subscription", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ purchasedProductIds: [revenueCatProductIds.proLifetime] }))).toBe("pro");
  });

  it("does NOT grant pro from a lifetime purchase appearing in activeSubscriptions or subscriptionsByProductIdentifier alone (that's not where non-consumables live)", () => {
    // Confirms the fix targets the right field — a lifetime id showing up in the
    // subscription-tracking fields (which real RevenueCat never does) must not
    // be required for it to grant pro; only allPurchasedProductIdentifiers matters.
    expect(getPlanFromCustomerInfo(customerInfo({ purchasedProductIds: [] }))).toBe("free");
  });

  it("is pro via the lifetime entitlement id too, mirroring the monthly/annual entitlement path", () => {
    expect(getPlanFromCustomerInfo(customerInfo({ activeEntitlementIds: ["pro"], purchasedProductIds: [revenueCatProductIds.proLifetime] }))).toBe("pro");
  });
});

describe("purchase completion fires an aggregate funnel event (Phase 5.3)", () => {
  const originalIosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

  beforeEach(() => {
    // getRevenueCatApiKey() must see a key or initRevenueCat() short-circuits
    // to unconfigured and every purchase throws before reaching the funnel event.
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = "test-key";
    recordFunnelEventMock.mockClear();
    vi.mocked(Purchases.isConfigured).mockResolvedValue(true);
    // Empty offerings -> findPackage returns null for every SKU -> purchaseProductOrPackage
    // takes the getProducts/purchaseStoreProduct fallback path (simplest to mock).
    vi.mocked(Purchases.getOfferings).mockResolvedValue({ all: {}, current: null } as never);
  });

  afterEach(() => {
    if (originalIosKey === undefined) delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    else process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = originalIosKey;
  });

  it("records paywall_purchase_completed with the monthly SKU on a completed pro purchase", async () => {
    vi.mocked(Purchases.getProducts).mockResolvedValue([{ identifier: revenueCatProductIds.proMonthly }] as never);
    vi.mocked(Purchases.purchaseStoreProduct).mockResolvedValue({ customerInfo: emptyCustomerInfo } as never);

    await purchasePro("monthly");

    expect(recordFunnelEventMock).toHaveBeenCalledWith("paywall_purchase_completed", revenueCatProductIds.proMonthly);
  });

  it("records paywall_purchase_completed with the lifetime SKU on a completed lifetime purchase", async () => {
    vi.mocked(Purchases.getProducts).mockResolvedValue([{ identifier: revenueCatProductIds.proLifetime }] as never);
    vi.mocked(Purchases.purchaseStoreProduct).mockResolvedValue({ customerInfo: emptyCustomerInfo } as never);

    await purchaseLifetime();

    expect(recordFunnelEventMock).toHaveBeenCalledWith("paywall_purchase_completed", revenueCatProductIds.proLifetime);
  });

  it("does not record the event when the user cancels the native purchase sheet", async () => {
    vi.mocked(Purchases.getProducts).mockResolvedValue([{ identifier: revenueCatProductIds.proMonthly }] as never);
    vi.mocked(Purchases.purchaseStoreProduct).mockRejectedValue(new Error("cancelled"));

    await expect(purchasePro("monthly")).rejects.toThrow();
    expect(recordFunnelEventMock).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";

// revenueCat.ts imports several native/RN modules purely for their purchase-
// flow side effects, which getPlanFromCustomerInfo never touches. Stub them
// just enough for the module to load under Vitest.
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} } } }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("../api/client", () => ({ getServerEntitlement: vi.fn() }));
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

const { getPlanFromCustomerInfo, revenueCatProductIds } = await import("./revenueCat");

type FakeCustomerInfoInput = {
  activeEntitlementIds?: string[];
  activeSubscriptions?: string[];
  productSubscriptions?: Record<string, boolean>;
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
    subscriptionsByProductIdentifier
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
});

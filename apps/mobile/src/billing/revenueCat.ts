import Constants from "expo-constants";
import { Platform } from "react-native";
import { getServerEntitlement } from "../api/client";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
  type PurchasesStoreProduct
} from "react-native-purchases";

export type BillingPlan = "free" | "pro" | "family";
export type ProBillingPeriod = "monthly" | "annual";

export type ZenoOfferings = {
  pro: PurchasesOffering | null;
  family: PurchasesOffering | null;
  proMonthly: PurchasesPackage | null;
  proAnnual: PurchasesPackage | null;
  proLifetime: PurchasesPackage | null;
  familyMonthly: PurchasesPackage | null;
};

export const revenueCatProductIds = {
  proMonthly: "zeno_pro_monthly",
  proAnnual: "zeno_pro_annual",
  // Non-consumable (one-time purchase) — never expires, never renews. See
  // hasNonConsumableProduct below: it is NOT tracked in activeSubscriptions.
  proLifetime: "zeno_pro_lifetime",
  familyMonthly: "zeno_family_monthly"
} as const;

const proEntitlementIds = ["pro", "zeno_pro"];
const familyEntitlementIds = ["family", "zeno_family"];
let configurePromise: Promise<boolean> | null = null;
let configured = false;

export async function initRevenueCat(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  if (configured) {
    return true;
  }

  configurePromise ??= configureRevenueCat();
  configured = await configurePromise;
  return configured;
}

// Bind the RevenueCat subscriber to the Zeno account id. This is REQUIRED for
// server-side entitlement verification to work: the server looks up RevenueCat by
// the auth token's account id, so the SDK must have logged in as that same id —
// otherwise a real purchase would never unlock Pro (RevenueCat wouldn't recognize
// the id the server asks about). Best-effort + idempotent; no-op when unconfigured.
export async function identifyRevenueCatUser(accountId: string): Promise<void> {
  if (!accountId || !(await initRevenueCat())) {
    return;
  }
  try {
    await Purchases.logIn(accountId);
  } catch {
    // Best-effort — never block app startup on billing identity.
  }
}

// Reset to an anonymous RevenueCat user on sign-out so the next account doesn't
// inherit this one's purchases on a shared device.
export async function resetRevenueCatUser(): Promise<void> {
  if (!configured) {
    return;
  }
  try {
    await Purchases.logOut();
  } catch {
    // Best-effort.
  }
}

export async function getOfferings(): Promise<ZenoOfferings> {
  if (!(await initRevenueCat())) {
    return emptyOfferings();
  }

  const offerings = await Purchases.getOfferings();
  return mapOfferings(offerings);
}

export async function purchasePro(period: ProBillingPeriod = "annual"): Promise<BillingPlan> {
  const productId = period === "annual" ? revenueCatProductIds.proAnnual : revenueCatProductIds.proMonthly;
  const offerings = await getOfferings();
  const packageToPurchase = period === "annual" ? offerings.proAnnual : offerings.proMonthly;
  const customerInfo = await purchaseProductOrPackage(productId, packageToPurchase);
  return getPlanFromCustomerInfo(customerInfo);
}

// One-time non-consumable purchase — no period/trial, never renews or expires.
export async function purchaseLifetime(): Promise<BillingPlan> {
  const offerings = await getOfferings();
  const customerInfo = await purchaseProductOrPackage(revenueCatProductIds.proLifetime, offerings.proLifetime);
  return getPlanFromCustomerInfo(customerInfo);
}

export async function purchaseFamily(): Promise<BillingPlan> {
  const offerings = await getOfferings();
  const customerInfo = await purchaseProductOrPackage(revenueCatProductIds.familyMonthly, offerings.familyMonthly);
  return getPlanFromCustomerInfo(customerInfo);
}

export async function checkStatus(): Promise<BillingPlan> {
  if (!(await initRevenueCat())) {
    return "free";
  }

  const customerInfo = await Purchases.getCustomerInfo();
  const clientPlan = getPlanFromCustomerInfo(customerInfo);

  // The server independently verifies with RevenueCat, so it wins — a tampered
  // client can't grant itself Pro. Fall back to the client result only when the
  // server is unreachable or billing isn't configured server-side.
  try {
    // Server identifies the user from the auth token (its RevenueCat app_user_id
    // must equal the Zeno account id — ensure Purchases.logIn(accountId) at sign-in).
    const server = await getServerEntitlement();
    if (server && server.source !== "unconfigured") {
      return server.plan;
    }
  } catch {
    // ignore — fall back to clientPlan
  }
  return clientPlan;
}

export async function restorePurchases(): Promise<BillingPlan> {
  if (!(await initRevenueCat())) {
    return "free";
  }

  const customerInfo = await Purchases.restorePurchases();
  return getPlanFromCustomerInfo(customerInfo);
}

export function getPackagePrice(packageToFormat: PurchasesPackage | null, fallback: string): string {
  return packageToFormat?.product.priceString ?? fallback;
}

async function configureRevenueCat(): Promise<boolean> {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    return false;
  }

  const alreadyConfigured = await Purchases.isConfigured().catch(() => false);
  if (!alreadyConfigured) {
    Purchases.configure({ apiKey });
  }

  return true;
}

async function purchaseProductOrPackage(productId: string, packageToPurchase: PurchasesPackage | null): Promise<CustomerInfo> {
  if (!(await initRevenueCat())) {
    throw new Error("RevenueCat is not configured. Add EXPO_PUBLIC_REVENUECAT_IOS_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.");
  }

  if (packageToPurchase) {
    const result = await Purchases.purchasePackage(packageToPurchase);
    return result.customerInfo;
  }

  const [product] = await Purchases.getProducts([productId]);
  if (!product) {
    throw new Error(`RevenueCat product ${productId} is not available.`);
  }

  const result = await Purchases.purchaseStoreProduct(product);
  return result.customerInfo;
}

function mapOfferings(offerings: PurchasesOfferings): ZenoOfferings {
  const pro = offerings.all.pro ?? offerings.all.zeno_pro ?? offerings.current ?? null;
  const family = offerings.all.family ?? offerings.all.zeno_family ?? null;

  return {
    pro,
    family,
    proMonthly: findPackage(pro, revenueCatProductIds.proMonthly, "monthly"),
    proAnnual: findPackage(pro, revenueCatProductIds.proAnnual, "annual"),
    proLifetime: findPackage(pro, revenueCatProductIds.proLifetime, "lifetime"),
    familyMonthly: findPackage(family, revenueCatProductIds.familyMonthly, "monthly")
  };
}

function findPackage(offering: PurchasesOffering | null, productId: string, period: ProBillingPeriod | "monthly" | "lifetime"): PurchasesPackage | null {
  if (!offering) {
    return null;
  }

  const direct = offering.availablePackages.find((candidate) => matchesPackage(candidate, productId));
  if (direct) {
    return direct;
  }

  if (period === "annual") return offering.annual;
  if (period === "lifetime") return offering.lifetime;
  return offering.monthly;
}

function matchesPackage(candidate: PurchasesPackage, productId: string): boolean {
  return candidate.identifier === productId || candidate.product.identifier === productId;
}

export function getPlanFromCustomerInfo(customerInfo: CustomerInfo): BillingPlan {
  const activeEntitlements = customerInfo.entitlements.active;
  if (familyEntitlementIds.some((id) => activeEntitlements[id]?.isActive) || hasActiveProduct(customerInfo, revenueCatProductIds.familyMonthly)) {
    return "family";
  }

  if (
    proEntitlementIds.some((id) => activeEntitlements[id]?.isActive) ||
    hasActiveProduct(customerInfo, revenueCatProductIds.proMonthly) ||
    hasActiveProduct(customerInfo, revenueCatProductIds.proAnnual) ||
    hasNonConsumableProduct(customerInfo, revenueCatProductIds.proLifetime)
  ) {
    return "pro";
  }

  return "free";
}

function hasActiveProduct(customerInfo: CustomerInfo, productId: string): boolean {
  const subscription = customerInfo.subscriptionsByProductIdentifier[productId];
  return customerInfo.activeSubscriptions.includes(productId) || Boolean(subscription?.isActive);
}

// Non-consumables (one-time purchases like lifetime) never appear in
// activeSubscriptions or subscriptionsByProductIdentifier — those track
// subscriptions only. RevenueCat's CustomerInfo tracks one-time purchases in
// allPurchasedProductIdentifiers instead; once bought, always owned (no
// "isActive"/expiry concept applies). This is a deliberate defensive fallback:
// if the RevenueCat dashboard attaches zeno_pro_lifetime to the pro
// entitlement, the entitlement check above already catches it (expirationDate
// is null for lifetime access); this covers the case where it isn't.
function hasNonConsumableProduct(customerInfo: CustomerInfo, productId: string): boolean {
  return customerInfo.allPurchasedProductIdentifiers.includes(productId);
}

function getRevenueCatApiKey(): string | null {
  const extra = Constants.expoConfig?.extra as {
    revenueCat?: {
      iosKey?: string;
      androidKey?: string;
    };
  } | undefined;
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? extra?.revenueCat?.iosKey;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? extra?.revenueCat?.androidKey;

  if (Platform.OS === "ios") {
    return iosKey ?? null;
  }

  if (Platform.OS === "android") {
    return androidKey ?? null;
  }

  return null;
}

function emptyOfferings(): ZenoOfferings {
  return {
    pro: null,
    family: null,
    proMonthly: null,
    proAnnual: null,
    proLifetime: null,
    familyMonthly: null
  };
}

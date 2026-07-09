import { describe, expect, it, vi } from "vitest";

// emailScanner.ts pulls in expo-auth-session (+ its Google provider) and
// ../security/secure-store purely for the OAuth/Gmail-fetch flow, which
// parseEmailBody/processResults never touch. Stub just enough for the module
// to load under Vitest.
vi.mock("expo-auth-session", () => ({ exchangeCodeAsync: vi.fn() }));
vi.mock("expo-auth-session/providers/google", () => ({ discovery: {} }));
vi.mock("../security/secure-store", () => ({
  getGmailAccountToken: vi.fn(),
  listGmailAddresses: vi.fn(),
  removeGmailAccount: vi.fn(),
  saveGmailAccount: vi.fn()
}));

const { parseEmailBody, processResults } = await import("./emailScanner");

describe("parseEmailBody", () => {
  it("returns null when no dollar amount can be found", () => {
    expect(parseEmailBody("Thanks for being a customer! No charges here.", "example.com")).toBeNull();
  });

  it("parses a standard monthly receipt: amount, currency, cycle, date, and catalog match", () => {
    const body = "Your Netflix receipt\nAmount: $15.49\nBilled monthly.\nDate: Jan 15, 2026";
    const result = parseEmailBody(body, "netflix.com");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15.49);
    expect(result!.currency).toBe("USD");
    expect(result!.billingCycle).toBe("monthly");
    expect(result!.serviceId).toBe("netflix");
    expect(result!.confidence).toBe("high"); // catalog match + a detected date
    // extractDate's regex only matches non-ISO "Month DD, YYYY" text, which
    // Date.parse builds as LOCAL midnight — read it back with local accessors
    // (not a UTC string slice) so this isn't runner-timezone-dependent.
    const lastCharged = new Date(result!.lastCharged);
    expect([lastCharged.getFullYear(), lastCharged.getMonth(), lastCharged.getDate()]).toEqual([2026, 0, 15]);
  });

  it("detects EUR and GBP currency markers", () => {
    // extractAmount's patterns anchor on $ or a keyword (amount/total/charged/
    // payment of) with an OPTIONAL $ — a bare €/£-prefixed figure with no such
    // keyword nearby isn't matched, so the currency word needs to accompany a
    // keyword-anchored amount for detectCurrency to ever run on a real hit.
    expect(parseEmailBody("Amount: 12.00 EUR charged for your annual plan.", "unknown-eu.example")!.currency).toBe("EUR");
    expect(parseEmailBody("Amount: 8.99 GBP charged for your monthly plan.", "unknown-uk.example")!.currency).toBe("GBP");
  });

  it("parses an amount with a thousands separator (annual plan)", () => {
    // Regression: the old /\$(\d+(?:\.\d{2})?)/ captured "$1" from "$1,299.00".
    const result = parseEmailBody("Total: $1,299.00 for your annual plan.", "unknown-merchant.example");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1299);
    expect(result!.currency).toBe("USD");
  });

  it("parses a euro amount written with a decimal comma and € symbol", () => {
    // Regression: the old patterns anchored on $/keyword and returned null.
    const result = parseEmailBody("Amount charged: €10,99", "unknown-eu.example");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(10.99);
    expect(result!.currency).toBe("EUR");
  });

  it("parses a pound amount with the £ symbol", () => {
    const result = parseEmailBody("You were charged £9.99 monthly.", "unknown-uk.example");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(9.99);
    expect(result!.currency).toBe("GBP");
  });

  it("maps INR, CAD, and AUD currency codes", () => {
    expect(parseEmailBody("Total: 499.00 INR for your monthly plan.", "x.example")!.currency).toBe("INR");
    expect(parseEmailBody("Amount: 12.00 CAD charged.", "x.example")!.currency).toBe("CAD");
    expect(parseEmailBody("Amount: 15.00 AUD charged.", "x.example")!.currency).toBe("AUD");
  });

  it("stays USD when a USD receipt merely mentions a foreign symbol in passing", () => {
    // Regression: an ordered non-USD-first check returned EUR for this body.
    const result = parseEmailBody("You were charged $9.99 this month. Prices for EU users shown in €.", "x.example");
    expect(result!.amount).toBe(9.99);
    expect(result!.currency).toBe("USD");
  });

  it("parses a European dot-grouped integer amount (no decimal comma) correctly", () => {
    // Regression: "€2.500" was read as 2.5 instead of 2500.
    const result = parseEmailBody("Your annual plan: €2.500 charged today.", "x.example");
    expect(result!.amount).toBe(2500);
    expect(result!.currency).toBe("EUR");
  });

  it("does not mistake a stray year before a currency code for the amount", () => {
    // Regression: "2026 USD" matched the number-before-code pattern and, being
    // larger, won the tie-break over the real 9.99 charge.
    const result = parseEmailBody("You were charged 9.99.\nInvoice period 2026 USD annual plan.", "x.example");
    expect(result!.amount).toBe(9.99);
  });

  it("picks the most frequently-mentioned amount when a body has more than one dollar figure", () => {
    // $15.49 appears twice (total + charged-line); $2.00 (a shipping-style aside) appears once.
    const body = "Total: $15.49\nA small $2.00 processing note.\nYou were charged $15.49 today. Monthly plan.";
    const result = parseEmailBody(body, "unknown-merchant.example");
    expect(result!.amount).toBe(15.49);
  });

  it("resolves an App Store receipt to the underlying app, not 'Apple'", () => {
    const body = "Your receipt from Apple\nDisney+ (Monthly) $13.99\nSubscription Renewal Jan 10, 2026";
    const result = parseEmailBody(body, "apple.com");
    expect(result!.billedThrough).toBe("app_store");
    expect(result!.name).toBe("Disney+");
    expect(result!.amount).toBe(13.99);
  });

  it("resolves a Play Store receipt and marks it billedThrough play_store", () => {
    const body = "Google Play Order Receipt\nDuolingo (1 Year) $83.99";
    const result = parseEmailBody(body, "google.com");
    expect(result!.billedThrough).toBe("play_store");
    expect(result!.amount).toBe(83.99);
  });

  it("falls back to a domain-derived merchant name for an unrecognized biller", () => {
    const result = parseEmailBody("Your invoice: charged $9.99 for your monthly plan.", "some-saas-app.example");
    expect(result).not.toBeNull();
    expect(result!.serviceId).toBeUndefined();
    expect(result!.name.toLowerCase()).toContain("saas");
  });
});

describe("processResults", () => {
  it("collapses multiple receipts for the same service, inferring the cycle from the gap between charges", () => {
    const parsed = [
      { name: "Netflix", amount: 15.49, currency: "USD", billingCycle: "unknown" as const, lastCharged: "2026-01-15T00:00:00.000Z", nextRenewal: "2026-02-15T00:00:00.000Z", confidence: "low" as const, serviceId: "netflix", rawMerchant: "Netflix" },
      { name: "Netflix", amount: 15.49, currency: "USD", billingCycle: "unknown" as const, lastCharged: "2026-02-15T00:00:00.000Z", nextRenewal: "2026-03-15T00:00:00.000Z", confidence: "low" as const, serviceId: "netflix", rawMerchant: "Netflix" }
    ];
    const result = processResults(parsed);
    expect(result).toHaveLength(1);
    expect(result[0]!.billingCycle).toBe("monthly"); // ~30-day gap inferred
    expect(result[0]!.confidence).toBe("high");
    expect(result[0]!.lastCharged).toBe("2026-02-15T00:00:00.000Z"); // the latest charge
  });

  it("leaves a single receipt (no recurrence to confirm) as its best candidate, unmerged", () => {
    const parsed = [
      { name: "One-Off Co", amount: 40, currency: "USD", billingCycle: "unknown" as const, lastCharged: "2026-01-01T00:00:00.000Z", nextRenewal: "2026-02-01T00:00:00.000Z", confidence: "medium" as const, rawMerchant: "One-Off Co" }
    ];
    const result = processResults(parsed);
    expect(result).toHaveLength(1);
    expect(result[0]!.confidence).toBe("medium"); // not bumped to high — recurrence unconfirmed
  });

  it("sorts by confidence first, then by amount", () => {
    // Distinctive, deliberately-unreal names so enrichWithCatalogMatch's fuzzy
    // searchServices() lookup can't accidentally rename them via a substring match.
    const low = { name: "Zzq Not A Real Service Low", amount: 999, currency: "USD", billingCycle: "unknown" as const, lastCharged: "2026-01-01T00:00:00.000Z", nextRenewal: "", confidence: "low" as const, rawMerchant: "Zzq Not A Real Service Low" };
    const high = { name: "Zzq Not A Real Service High", amount: 5, currency: "USD", billingCycle: "unknown" as const, lastCharged: "2026-01-01T00:00:00.000Z", nextRenewal: "", confidence: "high" as const, rawMerchant: "Zzq Not A Real Service High" };
    const result = processResults([low, high]);
    expect(result.map((r) => r.name)).toEqual(["Zzq Not A Real Service High", "Zzq Not A Real Service Low"]);
  });
});

import { describe, expect, it, vi } from "vitest";

// Same module stubs as emailScanner.parse.test.ts: parsing never touches OAuth,
// crypto or storage, they only have to load.
vi.mock("expo-auth-session", () => ({ exchangeCodeAsync: vi.fn() }));
vi.mock("expo-auth-session/providers/google", () => ({ discovery: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "00000000-0000-0000-0000-000000000000" }));
vi.mock("../security/secure-store", () => ({
  getGmailAccountToken: vi.fn(),
  listGmailAddresses: vi.fn(),
  removeGmailAccount: vi.fn(),
  saveGmailAccount: vi.fn()
}));

const { knownBillingDomains, parseEmailBody } = await import("./emailScanner");

// P6.3: Stryker loosened or blanked these and no test noticed. The amount and the
// date are what the user's list is built from; the domain list decides whose
// receipts are always read.

describe("the known billing senders", () => {
  it("are unique, lowercase, well-formed domains (a blank or mistyped entry would match nothing)", () => {
    expect(knownBillingDomains.length).toBeGreaterThan(80);
    expect(new Set(knownBillingDomains).size).toBe(knownBillingDomains.length);
    for (const domain of knownBillingDomains) expect(domain).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);
  });

  it("a subdomain of a known sender counts as that sender", () => {
    expect(parseEmailBody("Your receipt $15.49", "mailer.netflix.com")?.name).toBe("Netflix");
  });
});

describe("amounts, in every form a receipt writes them", () => {
  it.each([
    ["€10,99 charged", 10.99],
    ["£8 per month", 8],
    ["₹1,299 renewal", 1299],
    ["USD 12.99 billed", 12.99],
    ["EUR12 renewal", 12],
    ["Charged 12.99 EUR today", 12.99],
    ["1.299,00 EUR this year", 1299],
    ["Total: 7.50", 7.5],
    ["amount: £4", 4],
    ["A payment of 3 was taken", 3],
    ["€2.500 annual licence", 2500]
  ])("%s", (body, amount) => {
    expect(parseEmailBody(body, "unknown-sender.example")?.amount).toBe(amount);
  });

  it("a whole number before a currency code is not an amount (a year, an order number)", () => {
    expect(parseEmailBody("Order 2026 USD", "unknown-sender.example")).toBeNull();
  });
});

describe("the charge date, in every form a receipt writes it", () => {
  it.each([
    ["Receipt $5 on 2026-03-15", "2026-03-15"],
    ["Receipt $5 on 03/15/2026", "2026-03-15"],
    ["Receipt $5 on March 15, 2026", "2026-03-15"],
    ["Receipt $5 on Mar 15 2026", "2026-03-15"],
    ["Receipt $5 on 15 Jan 2026", "2026-01-15"],
    // F21: an impossible day is skipped for the next real one.
    ["Receipt $5 on February 31, 2026, paid March 2, 2026", "2026-03-02"]
  ])("%s", (body, day) => {
    expect(parseEmailBody(body, "unknown-sender.example")?.lastCharged.slice(0, 10)).toBe(day);
  });
});

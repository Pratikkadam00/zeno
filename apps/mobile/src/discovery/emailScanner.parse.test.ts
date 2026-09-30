import { describe, expect, it, vi } from "vitest";

// Same module stubs as emailScanner.test.ts: parsing never touches OAuth,
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

const { parseEmailBody, processResults } = await import("./emailScanner");
type Parsed = NonNullable<ReturnType<typeof parseEmailBody>>;

describe("parseEmailBody — amounts", () => {
  it("a whole-number amount with no separators", () => {
    expect(parseEmailBody("Netflix receipt: $15", "netflix.com")?.amount).toBe(15);
  });

  it("a comma-grouped amount with no decimals ($1,299 is 1299, not 1.299)", () => {
    expect(parseEmailBody("Annual plan total $1,299", "adobe.com")?.amount).toBe(1299);
  });

  it("a zero amount is not an amount: the receipt is ignored", () => {
    expect(parseEmailBody("Your free trial started. Total $0.00", "netflix.com")).toBeNull();
  });

  it("when two amounts appear equally often, the larger wins", () => {
    expect(parseEmailBody("Plan $5.00 and add-on $9.00", "notion.so")?.amount).toBe(9);
  });
});

describe("parseEmailBody — billing cycle", () => {
  it("weekly when the body says so", () => {
    expect(parseEmailBody("Your weekly plan: $2.99", "calm.com")?.billingCycle).toBe("weekly");
  });

  it("monthly from the catalog's default MONTHLY price when the text is silent", () => {
    expect(parseEmailBody("Receipt. Total $15.49", "netflix.com")?.billingCycle).toBe("monthly");
  });

  it("annual from the catalog's default ANNUAL price when the text is silent", () => {
    expect(parseEmailBody("Receipt. Total $139.00", "speechify.com")?.billingCycle).toBe("annual");
  });

  it("unknown when neither the text nor the catalog says", () => {
    expect(parseEmailBody("Receipt. Total $3.21", "netflix.com")?.billingCycle).toBe("unknown");
  });
});

describe("parseEmailBody — dates", () => {
  it("skips a date-shaped string that does not parse and uses the next one", () => {
    const p = parseEmailBody("Ref 13/45/2026. Charged on 09/15/2026. $15.49 per month", "netflix.com")!;
    expect(p.lastCharged.slice(0, 10)).toBe(new Date(Date.parse("09/15/2026")).toISOString().slice(0, 10));
  });

  it("with no usable date, the charge date is 'now' and confidence drops below high", () => {
    vi.useFakeTimers({ now: new Date("2026-09-30T10:00:00Z"), toFake: ["Date"] });
    try {
      const p = parseEmailBody("Invoice 12, 2026 — $15.49 per month", "netflix.com")!;
      expect(p.lastCharged).toBe("2026-09-30T10:00:00.000Z");
      expect(p.confidence).toBe("medium");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("parseEmailBody — merchant resolution", () => {
  it("a catalog service plus a date gives high confidence and the catalog's cancel URL", () => {
    const p = parseEmailBody("Charged on September 5, 2026: $15.49 per month", "netflix.com")!;
    expect(p).toMatchObject({ name: "Netflix", serviceId: "netflix", confidence: "high" });
    expect(p.cancelUrl).toMatch(/^https:\/\//);
  });

  it("an unknown sender is named from its domain (medium confidence, raw merchant kept)", () => {
    const p = parseEmailBody("Thanks! Total $4.00 per month", "billing.zzqx-widgets.example")!;
    expect(p.serviceId).toBeUndefined();
    expect(p.name).toBe("Billing");
    expect(p.rawMerchant).toBe("Billing");
    expect(p.confidence).toBe("medium");
  });

  it("with no domain and nothing usable in the first line: 'Unknown subscription', low confidence", () => {
    const p = parseEmailBody("Receipt $5.00\nthanks", "")!;
    expect(p).toMatchObject({ name: "Unknown subscription", rawMerchant: "", confidence: "low", serviceId: undefined });
  });

  it("with no domain, the merchant comes from the first line's words (first 4, title-cased)", () => {
    const p = parseEmailBody("receipt from zzqx acme widgets deluxe edition $7.00\r\nbody text", "")!;
    expect(p.rawMerchant).toBe("Zzqx Acme Widgets Deluxe");
  });
});

describe("parseEmailBody — App Store / Play Store receipts", () => {
  it("an App Store receipt for an app the catalog knows → that app, high confidence, the catalog's cancel URL", () => {
    const p = parseEmailBody("App Store receipt\nNetflix (Monthly) $15.49", "apple.com")!;
    expect(p).toMatchObject({ billedThrough: "app_store", name: "Netflix", serviceId: "netflix", confidence: "high", rawMerchant: "Netflix", billingCycle: "monthly" });
    expect(p.cancelUrl).toMatch(/^https:\/\//);
  });

  it("a store receipt naming an app the catalog does NOT know → that name, medium confidence", () => {
    const p = parseEmailBody("Google Play: Zzqxgram Pro (Monthly) $3.99", "google.com")!;
    expect(p).toMatchObject({ billedThrough: "play_store", name: "Zzqxgram Pro", rawMerchant: "Zzqxgram Pro", confidence: "medium", serviceId: undefined });
  });

  it("an App Store receipt whose app name cannot be read → 'App Store subscription', low confidence", () => {
    const p = parseEmailBody("App Store: your subscription renewed. $4.99", "apple.com")!;
    expect(p).toMatchObject({ billedThrough: "app_store", name: "App Store subscription", rawMerchant: "App Store subscription", confidence: "low" });
  });

  it("a Google Play receipt with no readable app name → 'Play Store subscription', low confidence", () => {
    const p = parseEmailBody("Google Play order receipt $2.99", "google.com")!;
    expect(p.billedThrough).toBe("play_store");
    expect(p.name).toBe("Play Store subscription");
    expect(p.confidence).toBe("low");
    expect(p.rawMerchant).toBe("Play Store subscription");
  });
});

const base = (over: Partial<Parsed>): Parsed => ({
  name: "Zzqx Widgets",
  amount: 5,
  currency: "USD",
  billingCycle: "unknown",
  lastCharged: "2026-09-01T00:00:00.000Z",
  nextRenewal: "2026-10-01T00:00:00.000Z",
  confidence: "medium",
  rawMerchant: "Zzqx Widgets",
  ...over
});

describe("processResults — grouping and catalog enrichment", () => {
  it("receipts whose dates are unusable are not collapsed into a cadence (the best one is kept)", () => {
    const out = processResults([base({ lastCharged: "not-a-date", amount: 5 }), base({ lastCharged: "also-bad", amount: 6 })]);
    expect(out).toHaveLength(1);
    expect(out[0]!.amount).toBe(6);
    expect(out[0]!.billingCycle).toBe("unknown");
  });

  it("an entry with a known serviceId is normalised to the catalog's name and cancel URL", () => {
    const [out] = processResults([base({ serviceId: "netflix", name: "NETFLIX.COM", cancelUrl: "https://phish.example" })]);
    expect(out).toMatchObject({ serviceId: "netflix", name: "Netflix" });
    expect(out!.cancelUrl).not.toBe("https://phish.example");
  });

  it("an entry whose serviceId is not in the catalog is left exactly as parsed", () => {
    const entry = base({ serviceId: "zzqx-not-a-service", name: "Zzqx" });
    expect(processResults([entry])[0]).toEqual(entry);
  });

  it("an entry without a serviceId is matched to the catalog by name", () => {
    const [out] = processResults([base({ name: "Spotify", rawMerchant: "Spotify" })]);
    expect(out!.serviceId).toBeDefined();
    expect(out!.name.toLowerCase()).toContain("spotify");
  });
});

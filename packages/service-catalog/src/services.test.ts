import { describe, expect, it } from "vitest";
import {
  findServiceBySlug,
  isGeneralCancelGuide,
  parsePriceToMinorUnits,
  getPopularServices,
  getServiceById,
  getServiceBySlug,
  getServicesByCategory,
  parseExpansionRows,
  parseRequestedRows,
  searchServiceRecords,
  searchServices,
  serviceRecords,
  services,
  toServiceRecord,
  toSubscriptionCategory,
  uniqueBySlug,
  type Service
} from "./services";

/**
 * The service catalog: invariants over EVERY entry (it is the data behind 509
 * public cancel-guide pages and the app's cancel flow), the row parsers'
 * malformed-row guards, search ranking, lookups, and record conversion.
 */
const DIFFICULTIES = new Set(["easy", "medium", "hard", "dark_pattern"]);
const CATEGORIES = new Set(["streaming", "ai_tools", "productivity", "gaming", "health", "finance", "education", "music", "cloud", "security", "other"]);
const PALETTE = new Set(["#2563EB", "#7C3AED", "#0D9488", "#F59E0B", "#EF4444", "#15803D", "#F43F5E", "#64748B"]);

describe("catalog invariants — every one of the entries", () => {
  it("has exactly 509 entries (the figure the website and app state)", () => {
    expect(services).toHaveLength(509);
    expect(serviceRecords).toHaveLength(509);
  });

  it("every slug is lowercase-kebab, unique, and equals the id", () => {
    const seen = new Set<string>();
    for (const s of services) {
      expect(s.slug, s.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(s.id, s.name).toBe(s.slug);
      expect(seen.has(s.slug), `duplicate slug ${s.slug}`).toBe(false);
      seen.add(s.slug);
    }
  });

  it("every website and cancel link is an https URL with a real hostname (no http, no javascript:, no relative paths)", () => {
    for (const s of services) {
      for (const [field, value] of [["website", s.website], ["cancelUrl", s.cancelUrl]] as const) {
        const url = new URL(value);
        expect(url.protocol, `${s.slug}.${field}`).toBe("https:");
        expect(url.hostname, `${s.slug}.${field}`).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);
        expect(url.username + url.password, `${s.slug}.${field} has credentials`).toBe("");
      }
    }
  });

  it("difficulty and category are always valid enum values", () => {
    for (const s of services) {
      expect(DIFFICULTIES.has(s.cancelDifficulty), `${s.slug}: ${s.cancelDifficulty}`).toBe(true);
      expect(CATEGORIES.has(s.category), `${s.slug}: ${s.category}`).toBe(true);
    }
  });

  it("prices are null or positive with at most 2 decimals (so minor units are exact)", () => {
    for (const s of services) {
      for (const [field, price] of [["monthly", s.defaultMonthlyPrice], ["annual", s.defaultAnnualPrice]] as const) {
        if (price === null) continue;
        expect(Number.isFinite(price) && price > 0, `${s.slug} ${field}=${price}`).toBe(true);
        expect(Math.round(price * 100) / 100, `${s.slug} ${field}=${price} has >2 decimals`).toBe(price);
      }
    }
  });

  // F171: 39 guides have steps written for their service; the rest are the
  // five general steps with the name filled in. The site says which (D16).
  it("tells a general guide from a researched one: 470 general, 39 researched, and the name alone doesn't make one researched", () => {
    const general = services.filter((s) => isGeneralCancelGuide(s.name, s.cancelGuide));
    expect(general.length).toBe(470);
    expect(services.length - general.length).toBe(39);
    expect(isGeneralCancelGuide("Netflix", findServiceBySlug("netflix")!.cancellationGuideSteps)).toBe(false);
    const twitch = services.find((s) => s.slug === "twitch")!;
    expect(isGeneralCancelGuide(twitch.name, twitch.cancelGuide)).toBe(true);
    // One step changed, or one step fewer: no longer the general guide.
    expect(isGeneralCancelGuide(twitch.name, [...twitch.cancelGuide.slice(0, -1), "Call them"])).toBe(false);
    expect(isGeneralCancelGuide(twitch.name, twitch.cancelGuide.slice(0, -1))).toBe(false);
  });

  it("every entry has a non-empty cancel guide of non-empty steps, and a palette colour", () => {
    for (const s of services) {
      expect(s.cancelGuide.length, s.slug).toBeGreaterThan(0);
      for (const step of s.cancelGuide) expect(step.trim().length, s.slug).toBeGreaterThan(0);
      expect(PALETTE.has(s.logoColor), s.slug).toBe(true);
    }
  });

  // ZAP's passive "Source Code Disclosure - SQL" pattern (rule 10099,
  // zap-extensions SourceCodeDisclosureScanRule). Plain English can trip it:
  // "Select a cancellation reason from dropdown" failed the nightly DAST gate
  // as a Medium (P4.5). Guide steps are written so it can't.
  it("no step reads as SQL to ZAP's source-code-disclosure check", () => {
    const zapSql = /select\s+[a-z0-9., "'()*]+\s+from\s+[a-z0-9._, ]+/im;
    expect(zapSql.test("Select a cancellation reason from dropdown")).toBe(true);
    for (const s of services) for (const step of s.cancelGuide) expect(zapSql.test(step), `${s.slug}: ${step}`).toBe(false);
  });

  it("every record converts with a svc_ id and matching fields", () => {
    for (const r of serviceRecords) {
      expect(r.id).toBe(`svc_${r.slug}`);
      expect(r.cancellationGuideSteps.length).toBeGreaterThan(0);
    }
  });

  it("every 'popular' id exists (a missing one would silently vanish from the list)", () => {
    expect(getPopularServices().map((s) => s.id)).toEqual([
      "netflix", "spotify", "chatgpt-plus", "midjourney", "adobe-creative-cloud", "notion",
      "github-copilot", "figma", "claude-pro", "cursor-pro", "discord-nitro", "youtube-premium"
    ]);
  });
});

describe("row parsers", () => {
  it("a curated row with a missing required field is rejected loudly", () => {
    expect(() => parseRequestedRows("Name Only|slug-only")).toThrow("Invalid service catalog row: Name Only|slug-only");
  });

  it("a curated row parses prices ('null' and garbage become null) and picks up a guide override", () => {
    const [row] = parseRequestedRows("Netflix|netflix|https://www.netflix.com|https://www.netflix.com/cancelplan|dark_pattern|streaming|15.49|null");
    expect(row).toMatchObject({ slug: "netflix", defaultMonthlyPrice: 15.49, defaultAnnualPrice: null });
    expect(row!.cancelGuide?.length).toBeGreaterThan(0);
    const [junk] = parseRequestedRows("Zzqx|zzqx|https://zzqx.example|https://zzqx.example/c|easy|other|abc|");
    expect(junk).toMatchObject({ defaultMonthlyPrice: null, defaultAnnualPrice: null });
    expect(junk!.cancelGuide).toBeUndefined();
  });

  it("an expansion row with a missing field is rejected; a valid one gets the generated account link (see finding F25)", () => {
    expect(() => parseExpansionRows("Only a name")).toThrow("Invalid service catalog expansion row: Only a name");
    expect(parseExpansionRows("Zzqx|other|https://zzqx.example/|4.00")[0]).toEqual({
      name: "Zzqx",
      website: "https://zzqx.example/",
      cancelUrl: "https://zzqx.example/account",
      cancelDifficulty: "medium",
      category: "other",
      defaultMonthlyPrice: 4,
      defaultAnnualPrice: null
    });
  });

  it("blank lines are ignored", () => {
    expect(parseExpansionRows("\n\nA|other|https://a.example|1\n\n")).toHaveLength(1);
  });

  it("uniqueBySlug keeps the FIRST entry for a slug", () => {
    const a = { ...services[0]!, name: "first" } as Service;
    const b = { ...services[0]!, name: "second" } as Service;
    expect(uniqueBySlug([a, b]).map((s) => s.name)).toEqual(["first"]);
  });
});

describe("search", () => {
  it("an empty query returns the first 20 entries, or `limit` of them", () => {
    expect(searchServices("")).toHaveLength(20);
    expect(searchServices("", 3)).toEqual(services.slice(0, 3));
  });

  it("ranks exact name/slug above prefix, above substring, above fuzzy; ties by name", () => {
    expect(searchServices("netflix")[0]?.id).toBe("netflix");
    expect(searchServices("NETFLIX")[0]?.id).toBe("netflix");
    const prefix = searchServices("spot");
    expect(prefix[0]!.name.toLowerCase().startsWith("spot")).toBe(true);
    const names = searchServices("ai_tools", 50).map((s) => s.category);
    expect(names.every((c) => c === "ai_tools")).toBe(true);
    expect(searchServices("ntflx", 1)[0]?.id).toBe("netflix");
  });

  it("equal scores are ordered alphabetically by name", () => {
    // Searching a category name scores every entry in that category the same
    // (substring of the haystack), as long as no name starts with it.
    const gaming = getServicesByCategory("gaming");
    expect(gaming.length).toBeGreaterThan(2);
    expect(gaming.some((s) => s.name.toLowerCase().startsWith("gaming"))).toBe(false);
    const found = searchServices("gaming", 500).filter((s) => s.category === "gaming").map((s) => s.name);
    expect(found).toEqual([...found].sort((a, b) => a.localeCompare(b)));
    expect(found).toHaveLength(gaming.length);
  });

  it("no match returns nothing; the default limit is 15", () => {
    expect(searchServices("zzzzqqqqxxxx")).toEqual([]);
    expect(searchServices("a").length).toBeLessThanOrEqual(15);
    expect(searchServices("a").length).toBe(15);
  });

  it("searchServiceRecords returns records, default limit 10", () => {
    const r = searchServiceRecords("a");
    expect(r).toHaveLength(10);
    expect(r[0]!.id).toMatch(/^svc_/);
    expect(searchServiceRecords("netflix", 1)[0]?.slug).toBe("netflix");
  });
});

describe("lookups", () => {
  it("by id, by slug, by category; unknown ids return undefined", () => {
    expect(getServiceById("netflix")?.name).toBe("Netflix");
    expect(getServiceById("zzqx-none")).toBeUndefined();
    expect(getServiceBySlug("spotify")?.name).toBe("Spotify");
    expect(findServiceBySlug("zzqx-none")).toBeUndefined();
    expect(findServiceBySlug("netflix")?.id).toBe("svc_netflix");
    const streaming = getServicesByCategory("streaming");
    expect(streaming.length).toBeGreaterThan(0);
    expect(streaming.every((s) => s.category === "streaming")).toBe(true);
  });

  it("maps every catalog category to an app category", () => {
    expect(toSubscriptionCategory("music")).toBe("entertainment");
    expect(toSubscriptionCategory("security")).toBe("productivity");
    expect(toSubscriptionCategory("other")).toBe("other");
  });
});

describe("toServiceRecord optional fields", () => {
  const base = services.find((s) => s.defaultMonthlyPrice === null && s.defaultAnnualPrice === null) ?? services[0]!;

  it("includes support contact parts only when present, and free-trial days even when 0", () => {
    const withBoth = toServiceRecord({ ...base, supportEmail: "help@x.example", supportPhone: "+1-555-0100", freeTrialDays: 0 });
    expect(withBoth.supportContact).toEqual({ email: "help@x.example", phone: "+1-555-0100" });
    expect(withBoth.freeTrialDays).toBe(0);
    expect(toServiceRecord({ ...base, supportEmail: "help@x.example", supportPhone: null }).supportContact).toEqual({ email: "help@x.example" });
    expect(toServiceRecord({ ...base, supportEmail: null, supportPhone: "+1-555-0100" }).supportContact).toEqual({ phone: "+1-555-0100" });
    const none = toServiceRecord({ ...base, supportEmail: null, supportPhone: null, freeTrialDays: null });
    expect(none).not.toHaveProperty("supportContact");
    expect(none).not.toHaveProperty("freeTrialDays");
  });

  it("prices become exact USD minor units; absent prices are omitted", () => {
    const priced = toServiceRecord({ ...base, defaultMonthlyPrice: 15.49, defaultAnnualPrice: 139 });
    expect(priced.defaultMonthlyPrice).toEqual({ amountMinor: 1549, currency: "USD" });
    expect(priced.defaultAnnualPrice).toEqual({ amountMinor: 13900, currency: "USD" });
    const unpriced = toServiceRecord({ ...base, defaultMonthlyPrice: null, defaultAnnualPrice: null });
    expect(unpriced).not.toHaveProperty("defaultMonthlyPrice");
    expect(unpriced).not.toHaveProperty("defaultAnnualPrice");
  });
});

describe("parsePriceToMinorUnits edge forms", () => {
  it("a leading-dot price has a zero whole part", () => {
    expect(parsePriceToMinorUnits(".5")).toBe(50);
    expect(parsePriceToMinorUnits(".99")).toBe(99);
  });

  it("a negative price stays negative, exactly", () => {
    expect(parsePriceToMinorUnits("-12.50")).toBe(-1250);
    expect(parsePriceToMinorUnits(-0.5)).toBe(-50);
    expect(parsePriceToMinorUnits("  7.1 ")).toBe(710);
  });
});

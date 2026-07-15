import type { Subscription } from "@zeno/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hydrateNotificationSettings,
  hydratePriceHistory,
  normalizeCoachConsent,
  normalizeHomeCurrency,
  normalizeQuietHours,
  parseCachedRates
} from "./subscription-hydration";

// The store hydrates from raw strings in the encrypted app_meta table; these
// helpers must survive missing / legacy / corrupt rows without throwing at boot,
// and — for consent — must never read a bad value as permission to transmit.

const DEFAULT_QUIET = { enabled: false, startHour: 22, endHour: 8 } as const;
const DEFAULT_SETTINGS = { sevenDay: true, threeDay: true, dayOf: true } as const;

function makeSubscription(id: string, overrides: Partial<Subscription> = {}): Subscription {
  return {
    id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    name: `Service ${id}`,
    category: "entertainment",
    price: { amountMinor: 1549, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "profile_local",
    source: "manual",
    ...overrides
  };
}

// Corrupt-row branches log a warn by design; silence it so test output stays clean.
let warnSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
});

describe("normalizeQuietHours", () => {
  it("returns the defaults (same reference) when nothing is stored", () => {
    expect(normalizeQuietHours(null, DEFAULT_QUIET)).toBe(DEFAULT_QUIET);
    expect(normalizeQuietHours(undefined, DEFAULT_QUIET)).toBe(DEFAULT_QUIET);
    expect(normalizeQuietHours("", DEFAULT_QUIET)).toBe(DEFAULT_QUIET);
  });

  it("merges a partial stored value over the defaults", () => {
    expect(normalizeQuietHours(JSON.stringify({ enabled: true, startHour: 23 }), DEFAULT_QUIET))
      .toEqual({ enabled: true, startHour: 23, endHour: 8 });
  });

  it("falls back to the defaults on corrupt JSON (never throws at boot)", () => {
    expect(normalizeQuietHours("{not json", DEFAULT_QUIET)).toBe(DEFAULT_QUIET);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("normalizeHomeCurrency", () => {
  it("accepts a valid ISO currency code", () => {
    expect(normalizeHomeCurrency("EUR", "USD")).toBe("EUR");
  });

  it("rejects an unsupported/corrupt code and keeps the default", () => {
    expect(normalizeHomeCurrency("XYZ", "USD")).toBe("USD");
    expect(normalizeHomeCurrency("", "USD")).toBe("USD");
    expect(normalizeHomeCurrency(null, "USD")).toBe("USD");
  });
});

describe("normalizeCoachConsent — privacy-critical", () => {
  it("passes through only the two real decisions", () => {
    expect(normalizeCoachConsent("granted")).toBe("granted");
    expect(normalizeCoachConsent("declined")).toBe("declined");
  });

  it("treats missing / 'unset' / corrupt / legacy values as 'unset' (never as consent)", () => {
    expect(normalizeCoachConsent(null)).toBe("unset");
    expect(normalizeCoachConsent(undefined)).toBe("unset");
    expect(normalizeCoachConsent("unset")).toBe("unset");
    expect(normalizeCoachConsent("")).toBe("unset");
    // A corrupt or legacy row must NOT be read as permission to transmit.
    expect(normalizeCoachConsent("GRANTED")).toBe("unset");
    expect(normalizeCoachConsent("true")).toBe("unset");
    expect(normalizeCoachConsent("yes")).toBe("unset");
  });
});

describe("parseCachedRates", () => {
  it("returns null when nothing is stored", () => {
    expect(parseCachedRates(null)).toBeNull();
    expect(parseCachedRates(undefined)).toBeNull();
    expect(parseCachedRates("")).toBeNull();
  });

  it("parses a valid cached table", () => {
    const cached = { rates: { USD: 1, EUR: 0.92 }, fetchedAt: "2026-07-01T00:00:00.000Z" };
    expect(parseCachedRates(JSON.stringify(cached))).toEqual(cached);
  });

  it("returns null on corrupt JSON", () => {
    expect(parseCachedRates("{oops")).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("hydrateNotificationSettings", () => {
  it("gives every persisted subscription the default when nothing is stored", () => {
    const subs = [makeSubscription("a"), makeSubscription("b")];
    expect(hydrateNotificationSettings(subs, null, DEFAULT_SETTINGS)).toEqual({
      a: DEFAULT_SETTINGS,
      b: DEFAULT_SETTINGS
    });
  });

  it("restores stored entries and backfills the default for any missing one", () => {
    const subs = [makeSubscription("a"), makeSubscription("b")];
    const custom = { sevenDay: false, threeDay: false, dayOf: true };
    const stored = JSON.stringify({ a: custom }); // b has no saved entry
    expect(hydrateNotificationSettings(subs, stored, DEFAULT_SETTINGS)).toEqual({
      a: custom,
      b: DEFAULT_SETTINGS
    });
  });

  it("drops stored entries for subscriptions that no longer exist", () => {
    const subs = [makeSubscription("a")];
    const stored = JSON.stringify({ a: DEFAULT_SETTINGS, deleted: DEFAULT_SETTINGS });
    const result = hydrateNotificationSettings(subs, stored, DEFAULT_SETTINGS);
    expect(Object.keys(result)).toEqual(["a"]);
  });

  it("uses defaults for everyone on corrupt JSON, still covering every subscription", () => {
    const subs = [makeSubscription("a"), makeSubscription("b")];
    expect(hydrateNotificationSettings(subs, "{bad", DEFAULT_SETTINGS)).toEqual({
      a: DEFAULT_SETTINGS,
      b: DEFAULT_SETTINGS
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns an empty map when there are no subscriptions", () => {
    expect(hydrateNotificationSettings([], JSON.stringify({ ghost: DEFAULT_SETTINGS }), DEFAULT_SETTINGS)).toEqual({});
  });
});

describe("hydratePriceHistory", () => {
  it("seeds a baseline point (current price at createdAt) for a subscription with no stored history", () => {
    const sub = makeSubscription("a", { createdAt: "2026-02-02T00:00:00.000Z", price: { amountMinor: 999, currency: "USD" } });
    expect(hydratePriceHistory([sub], null)).toEqual({
      a: [{ at: "2026-02-02T00:00:00.000Z", amountMinor: 999 }]
    });
  });

  it("restores stored history and seeds only the subscriptions that lack one", () => {
    const a = makeSubscription("a");
    const b = makeSubscription("b", { createdAt: "2026-03-03T00:00:00.000Z", price: { amountMinor: 500, currency: "USD" } });
    const history = [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 1549 }, { at: "2026-06-01T00:00:00.000Z", amountMinor: 1799 }];
    const stored = JSON.stringify({ a: history }); // b has none
    expect(hydratePriceHistory([a, b], stored)).toEqual({
      a: history,
      b: [{ at: "2026-03-03T00:00:00.000Z", amountMinor: 500 }]
    });
  });

  it("reseeds baselines for everyone on corrupt JSON", () => {
    const sub = makeSubscription("a", { price: { amountMinor: 250, currency: "USD" } });
    expect(hydratePriceHistory([sub], "nope")).toEqual({
      a: [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 250 }]
    });
    expect(warnSpy).toHaveBeenCalled();
  });
});

import { findServiceBySlug } from "@zeno/service-catalog";
import { CURRENCY_CODES, type Subscription } from "@zeno/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDaysRemaining } from "../utils/subscription-ui";

// The seed computes its dates once, at import ("first launch"), so each case
// pins the clock and re-imports the module fresh.
async function seedAt(launchIso: string): Promise<Subscription[]> {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(launchIso));
  vi.resetModules();
  const { seedSubscriptions } = await import("./seed-subscriptions");
  return seedSubscriptions;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("seedSubscriptions (demo data)", () => {
  it("is five distinct, clearly-marked demo subscriptions", async () => {
    const seed = await seedAt("2026-06-15T10:00:00.000Z");
    expect(seed).toHaveLength(5);
    expect(new Set(seed.map((item) => item.id)).size).toBe(5);
    for (const item of seed) {
      expect(item.source, item.id).toBe("seed");
      expect(item.status, item.id).toBe("active");
      expect(item.version, item.id).toBe(1);
      expect(item.billingCycle, item.id).toBe("monthly");
    }
  });

  it("prices every subscription as a positive integer amount of minor units in a supported currency", async () => {
    for (const item of await seedAt("2026-06-15T10:00:00.000Z")) {
      expect(Number.isInteger(item.price.amountMinor), item.id).toBe(true);
      expect(item.price.amountMinor, item.id).toBeGreaterThan(0);
      expect(CURRENCY_CODES, item.id).toContain(item.price.currency);
    }
  });

  it("dates creation two months before launch", async () => {
    for (const item of await seedAt("2026-06-15T10:00:00.000Z")) {
      expect(item.createdAt, item.id).toBe("2026-04-15T10:00:00.000Z");
      expect(item.updatedAt, item.id).toBe(item.createdAt);
    }
  });

  it("keeps creation in the past even when 'two months ago' has no such day", async () => {
    // Apr 30 minus two months is "Feb 30", which Date rolls to Mar 2 — still
    // before launch, which is the invariant that matters for price history.
    const launch = Date.parse("2026-04-30T10:00:00.000Z");
    for (const item of await seedAt("2026-04-30T10:00:00.000Z")) {
      expect(Date.parse(item.createdAt), item.id).toBeLessThan(launch);
    }
  });

  it("schedules renewals 1-14 UTC days after launch at 09:00 UTC, so no demo badge starts as a stale TODAY", async () => {
    for (const launchIso of ["2026-06-15T10:00:00.000Z", "2026-12-31T23:30:00.000Z", "2027-02-27T00:15:00.000Z"]) {
      const seed = await seedAt(launchIso);
      const launch = Date.parse(launchIso);
      expect(seed.map((item) => getDaysRemaining(item.nextRenewalDate)), launchIso).toEqual([2, 5, 1, 9, 14]);
      for (const item of seed) {
        const renewal = item.nextRenewalDate ?? "";
        expect(renewal.slice(10), `${launchIso} ${item.id}`).toBe("T09:00:00.000Z");
        expect(Date.parse(renewal), `${launchIso} ${item.id}`).toBeGreaterThan(launch);
      }
    }
  });

  // Regression: "duolingo-super" is not a catalog slug (the catalog's entry is
  // "duolingo-plus"; Super is Duolingo's current name for the same plan), so
  // the demo Duolingo's detail and cancel screens found no service at all.
  it("links every seed subscription to a real catalog service", async () => {
    for (const item of await seedAt("2026-06-15T10:00:00.000Z")) {
      expect(item.serviceSlug, item.id).toBeDefined();
      expect(findServiceBySlug(item.serviceSlug ?? ""), `${item.id} -> ${item.serviceSlug}`).toBeDefined();
    }
  });
});

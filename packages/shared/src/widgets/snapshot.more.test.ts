import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createWidgetSnapshot } from "./snapshot";

const NOW = new Date("2026-09-30T12:00:00.000Z");

function sub(input: Partial<Subscription> & Pick<Subscription, "id">): Subscription {
  return {
    name: input.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    category: "other",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "p",
    source: "manual",
    ...input
  };
}

describe("createWidgetSnapshot — empty states", () => {
  it("reports no renewals and zero spend when nothing is active", () => {
    const snapshot = createWidgetSnapshot([sub({ id: "gone", status: "cancelled", nextRenewalDate: "2026-10-01T00:00:00.000Z" })], NOW);
    expect(snapshot).toEqual({
      generatedAt: NOW.toISOString(),
      monthlySpendLabel: "$0.00",
      activeCount: 0,
      watchComplicationText: "No renewals"
    });
  });
});

describe("createWidgetSnapshot — monthly spend label (currency honesty)", () => {
  it("labels an all-USD portfolio in USD without fx", () => {
    const snapshot = createWidgetSnapshot([sub({ id: "a", price: { amountMinor: 1549, currency: "USD" } }), sub({ id: "b", price: { amountMinor: 4648, currency: "USD" } })], NOW);
    expect(snapshot.monthlySpendLabel).toBe("$61.97");
    expect(snapshot.activeCount).toBe(2);
  });

  it("labels a single non-USD currency in that currency without fx", () => {
    // Before the fix: "$499.00" for ₹499 of spend.
    const snapshot = createWidgetSnapshot([sub({ id: "a", price: { amountMinor: 49900, currency: "INR" } })], NOW);
    expect(snapshot.monthlySpendLabel).toBe("₹499.00");
  });

  it("lists each currency separately without fx instead of adding raw minor units across them", () => {
    // Before the fix: 1000 US cents + 49900 paise = "$509.00".
    const snapshot = createWidgetSnapshot([
      sub({ id: "u", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "i", price: { amountMinor: 49900, currency: "INR" } }),
      sub({ id: "u2", price: { amountMinor: 500, currency: "USD" } })
    ], NOW);
    expect(snapshot.monthlySpendLabel).toBe("$15.00 + ₹499.00");
  });

  it("ignores zero-cost (trial) subscriptions when choosing the label's currencies", () => {
    const snapshot = createWidgetSnapshot([
      sub({ id: "t", billingCycle: "trial", price: { amountMinor: 0, currency: "INR" } }),
      sub({ id: "u", price: { amountMinor: 1000, currency: "USD" } })
    ], NOW);
    expect(snapshot.monthlySpendLabel).toBe("$10.00");
  });

  it("converts into the home currency with fx and discloses how many subscriptions had no rate", () => {
    const snapshot = createWidgetSnapshot([
      sub({ id: "u", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "i", price: { amountMinor: 9500, currency: "INR" } }),
      sub({ id: "g", price: { amountMinor: 500, currency: "GBP" } })
    ], NOW, { homeCurrency: "USD", rates: { USD: 1, INR: 95 } });
    expect(snapshot.monthlySpendLabel).toBe("$11.00");
    expect(snapshot.excludedCurrencyCount).toBe(1);
  });

  it("omits the exclusion count without fx (nothing is excluded there)", () => {
    expect("excludedCurrencyCount" in createWidgetSnapshot([sub({ id: "a" })], NOW)).toBe(false);
  });
});

describe("createWidgetSnapshot — next renewal", () => {
  it("picks the soonest active renewal and labels its amount in its own currency", () => {
    const snapshot = createWidgetSnapshot([
      sub({ id: "later", nextRenewalDate: "2026-10-20T00:00:00.000Z" }),
      sub({ id: "soon", name: "Hotstar", price: { amountMinor: 29900, currency: "INR" }, nextRenewalDate: "2026-10-05T12:00:00.000Z" }),
      sub({ id: "undated" }),
      sub({ id: "latest", nextRenewalDate: "2026-11-01T00:00:00.000Z" })
    ], NOW);
    expect(snapshot.nextRenewal).toEqual({
      subscriptionId: "soon",
      name: "Hotstar",
      amountLabel: "₹299.00",
      dueAt: "2026-10-05T12:00:00.000Z",
      daysUntil: 5
    });
    expect(snapshot.watchComplicationText).toBe("Hotstar 5d");
  });

  it("reads an overdue renewal as today, never a negative count", () => {
    const snapshot = createWidgetSnapshot([sub({ id: "late", name: "Late", nextRenewalDate: "2026-09-25T00:00:00.000Z" })], NOW);
    expect(snapshot.nextRenewal?.daysUntil).toBe(0);
    expect(snapshot.watchComplicationText).toBe("Late today");
  });

  it("skips a renewal date it cannot parse instead of showing it as next with \"NaNd\"", () => {
    // Before the fix the NaN comparator left the bad row first, so the widget
    // read "Broken NaNd" and nextRenewal.daysUntil was NaN.
    const snapshot = createWidgetSnapshot([
      sub({ id: "bad", name: "Broken", nextRenewalDate: "not a date" }),
      sub({ id: "good", name: "Good", nextRenewalDate: "2026-10-03T12:00:00.000Z" })
    ], NOW);
    expect(snapshot.nextRenewal?.subscriptionId).toBe("good");
    expect(snapshot.watchComplicationText).toBe("Good 3d");
  });

  it("reports no renewals when the only dated subscription has an unparseable date", () => {
    const snapshot = createWidgetSnapshot([sub({ id: "bad", nextRenewalDate: "soon" })], NOW);
    expect(snapshot.watchComplicationText).toBe("No renewals");
    expect("nextRenewal" in snapshot).toBe(false);
  });
});

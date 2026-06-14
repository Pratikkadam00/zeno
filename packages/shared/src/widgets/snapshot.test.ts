import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createWidgetSnapshot } from "./snapshot";

describe("widget snapshot", () => {
  it("creates compact next-renewal data for widgets and watch complications", () => {
    const subscriptions: Subscription[] = [{
      id: "sub_next",
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
      version: 1,
      name: "Adobe",
      category: "productivity",
      price: { amountMinor: 5499, currency: "USD" },
      billingCycle: "monthly",
      nextRenewalDate: "2026-05-27T00:00:00.000Z",
      status: "active",
      ownerProfileId: "profile_local",
      source: "manual"
    }];

    const snapshot = createWidgetSnapshot(subscriptions, new Date("2026-05-24T00:00:00.000Z"));
    expect(snapshot.nextRenewal?.daysUntil).toBe(3);
    expect(snapshot.watchComplicationText).toBe("Adobe 3d");
  });

  it("treats a renewal less than a day away as today", () => {
    const subscriptions: Subscription[] = [{
      id: "sub_soon",
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
      version: 1,
      name: "Netflix",
      category: "entertainment",
      price: { amountMinor: 1599, currency: "USD" },
      billingCycle: "monthly",
      // ~23 hours away — previously rounded up to "1d".
      nextRenewalDate: "2026-05-24T23:00:00.000Z",
      status: "active",
      ownerProfileId: "profile_local",
      source: "manual"
    }];

    const snapshot = createWidgetSnapshot(subscriptions, new Date("2026-05-24T00:00:00.000Z"));
    expect(snapshot.nextRenewal?.daysUntil).toBe(0);
    expect(snapshot.watchComplicationText).toBe("Netflix today");
  });
});

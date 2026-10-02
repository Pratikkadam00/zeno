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

  it("P3 gate (F158): a renewal dated tomorrow reads 1d, not today, even when it is under 24 hours away", () => {
    const subscriptions: Subscription[] = [{
      id: "sub_tomorrow",
      createdAt: "2026-10-02T05:36:00.000Z",
      updatedAt: "2026-10-02T05:36:00.000Z",
      version: 1,
      name: "Figma",
      category: "productivity",
      price: { amountMinor: 1500, currency: "USD" },
      billingCycle: "monthly",
      // Seen on the emulator: generated 05:36 on Oct 2, the renewal on Oct 3.
      nextRenewalDate: "2026-10-03T05:00:00.000Z",
      status: "active",
      ownerProfileId: "profile_local",
      source: "manual"
    }];

    const snapshot = createWidgetSnapshot(subscriptions, new Date("2026-10-02T05:36:21.736Z"));
    expect(snapshot.nextRenewal?.daysUntil).toBe(1);
    expect(snapshot.watchComplicationText).toBe("Figma 1d");
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

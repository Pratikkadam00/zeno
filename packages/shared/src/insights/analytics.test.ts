import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createAnalyticsSnapshot } from "./analytics";

describe("analytics snapshot", () => {
  it("computes monthly, annualized, and renewal metrics", () => {
    const subscriptions: Subscription[] = [
      {
        id: "sub_1",
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
        version: 1,
        name: "Adobe",
        category: "productivity",
        price: { amountMinor: 5499, currency: "USD" },
        billingCycle: "monthly",
        nextRenewalDate: "2026-06-01T00:00:00.000Z",
        status: "active",
        ownerProfileId: "profile_local",
        valueRating: "low",
        source: "manual"
      }
    ];

    const snapshot = createAnalyticsSnapshot(subscriptions, new Date("2026-05-24T00:00:00.000Z"));
    expect(snapshot.annualizedSpendMinor).toBe(65988);
    expect(snapshot.renewalLoadNext30Days).toBe(1);
    expect(snapshot.cancellationOpportunityMinor).toBe(5499);
  });
});

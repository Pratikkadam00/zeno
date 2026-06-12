import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createFamilyVaultSummary, demoFamilyMembers } from "./vault";

describe("family vault", () => {
  it("summarizes subscriptions by owner", () => {
    const subscriptions: Subscription[] = [
      {
        id: "sub_1",
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
        version: 1,
        name: "Netflix",
        category: "entertainment",
        price: { amountMinor: 1549, currency: "USD" },
        billingCycle: "monthly",
        status: "active",
        ownerProfileId: "profile_local",
        source: "manual"
      }
    ];

    const summary = createFamilyVaultSummary(demoFamilyMembers, subscriptions);
    expect(summary.members[0]?.subscriptionCount).toBe(1);
    expect(summary.totalMonthlySpend.amountMinor).toBe(1549);
  });
});

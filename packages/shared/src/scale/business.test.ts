import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createBusinessSummary, demoBusinessWorkspace } from "./business";

describe("business summary", () => {
  it("summarizes team subscriptions and renewals", () => {
    const subscriptions: Subscription[] = [{
      id: "sub_team",
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
      version: 1,
      name: "Linear",
      category: "productivity",
      price: { amountMinor: 1000, currency: "USD" },
      billingCycle: "monthly",
      nextRenewalDate: "2026-06-01T00:00:00.000Z",
      status: "active",
      ownerProfileId: "profile_local",
      source: "manual"
    }];

    const summary = createBusinessSummary(demoBusinessWorkspace, subscriptions, new Date("2026-05-24T00:00:00.000Z"));
    expect(summary.seatCount).toBe(3);
    expect(summary.renewalCountNext30Days).toBe(1);
  });
});

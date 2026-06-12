import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createRenewalReminderPlan } from "./renewal-plan";

const subscription: Subscription = {
  id: "sub_test",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
  version: 1,
  name: "Adobe Creative Cloud",
  category: "productivity",
  price: { amountMinor: 5499, currency: "USD" },
  billingCycle: "monthly",
  nextRenewalDate: "2026-06-10T09:00:00.000Z",
  status: "active",
  ownerProfileId: "profile_local",
  source: "manual"
};

describe("renewal reminder plan", () => {
  it("creates 7-day, 3-day, and day-of reminders", () => {
    const plans = createRenewalReminderPlan([subscription], new Date("2026-06-01T08:00:00.000Z"));
    expect(plans.map((plan) => plan.kind)).toEqual(["seven_day", "three_day", "day_of"]);
    expect(plans[1]?.action).toBe("cancel_now");
  });

  it("respects disabled reminder preferences", () => {
    const plans = createRenewalReminderPlan([subscription], new Date("2026-06-01T08:00:00.000Z"), {
      three_day: { enabled: false }
    });
    expect(plans.map((plan) => plan.kind)).toEqual(["seven_day", "day_of"]);
  });
});

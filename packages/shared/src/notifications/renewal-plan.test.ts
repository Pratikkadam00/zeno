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

  describe("quiet hours that wrap midnight", () => {
    const quietPreference = { enabled: true, quietHoursStart: "22:00", quietHoursEnd: "06:00" };
    const now = new Date(2026, 5, 1, 8, 0, 0);

    function planDayOfTrigger(renewal: Date): string | undefined {
      const plans = createRenewalReminderPlan(
        [{ ...subscription, nextRenewalDate: renewal.toISOString() }],
        now,
        { day_of: quietPreference }
      );
      return plans.find((plan) => plan.kind === "day_of")?.triggerAt;
    }

    it("pushes a 23:00 trigger to 06:00 the next day", () => {
      const triggerAt = planDayOfTrigger(new Date(2026, 5, 20, 23, 0, 0));
      expect(triggerAt).toBe(new Date(2026, 5, 21, 6, 0, 0, 0).toISOString());
    });

    it("pushes a 05:00 trigger to 06:00 the same day", () => {
      const triggerAt = planDayOfTrigger(new Date(2026, 5, 20, 5, 0, 0));
      expect(triggerAt).toBe(new Date(2026, 5, 20, 6, 0, 0, 0).toISOString());
    });

    it("leaves a midday trigger unchanged", () => {
      const renewal = new Date(2026, 5, 20, 12, 0, 0);
      const triggerAt = planDayOfTrigger(renewal);
      expect(triggerAt).toBe(renewal.toISOString());
    });
  });
});

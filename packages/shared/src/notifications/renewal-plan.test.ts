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

  // Quiet hours are evaluated in UTC so reminder times are deterministic
  // regardless of the server's timezone. Dates are built with Date.UTC(...)
  // to make the intended UTC hour explicit.
  describe("quiet hours that wrap midnight", () => {
    const quietPreference = { enabled: true, quietHoursStart: "22:00", quietHoursEnd: "06:00" };
    const now = new Date(Date.UTC(2026, 5, 1, 8, 0, 0));

    function planDayOfTrigger(renewal: Date): string | undefined {
      const plans = createRenewalReminderPlan(
        [{ ...subscription, nextRenewalDate: renewal.toISOString() }],
        now,
        { day_of: quietPreference }
      );
      return plans.find((plan) => plan.kind === "day_of")?.triggerAt;
    }

    it("shifts a 23:00 UTC day-of trigger to the same-day window end, never the next day (after the renewal)", () => {
      const triggerAt = planDayOfTrigger(new Date(Date.UTC(2026, 5, 20, 23, 0, 0)));
      // 06:00 the SAME day (Jun 20) — a next-day 06:00 would fire after the
      // renewal instant, which is the P1.5 bug.
      expect(triggerAt).toBe(new Date(Date.UTC(2026, 5, 20, 6, 0, 0, 0)).toISOString());
    });

    it("clamps a 05:00 UTC day-of trigger to the renewal instant rather than the later window end", () => {
      // The 06:00 window end is AFTER the 05:00 renewal, so it clamps to 05:00.
      const triggerAt = planDayOfTrigger(new Date(Date.UTC(2026, 5, 20, 5, 0, 0)));
      expect(triggerAt).toBe(new Date(Date.UTC(2026, 5, 20, 5, 0, 0, 0)).toISOString());
    });

    it("leaves a midday trigger unchanged", () => {
      const renewal = new Date(Date.UTC(2026, 5, 20, 12, 0, 0));
      const triggerAt = planDayOfTrigger(renewal);
      expect(triggerAt).toBe(renewal.toISOString());
    });

    it("still wraps a non-day-of (seven-day) reminder to the next-day window end", () => {
      // The bound only applies to day-of; an early heads-up landing in the
      // late-night portion of the window still shifts forward as before.
      const renewal = new Date(Date.UTC(2026, 5, 27, 23, 0, 0)); // 7-day trigger = Jun 20 23:00
      const plans = createRenewalReminderPlan(
        [{ ...subscription, nextRenewalDate: renewal.toISOString() }],
        now,
        { seven_day: quietPreference }
      );
      const sevenDay = plans.find((plan) => plan.kind === "seven_day")?.triggerAt;
      expect(sevenDay).toBe(new Date(Date.UTC(2026, 5, 21, 6, 0, 0, 0)).toISOString());
    });
  });

  it("schedules only a day-of reminder for weekly subscriptions", () => {
    const weekly = { ...subscription, billingCycle: "weekly" as const, nextRenewalDate: "2026-06-10T09:00:00.000Z" };
    const plans = createRenewalReminderPlan([weekly], new Date("2026-06-08T08:00:00.000Z"));
    expect(plans.map((plan) => plan.kind)).toEqual(["day_of"]);
  });

  it("keeps the full ladder for monthly subscriptions", () => {
    const plans = createRenewalReminderPlan([subscription], new Date("2026-06-01T08:00:00.000Z"));
    expect(plans.map((plan) => plan.kind)).toEqual(["seven_day", "three_day", "day_of"]);
  });
});

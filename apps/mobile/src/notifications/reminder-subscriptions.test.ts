import type { Subscription } from "@zeno/shared";
import { describe, expect, it } from "vitest";
import { reminderSubscriptions } from "./reminder-subscriptions";

const sub = (over: Partial<Subscription>): Subscription => ({
  id: "a", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, name: "Gym",
  category: "health", price: { amountMinor: 4000, currency: "EUR" }, billingCycle: "monthly",
  nextRenewalDate: "2026-11-01T09:00:00.000Z", status: "active", ownerProfileId: "p", source: "manual", ...over
});

describe("reminderSubscriptions (F124)", () => {
  it("maps every active subscription with a renewal date", () => {
    expect(reminderSubscriptions([sub({}), sub({ id: "t", billingCycle: "trial" })], true)).toEqual([
      { id: "a", name: "Gym", amount: 40, currency: "EUR", nextRenewalDate: "2026-11-01T09:00:00.000Z", isTrial: false, billingCycle: "monthly" },
      { id: "t", name: "Gym", amount: 40, currency: "EUR", nextRenewalDate: "2026-11-01T09:00:00.000Z", isTrial: true, billingCycle: "trial" }
    ]);
  });

  it("skips paused, cancelled, pending and dateless subscriptions", () => {
    const rows = [sub({ status: "paused" }), sub({ status: "cancelled" }), sub({ status: "pending" }), sub({ nextRenewalDate: undefined })];
    expect(reminderSubscriptions(rows, true)).toEqual([]);
  });

  it("with the switch off, schedules nothing at all", () => {
    expect(reminderSubscriptions([sub({})], false)).toEqual([]);
  });
});

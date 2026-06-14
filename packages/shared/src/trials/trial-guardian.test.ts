import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { getEndingTrials } from "./trial-guardian";

const base: Omit<Subscription, "billingCycle" | "nextRenewalDate" | "status"> = {
  id: "s",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  version: 1,
  name: "Trial Co",
  category: "entertainment",
  price: { amountMinor: 1599, currency: "USD" },
  ownerProfileId: "p",
  source: "manual"
};

function trial(id: string, endsInDays: number, over: Partial<Subscription> = {}): Subscription {
  const end = new Date(Date.UTC(2026, 5, 15) + endsInDays * 86_400_000);
  return { ...base, id, billingCycle: "trial", status: "active", nextRenewalDate: end.toISOString(), ...over };
}

const NOW = new Date(Date.UTC(2026, 5, 15, 12, 0, 0));

describe("getEndingTrials", () => {
  it("returns active trials within the window, soonest first, with whole-day countdown", () => {
    const subs = [trial("a", 5), trial("b", 1), trial("c", 0)];
    const result = getEndingTrials(subs, NOW, 30);
    expect(result.map((t) => t.subscription.id)).toEqual(["c", "b", "a"]);
    expect(result.map((t) => t.daysUntilEnd)).toEqual([0, 1, 5]);
  });

  it("excludes non-trials, already-converted, far-future, and cancelled/paused trials", () => {
    const subs = [
      trial("keep", 2),
      { ...base, id: "monthly", billingCycle: "monthly" as const, status: "active" as const, nextRenewalDate: new Date(Date.UTC(2026, 5, 17)).toISOString() },
      trial("past", -1),
      trial("far", 60),
      trial("cancelled", 2, { status: "cancelled" }),
      trial("paused", 2, { status: "paused" })
    ];
    const result = getEndingTrials(subs, NOW, 30);
    expect(result.map((t) => t.subscription.id)).toEqual(["keep"]);
  });
});

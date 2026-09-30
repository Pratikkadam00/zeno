import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createFamilyVaultSummary, type FamilyMember } from "./vault";

function sub(input: Partial<Subscription> & Pick<Subscription, "id" | "ownerProfileId">): Subscription {
  return {
    name: input.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    category: "entertainment",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    source: "manual",
    ...input
  };
}

const members: FamilyMember[] = [
  { id: "me", name: "Me", role: "owner", color: "#000000" },
  { id: "kid", name: "Kid", role: "child", color: "#111111" }
];

describe("createFamilyVaultSummary", () => {
  it("totals each member's active subscriptions and the household, in USD by default", () => {
    const summary = createFamilyVaultSummary(members, [
      sub({ id: "a", ownerProfileId: "me", price: { amountMinor: 1500, currency: "USD" } }),
      sub({ id: "b", ownerProfileId: "me", price: { amountMinor: 12000, currency: "USD" }, billingCycle: "annual" }),
      sub({ id: "c", ownerProfileId: "me", status: "cancelled" }),
      sub({ id: "stranger", ownerProfileId: "not-a-member" })
    ]);
    expect(summary.members.map((m) => [m.id, m.monthlySpend, m.subscriptionCount])).toEqual([
      ["me", { amountMinor: 2500, currency: "USD" }, 2],
      ["kid", { amountMinor: 0, currency: "USD" }, 0]
    ]);
    // Only members' subscriptions make up the household total.
    expect(summary.totalMonthlySpend).toEqual({ amountMinor: 2500, currency: "USD" });
    expect(summary.excludedCurrencyCount).toBe(0);
  });

  it("lists active family-category subscriptions as shared", () => {
    const summary = createFamilyVaultSummary(members, [
      sub({ id: "plan", ownerProfileId: "me", category: "family" }),
      sub({ id: "old-plan", ownerProfileId: "me", category: "family", status: "cancelled" }),
      sub({ id: "solo", ownerProfileId: "kid" })
    ]);
    expect(summary.sharedSubscriptions.map((s) => s.id)).toEqual(["plan"]);
  });

  it("converts into the requested currency with rates, and counts what it could not convert", () => {
    const summary = createFamilyVaultSummary(members, [
      sub({ id: "u", ownerProfileId: "me", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "i", ownerProfileId: "kid", price: { amountMinor: 9500, currency: "INR" } }),
      sub({ id: "g", ownerProfileId: "kid", price: { amountMinor: 500, currency: "GBP" } })
    ], "USD", { USD: 1, INR: 95 });
    expect(summary.members.map((m) => m.monthlySpend.amountMinor)).toEqual([1000, 100]);
    expect(summary.totalMonthlySpend).toEqual({ amountMinor: 1100, currency: "USD" });
    expect(summary.excludedCurrencyCount).toBe(1);
  });

  it("without rates, excludes (and counts) other currencies instead of adding raw minor units", () => {
    // Before the fix: 1000 US cents + 49900 paise came back as
    // { amountMinor: 50900, currency: "INR" }, i.e. "₹509".
    const summary = createFamilyVaultSummary(members, [
      sub({ id: "u", ownerProfileId: "me", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "i", ownerProfileId: "me", price: { amountMinor: 49900, currency: "INR" } })
    ], "INR");
    expect(summary.totalMonthlySpend).toEqual({ amountMinor: 49900, currency: "INR" });
    expect(summary.excludedCurrencyCount).toBe(1);
  });
});

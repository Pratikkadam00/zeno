import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createBusinessSummary, demoBusinessWorkspace, type BusinessWorkspace } from "./business";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const DAY = 86_400_000;

function sub(input: Partial<Subscription> & Pick<Subscription, "id">): Subscription {
  return {
    name: input.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    category: "productivity",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "p",
    source: "manual",
    ...input
  };
}

const workspace: BusinessWorkspace = { id: "biz_1", name: "Acme", plan: "business", monthlySeatLimit: 5, seats: [{ id: "s1", emailHash: "h1", role: "owner" }] };

describe("createBusinessSummary — spend", () => {
  it("sums active subscriptions in USD by default and counts only active ones", () => {
    const summary = createBusinessSummary(workspace, [
      sub({ id: "a", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "b", price: { amountMinor: 12000, currency: "USD" }, billingCycle: "annual" }),
      sub({ id: "c", status: "cancelled" })
    ], NOW);
    expect(summary).toMatchObject({
      workspaceId: "biz_1",
      workspaceName: "Acme",
      seatCount: 1,
      monthlySpend: { amountMinor: 2000, currency: "USD" },
      subscriptionCount: 2,
      excludedCurrencyCount: 0
    });
  });

  it("converts into the requested currency with rates, and counts what it could not convert", () => {
    const summary = createBusinessSummary(workspace, [
      sub({ id: "u", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "i", price: { amountMinor: 9500, currency: "INR" } }),
      sub({ id: "g", price: { amountMinor: 500, currency: "GBP" } })
    ], NOW, "USD", { USD: 1, INR: 95 });
    expect(summary.monthlySpend).toEqual({ amountMinor: 1100, currency: "USD" });
    expect(summary.excludedCurrencyCount).toBe(1);
  });

  it("without rates, excludes (and counts) other currencies instead of adding raw minor units", () => {
    // Before the fix: 1000 US cents + 49900 paise were returned as
    // { amountMinor: 50900, currency: "INR" }, i.e. "₹509".
    const summary = createBusinessSummary(workspace, [
      sub({ id: "u", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "i", price: { amountMinor: 49900, currency: "INR" } })
    ], NOW, "INR");
    expect(summary.monthlySpend).toEqual({ amountMinor: 49900, currency: "INR" });
    expect(summary.excludedCurrencyCount).toBe(1);
  });
});

describe("createBusinessSummary — renewals in the next 30 days", () => {
  it("counts renewals from now through exactly 30 days ahead, inclusive", () => {
    const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
    const summary = createBusinessSummary(workspace, [
      sub({ id: "now", nextRenewalDate: at(0) }),
      sub({ id: "edge", nextRenewalDate: at(30 * DAY) }),
      sub({ id: "past-edge", nextRenewalDate: at(30 * DAY + 1) }),
      sub({ id: "overdue", nextRenewalDate: at(-1) }),
      sub({ id: "undated" }),
      sub({ id: "unparseable", nextRenewalDate: "soon" }),
      sub({ id: "inactive", status: "paused", nextRenewalDate: at(DAY) })
    ], NOW);
    expect(summary.renewalCountNext30Days).toBe(2);
  });
});

describe("demoBusinessWorkspace", () => {
  it("is a business-plan workspace whose seat count matches its seats", () => {
    const summary = createBusinessSummary(demoBusinessWorkspace, [], NOW);
    expect(demoBusinessWorkspace.plan).toBe("business");
    expect(summary.seatCount).toBe(demoBusinessWorkspace.seats.length);
    expect(summary.monthlySpend).toEqual({ amountMinor: 0, currency: "USD" });
  });
});

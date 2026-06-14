import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { buildMonthlySpendHistory } from "./history";

const base: Omit<Subscription, "billingCycle" | "price" | "nextRenewalDate"> = {
  id: "s",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  version: 1,
  name: "Svc",
  category: "entertainment",
  status: "active",
  ownerProfileId: "p",
  source: "manual"
};

const NOW = new Date(Date.UTC(2026, 5, 15)); // June 2026

describe("buildMonthlySpendHistory", () => {
  it("returns one point per month, oldest first", () => {
    const points = buildMonthlySpendHistory([], 6, NOW);
    expect(points).toHaveLength(6);
    expect(points[5]?.month).toBe(5); // June is last
    expect(points.every((p) => p.amountMinor === 0)).toBe(true);
  });

  it("charges monthly subs every month but annual only in the anniversary month", () => {
    const monthly: Subscription = { ...base, billingCycle: "monthly", price: { amountMinor: 1000, currency: "USD" }, nextRenewalDate: "2026-06-20T00:00:00.000Z" };
    const annual: Subscription = { ...base, id: "a", billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" }, nextRenewalDate: "2026-04-10T00:00:00.000Z" };
    const points = buildMonthlySpendHistory([monthly, annual], 6, NOW); // Jan..Jun 2026
    // Every month has the monthly $10; April (index 3) also has the annual $120.
    expect(points.every((p) => p.amountMinor >= 1000)).toBe(true);
    const april = points.find((p) => p.month === 3);
    expect(april?.amountMinor).toBe(1000 + 12000);
    const may = points.find((p) => p.month === 4);
    expect(may?.amountMinor).toBe(1000);
  });

  it("does not count a subscription before it was created or while it's a trial", () => {
    const newish: Subscription = { ...base, createdAt: "2026-05-01T00:00:00.000Z", billingCycle: "monthly", price: { amountMinor: 500, currency: "USD" }, nextRenewalDate: "2026-06-01T00:00:00.000Z" };
    const trial: Subscription = { ...base, id: "t", billingCycle: "trial", price: { amountMinor: 9999, currency: "USD" }, nextRenewalDate: "2026-06-20T00:00:00.000Z" };
    const points = buildMonthlySpendHistory([newish, trial], 6, NOW);
    expect(points.find((p) => p.month === 2)?.amountMinor).toBe(0); // March — before created, trial excluded
    expect(points.find((p) => p.month === 5)?.amountMinor).toBe(500); // June — only the monthly sub
  });
});

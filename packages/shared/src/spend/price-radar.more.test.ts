import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { detectPriceHikes, type PriceHistoryEntry } from "./price-radar";

const sub = (id: string, over: Partial<Subscription> = {}): Subscription => ({
  id,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  version: 1,
  name: id,
  category: "entertainment",
  price: { amountMinor: 0, currency: "USD" },
  billingCycle: "monthly",
  status: "active",
  ownerProfileId: "p",
  source: "manual",
  ...over
});

const NOW = new Date(Date.UTC(2026, 5, 15));
const hike: PriceHistoryEntry[] = [
  { at: "2026-01-01T00:00:00.000Z", amountMinor: 1000 },
  { at: "2026-06-01T00:00:00.000Z", amountMinor: 1250 }
];

describe("detectPriceHikes", () => {
  it("reports the increase, its percentage and when it changed", () => {
    const [found] = detectPriceHikes([sub("a")], { a: hike }, NOW);
    expect(found).toMatchObject({ previousMinor: 1000, currentMinor: 1250, increaseMinor: 250, increasePct: 25, changedAt: "2026-06-01T00:00:00.000Z" });
  });

  it("skips cancelled subscriptions and subscriptions with no or empty history", () => {
    expect(detectPriceHikes([sub("gone", { status: "cancelled" }), sub("none"), sub("empty")], { gone: hike, empty: [] }, NOW)).toEqual([]);
  });

  it("orders history by date, not by array order", () => {
    // Stored newest-first: the latest price is still the 2026-06 one.
    const [found] = detectPriceHikes([sub("a")], { a: [...hike].reverse() }, NOW);
    expect(found?.currentMinor).toBe(1250);
  });

  it("does not mutate the caller's history array", () => {
    const history = [...hike].reverse();
    detectPriceHikes([sub("a")], { a: history }, NOW);
    expect(history[0]?.at).toBe("2026-06-01T00:00:00.000Z");
  });

  it("ignores an unchanged price", () => {
    expect(detectPriceHikes([sub("a")], { a: [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 1000 }, { at: "2026-06-01T00:00:00.000Z", amountMinor: 1000 }] }, NOW)).toEqual([]);
  });

  it("skips a change whose date cannot be parsed", () => {
    const history = [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 1000 }, { at: "not a date", amountMinor: 1250 }];
    expect(detectPriceHikes([sub("a")], { a: history }, NOW)).toEqual([]);
  });

  it("honours a custom look-back window, inclusive of its first instant", () => {
    const history = [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 1000 }, { at: "2026-06-05T00:00:00.000Z", amountMinor: 1250 }];
    expect(detectPriceHikes([sub("a")], { a: history }, NOW, 10)).toHaveLength(1); // exactly 10 days before NOW
    expect(detectPriceHikes([sub("a")], { a: history }, NOW, 9)).toEqual([]);
  });
});

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

describe("detectPriceHikes", () => {
  it("flags a real increase with correct percentage, biggest first", () => {
    const subs = [sub("netflix"), sub("spotify")];
    const history: Record<string, PriceHistoryEntry[]> = {
      netflix: [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 1549 }, { at: "2026-06-01T00:00:00.000Z", amountMinor: 1799 }],
      spotify: [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 999 }, { at: "2026-05-01T00:00:00.000Z", amountMinor: 1199 }]
    };
    const hikes = detectPriceHikes(subs, history, NOW);
    expect(hikes.map((h) => h.subscription.id)).toEqual(["spotify", "netflix"]); // 20% > 16%
    expect(hikes.find((h) => h.subscription.id === "netflix")?.increasePct).toBe(16);
  });

  it("ignores single-point history, decreases, and stale changes", () => {
    const subs = [sub("new"), sub("cheaper"), sub("old")];
    const history: Record<string, PriceHistoryEntry[]> = {
      new: [{ at: "2026-06-01T00:00:00.000Z", amountMinor: 1000 }],
      cheaper: [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 1500 }, { at: "2026-06-01T00:00:00.000Z", amountMinor: 1200 }],
      old: [{ at: "2024-01-01T00:00:00.000Z", amountMinor: 800 }, { at: "2024-06-01T00:00:00.000Z", amountMinor: 1000 }]
    };
    expect(detectPriceHikes(subs, history, NOW)).toHaveLength(0);
  });

  it("does not report a hike (or Infinity%) when the previous price was $0", () => {
    const subs = [sub("promo")];
    const history: Record<string, PriceHistoryEntry[]> = {
      promo: [{ at: "2026-01-01T00:00:00.000Z", amountMinor: 0 }, { at: "2026-06-01T00:00:00.000Z", amountMinor: 1999 }]
    };
    expect(detectPriceHikes(subs, history, NOW)).toHaveLength(0);
  });
});

import type { Subscription } from "../domain";

export type PriceHistoryEntry = { at: string; amountMinor: number };

export type PriceHike = {
  subscription: Subscription;
  previousMinor: number;
  currentMinor: number;
  increaseMinor: number;
  increasePct: number;
  changedAt: string;
};

const DAY_MS = 86_400_000;

/**
 * Price-Hike Radar: given each subscription's recorded price history, flag the
 * ones whose most recent price is higher than the prior price (a real increase),
 * within the trailing `withinDays` window. Sorted by largest % increase first.
 */
export function detectPriceHikes(
  subscriptions: Subscription[],
  historyById: Record<string, PriceHistoryEntry[]>,
  now: Date = new Date(),
  withinDays = 365
): PriceHike[] {
  const cutoff = now.getTime() - withinDays * DAY_MS;
  const hikes: PriceHike[] = [];

  for (const subscription of subscriptions) {
    if (subscription.status === "cancelled") continue;
    const history = [...(historyById[subscription.id] ?? [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    if (history.length < 2) continue;

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    if (!latest || !previous) continue;
    if (latest.amountMinor <= previous.amountMinor) continue;

    const changedTime = Date.parse(latest.at);
    if (Number.isNaN(changedTime) || changedTime < cutoff) continue;

    const increaseMinor = latest.amountMinor - previous.amountMinor;
    hikes.push({
      subscription,
      previousMinor: previous.amountMinor,
      currentMinor: latest.amountMinor,
      increaseMinor,
      increasePct: Math.round((increaseMinor / previous.amountMinor) * 100),
      changedAt: latest.at
    });
  }

  return hikes.sort((a, b) => b.increasePct - a.increasePct);
}

import type { PriceHistoryEntry, Subscription } from "@zeno/shared";
import type { SubscriptionNotificationSettings } from "./subscription-store";

/**
 * Pure mutation helpers for the subscription store.
 *
 * These exist so the store NEVER computes a persisted value inside a setState
 * updater: React only runs updaters eagerly for the first dispatch in an
 * event, so a value captured inside an updater can silently stay unset. That
 * exact pattern skipped SQLite persistence for price edits (the price-history
 * dispatch ran first) and wiped the whole notification-settings blob on
 * delete (the captured object was still `{}` when it was persisted). Each
 * helper returns the full next value; the store persists that same value it
 * passes to setState. Regression tests: subscription-mutations.test.ts.
 */

export function applySubscriptionChange(
  list: Subscription[],
  id: string,
  mutate: (subscription: Subscription) => Subscription
): { next: Subscription[]; updated: Subscription | null } {
  const current = list.find((subscription) => subscription.id === id);
  if (!current) {
    return { next: list, updated: null };
  }
  const updated = mutate(current);
  return {
    next: list.map((subscription) => (subscription.id === id ? updated : subscription)),
    updated
  };
}

export function withNotificationSettingsEntry(
  settings: Record<string, SubscriptionNotificationSettings>,
  id: string,
  entry: SubscriptionNotificationSettings
): Record<string, SubscriptionNotificationSettings> {
  return { ...settings, [id]: entry };
}

export function withUpdatedNotificationSettings(
  settings: Record<string, SubscriptionNotificationSettings>,
  id: string,
  changes: Partial<SubscriptionNotificationSettings>,
  defaults: SubscriptionNotificationSettings
): Record<string, SubscriptionNotificationSettings> {
  return { ...settings, [id]: { ...(settings[id] ?? defaults), ...changes } };
}

export function withoutNotificationSettingsEntry(
  settings: Record<string, SubscriptionNotificationSettings>,
  id: string
): Record<string, SubscriptionNotificationSettings> {
  const next = { ...settings };
  delete next[id];
  return next;
}

/**
 * The price-history rule behind the Price-Hike Radar: a point is recorded only
 * when the amount actually changes (null = nothing to record). A subscription
 * with no recorded history first gets its current price as the baseline, so the
 * radar always sees the before -> after pair.
 */
export function withPriceChange(
  history: Record<string, PriceHistoryEntry[]>,
  subscription: Subscription,
  amountMinor: number,
  at: string
): Record<string, PriceHistoryEntry[]> | null {
  if (amountMinor === subscription.price.amountMinor) {
    return null;
  }
  const prior = history[subscription.id] ?? [{ at: subscription.createdAt, amountMinor: subscription.price.amountMinor }];
  return { ...history, [subscription.id]: [...prior, { at, amountMinor }] };
}

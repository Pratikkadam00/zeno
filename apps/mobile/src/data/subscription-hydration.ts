import { isCurrencyCode, type CurrencyCode, type ExchangeRates, type PriceHistoryEntry, type Subscription } from "@zeno/shared";
import type { QuietHours } from "../notifications/notificationService";

// Pure hydration/normalization helpers for the subscription store. Extracted so
// the store's boot path — which reads raw strings out of the encrypted app_meta
// table and must survive corrupt/legacy/missing rows — is unit-testable without
// SQLite or React. These lock the DATA-layer contract (validation, defaults,
// invariants), which is stable across UI redesigns: a corrupt row must never
// crash boot, and — privacy-critically — must never be read as AI-coach consent.

export type CachedExchangeRates = { rates: ExchangeRates; fetchedAt: string };

// Merge stored quiet-hours over the defaults. Falsy (never set) or corrupt JSON
// both fall back to the defaults rather than throwing during boot.
export function normalizeQuietHours(stored: string | null | undefined, def: QuietHours): QuietHours {
  if (!stored) {
    return def;
  }
  try {
    return { ...def, ...(JSON.parse(stored) as Partial<QuietHours>) };
  } catch (error) {
    console.warn("Corrupt quiet-hours setting in database; using defaults.", error);
    return def;
  }
}

// Validate the persisted currency against the enum rather than trusting a raw
// cast — a corrupt/legacy row must not inject an unsupported code that would
// break every downstream conversion.
export function normalizeHomeCurrency(stored: string | null | undefined, def: CurrencyCode): CurrencyCode {
  return isCurrencyCode(stored) ? stored : def;
}

// Only "granted"/"declined" are meaningful persisted decisions; anything else
// (missing row, corrupt value, legacy string) leaves consent at "unset" so the
// coach shows the prompt rather than silently transmitting the subscription list.
export function normalizeCoachConsent(stored: string | null | undefined): "unset" | "granted" | "declined" {
  return stored === "granted" || stored === "declined" ? stored : "unset";
}

// Parse the cached FX table; falsy or corrupt → null (caller keeps rates
// unavailable, which every aggregate already treats as "no conversion").
export function parseCachedRates(stored: string | null | undefined): CachedExchangeRates | null {
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored) as CachedExchangeRates;
  } catch (error) {
    console.warn("Corrupt exchange-rate cache in database; ignoring.", error);
    return null;
  }
}

// Restore saved per-subscription reminder settings, then ensure EVERY persisted
// subscription has an entry (defaults for any added before this blob was written,
// and dropping entries for deleted ones), so a toggle never reads undefined.
// Generic in the settings shape so the store owns the type and default.
export function hydrateNotificationSettings<T>(
  persisted: Subscription[],
  stored: string | null | undefined,
  def: T
): Record<string, T> {
  let restored: Record<string, T> = {};
  if (stored) {
    try {
      restored = JSON.parse(stored) as Record<string, T>;
    } catch (error) {
      console.warn("Corrupt notification settings in database; using defaults.", error);
    }
  }
  return Object.fromEntries(persisted.map((subscription) => [subscription.id, restored[subscription.id] ?? def]));
}

// Restore price history; seed any subscription without one with a single
// baseline point (its current price) so a later change can be detected as a hike.
export function hydratePriceHistory(
  persisted: Subscription[],
  stored: string | null | undefined
): Record<string, PriceHistoryEntry[]> {
  let restored: Record<string, PriceHistoryEntry[]> = {};
  if (stored) {
    try {
      restored = JSON.parse(stored) as Record<string, PriceHistoryEntry[]>;
    } catch (error) {
      console.warn("Corrupt price history in database; reseeding.", error);
    }
  }
  return Object.fromEntries(
    persisted.map((subscription) => [
      subscription.id,
      restored[subscription.id] ?? [{ at: subscription.createdAt, amountMinor: subscription.price.amountMinor }]
    ])
  );
}

import { searchServices } from "@zeno/service-catalog";
import { buildYearInReview, createAnalyticsSnapshot, createBusinessSummary, createFamilyVaultSummary, createRenewalReminderPlan, createSpendSummary, createSpendTwin, createWidgetSnapshot, demoBusinessWorkspace, demoFamilyMembers, detectPriceHikes, getEndingTrials, monthlyAmount, monthlyAmountIn, partnerIntegrationManifests, type AnalyticsSnapshot, type BillingCycle, type BusinessSubscriptionSummary, type CurrencyCode, type EndingTrial, type ExchangeRates, type FamilyVaultSummary, type FxContext, type PartnerIntegrationManifest, type PriceHike, type PriceHistoryEntry, type RenewalReminderPlan, type SpendSummary, type SpendTwinComparison, type Subscription, type SubscriptionCategory, type SubscriptionStatus, type WidgetSnapshot, type YearInReview } from "@zeno/shared";
import * as Crypto from "expo-crypto";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { fetchLatestRates, isRateTableStale } from "../fx/rates";
import { cancelAllNotifications, type QuietHours } from "../notifications/notificationService";
import { openZenoDatabase, readAppMeta, writeAppMeta, type ZenoDatabase } from "../storage/database";
import { clearAllSubscriptions, listSubscriptions, softDeleteSubscription, upsertSubscription } from "../storage/subscription-repository";
import { rollRenewalForward } from "../utils/subscription-ui";
import { hydrateNotificationSettings, hydratePriceHistory, normalizeCoachConsent, normalizeHomeCurrency, normalizeQuietHours, parseCachedRates, type CachedExchangeRates } from "./subscription-hydration";
import { applySubscriptionChange, withNotificationSettingsEntry, withUpdatedNotificationSettings, withoutNotificationSettingsEntry } from "./subscription-mutations";
import { seedSubscriptions } from "./seed-subscriptions";

type CreateSubscriptionInput = {
  name: string;
  serviceSlug?: string;
  category: SubscriptionCategory;
  amountMinor: number;
  /** Defaults to "USD" — matches manual-add (which is USD-only today, no
   *  currency picker yet) while letting discovery pass a detected currency. */
  currency?: CurrencyCode;
  billingCycle: BillingCycle;
  nextRenewalDate?: string;
  source?: Subscription["source"];
};

type UpdateSubscriptionInput = Partial<{
  name: string;
  serviceSlug: string;
  category: SubscriptionCategory;
  amountMinor: number;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  status: SubscriptionStatus;
  notes: string;
}>;

export type SubscriptionNotificationSettings = {
  sevenDay: boolean;
  threeDay: boolean;
  dayOf: boolean;
};

// AI-coach data-sharing consent. "unset" until the user makes a first decision,
// so the coach can distinguish "never asked" (show the consent prompt) from a
// deliberate "declined" (stay on-device, don't re-nag as if unasked).
export type CoachAiConsent = "unset" | "granted" | "declined";

type SubscriptionStore = {
  subscriptions: Subscription[];
  hydrated: boolean;
  notificationSettings: Record<string, SubscriptionNotificationSettings>;
  totalMonthlyMinor: number;
  spendSummary: SpendSummary;
  spendTwin: SpendTwinComparison[];
  familyVault: FamilyVaultSummary;
  analytics: AnalyticsSnapshot;
  widgetSnapshot: WidgetSnapshot;
  businessSummary: BusinessSubscriptionSummary;
  yearInReview: YearInReview;
  partnerIntegrations: PartnerIntegrationManifest[];
  reminderPlan: RenewalReminderPlan[];
  upcoming: Subscription[];
  endingTrials: EndingTrial[];
  priceHikes: PriceHike[];
  addSubscription: (input: CreateSubscriptionInput) => string;
  updateSubscription: (id: string, changes: UpdateSubscriptionInput) => void;
  deleteSubscription: (id: string) => void;
  pauseSubscription: (id: string) => void;
  markCancelled: (id: string) => void;
  // Cancellation verification lifecycle (CHANGE 4).
  requestCancellation: (id: string) => void;
  markVerifiedCancelled: (id: string) => void;
  markStillCharging: (id: string) => void;
  runCancellationVerification: () => void;
  updateNotificationSettings: (id: string, changes: Partial<SubscriptionNotificationSettings>) => void;
  quietHours: QuietHours;
  setQuietHours: (changes: Partial<QuietHours>) => void;
  // Home-currency aggregate conversion (Phase 5.2). exchangeRatesAvailable is
  // false until the first successful fetch (or a cached table from a prior
  // session) — until then every aggregate below falls back to the honest,
  // no-conversion behavior (native-currency-only totals), exactly as before
  // this phase, never a fabricated converted number.
  homeCurrency: CurrencyCode;
  setHomeCurrency: (currency: CurrencyCode) => void;
  exchangeRatesAvailable: boolean;
  ratesLastFetchedAt: string | null;
  // Pass straight through to shared-package aggregate functions that a screen
  // calls directly (e.g. apps/mobile/src/finance/budget.ts's forecast
  // helpers) instead of reading a precomputed field like spendSummary above.
  // undefined until a rate table exists — every consumer already treats that
  // as "fall back to native-currency-only totals."
  fx: FxContext | undefined;
  // AI-coach data-sharing consent (P2.2 / standards §14). "unset" until the user
  // decides; the coach must NOT transmit the subscription list to the server
  // until this is "granted". Persisted in the encrypted app_meta table and reset
  // on data wipe / account cancel. Revocable from Settings → Data & privacy.
  coachAiConsent: CoachAiConsent;
  setCoachAiConsent: (next: "granted" | "declined") => void;
  clearAllData: () => Promise<void>;
  suggestions: (query: string) => ReturnType<typeof searchServices>;
};

const defaultNotificationSettings: SubscriptionNotificationSettings = {
  sevenDay: true,
  threeDay: true,
  dayOf: true
};

const seededMetaKey = "subscriptions.seeded.v1";
const notificationSettingsMetaKey = "notification.settings.v1";
const quietHoursMetaKey = "notification.quietHours.v1";
const priceHistoryMetaKey = "price.history.v1";
const homeCurrencyMetaKey = "fx.homeCurrency.v1";
const exchangeRatesMetaKey = "fx.rates.v1";
const coachAiConsentMetaKey = "coach.aiConsent.v1";

const defaultQuietHours: QuietHours = { enabled: false, startHour: 22, endHour: 8 };
const defaultHomeCurrency: CurrencyCode = "USD";

// expo-sqlite is not configured for web; web sessions stay in-memory.
const persistenceEnabled = Platform.OS !== "web";

const StoreContext = createContext<SubscriptionStore | null>(null);

export function SubscriptionStoreProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(seedSubscriptions);
  const [hydrated, setHydrated] = useState(!persistenceEnabled);
  const [notificationSettings, setNotificationSettings] = useState<Record<string, SubscriptionNotificationSettings>>(() => Object.fromEntries(
    seedSubscriptions.map((subscription) => [subscription.id, defaultNotificationSettings])
  ));
  const [quietHours, setQuietHoursState] = useState<QuietHours>(defaultQuietHours);
  const [homeCurrency, setHomeCurrencyState] = useState<CurrencyCode>(defaultHomeCurrency);
  const [coachAiConsent, setCoachAiConsentState] = useState<CoachAiConsent>("unset");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | undefined>(undefined);
  const [ratesLastFetchedAt, setRatesLastFetchedAt] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceHistoryEntry[]>>(() => Object.fromEntries(
    seedSubscriptions.map((subscription) => [subscription.id, [{ at: subscription.createdAt, amountMinor: subscription.price.amountMinor }]])
  ));
  const dbRef = useRef<ZenoDatabase | null>(null);

  // Event-time mirrors of the three mutated slices. Mutations read and write
  // these (never values captured inside setState updaters — React skips eager
  // updater evaluation after the first dispatch in an event, which silently
  // skipped persistence for price edits and wiped notification settings on
  // delete). Refs, not render closures, so same-event batches — discover's
  // bulk-import loop, runCancellationVerification's resolve loop — each see
  // the previous iteration's writes. Written only from event handlers and the
  // hydration effect, never during render.
  const subscriptionsRef = useRef(subscriptions);
  const notificationSettingsRef = useRef(notificationSettings);
  const priceHistoryRef = useRef(priceHistory);

  useEffect(() => {
    if (!persistenceEnabled) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const db = await openZenoDatabase();
        if (cancelled) {
          return;
        }
        dbRef.current = db;

        const alreadySeeded = await readAppMeta(db, seededMetaKey);
        if (!alreadySeeded) {
          for (const subscription of seedSubscriptions) {
            await upsertSubscription(db, subscription);
          }
          await writeAppMeta(db, seededMetaKey, new Date().toISOString());
        }

        const persisted = await listSubscriptions(db);
        const storedSettings = await readAppMeta(db, notificationSettingsMetaKey);
        const storedQuietHours = await readAppMeta(db, quietHoursMetaKey);
        const storedPriceHistory = await readAppMeta(db, priceHistoryMetaKey);
        const storedHomeCurrency = await readAppMeta(db, homeCurrencyMetaKey);
        const storedRates = await readAppMeta(db, exchangeRatesMetaKey);
        const storedCoachConsent = await readAppMeta(db, coachAiConsentMetaKey);
        if (cancelled) {
          return;
        }

        // Normalize each persisted setting against corrupt/legacy/missing rows.
        // The helpers are pure and unit-tested in subscription-hydration.test.ts;
        // setting a value equal to the current default is a React no-op (bailout).
        setQuietHoursState(normalizeQuietHours(storedQuietHours, defaultQuietHours));
        setHomeCurrencyState(normalizeHomeCurrency(storedHomeCurrency, defaultHomeCurrency));
        setCoachAiConsentState(normalizeCoachConsent(storedCoachConsent));

        const cachedRates = parseCachedRates(storedRates);
        if (cachedRates) {
          setExchangeRates(cachedRates.rates);
          setRatesLastFetchedAt(cachedRates.fetchedAt);
        }

        subscriptionsRef.current = persisted;
        setSubscriptions(persisted);
        const hydratedSettings = hydrateNotificationSettings(persisted, storedSettings, defaultNotificationSettings);
        notificationSettingsRef.current = hydratedSettings;
        setNotificationSettings(hydratedSettings);

        const hydratedHistory = hydratePriceHistory(persisted, storedPriceHistory);
        priceHistoryRef.current = hydratedHistory;
        setPriceHistory(hydratedHistory);

        setHydrated(true);
      } catch (error) {
        console.warn("Subscription database unavailable; using in-memory data.", error);
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Best-effort daily FX rate refresh: web (no persistenceEnabled) still runs
  // this so home-currency conversion works there too, it just never persists
  // across sessions. Never blocks the UI and never surfaces an error — a
  // failed/offline fetch just leaves exchangeRates as whatever was already
  // cached (or undefined pre-first-fetch), which every aggregate consumer
  // already treats as "conversion unavailable, fall back to honest
  // no-conversion behavior."
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (ratesLastFetchedAt && !isRateTableStale(ratesLastFetchedAt)) {
      return;
    }

    let cancelled = false;
    void fetchLatestRates().then((rates) => {
      if (cancelled || !rates) {
        return;
      }
      const fetchedAt = new Date().toISOString();
      setExchangeRates(rates);
      setRatesLastFetchedAt(fetchedAt);
      const db = dbRef.current;
      if (db) {
        void writeAppMeta(db, exchangeRatesMetaKey, JSON.stringify({ rates, fetchedAt } satisfies CachedExchangeRates)).catch((error) => {
          console.warn("Failed to persist exchange rates.", error);
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, ratesLastFetchedAt]);

  const persistSubscription = (subscription: Subscription) => {
    const db = dbRef.current;
    if (db) {
      void upsertSubscription(db, subscription).catch((error) => {
        console.warn("Failed to persist subscription.", error);
      });
    }
  };

  const persistNotificationSettings = (settings: Record<string, SubscriptionNotificationSettings>) => {
    const db = dbRef.current;
    if (db) {
      void writeAppMeta(db, notificationSettingsMetaKey, JSON.stringify(settings)).catch((error) => {
        console.warn("Failed to persist notification settings.", error);
      });
    }
  };

  const persistPriceHistory = (history: Record<string, PriceHistoryEntry[]>) => {
    const db = dbRef.current;
    if (db) {
      void writeAppMeta(db, priceHistoryMetaKey, JSON.stringify(history)).catch((error) => {
        console.warn("Failed to persist price history.", error);
      });
    }
  };

  // Identity-stable derivations (P4.2). The store's `value` object below is a
  // fresh literal on every recompute (a single Context Provider has no per-field
  // subscription), but giving these three stable identities means the effects in
  // _layout keyed on them — the notification reschedule and the widget-snapshot
  // refresh — stop firing on UNRELATED store changes (quiet hours, AI consent,
  // price-history writes, exchange-rate fetches). displaySubscriptions rolls
  // overdue active renewals forward for display and is memoized on `subscriptions`
  // alone; its internal roll therefore refreshes on any subscription change and on
  // every app launch (when the store re-hydrates). The only staleness window is a
  // long single foreground session across a renewal boundary — cosmetic.
  const displaySubscriptions = useMemo(
    () => subscriptions.map((subscription) =>
      subscription.status === "active" && subscription.nextRenewalDate
        ? { ...subscription, nextRenewalDate: rollRenewalForward(subscription.nextRenewalDate, subscription.billingCycle) }
        : subscription
    ),
    [subscriptions]
  );
  const fx: FxContext | undefined = useMemo(
    () => (exchangeRates ? { homeCurrency, rates: exchangeRates } : undefined),
    [exchangeRates, homeCurrency]
  );
  const widgetSnapshot = useMemo(
    () => createWidgetSnapshot(displaySubscriptions, new Date(), fx),
    [displaySubscriptions, fx]
  );

  const value = useMemo<SubscriptionStore>(() => {
    const applyChange = (id: string, mutate: (subscription: Subscription) => Subscription) => {
      // Compute the next value from the ref mirror, never inside the setState
      // updater (see the ref declarations above for why capture-in-updater
      // silently lost writes). The persisted value is exactly the value handed
      // to setState.
      const { next, updated } = applySubscriptionChange(subscriptionsRef.current, id, mutate);
      if (!updated) {
        return;
      }
      subscriptionsRef.current = next;
      setSubscriptions(next);
      persistSubscription(updated);
    };

    // displaySubscriptions (overdue active renewals rolled forward for display)
    // and fx are hoisted above for stable identity; mutations still operate on
    // the raw state by id, so persistence is unaffected. fx stays undefined until
    // a rate table exists — every aggregate treats that as "native-currency-only
    // totals", identical to pre-5.2 behavior, never a fabricated converted number.
    const totalMonthlyMinor = displaySubscriptions.reduce((sum, subscription) => {
      const amount = fx ? monthlyAmountIn(subscription, fx.homeCurrency, fx.rates) : monthlyAmount(subscription);
      return amount === null ? sum : sum + amount;
    }, 0);

    return {
      subscriptions: displaySubscriptions,
      hydrated,
      notificationSettings,
      quietHours,
      homeCurrency,
      coachAiConsent,
      exchangeRatesAvailable: Boolean(exchangeRates),
      ratesLastFetchedAt,
      fx,
      totalMonthlyMinor,
      spendSummary: createSpendSummary(displaySubscriptions, new Date(), fx),
      spendTwin: createSpendTwin(totalMonthlyMinor, homeCurrency, exchangeRates),
      familyVault: createFamilyVaultSummary(demoFamilyMembers, displaySubscriptions, homeCurrency, exchangeRates),
      analytics: createAnalyticsSnapshot(displaySubscriptions, new Date(), fx),
      widgetSnapshot,
      businessSummary: createBusinessSummary(demoBusinessWorkspace, displaySubscriptions, new Date(), homeCurrency, exchangeRates),
      yearInReview: buildYearInReview(displaySubscriptions, new Date(), fx),
      partnerIntegrations: partnerIntegrationManifests,
      reminderPlan: createRenewalReminderPlan(displaySubscriptions),
      upcoming: [...displaySubscriptions]
        .filter((subscription) => subscription.status === "active" && subscription.nextRenewalDate && subscription.billingCycle !== "trial")
        .sort((a, b) => Date.parse(a.nextRenewalDate ?? "") - Date.parse(b.nextRenewalDate ?? ""))
        .slice(0, 5),
      endingTrials: getEndingTrials(displaySubscriptions),
      priceHikes: detectPriceHikes(displaySubscriptions, priceHistory),
      addSubscription(input) {
        const now = new Date().toISOString();
        const id = `sub_${Crypto.randomUUID()}`;
        const subscription: Subscription = {
          id,
          createdAt: now,
          updatedAt: now,
          version: 1,
          serviceSlug: input.serviceSlug,
          name: input.name,
          category: input.category,
          price: { amountMinor: input.amountMinor, currency: input.currency ?? "USD" },
          billingCycle: input.billingCycle,
          nextRenewalDate: input.nextRenewalDate,
          status: "active",
          ownerProfileId: "profile_local",
          source: input.source ?? "manual"
        };
        const nextSettings = withNotificationSettingsEntry(notificationSettingsRef.current, id, defaultNotificationSettings);
        notificationSettingsRef.current = nextSettings;
        setNotificationSettings(nextSettings);
        persistNotificationSettings(nextSettings);
        const nextSubscriptions = [subscription, ...subscriptionsRef.current];
        subscriptionsRef.current = nextSubscriptions;
        setSubscriptions(nextSubscriptions);
        persistSubscription(subscription);
        const nextHistory = { ...priceHistoryRef.current, [id]: [{ at: now, amountMinor: input.amountMinor }] };
        priceHistoryRef.current = nextHistory;
        setPriceHistory(nextHistory);
        persistPriceHistory(nextHistory);
        return id;
      },
      updateSubscription(id, changes) {
        // Record a price-history point when the amount actually changes, so the
        // Price-Hike Radar can detect increases over time.
        if (changes.amountMinor !== undefined) {
          const current = subscriptionsRef.current.find((s) => s.id === id);
          if (current && changes.amountMinor !== current.price.amountMinor) {
            const prior = priceHistoryRef.current[id] ?? [{ at: current.createdAt, amountMinor: current.price.amountMinor }];
            const nextHistory = { ...priceHistoryRef.current, [id]: [...prior, { at: new Date().toISOString(), amountMinor: changes.amountMinor }] };
            priceHistoryRef.current = nextHistory;
            setPriceHistory(nextHistory);
            persistPriceHistory(nextHistory);
          }
        }
        applyChange(id, (subscription) => ({
          ...subscription,
          name: changes.name ?? subscription.name,
          serviceSlug: changes.serviceSlug ?? subscription.serviceSlug,
          category: changes.category ?? subscription.category,
          price: changes.amountMinor === undefined
            ? subscription.price
            : { ...subscription.price, amountMinor: changes.amountMinor },
          billingCycle: changes.billingCycle ?? subscription.billingCycle,
          nextRenewalDate: changes.nextRenewalDate ?? subscription.nextRenewalDate,
          status: changes.status ?? subscription.status,
          notes: changes.notes ?? subscription.notes,
          updatedAt: new Date().toISOString(),
          version: subscription.version + 1
        }));
      },
      deleteSubscription(id) {
        const nextSubscriptions = subscriptionsRef.current.filter((subscription) => subscription.id !== id);
        subscriptionsRef.current = nextSubscriptions;
        setSubscriptions(nextSubscriptions);
        const nextSettings = withoutNotificationSettingsEntry(notificationSettingsRef.current, id);
        notificationSettingsRef.current = nextSettings;
        setNotificationSettings(nextSettings);
        persistNotificationSettings(nextSettings);
        const db = dbRef.current;
        if (db) {
          void softDeleteSubscription(db, id).catch((error) => {
            console.warn("Failed to delete subscription.", error);
          });
        }
      },
      pauseSubscription(id) {
        applyChange(id, (subscription) => ({
          ...subscription,
          status: "paused",
          updatedAt: new Date().toISOString(),
          version: subscription.version + 1
        }));
      },
      markCancelled(id) {
        applyChange(id, (subscription) => ({
          ...subscription,
          status: "cancelled",
          updatedAt: new Date().toISOString(),
          version: subscription.version + 1
        }));
      },
      requestCancellation(id) {
        // Guided → Pending verification. We record when, and the date we'll
        // re-check for a charge: the NEXT real renewal, rolled forward so an
        // overdue date can't put verifyBy in the past (which would auto-resolve
        // to "verified" on the next launch with no actual verification).
        const current = subscriptionsRef.current.find((s) => s.id === id);
        const now = new Date();
        const rolled = rollRenewalForward(current?.nextRenewalDate, current?.billingCycle ?? "monthly", now);
        const verifyBy = rolled && Date.parse(rolled) > now.getTime()
          ? rolled
          : new Date(now.getTime() + 34 * 24 * 60 * 60 * 1000).toISOString();
        applyChange(id, (subscription) => ({
          ...subscription,
          status: "pending",
          cancellationRequestedAt: now.toISOString(),
          cancellationVerifyBy: verifyBy,
          updatedAt: now.toISOString(),
          version: subscription.version + 1
        }));
      },
      markVerifiedCancelled(id) {
        applyChange(id, (subscription) => ({
          ...subscription,
          status: "cancelled",
          updatedAt: new Date().toISOString(),
          version: subscription.version + 1
        }));
      },
      markStillCharging(id) {
        applyChange(id, (subscription) => ({
          ...subscription,
          status: "attention",
          updatedAt: new Date().toISOString(),
          version: subscription.version + 1
        }));
      },
      runCancellationVerification() {
        // Resolve pending cancellations whose verify-by date has passed. If a
        // charge was recorded at/after the cancellation request (lastChargedDate,
        // set by the email scanner / a re-import), the sub is still being charged
        // → Needs attention. Otherwise no charge was detected → Verified cancelled.
        // (The manual "I was charged again" control is the other path to attention.)
        const nowMs = Date.now();
        // Snapshot: applyChange rewrites the ref inside the loop, and each
        // resolved subscription must be persisted individually.
        for (const subscription of [...subscriptionsRef.current]) {
          if (subscription.status !== "pending" || !subscription.cancellationVerifyBy) {
            continue;
          }
          if (Date.parse(subscription.cancellationVerifyBy) >= nowMs) {
            continue;
          }
          const requestedMs = subscription.cancellationRequestedAt ? Date.parse(subscription.cancellationRequestedAt) : 0;
          const chargedMs = subscription.lastChargedDate ? Date.parse(subscription.lastChargedDate) : Number.NaN;
          const stillCharged = !Number.isNaN(chargedMs) && chargedMs >= requestedMs;
          applyChange(subscription.id, (current) => ({
            ...current,
            status: stillCharged ? "attention" : "cancelled",
            updatedAt: new Date().toISOString(),
            version: current.version + 1
          }));
        }
      },
      updateNotificationSettings(id, changes) {
        const nextSettings = withUpdatedNotificationSettings(notificationSettingsRef.current, id, changes, defaultNotificationSettings);
        notificationSettingsRef.current = nextSettings;
        setNotificationSettings(nextSettings);
        persistNotificationSettings(nextSettings);
      },
      setQuietHours(changes) {
        const next = { ...quietHours, ...changes };
        setQuietHoursState(next);
        const db = dbRef.current;
        if (db) {
          void writeAppMeta(db, quietHoursMetaKey, JSON.stringify(next)).catch((error) => {
            console.warn("Failed to persist quiet hours.", error);
          });
        }
      },
      setHomeCurrency(currency) {
        setHomeCurrencyState(currency);
        const db = dbRef.current;
        if (db) {
          void writeAppMeta(db, homeCurrencyMetaKey, currency).catch((error) => {
            console.warn("Failed to persist home currency.", error);
          });
        }
      },
      setCoachAiConsent(next) {
        setCoachAiConsentState(next);
        const db = dbRef.current;
        if (db) {
          void writeAppMeta(db, coachAiConsentMetaKey, next).catch((error) => {
            console.warn("Failed to persist AI-coach consent.", error);
          });
        }
      },
      async clearAllData() {
        // (a) empty in-memory subscriptions and (b) per-subscription notification settings.
        subscriptionsRef.current = [];
        setSubscriptions([]);
        notificationSettingsRef.current = {};
        setNotificationSettings({});
        priceHistoryRef.current = {};
        setPriceHistory({});
        // A wiped/deleted account must re-consent before any future transmit.
        setCoachAiConsentState("unset");
        // (c) clear the SQLite rows and the persisted notification-settings blob.
        const db = dbRef.current;
        if (db) {
          await clearAllSubscriptions(db).catch((error) => {
            console.warn("Failed to clear subscriptions.", error);
          });
          await writeAppMeta(db, priceHistoryMetaKey, JSON.stringify({})).catch((error) => {
            console.warn("Failed to clear price history.", error);
          });
          await writeAppMeta(db, notificationSettingsMetaKey, JSON.stringify({})).catch((error) => {
            console.warn("Failed to clear notification settings.", error);
          });
          await writeAppMeta(db, coachAiConsentMetaKey, "unset").catch((error) => {
            console.warn("Failed to reset AI-coach consent.", error);
          });
        }
        // (d) cancel every scheduled renewal notification.
        await cancelAllNotifications().catch((error) => {
          console.warn("Failed to cancel scheduled notifications.", error);
        });
      },
      suggestions(query) {
        return searchServices(query, 8);
      }
    };
  }, [hydrated, notificationSettings, priceHistory, quietHours, displaySubscriptions, fx, widgetSnapshot, homeCurrency, coachAiConsent, exchangeRates, ratesLastFetchedAt]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSubscriptionStore(): SubscriptionStore {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error("useSubscriptionStore must be used inside SubscriptionStoreProvider");
  }
  return value;
}

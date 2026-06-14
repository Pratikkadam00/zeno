import { searchServices } from "@subradar/service-catalog";
import { createAnalyticsSnapshot, createBusinessSummary, createFamilyVaultSummary, createRenewalReminderPlan, createSpendSummary, createSpendTwin, createWidgetSnapshot, demoBusinessWorkspace, demoFamilyMembers, monthlyAmount, partnerIntegrationManifests, type AnalyticsSnapshot, type BillingCycle, type BusinessSubscriptionSummary, type FamilyVaultSummary, type PartnerIntegrationManifest, type RenewalReminderPlan, type SpendSummary, type SpendTwinComparison, type Subscription, type SubscriptionCategory, type SubscriptionStatus, type WidgetSnapshot } from "@subradar/shared";
import * as Crypto from "expo-crypto";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { cancelAllNotifications } from "../notifications/notificationService";
import { openSubRadarDatabase, readAppMeta, writeAppMeta, type SubRadarDatabase } from "../storage/database";
import { clearAllSubscriptions, listSubscriptions, softDeleteSubscription, upsertSubscription } from "../storage/subscription-repository";
import { rollRenewalForward } from "../utils/subscription-ui";
import { seedSubscriptions } from "./seed-subscriptions";

type CreateSubscriptionInput = {
  name: string;
  serviceSlug?: string;
  category: SubscriptionCategory;
  amountMinor: number;
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
  partnerIntegrations: PartnerIntegrationManifest[];
  reminderPlan: RenewalReminderPlan[];
  upcoming: Subscription[];
  addSubscription: (input: CreateSubscriptionInput) => string;
  updateSubscription: (id: string, changes: UpdateSubscriptionInput) => void;
  deleteSubscription: (id: string) => void;
  pauseSubscription: (id: string) => void;
  markCancelled: (id: string) => void;
  updateNotificationSettings: (id: string, changes: Partial<SubscriptionNotificationSettings>) => void;
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

// expo-sqlite is not configured for web; web sessions stay in-memory.
const persistenceEnabled = Platform.OS !== "web";

const StoreContext = createContext<SubscriptionStore | null>(null);

export function SubscriptionStoreProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(seedSubscriptions);
  const [hydrated, setHydrated] = useState(!persistenceEnabled);
  const [notificationSettings, setNotificationSettings] = useState<Record<string, SubscriptionNotificationSettings>>(() => Object.fromEntries(
    seedSubscriptions.map((subscription) => [subscription.id, defaultNotificationSettings])
  ));
  const dbRef = useRef<SubRadarDatabase | null>(null);

  useEffect(() => {
    if (!persistenceEnabled) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const db = await openSubRadarDatabase();
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
        if (cancelled) {
          return;
        }

        setSubscriptions(persisted);
        // Restore saved per-subscription settings, then ensure every persisted
        // subscription has an entry (defaults for any added before this blob was
        // written), so toggles never read undefined.
        let restored: Record<string, SubscriptionNotificationSettings> = {};
        if (storedSettings) {
          try {
            restored = JSON.parse(storedSettings) as Record<string, SubscriptionNotificationSettings>;
          } catch (error) {
            console.warn("Corrupt notification settings in database; using defaults.", error);
          }
        }
        setNotificationSettings(Object.fromEntries(
          persisted.map((subscription) => [subscription.id, restored[subscription.id] ?? defaultNotificationSettings])
        ));
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

  const value = useMemo<SubscriptionStore>(() => {
    const applyChange = (id: string, mutate: (subscription: Subscription) => Subscription) => {
      // Persist outside the updater: React may invoke updaters more than once,
      // so the DB write must not be a side effect of the reducer.
      let updated: Subscription | null = null;
      setSubscriptions((current) => current.map((subscription) => {
        if (subscription.id !== id) {
          return subscription;
        }
        updated = mutate(subscription);
        return updated;
      }));
      if (updated) {
        persistSubscription(updated);
      }
    };

    // Display set: roll overdue active renewals forward to their next cycle so
    // a date that has already passed never shows as "TODAY". Mutations still
    // operate on the raw state by id, so persistence is unaffected.
    const displaySubscriptions = subscriptions.map((subscription) =>
      subscription.status === "active" && subscription.nextRenewalDate
        ? { ...subscription, nextRenewalDate: rollRenewalForward(subscription.nextRenewalDate, subscription.billingCycle) }
        : subscription
    );

    return {
      subscriptions: displaySubscriptions,
      hydrated,
      notificationSettings,
      totalMonthlyMinor: displaySubscriptions.reduce((sum, subscription) => sum + monthlyAmount(subscription), 0),
      spendSummary: createSpendSummary(displaySubscriptions),
      spendTwin: createSpendTwin(displaySubscriptions.reduce((sum, subscription) => sum + monthlyAmount(subscription), 0)),
      familyVault: createFamilyVaultSummary(demoFamilyMembers, displaySubscriptions),
      analytics: createAnalyticsSnapshot(displaySubscriptions),
      widgetSnapshot: createWidgetSnapshot(displaySubscriptions),
      businessSummary: createBusinessSummary(demoBusinessWorkspace, displaySubscriptions),
      partnerIntegrations: partnerIntegrationManifests,
      reminderPlan: createRenewalReminderPlan(displaySubscriptions),
      upcoming: [...displaySubscriptions]
        .filter((subscription) => subscription.status === "active" && subscription.nextRenewalDate)
        .sort((a, b) => Date.parse(a.nextRenewalDate ?? "") - Date.parse(b.nextRenewalDate ?? ""))
        .slice(0, 5),
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
          price: { amountMinor: input.amountMinor, currency: "USD" },
          billingCycle: input.billingCycle,
          nextRenewalDate: input.nextRenewalDate,
          status: "active",
          ownerProfileId: "profile_local",
          source: input.source ?? "manual"
        };
        let nextSettings: Record<string, SubscriptionNotificationSettings> = {};
        setNotificationSettings((current) => {
          nextSettings = { ...current, [id]: defaultNotificationSettings };
          return nextSettings;
        });
        persistNotificationSettings(nextSettings);
        setSubscriptions((current) => [subscription, ...current]);
        persistSubscription(subscription);
        return id;
      },
      updateSubscription(id, changes) {
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
        setSubscriptions((current) => current.filter((subscription) => subscription.id !== id));
        let nextSettings: Record<string, SubscriptionNotificationSettings> = {};
        setNotificationSettings((current) => {
          nextSettings = { ...current };
          delete nextSettings[id];
          return nextSettings;
        });
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
      updateNotificationSettings(id, changes) {
        let nextSettings: Record<string, SubscriptionNotificationSettings> = {};
        setNotificationSettings((current) => {
          nextSettings = {
            ...current,
            [id]: {
              ...(current[id] ?? defaultNotificationSettings),
              ...changes
            }
          };
          return nextSettings;
        });
        persistNotificationSettings(nextSettings);
      },
      async clearAllData() {
        // (a) empty in-memory subscriptions and (b) per-subscription notification settings.
        setSubscriptions([]);
        setNotificationSettings({});
        // (c) clear the SQLite rows and the persisted notification-settings blob.
        const db = dbRef.current;
        if (db) {
          await clearAllSubscriptions(db).catch((error) => {
            console.warn("Failed to clear subscriptions.", error);
          });
          await writeAppMeta(db, notificationSettingsMetaKey, JSON.stringify({})).catch((error) => {
            console.warn("Failed to clear notification settings.", error);
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
  }, [hydrated, notificationSettings, subscriptions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSubscriptionStore(): SubscriptionStore {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error("useSubscriptionStore must be used inside SubscriptionStoreProvider");
  }
  return value;
}

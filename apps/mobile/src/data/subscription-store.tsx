import { searchServices } from "@subradar/service-catalog";
import { createAnalyticsSnapshot, createBusinessSummary, createFamilyVaultSummary, createRenewalReminderPlan, createSpendSummary, createSpendTwin, createWidgetSnapshot, demoBusinessWorkspace, demoFamilyMembers, monthlyAmount, partnerIntegrationManifests, type AnalyticsSnapshot, type BillingCycle, type BusinessSubscriptionSummary, type FamilyVaultSummary, type PartnerIntegrationManifest, type RenewalReminderPlan, type SpendSummary, type SpendTwinComparison, type Subscription, type SubscriptionCategory, type SubscriptionStatus, type WidgetSnapshot } from "@subradar/shared";
import * as Crypto from "expo-crypto";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
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
  suggestions: (query: string) => ReturnType<typeof searchServices>;
};

const defaultNotificationSettings: SubscriptionNotificationSettings = {
  sevenDay: true,
  threeDay: true,
  dayOf: true
};

const StoreContext = createContext<SubscriptionStore | null>(null);

export function SubscriptionStoreProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(seedSubscriptions);
  const [notificationSettings, setNotificationSettings] = useState<Record<string, SubscriptionNotificationSettings>>(() => Object.fromEntries(
    seedSubscriptions.map((subscription) => [subscription.id, defaultNotificationSettings])
  ));

  const value = useMemo<SubscriptionStore>(() => ({
    subscriptions,
    notificationSettings,
    totalMonthlyMinor: subscriptions.reduce((sum, subscription) => sum + monthlyAmount(subscription), 0),
    spendSummary: createSpendSummary(subscriptions),
    spendTwin: createSpendTwin(subscriptions.reduce((sum, subscription) => sum + monthlyAmount(subscription), 0)),
    familyVault: createFamilyVaultSummary(demoFamilyMembers, subscriptions),
    analytics: createAnalyticsSnapshot(subscriptions),
    widgetSnapshot: createWidgetSnapshot(subscriptions),
    businessSummary: createBusinessSummary(demoBusinessWorkspace, subscriptions),
    partnerIntegrations: partnerIntegrationManifests,
    reminderPlan: createRenewalReminderPlan(subscriptions),
    upcoming: [...subscriptions]
      .filter((subscription) => subscription.status === "active" && subscription.nextRenewalDate)
      .sort((a, b) => Date.parse(a.nextRenewalDate ?? "") - Date.parse(b.nextRenewalDate ?? ""))
      .slice(0, 5),
    addSubscription(input) {
      const now = new Date().toISOString();
      const id = `sub_${Crypto.randomUUID()}`;
      setNotificationSettings((current) => ({
        ...current,
        [id]: defaultNotificationSettings
      }));
      setSubscriptions((current) => [
        {
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
        },
        ...current
      ]);
      return id;
    },
    updateSubscription(id, changes) {
      setSubscriptions((current) => current.map((subscription) => {
        if (subscription.id !== id) {
          return subscription;
        }

        return {
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
        };
      }));
    },
    deleteSubscription(id) {
      setSubscriptions((current) => current.filter((subscription) => subscription.id !== id));
      setNotificationSettings((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    },
    pauseSubscription(id) {
      setSubscriptions((current) => current.map((subscription) => subscription.id === id
        ? { ...subscription, status: "paused", updatedAt: new Date().toISOString(), version: subscription.version + 1 }
        : subscription));
    },
    markCancelled(id) {
      setSubscriptions((current) => current.map((subscription) => subscription.id === id
        ? { ...subscription, status: "cancelled", updatedAt: new Date().toISOString(), version: subscription.version + 1 }
        : subscription));
    },
    updateNotificationSettings(id, changes) {
      setNotificationSettings((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? defaultNotificationSettings),
          ...changes
        }
      }));
    },
    suggestions(query) {
      return searchServices(query, 8);
    }
  }), [notificationSettings, subscriptions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSubscriptionStore(): SubscriptionStore {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error("useSubscriptionStore must be used inside SubscriptionStoreProvider");
  }
  return value;
}

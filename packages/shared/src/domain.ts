export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD";

export type Money = {
  amountMinor: number;
  currency: CurrencyCode;
};

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "annual" | "trial" | "unknown";

export type SubscriptionCategory =
  | "ai_tools"
  | "entertainment"
  | "productivity"
  | "health"
  | "finance"
  | "education"
  | "developer_tools"
  | "family"
  | "other";

export type ThemePreference = "genz" | "millennial" | "genx";

export type CancellationDifficulty = "easy" | "medium" | "hard" | "dark_pattern";

// "pending"   — user self-reported a cancellation; awaiting verification.
// "attention" — a charge was detected after cancelling; still being charged.
// "cancelled" — verified cancelled (no further charge detected).
export type SubscriptionStatus = "active" | "cancelled" | "paused" | "trial" | "unknown" | "pending" | "attention";

export type EntityMeta = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deviceId?: string;
  version: number;
};

export type ServiceRecord = EntityMeta & {
  slug: string;
  name: string;
  website: string;
  logoUrl?: string;
  category: SubscriptionCategory;
  defaultMonthlyPrice?: Money;
  defaultAnnualPrice?: Money;
  cancellationUrl?: string;
  cancellationDifficulty: CancellationDifficulty;
  cancellationGuideSteps: string[];
  freeTrialDays?: number;
  supportContact?: {
    email?: string;
    phone?: string;
    chatUrl?: string;
  };
};

export type Subscription = EntityMeta & {
  serviceId?: string;
  serviceSlug?: string;
  name: string;
  category: SubscriptionCategory;
  price: Money;
  billingCycle: BillingCycle;
  nextRenewalDate?: string;
  lastChargedDate?: string;
  status: SubscriptionStatus;
  ownerProfileId: string;
  valueRating?: "low" | "medium" | "high";
  notes?: string;
  mutedUntil?: string;
  // Cancellation verification lifecycle (CHANGE 4).
  cancellationRequestedAt?: string; // when the user self-reported cancelling
  cancellationVerifyBy?: string;    // date Zeno re-checks for a charge (the prior renewal date)
  source: "manual" | "csv" | "email" | "open_banking" | "seed";
};

export type RenewalEvent = EntityMeta & {
  subscriptionId: string;
  dueAt: string;
  amount: Money;
  status: "scheduled" | "notified" | "charged" | "cancelled" | "dismissed";
  notificationTypes: Array<"day_of" | "three_day" | "seven_day">;
};

export type NotificationPreference = EntityMeta & {
  type:
    | "upcoming_renewal_early"
    | "upcoming_renewal_urgent"
    | "charge_detected"
    | "unexpected_charge"
    | "unused_subscription"
    | "spend_milestone"
    | "new_subscription_found"
    | "free_trial_ending";
  enabled: boolean;
  digestOnly: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

export type UserProfile = EntityMeta & {
  emailHash?: string;
  displayName?: string;
  themePreference: ThemePreference;
  plan: "free" | "pro" | "family";
  biometricRequired: boolean;
  pinEnabled: boolean;
};

export type ImportBatch = EntityMeta & {
  source: "csv" | "email" | "open_banking";
  status: "pending_review" | "confirmed" | "discarded" | "failed";
  detectedCount: number;
  confirmedCount: number;
  rawSourceRetained: false;
};

export type SyncOutbox = EntityMeta & {
  entityType: "subscription" | "preference" | "profile";
  entityId: string;
  operation: "create" | "update" | "delete";
  encryptedPayload?: string;
  vectorClock: Record<string, number>;
  syncStatus: "pending" | "sent" | "failed";
};

export type AuditEvent = EntityMeta & {
  actor: "user" | "system";
  action:
    | "app_locked"
    | "app_unlocked"
    | "pin_failed"
    | "csv_import_started"
    | "csv_import_completed"
    | "csv_raw_discarded"
    | "secure_token_saved"
    | "secure_token_deleted"
    | "data_export_requested"
    | "data_delete_requested";
  metadata?: Record<string, string | number | boolean>;
};

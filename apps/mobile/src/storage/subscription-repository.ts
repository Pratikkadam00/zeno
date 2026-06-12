import type { Subscription } from "@subradar/shared";
import type { SubRadarDatabase } from "./database";

type SubscriptionRow = {
  id: string;
  service_slug: string | null;
  name: string;
  category: Subscription["category"];
  amount_minor: number;
  currency: Subscription["price"]["currency"];
  billing_cycle: Subscription["billingCycle"];
  next_renewal_date: string | null;
  last_charged_date: string | null;
  status: Subscription["status"];
  owner_profile_id: string;
  value_rating: Subscription["valueRating"] | null;
  notes: string | null;
  muted_until: string | null;
  source: Subscription["source"];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  device_id: string | null;
  version: number;
};

export async function listSubscriptions(db: SubRadarDatabase): Promise<Subscription[]> {
  const rows = await db.getAllAsync<SubscriptionRow>("SELECT * FROM subscriptions WHERE deleted_at IS NULL ORDER BY next_renewal_date ASC, name ASC");
  return rows.map(mapRow);
}

export async function upsertSubscription(db: SubRadarDatabase, subscription: Subscription): Promise<void> {
  await db.runAsync(
    `INSERT INTO subscriptions (
      id, service_slug, name, category, amount_minor, currency, billing_cycle, next_renewal_date,
      last_charged_date, status, owner_profile_id, value_rating, notes, muted_until, source,
      created_at, updated_at, deleted_at, device_id, version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      service_slug = excluded.service_slug,
      name = excluded.name,
      category = excluded.category,
      amount_minor = excluded.amount_minor,
      currency = excluded.currency,
      billing_cycle = excluded.billing_cycle,
      next_renewal_date = excluded.next_renewal_date,
      last_charged_date = excluded.last_charged_date,
      status = excluded.status,
      owner_profile_id = excluded.owner_profile_id,
      value_rating = excluded.value_rating,
      notes = excluded.notes,
      muted_until = excluded.muted_until,
      source = excluded.source,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      version = excluded.version`,
    subscription.id,
    subscription.serviceSlug ?? null,
    subscription.name,
    subscription.category,
    subscription.price.amountMinor,
    subscription.price.currency,
    subscription.billingCycle,
    subscription.nextRenewalDate ?? null,
    subscription.lastChargedDate ?? null,
    subscription.status,
    subscription.ownerProfileId,
    subscription.valueRating ?? null,
    subscription.notes ?? null,
    subscription.mutedUntil ?? null,
    subscription.source,
    subscription.createdAt,
    subscription.updatedAt,
    subscription.deletedAt ?? null,
    subscription.deviceId ?? null,
    subscription.version
  );
}

export async function softDeleteSubscription(db: SubRadarDatabase, id: string): Promise<void> {
  await db.runAsync(
    "UPDATE subscriptions SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ?",
    new Date().toISOString(),
    new Date().toISOString(),
    id
  );
}

function mapRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
    deviceId: row.device_id ?? undefined,
    version: row.version,
    serviceSlug: row.service_slug ?? undefined,
    name: row.name,
    category: row.category,
    price: {
      amountMinor: row.amount_minor,
      currency: row.currency
    },
    billingCycle: row.billing_cycle,
    nextRenewalDate: row.next_renewal_date ?? undefined,
    lastChargedDate: row.last_charged_date ?? undefined,
    status: row.status,
    ownerProfileId: row.owner_profile_id,
    valueRating: row.value_rating ?? undefined,
    notes: row.notes ?? undefined,
    mutedUntil: row.muted_until ?? undefined,
    source: row.source
  };
}

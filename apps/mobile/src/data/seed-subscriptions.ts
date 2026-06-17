import type { Subscription } from "@zeno/shared";

// Seed dates are relative to first launch so the demo always shows a believable
// mix of imminent renewals (and never stale "TODAY" badges from fixed dates).
const launch = new Date();
const now = (() => {
  const created = new Date(launch);
  created.setUTCMonth(created.getUTCMonth() - 2);
  return created.toISOString();
})();
function renewalInDays(days: number): string {
  const date = new Date(launch);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(9, 0, 0, 0);
  return date.toISOString();
}

export const seedSubscriptions: Subscription[] = [
  {
    id: "sub_adobe",
    createdAt: now,
    updatedAt: now,
    version: 1,
    serviceSlug: "adobe-creative-cloud",
    name: "Adobe Creative Cloud",
    category: "productivity",
    price: { amountMinor: 5499, currency: "USD" },
    billingCycle: "monthly",
    nextRenewalDate: renewalInDays(2),
    status: "active",
    ownerProfileId: "profile_local",
    valueRating: "medium",
    source: "seed"
  },
  {
    id: "sub_midjourney",
    createdAt: now,
    updatedAt: now,
    version: 1,
    serviceSlug: "midjourney",
    name: "Midjourney",
    category: "ai_tools",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly",
    nextRenewalDate: renewalInDays(5),
    status: "active",
    ownerProfileId: "profile_local",
    valueRating: "high",
    source: "seed"
  },
  {
    id: "sub_netflix",
    createdAt: now,
    updatedAt: now,
    version: 1,
    serviceSlug: "netflix",
    name: "Netflix",
    category: "entertainment",
    price: { amountMinor: 1549, currency: "USD" },
    billingCycle: "monthly",
    nextRenewalDate: renewalInDays(1),
    status: "active",
    ownerProfileId: "profile_local",
    valueRating: "medium",
    source: "seed"
  },
  {
    id: "sub_family_disney",
    createdAt: now,
    updatedAt: now,
    version: 1,
    serviceSlug: "disney-plus",
    name: "Disney+ Family",
    category: "family",
    price: { amountMinor: 1399, currency: "USD" },
    billingCycle: "monthly",
    nextRenewalDate: renewalInDays(9),
    status: "active",
    ownerProfileId: "family_maya",
    valueRating: "high",
    source: "seed"
  },
  {
    id: "sub_family_duolingo",
    createdAt: now,
    updatedAt: now,
    version: 1,
    serviceSlug: "duolingo-super",
    name: "Super Duolingo",
    category: "education",
    price: { amountMinor: 1299, currency: "USD" },
    billingCycle: "monthly",
    nextRenewalDate: renewalInDays(14),
    status: "active",
    ownerProfileId: "family_avi",
    valueRating: "medium",
    source: "seed"
  }
];

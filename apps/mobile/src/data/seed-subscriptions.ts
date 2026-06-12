import type { Subscription } from "@subradar/shared";

const now = "2026-05-24T00:00:00.000Z";

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
    nextRenewalDate: "2026-05-27T09:00:00.000Z",
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
    nextRenewalDate: "2026-05-31T09:00:00.000Z",
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
    nextRenewalDate: "2026-06-04T09:00:00.000Z",
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
    nextRenewalDate: "2026-06-08T09:00:00.000Z",
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
    nextRenewalDate: "2026-06-12T09:00:00.000Z",
    status: "active",
    ownerProfileId: "family_avi",
    valueRating: "medium",
    source: "seed"
  }
];

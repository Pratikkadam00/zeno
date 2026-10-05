import { todayLabel, type Subscription } from "@zeno/shared";

// Seed dates are relative to first launch so the demo always shows a believable
// mix of imminent renewals (and never stale "TODAY" badges from fixed dates).
const launch = new Date();
const now = (() => {
  const created = new Date(launch);
  created.setUTCMonth(created.getUTCMonth() - 2);
  return created.toISOString();
})();
// N days after the user's date at launch ("which today?", P5), at 09:00 UTC.
function renewalInDays(days: number): string {
  const date = new Date(todayLabel(launch));
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(9, 0, 0, 0);
  return date.toISOString();
}

// Stryker disable StringLiteral: sample subscriptions for the demo; a changed name,
// id or category is a different sample, not a behaviour a test could judge (P6.3).
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
    // The catalog lists this plan as "duolingo-plus" (Super is Duolingo's
    // current name for it); a slug the catalog lacks leaves the demo's detail
    // and cancel screens with no service to show.
    serviceSlug: "duolingo-plus",
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
// Stryker restore StringLiteral

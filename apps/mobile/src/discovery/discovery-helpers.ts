export type DiscoveryBillingCycle = "monthly" | "quarterly" | "annual" | "weekly" | "unknown";

export type DiscoveryConfidence = "high" | "medium" | "low";

export function calculateNextRenewal(lastCharged: Date, cycle: DiscoveryBillingCycle): Date {
  const next = new Date(lastCharged);
  if (cycle === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  const months = cycle === "annual" ? 12 : cycle === "quarterly" ? 3 : 1;
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, daysInTargetMonth));
  return next;
}

// Infer a billing cycle from the gaps (in days) between successive charges of
// the same service. Uses the median gap so one odd interval (a missed/duplicated
// receipt) doesn't skew it. Returns null when no known cadence matches, so the
// caller keeps its text-derived guess.
export function inferRecurringCycle(gaps: number[]): DiscoveryBillingCycle | null {
  if (gaps.length === 0) {
    return null;
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  if (median >= 5 && median <= 9) return "weekly";
  if (median >= 24 && median <= 35) return "monthly";
  if (median >= 85 && median <= 95) return "quarterly";
  if (median >= 350 && median <= 380) return "annual";
  return null;
}

export function confidenceRank(confidence: DiscoveryConfidence): number {
  if (confidence === "high") {
    return 3;
  }
  if (confidence === "medium") {
    return 2;
  }
  return 1;
}

export function isWithin(amount: number, expected: number, tolerance: number, minimumTolerance = 0): boolean {
  return Math.abs(amount - expected) <= Math.max(minimumTolerance, expected * tolerance);
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

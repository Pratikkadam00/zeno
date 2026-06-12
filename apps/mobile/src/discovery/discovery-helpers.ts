export type DiscoveryBillingCycle = "monthly" | "annual" | "weekly" | "unknown";

export type DiscoveryConfidence = "high" | "medium" | "low";

export function calculateNextRenewal(lastCharged: Date, cycle: DiscoveryBillingCycle): Date {
  const next = new Date(lastCharged);
  if (cycle === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  const months = cycle === "annual" ? 12 : 1;
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, daysInTargetMonth));
  return next;
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

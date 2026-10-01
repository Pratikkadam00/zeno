import type { BillingCycle } from "@zeno/shared";

/**
 * The suffix after a per-cycle price ("$9.99/month"). An unknown cycle gets
 * none: "/month" invented a cycle the app does not know (F131), the same
 * class of error as F117's invented yearly figure.
 */
export function billingSuffix(cycle: BillingCycle): string {
  if (cycle === "annual") return "/year";
  if (cycle === "weekly") return "/week";
  if (cycle === "quarterly") return "/quarter";
  if (cycle === "trial") return "/trial";
  if (cycle === "monthly") return "/month";
  return "";
}

/**
 * A year of a per-cycle price, or null for a trial or an unknown cycle (F117:
 * no recurring yearly figure to promise; as @zeno/shared's monthlyAmount).
 */
export function annualAmountMinor(amountMinor: number, cycle: BillingCycle): number | null {
  if (cycle === "weekly") return amountMinor * 52;
  if (cycle === "quarterly") return amountMinor * 4;
  if (cycle === "annual") return amountMinor;
  if (cycle === "monthly") return amountMinor * 12;
  return null;
}

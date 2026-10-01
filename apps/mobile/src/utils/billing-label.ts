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

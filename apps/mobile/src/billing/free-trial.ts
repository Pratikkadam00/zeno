import type { PurchasesPackage } from "react-native-purchases";

/**
 * Whether the paywall may promise a free trial for this package, and how long
 * (F134). It used to say "Start 7-day free trial · No charge until trial ends"
 * whatever the store offered, so a returning user (or a product with no trial,
 * or no store at all) was told "no charge" and charged at once.
 *
 * - iOS: the product's intro price is free AND RevenueCat says this user is
 *   ELIGIBLE. Its docs: on UNKNOWN "display the non-intro pricing, to not
 *   create a misleading situation".
 * - Android: the package's default option (what `purchasePackage` buys) has a
 *   free phase. Google Play leaves a new-customer offer out of the options when
 *   the user isn't eligible (RevenueCat's Google Play offers guide); a
 *   "developer determined" offer would always appear, so the trial must be set
 *   up as a new-customer offer (an owner check, in OPEN_ITEMS).
 * - No live package (store not configured, offerings not loaded): no trial.
 */
export type FreeTrial = { length: string };

/** react-native-purchases' INTRO_ELIGIBILITY_STATUS_ELIGIBLE. */
export const INTRO_ELIGIBLE = 2;

const UNITS: Record<string, string> = { DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year" };

function lengthOf(unit: string, count: number): string | null {
  const word = UNITS[unit];
  return word && Number.isInteger(count) && count > 0 ? `${count}-${word}` : null;
}

export function freeTrialOf(pkg: PurchasesPackage | null, os: string, iosEligibility: number | undefined): FreeTrial | null {
  if (!pkg) return null;
  if (os === "ios") {
    const intro = pkg.product.introPrice;
    if (!intro || intro.price !== 0 || iosEligibility !== INTRO_ELIGIBLE) return null;
    const length = lengthOf(intro.periodUnit, intro.periodNumberOfUnits * intro.cycles);
    return length ? { length } : null;
  }
  const phase = pkg.product.defaultOption?.freePhase;
  if (!phase) return null;
  const length = lengthOf(phase.billingPeriod.unit, phase.billingPeriod.value * (phase.billingCycleCount ?? 1));
  return length ? { length } : null;
}

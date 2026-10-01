import type { PurchasesPackage } from "react-native-purchases";
import { describe, expect, it } from "vitest";
import { freeTrialOf, INTRO_ELIGIBLE } from "./free-trial";

const ios = (introPrice: unknown) => ({ product: { introPrice } }) as unknown as PurchasesPackage;
const android = (freePhase: unknown) => ({ product: { introPrice: null, defaultOption: freePhase === undefined ? null : { freePhase } } }) as unknown as PurchasesPackage;
const intro = (over: object = {}) => ({ price: 0, priceString: "$0.00", cycles: 1, period: "P1W", periodUnit: "WEEK", periodNumberOfUnits: 1, ...over });
const phase = (unit: string, value: number, billingCycleCount: number | null = 1) => ({ billingPeriod: { unit, value, iso8601: "" }, billingCycleCount });

describe("freeTrialOf (F134)", () => {
  it("no live package: never a trial", () => {
    expect(freeTrialOf(null, "ios", INTRO_ELIGIBLE)).toBeNull();
    expect(freeTrialOf(null, "android", undefined)).toBeNull();
  });

  it("iOS: a free intro the user is ELIGIBLE for, with its own length", () => {
    expect(freeTrialOf(ios(intro()), "ios", INTRO_ELIGIBLE)).toEqual({ length: "1-week" });
    expect(freeTrialOf(ios(intro({ periodUnit: "DAY", periodNumberOfUnits: 7 })), "ios", INTRO_ELIGIBLE)).toEqual({ length: "7-day" });
    expect(freeTrialOf(ios(intro({ periodUnit: "MONTH", periodNumberOfUnits: 1, cycles: 2 })), "ios", INTRO_ELIGIBLE)).toEqual({ length: "2-month" });
  });

  it.each([
    ["ineligible", ios(intro()), 1],
    ["eligibility unknown", ios(intro()), 0],
    ["no intro offer exists", ios(intro()), 3],
    ["eligibility never read", ios(intro()), undefined],
    ["a PAID intro price", ios(intro({ price: 0.99 })), INTRO_ELIGIBLE],
    ["no intro price", ios(null), INTRO_ELIGIBLE],
    ["an unknown unit", ios(intro({ periodUnit: "UNKNOWN" })), INTRO_ELIGIBLE],
    ["a zero length", ios(intro({ periodNumberOfUnits: 0 })), INTRO_ELIGIBLE]
  ])("iOS, %s: no trial", (_name, pkg, eligibility) => {
    expect(freeTrialOf(pkg, "ios", eligibility)).toBeNull();
  });

  it("Android: the default option's free phase", () => {
    expect(freeTrialOf(android(phase("DAY", 7)), "android", undefined)).toEqual({ length: "7-day" });
    expect(freeTrialOf(android(phase("WEEK", 1, null)), "android", undefined)).toEqual({ length: "1-week" });
    expect(freeTrialOf(android(phase("YEAR", 1)), "android", undefined)).toEqual({ length: "1-year" });
  });

  it("Android: no default option, no free phase, or an unknown unit: no trial", () => {
    expect(freeTrialOf(android(undefined), "android", undefined)).toBeNull();
    expect(freeTrialOf(android(null), "android", undefined)).toBeNull();
    expect(freeTrialOf(android(phase("UNKNOWN", 1)), "android", undefined)).toBeNull();
  });
});

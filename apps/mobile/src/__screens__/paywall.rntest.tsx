import { act, fireEvent, screen } from "@testing-library/react-native";
import { Alert, Linking, Platform, ToastAndroid } from "react-native";
import PaywallScreen from "../../app/paywall";
import { renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8e-2: the paywall (app/paywall.tsx). The billing module is faked with
 * store packages shaped like react-native-purchases' (priceString, introPrice,
 * defaultOption.freePhase); the trial rule itself is the real one
 * (src/billing/free-trial.ts).
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../billing/revenueCat", () => ({
  getOfferings: jest.fn(),
  getTrialEligibility: jest.fn(),
  purchasePro: jest.fn(),
  purchaseLifetime: jest.fn(),
  purchaseFamily: jest.fn(),
  restorePurchases: jest.fn(),
  // The real one-liner (revenueCat.ts): the live price, else the fallback.
  getPackagePrice: (pkg: { product: { priceString: string } } | null, fallback: string) => pkg?.product.priceString ?? fallback
}));
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create(() => ({ setPlan: jest.fn() })) };
});
/* eslint-disable @typescript-eslint/no-require-imports */
const rc = require("../billing/revenueCat") as Record<string, jest.Mock>;
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { getState: () => { setPlan: jest.Mock } } };
/* eslint-enable @typescript-eslint/no-require-imports */

type Pkg = { identifier: string; product: { identifier: string; priceString: string; introPrice: unknown; defaultOption: unknown } };
const pkg = (id: string, priceString: string, over: Partial<Pkg["product"]> = {}): Pkg => ({
  identifier: id, product: { identifier: id, priceString, introPrice: null, defaultOption: null, ...over }
});
const weekFree = { price: 0, priceString: "$0.00", cycles: 1, period: "P1W", periodUnit: "WEEK", periodNumberOfUnits: 1 };
const offerings = (over: Record<string, unknown> = {}) => ({
  pro: null, family: null,
  proMonthly: pkg("zeno_pro_monthly", "$3.99"),
  proAnnual: pkg("zeno_pro_annual", "$29.99", { introPrice: weekFree }),
  proLifetime: pkg("zeno_pro_lifetime", "$79.99"),
  familyMonthly: pkg("zeno_family_monthly", "$6.99"),
  ...over
});

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
const toast = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  for (const f of Object.values(rc)) if (jest.isMockFunction(f)) f.mockReset();
  rc.getOfferings!.mockResolvedValue(offerings());
  rc.getTrialEligibility!.mockResolvedValue({ zeno_pro_annual: 2 });
  alert.mockClear();
  toast.mockClear();
  openURL.mockClear();
  routerMock.canGoBack.mockReturnValue(true);
  useAuthStore.getState().setPlan.mockClear();
});
afterEach(() => jest.useRealTimers());

const open = () => renderScreen(<PaywallScreen />, { settleMs: 300 });
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const cta = () => screen.getByText(/^(Start .* free trial|Subscribe for .*|Buy once for .*)$/);

describe("paywall, prices", () => {
  it("annual by default: live prices, the per-month figure, the saving; every control is named", async () => {
    const r = await open();
    expect(screen.getByText("$29.99/yr")).toBeTruthy();
    expect(screen.getByText("$3.99/mo")).toBeTruthy();
    expect(screen.getByText("Save 37%")).toBeTruthy(); // 1 - 29.99 / 47.88
    expect(screen.getByText("2")).toBeTruthy(); // 29.99 / 12 = 2.499..., shown $2.50/mo
    expect(screen.getByText(".50")).toBeTruthy();
    expect(screen.getByText("billed as $29.99/year")).toBeTruthy();
    expect(screen.getByText("Up to 5 members · $6.99/mo")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("monthly and lifetime show their own price and terms", async () => {
    await open();
    await press(/^Monthly plan/);
    expect(screen.getByText("billed monthly · cancel anytime")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    await press(/^Lifetime plan/);
    expect(screen.getByText("one payment · yours forever, no trial needed")).toBeTruthy();
    expect(screen.getByText(/^YNAB charges \$109/)).toBeTruthy();
    expect(cta().props.children).toBe("Buy once for $79.99");
    await press(/^Annual plan, \$29\.99 per year, save 37 percent$/);
    expect(screen.getByText("billed as $29.99/year")).toBeTruthy();
  });

  it("a localized store price is shown as the store wrote it, with no derived figures", async () => {
    rc.getOfferings!.mockResolvedValue(offerings({ proMonthly: pkg("zeno_pro_monthly", "3,99 €"), proAnnual: pkg("zeno_pro_annual", "29,99 €") }));
    await open();
    expect(screen.getAllByText("29,99 €").length).toBeGreaterThan(0);
    expect(screen.getByText("/yr")).toBeTruthy();
    expect(screen.getByText("billed annually · cancel anytime")).toBeTruthy();
    expect(screen.queryByText(/^Save \d+%$/)).toBeNull();
  });

  it("a malformed $ price falls back to dollars without cents", async () => {
    rc.getOfferings!.mockResolvedValue(offerings({ proMonthly: pkg("zeno_pro_monthly", "$4") }));
    await open();
    await press(/^Monthly plan/);
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText(".00")).toBeTruthy();
  });

  it("no store configured: the fallback prices, and an annual plan dearer than monthly claims no saving", async () => {
    rc.getOfferings!.mockRejectedValue(new Error("RevenueCat is not configured."));
    await open();
    expect(screen.getByText("RevenueCat is not configured.")).toBeTruthy();
    expect(screen.getByText("$29.99/yr")).toBeTruthy();
    rc.getOfferings!.mockResolvedValue(offerings({ proAnnual: pkg("zeno_pro_annual", "$59.99") }));
    await open();
    expect(screen.queryByText(/^Save \d+%$/)).toBeNull();
  });

  it("a non-Error failure gets a generic message", async () => {
    rc.getOfferings!.mockRejectedValue("boom");
    await open();
    expect(screen.getByText("Purchase failed. Please try again.")).toBeTruthy();
  });
});

describe("paywall, the free trial it promises (F134, F133)", () => {
  it("iOS, eligible for the annual plan's free week: offers exactly that, and no reminder it can't keep", async () => {
    await open();
    expect(rc.getTrialEligibility).toHaveBeenCalledWith(["zeno_pro_monthly", "zeno_pro_annual"]);
    expect(cta().props.children).toBe("Start 1-week free trial");
    expect(screen.getByText("No charge until the trial ends · cancel anytime")).toBeTruthy();
    expect(screen.queryByText(/remind you/)).toBeNull();
  });

  it("iOS, NOT eligible (trial already used): no trial, and it says the charge is today", async () => {
    rc.getTrialEligibility!.mockResolvedValue({ zeno_pro_annual: 1 });
    await open();
    expect(cta().props.children).toBe("Subscribe for $29.99/yr");
    expect(screen.getByText("Charged today · cancel anytime")).toBeTruthy();
  });

  it("a plan with no trial (monthly here), or no store at all: no trial", async () => {
    await open();
    await press(/^Monthly plan/);
    expect(cta().props.children).toBe("Subscribe for $3.99/mo");
    rc.getOfferings!.mockRejectedValue(new Error("x"));
    await open();
    expect(cta().props.children).toBe("Subscribe for $29.99/yr");
  });

  it("Android: the default option's free phase decides", async () => {
    const os = jest.replaceProperty(Platform, "OS", "android");
    try {
      rc.getTrialEligibility!.mockResolvedValue({});
      rc.getOfferings!.mockResolvedValue(offerings({ proAnnual: pkg("zeno_pro_annual", "$29.99", { defaultOption: { freePhase: { billingPeriod: { unit: "DAY", value: 7, iso8601: "P7D" }, billingCycleCount: 1 } } }) }));
      await open();
      expect(cta().props.children).toBe("Start 7-day free trial");
    } finally {
      os.restore();
    }
  });

  it("offerings without monthly or annual packages ask about no products", async () => {
    rc.getOfferings!.mockResolvedValue(offerings({ proMonthly: null, proAnnual: null }));
    await open();
    expect(rc.getTrialEligibility).toHaveBeenCalledWith([]);
  });
});

describe("paywall, buying", () => {
  it("Pro: buys the selected period, sets the plan, says so (iOS alert), Get Started to the ledger", async () => {
    rc.purchasePro!.mockResolvedValue("pro");
    await open();
    await press("Start 1-week free trial");
    expect(rc.purchasePro).toHaveBeenCalledWith("annual");
    expect(useAuthStore.getState().setPlan).toHaveBeenCalledWith("pro");
    expect(alert).toHaveBeenCalledWith("Success", "Zeno Pro is active.");
    expect(screen.getByText("Welcome to Pro")).toBeTruthy();
    await press("Get Started");
    expect(routerMock.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("F136: Family says Family; on Android the confirmation is a toast", async () => {
    const os = jest.replaceProperty(Platform, "OS", "android");
    try {
      rc.purchaseFamily!.mockResolvedValue("family");
      await open();
      await press(/^Family plan/);
      expect(toast).toHaveBeenCalledWith("Zeno Family is active.", ToastAndroid.SHORT);
      expect(screen.getByText("Welcome to Family")).toBeTruthy();
    } finally {
      os.restore();
    }
  });

  it("Lifetime buys the one-time product", async () => {
    rc.purchaseLifetime!.mockResolvedValue("pro");
    await open();
    await press(/^Lifetime plan/);
    await press("Buy once for $79.99");
    expect(rc.purchaseLifetime).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Welcome to Pro")).toBeTruthy();
  });

  it("F137: a purchase that leaves no active plan says so instead of 'Pro is active'", async () => {
    rc.purchasePro!.mockResolvedValue("free");
    await open();
    await press("Start 1-week free trial");
    expect(screen.getByText(/^The store completed the purchase, but Zeno Pro isn't active/)).toBeTruthy();
    expect(screen.queryByText("Welcome to Pro")).toBeNull();
    expect(alert).not.toHaveBeenCalled();
  });

  it("F135: closing the store sheet is not an error; a real failure is shown (each way to buy)", async () => {
    const cancelled = Object.assign(new Error("Purchase was cancelled."), { code: "1" });
    rc.purchasePro!.mockRejectedValueOnce(cancelled).mockRejectedValueOnce(new Error("Store unavailable"));
    rc.purchaseFamily!.mockRejectedValueOnce(cancelled).mockRejectedValueOnce(new Error("Family failed"));
    rc.purchaseLifetime!.mockRejectedValueOnce(cancelled).mockRejectedValueOnce(new Error("Lifetime failed"));
    await open();
    await press("Start 1-week free trial");
    expect(screen.queryByText("Purchase was cancelled.")).toBeNull();
    await press("Start 1-week free trial");
    expect(screen.getByText("Store unavailable")).toBeTruthy();
    await press(/^Family plan/);
    expect(screen.queryByText("Store unavailable")).toBeNull();
    await press(/^Family plan/);
    expect(screen.getByText("Family failed")).toBeTruthy();
    await press(/^Lifetime plan/);
    await press("Buy once for $79.99");
    await press("Buy once for $79.99");
    expect(screen.getByText("Lifetime failed")).toBeTruthy();
  });
});

describe("paywall, restore, links, closing", () => {
  it("restore: found, nothing found, or failed", async () => {
    rc.restorePurchases!.mockResolvedValueOnce("free").mockRejectedValueOnce(new Error("Network")).mockResolvedValueOnce("pro");
    await open();
    await press("Restore purchases");
    expect(screen.getByText("No active Zeno subscription was found on this store account.")).toBeTruthy();
    await press("Restore purchases");
    expect(screen.getByText("Network")).toBeTruthy();
    await press("Restore purchases");
    expect(useAuthStore.getState().setPlan).toHaveBeenLastCalledWith("pro");
    expect(alert).toHaveBeenCalledWith("Success", "Restored Zeno pro.");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });

  it("the legal links open the site's pages", async () => {
    await open();
    const links = screen.getAllByRole("link");
    await act(async () => { fireEvent.press(links[0]!); });
    expect(openURL).toHaveBeenLastCalledWith(expect.stringMatching(/\/legal\/terms$/));
    await act(async () => { fireEvent.press(links[1]!); });
    expect(openURL).toHaveBeenLastCalledWith(expect.stringMatching(/\/legal\/privacy$/));
  });

  it("Close goes back, or to the ledger when there is nowhere to go back to", async () => {
    await open();
    await press("Close paywall");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
    routerMock.canGoBack.mockReturnValue(false);
    await press("Close paywall");
    expect(routerMock.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("while buying, the buttons are locked and a spinner says it's working", async () => {
    let finish: (plan: string) => void = () => {};
    rc.purchasePro!.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await open();
    await press("Start 1-week free trial");
    expect(screen.getByText("Processing...")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Family plan/ }).props.accessibilityState).toMatchObject({ disabled: true });
    await act(async () => { finish("pro"); });
    expect(screen.getByText("Welcome to Pro")).toBeTruthy();
  });

  it("leaving before the store answers changes nothing", async () => {
    let resolveOfferings: (o: unknown) => void = () => {};
    let rejectOfferings: (e: unknown) => void = () => {};
    rc.getOfferings!.mockImplementationOnce(() => new Promise((resolve) => { resolveOfferings = resolve; }));
    const first = await open();
    first.unmount();
    await act(async () => { resolveOfferings(offerings()); });
    rc.getOfferings!.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOfferings = reject; }));
    const second = await open();
    second.unmount();
    await act(async () => { rejectOfferings(new Error("late")); });
    expect(rc.getTrialEligibility).not.toHaveBeenCalled();
  });
});

import type { Subscription } from "@zeno/shared";
import { dayLabelInDays } from "../utils/day-label";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import DashboardScreen from "../../app/(tabs)/dashboard";
import { seedSubscriptions } from "../data/seed-subscriptions";
import { computeBudgetForecast } from "../finance/budget";
import { generateInsights } from "../insights/insightsEngine";
import { formatMoney } from "../utils/format";
import { categoryLabel, formatShortDate } from "../utils/subscription-ui";
import { fakeStorage, renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8c: the Ledger tab (app/(tabs)/dashboard.tsx), through the app's real
 * stores, with the bundled seed data (5 monthly USD subscriptions, $107.46).
 * Expected values come from the app's own logic (seed file, generateInsights,
 * computeBudgetForecast, formatShortDate), not from numbers typed in here.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
const mockCheckStatus = jest.fn();
jest.mock("../billing/revenueCat", () => ({ checkStatus: () => mockCheckStatus() }));
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create((set: (s: object) => void) => ({ plan: "free", setPlan: (plan: string) => set({ plan }) })) };
});
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { setState: (s: object) => void; getState: () => { plan: string } } };

const reduceMotion = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");
const DAY = 86_400_000;
// Dates are stored as day labels (midnight UTC of the user's calendar day,
// F182/F202), so fixtures are too: "in N days" counts from the phone's date.
const iso = (days: number) => dayLabelInDays(days).toISOString();
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "sub_x", createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: "Zzqx", category: "other",
  price: { amountMinor: 1000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(10),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  reduceMotion.mockResolvedValue(false);
  mockCheckStatus.mockReset().mockResolvedValue("free");
  useAuthStore.setState({ plan: "free" });
});

afterEach(() => jest.useRealTimers());
// Long enough for the total's count-up (600 ms) and its 300 ms failsafe.
const show = (ui: React.ReactElement) => renderScreen(ui, { settleMs: 1500 });

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));

describe("Ledger tab, seed data", () => {
  it("totals the month ($107.46), counts against the free plan, and names every control", async () => {
    const r = await show(<DashboardScreen />);
    // The count-up has run to its end (show() settles it): the FINAL value.
    expect(screen.getByText("107")).toBeTruthy();
    expect(screen.getByText(".46")).toBeTruthy();
    expect(screen.getByText("5/10 FREE")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Free plan limit/ })).toBeNull();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("lists the five renewals soonest first; each opens its subscription", async () => {
    await show(<DashboardScreen />);
    const upcoming = [...seedSubscriptions].sort((a, b) => Date.parse(a.nextRenewalDate!) - Date.parse(b.nextRenewalDate!));
    for (const s of upcoming) {
      const name = `${s.name}, ${formatShortDate(s.nextRenewalDate, "—")} · ${categoryLabel(s.category).toUpperCase()}, ${formatMoney(s.price.amountMinor, s.price.currency)} per mo`;
      press(name);
      expect(routerMock.push).toHaveBeenLastCalledWith(`/subscription/${s.id}`);
    }
  });

  it("every fixed control goes where it says", async () => {
    await show(<DashboardScreen />);
    const cases: [string | RegExp, string][] = [
      ["Settings", "/settings"],
      ["Notifications", "/notifications"],
      [/^Set a monthly budget\. Forecast /, "/budget"],
      ["See all Upcoming", "/subscriptions"],
      ["Discover", "/discover"],
      ["Add", "/subscription/add"]
    ];
    for (const [name, route] of cases) {
      press(name);
      expect(routerMock.push).toHaveBeenLastCalledWith(route);
    }
  });

  it("F108: the seed data's only insight is the spend summary (not previewed), so no empty 'Ways to save' heading", async () => {
    expect(generateInsights(seedSubscriptions).map((i) => i.type)).toEqual(["spend_summary"]);
    await show(<DashboardScreen />);
    expect(screen.queryByText("Ways to save")).toBeNull();
  });
});

describe("Ledger tab, ways to save", () => {
  type El = { props: Record<string, unknown>; parent: El | null };
  const buttonAround = (el: El) => {
    let node: El | null = el;
    while (node && node.props.accessibilityRole !== "button") node = node.parent;
    return node!;
  };

  it("two services in one category: the saving and each insight are named buttons that open Insights", async () => {
    resetFakes({ rows: [sub({ id: "a", name: "Netflix", category: "entertainment", price: { amountMinor: 2500, currency: "USD" } }), sub({ id: "b", name: "Max", category: "entertainment", price: { amountMinor: 2200, currency: "USD" } })] });
    await show(<DashboardScreen />);
    expect(screen.getByText("Ways to save")).toBeTruthy();
    const saving = screen.getByRole("button", { name: /^You could save \$\d+ a month\. See how\.$/ });
    const amount = /save \$(\d+)/.exec(String(saving.props.accessibilityLabel))![1];
    expect(Number(amount)).toBeGreaterThan(20);
    expect(screen.getByText(`$${amount}/mo`)).toBeTruthy();
    fireEvent.press(saving);
    expect(routerMock.push).toHaveBeenLastCalledWith("/analytics");
    const rows = screen.getAllByText("REVIEW").map((t) => buttonAround(t as unknown as El));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(String(row.props.accessibilityLabel)).toMatch(/\. /); // "<title>. <message>"
      routerMock.push.mockClear();
      fireEvent.press(row as never);
      expect(routerMock.push).toHaveBeenLastCalledWith("/analytics");
    }
    press("See all Ways to save");
    expect(routerMock.push).toHaveBeenLastCalledWith("/analytics");
  });
});

describe("Ledger tab, empty", () => {
  it("a blank page with the two ways to start, and no totals", async () => {
    resetFakes({ rows: [] });
    await show(<DashboardScreen />);
    expect(screen.getByText("Nothing on the books yet.")).toBeTruthy();
    expect(screen.queryByText("COMMITTED THIS MONTH")).toBeNull();
    press("Discover subscriptions");
    expect(routerMock.push).toHaveBeenLastCalledWith("/discover");
    press("Add one manually");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/add");
    press("Settings");
    expect(routerMock.push).toHaveBeenLastCalledWith("/settings");
  });
});

describe("Ledger tab, needs attention", () => {
  it("a still-charging cancellation, a trial ending, and a price rise each get a row that leads to the right place", async () => {
    const charging = sub({ id: "sub_charging", name: "Hulu", status: "attention" });
    const trial = sub({ id: "sub_trial", name: "Max", billingCycle: "trial", nextRenewalDate: iso(3) });
    const hiked = sub({ id: "sub_hiked", name: "Spotify", price: { amountMinor: 1199, currency: "USD" } });
    resetFakes({ rows: [charging, trial, hiked] });
    fakeStorage.meta.set("price.history.v1", JSON.stringify({ sub_hiked: [{ at: iso(-60), amountMinor: 999 }, { at: iso(-5), amountMinor: 1199 }] }));
    await show(<DashboardScreen />);
    expect(screen.getByText("Needs attention")).toBeTruthy();
    press("Hulu is still charging you. Cancelled, but a charge appeared — needs attention");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/sub_charging");
    press("Max trial ends in 3 days. Converts to paid — cancel before then?");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/cancel/sub_trial");
    press("Spotify went up 20%. $9.99 → $11.99/mo");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/sub_hiked");
  });

  it("a trial ending today says 'today', and one day says 'in 1 day'", async () => {
    resetFakes({ rows: [sub({ id: "t0", name: "Today", billingCycle: "trial", nextRenewalDate: iso(0) }), sub({ id: "t1", name: "Tomorrow", billingCycle: "trial", nextRenewalDate: iso(1) })] });
    await show(<DashboardScreen />);
    expect(screen.getByRole("button", { name: /^Today trial ends today\./ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Tomorrow trial ends in 1 day\./ })).toBeTruthy();
  });
});

describe("Ledger tab, the budget line", () => {
  const projected = computeBudgetForecast(seedSubscriptions).projectedMinor;
  const withCap = (capMinor: number) => fakeStorage.meta.set("budget.config.v1", JSON.stringify({ capMinor }));

  it.each([
    ["over the cap", projected - 1000, `${formatMoney(1000, "USD")} OVER`, `Budget. ${formatMoney(1000, "USD")} over cap.`],
    ["within 15 % of it", Math.round(projected / 0.9), `${formatMoney(Math.round(projected / 0.9) - projected, "USD")} LEFT`, `Budget. ${formatMoney(Math.round(projected / 0.9) - projected, "USD")} left.`],
    ["well under it", projected * 2, "ON PACE", "Budget. On pace."]
  ])("%s", async (_name, cap, value, a11y) => {
    resetFakes();
    withCap(cap);
    await show(<DashboardScreen />);
    expect(screen.getByText(value)).toBeTruthy();
    press(a11y);
    expect(routerMock.push).toHaveBeenLastCalledWith("/budget");
  });
});

describe("Ledger tab, plan and currency", () => {
  it("at the free limit (10 tracked) the counter becomes an upgrade button", async () => {
    resetFakes({ rows: Array.from({ length: 10 }, (_, i) => sub({ id: `s${i}`, name: `Service ${i}` })) });
    await show(<DashboardScreen />);
    press("Free plan limit reached — upgrade");
    expect(routerMock.push).toHaveBeenLastCalledWith("/paywall");
  });

  it("a paid plan hides the counter; a failed plan check falls back to free", async () => {
    mockCheckStatus.mockResolvedValue("pro");
    await show(<DashboardScreen />);
    expect(useAuthStore.getState().plan).toBe("pro");
    expect(screen.queryByText(/FREE/)).toBeNull();
  });

  it("a failed plan check falls back to the free plan", async () => {
    mockCheckStatus.mockRejectedValue(new Error("offline"));
    useAuthStore.setState({ plan: "pro" });
    await show(<DashboardScreen />);
    expect(useAuthStore.getState().plan).toBe("free");
  });

  it("a subscription in another currency with no rate is left out of the total, and says so", async () => {
    resetFakes({ rows: [sub({ id: "eur", name: "Deezer", price: { amountMinor: 1099, currency: "EUR" } }), sub({ id: "usd", name: "Gym" })] });
    await show(<DashboardScreen />);
    expect(screen.getByText("1 subscription in other currencies not included above.")).toBeTruthy();
  });
});

describe("Ledger tab, reduced motion", () => {
  it("the total appears at once (no adding-machine count-up)", async () => {
    reduceMotion.mockResolvedValue(true);
    // No settling: with no timer advanced, a count-up would still read 0.
    await renderScreen(<DashboardScreen />);
    expect(screen.getByText("107")).toBeTruthy();
    expect(screen.getByText(".46")).toBeTruthy();
  });

  it("(control) with motion on and no time passed, the count-up has not reached the total", async () => {
    await renderScreen(<DashboardScreen />);
    expect(screen.queryByText("107")).toBeNull();
    await act(async () => { jest.advanceTimersByTime(1500); });
    expect(screen.getByText("107")).toBeTruthy();
  });
});

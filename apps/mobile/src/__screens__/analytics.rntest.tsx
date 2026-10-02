import { services } from "@zeno/service-catalog";
import { monthlyAmount, type Subscription } from "@zeno/shared";
import { fireEvent, screen } from "@testing-library/react-native";
import AnalyticsScreen from "../../app/(tabs)/analytics";
import { seedSubscriptions } from "../data/seed-subscriptions";
import { computeBudgetForecast } from "../finance/budget";
import { generateInsights } from "../insights/insightsEngine";
import { formatMoney } from "../utils/format";
import { fakeStorage, renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8c: the Insights tab (app/(tabs)/analytics.tsx), through the real store.
 * Expected figures come from the app's own logic (seed data, generateInsights,
 * computeBudgetForecast), not from numbers typed in here.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "sub_x", createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: "Zzqx", category: "other",
  price: { amountMinor: 1000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(10),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const twoStreaming = [
  sub({ id: "a", name: "Netflix", category: "entertainment", price: { amountMinor: 2500, currency: "USD" } }),
  sub({ id: "b", name: "Max", category: "entertainment", price: { amountMinor: 2200, currency: "USD" } })
];

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
});
afterEach(() => jest.useRealTimers());

const rowNames = () => screen.getAllByRole("button", { name: / per month$/ }).map((b) => String(b.props.accessibilityLabel).split(",")[0]);

describe("Insights tab, seed data", () => {
  it("the month's spend, the budget entry with its forecast, and every control named", async () => {
    const r = await renderScreen(<AnalyticsScreen />);
    expect(screen.getByText("Insights")).toBeTruthy();
    expect(screen.getAllByText("$107.46").length).toBeGreaterThan(0);
    const forecast = (computeBudgetForecast(seedSubscriptions).projectedMinor / 100).toFixed(0);
    expect(screen.getByText(`Set a cap — forecast $${forecast} this month`)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Budget" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/budget");
    // The seed's only insight is the spend summary: no saving to promise.
    expect(screen.queryByText(/^Save up to/)).toBeNull();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("F164: the 6-month chart reads to a screen reader as six months, each with its amount, the current one marked", async () => {
    await renderScreen(<AnalyticsScreen />);
    const columns = screen.getAllByLabelText(/^[A-Z][a-z]+ \d{4}, \$[\d,]+\.\d{2}(, this month)?$/);
    const labels = columns.map((c) => String(c.props.accessibilityLabel));
    expect(labels).toHaveLength(6);
    const now = new Date();
    const expectedMonths = [5, 4, 3, 2, 1, 0].map((back) =>
      new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1)))
    );
    expect(labels.map((l) => l.split(", ")[0])).toEqual(expectedMonths);
    expect(labels.filter((l) => l.endsWith(", this month"))).toHaveLength(1);
    // The current month's amount is the one printed above its bar.
    const current = labels[5]!.split(", ")[1]!;
    expect(screen.getAllByText(current).length).toBeGreaterThan(0);
    expect(columns.every((c) => c.props.accessible === true)).toBe(true);
  });

  it("every insight can be dismissed; when none are left it says 'All caught up'", async () => {
    await renderScreen(<AnalyticsScreen />);
    const count = generateInsights(seedSubscriptions).length;
    expect(screen.getAllByRole("button", { name: "Dismiss insight" })).toHaveLength(count);
    for (let i = 0; i < count; i += 1) fireEvent.press(screen.getAllByRole("button", { name: "Dismiss insight" })[0]!);
    expect(screen.getByText("All caught up")).toBeTruthy();
  });

  it("all subscriptions, largest first; the sort button flips it and says which way; each row opens its subscription", async () => {
    await renderScreen(<AnalyticsScreen />);
    const desc = [...seedSubscriptions].sort((a, b) => monthlyAmount(b) - monthlyAmount(a)).map((s) => s.name);
    expect(rowNames()).toEqual(desc);
    fireEvent.press(screen.getByRole("button", { name: "Sort by amount, currently descending" }));
    expect(rowNames()).toEqual([...desc].reverse());
    expect(screen.getByRole("button", { name: "Sort by amount, currently ascending" })).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: `Netflix, ${formatMoney(1549, "USD")} per month` }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/sub_netflix");
  });
});

describe("Insights tab, a saving to make (F110)", () => {
  it("two services in one category: the header promises the saving, and the card states it in dollars, not cents", async () => {
    resetFakes({ rows: twoStreaming });
    await renderScreen(<AnalyticsScreen />);
    const duplicate = generateInsights(twoStreaming).find((i) => i.savingAmount && i.savingAmount > 0)!;
    expect(duplicate.savingAmount).toBe(22); // dollars: min($25, $22)
    expect(screen.getByText("Save up to $22")).toBeTruthy();
    expect(screen.getByText("Save $22.00/mo")).toBeTruthy(); // was "$0.22/mo"
  });

  it("an insight's action is a named button that goes where the engine says", async () => {
    resetFakes({ rows: twoStreaming });
    await renderScreen(<AnalyticsScreen />);
    const withAction = generateInsights(twoStreaming).filter((i) => i.actionLabel);
    expect(withAction.length).toBeGreaterThan(0);
    for (const insight of withAction) {
      routerMock.push.mockClear();
      fireEvent.press(screen.getByRole("button", { name: insight.actionLabel! }));
      expect(routerMock.push).toHaveBeenLastCalledWith(insight.actionRoute);
    }
  });
});

describe("Insights tab, every kind of insight", () => {
  it("unused, annual saving, trial ending, high spend and cancellation reminder each render as a card (fixtures checked against the engine first)", async () => {
    // detectAnnualSavings needs a catalog annual price and a monthly price that,
    // times 12, beats it by more than $10.
    const annual = services.find((s) => s.defaultAnnualPrice)!;
    const monthlyDollars = Math.ceil(annual.defaultAnnualPrice! / 12) + 2;
    const rows = [
      { ...sub({ id: "u", name: "Unused Gym", category: "health" }), lastUsedDate: iso(-60) } as Subscription,
      sub({ id: "an", name: annual.name, serviceSlug: annual.slug, price: { amountMinor: monthlyDollars * 100, currency: "USD" } }),
      sub({ id: "tr", name: "Trial Thing", billingCycle: "trial", nextRenewalDate: iso(2) }),
      sub({ id: "hs", name: "Big Stream", category: "entertainment", price: { amountMinor: 30000, currency: "USD" } }),
      sub({ id: "cr", name: "Gone Soon", status: "cancelled", nextRenewalDate: iso(5) })
    ];
    const insights = generateInsights(rows);
    const types = new Set(insights.map((i) => i.type));
    for (const type of ["unused", "annual_saving", "trial_ending", "high_spend", "cancellation_reminder"]) expect([type, types.has(type as never)]).toEqual([type, true]);
    resetFakes({ rows });
    await renderScreen(<AnalyticsScreen />);
    for (const insight of insights) expect(screen.getAllByText(insight.title).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Dismiss insight" })).toHaveLength(insights.length);
  });
});

describe("Insights tab, budget status", () => {
  const projected = computeBudgetForecast(seedSubscriptions).projectedMinor;
  it.each([
    ["Over", projected - 1000],
    ["Close", Math.round(projected / 0.9)],
    ["On pace", projected * 2]
  ])("cap set: shows '%s' and the forecast against the cap", async (label, cap) => {
    resetFakes();
    fakeStorage.meta.set("budget.config.v1", JSON.stringify({ capMinor: cap }));
    await renderScreen(<AnalyticsScreen />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(`Forecast $${(projected / 100).toFixed(2)} / $${Math.round(cap / 100)} this month`)).toBeTruthy();
  });
});

describe("Insights tab, empty and other currencies", () => {
  it("no subscriptions: each section says so", async () => {
    resetFakes({ rows: [] });
    await renderScreen(<AnalyticsScreen />);
    expect(screen.getByText("No spend data yet")).toBeTruthy();
    expect(screen.getByText("No subscriptions yet")).toBeTruthy();
    expect(screen.queryByText("All caught up") !== null).toBe(generateInsights([]).length === 0);
  });

  it("a subscription in a currency with no rate is left out, and says so", async () => {
    resetFakes({ rows: [sub({ id: "eur", name: "Deezer", price: { amountMinor: 1099, currency: "EUR" } }), sub({ id: "usd", name: "Gym" })] });
    await renderScreen(<AnalyticsScreen />);
    expect(screen.getByText("1 subscription in other currencies not included.")).toBeTruthy();
  });
});

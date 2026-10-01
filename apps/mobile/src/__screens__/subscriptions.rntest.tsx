import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import SubscriptionsScreen from "../../app/(tabs)/subscriptions";
import { seedSubscriptions } from "../data/seed-subscriptions";
import { formatMoney } from "../utils/format";
import { categoryLabel, formatShortDate } from "../utils/subscription-ui";
import { renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8c: the Subscriptions tab: the ledger of every subscription, its filters
 * and search, through the real store with the seed data.
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

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
});
afterEach(() => jest.useRealTimers());

const tab = (name: RegExp) => screen.getByRole("tab", { name });

describe("Subscriptions tab, seed data", () => {
  it("the kicker states what is billing; every subscription is a row named with its price and next date (F109)", async () => {
    const r = await renderScreen(<SubscriptionsScreen />);
    expect(screen.getByText("5 BILLING · $107.46/MO")).toBeTruthy();
    for (const s of seedSubscriptions) {
      const name = `${s.name}, ${categoryLabel(s.category).toUpperCase()}, ${formatMoney(s.price.amountMinor, s.price.currency)}, next ${formatShortDate(s.nextRenewalDate, "no date")}`;
      fireEvent.press(screen.getByRole("button", { name }));
      expect(routerMock.push).toHaveBeenLastCalledWith(`/subscription/${s.id}`);
    }
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("the add button opens Add subscription", async () => {
    await renderScreen(<SubscriptionsScreen />);
    fireEvent.press(screen.getByRole("button", { name: "Add subscription" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/add");
  });

  it("search narrows the list after a 200 ms pause in typing, ignoring case and spaces", async () => {
    await renderScreen(<SubscriptionsScreen />);
    fireEvent.changeText(screen.getByLabelText("Search the ledger"), "  NET ");
    expect(screen.getAllByRole("button", { name: /, next / })).toHaveLength(5); // not yet
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(screen.getAllByRole("button", { name: /, next / }).map((b) => b.props.accessibilityLabel)).toEqual([expect.stringMatching(/^Netflix, /)]);
    fireEvent.changeText(screen.getByLabelText("Search the ledger"), "no such service");
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(screen.getByText("Nothing tracked yet")).toBeTruthy();
  });
});

describe("Subscriptions tab, filters and statuses", () => {
  const rows = [
    sub({ id: "act", name: "Active One", category: "productivity" }),
    sub({ id: "tri", name: "Trial One", status: "trial" }),
    sub({ id: "pau", name: "Paused One", status: "paused" }),
    sub({ id: "pen", name: "Pending One", status: "pending" }),
    sub({ id: "att", name: "Charging One", status: "attention", price: { amountMinor: 899, currency: "USD" } }),
    sub({ id: "can", name: "Cancelled One", status: "cancelled" })
  ];

  it("each filter is a tab named with its count, marks itself selected, and filters the ledger", async () => {
    resetFakes({ rows });
    await renderScreen(<SubscriptionsScreen />);
    for (const [label, count] of [["All", 6], ["Active", 2], ["Paused", 1], ["Pending", 2], ["Cancelled", 1]] as const) {
      expect(tab(new RegExp(`^${label}, ${count}$`))).toBeTruthy();
    }
    fireEvent.press(tab(/^Pending, /));
    expect(tab(/^Pending, /).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getAllByRole("button", { name: /One, / }).map((b) => String(b.props.accessibilityLabel).split(",")[0])).toEqual(["Pending One", "Charging One"]);
  });

  it("each status reads as it should: category, badge, paused, still charging, verified", async () => {
    resetFakes({ rows });
    await renderScreen(<SubscriptionsScreen />);
    expect(screen.getByRole("button", { name: `Active One, PRODUCTIVITY, $10.00, next ${formatShortDate(iso(10), "no date")}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Trial One, Free trial, \$10\.00, next / })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Paused One, Paused, $10.00, paused" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Pending One, Pending verification, / })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Charging One, Still charging, $8.99" })).toBeTruthy();
    expect(screen.getByText("$8.99 !")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelled One, Verified cancelled, Verified" })).toBeTruthy();
    // Only active and trial count as billing.
    expect(screen.getByText("2 BILLING · $20.00/MO")).toBeTruthy();
  });

  it("an empty filter explains itself, without the add button (that is only on All)", async () => {
    resetFakes({ rows: [sub({ id: "a", name: "Only Active" })] });
    await renderScreen(<SubscriptionsScreen />);
    fireEvent.press(tab(/^Paused, 0$/));
    expect(screen.getByText("Nothing paused")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add a subscription" })).toBeNull();
    for (const [label, title] of [["Active", null], ["Pending", "Nothing pending"], ["Cancelled", "Nothing cancelled yet"]] as const) {
      fireEvent.press(tab(new RegExp(`^${label}, `)));
      if (title) expect(screen.getByText(title)).toBeTruthy();
    }
  });
});

describe("Subscriptions tab, data from an older version", () => {
  it("a status this version does not know reads as 'Unknown' instead of breaking the list", async () => {
    resetFakes({ rows: [sub({ id: "old", name: "Legacy", status: "archived" as never })] });
    await renderScreen(<SubscriptionsScreen />);
    expect(screen.getByRole("button", { name: /^Legacy, Unknown, / })).toBeTruthy();
  });
});

describe("Subscriptions tab, empty", () => {
  it("nothing tracked: says so, and offers to add one", async () => {
    resetFakes({ rows: [] });
    await renderScreen(<SubscriptionsScreen />);
    expect(screen.getByText("0 BILLING · $0.00/MO")).toBeTruthy();
    expect(screen.getByText("Nothing tracked yet")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Add a subscription" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/add");
  });
});

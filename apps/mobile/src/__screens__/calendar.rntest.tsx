import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import CalendarScreen from "../../app/(tabs)/calendar";
import { seedSubscriptions } from "../data/seed-subscriptions";
import { getMonthlyTotal, getProjectedAnnual, getWeeklyGroups } from "../utils/calendarUtils";
import { formatMoney } from "../utils/format";
import { formatShortDate } from "../utils/subscription-ui";
import { renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8c: the Calendar tab. Expected figures come from the same utilities the
 * screen uses (calendarUtils), fed the seed data. The seed is all USD and the
 * home currency is USD, so the screen's currency context changes nothing here.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const dateKey = (value: string) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "sub_x", createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: "Zzqx", category: "other",
  price: { amountMinor: 1000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(10),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const usd = (dollars: number) => formatMoney(Math.round(dollars * 100), "USD");

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
});
afterEach(() => jest.useRealTimers());

const pressDay = async (dateString: string) => {
  const calendar = screen.UNSAFE_getByProps({ testID: "calendar" });
  await act(async () => { calendar.props.onDayPress({ dateString }); });
};

describe("Calendar tab, seed data", () => {
  it("the three ledger lines match calendarUtils; every control is named", async () => {
    const r = await renderScreen(<CalendarScreen />);
    const now = new Date();
    expect(screen.getByText(usd(getMonthlyTotal(seedSubscriptions, now.getFullYear(), now.getMonth() + 1)))).toBeTruthy();
    expect(screen.getAllByText(usd(getProjectedAnnual(seedSubscriptions))).length).toBeGreaterThan(0);
    // Seed renewals are in 1, 2, 5, 9 and 14 days: 3 within a week.
    expect(screen.getByText("3 DUE SOON")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("upcoming renewals are grouped by week, each row naming price and date and opening its subscription", async () => {
    await renderScreen(<CalendarScreen />);
    const groups = getWeeklyGroups(seedSubscriptions);
    const all = [...groups.thisWeek, ...groups.nextWeek, ...groups.laterThisMonth];
    expect(all.length).toBeGreaterThan(0);
    if (groups.thisWeek.length) expect(screen.getByText("This week")).toBeTruthy();
    for (const s of all) {
      fireEvent.press(screen.getByRole("button", { name: `${s.name}, ${formatMoney(s.price.amountMinor, s.price.currency)}, renews ${formatShortDate(s.nextRenewalDate, "TBD")}` }));
      expect(routerMock.push).toHaveBeenLastCalledWith(`/subscription/${s.id}`);
    }
  });

  it("today has no renewals in the seed, so no day panel; tapping a renewal day opens it", async () => {
    await renderScreen(<CalendarScreen />);
    expect(screen.queryByRole("button", { name: "Close day panel" })).toBeNull();
    const netflix = seedSubscriptions.find((s) => s.id === "sub_netflix")!;
    await pressDay(dateKey(netflix.nextRenewalDate!));
    expect(screen.getByText("Total for this day")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Netflix, $15.49" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/sub_netflix");
    // The cancel link is a button NESTED inside the row's button. RNTL's name
    // match also returns the outer row (it counts the nested label), so pick
    // the element whose OWN label it is. Whether a screen reader can reach a
    // nested button at all is checked on the device (P3 gate).
    const cancel = screen.getAllByRole("button", { name: "Cancel Netflix" }).filter((b) => b.props.accessibilityLabel === "Cancel Netflix");
    expect(cancel).toHaveLength(1);
    fireEvent.press(cancel[0]!);
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/cancel/sub_netflix");
    fireEvent.press(screen.getByRole("button", { name: "Close day panel" }));
    expect(screen.queryByText("Total for this day")).toBeNull();
  });

  it("a day with two renewals totals both; an empty day shows no panel", async () => {
    resetFakes({ rows: [sub({ id: "a", name: "Alpha", nextRenewalDate: iso(4), billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" } }), sub({ id: "b", name: "Beta", nextRenewalDate: iso(4), billingCycle: "weekly" })] });
    await renderScreen(<CalendarScreen />);
    await pressDay(dateKey(iso(4)));
    expect(screen.getByText("Total for this day")).toBeTruthy();
    expect(screen.getAllByText("$130.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Annual")).toBeTruthy();
    expect(screen.getByText("weekly")).toBeTruthy();
    await pressDay(dateKey(iso(20)));
    expect(screen.queryByText("Total for this day")).toBeNull();
  });
});

describe("Calendar tab, empty and other currencies", () => {
  it("nothing upcoming: says so and offers to add one", async () => {
    resetFakes({ rows: [] });
    await renderScreen(<CalendarScreen />);
    expect(screen.getByText("No upcoming renewals")).toBeTruthy();
    expect(screen.getByText("0 DUE SOON")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Add subscription" }));
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/add");
  });

  it("a subscription in a currency with no rate is left out of the totals, and says so", async () => {
    resetFakes({ rows: [sub({ id: "eur", name: "Deezer", price: { amountMinor: 1099, currency: "EUR" } }), sub({ id: "usd", name: "Gym", nextRenewalDate: iso(2) })] });
    await renderScreen(<CalendarScreen />);
    expect(screen.getByText("1 subscription in other currencies not included in these totals.")).toBeTruthy();
  });

  it("a renewal with no date, or an unreadable one, is simply not placed on a day", async () => {
    resetFakes({ rows: [sub({ id: "n", name: "No Date", nextRenewalDate: undefined }), sub({ id: "x", name: "Bad Date", nextRenewalDate: "not-a-date" }), sub({ id: "ok", name: "Fine", nextRenewalDate: iso(3) })] });
    await renderScreen(<CalendarScreen />);
    expect(screen.getByText("This week")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Fine, / })).toBeTruthy();
  });

  it("F111: the day panel's heading is the LOCAL day tapped, not the day before", async () => {
    // A tapped "YYYY-MM-DD" is a local calendar day. The old code parsed it as
    // UTC midnight: the previous evening west of UTC ("Thursday, October 1" for
    // the 2nd in New York). Check the instant the heading is formatted from: it
    // must be local midnight of that day. (On a UTC machine the two coincide;
    // this check bites in any other timezone, e.g. this dev machine's UTC+5:30.)
    const key = dateKey(iso(4));
    resetFakes({ rows: [sub({ id: "a", name: "Alpha", nextRenewalDate: iso(4) })] });
    await renderScreen(<CalendarScreen />);
    const spy = jest.spyOn(Date.prototype, "toLocaleDateString");
    await pressDay(key);
    const heading = spy.mock.contexts.find((_d, i) => (spy.mock.calls[i]![1] as { weekday?: string } | undefined)?.weekday === "long") as Date;
    spy.mockRestore();
    const [y, m, d] = key.split("-").map(Number);
    expect(heading.getTime()).toBe(new Date(y!, m! - 1, d!).getTime());
  });

  it("paused and cancelled subscriptions are not on the calendar", async () => {
    resetFakes({ rows: [sub({ id: "p", name: "Paused One", status: "paused", nextRenewalDate: iso(2) }), sub({ id: "c", name: "Gone", status: "cancelled", nextRenewalDate: iso(3) })] });
    await renderScreen(<CalendarScreen />);
    expect(screen.getByText("No upcoming renewals")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Paused One,/ })).toBeNull();
  });
});

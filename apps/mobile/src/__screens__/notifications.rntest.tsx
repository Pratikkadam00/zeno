import type { Subscription } from "@zeno/shared";
import { dayLabelInDays } from "../utils/day-label";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import NotificationsScreen from "../../app/notifications";
import { fakeStorage, renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8e-1: the Notifications screen (app/notifications.tsx) through the real
 * store, with the REAL reminder list (upcomingReminders, the scheduler's own):
 * flags (still charging, verifying a cancellation, a trial ending, a price
 * rise) and the reminders that will actually fire (F129).
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
// The real reminder list is pure; the native module it sits beside is not needed
// (loading it only prints Expo Go's push-token notice).
jest.mock("expo-notifications", () => ({}));

const DAY = 86_400_000;
// Dates are stored as day labels (midnight UTC of the user's calendar day,
// F182/F202), so fixtures are too: "in N days" counts from the phone's date.
const iso = (days: number) => dayLabelInDays(days).toISOString();
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "s", createdAt: iso(-200), updatedAt: iso(-200), version: 1, name: "Gym", category: "health",
  price: { amountMinor: 4000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(20),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes({ rows: [] });
});
afterEach(() => jest.useRealTimers());

async function open(rows: Subscription[], meta: Record<string, string> = {}) {
  resetFakes({ rows });
  for (const [key, value] of Object.entries(meta)) fakeStorage.meta.set(key, value);
  return renderScreen(<NotificationsScreen />, { settleMs: 300 });
}
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const reminderTitles = () => screen.queryAllByText(/renews in|charged today|free trial ends/).map((n) => n.props.children as string);

describe("notifications, nothing to say", () => {
  it("no subscriptions: says so; every control is named", async () => {
    const r = await open([]);
    expect(screen.getByText("No alerts yet")).toBeTruthy();
    expect(screen.queryByText("Renewal reminders are off in Settings.")).toBeNull();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("Back goes back", async () => {
    await open([]);
    await press("Go back");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });
});

describe("notifications, the reminders that will fire (F129)", () => {
  it("lists the scheduler's reminders, soonest first, each opening its subscription", async () => {
    await open([sub({ id: "a", name: "Gym", nextRenewalDate: iso(20) }), sub({ id: "b", name: "Pool", nextRenewalDate: iso(12) })]);
    expect(screen.getByText("Upcoming reminders")).toBeTruthy();
    expect(reminderTitles()).toEqual([
      // Pool renews on day 12, Gym on day 20: 5, 9, 12, then 13, 17, 20.
      "Pool renews in 7 days", "⚠️ Pool renews in 3 days", "Pool charged today", "Gym renews in 7 days", "⚠️ Gym renews in 3 days", "Gym charged today"
    ]);
    await press("Gym renews in 7 days");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/a");
  });

  it("a reminder switched off on the subscription is not listed", async () => {
    await open([sub({ id: "a" })], { "notification.settings.v1": JSON.stringify({ a: { sevenDay: false, threeDay: true, dayOf: false } }) });
    expect(reminderTitles()).toEqual(["⚠️ Gym renews in 3 days"]);
  });

  it("a trial lists the trial ladder (2 days, 1 day, the day), not 7 / 3 / 0", async () => {
    await open([sub({ id: "t", name: "Max", billingCycle: "trial", nextRenewalDate: iso(40) })]);
    expect(reminderTitles()).toEqual(["⚠️ Max free trial ends in 2 days", "⏰ Max free trial ends tomorrow", "Max free trial ends today"]);
  });

  it("with Settings' master switch off, none are listed, and the screen says why", async () => {
    await open([sub({ id: "a" })], { "notification.enabled.v1": "false" });
    expect(reminderTitles()).toEqual([]);
    expect(screen.getByText("No alerts yet")).toBeTruthy();
    expect(screen.getByText("Renewal reminders are off in Settings.")).toBeTruthy();
  });

  it("shows at most 12", async () => {
    await open(Array.from({ length: 6 }, (_, i) => sub({ id: `s${i}`, name: `S${i}`, nextRenewalDate: iso(20 + i) })));
    expect(reminderTitles()).toHaveLength(12);
  });
});

describe("notifications, flags", () => {
  it("still charging, verifying, a trial ending, a price rise: each says what and goes where", async () => {
    await open(
      [
        sub({ id: "x", name: "Hulu", status: "attention" }),
        sub({ id: "p", name: "Peacock", status: "pending", cancellationVerifyBy: iso(5) }),
        sub({ id: "t", name: "Max", billingCycle: "trial", nextRenewalDate: iso(1), price: { amountMinor: 1699, currency: "USD" } }),
        sub({ id: "h", name: "Box", billingCycle: "annual", price: { amountMinor: 11900, currency: "USD" } })
      ],
      { "price.history.v1": JSON.stringify({ h: [{ at: iso(-100), amountMinor: 9900 }, { at: iso(-10), amountMinor: 11900 }] }) }
    );
    expect(screen.getByText("Flags")).toBeTruthy();
    expect(screen.getByText("Hulu is still charging you")).toBeTruthy();
    expect(screen.getByText("Verifying Peacock cancellation")).toBeTruthy();
    expect(screen.getByText("Max trial ends in 1 day")).toBeTruthy();
    expect(screen.getByText("Converts to $16.99 — cancel before then?")).toBeTruthy();
    expect(screen.getByText("Box went up 20%")).toBeTruthy();
    // F130: a yearly plan's rise is per YEAR, not "/mo".
    expect(screen.getByText("$99.00 → $119.00/year")).toBeTruthy();
    await press("Hulu is still charging you");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/x");
    await press("Verifying Peacock cancellation");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/p");
    await press("Max trial ends in 1 day");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/cancel/t");
    await press("Box went up 20%");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/h");
  });

  it("several of a kind, a trial ending today, and a verify date falling back to the renewal", async () => {
    await open([
      sub({ id: "x1", name: "A", status: "attention" }),
      sub({ id: "x2", name: "B", status: "attention" }),
      sub({ id: "p1", name: "C", status: "pending" }),
      sub({ id: "p2", name: "D", status: "pending" }),
      sub({ id: "t1", name: "E", billingCycle: "trial", nextRenewalDate: iso(0) }),
      sub({ id: "t2", name: "F", billingCycle: "trial", nextRenewalDate: iso(3) })
    ]);
    expect(screen.getByText("E trial ends today")).toBeTruthy();
    expect(screen.getByText("F trial ends in 3 days")).toBeTruthy();
    expect(screen.getAllByText(/^We'll confirm around /)).toHaveLength(2);
    expect(screen.getAllByText(/is still charging you$/)).toHaveLength(2);
  });

  it("flags alone, with no reminders, still show", async () => {
    await open([sub({ id: "x", name: "Hulu", status: "attention" })]);
    expect(screen.getByText("Hulu is still charging you")).toBeTruthy();
    expect(screen.queryByText("Upcoming reminders")).toBeNull();
  });
});

describe("notifications, when the phone blocks them (F192)", () => {
  const fake = jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule as { notificationsAllowed: jest.Mock };
  afterEach(() => fake.notificationsAllowed.mockImplementation(async () => true));

  it("says reminders won't appear, and opens the phone's settings", async () => {
    fake.notificationsAllowed.mockImplementation(async () => false);
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    const r = await open([sub({ id: "a" })]);
    expect(screen.getByText("Notifications are off for Zeno")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
    await press(/^Notifications are off for Zeno/);
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("no notice when the phone allows them, when it can't be known, or when reminders are off in Zeno anyway", async () => {
    await open([sub({ id: "a" })]);
    expect(screen.queryByText("Notifications are off for Zeno")).toBeNull();
    fake.notificationsAllowed.mockImplementation(async () => null);
    await open([sub({ id: "a" })]);
    expect(screen.queryByText("Notifications are off for Zeno")).toBeNull();
    fake.notificationsAllowed.mockImplementation(async () => false);
    await open([sub({ id: "a" })], { "notification.enabled.v1": "false" });
    expect(screen.queryByText("Notifications are off for Zeno")).toBeNull();
  });
});

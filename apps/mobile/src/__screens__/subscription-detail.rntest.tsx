import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import SubscriptionDetailScreen from "../../app/subscription/[id]";
import { fakeNotificationsModule, fakeStorage, renderScreen, resetFakes, routeParams, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8d: one subscription's page (app/subscription/[id].tsx) through the real
 * store: the figures, the urgency banner, the status flows (pending, still
 * charging, verified), editing, reminders, notes, the menu on iOS and Android,
 * and the estimated charge history (F116), yearly figures (F117) and date
 * validation (F115).
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "sub_x", createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: "Gym Club", category: "health",
  price: { amountMinor: 4000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(20),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  alert.mockClear();
});
afterEach(() => jest.useRealTimers());

async function open(id: string, rows?: Subscription[]) {
  if (rows) resetFakes({ rows });
  routeParams.current = { id };
  return renderScreen(<SubscriptionDetailScreen />, { settleMs: 1500 });
}
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getByRole("button", { name })); });
};
const stored = (id: string) => fakeStorage.rows.get(id);

describe("detail, a seed subscription (Netflix, renews tomorrow)", () => {
  it("states the price and its year; every control is named", async () => {
    const r = await open("sub_netflix");
    expect(screen.getAllByText("Netflix").length).toBeGreaterThan(0);
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.getByText(".49")).toBeTruthy();
    expect(screen.getByText("/month")).toBeTruthy();
    expect(screen.getByText("Monthly")).toBeTruthy();
    expect(screen.getByText("$185.88")).toBeTruthy(); // 15.49 x 12
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("renewing within a week: a banner with the charge and a Cancel link to the cancel guide", async () => {
    await open("sub_netflix");
    expect(screen.getByText(/^Renews in /)).toBeTruthy();
    expect(screen.getByText(/^\$15\.49 will be charged on /)).toBeTruthy();
    await press("Cancel Netflix");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/cancel/sub_netflix");
    await press("Cancel Subscription");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/cancel/sub_netflix");
    await press("Go back");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });

  it("the three reminders are named switches; turning one off is saved and rescheduled", async () => {
    await open("sub_netflix");
    const sevenDay = screen.getByRole("switch", { name: "7-day reminder" });
    expect(screen.getByRole("switch", { name: "3-day reminder" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Charge day alert" })).toBeTruthy();
    await act(async () => { fireEvent(sevenDay, "valueChange", false); });
    expect(fakeNotificationsModule.scheduleRenewalNotificationsWithPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sub_netflix", amount: 15.49 }),
      expect.objectContaining({ sevenDay: false, threeDay: true, dayOf: true })
    );
  });

  it("a note can be added, shown, and edited; Cancel keeps the old one", async () => {
    await open("sub_netflix");
    await press("Add a note");
    fireEvent.changeText(screen.getByLabelText("Note"), "  Shared with Sam  ");
    await press("Save");
    expect(screen.getByText("Shared with Sam")).toBeTruthy();
    expect(stored("sub_netflix")?.notes).toBe("Shared with Sam");
    await press("Edit note");
    fireEvent.changeText(screen.getByLabelText("Note"), "discard me");
    // The note sheet's Cancel (the last one drawn; the banner also has a "Cancel").
    await act(async () => { fireEvent.press(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!); });
    expect(screen.queryByText("discard me")).toBeNull();
  });
});

describe("detail, editing (F115)", () => {
  async function editing() {
    await open("sub_x", [sub({})]);
    const sheet = jest.spyOn(ActionSheetIOS, "showActionSheetWithOptions").mockImplementation((_o, cb) => cb(0));
    await press("More options");
    sheet.mockRestore();
  }

  it("F118: the form opens filled with the subscription's own values, even when it loaded after the page (a cold start)", async () => {
    // The harness store starts from the seed and loads sub_x from storage
    // AFTER the first render, as on a cold start from a notification or link.
    await editing();
    expect(screen.getByLabelText("Name").props.value).toBe("Gym Club");
    expect(screen.getByLabelText("Price").props.value).toBe("40.00");
    expect(screen.getByLabelText("Next renewal").props.value).toBe(stored("sub_x")!.nextRenewalDate!.slice(0, 10));
    expect(screen.getByRole("button", { name: "Billing cycle monthly" }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it("name, price, cycle and renewal date are saved", async () => {
    await editing();
    expect(screen.getByText("Edit subscription")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Name"), "Gym Club Plus");
    fireEvent.changeText(screen.getByLabelText("Price"), "45.50");
    await press("Billing cycle annual");
    fireEvent.changeText(screen.getByLabelText("Next renewal"), "2027-03-01");
    await press("Save changes");
    expect(stored("sub_x")).toMatchObject({ name: "Gym Club Plus", price: { amountMinor: 4550 }, billingCycle: "annual", nextRenewalDate: "2027-03-01T00:00:00.000Z" });
    expect(screen.getByText("/year")).toBeTruthy();
  });

  it("an impossible date ('30 February') is refused, not saved as 2 March", async () => {
    await editing();
    fireEvent.changeText(screen.getByLabelText("Next renewal"), "2026-02-30");
    await press("Save changes");
    expect(alert).toHaveBeenCalledWith("Check the renewal date", "Use a real date in the YYYY-MM-DD format, e.g. 2026-08-01.");
    expect(stored("sub_x")?.nextRenewalDate).not.toContain("2026-03-02");
  });

  it("a zero price is refused; Stop editing leaves without saving", async () => {
    await editing();
    fireEvent.changeText(screen.getByLabelText("Price"), "0");
    await press("Save changes");
    expect(alert).toHaveBeenCalledWith("Enter a price", "The monthly/renewal amount must be greater than $0.");
    fireEvent.changeText(screen.getByLabelText("Name"), "Unsaved");
    await press("Stop editing");
    expect(stored("sub_x")?.name).toBe("Gym Club");
  });

  it("an emptied name keeps the old one; an empty date keeps the old date", async () => {
    await editing();
    fireEvent.changeText(screen.getByLabelText("Name"), "   ");
    fireEvent.changeText(screen.getByLabelText("Next renewal"), "");
    const before = stored("sub_x")!.nextRenewalDate!;
    await press("Save changes");
    expect(stored("sub_x")?.name).toBe("Gym Club");
    // The SAME DAY is kept. (The page shows the store's display copy, which
    // rollRenewalForward rebuilds from day, hours and minutes, so seconds are
    // dropped; renewal dates are day-level everywhere.)
    expect(stored("sub_x")?.nextRenewalDate?.slice(0, 10)).toBe(before.slice(0, 10));
  });
});

describe("detail, the menu", () => {
  it("iOS: an action sheet offering Edit, Pause, Delete; Pause pauses", async () => {
    await open("sub_x", [sub({})]);
    const sheet = jest.spyOn(ActionSheetIOS, "showActionSheetWithOptions").mockImplementation((o, cb) => {
      expect(o.options).toEqual(["Edit", "Pause subscription", "Delete", "Cancel"]);
      cb(1);
    });
    await press("More options");
    expect(stored("sub_x")?.status).toBe("paused");
    expect(screen.getByText("Subscription Paused")).toBeTruthy();
    sheet.mockRestore();
  });

  it("Delete asks first; confirming removes it, cancels its reminders, and returns to the ledger", async () => {
    await open("sub_x", [sub({})]);
    const sheet = jest.spyOn(ActionSheetIOS, "showActionSheetWithOptions").mockImplementation((_o, cb) => cb(2));
    await press("More options");
    sheet.mockRestore();
    expect(alert).toHaveBeenCalledWith("Delete subscription?", "Gym Club will be removed from Zeno.", expect.any(Array));
    const buttons = alert.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
    expect(buttons.map((b) => b.text)).toEqual(["Cancel", "Delete"]);
    await act(async () => { buttons[1]!.onPress!(); });
    expect(stored("sub_x")).toBeUndefined();
    expect(fakeNotificationsModule.cancelNotificationsForSubscription).toHaveBeenCalledWith("sub_x");
    expect(routerMock.replace).toHaveBeenLastCalledWith("/dashboard");
  });

  it("an iOS sheet dismissed with Cancel does nothing", async () => {
    await open("sub_x", [sub({})]);
    const sheet = jest.spyOn(ActionSheetIOS, "showActionSheetWithOptions").mockImplementation((_o, cb) => cb(3));
    await press("More options");
    sheet.mockRestore();
    expect(stored("sub_x")?.status).toBe("active");
    expect(alert).not.toHaveBeenCalled();
  });

  it("Android: a menu with Edit, Pause and Delete, and a named Close", async () => {
    const os = jest.replaceProperty(Platform, "OS", "android");
    try {
      await open("sub_x", [sub({})]);
      await press("More options");
      await press("Close menu");
      await press("More options");
      // The menu's Edit (drawn last), not "Edit note".
      await act(async () => { fireEvent.press(screen.getAllByRole("button", { name: "Edit" }).at(-1)!); });
      expect(screen.getByText("Edit subscription")).toBeTruthy();
      await press("Stop editing");
      await press("More options");
      // The menu items sit INSIDE the "Close menu" backdrop button, so RNTL also
      // matches the backdrop by their names (F112's device check covers whether
      // TalkBack can reach them); press the item itself, drawn last.
      await act(async () => { fireEvent.press(screen.getAllByRole("button", { name: "Pause subscription" }).at(-1)!); });
      expect(stored("sub_x")?.status).toBe("paused");
      await press("More options");
      await act(async () => { fireEvent.press(screen.getAllByRole("button", { name: "Delete" }).at(-1)!); });
      expect(alert).toHaveBeenCalledWith("Delete subscription?", "Gym Club will be removed from Zeno.", expect.any(Array));
    } finally {
      os.restore();
    }
  });
});

describe("detail, statuses", () => {
  it("pending: confirming it stopped marks it verified-cancelled; 'charged again' marks it still charging", async () => {
    await open("p", [sub({ id: "p", status: "pending", cancellationVerifyBy: iso(5) })]);
    expect(screen.getByText("Cancellation pending verification")).toBeTruthy();
    await press("Confirm it stopped");
    expect(stored("p")?.status).toBe("cancelled");
    expect(screen.getByText("Verified cancelled")).toBeTruthy();
    expect(screen.getByText("No charge found. You're saving $480.00/yr.")).toBeTruthy();

    await open("q", [sub({ id: "q", status: "pending" })]);
    await press("I was charged again");
    expect(stored("q")?.status).toBe("attention");
  });

  it("still charging: reopens the cancel guide", async () => {
    await open("a", [sub({ id: "a", status: "attention" })]);
    expect(screen.getByText("Still being charged")).toBeTruthy();
    await press("Re-open cancellation help");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/cancel/a");
  });

  it("a trial shows the trial chip; a dark-pattern service shows its warning", async () => {
    await open("t", [sub({ id: "t", billingCycle: "trial", nextRenewalDate: iso(3) })]);
    expect(screen.getByText("Free Trial")).toBeTruthy();
  });
});

describe("detail, other cycles and edges", () => {
  it("weekly: '/week', a year is 52 charges, history steps back 7 days", async () => {
    jest.setSystemTime(new Date("2026-04-15T12:00:00.000Z"));
    await open("w", [sub({ id: "w", billingCycle: "weekly", price: { amountMinor: 500, currency: "USD" }, createdAt: "2026-03-30T00:00:00.000Z", lastChargedDate: "2026-04-13T00:00:00.000Z", nextRenewalDate: "2026-04-20T00:00:00.000Z" })]);
    expect(screen.getByText("/week")).toBeTruthy();
    expect(screen.getByText("$260.00")).toBeTruthy(); // 5 x 52
    expect(screen.getByText("3 ENTRIES")).toBeTruthy(); // Apr 13, Apr 6, Mar 30
  });

  it("quarterly: '/quarter', a year is 4 charges", async () => {
    await open("q", [sub({ id: "q", billingCycle: "quarterly", price: { amountMinor: 3000, currency: "USD" } })]);
    expect(screen.getByText("/quarter")).toBeTruthy();
    expect(screen.getByText("$120.00")).toBeTruthy();
  });

  it("an unreadable charge date gives no history rather than a made-up one", async () => {
    await open("bad", [sub({ id: "bad", lastChargedDate: "not-a-date" })]);
    expect(screen.getByText(/^No charges logged yet\./)).toBeTruthy();
  });

  it("with neither a charge date nor a renewal date there is nothing to estimate from: no history", async () => {
    await open("nd", [sub({ id: "nd", nextRenewalDate: undefined })]);
    expect(screen.getByText(/^No charges logged yet/)).toBeTruthy();
  });

  it("not found: both ways back go back", async () => {
    routeParams.current = { id: "nope" };
    await renderScreen(<SubscriptionDetailScreen />);
    const backs = screen.getAllByRole("button", { name: "Go back" }); // the nav arrow and the text button
    expect(backs).toHaveLength(2);
    for (const back of backs) fireEvent.press(back);
    expect(routerMock.back).toHaveBeenCalledTimes(2);
  });

  it("Android's back button closes the menu and the note sheet", async () => {
    const os = jest.replaceProperty(Platform, "OS", "android");
    try {
      await open("sub_x", [sub({})]);
      await press("More options");
      const modals = () => screen.UNSAFE_root.findAll((n) => typeof n.props.onRequestClose === "function" && n.props.visible !== undefined);
      await act(async () => { modals().find((m) => m.props.visible)!.props.onRequestClose(); });
      expect(modals().filter((m) => m.props.visible)).toHaveLength(0);
      await press("Add a note");
      await act(async () => { modals().find((m) => m.props.visible)!.props.onRequestClose(); });
      expect(modals().filter((m) => m.props.visible)).toHaveLength(0);
    } finally {
      os.restore();
    }
  });
});

describe("detail, figures that must not be invented", () => {
  it("F117: an unknown cycle has no yearly figure, and a verified cancellation of one claims no saving", async () => {
    await open("u", [sub({ id: "u", billingCycle: "unknown", status: "cancelled" })]);
    expect(screen.getByText("NO SET CYCLE")).toBeTruthy(); // the Per year line, valued "—"
    expect(screen.queryByText("/month")).toBeNull(); // F131: no invented cycle after the price
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("No charge found.")).toBeTruthy();
    expect(screen.queryByText(/SAVED/)).toBeNull();
  });

  it("F116: a charge on the 31st is estimated back on each month's last day, never rolled into the next month", async () => {
    jest.setSystemTime(new Date("2026-04-15T12:00:00.000Z"));
    await open("e", [sub({ id: "e", createdAt: "2026-01-01T00:00:00.000Z", lastChargedDate: "2026-03-31T00:00:00.000Z", nextRenewalDate: "2026-04-30T00:00:00.000Z" })]);
    expect(screen.getByText("3 ENTRIES")).toBeTruthy();
    for (const day of ["2026-03-31", "2026-02-28", "2026-01-31"]) {
      // formatShortDate, uppercased by the ledger line.
      const label = new Date(`${day}T00:00:00.000Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // A receipt date is known (lastChargedDate), so the history is not labelled estimated.
    expect(screen.queryByText("ESTIMATED FROM YOUR BILLING CYCLE")).toBeNull();
    expect(screen.queryByText(new Date("2026-03-03T00:00:00.000Z").toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase())).toBeNull();
  });

  it("a brand-new subscription has no history yet, and says so honestly", async () => {
    await open("n", [sub({ id: "n", createdAt: iso(0), nextRenewalDate: iso(30) })]);
    expect(screen.getByText("No charges logged yet. Each one prints here as it happens — honest history, not sample data.")).toBeTruthy();
  });
});

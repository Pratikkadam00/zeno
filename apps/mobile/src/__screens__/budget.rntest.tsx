import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import BudgetScreen from "../../app/budget";
import { fakeStorage, renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8f-1: the budget (app/budget.tsx) through the real subscription and
 * budget stores and the real forecast (src/finance/budget.ts), on a pinned
 * clock. With the rows below, on 10 Oct 2026: Gym $40 charged on the 5th;
 * Pool $15 on the 20th and Box $99/yr on the 25th still to renew; so $154.00
 * projected, $40.00 committed.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create(() => ({ plan: "free" })) };
});
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { setState: (s: object) => void } };

const sub = (over: Partial<Subscription>): Subscription => ({
  id: "s", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, name: "S", category: "other",
  price: { amountMinor: 1000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: "2026-10-20T09:00:00.000Z",
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const ROWS = [
  sub({ id: "gym", name: "Gym", category: "health", price: { amountMinor: 4000, currency: "USD" }, nextRenewalDate: "2026-11-05T09:00:00.000Z" }),
  sub({ id: "pool", name: "Pool", category: "health", price: { amountMinor: 1500, currency: "USD" }, nextRenewalDate: "2026-10-20T09:00:00.000Z" }),
  sub({ id: "box", name: "Box", category: "productivity", billingCycle: "annual", price: { amountMinor: 9900, currency: "USD" }, nextRenewalDate: "2026-10-25T09:00:00.000Z" })
];
const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  alert.mockClear();
  useAuthStore.setState({ plan: "free" });
});
afterEach(() => jest.useRealTimers());

async function open(budget: object | null, rows: Subscription[] = ROWS) {
  resetFakes({ rows });
  if (budget) fakeStorage.meta.set("budget.config.v1", JSON.stringify({ capSetAt: "2026-08-01T00:00:00.000Z", ...budget }));
  return renderScreen(<BudgetScreen />, { settleMs: 1500 });
}
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const saved = () => JSON.parse(fakeStorage.meta.get("budget.config.v1") ?? "{}") as Record<string, unknown>;

describe("budget, no cap yet", () => {
  it("F144: forecasts the month and STARTS at the suggested cap, rounded up to $5; every control is named", async () => {
    const r = await open(null);
    expect(screen.getByText("Set a recurring budget")).toBeTruthy();
    expect(screen.getByText("$40.00 charged · $114.00 still to renew")).toBeTruthy();
    expect(screen.getByText("Use suggested · $155")).toBeTruthy();
    expect(screen.getByText("$1 of headroom above your forecast.")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("the cap steps by $5, warns below the forecast, never goes under $5, and Start saves it", async () => {
    await open(null);
    await press("Lower cap");
    expect(screen.getByText("That's below your $154 forecast — we'll warn you early.")).toBeTruthy();
    await press("Raise cap");
    await press("Raise cap");
    expect(screen.getByText("$6 of headroom above your forecast.")).toBeTruthy();
    await press(/^Use suggested/);
    expect(screen.getByText("$1 of headroom above your forecast.")).toBeTruthy();
    for (let i = 0; i < 40; i++) await press("Lower cap");
    await press("Start tracking this budget");
    expect(saved()).toMatchObject({ capMinor: 500 });
    expect(screen.getByText("PROJECTED THIS MONTH")).toBeTruthy();
  });
});

describe("budget, with a cap", () => {
  it("over the cap: the verdict, the ledger, and the cheapest cuts each with its own cycle (F139)", async () => {
    const r = await open({ capMinor: 10000 });
    expect(screen.getByText("Over")).toBeTruthy();
    expect(screen.getByText("Charged so far")).toBeTruthy();
    // 12:00 UTC on 10 Oct is 10 Oct for a user west of UTC+12 and 11 Oct beyond
    // it; "days left" counts from the user's own date to the 31st, inclusive (F202).
    expect(screen.getByText(`${32 - new Date().getDate()} DAYS LEFT`)).toBeTruthy();
    expect(screen.getByText("Cut $54.00 to get back under")).toBeTruthy();
    // Ordered by a month's cost: Box $8.25, Pool $15, Gym $40.
    expect(screen.getAllByText(/^\$\d+\.\d{2}\/(year|month)/).map((n) => n.props.children)).toEqual([
      "$99.00/year", "$15.00/month · $180.00/yr", "$40.00/month · $480.00/yr"
    ]);
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
    await press("Cancel");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/cancel/gym");
  });

  it("a trial or an unknown cycle is not offered as a cut (it has no monthly charge)", async () => {
    await open({ capMinor: 1000 }, [...ROWS, sub({ id: "t", name: "Trialx", billingCycle: "trial", nextRenewalDate: "2026-10-28T09:00:00.000Z" })]);
    expect(screen.queryByText(/^\$10\.00\/trial/)).toBeNull();
    expect(screen.getByText("trial converts", { exact: false })).toBeTruthy();
  });

  it("close to the cap: 'Trim now'; on pace: no cut list", async () => {
    await open({ capMinor: 17000 });
    expect(screen.getByText("Close")).toBeTruthy();
    expect(screen.getByText("Trim now to stay under")).toBeTruthy();
    await open({ capMinor: 50000 });
    expect(screen.getByText("On pace")).toBeTruthy();
    expect(screen.queryByText("Trim now to stay under")).toBeNull();
  });

  it("the still-to-renew list runs a total; Edit budget goes back to setup", async () => {
    await open({ capMinor: 50000 });
    expect(screen.getByText("+$15.00")).toBeTruthy();
    expect(screen.getByText("→ $55.00")).toBeTruthy();
    expect(screen.getByText("→ $154.00")).toBeTruthy();
    await press("Edit budget");
    expect(saved()).toMatchObject({ capMinor: null, capSetAt: null });
    expect(screen.getByText("Set a recurring budget")).toBeTruthy();
  });

  it("F141: the Spend Coach is offered without a Pro badge (it is free), and opens", async () => {
    await open({ capMinor: 50000 });
    expect(screen.getAllByText("Pro")).toHaveLength(2); // the two real Pro features
    await press(/Ask the Spend Coach/);
    expect(routerMock.push).toHaveBeenLastCalledWith("/coach");
    await press(/Last month's recap/);
    expect(routerMock.push).toHaveBeenLastCalledWith("/budget-recap");
  });

  it("income: digits only, added as a share of income, editable", async () => {
    await open({ capMinor: 50000 });
    await press("Add");
    expect(saved().incomeMinor ?? null).toBeNull();
    await act(async () => { fireEvent.changeText(screen.getByLabelText("Monthly income"), "4,2a00"); });
    expect(screen.getByLabelText("Monthly income").props.value).toBe("4200");
    await press("Add");
    expect(saved()).toMatchObject({ incomeMinor: 420000 });
    expect(screen.getByText("4%")).toBeTruthy(); // 154 / 4200
    expect(screen.getByText("$4,046.00")).toBeTruthy();
    await press("Edit");
    expect(screen.getByLabelText("Monthly income")).toBeTruthy();
  });

  it("other currencies are counted, not converted by guess", async () => {
    await open({ capMinor: 50000 }, [...ROWS, sub({ id: "eu", name: "Kino", price: { amountMinor: 900, currency: "EUR" } })]);
    expect(screen.getByText("1 subscription in other currencies not included above.")).toBeTruthy();
  });

  it("free plan: category budgets and envelopes are locked and lead to the paywall", async () => {
    await open({ capMinor: 50000 });
    await press(/Cap each category/);
    expect(routerMock.push).toHaveBeenLastCalledWith("/paywall");
    await press(/Fund-and-spend envelopes/);
    expect(routerMock.push).toHaveBeenLastCalledWith("/paywall");
  });
});

describe("budget, Pro", () => {
  beforeEach(() => useAuthStore.setState({ plan: "pro" }));

  it("category caps: suggested from the forecast, steps of $5, over shown, saved", async () => {
    await open({ capMinor: 50000, categoryCaps: [{ category: "health", capMinor: 5000 }] });
    expect(screen.getByText("Health")).toBeTruthy();
    expect(screen.getByText("Productivity")).toBeTruthy();
    // Rows by forecast, largest first: Productivity $99 (suggested cap $100), Health $55 (cap $50, over).
    await press("Raise cap"); // the last row: Health
    expect(saved().categoryCaps).toEqual([{ category: "health", capMinor: 5500 }]);
    await act(async () => { fireEvent.press(screen.getAllByRole("button", { name: "Lower cap" })[0]!); });
    expect(saved().categoryCaps).toEqual([{ category: "health", capMinor: 5500 }, { category: "productivity", capMinor: 9500 }]);
  });

  it("no forecast spend: says so", async () => {
    await open({ capMinor: 50000 }, []);
    expect(screen.getByText("No category spend forecast this month.")).toBeTruthy();
  });

  it("envelopes: add, log, go over, remove after confirming", async () => {
    await open({ capMinor: 50000, envelopes: [{ id: "e1", name: "Fun", icon: "wallet", fundedMinor: 500, spentMinor: 0 }] });
    expect(screen.getByText("$0.00 of $5.00")).toBeTruthy();
    await press("Log $5");
    await press("Log $5");
    expect(screen.getByText("$10.00 of $5.00 · over")).toBeTruthy();
    await press("Remove Fun");
    const buttons = alert.mock.calls.at(-1)![2] as AlertButton[];
    await act(async () => { buttons.find((b) => b.text === "Remove")!.onPress!(); });
    expect(screen.queryByText("Fun")).toBeNull();
    await press("Add envelope");
    expect(screen.getByText("New envelope")).toBeTruthy();
  });

  it("an empty envelope list has no explainer", async () => {
    await open({ capMinor: 50000 });
    expect(screen.queryByText(/don't reset automatically/)).toBeNull();
  });

  it("a zero cap reads as on pace", async () => {
    await open({ capMinor: 0 });
    expect(screen.getByText("On pace")).toBeTruthy();
  });

  it("Back goes back", async () => {
    await open(null);
    await press("Go back");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });
});

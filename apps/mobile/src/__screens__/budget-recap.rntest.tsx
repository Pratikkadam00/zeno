import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { Share } from "react-native";
import BudgetRecapScreen from "../../app/budget-recap";
import { fakeStorage, renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8f-1: the budget recap (app/budget-recap.tsx) through the real stores and
 * the real history (buildMonthlySpendHistory) on a pinned clock (10 Oct 2026).
 * The two monthly rows below come to an estimated $55.00 a month.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../api/client", () => ({ recordFunnelEvent: jest.fn() }));
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const api = require("../api/client") as { recordFunnelEvent: jest.Mock };

const sub = (over: Partial<Subscription>): Subscription => ({
  id: "s", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, name: "S", category: "other",
  price: { amountMinor: 1000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: "2026-10-20T09:00:00.000Z",
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const ROWS = [
  sub({ id: "gym", name: "Gym", price: { amountMinor: 4000, currency: "USD" } }),
  sub({ id: "pool", name: "Pool", price: { amountMinor: 1500, currency: "USD" } })
];
const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  share.mockClear();
  api.recordFunnelEvent.mockClear();
});
afterEach(() => jest.useRealTimers());

async function open(budget: object | null, rows: Subscription[] = ROWS) {
  resetFakes({ rows });
  if (budget) fakeStorage.meta.set("budget.config.v1", JSON.stringify(budget));
  return renderScreen(<BudgetRecapScreen />, { settleMs: 1500 });
}
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};

describe("budget recap", () => {
  it("no budget: explains when a recap appears; Close goes back", async () => {
    await open(null);
    expect(screen.getByText("We'll show a recap once you've set a budget and tracked a full month.")).toBeTruthy();
    await press("Close");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });

  it("F143: a budget set TODAY has no recap and no streak to share (the months before it don't count)", async () => {
    await open({ capMinor: 10000, capSetAt: "2026-10-10T08:00:00.000Z" }, [sub({ id: "new", createdAt: "2026-10-10T08:00:00.000Z" })]);
    expect(screen.getByText("We'll show a recap once you've set a budget and tracked a full month.")).toBeTruthy();
    expect(screen.queryByText(/streak/)).toBeNull();
  });

  it("under the cap since July: September's recap, an ESTIMATE, a 2-month streak to share; every control is named", async () => {
    const r = await open({ capMinor: 10000, capSetAt: "2026-07-15T00:00:00.000Z" });
    expect(screen.getByText("Sep recap")).toBeTruthy();
    expect(screen.getByText("Under cap")).toBeTruthy();
    expect(screen.getByText("Estimated spend")).toBeTruthy();
    expect(screen.queryByText("Actually spent")).toBeNull();
    expect(screen.getByText("−$45.00")).toBeTruthy();
    expect(screen.getByText("vs Aug")).toBeTruthy();
    expect(screen.getByLabelText("2 month streak under cap")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
    await press(/Share my 2-month streak/);
    expect(api.recordFunnelEvent).toHaveBeenCalledWith("share_card_generated", "budget_streak");
    expect(share).toHaveBeenCalledWith({ message: expect.stringMatching(/^I've stayed under my subscription budget for 2 months straight\./) });
    await press("Done");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });

  it("a single month under: no streak marks, nothing to share", async () => {
    await open({ capMinor: 10000, capSetAt: "2026-08-15T00:00:00.000Z" });
    expect(screen.getByText("Under cap")).toBeTruthy();
    expect(screen.queryByLabelText(/month streak/)).toBeNull();
    expect(screen.queryByText(/Share my/)).toBeNull();
    expect(screen.queryByText(/^vs /)).toBeTruthy();
  });

  it("over the cap: stamped over, the margin added, nothing to share", async () => {
    await open({ capMinor: 5000, capSetAt: "2026-01-01T00:00:00.000Z" });
    expect(screen.getByText("Over cap")).toBeTruthy();
    expect(screen.getByText("+$5.00")).toBeTruthy();
    expect(screen.queryByText(/Share my/)).toBeNull();
  });

  it("a cheaper month than the one before shows the drop; an over-cap month before it ends the streak", async () => {
    // An annual $120 charged each August: Aug $175 (over the $100 cap), Sep $55.
    await open({ capMinor: 10000, capSetAt: "2026-07-15T00:00:00.000Z" }, [
      ...ROWS,
      sub({ id: "box", billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" }, nextRenewalDate: "2027-08-20T09:00:00.000Z" })
    ]);
    expect(screen.getByText("Under cap")).toBeTruthy();
    expect(screen.getByText("▼ $120.00")).toBeTruthy();
    expect(screen.queryByLabelText(/month streak/)).toBeNull();
  });
});

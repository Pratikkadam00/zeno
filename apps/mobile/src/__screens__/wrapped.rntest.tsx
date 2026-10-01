import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { Share } from "react-native";
import WrappedScreen from "../../app/wrapped";
import { renderScreen, resetFakes, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8f-2: Year in Review (app/wrapped.tsx) through the real store and the
 * real buildYearInReview, on a pinned clock (10 Oct 2026). Gym, $40 a month
 * since January: 10 months, $400. Box, $120 a year, charged each March. So
 * $520.00 over the window, the busiest month March ($160.00).
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
  id: "s", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, name: "S", category: "health",
  price: { amountMinor: 1000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: "2026-10-20T09:00:00.000Z",
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const ROWS = [
  sub({ id: "gym", name: "Gym", price: { amountMinor: 4000, currency: "USD" } }),
  sub({ id: "box", name: "Box", category: "productivity", billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" }, nextRenewalDate: "2027-03-20T09:00:00.000Z" }),
  sub({ id: "old", name: "Old", status: "cancelled" })
];
const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  share.mockClear();
  api.recordFunnelEvent.mockClear();
});
afterEach(() => jest.useRealTimers());

async function open(rows: Subscription[] = ROWS) {
  resetFakes({ rows });
  return renderScreen(<WrappedScreen />, { settleMs: 500 });
}
const press = async (name: string) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const lastShare = () => (share.mock.calls.at(-1)![0] as { message: string }).message;

describe("year in review", () => {
  it("F147: what the tracked subscriptions came to, called 'committed', never 'spent'; every control is named", async () => {
    const r = await open();
    expect(screen.getByText("$520.00 committed")).toBeTruthy();
    expect(screen.getByText(/^on the 2 subscriptions you track now, since you started tracking in /)).toBeTruthy();
    expect(screen.queryByText(/You spent/)).toBeNull();
    expect(screen.getByText("$600.00")).toBeTruthy(); // on pace: (40 + 120/12) x 12
    expect(screen.getByText("Gym")).toBeTruthy();
    expect(screen.getByText("Health")).toBeTruthy();
    expect(screen.getByText("Mar")).toBeTruthy();
    expect(screen.getByText("$160.00 due")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("F147: every share says 'committed' / 'came to', never 'spent'", async () => {
    await open();
    await press("Share my Wrapped");
    expect(lastShare()).toMatch(/^My subscriptions, wrapped:\n· \$520\.00 committed on the subscriptions I track since I started tracking in /);
    expect(lastShare()).toContain("· Priciest: Gym ($40.00/mo)");
    expect(lastShare()).toContain("· Most spent on: Health");
    expect(lastShare()).toContain("· Cancelled 1 I didn't need");
    await press("Share total spend");
    expect(lastShare()).toMatch(/^The subscriptions I track came to \$520\.00 since I started tracking in .* — and I'm on pace for \$600\.00 next year\./);
    for (const name of ["Share priciest subscription", "Share top category", "Share busiest month"]) await press(name);
    expect(api.recordFunnelEvent.mock.calls.map((c) => c[1])).toEqual(["wrapped_summary", "wrapped_total", "wrapped_most_expensive", "wrapped_top_category", "wrapped_busiest_month"]);
    expect(share.mock.calls.map((c) => (c[0] as { message: string }).message).join("\n")).not.toMatch(/\bspent \$/);
  });

  it("a full year of tracking says 'over the last 12 months'", async () => {
    await open([sub({ id: "gym", name: "Gym", createdAt: "2024-01-01T00:00:00.000Z", price: { amountMinor: 4000, currency: "USD" } })]);
    expect(screen.getByText("on the 1 subscription you track now, over the last 12 months.")).toBeTruthy();
    await press("Share my Wrapped");
    expect(lastShare()).toContain("committed on the subscriptions I track over the last 12 months");
  });

  it("nothing tracked: nothing to rank, no busiest month, and no per-stat shares", async () => {
    await open([]);
    expect(screen.getByText("$0.00 committed")).toBeTruthy();
    expect(screen.queryByText("Your priciest subscription")).toBeNull();
    expect(screen.queryByText("Your most expensive month")).toBeNull();
    await press("Share my Wrapped");
    expect(lastShare()).not.toContain("Priciest");
  });

  it("other currencies are counted, not guessed, on the page and in the share", async () => {
    await open([...ROWS, sub({ id: "eu", name: "Kino", price: { amountMinor: 900, currency: "EUR" } })]);
    expect(screen.getByText("1 subscription in other currencies isn't included above.")).toBeTruthy();
    await press("Share my Wrapped");
    expect(lastShare()).toContain("· 1 subscription(s) in other currencies not included");
  });
});

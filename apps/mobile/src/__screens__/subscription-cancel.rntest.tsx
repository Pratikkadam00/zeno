import type { Subscription } from "@zeno/shared";
import { dayLabelInDays } from "../utils/day-label";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import SubscriptionCancelScreen from "../../app/subscription/cancel/[id]";
import { fakeNotificationsModule, fakeStorage, renderScreen, resetFakes, routeParams, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8d-2: the cancel guide (app/subscription/cancel/[id].tsx) through the real
 * store and the real catalog: difficulty, steps, the cancel page (through the
 * P3.5 allowlist), the self-report to "pending verification", support, and the
 * figures it promises (F117, F119). Catalog data read first: Netflix is
 * "dark_pattern" with https://www.netflix.com/cancelplan and 5 steps; Spotify
 * "medium"; apple-tv-plus "easy"; monday-com "hard". No catalog entry has a
 * support contact, so one fake slug adds one (everything else is real).
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("@zeno/service-catalog", () => {
  const actual = jest.requireActual("@zeno/service-catalog");
  return {
    ...actual,
    findServiceBySlug: (slug: string) =>
      slug === "with-support"
        ? { ...actual.findServiceBySlug("netflix"), supportContact: { email: "help@netflix.com", phone: "+1 800 555 0100" } }
        : actual.findServiceBySlug(slug)
  };
});

const DAY = 86_400_000;
// Dates are stored as day labels (midnight UTC of the user's calendar day,
// F182/F202), so fixtures are too: "in N days" counts from the phone's date.
const iso = (days: number) => dayLabelInDays(days).toISOString();
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "c", createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: "Gym Club", category: "health",
  price: { amountMinor: 4000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(9),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const openURL = jest.spyOn(Linking, "openURL");
const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  openURL.mockReset().mockResolvedValue(true);
  alert.mockClear();
});
afterEach(() => jest.useRealTimers());

async function open(id: string, rows?: Subscription[]) {
  if (rows) resetFakes({ rows });
  routeParams.current = { id };
  return renderScreen(<SubscriptionCancelScreen />, { settleMs: 1500 });
}
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getByRole("button", { name })); });
};

describe("cancel guide, a catalog service (the seed's Netflix)", () => {
  it("names the service, its renewal, the yearly saving, the difficulty and the catalog's steps; every control is named", async () => {
    const r = await open("sub_netflix");
    expect(screen.getByText("Cancel subscription")).toBeTruthy();
    expect(screen.getByText(/^Renews tomorrow — /)).toBeTruthy();
    expect(screen.getByText("$185.88/yr")).toBeTruthy(); // 15.49 x 12
    expect(screen.getByLabelText(/^Dark pattern\. Known for hard-to-cancel flows/)).toBeTruthy();
    expect(screen.getByText("HOW TO CANCEL")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("opens the catalog's cancel page, then asks whether it worked", async () => {
    await open("sub_netflix");
    await press("Open Netflix cancellation page");
    expect(openURL).toHaveBeenCalledWith("https://www.netflix.com/cancelplan");
    expect(screen.getByText("Did you cancel it?")).toBeTruthy();
    await press("Not yet");
    expect(screen.queryByText("Did you cancel it?")).toBeNull();
  });

  it("a page that cannot be opened says what to do instead, and still asks", async () => {
    openURL.mockRejectedValueOnce(new Error("No browser"));
    await open("sub_netflix");
    await press("Open Netflix cancellation page");
    expect(alert).toHaveBeenCalledWith("Couldn't open the page", "Open your browser and go to the service's account or billing settings to cancel.");
    expect(screen.getByText("Did you cancel it?")).toBeTruthy();
  });

  it("'Yes, I cancelled' reports it: pending verification, reminders cleared, the outcome announced, Done to the ledger", async () => {
    await open("sub_netflix");
    await press("Open Netflix cancellation page");
    await press("Yes, I cancelled");
    expect(fakeStorage.rows.get("sub_netflix")?.status).toBe("pending");
    expect(fakeNotificationsModule.cancelNotificationsForSubscription).toHaveBeenCalledWith("sub_netflix");
    expect(screen.getByLabelText(/^Netflix marked cancelled, pending verification\. .* If it stops, you keep \$185\.88 a year\.$/)).toBeTruthy();
    expect(screen.getByText("Every month")).toBeTruthy();
    expect(screen.getByText("+$15.49")).toBeTruthy();
    expect(screen.getByText("+$185.88")).toBeTruthy();
    await press("Done");
    expect(routerMock.replace).toHaveBeenLastCalledWith("/dashboard");
  });

  it("'I've already cancelled' goes straight to the same outcome, even if clearing reminders fails", async () => {
    fakeNotificationsModule.cancelNotificationsForSubscription.mockRejectedValueOnce(new Error("permission never granted"));
    await open("sub_netflix");
    await press("Mark Netflix as cancelled");
    expect(fakeStorage.rows.get("sub_netflix")?.status).toBe("pending");
    expect(screen.getByLabelText(/^Netflix marked cancelled, pending verification\./)).toBeTruthy();
  });

  it("'Having trouble?' expands to a web search for how to cancel", async () => {
    await open("sub_netflix");
    await press("Having trouble?");
    expect(screen.getByRole("button", { name: "Having trouble?" }).props.accessibilityState).toMatchObject({ expanded: true });
    await press("Search how to cancel Netflix");
    expect(openURL).toHaveBeenCalledWith("https://www.google.com/search?q=how%20to%20cancel%20Netflix");
    expect(screen.queryByText("Email support")).toBeNull();
  });
});

describe("cancel guide, difficulty, support, renewal wording", () => {
  it.each([
    ["apple-tv-plus", "Easy to cancel"],
    ["spotify", "Moderate steps"],
    ["monday-com", "Hard to cancel"]
  ])("%s: %s", async (slug, label) => {
    await open("c", [sub({ serviceSlug: slug })]);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it("support contacts, when the catalog has them, are offered as mail and phone", async () => {
    await open("c", [sub({ serviceSlug: "with-support" })]);
    await press("Having trouble?");
    await press("Email support");
    expect(openURL).toHaveBeenLastCalledWith("mailto:help@netflix.com");
    await press("Call support");
    expect(openURL).toHaveBeenLastCalledWith("tel:+1 800 555 0100");
  });

  it("not in the catalog: generic steps, and the button reports the cancellation directly (no page to open)", async () => {
    await open("c", [sub({})]);
    expect(screen.getByText("Open the Gym Club website or app")).toBeTruthy();
    expect(screen.queryByLabelText(/DIFFICULTY|cancel\./)).toBeNull();
    await press("Cancel Gym Club subscription");
    expect(openURL).not.toHaveBeenCalled();
    expect(screen.getByText("Did you cancel it?")).toBeTruthy();
  });

  it.each([
    ["today", 0, /^Renews TODAY — /],
    ["in 9 days", 9, /^Renews in 9 days — /]
  ])("renewing %s", async (_n, days, pattern) => {
    await open("c", [sub({ nextRenewalDate: iso(days) })]);
    expect(screen.getByText(pattern)).toBeTruthy();
  });

  it("no renewal date: says it is unknown", async () => {
    await open("c", [sub({ nextRenewalDate: undefined })]);
    expect(screen.getByText("Next renewal date unknown")).toBeTruthy();
  });
});

describe("cancel guide, going back", () => {
  it("from the guide, and from a not-found page (both of its back buttons)", async () => {
    await open("sub_netflix");
    await press("Go back");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
    routerMock.back.mockClear();
    await open("nope");
    const backs = screen.getAllByRole("button", { name: "Go back" });
    expect(backs).toHaveLength(2);
    for (const back of backs) fireEvent.press(back);
    expect(routerMock.back).toHaveBeenCalledTimes(2);
  });
});

describe("cancel guide, figures it promises (F117, F119)", () => {
  it("F119: an annual plan's success card says what comes back EACH YEAR, not 'every month'", async () => {
    await open("c", [sub({ billingCycle: "annual", price: { amountMinor: 9900, currency: "USD" } })]);
    await press("Mark Gym Club as cancelled");
    expect(screen.queryByText("Every month")).toBeNull();
    expect(screen.getByText("Every year")).toBeTruthy();
    expect(screen.getAllByText("+$99.00")).toHaveLength(1);
  });

  it("F119: a weekly plan: every week, and a year as 52 of them", async () => {
    await open("c", [sub({ billingCycle: "weekly", price: { amountMinor: 500, currency: "USD" } })]);
    await press("Mark Gym Club as cancelled");
    expect(screen.getByText("Every week")).toBeTruthy();
    expect(screen.getByText("+$5.00")).toBeTruthy();
    expect(screen.getByText("+$260.00")).toBeTruthy();
  });

  it("quarterly: a year as 4 charges", async () => {
    await open("c", [sub({ billingCycle: "quarterly", price: { amountMinor: 3000, currency: "USD" } })]);
    expect(screen.getByText("$120.00/yr")).toBeTruthy();
  });

  it("F117: an unknown cycle promises no yearly saving anywhere", async () => {
    await open("c", [sub({ billingCycle: "unknown" })]);
    expect(screen.queryByText("Cancelling saves you")).toBeNull();
    await press("Mark Gym Club as cancelled");
    expect(screen.queryByText("Every year")).toBeNull();
    expect(screen.getByText("Each charge")).toBeTruthy();
    expect(screen.getByLabelText(/^Gym Club marked cancelled, pending verification\. .*\.$/).props.accessibilityLabel).not.toMatch(/a year/);
  });
});

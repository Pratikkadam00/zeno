import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import AddSubscriptionScreen from "../../app/subscription/add";
import { fakeStorage, renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8d-2: the add form (app/subscription/add.tsx) through the real store and
 * the real catalog: search, the popular grid, a custom name, the catalog
 * autofill, the details, the free-plan ceiling (10), and what is saved.
 * Catalog data read first: the popular grid starts Netflix ($15.49/mo,
 * "streaming"), Spotify, ChatGPT Plus; Speechify has only an annual price
 * ($139); Substack has no price; "spot" finds Spotify first.
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

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const sub = (i: number, over: Partial<Subscription> = {}): Subscription => ({
  id: `row_${i}`, createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: `Row ${i}`, category: "other",
  price: { amountMinor: 100, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(9),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes({ rows: [] });
  useAuthStore.setState({ plan: "free" });
});
afterEach(() => jest.useRealTimers());

const open = () => renderScreen(<AddSubscriptionScreen />, { settleMs: 500 });
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const type = async (label: string, text: string) => {
  await act(async () => { fireEvent.changeText(screen.getByLabelText(label), text); });
};
const toggle = async (name: string, value: boolean) => {
  await act(async () => { fireEvent(screen.getByRole("switch", { name }), "valueChange", value); });
};
const saved = () => [...fakeStorage.rows.values()];
const settings = () => JSON.parse(fakeStorage.meta.get("notification.settings.v1") ?? "{}") as Record<string, unknown>;
// Renewal dates are day labels (midnight UTC, F182): count whole days from
// today's UTC day, not from this instant (rounding from "now" read 29 for 30
// after 12:00 UTC).
const daysAhead = (when?: string) => {
  const now = new Date();
  return (Date.parse(when!) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / DAY;
};

describe("add, step 1: find the service", () => {
  it("shows the 8 most popular services with their catalog prices; every control is named", async () => {
    const r = await open();
    expect(screen.getByText("POPULAR RIGHT NOW")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Netflix, $15.49/mo" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^[^,]+, (\$[\d.]+\/(mo|yr)|—)$/ })).toHaveLength(8);
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("searching lists the catalog's matches and offers the typed name as a custom service", async () => {
    await open();
    await type("Search services", "spot");
    expect(screen.queryByText("POPULAR RIGHT NOW")).toBeNull();
    expect(screen.getByRole("button", { name: "Spotify, $10.00/mo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add spot as a custom service" })).toBeTruthy();
  });

  it("the keyboard's done key adds the typed name as custom; with nothing typed it does nothing", async () => {
    await open();
    await act(async () => { fireEvent(screen.getByLabelText("Search services"), "submitEditing"); });
    expect(screen.getByText("POPULAR RIGHT NOW")).toBeTruthy();
    await type("Search services", "  Gym Club ");
    await act(async () => { fireEvent(screen.getByLabelText("Search services"), "submitEditing"); });
    expect(screen.getByLabelText("Service name").props.value).toBe("Gym Club");
    expect(screen.getByText("Custom service")).toBeTruthy();
  });

  it("Back leaves without saving", async () => {
    await open();
    await press("Go back");
    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(saved()).toEqual([]);
  });
});

describe("add, step 2: the details form", () => {
  it("a popular pick autofills name, price, monthly and category, and saves exactly that, 30 days out", async () => {
    const r = await open();
    await press("Netflix, $15.49/mo");
    expect(screen.getByLabelText("Service name").props.value).toBe("Netflix");
    expect(screen.getByLabelText("Amount in dollars").props.value).toBe("15.49");
    expect(screen.getByRole("button", { name: "Bill monthly" }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole("button", { name: "Category Entertainment" }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText("in 30 days")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
    await press("Add subscription");
    expect(saved()).toHaveLength(1);
    expect(saved()[0]).toMatchObject({ name: "Netflix", serviceSlug: "netflix", category: "entertainment", price: { amountMinor: 1549, currency: "USD" }, billingCycle: "monthly", source: "manual" });
    expect(saved()[0].notes).toBeUndefined();
    expect(daysAhead(saved()[0].nextRenewalDate)).toBe(30);
    expect(routerMock.back).toHaveBeenCalledTimes(1);
  });

  it("a search result with only an annual price fills the annual price and the annual cycle", async () => {
    await open();
    await type("Search services", "Speechify");
    await press("Speechify, $139.00/yr");
    expect(screen.getByLabelText("Amount in dollars").props.value).toBe("139.00");
    expect(screen.getByRole("button", { name: "Bill annual" }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText("ai tools")).toBeTruthy();
  });

  // One service per catalog category (read from the catalog), each mapped to
  // the app's own category.
  it.each([
    ["Xbox Game Pass Ultimate", "$17.00/mo", "Entertainment"],
    ["Spotify Premium", "$10.00/mo", "Entertainment"],
    ["Adobe Creative Cloud", "$55.00/mo", "Productivity"],
    ["Peloton", "$44.00/mo", "Health"],
    ["YNAB", "$15.00/mo", "Finance"],
    ["Duolingo Plus", "$7.00/mo", "Education"],
    ["iCloud+", "$1.00/mo", "Developer tools"],
    ["NordPass", "$2.00/mo", "Developer tools"],
    ["Patreon", "$5.00/mo", "Other"]
  ])("%s (%s) is filed under %s", async (service, price, category) => {
    await open();
    await type("Search services", service);
    await press(`${service}, ${price}`);
    expect(screen.getByRole("button", { name: `Category ${category}` }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it("F123: a custom service starts with NO amount, so nothing is saved at a price the user never typed", async () => {
    await open();
    await type("Search services", "Gym Club");
    await press("Add Gym Club as a custom service");
    expect(screen.getByLabelText("Amount in dollars").props.value).toBe("");
    expect(screen.getByRole("button", { name: "Add subscription" }).props.accessibilityState).toMatchObject({ disabled: true });
    await press("Add subscription");
    await press("Save subscription");
    expect(saved()).toEqual([]);
    await type("Amount in dollars", "40");
    await press("Save subscription");
    expect(saved()[0]).toMatchObject({ name: "Gym Club", category: "other", price: { amountMinor: 4000 } });
    expect(saved()[0].serviceSlug).toBeUndefined();
  });

  it("F123: changing to an unpriced catalog service does not keep the previous service's price", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    await press("Change selected service");
    expect(screen.getByText("POPULAR RIGHT NOW")).toBeTruthy();
    await type("Search services", "Substack");
    await press("Substack, —");
    expect(screen.getByLabelText("Amount in dollars").props.value).toBe("");
  });

  it("F122: an amount parseFloat would misread cannot be saved", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    for (const text of ["1,99", "9.99.9", "1e3", "0", "0.00"]) {
      await type("Amount in dollars", text);
      expect(screen.getByRole("button", { name: "Add subscription" }).props.accessibilityState).toMatchObject({ disabled: true });
      await press("Add subscription");
    }
    expect(saved()).toEqual([]);
    await type("Amount in dollars", "12.5");
    await press("Add subscription");
    expect(saved()[0].price.amountMinor).toBe(1250);
  });

  it("a name is required", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    await type("Service name", "   ");
    expect(screen.getByText("New subscription")).toBeTruthy();
    await press("Add subscription");
    expect(saved()).toEqual([]);
  });

  it("editing the name detaches the catalog match; the inline list can re-attach one or keep the name custom", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    await type("Service name", "spot");
    expect(screen.getByText("Custom service")).toBeTruthy();
    await press("Use spot as a custom service");
    expect(screen.queryByLabelText("Service suggestions")).toBeTruthy(); // still custom: the list stays for the typed name
    await press("Spotify, $10.00/mo");
    expect(screen.getByLabelText("Service name").props.value).toBe("Spotify");
    expect(screen.getByLabelText("Amount in dollars").props.value).toBe("10.00");
    expect(screen.queryByLabelText("Service suggestions")).toBeNull();
    await press("Add subscription");
    expect(saved()[0]).toMatchObject({ name: "Spotify", serviceSlug: "spotify", price: { amountMinor: 1000 } });
  });

  it("billing, category, renewal date, a free trial and a note are all saved as chosen", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    await press("Bill weekly");
    await press("Category Family");
    expect(screen.getByRole("button", { name: "Category Family" }).props.accessibilityState).toMatchObject({ selected: true });
    await press("Renew later");
    expect(screen.getByText("in 31 days")).toBeTruthy();
    await press("Renew earlier");
    await press("Renew earlier");
    expect(screen.getByText("in 29 days")).toBeTruthy();
    await press("2 weeks");
    expect(screen.getByRole("button", { name: "2 weeks" }).props.accessibilityState).toMatchObject({ selected: true });
    await type("Notes", "  Shared with Sam  ");
    await press("Add subscription");
    expect(saved()[0]).toMatchObject({ billingCycle: "weekly", category: "family", notes: "Shared with Sam" });
    expect(daysAhead(saved()[0].nextRenewalDate)).toBe(14);
  });

  it("a free trial is saved as a 'trial' cycle ending on the chosen day", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    expect(screen.queryByText("Trial ends")).toBeNull();
    await toggle("Free trial", true);
    expect(screen.getByText("Trial ends")).toBeTruthy();
    await press("1 week");
    await press("Add subscription");
    expect(saved()[0].billingCycle).toBe("trial");
    expect(daysAhead(saved()[0].nextRenewalDate)).toBe(7);
  });

  it("the renewal stepper stops at today", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    await press("Tomorrow");
    expect(screen.getByText("in 1 day")).toBeTruthy();
    await press("Renew earlier");
    await press("Renew earlier");
    expect(screen.getByText("in 0 days")).toBeTruthy();
  });

  it("F120: reminders switched off here are off for the saved subscription", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    await toggle("7-day reminder", false);
    await toggle("Charge day alert", false);
    expect(screen.getByRole("switch", { name: "7-day reminder" }).props.value).toBe(false);
    await press("Add subscription");
    expect(settings()[saved()[0].id]).toEqual({ sevenDay: false, threeDay: true, dayOf: false });
  });

  it("with every reminder left on, all three are kept", async () => {
    await open();
    await press("Netflix, $15.49/mo");
    await toggle("3-day reminder", false);
    await toggle("3-day reminder", true);
    await press("Add subscription");
    expect(settings()[saved()[0].id]).toEqual({ sevenDay: true, threeDay: true, dayOf: true });
  });
});

describe("add, the free plan's 10", () => {
  it("at 10 tracked on the free plan, Save goes to Pro and adds nothing", async () => {
    resetFakes({ rows: Array.from({ length: 10 }, (_, i) => sub(i)) });
    await open();
    await press("Netflix, $15.49/mo");
    await press("Add subscription");
    expect(routerMock.push).toHaveBeenCalledWith("/paywall");
    expect(saved()).toHaveLength(10);
  });

  it("a cancelled subscription does not count toward the 10", async () => {
    resetFakes({ rows: Array.from({ length: 10 }, (_, i) => sub(i, i === 0 ? { status: "cancelled" } : {})) });
    await open();
    await press("Netflix, $15.49/mo");
    await press("Add subscription");
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(saved()).toHaveLength(11);
  });

  it("Pro has no ceiling", async () => {
    useAuthStore.setState({ plan: "pro" });
    resetFakes({ rows: Array.from({ length: 10 }, (_, i) => sub(i)) });
    await open();
    await press("Netflix, $15.49/mo");
    await press("Add subscription");
    expect(saved()).toHaveLength(11);
  });
});

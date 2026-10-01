import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import CoachScreen from "../../app/coach";
import { fakeStorage, renderScreen, resetFakes, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8f-1: the Spend Coach (app/coach.tsx) through the real stores. Only the
 * network call (getAiCoaching) is faked. Checked: nothing is sent before
 * consent, email-found subscriptions are never sent, and what the screen says
 * when no AI answer comes back (F142).
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../api/client", () => ({ getAiCoaching: jest.fn() }));
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const api = require("../api/client") as { getAiCoaching: jest.Mock };

const sub = (over: Partial<Subscription>): Subscription => ({
  id: "s", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, name: "S", category: "health",
  price: { amountMinor: 1000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: "2026-10-20T09:00:00.000Z",
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const ROWS = [
  sub({ id: "gym", name: "Gym", price: { amountMinor: 4000, currency: "USD" } }),
  sub({ id: "box", name: "Box", category: "productivity", billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" } }),
  sub({ id: "mail", name: "FromInbox", source: "email", price: { amountMinor: 700, currency: "USD" } })
];
const AI = { source: "ai", provider: "anthropic", model: "m", outOfScope: false, summary: "Drop the gym.", recommendations: [
  { title: "Cancel Gym", detail: "You rarely go.", estimatedMonthlySavingsLabel: "$40/mo" },
  { title: "Keep Box", detail: "Good value." }
] };

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  api.getAiCoaching.mockReset().mockResolvedValue({ ok: true, data: AI });
});
afterEach(() => jest.useRealTimers());

async function open(meta: Record<string, string> = {}, rows: Subscription[] = ROWS) {
  resetFakes({ rows });
  for (const [k, v] of Object.entries(meta)) fakeStorage.meta.set(k, v);
  return renderScreen(<CoachScreen />, { settleMs: 500 });
}
const press = async (name: string) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const GRANTED = { "coach.aiConsent.v1": "granted" };

describe("coach, before consent", () => {
  it("on-device only: the agreement, nothing sent; every control is named", async () => {
    const r = await open();
    expect(screen.getByText("Deterministic insights, computed entirely on your device.")).toBeTruthy();
    expect(screen.getByText(/^Coaching is optional\./)).toBeTruthy();
    expect(screen.getByText("$57.00")).toBeTruthy(); // a month: 40 + 120/12 + 7
    expect(api.getAiCoaching).not.toHaveBeenCalled();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("Not now: off, saved, still nothing sent; it can be enabled later", async () => {
    await open();
    await press("Not now, keep insights on-device");
    expect(fakeStorage.meta.get("coach.aiConsent.v1")).toBe("declined");
    expect(screen.getByText(/^AI coaching is off\./)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Not now, keep insights on-device" })).toBeNull();
    expect(api.getAiCoaching).not.toHaveBeenCalled();
    await press("Enable AI coaching");
    expect(fakeStorage.meta.get("coach.aiConsent.v1")).toBe("granted");
    expect(api.getAiCoaching).toHaveBeenCalledTimes(1);
  });
});

describe("coach, with consent", () => {
  it("sends names, categories and monthly amounts, never an email-found subscription; shows the AI's advice", async () => {
    await open(GRANTED);
    const payload = api.getAiCoaching.mock.calls[0]![0];
    expect(payload.subscriptions.map((s: { name: string }) => s.name).sort()).toEqual(["Box", "Gym"]);
    expect(payload.totalMonthlyMinor).toBe(5000);
    expect(JSON.stringify(payload)).not.toContain("FromInbox");
    expect(payload.budgetCapMinor).toBeUndefined();
    expect(screen.getByText("Personalized coaching from your configured AI model, grounded in your subscriptions.")).toBeTruthy();
    expect(screen.getByText("Drop the gym.")).toBeTruthy();
    expect(screen.getByText("Potential savings: $40/mo")).toBeTruthy();
    expect(screen.getByText("Keep Box")).toBeTruthy();
    expect(screen.queryByText("RULE-BASED INSIGHTS")).toBeNull();
  });

  it.each([
    ["the server has no AI model", { ok: true, data: { source: "unconfigured", model: "none" } }],
    ["offline", { ok: false, reason: "offline" }]
  ])("F142: %s: says coaching isn't available, never 'add an AI key on the server'", async (_name, result) => {
    api.getAiCoaching.mockResolvedValue(result);
    await open(GRANTED);
    expect(screen.getByText("Personalized coaching isn't available right now. These insights are computed on your device.")).toBeTruthy();
    expect(screen.queryByText(/AI key/)).toBeNull();
    expect(screen.getByText("RULE-BASED INSIGHTS")).toBeTruthy();
  });

  it("while the answer is coming: says it is asking", async () => {
    api.getAiCoaching.mockImplementation(() => new Promise(() => {}));
    await open(GRANTED);
    expect(screen.getByText("Asking your AI coach…")).toBeTruthy();
    expect(screen.getByText("Asking your AI coach for personalized coaching.")).toBeTruthy();
  });

  it("an AI answer without a summary shows just the recommendations", async () => {
    api.getAiCoaching.mockResolvedValue({ ok: true, data: { ...AI, summary: "" } });
    await open(GRANTED);
    expect(screen.queryByText("AI COACH")).toBeNull();
    expect(screen.getByText("Cancel Gym")).toBeTruthy();
  });

  it("leaving before the answer arrives changes nothing", async () => {
    let answer: (v: unknown) => void = () => {};
    api.getAiCoaching.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    const r = await open(GRANTED);
    r.unmount();
    await act(async () => { answer({ ok: true, data: AI }); });
    expect(api.getAiCoaching).toHaveBeenCalledTimes(1);
  });
});

describe("coach, the budget and the insights", () => {
  it("over the budget: by how much, and the cheapest cuts that get back under (monthly amounts)", async () => {
    await open({ ...GRANTED, "budget.config.v1": JSON.stringify({ capMinor: 4500, capSetAt: "2026-08-01T00:00:00.000Z" }) });
    expect(api.getAiCoaching.mock.calls[0]![0].budgetCapMinor).toBe(4500);
    // This month's forecast: Gym $40 + Box $120 (its renewal is the 20th) + FromInbox $7 = $167.
    expect(screen.getByText("You're $122.00 over your $45.00 budget (forecast $167.00).")).toBeTruthy();
    // F145: every candidate together saves $57.00 a month, short of $122.00: no "get under".
    expect(screen.getByText("Cancel FromInbox + Box + Gym → save $57.00/mo. That alone won't get you under this month.")).toBeTruthy();
  });

  it("F145: just over: the cheapest cut that covers it, and only then 'get under'", async () => {
    await open({ "budget.config.v1": JSON.stringify({ capMinor: 16000, capSetAt: "2026-08-01T00:00:00.000Z" }) });
    expect(screen.getByText("You're $7.00 over your $160.00 budget (forecast $167.00).")).toBeTruthy();
    expect(screen.getByText("Cancel FromInbox → save $7.00/mo and get under.")).toBeTruthy();
  });

  it("on pace: says so", async () => {
    await open({ "budget.config.v1": JSON.stringify({ capMinor: 50000, capSetAt: "2026-08-01T00:00:00.000Z" }) });
    expect(screen.getByText("On pace — forecast $167.00 of your $500.00 budget.")).toBeTruthy();
  });

  it("the category breakdown and the rule-based insights", async () => {
    await open();
    expect(screen.getByText("Category breakdown")).toBeTruthy();
    expect(screen.getByText("productivity")).toBeTruthy();
    expect(screen.getByText("RULE-BASED INSIGHTS")).toBeTruthy();
  });

  it("other currencies are counted, not guessed", async () => {
    await open({}, [...ROWS, sub({ id: "eu", name: "Kino", price: { amountMinor: 900, currency: "EUR" } })]);
    expect(screen.getByText("1 subscription in other currencies not included.")).toBeTruthy();
  });

  it("nothing tracked: no insights yet", async () => {
    await open({}, []);
    expect(screen.getByText("No spending insights yet")).toBeTruthy();
  });
});

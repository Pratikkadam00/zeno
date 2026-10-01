import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import FamilyScreen from "../../app/family";
import { renderScreen, resetFakes, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8f-2: Family (app/family.tsx). The household API calls and the secure
 * store are faked; the subscription store is real (its monthly total is what
 * a member shares).
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../api/client", () => ({
  createHousehold: jest.fn(), getHousehold: jest.fn(), joinHousehold: jest.fn(), leaveHousehold: jest.fn(), setMemberSpend: jest.fn()
}));
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    store,
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    deleteItemAsync: jest.fn(async (k: string) => { store.delete(k); })
  };
});
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create(() => ({ email: "sam.lee@example.com", accountId: "acct_9f2c" })) };
});
/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("../api/client") as Record<string, jest.Mock>;
const vault = require("expo-secure-store") as { store: Map<string, string>; getItemAsync: jest.Mock };
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { setState: (s: object) => void } };
/* eslint-enable @typescript-eslint/no-require-imports */

const KEY = "zeno.family.householdId";
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "s", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, name: "Gym", category: "health",
  price: { amountMinor: 4000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: "2026-12-20T09:00:00.000Z",
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});
const HOUSEHOLD = {
  id: "hh1", shareCode: "ABCD2345", ownerId: "acct_9f2c", createdAt: "2026-01-01T00:00:00.000Z",
  members: [
    { id: "acct_9f2c", name: "sam.lee", monthlySpendMinor: 4000, currency: "USD" },
    { id: "acct_2", name: "alex", monthlySpendMinor: 1500, currency: "USD" }
  ]
};

beforeEach(() => {
  jest.useFakeTimers();
  vault.store.clear();
  for (const f of Object.values(api)) f.mockReset();
  api.getHousehold!.mockResolvedValue({ ok: true, data: HOUSEHOLD });
  api.setMemberSpend!.mockResolvedValue({ ok: true, data: HOUSEHOLD });
  useAuthStore.setState({ email: "sam.lee@example.com", accountId: "acct_9f2c" });
});
afterEach(() => jest.useRealTimers());

async function open(rows: Subscription[] = [sub({})]) {
  resetFakes({ rows });
  return renderScreen(<FamilyScreen />, { settleMs: 300 });
}
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const typeCode = async (text: string) => {
  await act(async () => { fireEvent.changeText(screen.getByLabelText("Household share code"), text); });
};

describe("family, not in a household", () => {
  it("offers to start or join; every control is named", async () => {
    const r = await open();
    expect(screen.getByText("Start a household")).toBeTruthy();
    expect(screen.getByText("Join with a code")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("F148: create shares the EMAIL's name (never the account id) and this member's monthly total", async () => {
    api.createHousehold!.mockResolvedValue({ ok: true, data: HOUSEHOLD });
    await open();
    await press("Create household");
    expect(api.createHousehold).toHaveBeenCalledWith("self", "sam.lee", 4000, "USD");
    expect(vault.store.get(KEY)).toBe("hh1");
    expect(screen.getByText("SHARE CODE")).toBeTruthy();
    expect(screen.getByText("2 members · $55.00/mo combined")).toBeTruthy();
    expect(screen.getByText("sam.lee  ·  owner")).toBeTruthy();
  });

  it("F148: without an email the name is 'Member'", async () => {
    useAuthStore.setState({ email: null });
    api.createHousehold!.mockResolvedValue({ ok: true, data: HOUSEHOLD });
    await open();
    await press("Create household");
    expect(api.createHousehold).toHaveBeenCalledWith("self", "Member", 4000, "USD");
  });

  it.each([
    ["offline", "You're offline. Check your connection and try again."],
    ["auth", "Please sign in again to manage your household."],
    ["not_found", "That household no longer exists."],
    ["server", "Couldn't create a household right now. Please try again."]
  ])("a failed create (%s) says why", async (reason, message) => {
    api.createHousehold!.mockResolvedValue({ ok: false, reason });
    await open();
    await press("Create household");
    expect(screen.getByText(message)).toBeTruthy();
  });

  it("F149: a join code must be the server's 8 characters; it is upper-cased as typed", async () => {
    await open();
    await typeCode("abcd234");
    expect(screen.getByLabelText("Household share code").props.value).toBe("ABCD234");
    await press("Join household");
    expect(screen.getByText("Enter the 8-character code.")).toBeTruthy();
    expect(api.joinHousehold).not.toHaveBeenCalled();
  });

  it("join: sent with the name and total; a wrong code, or any failure, says which", async () => {
    api.joinHousehold!.mockResolvedValueOnce({ ok: false, reason: "not_found" }).mockResolvedValueOnce({ ok: false, reason: "server" }).mockResolvedValueOnce({ ok: true, data: HOUSEHOLD });
    await open();
    await typeCode(" abcd2345 ");
    await press("Join household");
    expect(api.joinHousehold).toHaveBeenLastCalledWith("ABCD2345", "self", "sam.lee", 4000, "USD");
    expect(screen.getByText("No household found for that code.")).toBeTruthy();
    await press("Join household");
    expect(screen.getByText("Couldn't join right now. Please try again.")).toBeTruthy();
    await press("Join household");
    expect(screen.getByText("2 members · $55.00/mo combined")).toBeTruthy();
  });

  it("while a request runs, the buttons say so", async () => {
    let finish: (v: unknown) => void = () => {};
    api.createHousehold!.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await open();
    await press("Create household");
    expect(screen.getAllByText("Working…").length).toBe(2);
    await act(async () => { finish({ ok: false, reason: "offline" }); });
    expect(screen.getByText("Create household")).toBeTruthy();
  });
});

describe("family, in a household", () => {
  it("restores the saved household and re-shares this member's total; mixed currencies aren't summed", async () => {
    vault.store.set(KEY, "hh1");
    api.getHousehold!.mockResolvedValue({ ok: true, data: { ...HOUSEHOLD, members: [...HOUSEHOLD.members, { id: "acct_3", name: "kai", monthlySpendMinor: 900, currency: "EUR" }] } });
    api.setMemberSpend!.mockResolvedValue({ ok: false, reason: "offline" });
    await open();
    expect(api.getHousehold).toHaveBeenCalledWith("hh1");
    expect(api.setMemberSpend).toHaveBeenCalledWith("hh1", 4000, "USD");
    expect(screen.getByText("3 members · mixed currencies — see below")).toBeTruthy();
    expect(screen.getByText("€9.00/mo")).toBeTruthy();
  });

  it("a household disbanded on the server is forgotten here", async () => {
    vault.store.set(KEY, "gone");
    api.getHousehold!.mockResolvedValue({ ok: false, reason: "not_found" });
    await open();
    expect(vault.store.has(KEY)).toBe(false);
    expect(screen.getByText("Start a household")).toBeTruthy();
  });

  it("a household that can't be read right now is kept for next time", async () => {
    vault.store.set(KEY, "hh1");
    api.getHousehold!.mockResolvedValue({ ok: false, reason: "offline" });
    await open();
    expect(vault.store.get(KEY)).toBe("hh1");
  });

  it("F150: leaving waits for the server; if it can't be reached, you are told you're still in", async () => {
    vault.store.set(KEY, "hh1");
    api.leaveHousehold!.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await open();
    await press("Leave household");
    expect(screen.getByText("Couldn't leave right now: you're still in this household. Check your connection and try again.")).toBeTruthy();
    expect(vault.store.get(KEY)).toBe("hh1");
    expect(screen.getByText("SHARE CODE")).toBeTruthy();
    await press("Leave household");
    expect(api.leaveHousehold).toHaveBeenLastCalledWith("hh1");
    expect(vault.store.has(KEY)).toBe(false);
    expect(screen.getByText("Start a household")).toBeTruthy();
  });

  it("a secure store that fails never blocks: unreadable starts fresh; failed saves and deletes are ignored", async () => {
    const v = vault as unknown as Record<string, jest.Mock>;
    v.getItemAsync!.mockRejectedValueOnce(new Error("keychain"));
    await open();
    expect(screen.getByText("Start a household")).toBeTruthy();
    v.setItemAsync!.mockRejectedValueOnce(new Error("keychain"));
    api.createHousehold!.mockResolvedValue({ ok: true, data: HOUSEHOLD });
    await press("Create household");
    expect(screen.getByText("SHARE CODE")).toBeTruthy();
    v.deleteItemAsync!.mockRejectedValueOnce(new Error("keychain"));
    api.leaveHousehold!.mockResolvedValue(true);
    await press("Leave household");
    expect(screen.getByText("Start a household")).toBeTruthy();
  });

  it("a disbanded household whose pointer can't be deleted still shows the start screen", async () => {
    const v = vault as unknown as Record<string, jest.Mock>;
    vault.store.set(KEY, "gone");
    api.getHousehold!.mockResolvedValue({ ok: false, reason: "not_found" });
    v.deleteItemAsync!.mockRejectedValueOnce(new Error("keychain"));
    await open();
    expect(screen.getByText("Start a household")).toBeTruthy();
  });

  it("leaving the screen before the household loads changes nothing", async () => {
    let answer: (v: unknown) => void = () => {};
    vault.store.set(KEY, "hh1");
    api.getHousehold!.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    resetFakes({ rows: [] });
    const r = await renderScreen(<FamilyScreen />, { settleMs: 50 });
    expect(screen.getByText("Loading…")).toBeTruthy();
    r.unmount();
    await act(async () => { answer({ ok: true, data: HOUSEHOLD }); });
    expect(api.setMemberSpend).not.toHaveBeenCalled();
  });
});

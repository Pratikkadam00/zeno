import type { Subscription } from "@zeno/shared";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

/**
 * The subscription store through its real provider and hook. Storage, FX and
 * notifications are in-memory fakes at the module boundary; everything else
 * (hydration normalizers, mutation helpers, shared aggregates, the catalog)
 * is real.
 */
const mockDb = { name: "fake-db" };
const mockMeta = new Map<string, string>();
const mockRows = new Map<string, Subscription>();
const mockOpen = jest.fn();
const mockFetchRates = jest.fn();
const mockStale = jest.fn();
const mockCancelAll = jest.fn();
const mockWriteFail = { key: "" as string };
jest.mock("../storage/database", () => ({
  openZenoDatabase: (...a: unknown[]) => mockOpen(...a),
  readAppMeta: jest.fn(async (_db: unknown, k: string) => mockMeta.get(k) ?? null),
  writeAppMeta: jest.fn(async (_db: unknown, k: string, v: string) => {
    if (mockWriteFail.key === k) throw new Error(`write failed: ${k}`);
    mockMeta.set(k, v);
  })
}));
jest.mock("../storage/subscription-repository", () => ({
  listSubscriptions: jest.fn(async () => [...mockRows.values()].filter((s) => !s.deletedAt)),
  upsertSubscription: jest.fn(async (_db: unknown, s: Subscription) => { mockRows.set(s.id, s); }),
  softDeleteSubscription: jest.fn(async (_db: unknown, id: string) => { mockRows.delete(id); }),
  clearAllSubscriptions: jest.fn(async () => { mockRows.clear(); })
}));
jest.mock("../fx/rates", () => ({
  fetchLatestRates: (...a: unknown[]) => mockFetchRates(...a),
  isRateTableStale: (...a: unknown[]) => mockStale(...a)
}));
jest.mock("../notifications/notificationService", () => ({ cancelAllNotifications: (...a: unknown[]) => mockCancelAll(...a) }));
let mockUuid = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => `uuid-${(mockUuid += 1)}` }));

/* eslint-disable @typescript-eslint/no-require-imports */
const store = require("./subscription-store") as typeof import("./subscription-store");
const repo = require("../storage/subscription-repository") as { upsertSubscription: jest.Mock; softDeleteSubscription: jest.Mock; clearAllSubscriptions: jest.Mock };
const dbModule = require("../storage/database") as { writeAppMeta: jest.Mock };
/* eslint-enable @typescript-eslint/no-require-imports */

const wrapper = ({ children }: { children: ReactNode }) => <store.SubscriptionStoreProvider>{children}</store.SubscriptionStoreProvider>;
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: "sub_x",
  createdAt: iso(-60),
  updatedAt: iso(-60),
  version: 1,
  name: "Zzqx",
  category: "other",
  price: { amountMinor: 1000, currency: "USD" },
  billingCycle: "monthly",
  nextRenewalDate: iso(10),
  status: "active",
  ownerProfileId: "profile_local",
  source: "manual",
  ...over
});

beforeEach(() => {
  mockMeta.clear();
  mockRows.clear();
  mockUuid = 0;
  mockWriteFail.key = "";
  mockOpen.mockReset().mockResolvedValue(mockDb);
  mockFetchRates.mockReset().mockResolvedValue(null);
  mockStale.mockReset().mockReturnValue(false);
  mockCancelAll.mockReset().mockResolvedValue(undefined);
  repo.upsertSubscription.mockClear();
  repo.softDeleteSubscription.mockClear();
  repo.clearAllSubscriptions.mockClear();
  dbModule.writeAppMeta.mockClear();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

/** Mount with an already-seeded database containing exactly `rows`. */
async function mounted(rows: Subscription[] = [], meta: Record<string, string> = {}) {
  mockMeta.clear();
  mockRows.clear();
  mockMeta.set("subscriptions.seeded.v1", "2026-01-01");
  for (const r of rows) mockRows.set(r.id, r);
  for (const [k, v] of Object.entries(meta)) mockMeta.set(k, v);
  const r = renderHook(() => store.useSubscriptionStore(), { wrapper });
  await waitFor(() => expect(r.result.current.hydrated).toBe(true));
  return r;
}

describe("hydration", () => {
  it("first launch seeds the demo subscriptions once and marks the database seeded", async () => {
    const r = renderHook(() => store.useSubscriptionStore(), { wrapper });
    await waitFor(() => expect(r.result.current.hydrated).toBe(true));
    expect(r.result.current.subscriptions.map((s) => s.id)).toEqual(expect.arrayContaining(["sub_netflix", "sub_adobe", "sub_midjourney"]));
    expect(mockMeta.has("subscriptions.seeded.v1")).toBe(true);
    expect(repo.upsertSubscription).toHaveBeenCalledTimes(5);
  });

  it("F138: a RELEASE build's first launch writes no sample rows and starts empty (and stays so)", async () => {
    const g = globalThis as { __DEV__?: boolean };
    const wasDev = g.__DEV__;
    g.__DEV__ = false;
    try {
      const r = renderHook(() => store.useSubscriptionStore(), { wrapper });
      expect(r.result.current.subscriptions).toEqual([]); // not even before storage loads
      expect(r.result.current.notificationSettings).toEqual({});
      await waitFor(() => expect(r.result.current.hydrated).toBe(true));
      expect(r.result.current.subscriptions).toEqual([]);
      expect(repo.upsertSubscription).not.toHaveBeenCalled();
      expect(mockMeta.has("subscriptions.seeded.v1")).toBe(true);
    } finally {
      g.__DEV__ = wasDev;
    }
  });

  it("an already-seeded database is loaded as-is (no re-seed)", async () => {
    const { result } = await mounted([sub({ id: "sub_only" })]);
    expect(result.current.subscriptions.map((s) => s.id)).toEqual(["sub_only"]);
    expect(repo.upsertSubscription).not.toHaveBeenCalled();
  });

  it("restores quiet hours, home currency, AI consent, cached rates and price history", async () => {
    const { result } = await mounted([sub({ id: "a" })], {
      "notification.quietHours.v1": JSON.stringify({ enabled: true, startHour: 21 }),
      "fx.homeCurrency.v1": "EUR",
      "coach.aiConsent.v1": "granted",
      "fx.rates.v1": JSON.stringify({ rates: { USD: 1, EUR: 0.5 }, fetchedAt: "2026-09-30T00:00:00.000Z" }),
      "notification.settings.v1": JSON.stringify({ a: { sevenDay: false, threeDay: true, dayOf: true } })
    });
    expect(result.current.quietHours).toEqual({ enabled: true, startHour: 21, endHour: 8 });
    expect(result.current.homeCurrency).toBe("EUR");
    expect(result.current.coachAiConsent).toBe("granted");
    expect(result.current.exchangeRatesAvailable).toBe(true);
    expect(result.current.ratesLastFetchedAt).toBe("2026-09-30T00:00:00.000Z");
    expect(result.current.fx).toEqual({ homeCurrency: "EUR", rates: { USD: 1, EUR: 0.5 } });
    expect(result.current.notificationSettings.a).toEqual({ sevenDay: false, threeDay: true, dayOf: true });
  });

  it("a database that will not open → in-memory seed data, still hydrated", async () => {
    mockOpen.mockRejectedValue(new Error("key mismatch"));
    const r = renderHook(() => store.useSubscriptionStore(), { wrapper });
    await waitFor(() => expect(r.result.current.hydrated).toBe(true));
    expect(r.result.current.subscriptions.length).toBe(5);
    expect(console.warn).toHaveBeenCalledWith("Subscription database unavailable; using in-memory data.", expect.any(Error));
  });

  it("unmounting before the database opens abandons hydration", async () => {
    let resolveOpen!: (v: unknown) => void;
    mockOpen.mockReturnValue(new Promise((res) => { resolveOpen = res; }));
    const { unmount } = renderHook(() => store.useSubscriptionStore(), { wrapper });
    unmount();
    await act(async () => { resolveOpen(mockDb); });
    expect(repo.upsertSubscription).not.toHaveBeenCalled();
  });

  it("unmounting while stored rows are being read applies nothing", async () => {
    mockMeta.set("subscriptions.seeded.v1", "x");
    const listing = jest.requireMock("../storage/subscription-repository") as { listSubscriptions: jest.Mock };
    let resolveList!: (v: unknown) => void;
    listing.listSubscriptions.mockImplementationOnce(() => new Promise((res) => { resolveList = res; }));
    const { unmount } = renderHook(() => store.useSubscriptionStore(), { wrapper });
    await waitFor(() => expect(listing.listSubscriptions).toHaveBeenCalled());
    unmount();
    await act(async () => { resolveList([]); });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("a failure after unmount is swallowed without touching state", async () => {
    let rejectOpen!: (e: unknown) => void;
    mockOpen.mockReturnValue(new Promise((_res, rej) => { rejectOpen = rej; }));
    const { unmount } = renderHook(() => store.useSubscriptionStore(), { wrapper });
    unmount();
    await act(async () => { rejectOpen(new Error("late failure")); });
    expect(console.warn).toHaveBeenCalledWith("Subscription database unavailable; using in-memory data.", expect.any(Error));
  });
});

describe("FX refresh", () => {
  it("with no cached table, fetches rates once hydrated and persists them", async () => {
    mockFetchRates.mockResolvedValue({ USD: 1, INR: 83 });
    const { result } = await mounted([sub()]);
    await waitFor(() => expect(result.current.exchangeRatesAvailable).toBe(true));
    expect(JSON.parse(mockMeta.get("fx.rates.v1")!).rates).toEqual({ USD: 1, INR: 83 });
  });

  it("a fresh cached table is not refetched; a stale one is", async () => {
    const cached = JSON.stringify({ rates: { USD: 1 }, fetchedAt: "2026-09-30T00:00:00.000Z" });
    await mounted([], { "fx.rates.v1": cached });
    expect(mockFetchRates).not.toHaveBeenCalled();
    mockStale.mockReturnValue(true);
    mockFetchRates.mockResolvedValue({ USD: 1, GBP: 0.8 });
    const { result } = await mounted([], { "fx.rates.v1": cached });
    await waitFor(() => expect(result.current.fx?.rates).toEqual({ USD: 1, GBP: 0.8 }));
  });

  it("a failed or empty fetch changes nothing; a failed persist only warns", async () => {
    const { result } = await mounted([]);
    await waitFor(() => expect(mockFetchRates).toHaveBeenCalled());
    expect(result.current.exchangeRatesAvailable).toBe(false);
    mockFetchRates.mockResolvedValue({ USD: 1 });
    mockWriteFail.key = "fx.rates.v1";
    const second = await mounted([]);
    await waitFor(() => expect(second.result.current.exchangeRatesAvailable).toBe(true));
    await waitFor(() => expect(console.warn).toHaveBeenCalledWith("Failed to persist exchange rates.", expect.any(Error)));
  });
});

describe("mutations", () => {
  it("addSubscription: random id, sensible defaults, settings + price history, persisted", async () => {
    const { result } = await mounted([]);
    let id = "";
    act(() => { id = result.current.addSubscription({ name: "Netflix", category: "entertainment", amountMinor: 1549, billingCycle: "monthly", serviceSlug: "netflix" }); });
    expect(id).toBe("sub_uuid-1");
    const added = result.current.subscriptions.find((s) => s.id === id)!;
    expect(added).toMatchObject({ price: { amountMinor: 1549, currency: "USD" }, status: "active", source: "manual", version: 1 });
    expect(result.current.notificationSettings[id]).toEqual({ sevenDay: true, threeDay: true, dayOf: true });
    expect(mockRows.get(id)?.name).toBe("Netflix");
    expect(JSON.parse(mockMeta.get("price.history.v1")!)[id]).toHaveLength(1);
    act(() => { result.current.addSubscription({ name: "Kino", category: "entertainment", amountMinor: 900, billingCycle: "monthly", currency: "EUR", source: "email" }); });
    expect(result.current.subscriptions[0]).toMatchObject({ price: { currency: "EUR" }, source: "email" });
    expect(result.current.subscriptions[0].notes).toBeUndefined();
  });

  it("addSubscription keeps a note and the reminders chosen for it (F120, F121)", async () => {
    const { result } = await mounted([]);
    let id = "";
    act(() => {
      id = result.current.addSubscription({
        name: "Gym", category: "health", amountMinor: 4000, billingCycle: "monthly",
        notes: "Family plan", notificationSettings: { sevenDay: false, threeDay: true, dayOf: false }
      });
    });
    expect(mockRows.get(id)?.notes).toBe("Family plan");
    expect(result.current.notificationSettings[id]).toEqual({ sevenDay: false, threeDay: true, dayOf: false });
    expect(JSON.parse(mockMeta.get("notification.settings.v1")!)[id]).toEqual({ sevenDay: false, threeDay: true, dayOf: false });
  });

  it("two adds in one event both land (refs, not render snapshots)", async () => {
    const { result } = await mounted([]);
    act(() => {
      result.current.addSubscription({ name: "A", category: "other", amountMinor: 1, billingCycle: "monthly" });
      result.current.addSubscription({ name: "B", category: "other", amountMinor: 2, billingCycle: "monthly" });
    });
    expect(result.current.subscriptions.map((s) => s.name)).toEqual(["B", "A"]);
  });

  it("updateSubscription applies each field, bumps the version, and records a price change once", async () => {
    const { result } = await mounted([sub({ id: "a", price: { amountMinor: 1000, currency: "USD" } })]);
    act(() => result.current.updateSubscription("a", { name: "New", amountMinor: 1200, billingCycle: "annual", notes: "n", status: "paused", category: "health", serviceSlug: "calm", nextRenewalDate: iso(20) }));
    const a = result.current.subscriptions.find((s) => s.id === "a")!;
    expect(a).toMatchObject({ name: "New", price: { amountMinor: 1200 }, billingCycle: "annual", notes: "n", status: "paused", category: "health", serviceSlug: "calm", version: 2 });
    const history = JSON.parse(mockMeta.get("price.history.v1")!).a;
    expect(history.map((h: { amountMinor: number }) => h.amountMinor)).toEqual([1000, 1200]);
    act(() => result.current.updateSubscription("a", { amountMinor: 1200 }));
    expect(JSON.parse(mockMeta.get("price.history.v1")!).a).toHaveLength(2);
    act(() => result.current.updateSubscription("a", {}));
    expect(result.current.subscriptions.find((s) => s.id === "a")).toMatchObject({ name: "New", version: 4 });
  });

  it("updating an unknown id or an unknown id's price changes nothing", async () => {
    const { result } = await mounted([sub({ id: "a" })]);
    const before = result.current.subscriptions;
    act(() => result.current.updateSubscription("missing", { amountMinor: 5, name: "x" }));
    expect(result.current.subscriptions).toEqual(before);
    expect(repo.upsertSubscription).not.toHaveBeenCalled();
  });

  it("deleteSubscription removes it, its settings, and soft-deletes the row", async () => {
    const { result } = await mounted([sub({ id: "a" }), sub({ id: "b" })]);
    act(() => result.current.deleteSubscription("a"));
    expect(result.current.subscriptions.map((s) => s.id)).toEqual(["b"]);
    expect(result.current.notificationSettings.a).toBeUndefined();
    expect(repo.softDeleteSubscription).toHaveBeenCalledWith(mockDb, "a");
  });

  it("status transitions: pause, cancel, verified-cancelled, still-charging", async () => {
    const { result } = await mounted([sub({ id: "a" })]);
    const status = () => result.current.subscriptions.find((s) => s.id === "a")!.status;
    act(() => result.current.pauseSubscription("a"));
    expect(status()).toBe("paused");
    // F160: a pause can be undone.
    act(() => result.current.resumeSubscription("a"));
    expect(status()).toBe("active");
    act(() => result.current.pauseSubscription("a"));
    act(() => result.current.markCancelled("a"));
    expect(status()).toBe("cancelled");
    // F147: a cancel records when, so history counts the plan up to that day.
    expect(result.current.subscriptions.find((s) => s.id === "a")!.cancellationRequestedAt).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
    act(() => result.current.markVerifiedCancelled("a"));
    expect(status()).toBe("cancelled");
    act(() => result.current.markStillCharging("a"));
    expect(status()).toBe("attention");
  });

  it("requestCancellation: pending, re-check at the next real renewal, or in 34 days without one", async () => {
    const { result } = await mounted([sub({ id: "dated", nextRenewalDate: iso(10) }), sub({ id: "undated", nextRenewalDate: undefined })]);
    act(() => result.current.requestCancellation("dated"));
    const dated = result.current.subscriptions.find((s) => s.id === "dated")!;
    expect(dated.status).toBe("pending");
    expect(Date.parse(dated.cancellationVerifyBy!)).toBeGreaterThan(Date.now());
    act(() => result.current.requestCancellation("undated"));
    const undated = result.current.subscriptions.find((s) => s.id === "undated")!;
    const days = (Date.parse(undated.cancellationVerifyBy!) - Date.now()) / DAY;
    expect(days).toBeGreaterThan(33.9);
    expect(days).toBeLessThan(34.1);
    act(() => result.current.requestCancellation("missing"));
    expect(result.current.subscriptions).toHaveLength(2);
  });

  it("runCancellationVerification resolves only due pending cancellations: charged → attention, not → cancelled", async () => {
    const requestedAt = iso(-40);
    const { result } = await mounted([
      sub({ id: "charged", status: "pending", cancellationRequestedAt: requestedAt, cancellationVerifyBy: iso(-1), lastChargedDate: iso(-5) }),
      sub({ id: "clean", status: "pending", cancellationRequestedAt: requestedAt, cancellationVerifyBy: iso(-1) }),
      sub({ id: "clean-old-charge", status: "pending", cancellationRequestedAt: requestedAt, cancellationVerifyBy: iso(-1), lastChargedDate: iso(-50) }),
      sub({ id: "no-request-date", status: "pending", cancellationVerifyBy: iso(-1), lastChargedDate: iso(-5) }),
      sub({ id: "not-due", status: "pending", cancellationRequestedAt: requestedAt, cancellationVerifyBy: iso(5) }),
      sub({ id: "no-verify-by", status: "pending" }),
      sub({ id: "active", status: "active" })
    ]);
    act(() => result.current.runCancellationVerification());
    const status = (id: string) => result.current.subscriptions.find((s) => s.id === id)!.status;
    expect(status("charged")).toBe("attention");
    expect(status("clean")).toBe("cancelled");
    expect(status("clean-old-charge")).toBe("cancelled");
    expect(status("no-request-date")).toBe("attention");
    expect(status("not-due")).toBe("pending");
    expect(status("no-verify-by")).toBe("pending");
    expect(status("active")).toBe("active");
  });

  it("notification settings merge and persist", async () => {
    const { result } = await mounted([sub({ id: "a" })]);
    act(() => result.current.updateNotificationSettings("a", { dayOf: false }));
    expect(result.current.notificationSettings.a).toEqual({ sevenDay: true, threeDay: true, dayOf: false });
    expect(JSON.parse(mockMeta.get("notification.settings.v1")!).a.dayOf).toBe(false);
  });

  it("F26: two quiet-hours changes in one event both land, and are persisted", async () => {
    const { result } = await mounted([]);
    act(() => {
      result.current.setQuietHours({ enabled: true });
      result.current.setQuietHours({ startHour: 23 });
    });
    expect(result.current.quietHours).toEqual({ enabled: true, startHour: 23, endHour: 8 });
    expect(JSON.parse(mockMeta.get("notification.quietHours.v1")!)).toEqual({ enabled: true, startHour: 23, endHour: 8 });
  });

  it("F124: the reminders switch starts on, persists, and is read back (only an explicit 'false' is off)", async () => {
    const { result } = await mounted([]);
    expect(result.current.remindersEnabled).toBe(true);
    act(() => result.current.setRemindersEnabled(false));
    expect(result.current.remindersEnabled).toBe(false);
    expect(mockMeta.get("notification.enabled.v1")).toBe("false");
    for (const [stored, expected] of [["false", false], ["true", true], ["garbage", true]] as const) {
      const again = await mounted([], { "notification.enabled.v1": stored });
      expect(again.result.current.remindersEnabled).toBe(expected);
    }
  });

  it("home currency and AI consent persist", async () => {
    const { result } = await mounted([]);
    act(() => result.current.setHomeCurrency("GBP"));
    act(() => result.current.setCoachAiConsent("declined"));
    expect(result.current).toMatchObject({ homeCurrency: "GBP", coachAiConsent: "declined" });
    expect(mockMeta.get("fx.homeCurrency.v1")).toBe("GBP");
    expect(mockMeta.get("coach.aiConsent.v1")).toBe("declined");
  });

  it("every failed write only warns (the in-memory change stands)", async () => {
    const { result } = await mounted([sub({ id: "a" })]);
    repo.upsertSubscription.mockRejectedValueOnce(new Error("disk"));
    repo.softDeleteSubscription.mockRejectedValueOnce(new Error("disk"));
    await act(async () => { result.current.pauseSubscription("a"); });
    const failingWrites: [string, () => void][] = [
      ["notification.settings.v1", () => result.current.updateNotificationSettings("a", { sevenDay: false })],
      ["price.history.v1", () => result.current.updateSubscription("a", { amountMinor: 4242 })],
      ["notification.quietHours.v1", () => result.current.setQuietHours({ enabled: true })],
      ["notification.enabled.v1", () => result.current.setRemindersEnabled(false)],
      ["fx.homeCurrency.v1", () => result.current.setHomeCurrency("INR")],
      ["coach.aiConsent.v1", () => result.current.setCoachAiConsent("granted")]
    ];
    for (const [metaRow, write] of failingWrites) {
      mockWriteFail.key = metaRow;
      await act(async () => { write(); });
    }
    await act(async () => { result.current.deleteSubscription("a"); });
    const messages = (console.warn as jest.Mock).mock.calls.map((c) => c[0]);
    for (const m of ["Failed to persist subscription.", "Failed to persist notification settings.", "Failed to persist price history.", "Failed to persist quiet hours.", "Failed to persist the reminders switch.", "Failed to persist home currency.", "Failed to persist AI-coach consent.", "Failed to delete subscription."]) {
      expect(messages).toContain(m);
    }
  });
});

describe("with no database (it failed to open)", () => {
  it("every mutation still works in memory and nothing is written anywhere", async () => {
    mockOpen.mockRejectedValue(new Error("key mismatch"));
    mockFetchRates.mockResolvedValue({ USD: 1, EUR: 0.9 });
    const { result } = renderHook(() => store.useSubscriptionStore(), { wrapper });
    await waitFor(() => expect(result.current.exchangeRatesAvailable).toBe(true));
    act(() => { result.current.addSubscription({ name: "A", category: "other", amountMinor: 100, billingCycle: "monthly" }); });
    act(() => result.current.updateSubscription("sub_netflix", { amountMinor: 99_999 }));
    act(() => result.current.updateNotificationSettings("sub_netflix", { dayOf: false }));
    act(() => result.current.setQuietHours({ enabled: true }));
    act(() => result.current.setRemindersEnabled(false));
    act(() => result.current.setHomeCurrency("EUR"));
    act(() => result.current.setCoachAiConsent("granted"));
    act(() => result.current.deleteSubscription("sub_adobe"));
    expect(result.current.subscriptions.find((s) => s.id === "sub_netflix")?.price.amountMinor).toBe(99_999);
    expect(result.current.subscriptions.some((s) => s.id === "sub_adobe")).toBe(false);
    expect(result.current).toMatchObject({ homeCurrency: "EUR", coachAiConsent: "granted", quietHours: { enabled: true }, remindersEnabled: false });
    await act(async () => { await result.current.clearAllData(); });
    expect(result.current.subscriptions).toEqual([]);
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
    expect(dbModule.writeAppMeta).not.toHaveBeenCalled();
    expect(repo.upsertSubscription).not.toHaveBeenCalled();
    expect(repo.softDeleteSubscription).not.toHaveBeenCalled();
    expect(repo.clearAllSubscriptions).not.toHaveBeenCalled();
  });
});

describe("clearAllData", () => {
  it("empties everything in memory and on disk, resets consent and preferences, and cancels every notification", async () => {
    const { result } = await mounted([sub({ id: "a" })], {
      "coach.aiConsent.v1": "granted",
      "notification.quietHours.v1": JSON.stringify({ enabled: true, startHour: 21, endHour: 7 }),
      "fx.homeCurrency.v1": "INR",
      "notification.enabled.v1": "false"
    });
    expect(result.current).toMatchObject({ homeCurrency: "INR", quietHours: { enabled: true }, remindersEnabled: false });
    await act(async () => { await result.current.clearAllData(); });
    expect(result.current.remindersEnabled).toBe(true);
    expect(mockMeta.get("notification.enabled.v1")).toBe("true");
    expect(result.current.homeCurrency).toBe("USD");
    expect(result.current.quietHours).toEqual({ enabled: false, startHour: 22, endHour: 8 });
    expect(mockMeta.get("fx.homeCurrency.v1")).toBe("USD");
    expect(JSON.parse(mockMeta.get("notification.quietHours.v1")!)).toEqual({ enabled: false, startHour: 22, endHour: 8 });
    // A quiet-hours change right after the wipe merges into the defaults, not the old value.
    act(() => result.current.setQuietHours({ startHour: 23 }));
    expect(result.current.quietHours).toEqual({ enabled: false, startHour: 23, endHour: 8 });
    expect(result.current.subscriptions).toEqual([]);
    expect(result.current.notificationSettings).toEqual({});
    expect(result.current.coachAiConsent).toBe("unset");
    expect(repo.clearAllSubscriptions).toHaveBeenCalledWith(mockDb);
    expect(mockMeta.get("price.history.v1")).toBe("{}");
    expect(mockMeta.get("notification.settings.v1")).toBe("{}");
    expect(mockMeta.get("coach.aiConsent.v1")).toBe("unset");
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });

  it("F27: attempts every step, then REJECTS naming exactly what could not be cleared", async () => {
    const { result } = await mounted([sub({ id: "a" })]);
    repo.clearAllSubscriptions.mockRejectedValueOnce(new Error("x"));
    dbModule.writeAppMeta
      .mockRejectedValueOnce(new Error("x")) // price history
      .mockRejectedValueOnce(new Error("x")) // notification settings
      .mockRejectedValueOnce(new Error("x")) // AI-coach consent
      .mockRejectedValueOnce(new Error("x")) // quiet hours
      .mockRejectedValueOnce(new Error("x")) // reminders switch (F124)
      .mockRejectedValueOnce(new Error("x")); // home currency
    mockCancelAll.mockRejectedValueOnce(new Error("x"));
    let rejected: unknown;
    await act(async () => { await result.current.clearAllData().catch((e: unknown) => { rejected = e; }); });
    expect(rejected).toEqual(new Error("Could not clear: subscriptions, price history, notification settings, AI-coach consent, quiet hours, reminders switch, home currency, scheduled notifications"));
    const messages = (console.warn as jest.Mock).mock.calls.map((c) => c[0]);
    for (const m of ["subscriptions", "price history", "notification settings", "AI-coach consent", "quiet hours", "reminders switch", "home currency", "scheduled notifications"]) {
      expect(messages).toContain(`Failed to clear ${m}.`);
    }
    expect(result.current.subscriptions).toEqual([]);
  });

  it("one failing step still rejects, and every other step still ran", async () => {
    const { result } = await mounted([sub({ id: "a" })]);
    mockCancelAll.mockRejectedValueOnce(new Error("x"));
    let rejected: unknown;
    await act(async () => { await result.current.clearAllData().catch((e: unknown) => { rejected = e; }); });
    expect(rejected).toEqual(new Error("Could not clear: scheduled notifications"));
    expect(repo.clearAllSubscriptions).toHaveBeenCalledTimes(1);
    expect(mockMeta.get("price.history.v1")).toBe("{}");
  });
});

describe("derived values", () => {
  it("monthly total in native currency, or converted when a rate table exists", async () => {
    const a = sub({ id: "a", price: { amountMinor: 1000, currency: "USD" } });
    const b = sub({ id: "b", price: { amountMinor: 1200, currency: "USD" }, billingCycle: "annual" });
    const { result } = await mounted([a, b]);
    expect(result.current.totalMonthlyMinor).toBe(1000 + 100);
    const eur = sub({ id: "c", price: { amountMinor: 1000, currency: "EUR" } });
    const converted = await mounted([a, eur], { "fx.homeCurrency.v1": "USD", "fx.rates.v1": JSON.stringify({ rates: { USD: 1, EUR: 0.5 }, fetchedAt: "2026-09-30T00:00:00.000Z" }) });
    expect(converted.result.current.totalMonthlyMinor).toBe(1000 + 2000);
    const unknownRate = sub({ id: "d", price: { amountMinor: 999, currency: "INR" } });
    const skipping = await mounted([a, unknownRate], { "fx.rates.v1": JSON.stringify({ rates: { USD: 1 }, fetchedAt: "2026-09-30T00:00:00.000Z" }) });
    expect(skipping.result.current.totalMonthlyMinor).toBe(1000);
  });

  it("P3 gate (F157): the headline total counts what the spend summary counts; a cancelled, paused or reported-cancelled plan adds nothing", async () => {
    const rows = [
      sub({ id: "on", price: { amountMinor: 1549, currency: "USD" } }),
      sub({ id: "trial", status: "trial", price: { amountMinor: 500, currency: "USD" } }),
      sub({ id: "reported", status: "pending", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "gone", status: "cancelled", price: { amountMinor: 2000, currency: "USD" } }),
      sub({ id: "held", status: "paused", price: { amountMinor: 4000, currency: "USD" } })
    ];
    const { result } = await mounted(rows);
    expect(result.current.totalMonthlyMinor).toBe(1549 + 500);
    expect(result.current.totalMonthlyMinor).toBe(result.current.spendSummary.totalMonthlyMinor);
  });

  it("F64: before any rate table exists, other currencies are excluded and counted, never added raw", async () => {
    const usd = sub({ id: "usd", price: { amountMinor: 1000, currency: "USD" } });
    const inr = sub({ id: "inr", price: { amountMinor: 99_900, currency: "INR" } });
    const { result } = await mounted([usd, inr]); // no cached rates; the fetch returns null
    expect(result.current.exchangeRatesAvailable).toBe(false);
    expect(result.current.fx).toEqual({ homeCurrency: "USD", rates: {} });
    // Not 1000 + 99900 = "$1,009.00": the rupee plan cannot be converted yet.
    expect(result.current.totalMonthlyMinor).toBe(1000);
    expect(result.current.spendSummary.totalMonthlyMinor).toBe(1000);
    expect(result.current.spendSummary.excludedCurrencyCount).toBe(1);
  });

  it("upcoming: active, dated, not trials, soonest first, at most five", async () => {
    const rows = [
      sub({ id: "t", billingCycle: "trial", nextRenewalDate: iso(1) }),
      sub({ id: "p", status: "paused", nextRenewalDate: iso(1) }),
      sub({ id: "u", nextRenewalDate: undefined }),
      ...[6, 2, 4, 3, 5, 7].map((d) => sub({ id: `d${d}`, nextRenewalDate: iso(d) }))
    ];
    const { result } = await mounted(rows);
    expect(result.current.upcoming.map((s) => s.id)).toEqual(["d2", "d3", "d4", "d5", "d6"]);
  });

  it("an overdue active renewal is rolled forward for display (not rewritten on disk)", async () => {
    const { result } = await mounted([sub({ id: "late", nextRenewalDate: iso(-3) })]);
    const shown = result.current.subscriptions.find((s) => s.id === "late")!;
    expect(Date.parse(shown.nextRenewalDate!)).toBeGreaterThan(Date.now());
    expect(Date.parse(mockRows.get("late")!.nextRenewalDate!)).toBeLessThan(Date.now());
  });

  it("suggestions come from the catalog, capped at 8", async () => {
    const { result } = await mounted([]);
    expect(result.current.suggestions("netflix")[0]?.id).toBe("netflix");
    expect(result.current.suggestions("a").length).toBeLessThanOrEqual(8);
  });
});

describe("guards and platforms", () => {
  it("the hook throws outside its provider", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => store.useSubscriptionStore())).toThrow("useSubscriptionStore must be used inside SubscriptionStoreProvider");
  });

  it("on web: hydrated at once from the seed data, never opens a database", () => {
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { Platform } = require("react-native");
      jest.replaceProperty(Platform, "OS", "web");
      const web = require("./subscription-store") as typeof import("./subscription-store");
      const { renderHook: isoRenderHook } = require("@testing-library/react-native/pure") as typeof import("@testing-library/react-native");
      const React = require("react") as typeof import("react");
      /* eslint-enable @typescript-eslint/no-require-imports */
      const w = ({ children }: { children: ReactNode }) => React.createElement(web.SubscriptionStoreProvider, null, children);
      const { result, unmount } = isoRenderHook(() => web.useSubscriptionStore(), { wrapper: w });
      expect(result.current.hydrated).toBe(true);
      expect(result.current.subscriptions).toHaveLength(5);
      unmount();
    });
    expect(mockOpen).not.toHaveBeenCalled();
  });
});

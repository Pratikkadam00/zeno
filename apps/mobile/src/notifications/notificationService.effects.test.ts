import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Second suite for notificationService.ts (notificationService.test.ts pins the
// pure date/quiet-hours rules and the reconcile diff). This one drives the
// native side effects: push registration across platform / device / permission
// states, per-subscription scheduling, cancellation, and the reconcile against
// a FAKE pending queue that behaves like the OS's (schedule adds, cancel
// removes, get returns what is pending). Native modules are the only mocks.

const platform = vi.hoisted(() => ({ OS: "ios" as string }));
const device = vi.hoisted(() => ({ isDevice: true }));
const constants = vi.hoisted(() => ({
  expoConfig: {} as { extra?: { eas?: { projectId?: string } } } | null,
  easConfig: {} as { projectId?: string } | null
}));

vi.mock("react-native", () => ({ Platform: platform }));
vi.mock("expo-device", () => ({
  get isDevice() {
    return device.isDevice;
  }
}));
vi.mock("expo-constants", () => ({ default: constants }));
vi.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  setNotificationChannelAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  getExpoPushTokenAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn()
}));
vi.mock("expo-secure-store", () => ({
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY"
}));

const Notifications = await import("expo-notifications");
const SecureStore = await import("expo-secure-store");
const { themes } = await import("../theme/tokens");
const service = await import("./notificationService");

const N = {
  setChannel: vi.mocked(Notifications.setNotificationChannelAsync),
  getPermissions: vi.mocked(Notifications.getPermissionsAsync),
  requestPermissions: vi.mocked(Notifications.requestPermissionsAsync),
  getToken: vi.mocked(Notifications.getExpoPushTokenAsync),
  schedule: vi.mocked(Notifications.scheduleNotificationAsync),
  cancelAll: vi.mocked(Notifications.cancelAllScheduledNotificationsAsync),
  getAll: vi.mocked(Notifications.getAllScheduledNotificationsAsync),
  cancel: vi.mocked(Notifications.cancelScheduledNotificationAsync)
};
const setItem = vi.mocked(SecureStore.setItemAsync);

const GRANTED = { granted: true, status: "granted", canAskAgain: true, expires: "never" } as never;
const DENIED = { granted: false, status: "denied", canAskAgain: false, expires: "never" } as never;
const UNDETERMINED = { granted: false, status: "undetermined", canAskAgain: true, expires: "never" } as never;

// ── Fake OS pending queue ──────────────────────────────────────────────────
type Pending = { identifier: string; content: { title?: string | null; body?: string | null; data?: Record<string, unknown> }; trigger: unknown };
let queue: Pending[] = [];
let nextId = 0;

function useFakeQueue(initial: Pending[] = []): void {
  queue = initial.map((n) => ({ ...n }));
  nextId = 0;
  N.getAll.mockImplementation(async () => queue.map((n) => ({ ...n })) as never);
  N.schedule.mockImplementation(async (request) => {
    const identifier = `n${nextId++}`;
    queue.push({ identifier, content: request.content as Pending["content"], trigger: request.trigger });
    return identifier;
  });
  N.cancel.mockImplementation(async (identifier) => {
    queue = queue.filter((n) => n.identifier !== identifier);
  });
  N.cancelAll.mockImplementation(async () => {
    queue = [];
  });
}

const keysIn = (pending: Pending[]) => pending.map((n) => String(n.content.data?.key));

// A fixed "now" (2026-06-01 08:00 UTC); renewals are ISO dates relative to it.
const NOW = Date.UTC(2026, 5, 1, 8, 0, 0);
const daysFromNow = (n: number) => new Date(NOW + n * 24 * 60 * 60 * 1000).toISOString();
const ALL_ON = { sevenDay: true, threeDay: true, dayOf: true };
const sub = (id: string, days: number, extra: Partial<Parameters<typeof service.buildRenewalTriggers>[0]> = {}) => ({
  id,
  name: `Sub ${id}`,
  amount: 9.99,
  nextRenewalDate: daysFromNow(days),
  billingCycle: "monthly" as const,
  ...extra
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  platform.OS = "ios";
  device.isDevice = true;
  constants.expoConfig = { extra: { eas: { projectId: "proj-from-app-config" } } };
  constants.easConfig = {};
  for (const fn of Object.values(N)) fn.mockReset();
  setItem.mockReset();
  N.getPermissions.mockResolvedValue(GRANTED);
  N.requestPermissions.mockResolvedValue(GRANTED);
  N.getToken.mockResolvedValue({ type: "expo", data: "ExponentPushToken[test-device]" });
  useFakeQueue();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("registerForPushNotifications — platform and device gates", () => {
  it("web: unsupported, and touches no native API", async () => {
    platform.OS = "web";
    await expect(service.registerForPushNotifications()).resolves.toEqual({ ok: false, reason: "unsupported" });
    expect(N.getPermissions).not.toHaveBeenCalled();
    expect(N.setChannel).not.toHaveBeenCalled();
  });

  it("simulator/emulator: unsupported, and never prompts for permission", async () => {
    device.isDevice = false;
    await expect(service.registerForPushNotifications()).resolves.toEqual({ ok: false, reason: "unsupported" });
    expect(N.getPermissions).not.toHaveBeenCalled();
    expect(N.requestPermissions).not.toHaveBeenCalled();
  });

  it("android: creates the renewal channel (brand accent) before asking for permission", async () => {
    platform.OS = "android";
    const order: string[] = [];
    N.setChannel.mockImplementation(async () => { order.push("channel"); return null; });
    N.getPermissions.mockImplementation(async () => { order.push("permissions"); return GRANTED; });
    await service.registerForPushNotifications();
    expect(N.setChannel).toHaveBeenCalledWith("zeno-renewals", {
      name: "Renewal reminders",
      importance: 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: themes.millennial.primary
    });
    expect(order).toEqual(["channel", "permissions"]);
  });

  it("ios: no Android channel is created", async () => {
    await service.registerForPushNotifications();
    expect(N.setChannel).not.toHaveBeenCalled();
  });
});

describe("registerForPushNotifications — permission", () => {
  it("already granted: no prompt; fetches the token for the app's EAS project and keeps it device-only", async () => {
    await expect(service.registerForPushNotifications()).resolves.toEqual({ ok: true, token: "ExponentPushToken[test-device]" });
    expect(N.requestPermissions).not.toHaveBeenCalled();
    expect(N.getToken).toHaveBeenCalledWith({ projectId: "proj-from-app-config" });
    expect(setItem).toHaveBeenCalledWith("zeno_push_token", "ExponentPushToken[test-device]", {
      keychainAccessible: "WHEN_UNLOCKED_THIS_DEVICE_ONLY"
    });
  });

  it("not yet decided: prompts once, and proceeds when the user allows", async () => {
    N.getPermissions.mockResolvedValue(UNDETERMINED);
    N.requestPermissions.mockResolvedValue(GRANTED);
    await expect(service.registerForPushNotifications()).resolves.toMatchObject({ ok: true });
    expect(N.requestPermissions).toHaveBeenCalledTimes(1);
  });

  it("denied: reports 'denied', never fetches or stores a token", async () => {
    N.getPermissions.mockResolvedValue(DENIED);
    N.requestPermissions.mockResolvedValue(DENIED);
    await expect(service.registerForPushNotifications()).resolves.toEqual({ ok: false, reason: "denied" });
    expect(N.getToken).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("falls back to easConfig.projectId, then to no project id at all", async () => {
    constants.expoConfig = null;
    constants.easConfig = { projectId: "proj-from-eas" };
    await service.registerForPushNotifications();
    expect(N.getToken).toHaveBeenLastCalledWith({ projectId: "proj-from-eas" });

    constants.easConfig = null;
    await service.registerForPushNotifications();
    expect(N.getToken).toHaveBeenLastCalledWith(undefined);
  });
});

describe("registerForPushNotifications — resolves, never rejects (its caller fire-and-forgets it)", () => {
  // app/_layout.tsx calls `void registerForPushNotifications()` with no catch,
  // so any rejection here is an unhandled promise rejection (§7).

  it("the Expo token fetch failing (it is a network call) → 'failed', nothing stored", async () => {
    N.getToken.mockRejectedValue(new Error("Error encountered while fetching Expo token, expected an OK response, received: 503"));
    await expect(service.registerForPushNotifications()).resolves.toEqual({ ok: false, reason: "failed" });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("the keychain write failing → 'failed'", async () => {
    setItem.mockRejectedValue(new Error("keychain unavailable"));
    await expect(service.registerForPushNotifications()).resolves.toEqual({ ok: false, reason: "failed" });
  });

  it("the permission API or the Android channel call failing → 'failed'", async () => {
    N.getPermissions.mockRejectedValueOnce(new Error("permissions module unavailable"));
    await expect(service.registerForPushNotifications()).resolves.toEqual({ ok: false, reason: "failed" });

    platform.OS = "android";
    N.setChannel.mockRejectedValueOnce(new Error("channel"));
    await expect(service.registerForPushNotifications()).resolves.toEqual({ ok: false, reason: "failed" });
  });
});

describe("scheduleRenewalNotifications / WithPreferences — one subscription", () => {
  it("defaults to the full ladder: 7-day, 3-day and day-of at 09:00 local, as DATE triggers on the renewal channel", async () => {
    const s = sub("a", 20);
    await service.scheduleRenewalNotifications(s);
    expect(queue).toHaveLength(3);
    const actions = queue.map((n) => n.content.data?.action);
    expect(actions).toEqual(["view", "cancel", "confirm"]);
    for (const n of queue) {
      const trigger = n.trigger as { type: string; date: Date; channelId: string };
      expect(trigger.type).toBe("date");
      expect(trigger.channelId).toBe("zeno-renewals");
      expect(trigger.date.getHours()).toBe(9);
      expect(n.content.data?.subscriptionId).toBe("a");
      // The reconcile's natural key: subscription | action | fire time to the minute.
      expect(n.content.data?.key).toBe(`a|${String(n.content.data?.action)}|${trigger.date.toISOString().slice(0, 16)}`);
    }
    expect(queue[0]?.content.title).toBe("Sub a renews in 7 days");
    expect(queue[0]?.content.body).toBe("$9.99 · Tap to review");
  });

  it("replaces only THAT subscription's pending reminders", async () => {
    useFakeQueue([
      { identifier: "old-a", content: { data: { subscriptionId: "a", action: "view" } }, trigger: {} },
      { identifier: "other-b", content: { data: { subscriptionId: "b", action: "view" } }, trigger: {} },
      { identifier: "no-data", content: {}, trigger: {} }
    ]);
    await service.scheduleRenewalNotificationsWithPreferences(sub("a", 20), { sevenDay: false, threeDay: false, dayOf: true });
    const ids = queue.map((n) => n.identifier);
    expect(ids).toContain("other-b");
    expect(ids).toContain("no-data");
    expect(ids).not.toContain("old-a");
    // Only the enabled day-of reminder was scheduled for "a".
    expect(queue.filter((n) => n.content.data?.subscriptionId === "a").map((n) => n.content.data?.action)).toEqual(["confirm"]);
  });

  it("applies quiet hours: a 08:00-10:00 window moves the 09:00 reminders to 10:00", async () => {
    await service.scheduleRenewalNotificationsWithPreferences(sub("q", 20), ALL_ON, { enabled: true, startHour: 8, endHour: 10 });
    expect(queue).toHaveLength(3);
    for (const n of queue) {
      expect((n.trigger as { date: Date }).date.getHours()).toBe(10);
    }
  });

  it("skips reminders whose time has already passed (renewal in 2 days → day-of only)", async () => {
    await service.scheduleRenewalNotifications(sub("soon", 2));
    expect(queue.map((n) => n.content.data?.action)).toEqual(["confirm"]);
  });

  it("schedules nothing for an unparseable renewal date (but still clears that subscription's old ones)", async () => {
    useFakeQueue([{ identifier: "old-x", content: { data: { subscriptionId: "x" } }, trigger: {} }]);
    await service.scheduleRenewalNotifications({ id: "x", name: "X", amount: 1, nextRenewalDate: "not a date" });
    expect(queue).toEqual([]);
  });
});

describe("buildRenewalTriggers — copy and ladder variants", () => {
  it("free trials get the 2-day / 1-day / day-of 'cancel before you're charged' ladder", () => {
    const triggers = service.buildRenewalTriggers(sub("t", 20, { isTrial: true }), ALL_ON, undefined, NOW);
    expect(triggers.map((t) => t.title)).toEqual([
      "⚠️ Sub t free trial ends in 2 days",
      "⏰ Sub t free trial ends tomorrow",
      "Sub t free trial ends today"
    ]);
    expect(triggers.map((t) => t.action)).toEqual(["cancel", "cancel", "cancel"]);
    expect(triggers[0]?.body).toBe("Cancel before you're charged $9.99");
  });

  it("trial reminders follow the same three preference switches, in ladder order", () => {
    const onlyFirst = service.buildRenewalTriggers(sub("t", 20, { isTrial: true }), { sevenDay: true, threeDay: false, dayOf: false }, undefined, NOW);
    expect(onlyFirst.map((t) => t.title)).toEqual(["⚠️ Sub t free trial ends in 2 days"]);
  });

  it("formats the amount in the subscription's own currency", () => {
    const [first] = service.buildRenewalTriggers(sub("e", 20, { amount: 12.5, currency: "EUR" }), ALL_ON, undefined, NOW);
    expect(first?.body).toBe("€12.50 · Tap to review");
  });

  it("returns no triggers when every reminder is switched off", () => {
    expect(service.buildRenewalTriggers(sub("off", 20), { sevenDay: false, threeDay: false, dayOf: false }, undefined, NOW)).toEqual([]);
  });

  it("defaults 'now' to the current time", () => {
    // Fake clock at NOW: a renewal 2 days out keeps only its day-of reminder.
    expect(service.buildRenewalTriggers(sub("n", 2), ALL_ON).map((t) => t.action)).toEqual(["confirm"]);
  });
});

describe("cancelAllNotifications / cancelNotificationsForSubscription", () => {
  it("cancelAllNotifications clears every pending notification", async () => {
    useFakeQueue([{ identifier: "x", content: {}, trigger: {} }]);
    await service.cancelAllNotifications();
    expect(N.cancelAll).toHaveBeenCalledTimes(1);
    expect(queue).toEqual([]);
  });

  it("cancelNotificationsForSubscription cancels only that subscription's reminders", async () => {
    useFakeQueue([
      { identifier: "a1", content: { data: { subscriptionId: "a" } }, trigger: {} },
      { identifier: "a2", content: { data: { subscriptionId: "a" } }, trigger: {} },
      { identifier: "b1", content: { data: { subscriptionId: "b" } }, trigger: {} },
      { identifier: "bare", content: {}, trigger: {} }
    ]);
    await service.cancelNotificationsForSubscription("a");
    expect(queue.map((n) => n.identifier)).toEqual(["b1", "bare"]);
  });
});

describe("rescheduleAllNotifications — inputs", () => {
  it("skips subscriptions whose renewal is unparseable or already past", async () => {
    await service.rescheduleAllNotifications([
      sub("past", -1),
      { id: "bad", name: "Bad", amount: 1, nextRenewalDate: "" },
      sub("ok", 20)
    ]);
    expect(new Set(queue.map((n) => n.content.data?.subscriptionId))).toEqual(new Set(["ok"]));
  });

  it("uses each subscription's own preferences, defaulting to all on", async () => {
    await service.rescheduleAllNotifications([sub("custom", 20), sub("default", 21)], {
      custom: { sevenDay: false, threeDay: false, dayOf: true }
    });
    const actionsFor = (id: string) => queue.filter((n) => n.content.data?.subscriptionId === id).map((n) => n.content.data?.action);
    expect(actionsFor("custom")).toEqual(["confirm"]);
    expect(actionsFor("default")).toEqual(["view", "cancel", "confirm"]);
  });

  it("applies quiet hours to every reminder it schedules", async () => {
    await service.rescheduleAllNotifications([sub("q", 20)], {}, { enabled: true, startHour: 8, endHour: 10 });
    expect(queue.map((n) => (n.trigger as { date: Date }).date.getHours())).toEqual([10, 10, 10]);
  });

  it("cancels a pending notification whose key is not a string", async () => {
    useFakeQueue([{ identifier: "odd", content: { data: { subscriptionId: "q", key: 42 } }, trigger: {} }]);
    await service.rescheduleAllNotifications([]);
    expect(queue).toEqual([]);
  });
});

describe("rescheduleAllNotifications — never leaves duplicate reminders", () => {
  it("cancels the extra copies when the same reminder is pending twice", async () => {
    // Build the exact pending set one reconcile produces, then present it twice.
    await service.rescheduleAllNotifications([sub("d", 20)]);
    const once = queue.map((n) => ({ ...n }));
    expect(once).toHaveLength(3);
    const twice = [...once, ...once.map((n) => ({ ...n, identifier: `dup-${n.identifier}` }))];
    useFakeQueue(twice);
    N.schedule.mockClear();

    await service.rescheduleAllNotifications([sub("d", 20)]);

    expect(queue).toHaveLength(3);
    expect(new Set(keysIn(queue)).size).toBe(3);
    // The first copy of each is kept untouched; only the extras are cancelled.
    expect(queue.map((n) => n.identifier)).toEqual(once.map((n) => n.identifier));
    expect(N.schedule).not.toHaveBeenCalled();
  });

  it("two overlapping reconciles (debounced data change + app foreground) schedule each reminder once", async () => {
    // app/_layout.tsx starts reconciles from two independent places and voids
    // both. Run two at once against an empty queue.
    const subs = [sub("o1", 20), sub("o2", 25)];
    await Promise.all([service.rescheduleAllNotifications(subs), service.rescheduleAllNotifications(subs)]);
    expect(queue).toHaveLength(6);
    expect(new Set(keysIn(queue)).size).toBe(6);
  });

  it("a failed reconcile does not block the next one", async () => {
    N.getAll.mockRejectedValueOnce(new Error("native module busy"));
    const failed = service.rescheduleAllNotifications([sub("f", 20)]);
    const next = service.rescheduleAllNotifications([sub("f", 20)]);
    await expect(failed).rejects.toThrow("native module busy");
    await expect(next).resolves.toBeUndefined();
    expect(queue).toHaveLength(3);
  });
});

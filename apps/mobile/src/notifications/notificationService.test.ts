import { describe, expect, it, vi } from "vitest";

// notificationService.ts imports several native modules purely for their
// side-effecting APIs (push tokens, scheduling) that shiftOutOfQuietHours and
// getNineAmTriggerDate never touch. None of those modules parse under Vitest's
// Node environment (react-native itself uses Flow syntax), so they're stubbed
// just enough for the module to load.
vi.mock("expo-constants", () => ({ default: { expoConfig: {}, easConfig: {} } }));
vi.mock("expo-device", () => ({ isDevice: true }));
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
vi.mock("expo-secure-store", () => ({ setItemAsync: vi.fn(), WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY" }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const Notifications = await import("expo-notifications");
const { getNineAmTriggerDate, shiftOutOfQuietHours, buildRenewalTriggers, rescheduleAllNotifications } = await import("./notificationService");

const ALL_ON = { sevenDay: true, threeDay: true, dayOf: true };
// A fixed "now" with renewals far enough out that every ladder entry is future.
const NOW = Date.UTC(2026, 5, 1, 8, 0, 0);
const daysFromNow = (n: number) => new Date(NOW + n * 24 * 60 * 60 * 1000).toISOString();

describe("buildRenewalTriggers — weekly ladder (P1.6)", () => {
  it("returns only the day-of reminder for a weekly subscription", () => {
    const triggers = buildRenewalTriggers(
      { id: "w", name: "Weekly", amount: 5, nextRenewalDate: daysFromNow(10), billingCycle: "weekly" },
      ALL_ON,
      undefined,
      NOW
    );
    expect(triggers).toHaveLength(1);
    expect(triggers[0]?.title).toContain("charged today");
  });

  it("keeps the full 3-reminder ladder for a monthly subscription", () => {
    const triggers = buildRenewalTriggers(
      { id: "m", name: "Monthly", amount: 5, nextRenewalDate: daysFromNow(10), billingCycle: "monthly" },
      ALL_ON,
      undefined,
      NOW
    );
    expect(triggers).toHaveLength(3);
  });
});

describe("buildRenewalTriggers — day-of fires ON the renewal day (P1.5)", () => {
  it("fires the day-of at 9 AM local on the renewal's calendar day for a date-only (UTC-midnight) renewal", () => {
    // Regression: an earlier clamp compared the 9-AM-local instant against the
    // UTC-midnight renewal and dragged the reminder to the previous evening.
    const triggers = buildRenewalTriggers(
      { id: "d", name: "DateOnly", amount: 9.99, nextRenewalDate: "2026-06-20T00:00:00.000Z", billingCycle: "monthly" },
      ALL_ON,
      undefined,
      NOW
    );
    const dayOf = triggers.find((t) => t.title.includes("charged today"));
    expect(dayOf).toBeDefined();
    expect(dayOf!.fireAt.getDate()).toBe(20); // the renewal day, not the 19th
    expect(dayOf!.fireAt.getHours()).toBe(9);
  });

  it("keeps the day-of on the renewal day even when a wrapping quiet window would roll it to the next day", () => {
    // Quiet 08:00→06:00 (awake only 06:00-08:00) puts 9 AM in the late-night
    // portion, which shiftOutOfQuietHours would push to the next day's 06:00.
    const triggers = buildRenewalTriggers(
      { id: "q", name: "Quiet", amount: 5, nextRenewalDate: "2026-06-20T00:00:00.000Z", billingCycle: "monthly" },
      ALL_ON,
      { enabled: true, startHour: 8, endHour: 6 },
      NOW
    );
    const dayOf = triggers.find((t) => t.title.includes("charged today"));
    expect(dayOf).toBeDefined();
    expect(dayOf!.fireAt.getDate()).toBe(20); // clamped back to the renewal day
  });
});

describe("rescheduleAllNotifications — global iOS cap (P1.10)", () => {
  it("schedules at most 55 notifications, keeping the soonest, on a fresh queue", async () => {
    vi.mocked(Notifications.scheduleNotificationAsync).mockClear();
    vi.mocked(Notifications.cancelScheduledNotificationAsync).mockClear();
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);

    // 30 subs × 3 reminders = 90 future candidates (renewals spaced 30+ days
    // out so all ladder entries are future). The cap must keep 55, not 90.
    const subs = Array.from({ length: 30 }, (_, i) => ({
      id: `s${i}`,
      name: `Sub ${i}`,
      amount: 10,
      nextRenewalDate: daysFromNow(30 + i),
      billingCycle: "monthly" as const
    }));

    // Pin Date.now so "future" is evaluated against NOW.
    const spy = vi.spyOn(Date, "now").mockReturnValue(NOW);
    await rescheduleAllNotifications(subs);
    spy.mockRestore();

    // Nothing pending → nothing to cancel; exactly the nearest 55 scheduled.
    expect(vi.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls.length).toBe(0);
    expect(vi.mocked(Notifications.scheduleNotificationAsync).mock.calls.length).toBe(55);
  });

  it("migrates keyless pre-upgrade notifications: cancels every un-keyed pending one and reschedules with keys (P5.4)", async () => {
    // Before the content.data.key was introduced, scheduled reminders carried
    // only { subscriptionId, action }. On the first reschedule after upgrade the
    // reconcile can't match them (no key), so it must cancel ALL of them and
    // re-create the desired set WITH keys — a one-time migration, not a
    // permanent churn (the identical-set test above proves it settles after).
    const sub = { id: "s0", name: "Sub", amount: 10, nextRenewalDate: daysFromNow(30), billingCycle: "monthly" as const };
    const keyless = ["old-7d", "old-3d", "old-day"].map((id, i) => ({
      identifier: id,
      content: { data: { subscriptionId: "s0", action: ["view", "cancel", "confirm"][i] } }, // NO key
      trigger: {}
    }));

    vi.mocked(Notifications.scheduleNotificationAsync).mockClear();
    vi.mocked(Notifications.cancelScheduledNotificationAsync).mockClear();
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue(keyless as never);
    const spy = vi.spyOn(Date, "now").mockReturnValue(NOW);
    await rescheduleAllNotifications([sub]);
    spy.mockRestore();

    // Every keyless notification cancelled (by its identifier)...
    const cancelled = vi.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls.map(([id]) => id);
    expect(cancelled.sort()).toEqual(["old-3d", "old-7d", "old-day"]);
    // ...and the full monthly ladder re-scheduled, each now carrying a key.
    const scheduled = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
    expect(scheduled).toHaveLength(3);
    for (const [request] of scheduled) {
      expect(typeof (request.content.data as { key?: string })?.key).toBe("string");
    }
  });

  it("does zero native writes when the desired set already matches what's pending (P4.1 diff)", async () => {
    const subs = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i}`,
      name: `Sub ${i}`,
      amount: 10,
      nextRenewalDate: daysFromNow(30 + i),
      billingCycle: "monthly" as const
    }));

    // First pass against an empty queue: capture exactly what got scheduled,
    // including the content.data.key the diff will match on next time.
    vi.mocked(Notifications.scheduleNotificationAsync).mockClear();
    vi.mocked(Notifications.cancelScheduledNotificationAsync).mockClear();
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
    const spy = vi.spyOn(Date, "now").mockReturnValue(NOW);
    await rescheduleAllNotifications(subs);

    const scheduled = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([request], index) => ({
      identifier: `n${index}`,
      content: request.content,
      trigger: request.trigger
    }));
    expect(scheduled.length).toBeGreaterThan(0);

    // Second pass with the OS now reporting those exact notifications as pending
    // and identical inputs → the reconcile must schedule nothing and cancel nothing.
    vi.mocked(Notifications.scheduleNotificationAsync).mockClear();
    vi.mocked(Notifications.cancelScheduledNotificationAsync).mockClear();
    vi.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue(scheduled as never);
    await rescheduleAllNotifications(subs);
    spy.mockRestore();

    expect(vi.mocked(Notifications.scheduleNotificationAsync).mock.calls.length).toBe(0);
    expect(vi.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls.length).toBe(0);
  });
});

describe("shiftOutOfQuietHours", () => {
  it("returns the date unchanged when quiet hours are disabled or unset", () => {
    const date = new Date(2026, 5, 15, 23, 0, 0, 0);
    expect(shiftOutOfQuietHours(date)).toBe(date);
    expect(shiftOutOfQuietHours(date, { enabled: false, startHour: 22, endHour: 8 })).toBe(date);
  });

  it("treats an equal start/end hour as a no-op window", () => {
    const date = new Date(2026, 5, 15, 23, 0, 0, 0);
    expect(shiftOutOfQuietHours(date, { enabled: true, startHour: 9, endHour: 9 })).toBe(date);
  });

  it("non-wrapping window: shifts a time inside the window to the window's end, same day", () => {
    const date = new Date(2026, 5, 15, 12, 30, 0, 0); // inside 9-17
    const shifted = shiftOutOfQuietHours(date, { enabled: true, startHour: 9, endHour: 17 });
    expect(shifted.getDate()).toBe(15);
    expect(shifted.getHours()).toBe(17);
    expect(shifted.getMinutes()).toBe(0);
  });

  it("non-wrapping window: leaves a time outside the window untouched", () => {
    const date = new Date(2026, 5, 15, 18, 0, 0, 0); // after 9-17 window
    expect(shiftOutOfQuietHours(date, { enabled: true, startHour: 9, endHour: 17 })).toBe(date);
  });

  it("non-wrapping window: the end hour itself is exclusive (not shifted)", () => {
    const date = new Date(2026, 5, 15, 17, 0, 0, 0); // exactly the end hour
    expect(shiftOutOfQuietHours(date, { enabled: true, startHour: 9, endHour: 17 })).toBe(date);
  });

  it("wrapping window (e.g. 22:00-08:00): late-night portion shifts to the end hour on the NEXT day", () => {
    const date = new Date(2026, 5, 15, 23, 30, 0, 0); // 23:30, in the late-night part of 22-8
    const shifted = shiftOutOfQuietHours(date, { enabled: true, startHour: 22, endHour: 8 });
    expect(shifted.getDate()).toBe(16); // bumped to the next day
    expect(shifted.getHours()).toBe(8);
  });

  it("wrapping window: early-morning portion shifts to the end hour the SAME day (no bump)", () => {
    const date = new Date(2026, 5, 15, 3, 0, 0, 0); // 03:00, in the early-morning part of 22-8
    const shifted = shiftOutOfQuietHours(date, { enabled: true, startHour: 22, endHour: 8 });
    expect(shifted.getDate()).toBe(15); // same day
    expect(shifted.getHours()).toBe(8);
  });

  it("wrapping window: the start hour is inclusive and the end hour is exclusive", () => {
    const atStart = new Date(2026, 5, 15, 22, 0, 0, 0);
    expect(shiftOutOfQuietHours(atStart, { enabled: true, startHour: 22, endHour: 8 }).getHours()).toBe(8);
    const atEnd = new Date(2026, 5, 15, 8, 0, 0, 0);
    expect(shiftOutOfQuietHours(atEnd, { enabled: true, startHour: 22, endHour: 8 })).toBe(atEnd);
  });
});

describe("getNineAmTriggerDate", () => {
  it("builds 9am local time on (renewal UTC day − daysBefore) within the same month", () => {
    const renewal = new Date(Date.UTC(2026, 5, 15)); // 2026-06-15 UTC midnight
    const trigger = getNineAmTriggerDate(renewal, 7);
    expect(trigger.getFullYear()).toBe(2026);
    expect(trigger.getMonth()).toBe(5); // June
    expect(trigger.getDate()).toBe(8);
    expect(trigger.getHours()).toBe(9);
    expect(trigger.getMinutes()).toBe(0);
  });

  it("rolls back across a month boundary (Mar 1 − 2 days = Feb 27, non-leap year)", () => {
    const renewal = new Date(Date.UTC(2026, 2, 1)); // 2026-03-01 UTC (2026 is not a leap year)
    const trigger = getNineAmTriggerDate(renewal, 2);
    expect(trigger.getFullYear()).toBe(2026);
    expect(trigger.getMonth()).toBe(1); // February
    expect(trigger.getDate()).toBe(27);
    expect(trigger.getHours()).toBe(9);
  });

  it("rolls back across a month boundary in a leap year (Mar 1 − 2 days = Feb 28, 2028)", () => {
    const renewal = new Date(Date.UTC(2028, 2, 1)); // 2028 is a leap year
    const trigger = getNineAmTriggerDate(renewal, 2);
    expect(trigger.getFullYear()).toBe(2028);
    expect(trigger.getMonth()).toBe(1); // February
    expect(trigger.getDate()).toBe(28);
  });

  it("rolls back across a year boundary (Jan 1 − 2 days = Dec 30 of the prior year)", () => {
    const renewal = new Date(Date.UTC(2027, 0, 1)); // 2027-01-01 UTC
    const trigger = getNineAmTriggerDate(renewal, 2);
    expect(trigger.getFullYear()).toBe(2026);
    expect(trigger.getMonth()).toBe(11); // December
    expect(trigger.getDate()).toBe(30);
  });
});

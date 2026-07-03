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

const { getNineAmTriggerDate, shiftOutOfQuietHours } = await import("./notificationService");

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

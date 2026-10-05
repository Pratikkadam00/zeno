import { describe, expect, it, vi } from "vitest";

// The same native-module stubs as notificationService.test.ts: only loading them.
vi.mock("expo-constants", () => ({ default: { expoConfig: {}, easConfig: {} } }));
vi.mock("expo-device", () => ({ isDevice: true }));
vi.mock("expo-notifications", () => ({ AndroidImportance: { HIGH: 4 }, SchedulableTriggerInputTypes: { DATE: "date" } }));
vi.mock("expo-secure-store", () => ({ setItemAsync: vi.fn(), deleteItemAsync: vi.fn(), WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY" }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const { buildRenewalTriggers, shiftOutOfQuietHours } = await import("./notificationService");

// P6.3: the edges of the quiet window, in the phone's own time. Start is quiet,
// end is not; a window can wrap past midnight. Stryker moved each edge by one
// and no test noticed.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 0, day, hour, minute);
const day = { enabled: true, startHour: 9, endHour: 17 };
const night = { enabled: true, startHour: 22, endHour: 7 };

describe("shiftOutOfQuietHours", () => {
  it.each([
    ["08:59, before a 09-17 window", day, at(5, 8, 59), at(5, 8, 59)],
    ["09:00, its first minute", day, at(5, 9), at(5, 17)],
    ["16:59", day, at(5, 16, 59), at(5, 17)],
    ["17:00, its end", day, at(5, 17), at(5, 17)],
    ["21:59, before a 22-07 window", night, at(5, 21, 59), at(5, 21, 59)],
    ["22:00, the late-night part: to 07:00 tomorrow", night, at(5, 22), at(6, 7)],
    ["06:59, the early-morning part: to 07:00 today", night, at(6, 6, 59), at(6, 7)],
    ["07:00, its end", night, at(6, 7), at(6, 7)]
  ])("%s", (_label, quiet, input, output) => {
    expect(shiftOutOfQuietHours(input, quiet)).toEqual(output);
  });

  it("a window that starts and ends at the same hour, or is off, changes nothing", () => {
    expect(shiftOutOfQuietHours(at(5, 3), { enabled: true, startHour: 3, endHour: 3 })).toEqual(at(5, 3));
    expect(shiftOutOfQuietHours(at(5, 23), { ...night, enabled: false })).toEqual(at(5, 23));
    expect(shiftOutOfQuietHours(at(5, 23))).toEqual(at(5, 23));
  });
});

describe("a day-of reminder and a quiet window that covers 9 AM", () => {
  it("stays at 9 AM on the renewal day; a window wrapping past midnight never moves it to the next day (after the charge)", () => {
    const sub = { id: "s", name: "Zzqx", amount: 9.99, currency: "USD", nextRenewalDate: "2026-03-20T00:00:00.000Z" };
    const [dayOf] = buildRenewalTriggers(sub, { sevenDay: false, threeDay: false, dayOf: true }, { enabled: true, startHour: 8, endHour: 6 }, Date.UTC(2026, 0, 1));
    expect(dayOf?.fireAt).toEqual(new Date(2026, 2, 20, 9, 0, 0, 0));
  });
});

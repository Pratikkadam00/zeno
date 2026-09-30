import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The device erase (F27): which steps each scope runs, in what order, that a
 * failing step never stops the rest, and that the report names exactly what
 * failed. The module-level erase helpers are faked here; each one has its own
 * tests next to its module (Gmail, widget, push token, legacy theme key).
 */
const calls: string[] = [];
const failing = new Set<string>();
const step = (name: string) => vi.fn(async () => {
  calls.push(name);
  if (failing.has(name)) throw new Error(`${name} failed`);
});
const gmail = step("gmail");
const widget = step("widget");
const pushToken = step("pushToken");
const legacyTheme = step("legacyTheme");
vi.mock("../discovery/emailScanner", () => ({ disconnectAllGmailAccounts: () => gmail() }));
vi.mock("../widgets/widgetBridge", () => ({ clearWidgetSnapshot: () => widget() }));
vi.mock("../notifications/notificationService", () => ({ clearStoredPushToken: () => pushToken() }));
vi.mock("./secure-store", () => ({ clearThemePreference: () => legacyTheme() }));

const { eraseDeviceData, eraseSteps, runEraseSteps } = await import("./erase-device");

const actions = () => ({
  clearSubscriptionData: step("subscriptions"),
  resetBudget: step("budget"),
  disableAppLock: step("appLock"),
  resetAppearance: step("appearance")
});

beforeEach(() => {
  calls.length = 0;
  failing.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("what each scope erases", () => {
  it('"data" removes every record and connection, and leaves the lock, appearance and push token alone', async () => {
    const report = await eraseDeviceData("data", actions());
    expect(calls).toEqual(["gmail", "subscriptions", "budget", "widget"]);
    expect(report).toEqual({ failed: [] });
  });

  it('"account" also removes the app lock PIN, appearance (both theme stores) and the push token', async () => {
    const report = await eraseDeviceData("account", actions());
    expect(calls).toEqual(["gmail", "subscriptions", "budget", "widget", "appLock", "appearance", "legacyTheme", "pushToken"]);
    expect(report).toEqual({ failed: [] });
  });

  it("every step has a user-facing label (the failure message lists them)", () => {
    expect(eraseSteps("account", actions()).map((s) => s.label)).toEqual([
      "connected Gmail inboxes",
      "subscriptions, price history and reminder settings",
      "budgets",
      "home-screen widget",
      "app lock PIN",
      "appearance settings",
      "appearance setting from an older version",
      "notification token"
    ]);
  });
});

describe("failures", () => {
  it("a failing step never stops the rest, and the report names exactly the failures", async () => {
    failing.add("gmail");
    failing.add("budget");
    failing.add("pushToken");
    const report = await eraseDeviceData("account", actions());
    expect(calls).toEqual(["gmail", "subscriptions", "budget", "widget", "appLock", "appearance", "legacyTheme", "pushToken"]);
    expect(report.failed).toEqual(["connected Gmail inboxes", "budgets", "notification token"]);
    expect(console.warn).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledWith("Erase step failed: budgets.", expect.any(Error));
  });

  it("a failed appearance reset does not skip the older theme key (each store is its own step)", async () => {
    failing.add("appearance");
    const report = await eraseDeviceData("account", actions());
    expect(report.failed).toEqual(["appearance settings"]);
    expect(calls).toContain("legacyTheme");
  });

  it("a step that throws synchronously is caught like a rejected one", async () => {
    const report = await runEraseSteps([
      { label: "sync throw", run: () => { throw new Error("boom"); } },
      { label: "fine", run: async () => {} }
    ]);
    expect(report.failed).toEqual(["sync throw"]);
  });

  it("no steps → nothing failed", async () => {
    expect(await runEraseSteps([])).toEqual({ failed: [] });
  });
});

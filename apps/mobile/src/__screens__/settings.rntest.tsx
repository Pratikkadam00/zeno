import { act, fireEvent, screen } from "@testing-library/react-native";
import { Alert, Linking, Share, type AlertButton } from "react-native";
import SettingsScreen from "../../app/settings";
import { fakeNotificationsModule, fakeStorage, renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8e-1: Settings (app/settings.tsx) through the real subscription, budget
 * and theme stores, the real erase flow (src/security/erase-device.ts) and the
 * real external-link allowlist. Faked: the auth and lock stores (their own
 * suites cover them), the Gmail scanner, the widget bridge, the server delete.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("@gorhom/bottom-sheet", () => ({ __esModule: true, ...jest.requireActual("@gorhom/bottom-sheet/mock") }));
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { version: "0.1.0" } } }));
jest.mock("../discovery/emailScanner", () => ({ listConnectedGmailAccounts: jest.fn(), disconnectAllGmailAccounts: jest.fn() }));
jest.mock("../widgets/widgetBridge", () => ({ clearWidgetSnapshot: jest.fn(), refreshWidgetSnapshot: jest.fn() }));
jest.mock("../security/secure-store", () => ({ clearThemePreference: jest.fn() }));
jest.mock("../api/client", () => ({ deleteAccountOnServer: jest.fn() }));
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create(() => ({ plan: "free", email: null, accountId: null, status: "authenticated", logout: jest.fn(async () => {}) })) };
});
jest.mock("../security/lock-store", () => {
  const { create } = jest.requireActual("zustand");
  return { useLockStore: create(() => ({ enabled: false, disable: jest.fn(async () => {}) })) };
});
/* eslint-disable @typescript-eslint/no-require-imports */
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { setState: (s: object) => void; getState: () => { logout: jest.Mock } } };
const { useLockStore } = require("../security/lock-store") as { useLockStore: { setState: (s: object) => void; getState: () => { disable: jest.Mock } } };
const mockGmail = require("../discovery/emailScanner") as { listConnectedGmailAccounts: jest.Mock; disconnectAllGmailAccounts: jest.Mock };
const mockWidget = require("../widgets/widgetBridge") as { clearWidgetSnapshot: jest.Mock };
const mockSecureStore = require("../security/secure-store") as { clearThemePreference: jest.Mock };
const mockDeleteAccount = (require("../api/client") as { deleteAccountOnServer: jest.Mock }).deleteAccountOnServer;
/* eslint-enable @typescript-eslint/no-require-imports */

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  alert.mockClear();
  share.mockClear();
  openURL.mockClear();
  mockGmail.listConnectedGmailAccounts.mockReset().mockResolvedValue([]);
  mockGmail.disconnectAllGmailAccounts.mockReset().mockResolvedValue(undefined);
  mockWidget.clearWidgetSnapshot.mockReset().mockResolvedValue(undefined);
  mockSecureStore.clearThemePreference.mockReset().mockResolvedValue(undefined);
  mockDeleteAccount.mockReset().mockResolvedValue(true);
  useAuthStore.setState({ plan: "free", email: "sam@example.com", accountId: "acct_9f2c", status: "authenticated", logout: jest.fn(async () => {}) });
  useLockStore.setState({ enabled: false, disable: jest.fn(async () => {}) });
});
afterEach(() => jest.useRealTimers());

const open = () => renderScreen(<SettingsScreen />, { settleMs: 500 });
const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const toggle = async (name: string, value: boolean) => {
  await act(async () => { fireEvent(screen.getByRole("switch", { name }), "valueChange", value); });
};
/** The last Alert's buttons; presses the one titled `text`. */
const answer = async (text: string) => {
  const buttons = alert.mock.calls.at(-1)![2] as AlertButton[];
  await act(async () => { buttons.find((b) => b.text === text)!.onPress?.(); });
};

describe("settings, the account", () => {
  it("F125: shows the signed-in EMAIL, never the account id; every control is named", async () => {
    const r = await open();
    expect(screen.getAllByText("sam@example.com").length).toBeGreaterThan(0);
    expect(screen.queryByText(/acct_/)).toBeNull();
    expect(screen.getAllByText("Free plan").length).toBeGreaterThan(0);
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("F125: a session without an email says 'Signed in', not a made-up address", async () => {
    useAuthStore.setState({ email: null });
    await open();
    expect(screen.getAllByText("Signed in").length).toBeGreaterThan(0);
    expect(screen.queryByText("you@example.com")).toBeNull();
  });

  it("a long email is shortened on its row", async () => {
    useAuthStore.setState({ email: "a.very.long.name@example.com" });
    await open();
    expect(screen.getByText("a.very.long.name@ex...")).toBeTruthy();
  });

  it("F126: the version is the build's own", async () => {
    await open();
    expect(screen.getByText("Zeno · Version 0.1.0")).toBeTruthy();
  });

  it("the rows go where they say", async () => {
    await open();
    await press("Profile");
    expect(routerMock.push).toHaveBeenLastCalledWith("/profile");
    await press("Plan & billing");
    expect(routerMock.push).toHaveBeenLastCalledWith("/paywall");
    await press("Go Pro");
    expect(routerMock.push).toHaveBeenLastCalledWith("/paywall");
    await press("Security");
    expect(routerMock.push).toHaveBeenLastCalledWith("/security");
    for (const [label, path] of [["Family Vault", "/family"], ["Spend Twin", "/spend-twin"], ["Widgets & Watch", "/widgets"], ["Year in Review", "/wrapped"], ["Connected inboxes", "/discover"]]) {
      await press(label);
      expect(routerMock.push).toHaveBeenLastCalledWith(path);
    }
  });

  it("Pro and Family have no Go Pro button; the app lock's state is shown", async () => {
    useAuthStore.setState({ plan: "pro" });
    useLockStore.setState({ enabled: true });
    await open();
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Go Pro" })).toBeNull();
    expect(screen.getByText("On")).toBeTruthy();
    expect(screen.getByText("App lock · PIN + biometrics")).toBeTruthy(); // F128: no "Face ID" claim
    await act(async () => { useAuthStore.setState({ plan: "family" }); });
    expect(screen.getAllByText("Family").length).toBeGreaterThan(0);
  });

  it("F29: Connected inboxes says what the device holds", async () => {
    mockGmail.listConnectedGmailAccounts.mockResolvedValue([{ address: "a@gmail.com", token: "t" }]);
    await open();
    expect(screen.getByText("1 inbox")).toBeTruthy();
  });
});

describe("settings, app and notifications", () => {
  it("Dark mode switches the theme", async () => {
    await open();
    const before = screen.getByRole("switch", { name: "Dark mode" }).props.value as boolean;
    await toggle("Dark mode", !before);
    expect(screen.getByRole("switch", { name: "Dark mode" }).props.value).toBe(!before);
  });

  it("Home currency: the sheet shows the current one, and a pick is saved", async () => {
    await open();
    expect(screen.getByText("USD ($)")).toBeTruthy();
    await press("Home currency");
    expect(screen.getAllByRole("button", { name: "USD ($)" }).at(-1)!.props.accessibilityState).toMatchObject({ selected: true });
    await press("EUR (€)");
    expect(fakeStorage.meta.get("fx.homeCurrency.v1")).toBe("EUR");
    expect(screen.getByText("EUR (€)")).toBeTruthy();
  });

  it("F124: 'Renewal reminders' really turns reminders off, and the choice is kept", async () => {
    await open();
    expect(screen.queryByText("Push notifications")).toBeNull();
    expect(screen.getByRole("switch", { name: "Renewal reminders" }).props.value).toBe(true);
    await toggle("Renewal reminders", false);
    expect(screen.getByRole("switch", { name: "Renewal reminders" }).props.value).toBe(false);
    expect(fakeStorage.meta.get("notification.enabled.v1")).toBe("false");
    await toggle("Renewal reminders", true);
    expect(fakeStorage.meta.get("notification.enabled.v1")).toBe("true");
  });

  it("F124: a saved 'off' is read back at launch", async () => {
    fakeStorage.meta.set("notification.enabled.v1", "false");
    await open();
    expect(screen.getByRole("switch", { name: "Renewal reminders" }).props.value).toBe(false);
  });

  it("quiet hours: on and off, and a window picked from the sheet turns them on", async () => {
    await open();
    expect(screen.getAllByText("Off").length).toBeGreaterThan(0);
    await toggle("Quiet hours", true);
    expect(screen.getByText("10:00 PM – 8:00 AM · reminders shift to morning")).toBeTruthy();
    await toggle("Quiet hours", false);
    await press("Quiet window");
    await press("Midnight – 9 AM");
    expect(JSON.parse(fakeStorage.meta.get("notification.quietHours.v1")!)).toEqual({ enabled: true, startHour: 0, endHour: 9 });
    expect(screen.getByText("12:00 AM – 9:00 AM · reminders shift to morning")).toBeTruthy();
  });

  it("the sheets close without changing anything", async () => {
    await open();
    await press("Quiet window");
    await press("Close");
    await press("Home currency");
    await press("Close");
    expect(fakeStorage.meta.get("fx.homeCurrency.v1")).toBeUndefined();
  });

  it("AI coaching: off by default; turning it on says what is sent", async () => {
    await open();
    expect(screen.getByText("Off · insights stay on your device")).toBeTruthy();
    await toggle("AI coaching", true);
    expect(screen.getByText("On · subscription names & amounts sent to the AI model")).toBeTruthy();
    await toggle("AI coaching", false);
    expect(screen.getByText("Off · insights stay on your device")).toBeTruthy();
  });
});

describe("settings, data and links", () => {
  it("Export shares a CSV of every subscription, notes included (F127), formula-like text neutralised", async () => {
    const base = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, ownerProfileId: "profile_local", source: "manual" } as const;
    resetFakes({ rows: [
      { ...base, id: "a", name: "=HYPERLINK(x)", category: "other", price: { amountMinor: 1549, currency: "EUR" }, billingCycle: "annual", nextRenewalDate: "2026-12-01T09:00:00.000Z", status: "active", notes: "Shared, with \"Sam\"" },
      { ...base, id: "b", name: "Gym", category: "health", price: { amountMinor: 4000, currency: "USD" }, billingCycle: "monthly", status: "paused" }
    ] });
    await open();
    expect(screen.getByText("Your subscriptions and notes, as CSV")).toBeTruthy();
    await press("Export my data");
    const csv = (share.mock.calls[0]![0] as { message: string }).message.split("\n");
    expect(csv[0]).toBe("name,amount,currency,billingCycle,nextRenewalDate,status,category,notes");
    expect(csv).toHaveLength(3);
    expect(csv).toContain(`"'=HYPERLINK(x)",15.49,EUR,annual,2026-12-01T09:00:00.000Z,active,other,"Shared, with ""Sam"""`);
    expect(csv).toContain(`"Gym",40.00,USD,monthly,,paused,health,`);
  });

  it("Delete all my data: Cancel keeps everything; Delete erases it and goes to the ledger", async () => {
    await open();
    await press("Delete all my data");
    await answer("Cancel");
    expect(fakeStorage.rows.size).toBe(5);
    await press("Delete all my data");
    await answer("Delete");
    expect(fakeStorage.rows.size).toBe(0);
    expect(mockGmail.disconnectAllGmailAccounts).toHaveBeenCalled();
    expect(fakeNotificationsModule.cancelAllNotifications).toHaveBeenCalled();
    expect(routerMock.replace).toHaveBeenCalledWith("/dashboard");
    expect(alert).toHaveBeenCalledTimes(2);
  });

  it("Delete all my data names what could not be erased", async () => {
    mockGmail.disconnectAllGmailAccounts.mockRejectedValue(new Error("offline"));
    await open();
    await press("Delete all my data");
    await answer("Delete");
    expect(alert).toHaveBeenLastCalledWith("Some data couldn't be erased", "These are still on this device: connected Gmail inboxes. Please try again.");
  });

  it("the More links open only allowed pages", async () => {
    await open();
    await press("Rate Zeno");
    expect(openURL).toHaveBeenLastCalledWith("https://apps.apple.com/");
    await press("Help & feedback");
    expect(openURL).toHaveBeenLastCalledWith(expect.stringMatching(/^mailto:feedback@/));
    await press("Privacy Policy");
    expect(openURL).toHaveBeenLastCalledWith(expect.stringMatching(/^https:\/\/.+\/legal\/privacy$/));
    await press("Terms of Service");
    expect(openURL).toHaveBeenLastCalledWith(expect.stringMatching(/^https:\/\/.+\/legal\/terms$/));
    await press("Share with friends");
    expect(share).toHaveBeenLastCalledWith(expect.objectContaining({ url: expect.stringMatching(/^https:\/\//) }));
  });
});

describe("settings, leaving", () => {
  it("Sign out asks first", async () => {
    await open();
    await press("Sign out");
    expect(alert.mock.calls.at(-1)![0]).toBe("Sign out");
    await answer("Cancel");
    expect(useAuthStore.getState().logout).not.toHaveBeenCalled();
    await press("Sign out");
    await answer("Sign out");
    expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1);
  });

  it("local-only: the exit says data is kept, and there is no account to cancel", async () => {
    useAuthStore.setState({ status: "local_only", email: null });
    await open();
    expect(screen.getAllByText("Local-only mode").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Cancel my Zeno account" })).toBeNull();
    await press("Sign out");
    expect(alert.mock.calls.at(-1)![0]).toBe("Exit local-only mode");
    await answer("Exit");
    expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1);
  });

  it("Cancel my Zeno account: the server first, then the device, then signed out", async () => {
    await open();
    await press("Cancel my Zeno account");
    await answer("Keep my account");
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    await press("Cancel my Zeno account");
    await answer("Cancel account");
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(fakeStorage.rows.size).toBe(0);
    expect(useLockStore.getState().disable).toHaveBeenCalled();
    expect(mockSecureStore.clearThemePreference).toHaveBeenCalled();
    expect(fakeNotificationsModule.clearStoredPushToken).toHaveBeenCalled();
    expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1);
  });

  it("if the server can't confirm, nothing is touched on the device", async () => {
    mockDeleteAccount.mockResolvedValue(false);
    await open();
    await press("Cancel my Zeno account");
    await answer("Cancel account");
    expect(alert).toHaveBeenLastCalledWith("Couldn't delete your account", expect.stringContaining("nothing was changed"));
    expect(fakeStorage.rows.size).toBe(5);
    expect(useAuthStore.getState().logout).not.toHaveBeenCalled();
  });

  it("deleted on the server but a local step failed: says so after signing out", async () => {
    mockWidget.clearWidgetSnapshot.mockRejectedValue(new Error("no widget"));
    await open();
    await press("Cancel my Zeno account");
    await answer("Cancel account");
    expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenLastCalledWith("Account deleted", expect.stringContaining("home-screen widget"));
  });
});

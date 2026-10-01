import { act, fireEvent, screen } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import ProfileScreen from "../../app/profile";
import { renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8e-1: Profile (app/profile.tsx). It reads only the auth and lock stores,
 * both faked here (their own suites cover them).
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create(() => ({})) };
});
jest.mock("../security/lock-store", () => {
  const { create } = jest.requireActual("zustand");
  return { useLockStore: create(() => ({})) };
});
/* eslint-disable @typescript-eslint/no-require-imports */
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { setState: (s: object) => void; getState: () => { logout: jest.Mock } } };
const { useLockStore } = require("../security/lock-store") as { useLockStore: { setState: (s: object) => void } };
/* eslint-enable @typescript-eslint/no-require-imports */

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  alert.mockClear();
  useAuthStore.setState({ plan: "free", email: "sam@example.com", accountId: "acct_9f2c", status: "authenticated", logout: jest.fn(async () => {}) });
  useLockStore.setState({ enabled: false, biometricAvailable: false });
});
afterEach(() => jest.useRealTimers());

const open = () => renderScreen(<ProfileScreen />, { settleMs: 300 });
const press = async (name: string) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const answer = async (text: string) => {
  const buttons = alert.mock.calls.at(-1)![2] as AlertButton[];
  await act(async () => { buttons.find((b) => b.text === text)!.onPress?.(); });
};

describe("profile", () => {
  it("F125: the heading is the signed-in email; the account id is shown only as the account id", async () => {
    const r = await open();
    expect(screen.getByText("sam@example.com")).toBeTruthy();
    expect(screen.getByText("ACCOUNT ID")).toBeTruthy();
    expect(screen.getByText("acct_9f2c")).toBeTruthy();
    expect(screen.getByText("Free plan")).toBeTruthy();
    expect(screen.getByText("Upgrade to Pro or Family")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("F125: no email in the session: 'Signed in', never a made-up address", async () => {
    useAuthStore.setState({ email: null, accountId: null });
    await open();
    expect(screen.getByText("Signed in")).toBeTruthy();
    expect(screen.queryByText("you@example.com")).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it.each([
    ["pro", "Pro"],
    ["family", "Family"]
  ])("%s plan: says which", async (plan, label) => {
    useAuthStore.setState({ plan });
    await open();
    expect(screen.getByText(`You're on ${label}`)).toBeTruthy();
  });

  it.each([
    [false, false, "Off"],
    [true, false, "On · PIN"],
    [true, true, "On · PIN + biometrics"]
  ])("F128: app lock %s, biometrics %s: '%s'", async (enabled, biometricAvailable, text) => {
    useLockStore.setState({ enabled, biometricAvailable });
    await open();
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByText(/Face ID/)).toBeNull();
  });

  it("the rows go to billing and security", async () => {
    await open();
    await press("Plan and billing");
    expect(routerMock.push).toHaveBeenLastCalledWith("/paywall");
    await press("Security");
    expect(routerMock.push).toHaveBeenLastCalledWith("/security");
  });

  it("Sign out asks first", async () => {
    await open();
    await press("Sign out");
    await answer("Cancel");
    expect(useAuthStore.getState().logout).not.toHaveBeenCalled();
    await press("Sign out");
    await answer("Sign out");
    expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1);
  });

  it("local-only: no account, and the exit keeps the data", async () => {
    useAuthStore.setState({ status: "local_only", email: null, accountId: null });
    await open();
    expect(screen.getByText("Local-only mode")).toBeTruthy();
    expect(screen.getByText("No account — data stays on this device")).toBeTruthy();
    await press("Exit local-only mode");
    expect(alert.mock.calls.at(-1)![0]).toBe("Exit local-only mode");
    await answer("Exit");
    expect(useAuthStore.getState().logout).toHaveBeenCalledTimes(1);
  });
});

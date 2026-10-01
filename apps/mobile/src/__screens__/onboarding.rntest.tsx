import { act, fireEvent, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import OnboardingScreen from "../../app/index";
import { renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8e-2: onboarding (app/index.tsx): three beats, skippable, ending in
 * sign-in or "continue without an account".
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create(() => ({ continueLocalOnly: jest.fn(async () => {}) })) };
});
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { getState: () => { continueLocalOnly: jest.Mock } } };
const reduceMotion = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  reduceMotion.mockResolvedValue(false);
  useAuthStore.getState().continueLocalOnly.mockClear();
});
afterEach(() => jest.useRealTimers());

const open = () => renderScreen(<OnboardingScreen />, { settleMs: 1500 });
const press = async (name: string) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};

describe("onboarding", () => {
  it("beat 1: the sample ledger, its total computed from its rows, labelled as a sample; every control is named", async () => {
    const r = await open();
    expect(screen.getByText(/^Every subscription\./)).toBeTruthy();
    for (const value of ["$15.99", "$10.99", "$20.00", "$2.99", "$12.00"]) expect(screen.getByText(value)).toBeTruthy();
    expect(screen.getByText("$61.97 /mo")).toBeTruthy(); // 1599 + 1099 + 2000 + 299 + 1200
    expect(screen.getByText("Sample figures — your ledger starts empty.")).toBeTruthy();
    expect(screen.getByLabelText("Step 1 of 3")).toBeTruthy();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });

  it("Continue walks the beats: no bank login, then the warnings; the last offers sign-in", async () => {
    await open();
    await press("Continue");
    expect(screen.getByText("No bank login required.")).toBeTruthy();
    expect(screen.getByLabelText("Step 2 of 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue without an account" })).toBeNull();
    await press("Continue");
    expect(screen.getByText("Warned before every charge.")).toBeTruthy();
    expect(screen.getByLabelText("Step 3 of 3")).toBeTruthy();
    await press("Sign in");
    expect(routerMock.push).toHaveBeenCalledWith("/login");
  });

  it("Continue without an account chooses local-only, then opens the ledger", async () => {
    await open();
    await press("Continue");
    await press("Continue");
    await press("Continue without an account");
    expect(useAuthStore.getState().continueLocalOnly).toHaveBeenCalledTimes(1);
    expect(routerMock.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("Skip goes straight to sign-in", async () => {
    await open();
    await press("Skip onboarding");
    expect(routerMock.push).toHaveBeenCalledWith("/login");
  });

  it("with reduced motion the ledger appears without the print-in", async () => {
    reduceMotion.mockResolvedValue(true);
    await open();
    expect(screen.getByText("$61.97 /mo")).toBeTruthy();
  });
});

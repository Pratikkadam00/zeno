import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ZenoThemeProvider } from "../theme/theme-provider";
import SecurityScreen from "../../app/security";

/**
 * Settings → App lock (app/security.tsx). Lives under src/ because every file
 * in app/ is an expo-router route.
 *
 * F98: turning the lock OFF checks the PIN through the lock store's counted
 * tryPin (the same 10 attempts and lockout as the lock screen), never an
 * uncounted check, and a keychain failure fails closed.
 *
 * The lock store is a real zustand store with test-controlled state; tryPin's
 * own counting and lockout are covered in lock-store.test.ts.
 */
jest.mock("./lock-store", () => {
  const { create } = jest.requireActual("zustand");
  return { useLockStore: create(() => ({})) };
});
// The screen must not check the PIN itself. This stand-in (a wrong PIN) exists
// so that if it ever does again, it loads and the tests fail on the BEHAVIOUR
// (no counted attempt), not on the native crypto import.
jest.mock("./app-lock", () => ({ verifyPin: jest.fn().mockResolvedValue(false) }));
const mockBack = jest.fn();
jest.mock("expo-router", () => ({ router: { back: () => mockBack() } }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { useLockStore } = require("./lock-store") as { useLockStore: { setState: (s: object) => void } };

const tryPin = jest.fn();
const disable = jest.fn();
const enableWithPin = jest.fn();

beforeEach(() => {
  mockBack.mockReset();
  tryPin.mockReset().mockResolvedValue({ ok: true });
  disable.mockReset().mockResolvedValue(undefined);
  enableWithPin.mockReset().mockResolvedValue(undefined);
  useLockStore.setState({ enabled: true, biometricAvailable: false, tryPin, disable, enableWithPin });
});

async function shown(state: object = {}) {
  useLockStore.setState(state);
  const r = render(<ZenoThemeProvider><SecurityScreen /></ZenoThemeProvider>);
  await act(async () => {}); // theme provider's storage reads
  return r;
}
const press = async (label: string) => { await act(async () => { fireEvent.press(screen.getByLabelText(label)); }); };
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

describe("turning the lock off (F98)", () => {
  it("a wrong PIN goes through the COUNTED check: its message (attempts left) is shown, the field cleared, nothing disabled", async () => {
    tryPin.mockResolvedValue({ ok: false, error: "Incorrect PIN. 9 attempts left." });
    await shown();
    type("Current PIN", "0000");
    await press("Turn off app lock");
    expect(tryPin).toHaveBeenCalledWith("0000");
    expect(screen.getByText("Incorrect PIN. 9 attempts left.")).toBeTruthy();
    expect(screen.getByLabelText("Current PIN").props.value).toBe("");
    expect(disable).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("during a lockout the store's refusal is what the user sees", async () => {
    tryPin.mockResolvedValue({ ok: false, error: "Too many attempts. Try again later." });
    await shown();
    type("Current PIN", "1357");
    await press("Turn off app lock");
    expect(screen.getByText("Too many attempts. Try again later.")).toBeTruthy();
    expect(disable).not.toHaveBeenCalled();
  });

  it("a refusal without a message still says the PIN was wrong", async () => {
    tryPin.mockResolvedValue({ ok: false });
    await shown();
    type("Current PIN", "0000");
    await press("Turn off app lock");
    expect(screen.getByText("Incorrect PIN.")).toBeTruthy();
  });

  it("the right PIN turns the lock off and leaves the screen", async () => {
    await shown();
    type("Current PIN", "1357");
    await press("Turn off app lock");
    expect(tryPin).toHaveBeenCalledWith("1357");
    expect(disable).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("a keychain failure fails CLOSED: the lock stays on, the user is told, and the screen is usable again", async () => {
    tryPin.mockRejectedValue(new Error("keychain unavailable"));
    await shown();
    type("Current PIN", "1357");
    await press("Turn off app lock");
    expect(disable).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByText("Couldn't reach secure storage. Try again.")).toBeTruthy();
    expect(screen.getByLabelText("Current PIN").props.editable).toBe(true);
  });

  it("only digits reach the check, at most 8", async () => {
    await shown();
    type("Current PIN", "1a2b3c4d5678999");
    expect(screen.getByLabelText("Current PIN").props.value).toBe("12345678");
  });
});

describe("turning the lock on", () => {
  it("refuses a PIN shorter than 4 digits, and two PINs that differ", async () => {
    await shown({ enabled: false });
    type("New PIN", "123");
    await press("Turn on app lock");
    expect(screen.getByText("PIN must be at least 4 digits.")).toBeTruthy();
    type("New PIN", "1234");
    type("Confirm PIN", "1235");
    await press("Turn on app lock");
    expect(screen.getByText("PINs don't match.")).toBeTruthy();
    expect(enableWithPin).not.toHaveBeenCalled();
  });

  it("matching PINs turn the lock on and leave the screen", async () => {
    await shown({ enabled: false });
    type("New PIN", "2468");
    type("Confirm PIN", "2468");
    await press("Turn on app lock");
    expect(enableWithPin).toHaveBeenCalledWith("2468");
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("a keychain failure says so and frees the screen; it does not leave as if the lock were on", async () => {
    enableWithPin.mockRejectedValue(new Error("keychain unavailable"));
    await shown({ enabled: false });
    type("New PIN", "2468");
    type("Confirm PIN", "2468");
    await press("Turn on app lock");
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByText("Couldn't reach secure storage. Try again.")).toBeTruthy();
    expect(screen.getByLabelText("New PIN").props.editable).toBe(true);
  });

  it("explains the PIN range, and mentions biometrics only when the device has them", async () => {
    const r = await shown({ enabled: false });
    expect(screen.getByText("Protect your financial data with a 4–8 digit PIN.")).toBeTruthy();
    r.unmount();
    await shown({ enabled: false, biometricAvailable: true });
    expect(screen.getByText(/Face ID \/ fingerprint will be used when available/)).toBeTruthy();
  });

  it("when on, says so", async () => {
    await shown();
    expect(screen.getByText("App lock is on. Zeno asks for your PIN (or biometrics) when you open it.")).toBeTruthy();
  });
});

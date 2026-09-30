import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppState, TextInput, type AppStateStatus } from "react-native";
import { ZenoThemeProvider } from "../theme/theme-provider";
import { haptics } from "../theme/haptics";
import { LockOverlay } from "./LockOverlay";

/**
 * The lock screen over the app: the neutral cover before the lock store is
 * ready, the automatic biometric attempt (only while the app is ACTIVE, at most
 * once), PIN entry (digits only, max 8, auto-submit at 4, never shown in clear,
 * locked while a check is in flight), errors, and the two escape hatches.
 *
 * The lock store is a real zustand store with test-controlled state; the PIN and
 * biometric checks themselves are covered in lock-store.test.ts / app-lock tests.
 */
jest.mock("./lock-store", () => {
  const { create } = jest.requireActual("zustand");
  return { useLockStore: create(() => ({})) };
});
const mockLogout = jest.fn();
jest.mock("../auth/authStore", () => ({
  useAuthStore: (select: (s: { logout: () => void }) => unknown) => select({ logout: mockLogout })
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { useLockStore } = require("./lock-store") as { useLockStore: { setState: (s: object) => void } };

// react-native's jest setup stubs AppState.currentState as a jest.fn; the
// overlay compares it to "active", so give it a real value per test.
const appState = AppState as unknown as { currentState: unknown };
const stubbedCurrentState = appState.currentState;
const setAppState = (state: AppStateStatus) => { appState.currentState = state; };
afterAll(() => { appState.currentState = stubbedCurrentState; });

let appStateListener: ((state: AppStateStatus) => void) | null;
const removeListener = jest.fn();
const tryPin = jest.fn();
const tryBiometric = jest.fn();

beforeEach(() => {
  appStateListener = null;
  removeListener.mockClear();
  mockLogout.mockReset().mockResolvedValue(undefined);
  tryPin.mockReset().mockResolvedValue({ ok: true });
  tryBiometric.mockReset().mockResolvedValue(false);
  setAppState("active");
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: removeListener } as ReturnType<typeof AppState.addEventListener>;
  });
  useLockStore.setState({ ready: true, biometricAvailable: false, tryPin, tryBiometric });
});
afterEach(() => jest.restoreAllMocks());

async function shown() {
  const r = render(<ZenoThemeProvider><LockOverlay /></ZenoThemeProvider>);
  await act(async () => {}); // theme provider's storage reads
  return r;
}
const pinInput = () => screen.getByLabelText("PIN");
const dots = () => screen.queryAllByText("•").length;

describe("before the lock store is ready", () => {
  it("shows only a neutral cover: no PIN prompt, no content, no biometric attempt", async () => {
    useLockStore.setState({ ready: false, biometricAvailable: true });
    await shown();
    expect(screen.queryByText("Zeno is locked")).toBeNull();
    expect(screen.queryByLabelText("PIN")).toBeNull();
    expect(tryBiometric).not.toHaveBeenCalled();
  });

  it("switches to the PIN prompt once ready, and only then attempts biometrics", async () => {
    useLockStore.setState({ ready: false, biometricAvailable: true });
    await shown();
    await act(async () => { useLockStore.setState({ ready: true }); });
    expect(screen.getByText("Zeno is locked")).toBeTruthy();
    expect(tryBiometric).toHaveBeenCalledTimes(1);
  });
});

describe("automatic biometric attempt", () => {
  it("without biometrics: no attempt, no biometric button, no AppState listener", async () => {
    await shown();
    expect(tryBiometric).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Unlock with biometrics")).toBeNull();
    expect(appStateListener).toBeNull();
  });

  it("while active: attempted exactly once, and not again on a later return to active", async () => {
    useLockStore.setState({ biometricAvailable: true });
    const { rerender } = await shown();
    expect(tryBiometric).toHaveBeenCalledTimes(1);
    rerender(<ZenoThemeProvider><LockOverlay /></ZenoThemeProvider>);
    act(() => appStateListener?.("active"));
    expect(tryBiometric).toHaveBeenCalledTimes(1);
  });

  it("mounted in the background: waits, then attempts once when the app becomes active", async () => {
    setAppState("background");
    useLockStore.setState({ biometricAvailable: true });
    const { unmount } = await shown();
    expect(tryBiometric).not.toHaveBeenCalled();
    act(() => appStateListener?.("inactive"));
    expect(tryBiometric).not.toHaveBeenCalled();
    setAppState("active");
    act(() => appStateListener?.("active"));
    act(() => appStateListener?.("active"));
    expect(tryBiometric).toHaveBeenCalledTimes(1);
    unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it("the biometric button retries on demand", async () => {
    useLockStore.setState({ biometricAvailable: true });
    await shown();
    fireEvent.press(screen.getByLabelText("Unlock with biometrics"));
    expect(tryBiometric).toHaveBeenCalledTimes(2);
  });
});

describe("PIN entry", () => {
  it("keeps digits only, caps at 8, and never renders the PIN in clear", async () => {
    tryPin.mockResolvedValue({ ok: false, error: "x" });
    await shown();
    fireEvent.changeText(pinInput(), "1a2");
    expect(dots()).toBe(2);
    expect(tryPin).not.toHaveBeenCalled();
    expect(screen.queryByText("12")).toBeNull();
    const pinDigit = jest.spyOn(haptics, "pinDigit");
    await act(async () => { fireEvent.changeText(pinInput(), "1234567890"); });
    expect(tryPin).toHaveBeenCalledWith("12345678");
    expect(pinDigit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("12345678")).toBeNull();
  });

  it("auto-submits at 4 digits; a correct PIN shows no error", async () => {
    await shown();
    await act(async () => { fireEvent.changeText(pinInput(), "2468"); });
    expect(tryPin).toHaveBeenCalledWith("2468");
    expect(screen.queryByText(/Incorrect/)).toBeNull();
  });

  it("a wrong PIN shows the store's message and clears the entry; the next keystroke clears the error", async () => {
    tryPin.mockResolvedValue({ ok: false, error: "Incorrect PIN. 9 attempts left." });
    await shown();
    await act(async () => { fireEvent.changeText(pinInput(), "1111"); });
    expect(screen.getByText("Incorrect PIN. 9 attempts left.")).toBeTruthy();
    expect(dots()).toBe(0);
    fireEvent.changeText(pinInput(), "1");
    expect(screen.queryByText("Incorrect PIN. 9 attempts left.")).toBeNull();
  });

  it("a failure without a message falls back to 'Incorrect PIN.'", async () => {
    tryPin.mockResolvedValue({ ok: false });
    await shown();
    await act(async () => { fireEvent.changeText(pinInput(), "1111"); });
    expect(screen.getByText("Incorrect PIN.")).toBeTruthy();
  });

  it("while a check is in flight the field is read-only and a second submit is ignored", async () => {
    let finish!: (v: { ok: boolean }) => void;
    tryPin.mockReturnValue(new Promise((res) => { finish = res; }));
    await shown();
    await act(async () => { fireEvent.changeText(pinInput(), "1234"); });
    expect(pinInput().props.editable).toBe(false);
    fireEvent(pinInput(), "submitEditing"); // RNTL honours editable={false} ...
    // ... so call the handler itself too: submit's own busy guard must hold even
    // if a submit reaches it past the read-only field (e.g. a hardware keyboard).
    await act(async () => { pinInput().props.onSubmitEditing(); });
    expect(tryPin).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ ok: true }); });
    expect(pinInput().props.editable).toBe(true);
  });

  it("the keyboard's done key submits 4+ digits and ignores fewer", async () => {
    await shown();
    fireEvent.changeText(pinInput(), "12");
    await act(async () => { fireEvent(pinInput(), "submitEditing"); });
    expect(tryPin).not.toHaveBeenCalled();
    // A correct PIN leaves the entry in place (the overlay unmounts in the app),
    // so the done key re-submits exactly what is in the field.
    await act(async () => { fireEvent.changeText(pinInput(), "1234"); });
    await act(async () => { fireEvent(pinInput(), "submitEditing"); });
    expect(tryPin).toHaveBeenCalledTimes(2);
    expect(tryPin).toHaveBeenLastCalledWith("1234");
  });

  it("the field opts out of password autofill and suggestions", async () => {
    await shown();
    expect(pinInput().props).toMatchObject({
      secureTextEntry: true, importantForAutofill: "no", autoComplete: "off", textContentType: "oneTimeCode",
      autoCorrect: false, spellCheck: false, contextMenuHidden: true, keyboardType: "number-pad", maxLength: 8
    });
  });

  it("tapping the code boxes focuses the hidden field", async () => {
    await shown();
    // The RN jest preset's TextInput mock puts its instance methods (focus, blur,
    // ...) on the class prototype, which is where the overlay's ref lands.
    const focus = jest.spyOn((TextInput as unknown as { prototype: { focus: () => void } }).prototype, "focus");
    fireEvent.press(screen.getByLabelText("Enter PIN"));
    expect(focus).toHaveBeenCalledTimes(1);
  });
});

describe("F28: a failing keychain never wedges the lock screen", () => {
  it("a PIN check that throws: still locked, a clear message, the entry cleared, and the field usable again", async () => {
    tryPin.mockRejectedValueOnce(new Error("keystore unavailable"));
    await shown();
    await act(async () => { fireEvent.changeText(pinInput(), "1234"); });
    expect(screen.getByText("Couldn't check your PIN. Try again.")).toBeTruthy();
    expect(screen.getByText("Zeno is locked")).toBeTruthy();
    expect(dots()).toBe(0);
    expect(pinInput().props.editable).toBe(true);
    await act(async () => { fireEvent.changeText(pinInput(), "1234"); });
    expect(tryPin).toHaveBeenCalledTimes(2);
  });

  it("a biometric attempt that throws (automatic or on demand) says to use the PIN", async () => {
    tryBiometric.mockRejectedValue(new Error("biometric hardware error"));
    useLockStore.setState({ biometricAvailable: true });
    await shown();
    expect(screen.getByText("Couldn't use biometrics. Enter your PIN.")).toBeTruthy();
    fireEvent.changeText(pinInput(), "1"); // typing clears it
    expect(screen.queryByText("Couldn't use biometrics. Enter your PIN.")).toBeNull();
    await act(async () => { fireEvent.press(screen.getByLabelText("Unlock with biometrics")); });
    expect(screen.getByText("Couldn't use biometrics. Enter your PIN.")).toBeTruthy();
  });
});

describe("sign out", () => {
  it("'Sign out instead' logs out", async () => {
    await shown();
    fireEvent.press(screen.getByLabelText("Sign out"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

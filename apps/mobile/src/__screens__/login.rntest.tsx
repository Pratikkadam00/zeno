import { act, fireEvent, screen } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";
import LoginScreen from "../../app/login";
import { renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8e-2: the sign-in screen (app/login.tsx). The auth store is faked (its
 * own suites cover every flow); this covers the screen's gate, its states and
 * what it calls.
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
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { setState: (s: object) => void; getState: () => Record<string, jest.Mock> } };

const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  openURL.mockClear();
  useAuthStore.setState({
    status: "anonymous", isAuthenticated: false, error: null,
    loginWithMagicLink: jest.fn(async () => {}),
    loginWithDemoAccount: jest.fn(async () => {}),
    loginWithApple: jest.fn(async () => {}),
    loginWithGoogle: jest.fn(async () => {})
  });
});
afterEach(() => jest.useRealTimers());

const open = () => renderScreen(<LoginScreen />, { settleMs: 300 });
const consent = () => screen.getByRole("checkbox", { name: /^I am at least 16 years old/ });
const agree = async () => { await act(async () => { fireEvent.press(consent()); }); };
const press = async (name: string) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
const disabled = (name: string) => screen.getAllByRole("button", { name }).at(-1)!.props.accessibilityState?.disabled;
const store = () => useAuthStore.getState();

describe("login, the consent gate", () => {
  it("every sign-in is disabled until the 16+ / Terms box is ticked; every control is named", async () => {
    const r = await open();
    expect(consent().props.accessibilityState).toMatchObject({ checked: false });
    await act(async () => { fireEvent.changeText(screen.getByLabelText("Email address"), "me@x.com"); });
    expect(disabled("Send sign-in link")).toBe(true);
    expect(disabled("Continue with Apple")).toBe(true);
    expect(disabled("Continue with Google")).toBe(true);
    await press("Send sign-in link");
    await act(async () => { fireEvent(screen.getByLabelText("Email address"), "submitEditing"); });
    expect(store().loginWithMagicLink).not.toHaveBeenCalled();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
    await agree();
    expect(consent().props.accessibilityState).toMatchObject({ checked: true });
    expect(disabled("Send sign-in link")).toBe(false);
    await agree();
    expect(consent().props.accessibilityState).toMatchObject({ checked: false });
  });

  it("the Terms and Privacy links open the site's legal pages", async () => {
    await open();
    const [terms, privacy] = screen.getAllByRole("link");
    await act(async () => { fireEvent.press(terms!); });
    expect(openURL).toHaveBeenLastCalledWith(expect.stringMatching(/^https:\/\/.+\/legal\/terms$/));
    await act(async () => { fireEvent.press(privacy!); });
    expect(openURL).toHaveBeenLastCalledWith(expect.stringMatching(/^https:\/\/.+\/legal\/privacy$/));
  });
});

describe("login, the magic link", () => {
  it("an email needs an @ and more than 3 characters", async () => {
    await open();
    await agree();
    await act(async () => { fireEvent.changeText(screen.getByLabelText("Email address"), "abc"); });
    expect(disabled("Send sign-in link")).toBe(true);
    await act(async () => { fireEvent.changeText(screen.getByLabelText("Email address"), "a@b."); });
    expect(disabled("Send sign-in link")).toBe(false);
  });

  it("sends the link and says to check the email (from the button or the keyboard)", async () => {
    await open();
    await agree();
    await act(async () => { fireEvent.changeText(screen.getByLabelText("Email address"), "me@x.com"); });
    await press("Send sign-in link");
    expect(store().loginWithMagicLink).toHaveBeenCalledWith("me@x.com");
    expect(screen.getByText("Check your email for a sign-in link")).toBeTruthy();
    await act(async () => { fireEvent(screen.getByLabelText("Email address"), "submitEditing"); });
    expect(store().loginWithMagicLink).toHaveBeenCalledTimes(2);
  });

  it("a failure shows the store's message, not the success line", async () => {
    store().loginWithMagicLink!.mockImplementation(async () => {
      useAuthStore.setState({ error: "Too many requests." });
      throw new Error("Too many requests.");
    });
    await open();
    await agree();
    await act(async () => { fireEvent.changeText(screen.getByLabelText("Email address"), "me@x.com"); });
    await press("Send sign-in link");
    expect(screen.getByText("Too many requests.")).toBeTruthy();
    expect(screen.queryByText("Check your email for a sign-in link")).toBeNull();
  });

  it("while a request is in flight, the form is locked and a spinner covers it", async () => {
    let finish: () => void = () => {};
    store().loginWithMagicLink!.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    await open();
    await agree();
    await act(async () => { fireEvent.changeText(screen.getByLabelText("Email address"), "me@x.com"); });
    await press("Send sign-in link");
    expect(screen.getByLabelText("Email address").props.editable).toBe(false);
    expect(disabled("Continue with Google")).toBe(true);
    await act(async () => { finish(); });
    expect(screen.getByLabelText("Email address").props.editable).toBe(true);
  });

  it("the store's own loading state locks it too", async () => {
    useAuthStore.setState({ status: "pending" });
    await open();
    await agree();
    expect(disabled("Continue with Google")).toBe(true);
  });
});

describe("login, the other ways in", () => {
  it("Apple, Google and (in development) the demo account each call the store, failures stay on screen", async () => {
    store().loginWithGoogle!.mockRejectedValueOnce(new Error("cancelled"));
    await open();
    await agree();
    await press("Continue with Apple");
    expect(store().loginWithApple).toHaveBeenCalledTimes(1);
    await press("Continue with Google");
    expect(store().loginWithGoogle).toHaveBeenCalledTimes(1);
    await press("Developer login");
    expect(store().loginWithDemoAccount).toHaveBeenCalledWith("demo@zeno.local", expect.any(String));
  });

  it("Apple and demo failures are swallowed too (the store shows them)", async () => {
    store().loginWithApple!.mockRejectedValueOnce(new Error("x"));
    store().loginWithDemoAccount!.mockRejectedValueOnce(new Error("x"));
    await open();
    await agree();
    await press("Continue with Apple");
    await press("Developer login");
    expect(screen.getByRole("button", { name: "Developer login" })).toBeTruthy();
  });

  it("F132: Android offers no Apple sign-in (it could only fail there)", async () => {
    const os = jest.replaceProperty(Platform, "OS", "android");
    try {
      await open();
      expect(screen.queryByRole("button", { name: "Continue with Apple" })).toBeNull();
      expect(screen.getByRole("button", { name: "Continue with Google" })).toBeTruthy();
    } finally {
      os.restore();
    }
  });

  it("once signed in, it goes to the ledger", async () => {
    useAuthStore.setState({ isAuthenticated: true });
    await open();
    expect(routerMock.replace).toHaveBeenCalledWith("/dashboard");
  });
});

import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import { useNotificationsAllowed } from "./use-notifications-allowed";

/** F192: the phone's notification permission, re-read on return to the foreground. */
jest.mock("../notifications/notificationService", () => ({ notificationsAllowed: jest.fn() }));
const { notificationsAllowed } = jest.requireMock("../notifications/notificationService") as { notificationsAllowed: jest.Mock };

let onChange: (state: string) => void = () => undefined;
const remove = jest.fn();
beforeEach(() => {
  remove.mockClear();
  jest.spyOn(AppState, "addEventListener").mockImplementation(((_: string, handler: (s: string) => void) => {
    onChange = handler;
    return { remove };
  }) as never);
});

it("reads it on mount, and again when the app comes back to the foreground (not on leaving)", async () => {
  notificationsAllowed.mockResolvedValueOnce(false);
  const { result } = renderHook(() => useNotificationsAllowed());
  expect(result.current).toBeNull();
  await act(async () => {});
  expect(result.current).toBe(false);
  notificationsAllowed.mockResolvedValueOnce(true);
  await act(async () => { onChange("background"); });
  expect(notificationsAllowed).toHaveBeenCalledTimes(1);
  await act(async () => { onChange("active"); });
  expect(result.current).toBe(true);
});

it("stops listening when unmounted, and ignores an answer that arrives after", async () => {
  let resolve: (v: boolean) => void = () => undefined;
  notificationsAllowed.mockReturnValueOnce(new Promise<boolean>((r) => { resolve = r; }));
  const { result, unmount } = renderHook(() => useNotificationsAllowed());
  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(false); });
  expect(result.current).toBeNull();
});

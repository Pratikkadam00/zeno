import { renderHook } from "@testing-library/react-native";
import { useBlockScreenCapture } from "./screen-capture";

/**
 * P3.7: capture is blocked for exactly as long as the screen is mounted, under
 * its own key (expo-screen-capture clears FLAG_SECURE only when every key is
 * released), and a failure of the native module never escapes.
 */
const mockPrevent = jest.fn();
const mockAllow = jest.fn();
jest.mock("expo-screen-capture", () => ({
  preventScreenCaptureAsync: (key: string) => mockPrevent(key),
  allowScreenCaptureAsync: (key: string) => mockAllow(key)
}));

beforeEach(() => {
  mockPrevent.mockReset().mockResolvedValue(undefined);
  mockAllow.mockReset().mockResolvedValue(undefined);
});

describe("useBlockScreenCapture", () => {
  it("blocks on mount and allows again on unmount, with its own key", () => {
    const { unmount } = renderHook(() => useBlockScreenCapture("lock-overlay"));
    expect(mockPrevent).toHaveBeenCalledWith("lock-overlay");
    expect(mockAllow).not.toHaveBeenCalled();
    unmount();
    expect(mockAllow).toHaveBeenCalledWith("lock-overlay");
  });

  it("a native failure (module unavailable) is caught on both sides: nothing escapes", async () => {
    const unhandled = jest.fn();
    process.on("unhandledRejection", unhandled);
    try {
      mockPrevent.mockRejectedValue(new Error("UnavailabilityError"));
      mockAllow.mockRejectedValue(new Error("UnavailabilityError"));
      const { unmount } = renderHook(() => useBlockScreenCapture("pin-entry"));
      unmount();
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });
});

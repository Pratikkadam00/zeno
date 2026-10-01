import { act, renderHook } from "@testing-library/react-native";
import { connectedInboxesLabel, useConnectedInboxesLabel } from "./connected-inboxes";
import { listConnectedGmailAccounts } from "./emailScanner";

/**
 * F29: Settings' "Connected inboxes" row reflects what the device holds.
 * expo-router's useFocusEffect is replaced by a stand-in that runs the effect
 * once and lets a test "refocus" the screen (re-run it after a blur cleanup).
 */
jest.mock("./emailScanner", () => ({ listConnectedGmailAccounts: jest.fn() }));
const mockFocus = { effect: null as null | (() => void | (() => void)), cleanup: undefined as void | (() => void) };
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      mockFocus.effect = effect;
      useEffect(() => {
        mockFocus.cleanup = effect();
        return () => mockFocus.cleanup?.();
      }, [effect]);
    }
  };
});

const list = listConnectedGmailAccounts as jest.MockedFunction<typeof listConnectedGmailAccounts>;
const accounts = (n: number) => Array.from({ length: n }, (_, i) => ({ address: `user${i}@gmail.com`, token: `t${i}` }));

beforeEach(() => list.mockReset());

describe("connectedInboxesLabel", () => {
  it("says what is true in every state", () => {
    expect(connectedInboxesLabel({ status: "loading" })).toBe("…");
    expect(connectedInboxesLabel({ status: "error" })).toBe("Unavailable");
    expect(connectedInboxesLabel({ status: "ready", count: 0 })).toBe("None connected");
    expect(connectedInboxesLabel({ status: "ready", count: 1 })).toBe("1 inbox");
    expect(connectedInboxesLabel({ status: "ready", count: 3 })).toBe("3 inboxes");
  });
});

describe("useConnectedInboxesLabel", () => {
  it("reads the connected inboxes: loading, then the real count (no more hard-coded 'None connected')", async () => {
    let resolve!: (value: ReturnType<typeof accounts>) => void;
    list.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useConnectedInboxesLabel());
    expect(result.current).toBe("…");
    await act(async () => resolve(accounts(2)));
    expect(result.current).toBe("2 inboxes");
  });

  it("an unreadable keychain shows 'Unavailable', not a false 'None connected'", async () => {
    list.mockRejectedValueOnce(new Error("keychain locked"));
    const { result } = renderHook(() => useConnectedInboxesLabel());
    await act(async () => undefined);
    expect(result.current).toBe("Unavailable");
  });

  it("re-reads on every focus, so connecting an inbox in Discover shows on return", async () => {
    list.mockResolvedValueOnce([]).mockResolvedValueOnce(accounts(1));
    const { result } = renderHook(() => useConnectedInboxesLabel());
    await act(async () => undefined);
    expect(result.current).toBe("None connected");
    await act(async () => {
      mockFocus.cleanup?.(); // blur
      mockFocus.cleanup = mockFocus.effect!(); // focus again
    });
    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current).toBe("1 inbox");
  });

  it("an answer that lands after the screen lost focus is ignored (no stale state)", async () => {
    let resolve!: (value: ReturnType<typeof accounts>) => void;
    list.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    let rejectLate!: (error: Error) => void;
    const { result } = renderHook(() => useConnectedInboxesLabel());
    await act(async () => {
      mockFocus.cleanup?.(); // blur before the first answer lands
      list.mockReturnValueOnce(new Promise((_r, reject) => { rejectLate = reject; }));
      mockFocus.cleanup = mockFocus.effect!(); // refocus: a second read starts
      mockFocus.cleanup?.(); // and is abandoned too
      resolve(accounts(5));
      rejectLate(new Error("late"));
    });
    expect(result.current).toBe("…");
  });
});

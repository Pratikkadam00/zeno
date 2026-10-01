import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { FadeInDown } from "react-native-reanimated";
import { PRINT_DURATION_MS, PRINT_STAGGER_MS, printIn, useReducedMotion } from "./motion";
import { motion } from "./zeno";

/**
 * motion.ts: the Reanimated mapping of the DS motion spec, and the live
 * "reduce motion" flag every animated component reads. Runs under jest so the
 * real Reanimated builders and the real React hook lifecycle are exercised;
 * only the OS accessibility bridge is faked (jest.setup.js already spies it to
 * "motion on"; each case overrides that once).
 */
type ReduceMotionListener = (enabled: boolean) => void;

const isReduceMotionEnabled = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");
const addEventListener = jest.spyOn(AccessibilityInfo, "addEventListener");

/** Captures the "reduceMotionChanged" listener and its subscription's remove(). */
function captureSubscription() {
  const captured: { event?: string; listener?: ReduceMotionListener; remove: jest.Mock } = { remove: jest.fn() };
  addEventListener.mockImplementationOnce(((event: string, listener: ReduceMotionListener) => {
    captured.event = event;
    captured.listener = listener;
    return { remove: captured.remove };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
  return captured;
}

/** A promise the test settles by hand, to control when the OS "answers". */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Flushes pending promise callbacks and one macrotask inside act(). */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("springs and print-in", () => {
  it("print-in stagger comes from the zeno.ts motion tokens", () => {
    expect(PRINT_STAGGER_MS).toBe(motion.printStagger);
  });

  it("printIn(index) is a FadeInDown of the print duration, delayed by index x stagger", () => {
    for (const index of [0, 1, 4]) {
      const entering = printIn(index);
      expect(entering).toBeInstanceOf(FadeInDown);
      expect(entering.getDuration()).toBe(PRINT_DURATION_MS);
      expect(entering.getDelay()).toBe(index * PRINT_STAGGER_MS);
    }
  });

  it("printIn() with no index lands immediately (row 0)", () => {
    expect(printIn().getDelay()).toBe(0);
  });

  it("each call builds its own animation; one row's delay never leaks into another", () => {
    const late = printIn(9);
    const first = printIn(0);
    expect(late).not.toBe(first);
    expect(late.getDelay()).toBe(9 * PRINT_STAGGER_MS);
    expect(first.getDelay()).toBe(0);
  });
});

describe("useReducedMotion", () => {
  it("starts at motion-on, then adopts the OS answer (reduce motion ON)", async () => {
    isReduceMotionEnabled.mockResolvedValueOnce(true);
    captureSubscription();
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    await settle();
    expect(result.current).toBe(true);
    expect(isReduceMotionEnabled).toHaveBeenCalled();
  });

  it("stays motion-on when the OS says reduce motion is off", async () => {
    isReduceMotionEnabled.mockResolvedValueOnce(false);
    captureSubscription();
    const { result } = renderHook(() => useReducedMotion());
    await settle();
    expect(result.current).toBe(false);
  });

  it("follows the user toggling the setting while the app is open", async () => {
    isReduceMotionEnabled.mockResolvedValueOnce(false);
    const sub = captureSubscription();
    const { result } = renderHook(() => useReducedMotion());
    await settle();
    expect(sub.event).toBe("reduceMotionChanged");

    act(() => sub.listener!(true));
    expect(result.current).toBe(true);
    act(() => sub.listener!(false));
    expect(result.current).toBe(false);
  });

  it("unsubscribes on unmount", async () => {
    isReduceMotionEnabled.mockResolvedValueOnce(false);
    const sub = captureSubscription();
    const { unmount } = renderHook(() => useReducedMotion());
    await settle();
    expect(sub.remove).not.toHaveBeenCalled();
    unmount();
    expect(sub.remove).toHaveBeenCalledTimes(1);
  });

  // React 19 silently ignores a state update on an unmounted component, so the
  // hook's `mounted` guard has no observable effect beyond this: late answers
  // are harmless (no error, no update). This case keeps that path exercised.
  it("an OS answer arriving after unmount is harmless", async () => {
    const answer = deferred<boolean>();
    isReduceMotionEnabled.mockReturnValueOnce(answer.promise);
    captureSubscription();
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { result, unmount } = renderHook(() => useReducedMotion());
      unmount();
      answer.resolve(true);
      await settle();
      expect(result.current).toBe(false);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it("F107: a component mounting after the answer is known STARTS from it (no first frame of motion)", async () => {
    isReduceMotionEnabled.mockResolvedValueOnce(true);
    captureSubscription();
    const first = renderHook(() => useReducedMotion());
    await settle();
    first.unmount();
    isReduceMotionEnabled.mockResolvedValueOnce(true);
    captureSubscription();
    const later = renderHook(() => useReducedMotion());
    expect(later.result.current).toBe(true); // before its own query has answered
    await settle();
    // A toggle while the app is open is remembered too.
    const sub = captureSubscription();
    isReduceMotionEnabled.mockResolvedValueOnce(true);
    const third = renderHook(() => useReducedMotion());
    await settle();
    act(() => sub.listener!(false));
    third.unmount();
    isReduceMotionEnabled.mockResolvedValueOnce(false);
    captureSubscription();
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
    await settle();
  });

  it("a failed OS query (native module unavailable) is handled and leaves motion on", async () => {
    // React Native rejects isReduceMotionEnabled() when its native module is
    // missing (Libraries/Components/AccessibilityInfo, RN 0.85), and iOS passes
    // a reject callback to the native side. That rejection must not escape as
    // an unhandled promise rejection (docs/ENGINEERING_STANDARDS.md section 7);
    // jest-circus fails the test if it does.
    // Precondition: the last answer known in this run is "motion on" (the
    // hook keeps the last known answer across mounts, F107).
    isReduceMotionEnabled.mockResolvedValueOnce(false);
    captureSubscription();
    const primer = renderHook(() => useReducedMotion());
    await settle();
    primer.unmount();
    isReduceMotionEnabled.mockRejectedValueOnce(new Error("AccessibilityInfo native module is not available"));
    const sub = captureSubscription();
    const { result } = renderHook(() => useReducedMotion());
    await settle();
    await settle();
    expect(result.current).toBe(false);

    // The live subscription still works after the failed initial read.
    act(() => sub.listener!(true));
    expect(result.current).toBe(true);
  });
});

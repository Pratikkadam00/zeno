import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * haptics.ts: the DS "haptics map" over expo-haptics. What is pinned here:
 *  - each vocabulary entry fires the expo-haptics call the DS names, with the
 *    right feedback type / style;
 *  - web (and any other non-native platform) never touches expo-haptics;
 *  - a failing haptic never reaches the caller: the call returns synchronously
 *    (nothing to await, nothing to throw) and a rejection is swallowed rather
 *    than left as an unhandled promise rejection.
 *
 * `supported` is read from Platform.OS once, at module load, so every case
 * resets the module registry and imports haptics.ts under its own platform.
 * The expo-haptics enums below are the real values from expo-haptics 56
 * (src/Haptics.types.ts).
 */
const platform = vi.hoisted(() => ({ OS: "ios" as string }));
vi.mock("react-native", () => ({ Platform: platform }));

const native = vi.hoisted(() => ({
  notificationAsync: vi.fn<(type: string) => Promise<void>>(),
  impactAsync: vi.fn<(style: string) => Promise<void>>(),
  selectionAsync: vi.fn<() => Promise<void>>()
}));
vi.mock("expo-haptics", () => ({
  notificationAsync: (type: string) => native.notificationAsync(type),
  impactAsync: (style: string) => native.impactAsync(style),
  selectionAsync: () => native.selectionAsync(),
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy", Soft: "soft", Rigid: "rigid" }
}));

async function load(os: string) {
  platform.OS = os;
  vi.resetModules();
  return (await import("./haptics")).haptics;
}

/**
 * Collects the unhandled rejections raised while `run` executes and settles.
 * Vitest's own listener is detached for the window (and restored after) so the
 * deliberate control case below is observed here instead of failing the run.
 */
async function unhandledDuring(run: () => void): Promise<unknown[]> {
  const seen: unknown[] = [];
  const onUnhandled = (reason: unknown) => seen.push(reason);
  const harness = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", onUnhandled);
  try {
    run();
    // Let the rejected promise settle and Node's rejection tracking run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.off("unhandledRejection", onUnhandled);
    for (const listener of harness) process.on("unhandledRejection", listener);
  }
  return seen;
}

beforeEach(() => {
  native.notificationAsync.mockReset().mockResolvedValue(undefined);
  native.impactAsync.mockReset().mockResolvedValue(undefined);
  native.selectionAsync.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.resetModules();
});

describe.each(["ios", "android"])("on %s", (os) => {
  it("each vocabulary entry fires the DS-mapped expo-haptics call, once", async () => {
    const haptics = await load(os);

    haptics.stampLanded();
    expect(native.notificationAsync).toHaveBeenLastCalledWith("success");
    haptics.stillCharging();
    expect(native.notificationAsync).toHaveBeenLastCalledWith("warning");
    expect(native.notificationAsync).toHaveBeenCalledTimes(2);

    haptics.rowPress();
    expect(native.impactAsync).toHaveBeenLastCalledWith("light");
    haptics.primaryAction();
    expect(native.impactAsync).toHaveBeenLastCalledWith("medium");
    expect(native.impactAsync).toHaveBeenCalledTimes(2);

    haptics.pinDigit();
    expect(native.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("returns synchronously with nothing to await, even while the haptic is still pending", async () => {
    native.impactAsync.mockReturnValue(new Promise<void>(() => {})); // never settles
    const haptics = await load(os);
    expect(haptics.primaryAction()).toBeUndefined();
    expect(native.impactAsync).toHaveBeenCalledTimes(1);
  });

  it("swallows a rejected haptic (no Taptic Engine, denied, unavailable) instead of surfacing it", async () => {
    const haptics = await load(os);
    const failure = new Error("Haptics.notificationAsync is not available");
    native.notificationAsync.mockRejectedValue(failure);
    native.impactAsync.mockRejectedValue(failure);
    native.selectionAsync.mockRejectedValue(failure);

    const unhandled = await unhandledDuring(() => {
      for (const entry of Object.values(haptics)) {
        expect(() => entry()).not.toThrow();
      }
    });

    expect(unhandled).toEqual([]);
    expect(native.notificationAsync).toHaveBeenCalledTimes(2);
    expect(native.impactAsync).toHaveBeenCalledTimes(2);
    expect(native.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("the swallow is real: the same rejection left unhandled IS reported by this harness", async () => {
    // Guards the test above against passing vacuously (e.g. if the runtime
    // stopped emitting unhandledRejection, "no reports" would prove nothing).
    const unhandled = await unhandledDuring(() => {
      void Promise.reject(new Error("left unhandled on purpose"));
    });
    expect(unhandled).toHaveLength(1);
  });
});

describe.each(["web", "windows", "macos"])("on %s (unsupported)", (os) => {
  it("never calls expo-haptics", async () => {
    const haptics = await load(os);
    for (const entry of Object.values(haptics)) {
      expect(entry()).toBeUndefined();
    }
    expect(native.notificationAsync).not.toHaveBeenCalled();
    expect(native.impactAsync).not.toHaveBeenCalled();
    expect(native.selectionAsync).not.toHaveBeenCalled();
  });
});

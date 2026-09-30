import type { WidgetSnapshot } from "@zeno/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The widget bridge: the flat payload the native widget reads, the best-effort
 * refresh (never throws into the app), and the clear used by the device erase
 * (F27), which must REJECT on failure so the erase can report it. The snapshot
 * names the next renewal, so it is user data.
 */
const storage = vi.hoisted(() => ({ items: new Map<string, string>(), fail: false }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: vi.fn(async (key: string, value: string) => {
      if (storage.fail) throw new Error("storage full");
      storage.items.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      if (storage.fail) throw new Error("storage unavailable");
      storage.items.delete(key);
    })
  }
}));

const { WIDGET_SNAPSHOT_KEY, clearWidgetSnapshot, refreshWidgetSnapshot, toWidgetPayload } = await import("./widgetBridge");

const withRenewal: WidgetSnapshot = {
  generatedAt: "2026-09-30T10:00:00.000Z",
  nextRenewal: { subscriptionId: "sub_1", name: "Netflix", amountLabel: "$15.49", dueAt: "2026-10-03T00:00:00.000Z", daysUntil: 3 },
  monthlySpendLabel: "$61.97",
  activeCount: 4,
  watchComplicationText: "Netflix in 3d"
};
const empty: WidgetSnapshot = { generatedAt: "2026-09-30T10:00:00.000Z", monthlySpendLabel: "$0.00", activeCount: 0, watchComplicationText: "" };

beforeEach(() => {
  storage.items.clear();
  storage.fail = false;
});

describe("toWidgetPayload", () => {
  it("flattens the next renewal", () => {
    expect(toWidgetPayload(withRenewal)).toEqual({
      monthlySpendLabel: "$61.97",
      activeCount: 4,
      nextRenewalName: "Netflix",
      nextRenewalAmount: "$15.49",
      nextRenewalDaysUntil: 3,
      watchComplicationText: "Netflix in 3d",
      generatedAt: "2026-09-30T10:00:00.000Z"
    });
  });

  it("uses explicit nulls when nothing is renewing", () => {
    expect(toWidgetPayload(empty)).toMatchObject({ nextRenewalName: null, nextRenewalAmount: null, nextRenewalDaysUntil: null });
  });
});

describe("refreshWidgetSnapshot", () => {
  it("stores the payload as JSON under the widget key", async () => {
    await refreshWidgetSnapshot(withRenewal);
    expect(JSON.parse(storage.items.get(WIDGET_SNAPSHOT_KEY)!)).toEqual(toWidgetPayload(withRenewal));
  });

  it("never throws into the app when storage fails", async () => {
    storage.fail = true;
    await expect(refreshWidgetSnapshot(withRenewal)).resolves.toBeUndefined();
  });
});

describe("clearWidgetSnapshot (F27 erase)", () => {
  it("removes the stored snapshot", async () => {
    await refreshWidgetSnapshot(withRenewal);
    await clearWidgetSnapshot();
    expect(storage.items.has(WIDGET_SNAPSHOT_KEY)).toBe(false);
  });

  it("rejects when storage fails, so the erase can say the snapshot is still there", async () => {
    storage.fail = true;
    await expect(clearWidgetSnapshot()).rejects.toThrow("storage unavailable");
  });
});

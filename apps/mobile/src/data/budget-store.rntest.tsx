import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

/**
 * Budget store, through its real hook and provider: hydration from the
 * encrypted app_meta table (stored / absent / corrupt / DB down / unmounted
 * mid-open), every action and what it persists, F26 (two actions in one event
 * must BOTH land), reset (erases the income figure), and the web in-memory
 * path.
 */
const db = { name: "fake-db" };
const mockOpen = jest.fn();
const mockRead = jest.fn();
const mockWrite = jest.fn();
jest.mock("../storage/database", () => ({
  openZenoDatabase: (...a: unknown[]) => mockOpen(...a),
  readAppMeta: (...a: unknown[]) => mockRead(...a),
  writeAppMeta: (...a: unknown[]) => mockWrite(...a)
}));
let uuid = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => `uuid-${(uuid += 1)}` }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const store = require("./budget-store") as typeof import("./budget-store");
const wrapper = ({ children }: { children: ReactNode }) => <store.BudgetStoreProvider>{children}</store.BudgetStoreProvider>;
const lastWritten = () => JSON.parse(mockWrite.mock.calls.at(-1)![2] as string);

beforeEach(() => {
  uuid = 0;
  mockOpen.mockReset().mockResolvedValue(db);
  mockRead.mockReset().mockResolvedValue(null);
  mockWrite.mockReset().mockResolvedValue(undefined);
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function mounted() {
  const r = renderHook(() => store.useBudgetStore(), { wrapper });
  await waitFor(() => expect(r.result.current.hydrated).toBe(true));
  return r;
}

describe("hydration", () => {
  it("merges the stored config over the defaults", async () => {
    mockRead.mockResolvedValue(JSON.stringify({ capMinor: 5000, incomeMinor: 300000 }));
    const { result } = await mounted();
    expect(mockRead).toHaveBeenCalledWith(db, "budget.config.v1");
    expect(result.current.config).toEqual({ capMinor: 5000, capSetAt: expect.any(String), incomeMinor: 300000, envelopes: [], categoryCaps: [] });
  });

  it("F143: a stored cap without a date is dated now (saved); a dated one keeps its date", async () => {
    const before = Date.now();
    mockRead.mockResolvedValue(JSON.stringify({ capMinor: 5000 }));
    const first = await mounted();
    expect(Date.parse(first.result.current.config.capSetAt!)).toBeGreaterThanOrEqual(before);
    expect(lastWritten()).toMatchObject({ capMinor: 5000, capSetAt: first.result.current.config.capSetAt });
    first.unmount();
    mockWrite.mockClear();
    mockRead.mockResolvedValue(JSON.stringify({ capMinor: 5000, capSetAt: "2026-03-01T00:00:00.000Z" }));
    const second = await mounted();
    expect(second.result.current.config.capSetAt).toBe("2026-03-01T00:00:00.000Z");
    expect(mockWrite).not.toHaveBeenCalled();
    second.unmount();
    mockRead.mockResolvedValue(JSON.stringify({ capMinor: 5000 }));
    mockWrite.mockRejectedValueOnce(new Error("disk"));
    await mounted();
    await waitFor(() => expect(console.warn).toHaveBeenCalledWith("Failed to persist budget config.", expect.any(Error)));
  });

  it("nothing stored → defaults", async () => {
    const { result } = await mounted();
    expect(result.current.config).toEqual({ capMinor: null, capSetAt: null, incomeMinor: null, envelopes: [], categoryCaps: [] });
  });

  it("a corrupt stored value is ignored with a warning (defaults kept)", async () => {
    mockRead.mockResolvedValue("{not json");
    const { result } = await mounted();
    expect(result.current.config.capMinor).toBeNull();
    expect(console.warn).toHaveBeenCalledWith("Corrupt budget config; using defaults.", expect.any(SyntaxError));
  });

  it("a database that will not open → in-memory only, still usable, nothing written", async () => {
    mockOpen.mockRejectedValue(new Error("SQLCipher key mismatch"));
    const { result } = await mounted();
    expect(console.warn).toHaveBeenCalledWith("Budget store database unavailable; using in-memory config.", expect.any(Error));
    act(() => result.current.setCap(1000));
    expect(result.current.config.capMinor).toBe(1000);
    await act(async () => { await result.current.reset(); });
    expect(result.current.config.capMinor).toBeNull();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("unmounting before the database opens abandons hydration (no read after unmount)", async () => {
    let resolveOpen!: (v: unknown) => void;
    mockOpen.mockReturnValue(new Promise((r) => { resolveOpen = r; }));
    const { unmount } = renderHook(() => store.useBudgetStore(), { wrapper });
    unmount();
    await act(async () => { resolveOpen(db); });
    expect(mockRead).not.toHaveBeenCalled();
  });

  it("unmounting while the stored config is being read does not apply it", async () => {
    let resolveRead!: (v: unknown) => void;
    mockRead.mockReturnValue(new Promise((r) => { resolveRead = r; }));
    const { unmount } = renderHook(() => store.useBudgetStore(), { wrapper });
    await waitFor(() => expect(mockRead).toHaveBeenCalled());
    unmount();
    await act(async () => { resolveRead(JSON.stringify({ capMinor: 1 })); });
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("actions persist exactly what they set", () => {
  it("cap and income", async () => {
    const { result } = await mounted();
    const before = Date.now();
    act(() => result.current.setCap(8000));
    expect(lastWritten()).toMatchObject({ capMinor: 8000 });
    // F143: dated when first set, kept when the cap changes, cleared with it.
    const setAt = result.current.config.capSetAt!;
    expect(Date.parse(setAt)).toBeGreaterThanOrEqual(before);
    act(() => result.current.setCap(9000));
    expect(result.current.config.capSetAt).toBe(setAt);
    act(() => result.current.setCap(null));
    expect(result.current.config.capSetAt).toBeNull();
    act(() => result.current.setCap(8000));
    act(() => result.current.setIncome(420000));
    expect(result.current.config).toMatchObject({ capMinor: 8000, incomeMinor: 420000 });
    expect(mockWrite.mock.calls.at(-1)![0]).toBe(db);
    expect(mockWrite.mock.calls.at(-1)![1]).toBe("budget.config.v1");
  });

  it("envelopes: add (random id, default icon), log spend on the right one, remove", async () => {
    const { result } = await mounted();
    act(() => result.current.addEnvelope("Groceries", 40000));
    act(() => result.current.addEnvelope("Fun", 10000, "party"));
    const [groceries, fun] = result.current.config.envelopes;
    expect(groceries).toEqual({ id: "env_uuid-1", name: "Groceries", icon: "wallet", fundedMinor: 40000, spentMinor: 0 });
    expect(fun?.icon).toBe("party");
    act(() => result.current.logEnvelope(groceries!.id, 1250));
    expect(result.current.config.envelopes.map((e) => e.spentMinor)).toEqual([1250, 0]);
    act(() => result.current.removeEnvelope(fun!.id));
    expect(result.current.config.envelopes.map((e) => e.name)).toEqual(["Groceries"]);
    expect(lastWritten().envelopes).toHaveLength(1);
  });

  it("a category cap replaces an existing cap for the same category and keeps the others", async () => {
    const { result } = await mounted();
    act(() => result.current.setCategoryCap("entertainment", 3000));
    act(() => result.current.setCategoryCap("productivity", 2000));
    act(() => result.current.setCategoryCap("entertainment", 3500));
    expect(result.current.config.categoryCaps).toEqual([{ category: "productivity", capMinor: 2000 }, { category: "entertainment", capMinor: 3500 }]);
  });

  it("F26: two actions in ONE event both land (none is erased by a stale snapshot)", async () => {
    const { result } = await mounted();
    act(() => {
      result.current.addEnvelope("A", 100);
      result.current.addEnvelope("B", 200);
      result.current.setCap(9000);
      result.current.setIncome(123400);
    });
    expect(result.current.config.envelopes.map((e) => e.name)).toEqual(["A", "B"]);
    expect(result.current.config).toMatchObject({ capMinor: 9000, incomeMinor: 123400 });
    expect(lastWritten()).toMatchObject({ capMinor: 9000, incomeMinor: 123400 });
    expect(lastWritten().envelopes).toHaveLength(2);
  });

  it("reset erases everything, the income figure included, and persists that", async () => {
    mockRead.mockResolvedValue(JSON.stringify({ capMinor: 5000, incomeMinor: 300000, envelopes: [{ id: "e", name: "x", icon: "i", fundedMinor: 1, spentMinor: 0 }], categoryCaps: [] }));
    const { result } = await mounted();
    await act(async () => { await result.current.reset(); });
    expect(result.current.config).toEqual({ capMinor: null, capSetAt: null, incomeMinor: null, envelopes: [], categoryCaps: [] });
    expect(lastWritten()).toEqual({ capMinor: null, capSetAt: null, incomeMinor: null, envelopes: [], categoryCaps: [] });
  });

  it("F27: a reset whose write fails REJECTS (an erase must not report success), memory still reset", async () => {
    mockRead.mockResolvedValue(JSON.stringify({ capMinor: 5000, incomeMinor: 300000, envelopes: [], categoryCaps: [] }));
    const { result } = await mounted();
    mockWrite.mockRejectedValueOnce(new Error("disk full"));
    let rejected: unknown;
    await act(async () => { await result.current.reset().catch((e: unknown) => { rejected = e; }); });
    expect(rejected).toEqual(new Error("disk full"));
    expect(result.current.config.incomeMinor).toBeNull();
  });

  it("a reset followed by an edit in the same event keeps the edit (the ref is reset too)", async () => {
    mockRead.mockResolvedValue(JSON.stringify({ capMinor: 5000, incomeMinor: 300000, envelopes: [], categoryCaps: [] }));
    const { result } = await mounted();
    await act(async () => {
      void result.current.reset();
      result.current.setCap(100);
    });
    expect(result.current.config).toEqual({ capMinor: 100, capSetAt: expect.any(String), incomeMinor: null, envelopes: [], categoryCaps: [] });
  });

  it("a failed write keeps the new state and warns", async () => {
    const { result } = await mounted();
    mockWrite.mockRejectedValueOnce(new Error("disk full"));
    await act(async () => { result.current.setCap(700); });
    expect(result.current.config.capMinor).toBe(700);
    expect(console.warn).toHaveBeenCalledWith("Failed to persist budget config.", expect.any(Error));
  });
});

describe("guards and platforms", () => {
  it("useBudgetStore outside the provider throws a clear error", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => store.useBudgetStore())).toThrow("useBudgetStore must be used inside BudgetStoreProvider");
  });

  it("on web there is no database: hydrated at once, never opened, still usable", () => {
    jest.isolateModules(() => {
      // Everything — the platform, the renderer, React — must come from the SAME
      // isolated registry as the store: it has its own react-native copy (so the
      // outer Platform object is not the one the store reads) and its own React.
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { Platform } = require("react-native");
      jest.replaceProperty(Platform, "OS", "web");
      const web = require("./budget-store") as typeof import("./budget-store");
      // The "pure" entry: no auto-cleanup hooks (those may not be registered
      // inside a test body).
      const { renderHook: isoRenderHook, act: isoAct } = require("@testing-library/react-native/pure") as typeof import("@testing-library/react-native");
      const React = require("react") as typeof import("react");
      /* eslint-enable @typescript-eslint/no-require-imports */
      const w = ({ children }: { children: ReactNode }) => React.createElement(web.BudgetStoreProvider, null, children);
      const { result } = isoRenderHook(() => web.useBudgetStore(), { wrapper: w });
      expect(result.current.hydrated).toBe(true);
      isoAct(() => result.current.setCap(10));
      expect(result.current.config.capMinor).toBe(10);
    });
    expect(mockOpen).not.toHaveBeenCalled();
  });
});

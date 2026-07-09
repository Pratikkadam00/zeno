import { afterEach, describe, expect, it, vi } from "vitest";

// expo-sqlite is native and can't run under Vitest — fake just enough of its
// surface (openDatabaseAsync + the few statement methods database.ts calls)
// to exercise the memoization logic under test, not real SQLite behavior.
const { openDatabaseAsync, fakeDb } = vi.hoisted(() => {
  const fakeDb = {
    execAsync: vi.fn().mockResolvedValue(undefined),
    getFirstAsync: vi.fn().mockResolvedValue({ user_version: 1 }),
    runAsync: vi.fn().mockResolvedValue(undefined)
  };
  return { openDatabaseAsync: vi.fn().mockResolvedValue(fakeDb), fakeDb };
});
vi.mock("expo-sqlite", () => ({ openDatabaseAsync }));

vi.mock("../security/secure-store", () => ({
  getOrCreateDatabaseKey: vi.fn().mockResolvedValue("test-key")
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("openZenoDatabase", () => {
  it("memoizes concurrent calls into a single open+migrate sequence", async () => {
    const { openZenoDatabase } = await import("./database");

    const [a, b, c] = await Promise.all([openZenoDatabase(), openZenoDatabase(), openZenoDatabase()]);

    expect(a).toBe(fakeDb);
    expect(b).toBe(fakeDb);
    expect(c).toBe(fakeDb);
    // Two concurrent stores (budget-store, subscription-store) calling this on
    // cold start must not race expo-sqlite's own directory creation for the
    // same "zeno.db" file — only one underlying open should ever happen.
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it("memoizes sequential calls too, once the first has resolved", async () => {
    const { openZenoDatabase } = await import("./database");

    await openZenoDatabase();
    await openZenoDatabase();

    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it("lets a later call retry after the first attempt fails", async () => {
    const { openZenoDatabase } = await import("./database");
    openDatabaseAsync.mockRejectedValueOnce(new Error("Path already points to a non-normal file"));

    await expect(openZenoDatabase()).rejects.toThrow("Path already points to a non-normal file");
    // A cached rejected promise would permanently break persistence for the
    // rest of the app session — the next call must get a fresh attempt.
    await expect(openZenoDatabase()).resolves.toBe(fakeDb);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(2);
  });
});

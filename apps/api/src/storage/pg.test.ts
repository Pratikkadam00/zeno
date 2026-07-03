import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the "pg" module so initStorage()'s hydration path (CREATE TABLE, SELECT,
// group-by-namespace, per-namespace hydrator dispatch) can be exercised without
// a real Postgres. query() is driven per-test via queryImpl.
let queryImpl: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> = () => Promise.resolve({ rows: [] });
const queryMock = vi.fn((sql: string, params?: unknown[]) => queryImpl(sql, params));
vi.mock("pg", () => ({
  // A plain `function`, not an arrow function: arrow functions have no
  // [[Construct]] slot, so `new Pool(...)` would throw "not a constructor"
  // even though this is only ever invoked with `new`.
  Pool: vi.fn().mockImplementation(function PoolMock() {
    return {
      query: (sql: string, params?: unknown[]) => queryMock(sql, params),
      on: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined)
    };
  })
}));

const { closeStorage, encryptionConfigured, initStorage, kvDelete, kvPersist, openValue, pgEnabled, registerHydrator, sealValue } = await import("./pg");

// A throwaway 32-byte key (64 hex chars) for the encryption round-trip tests.
const TEST_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

// These tests assert the contract that keeps local dev and CI working with no
// database: when DATABASE_URL is unset, every persistence entry point is an
// inert no-op (no connection, no throw). The DB-backed path itself is exercised
// against a real Postgres in deployment, not here.

const original = process.env.DATABASE_URL;
const originalKey = process.env.STORAGE_ENCRYPTION_KEY;

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
  if (originalKey === undefined) delete process.env.STORAGE_ENCRYPTION_KEY;
  else process.env.STORAGE_ENCRYPTION_KEY = originalKey;
});

describe("pg storage (no DATABASE_URL)", () => {
  it("reports disabled and reflects the env var", () => {
    delete process.env.DATABASE_URL;
    expect(pgEnabled()).toBe(false);
    process.env.DATABASE_URL = "postgres://example/db";
    expect(pgEnabled()).toBe(true);
  });

  it("kvPersist / kvDelete are silent no-ops without a database", () => {
    delete process.env.DATABASE_URL;
    expect(() => kvPersist("sync", "user|subscription:1", { hello: "world" })).not.toThrow();
    expect(() => kvDelete("sync", "user|subscription:1")).not.toThrow();
  });

  it("initStorage resolves and never invokes hydrators without a database", async () => {
    delete process.env.DATABASE_URL;
    let called = false;
    registerHydrator("__test_unused__", () => {
      called = true;
    });
    await expect(initStorage()).resolves.toBeUndefined();
    expect(called).toBe(false);
  });
});

describe("encryption at rest", () => {
  it("is disabled without a valid key and enabled with one", () => {
    delete process.env.STORAGE_ENCRYPTION_KEY;
    expect(encryptionConfigured()).toBe(false);
    process.env.STORAGE_ENCRYPTION_KEY = "too-short";
    expect(encryptionConfigured()).toBe(false);
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    expect(encryptionConfigured()).toBe(true);
  });

  it("seals and opens a value round-trip", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    const secret = { accessToken: "access-sandbox-abc123", itemId: "item_9" };
    const sealed = sealValue(secret);
    expect(typeof sealed.enc).toBe("string");
    expect(sealed.enc).not.toContain("access-sandbox"); // ciphertext, not plaintext
    expect(openValue(sealed)).toEqual(secret);
  });

  it("returns null when the envelope is tampered with", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    const sealed = sealValue({ accessToken: "secret" });
    const tampered = { enc: sealed.enc.slice(0, -4) + (sealed.enc.endsWith("A") ? "BBBB" : "AAAA") };
    expect(openValue(tampered)).toBeNull();
  });

  it("returns null when the key is absent", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    const sealed = sealValue({ accessToken: "secret" });
    delete process.env.STORAGE_ENCRYPTION_KEY;
    expect(openValue(sealed)).toBeNull();
  });
});

describe("initStorage hydration (DATABASE_URL set, mocked pg client)", () => {
  afterEach(async () => {
    // Reset the module-level pool/initialized guard so each test gets a fresh
    // "first boot" — otherwise the second test's initStorage() call would be a
    // silent no-op because `initialized` is already true from the first.
    await closeStorage();
    queryImpl = () => Promise.resolve({ rows: [] });
    queryMock.mockClear();
  });

  it("groups persisted rows by namespace and dispatches each to only its own hydrator", async () => {
    process.env.DATABASE_URL = "postgres://mock/db";
    const rows = [
      { namespace: "hydtest-sync", key: "u1|sub:1", value: { a: 1 } },
      { namespace: "hydtest-sync", key: "u1|sub:2", value: { a: 2 } },
      { namespace: "hydtest-billing", key: "u2", value: { plan: "pro" } }
    ];
    queryImpl = (sql) => Promise.resolve(sql.includes("SELECT") ? { rows } : { rows: [] });

    const syncSeen: unknown[] = [];
    const billingSeen: unknown[] = [];
    const emptySeen: unknown[] = [];
    registerHydrator("hydtest-sync", (entries) => syncSeen.push(...entries));
    registerHydrator("hydtest-billing", (entries) => billingSeen.push(...entries));
    // A namespace with zero matching rows: the empty-array guard in initStorage
    // means this hydrator should simply never be called, not called with [].
    registerHydrator("hydtest-empty", (entries) => emptySeen.push(...entries));

    await initStorage();

    expect(syncSeen).toEqual([
      { key: "u1|sub:1", value: { a: 1 } },
      { key: "u1|sub:2", value: { a: 2 } }
    ]);
    expect(billingSeen).toEqual([{ key: "u2", value: { plan: "pro" } }]);
    expect(emptySeen).toEqual([]);
  });

  it("is idempotent: a second initStorage() call does not re-query or re-hydrate", async () => {
    process.env.DATABASE_URL = "postgres://mock/db";
    const rows = [{ namespace: "hydtest-once", key: "k", value: 1 }];
    queryImpl = (sql) => Promise.resolve(sql.includes("SELECT") ? { rows } : { rows: [] });

    let callCount = 0;
    registerHydrator("hydtest-once", () => { callCount += 1; });

    await initStorage();
    expect(callCount).toBe(1);
    const queriesAfterFirst = queryMock.mock.calls.length;

    await initStorage();
    expect(callCount).toBe(1); // not called again
    expect(queryMock.mock.calls.length).toBe(queriesAfterFirst); // no new queries issued
  });

  it("continues in-memory-only (does not throw) when the database query fails", async () => {
    process.env.DATABASE_URL = "postgres://mock/db";
    queryImpl = () => Promise.reject(new Error("connection refused"));
    let called = false;
    registerHydrator("hydtest-unreachable", () => { called = true; });

    await expect(initStorage()).resolves.toBeUndefined();
    expect(called).toBe(false);
  });
});

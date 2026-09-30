import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const { closeStorage, encryptionConfigured, encryptionKeyStatus, initStorage, kvClear, kvDelete, kvDeleteAwait, kvDeleteByValueField, kvPersist, kvPersistAwait, openValue, pgEnabled, pgSslConfig, pgSslMode, pingStorage, registerHydrator, sealValue, storageKeyRef } = await import("./pg");
const { Pool } = await import("pg");
const { createCipheriv, randomBytes } = await import("node:crypto");

// A throwaway 32-byte key (64 hex chars) for the encryption round-trip tests.
const TEST_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

// These tests assert the contract that keeps local dev and CI working with no
// database: when DATABASE_URL is unset, every persistence entry point is an
// inert no-op (no connection, no throw). The DB-backed path itself is exercised
// against a real Postgres in deployment, not here.

const original = process.env.DATABASE_URL;
const originalKey = process.env.STORAGE_ENCRYPTION_KEY;

const originalPrevKeys = process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
  if (originalKey === undefined) delete process.env.STORAGE_ENCRYPTION_KEY;
  else process.env.STORAGE_ENCRYPTION_KEY = originalKey;
  if (originalPrevKeys === undefined) delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
  else process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS = originalPrevKeys;
});

const ROTATED_KEY = "ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100";

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

  it("stamps the sealing key's fingerprint as kid, and it changes with the key", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    const a = sealValue({ x: 1 });
    process.env.STORAGE_ENCRYPTION_KEY = ROTATED_KEY;
    const b = sealValue({ x: 1 });
    expect(typeof a.kid).toBe("string");
    expect(a.kid).not.toBe(b.kid);
  });

  it("still opens a value sealed with a previous key after rotation (keyring)", () => {
    // Seal with the old key.
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
    const secret = { accessToken: "old-key-token" };
    const sealed = sealValue(secret);

    // Rotate: new key becomes primary, old key retained in PREVIOUS.
    process.env.STORAGE_ENCRYPTION_KEY = ROTATED_KEY;
    process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS = TEST_KEY;

    // Old data still opens via the previous key...
    expect(openValue(sealed)).toEqual(secret);
    // ...and new writes use the new key (different kid) yet still open.
    const resealed = sealValue(secret);
    expect(resealed.kid).not.toBe(sealed.kid);
    expect(openValue(resealed)).toEqual(secret);
  });

  it("cannot open a value once its key is fully removed from the ring", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
    const sealed = sealValue({ x: 1 });
    // Rotate WITHOUT retaining the old key → old data is unrecoverable (the
    // failure this whole keyring mechanism exists to prevent operators from
    // hitting silently).
    process.env.STORAGE_ENCRYPTION_KEY = ROTATED_KEY;
    delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
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

describe("TLS mode to Postgres (DATABASE_SSL)", () => {
  it("defaults to require: encrypted, certificate NOT verified (Render internal URL is self-signed)", () => {
    expect(pgSslMode({})).toEqual({ mode: "require", valid: true });
    expect(pgSslConfig({})).toEqual({ rejectUnauthorized: false });
    expect(pgSslConfig({ DATABASE_SSL: "require" })).toEqual({ rejectUnauthorized: false });
    expect(pgSslConfig({ DATABASE_SSL: "  " })).toEqual({ rejectUnauthorized: false });
  });

  it("verify: certificate verified, with an optional custom CA", () => {
    expect(pgSslConfig({ DATABASE_SSL: "verify" })).toEqual({ rejectUnauthorized: true });
    expect(pgSslConfig({ DATABASE_SSL: "VERIFY", DATABASE_CA_CERT: " -----BEGIN CERTIFICATE-----x " })).toEqual({
      rejectUnauthorized: true,
      ca: "-----BEGIN CERTIFICATE-----x"
    });
    // An empty CA value is "no custom CA", not an empty trust list.
    expect(pgSslConfig({ DATABASE_SSL: "verify", DATABASE_CA_CERT: "   " })).toEqual({ rejectUnauthorized: true });
  });

  it("disable: no TLS at all (local development)", () => {
    expect(pgSslConfig({ DATABASE_SSL: "disable" })).toBeUndefined();
  });

  it("an unknown value NEVER weakens the connection: it resolves to verify and is flagged invalid", () => {
    for (const typo of ["verfiy", "true", "off", "no-verify", "prefer"]) {
      expect(pgSslMode({ DATABASE_SSL: typo }), typo).toEqual({ mode: "verify", valid: false });
      expect(pgSslConfig({ DATABASE_SSL: typo }), typo).toEqual({ rejectUnauthorized: true });
    }
  });

  it("the pool is actually constructed with the resolved TLS config", async () => {
    await closeStorage();
    process.env.DATABASE_URL = "postgres://mock/db";
    const original = process.env.DATABASE_SSL;
    process.env.DATABASE_SSL = "verify";
    try {
      vi.mocked(Pool).mockClear();
      await kvPersistAwait("tls-test", "k", 1);
      const opts = vi.mocked(Pool).mock.calls.at(-1)?.[0] as { ssl?: unknown };
      expect(opts.ssl).toEqual({ rejectUnauthorized: true });
    } finally {
      if (original === undefined) delete process.env.DATABASE_SSL;
      else process.env.DATABASE_SSL = original;
      await closeStorage();
    }
  });
});

describe("AES-GCM envelope hardening", () => {
  it("rejects an envelope too short to hold iv + a full 16-byte tag + ciphertext", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    for (const len of [0, 1, 12, 16, 27, 28]) {
      expect(openValue({ enc: Buffer.alloc(len).toString("base64") }), `len ${len}`).toBeNull();
    }
  });

  it("rejects a value whose GCM tag was TRUNCATED (Node would otherwise accept a 4-byte tag)", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    const key = Buffer.from(TEST_KEY, "hex");
    // A genuine ciphertext of valid JSON carrying only a 4-byte tag. Honest
    // note: the pre-fix code also rejected this (its fixed 16-byte slice mixes
    // tag and ciphertext), so this is a regression guard. The property that
    // actually changed — the pinned tag length — is asserted in pg-gcm.test.ts.
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 4 });
    const ct = Buffer.concat([cipher.update(Buffer.from(JSON.stringify({ accessToken: "forged-but-valid-json" }), "utf8")), cipher.final()]);
    const shortTag = cipher.getAuthTag();
    expect(shortTag.length).toBe(4);
    const forged = Buffer.concat([iv, shortTag, ct]).toString("base64");
    expect(openValue({ enc: forged })).toBeNull();
  });

  it("a full-length envelope from sealValue still round-trips", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    expect(openValue(sealValue({ ok: true }))).toEqual({ ok: true });
  });
});

describe("storage failure logs never carry the key (PII + log injection)", () => {
  afterEach(async () => {
    await closeStorage();
    queryImpl = () => Promise.resolve({ rows: [] });
    vi.restoreAllMocks();
  });

  // A key as an attacker or a real user could produce it: an email address
  // (auth_legacy keys ARE emails), a forged log line, and printf directives.
  const HOSTILE_KEY = ["victim@example.com", "[pg] FORGED entry %s %o %c"].join(String.fromCharCode(10));

  for (const op of ["persist", "delete"] as const) {
    it(`${op}: constant message, hashed key reference, no email, no CR/LF, no format directives`, async () => {
      process.env.DATABASE_URL = "postgres://mock/db";
      queryImpl = () => Promise.reject(new Error("connection terminated"));
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      if (op === "persist") await kvPersistAwait("auth_legacy", HOSTILE_KEY, { a: 1 });
      else await kvDeleteAwait("auth_legacy", HOSTILE_KEY);

      expect(spy).toHaveBeenCalledTimes(1);
      const [first, detail] = spy.mock.calls[0] as [string, Record<string, string>];
      expect(first).toBe("[pg] storage write failed");
      expect(detail).toEqual({ op, namespace: "auth_legacy", keyRef: storageKeyRef(HOSTILE_KEY), error: "connection terminated" });
      const everything = JSON.stringify(spy.mock.calls);
      expect(everything).not.toContain("victim@example.com");
      expect(everything).not.toContain("FORGED");
    });
  }

  it("storageKeyRef is stable, short, and not the key", () => {
    expect(storageKeyRef("a@b.c")).toBe(storageKeyRef("a@b.c"));
    expect(storageKeyRef("a@b.c")).toMatch(/^[0-9a-f]{12}$/);
    expect(storageKeyRef("a@b.c")).not.toBe(storageKeyRef("a@b.d"));
  });

  it("a rejection that is not an Error is logged as its string, still without the key", async () => {
    process.env.DATABASE_URL = "postgres://mock/db";
    queryImpl = () => Promise.reject("socket hang up");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await kvPersistAwait("sync", HOSTILE_KEY, { a: 1 });
    expect(spy).toHaveBeenCalledWith("[pg] storage write failed", {
      op: "persist", namespace: "sync", keyRef: storageKeyRef(HOSTILE_KEY), error: "socket hang up"
    });
  });
});

// The last Pool the module constructed (the mock returns a plain object per `new`).
type PoolDouble = { on: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
function lastPool(): PoolDouble {
  const result = vi.mocked(Pool).mock.results.at(-1);
  if (!result) throw new Error("no Pool was constructed");
  return result.value as PoolDouble;
}

describe("storage failure paths (DATABASE_URL set, mocked pg client)", () => {
  beforeEach(async () => {
    await closeStorage();
    queryMock.mockClear();
  });

  afterEach(async () => {
    await closeStorage();
    queryImpl = () => Promise.resolve({ rows: [] });
    queryMock.mockClear();
    vi.restoreAllMocks();
  });

  it("kvPersistAwait reports whether the row landed: true on success, false on a failed write, true with no database", async () => {
    // sync.ts acks a pushed change as "accepted" only when this is true, so a
    // failed write must be distinguishable from a successful one.
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.DATABASE_URL;
    expect(await kvPersistAwait("sync", "k", 1)).toBe(true);

    process.env.DATABASE_URL = "postgres://mock/db";
    expect(await kvPersistAwait("sync", "k", { v: 1 })).toBe(true);
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining("INSERT INTO kv_store"), ["sync", "k", JSON.stringify({ v: 1 })]);

    queryImpl = () => Promise.reject(new Error("connection terminated"));
    expect(await kvPersistAwait("sync", "k", { v: 2 })).toBe(false);
  });

  it("kvDeleteAwait reports whether the delete landed (F75: account deletion acks only on true)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.DATABASE_URL;
    expect(await kvDeleteAwait("plaid", "acct_1")).toBe(true);
    process.env.DATABASE_URL = "postgres://mock/db";
    expect(await kvDeleteAwait("plaid", "acct_1")).toBe(true);
    queryImpl = () => Promise.reject(new Error("connection terminated"));
    expect(await kvDeleteAwait("plaid", "acct_1")).toBe(false);
  });

  it("kvDeleteByValueField: one parameterised statement by a JSON field; false on failure, logged without the value", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.DATABASE_URL;
    expect(await kvDeleteByValueField("sync", "userId", "acct_secret_id")).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();

    process.env.DATABASE_URL = "postgres://mock/db";
    expect(await kvDeleteByValueField("sync", "userId", "acct_secret_id")).toBe(true);
    expect(queryMock).toHaveBeenLastCalledWith("DELETE FROM kv_store WHERE namespace = $1 AND value->>$2 = $3", ["sync", "userId", "acct_secret_id"]);

    queryImpl = () => Promise.reject(new Error("deadlock detected"));
    expect(await kvDeleteByValueField("sync", "userId", "acct_secret_id")).toBe(false);
    queryImpl = () => Promise.reject("a bare string");
    expect(await kvDeleteByValueField("auth_refresh", "accountId", "acct_secret_id")).toBe(false);
    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).toContain("deadlock detected");
    expect(logged).toContain("a bare string");
    expect(logged).not.toContain("acct_secret_id");
  });

  it("kvClear: no database → no query; with one → deletes exactly that namespace; a failure is logged, never thrown", async () => {
    delete process.env.DATABASE_URL;
    await kvClear("family");
    expect(queryMock).not.toHaveBeenCalled();

    process.env.DATABASE_URL = "postgres://mock/db";
    await kvClear("family");
    expect(queryMock).toHaveBeenCalledWith("DELETE FROM kv_store WHERE namespace = $1", ["family"]);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    queryImpl = () => Promise.reject(new Error("read-only transaction"));
    await expect(kvClear("family")).resolves.toBeUndefined();
    queryImpl = () => Promise.reject("not an Error");
    await expect(kvClear("sync")).resolves.toBeUndefined();
    expect(spy.mock.calls).toEqual([
      ["[pg] storage clear failed", { namespace: "family", error: "read-only transaction" }],
      ["[pg] storage clear failed", { namespace: "sync", error: "not an Error" }]
    ]);
  });

  it("kvDeleteAwait deletes exactly one (namespace, key) row", async () => {
    process.env.DATABASE_URL = "postgres://mock/db";
    await kvDeleteAwait("billing", "acct_1");
    expect(queryMock).toHaveBeenCalledWith("DELETE FROM kv_store WHERE namespace = $1 AND key = $2", ["billing", "acct_1"]);
  });

  it("pingStorage: skipped without a database, ok when SELECT 1 succeeds, error when it fails", async () => {
    delete process.env.DATABASE_URL;
    expect(await pingStorage()).toBe("skipped");
    process.env.DATABASE_URL = "postgres://mock/db";
    expect(await pingStorage()).toBe("ok");
    expect(queryMock).toHaveBeenLastCalledWith("SELECT 1", undefined);
    queryImpl = () => Promise.reject(new Error("ECONNREFUSED"));
    expect(await pingStorage()).toBe("error");
  });

  it("an idle-client pool error is logged by message only (and cannot crash the process)", async () => {
    process.env.DATABASE_URL = "postgres://mock/db";
    await pingStorage(); // constructs the pool
    const errorHandler = lastPool().on.mock.calls.find(([event]) => event === "error")?.[1] as ((err: Error) => void) | undefined;
    expect(errorHandler).toBeTypeOf("function");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    errorHandler!(new Error("terminating connection due to administrator command"));
    expect(spy).toHaveBeenCalledWith("[pg] idle client error:", "terminating connection due to administrator command");
  });

  it("the pool is built once and reused; closeStorage swallows a failing end() and the next call builds a fresh pool", async () => {
    process.env.DATABASE_URL = "postgres://mock/db";
    vi.mocked(Pool).mockClear();
    await pingStorage();
    await kvPersistAwait("sync", "k", 1);
    expect(Pool).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Pool).mock.calls[0]?.[0]).toMatchObject({
      connectionString: "postgres://mock/db", max: 5, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000, statement_timeout: 10_000
    });

    lastPool().end.mockRejectedValueOnce(new Error("pool already ended"));
    await expect(closeStorage()).resolves.toBeUndefined();
    await pingStorage();
    expect(Pool).toHaveBeenCalledTimes(2);
  });

  it("closeStorage with no pool is a no-op", async () => {
    delete process.env.DATABASE_URL;
    vi.mocked(Pool).mockClear();
    await expect(closeStorage()).resolves.toBeUndefined();
    expect(Pool).not.toHaveBeenCalled();
  });

  it("one namespace's hydrator throwing on a bad row does not stop the other namespaces from loading", async () => {
    // Before: a single hydrator throw aborted the whole replay loop, so every
    // namespace registered after it (in production order: auth → plaid →
    // billing → sync → family) booted empty although its rows were intact.
    process.env.DATABASE_URL = "postgres://mock/db";
    const rows = [
      { namespace: "hydtest-broken", key: "bad", value: null },
      { namespace: "hydtest-after", key: "good", value: { ok: true } }
    ];
    queryImpl = (sql) => Promise.resolve(sql.includes("SELECT") ? { rows } : { rows: [] });
    registerHydrator("hydtest-broken", (entries) => {
      for (const { value } of entries) void (value as { members: unknown[] }).members.length;
    });
    const after: unknown[] = [];
    registerHydrator("hydtest-after", (entries) => after.push(...entries));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await initStorage();

    expect(after).toEqual([{ key: "good", value: { ok: true } }]);
    // The failing namespace is named (never its keys or values), and the
    // summary counts only what was actually restored.
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toBe("[pg] rehydrate failed for one namespace; its rows stay in Postgres but were not loaded");
    expect(error.mock.calls[0]?.[1]).toEqual({ namespace: "hydtest-broken", error: expect.stringContaining("null") });
    expect(JSON.stringify(error.mock.calls)).not.toContain("bad");
    expect(log).toHaveBeenCalledWith("[pg] storage ready — rehydrated 1 record(s) from Postgres");
  });

  it("a hydrator that throws a non-Error is reported as its string", async () => {
    process.env.DATABASE_URL = "postgres://mock/db";
    const rows = [{ namespace: "hydtest-throws-string", key: "k", value: 1 }];
    queryImpl = (sql) => Promise.resolve(sql.includes("SELECT") ? { rows } : { rows: [] });
    registerHydrator("hydtest-throws-string", () => {
      throw "unexpected shape";
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    await initStorage();
    expect(error.mock.calls[0]?.[1]).toEqual({ namespace: "hydtest-throws-string", error: "unexpected shape" });
  });
});

describe("encryption keyring edge cases", () => {
  it("sealValue refuses to run without a usable primary key (callers must gate on encryptionConfigured)", () => {
    delete process.env.STORAGE_ENCRYPTION_KEY;
    delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
    expect(encryptionConfigured()).toBe(false);
    expect(() => sealValue({ a: 1 })).toThrow("sealValue requires STORAGE_ENCRYPTION_KEY");
  });

  it("a retired (previous) key never seals NEW data: without a valid primary, encryption is not configured, but old rows still open", () => {
    // Seal a row while TEST_KEY is the primary...
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
    const oldRow = sealValue({ accessToken: "old" });

    // ...then TEST_KEY is retired to PREVIOUS while the primary is missing
    // (unset, or a typo'd value). The module's contract: "Without a valid
    // primary key, encryption is 'not configured'". Before the fix the retired
    // key silently became the sealing key (and Plaid kept persisting with it,
    // while config.ts told the operator tokens stay in-memory only).
    process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS = TEST_KEY;
    for (const primary of [undefined, "typo-not-a-key"]) {
      if (primary === undefined) delete process.env.STORAGE_ENCRYPTION_KEY;
      else process.env.STORAGE_ENCRYPTION_KEY = primary;
      expect(encryptionConfigured(), String(primary)).toBe(false);
      expect(() => sealValue({ accessToken: "new" }), String(primary)).toThrow("sealValue requires STORAGE_ENCRYPTION_KEY");
      expect(openValue(oldRow), String(primary)).toEqual({ accessToken: "old" });
    }
  });

  it("openValue returns null for anything that is not an envelope, never throws", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    for (const stored of [null, undefined, "enc", 42, {}, { enc: 123 }, { kid: "abc" }]) {
      expect(openValue(stored), JSON.stringify(stored)).toBeNull();
    }
  });

  it("malformed or blank previous keys are skipped; a valid one in the list still opens old data", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
    const sealed = sealValue({ legacy: true });
    process.env.STORAGE_ENCRYPTION_KEY = ROTATED_KEY;
    process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS = ` not-a-key , ,${TEST_KEY}, `;
    expect(openValue(sealed)).toEqual({ legacy: true });
  });

  it("a value sealed without a kid (legacy row) still opens by trying every key in the ring", () => {
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    delete process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
    const { enc } = sealValue({ legacy: "no-kid" });
    process.env.STORAGE_ENCRYPTION_KEY = ROTATED_KEY;
    process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS = TEST_KEY;
    expect(openValue({ enc })).toEqual({ legacy: "no-kid" });
  });

  it("encryptionKeyStatus distinguishes unset, malformed and valid (hex or base64)", () => {
    delete process.env.STORAGE_ENCRYPTION_KEY;
    expect(encryptionKeyStatus()).toBe("unset");
    process.env.STORAGE_ENCRYPTION_KEY = "abc";
    expect(encryptionKeyStatus()).toBe("malformed");
    process.env.STORAGE_ENCRYPTION_KEY = TEST_KEY;
    expect(encryptionKeyStatus()).toBe("valid");
    process.env.STORAGE_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    expect(encryptionKeyStatus()).toBe("valid");
  });
});

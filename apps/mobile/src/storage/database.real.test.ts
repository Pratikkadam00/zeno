import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openRealSqlite, type ExecLog } from "./sqlite-adapter.testutil";

/**
 * database.ts against a REAL SQLite engine: the v1 migration from an empty
 * file, idempotent re-runs, the upgrade path for installs created before the
 * cancellation columns, the concurrent-migration guard, app_meta, and the
 * SQLCipher key statement (issued first, quotes escaped).
 */
const env = vi.hoisted(() => ({ db: null as ReturnType<typeof openRealSqlite> | null, key: "test-key", log: [] as string[] }));
vi.mock("expo-sqlite", () => ({ openDatabaseAsync: vi.fn(async () => env.db) }));
vi.mock("../security/secure-store", () => ({ getOrCreateDatabaseKey: vi.fn(async () => env.key) }));

type Db = Parameters<typeof import("./database")["runMigrations"]>[0];
const asDb = (d: ReturnType<typeof openRealSqlite>) => d as unknown as Db;
const tables = async (d: ReturnType<typeof openRealSqlite>) =>
  (await d.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")).map((r) => r.name);
const columns = async (d: ReturnType<typeof openRealSqlite>, table: string) =>
  (await d.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((r) => r.name);

let dir = "";
beforeEach(() => {
  vi.resetModules();
  env.log = [];
  env.key = "test-key";
  dir = mkdtempSync(join(tmpdir(), "zeno-db-"));
});
afterEach(() => {
  env.db?.raw.close();
  env.db = null;
  rmSync(dir, { recursive: true, force: true });
});

describe("runMigrations on a real SQLite file", () => {
  it("creates the full schema from an empty database and sets user_version = 2", async () => {
    const { runMigrations } = await import("./database");
    const d = openRealSqlite(join(dir, "a.db"));
    env.db = d;
    await runMigrations(asDb(d));
    expect(await tables(d)).toEqual(["app_meta", "audit_events", "import_batches", "notification_preferences", "renewal_events", "subscriptions", "sync_outbox", "user_profile"]);
    expect(await d.getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
    expect(await d.getFirstAsync("PRAGMA journal_mode")).toEqual({ journal_mode: "wal" });
    expect(await columns(d, "subscriptions")).toEqual(expect.arrayContaining(["cancellation_requested_at", "cancellation_verify_by", "paused_periods", "deleted_at", "version"]));
  });

  it("is idempotent: running again on a current database changes nothing", async () => {
    const { runMigrations } = await import("./database");
    const d = openRealSqlite(join(dir, "b.db"));
    env.db = d;
    await runMigrations(asDb(d));
    await d.runAsync("INSERT INTO app_meta (key, value) VALUES ('k', 'v')");
    await runMigrations(asDb(d));
    expect(await d.getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
    expect(await d.getFirstAsync("SELECT value FROM app_meta WHERE key = 'k'")).toEqual({ value: "v" });
  });

  it("upgrades an install created BEFORE the cancellation columns, keeping its data", async () => {
    const { runMigrations } = await import("./database");
    const d = openRealSqlite(join(dir, "c.db"));
    env.db = d;
    // The pre-lifecycle subscriptions table (user_version 0, no cancellation_* columns).
    await d.execAsync(`CREATE TABLE subscriptions (
      id TEXT PRIMARY KEY NOT NULL, service_slug TEXT, name TEXT NOT NULL, category TEXT NOT NULL,
      amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, billing_cycle TEXT NOT NULL,
      next_renewal_date TEXT, last_charged_date TEXT, status TEXT NOT NULL, owner_profile_id TEXT NOT NULL,
      value_rating TEXT, notes TEXT, muted_until TEXT, source TEXT NOT NULL, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, deleted_at TEXT, device_id TEXT, version INTEGER NOT NULL)`);
    await d.execAsync(`INSERT INTO subscriptions VALUES ('s1', NULL, 'Netflix', 'entertainment', 1549, 'USD', 'monthly', NULL, NULL, 'active', 'me', NULL, NULL, NULL, 'manual', 't', 't', NULL, NULL, 1)`);
    await runMigrations(asDb(d));
    expect(await columns(d, "subscriptions")).toEqual(expect.arrayContaining(["cancellation_requested_at", "cancellation_verify_by"]));
    expect(await d.getFirstAsync("SELECT name, amount_minor, cancellation_verify_by FROM subscriptions WHERE id = 's1'")).toEqual({ name: "Netflix", amount_minor: 1549, cancellation_verify_by: null });
    expect(await d.getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
  });

  it("F163: upgrades a version-1 install (no paused_periods column), keeping its data", async () => {
    const { runMigrations } = await import("./database");
    const d = openRealSqlite(join(dir, "v1.db"));
    env.db = d;
    // The version-1 subscriptions table: the cancellation columns, no paused_periods.
    await d.execAsync(`CREATE TABLE subscriptions (
      id TEXT PRIMARY KEY NOT NULL, service_slug TEXT, name TEXT NOT NULL, category TEXT NOT NULL,
      amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, billing_cycle TEXT NOT NULL,
      next_renewal_date TEXT, last_charged_date TEXT, status TEXT NOT NULL, owner_profile_id TEXT NOT NULL,
      value_rating TEXT, notes TEXT, muted_until TEXT, cancellation_requested_at TEXT, cancellation_verify_by TEXT,
      source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, device_id TEXT,
      version INTEGER NOT NULL)`);
    await d.execAsync(`INSERT INTO subscriptions VALUES ('s1', NULL, 'Netflix', 'entertainment', 1549, 'USD', 'monthly', NULL, NULL, 'paused', 'me', NULL, NULL, NULL, NULL, NULL, 'manual', 't', 't', NULL, NULL, 1)`);
    await d.execAsync("PRAGMA user_version = 1");
    await runMigrations(asDb(d));
    expect(await columns(d, "subscriptions")).toEqual(expect.arrayContaining(["paused_periods"]));
    expect(await d.getFirstAsync("SELECT name, status, paused_periods FROM subscriptions WHERE id = 's1'")).toEqual({ name: "Netflix", status: "paused", paused_periods: null });
    expect(await d.getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
  });

  it("F163: an upgrade interrupted after adding paused_periods but before saving the version finishes cleanly on the next open", async () => {
    const { runMigrations } = await import("./database");
    const d = openRealSqlite(join(dir, "interrupted.db"));
    env.db = d;
    await runMigrations(asDb(d)); // the column exists
    await d.execAsync("PRAGMA user_version = 1"); // ...but the version was never saved
    await d.runAsync("INSERT INTO app_meta (key, value) VALUES ('k', 'v')");
    await expect(runMigrations(asDb(d))).resolves.toBeUndefined();
    expect(await d.getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
    expect((await columns(d, "subscriptions")).filter((c) => c === "paused_periods")).toHaveLength(1);
    expect(await d.getFirstAsync("SELECT value FROM app_meta WHERE key = 'k'")).toEqual({ value: "v" });
  });

  it("two opens racing the same column add do not crash (the ALTER that loses is caught)", async () => {
    const { runMigrations } = await import("./database");
    const d = openRealSqlite(join(dir, "d.db"));
    env.db = d;
    await runMigrations(asDb(d)); // columns now exist
    await d.execAsync("PRAGMA user_version = 0");
    // Simulate the loser of the race: it read table_info BEFORE the winner's ALTER.
    const realGetAll = d.getAllAsync.bind(d);
    d.getAllAsync = (async (sql: string, ...v: unknown[]) =>
      sql.startsWith("PRAGMA table_info(subscriptions)") ? [{ name: "id" }] : realGetAll(sql, ...v)) as typeof d.getAllAsync;
    await expect(runMigrations(asDb(d))).resolves.toBeUndefined();
    expect(await d.getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
  });

  it("an empty user_version row is treated as version 0", async () => {
    const { runMigrations } = await import("./database");
    const d = openRealSqlite(join(dir, "e.db"));
    env.db = d;
    const realGetFirst = d.getFirstAsync.bind(d);
    d.getFirstAsync = (async (sql: string, ...v: unknown[]) => (sql === "PRAGMA user_version" ? null : realGetFirst(sql, ...v))) as typeof d.getFirstAsync;
    await runMigrations(asDb(d));
    d.getFirstAsync = realGetFirst;
    expect(await d.getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
  });
});

describe("app_meta", () => {
  it("reads null for a missing key, then round-trips and overwrites a value", async () => {
    const { runMigrations, readAppMeta, writeAppMeta } = await import("./database");
    const d = openRealSqlite(join(dir, "f.db"));
    env.db = d;
    await runMigrations(asDb(d));
    expect(await readAppMeta(asDb(d), "notification.quietHours.v1")).toBeNull();
    await writeAppMeta(asDb(d), "notification.quietHours.v1", '{"enabled":true}');
    await writeAppMeta(asDb(d), "notification.quietHours.v1", '{"enabled":false}');
    expect(await readAppMeta(asDb(d), "notification.quietHours.v1")).toBe('{"enabled":false}');
  });

  it("keys and values are bound parameters, never SQL (a hostile value is stored as text)", async () => {
    const { runMigrations, readAppMeta, writeAppMeta } = await import("./database");
    const d = openRealSqlite(join(dir, "g.db"));
    env.db = d;
    await runMigrations(asDb(d));
    const hostile = "x'); DROP TABLE subscriptions; --";
    await writeAppMeta(asDb(d), hostile, hostile);
    expect(await readAppMeta(asDb(d), hostile)).toBe(hostile);
    expect(await tables(d)).toContain("subscriptions");
  });
});

describe("openZenoDatabase — the SQLCipher key", () => {
  it("issues PRAGMA key FIRST, with the secure-store key, single quotes escaped, then migrates", async () => {
    const log: ExecLog = [];
    env.key = "k'ey''with'quotes";
    env.db = openRealSqlite(join(dir, "h.db"), log);
    const { openZenoDatabase } = await import("./database");
    const db = await openZenoDatabase();
    expect(log[0]).toBe("PRAGMA key = 'k''ey''''with''quotes';");
    expect(log[1]).toBe("PRAGMA journal_mode = WAL;");
    expect(await (db as unknown as ReturnType<typeof openRealSqlite>).getFirstAsync("PRAGMA user_version")).toEqual({ user_version: 2 });
  });
});

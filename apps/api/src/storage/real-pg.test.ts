import { generateKeyPairSync } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startRealPg, type RealPg } from "./real-pg.testutil";

// FIXED signing keys, as in production. Without them every boot generates an
// ephemeral key pair, so after a "restart" every old token would fail on its
// signature alone, and a test of revocation across restarts would prove
// nothing.
const signingKeys = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

/**
 * P2.1: the API against a REAL Postgres (PGlite locally, a postgres server in
 * CI; see real-pg.testutil.ts). Every other suite runs the stores in memory;
 * here each write goes through storage/pg.ts's real pool and SQL, and every
 * "restart" is a genuinely fresh module graph that rebuilds its state ONLY from
 * the rows in the database, exactly what a deploy does.
 */
let db: RealPg;
const saved: Record<string, string | undefined> = {};
function setEnv(key: string, value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

beforeAll(async () => {
  db = await startRealPg();
}, 60_000);
afterAll(async () => {
  await db?.stop();
});

type Booted = {
  app: Awaited<ReturnType<typeof import("../app")["buildApp"]>>;
  pg: typeof import("./pg");
  plaid: typeof import("../plaid");
};
const running: Booted[] = [];

/** A fresh process: new module instances, storage initialised from the DB. */
async function boot(): Promise<Booted> {
  vi.resetModules();
  const { buildApp } = await import("../app");
  const pg = await import("./pg");
  const plaid = await import("../plaid");
  await pg.initStorage();
  const app = await buildApp();
  const booted = { app, pg, plaid };
  running.push(booted);
  return booted;
}
async function shutdown(b: Booted) {
  await b.app.close();
  await b.pg.closeStorage();
  running.splice(running.indexOf(b), 1);
}

beforeEach(async () => {
  setEnv("DATABASE_URL", db.url);
  setEnv("DATABASE_SSL", "disable");
  setEnv("STORAGE_ENCRYPTION_KEY", "11".repeat(32));
  setEnv("REVENUECAT_WEBHOOK_AUTH", "hook-secret");
  setEnv("RESEND_API_KEY", undefined);
  setEnv("JWT_PRIVATE_KEY", signingKeys.privateKey);
  setEnv("JWT_PUBLIC_KEY", signingKeys.publicKey);
  await db.query("DROP TABLE IF EXISTS kv_store");
});
afterEach(async () => {
  for (const b of [...running]) await shutdown(b);
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
    delete saved[k];
  }
});

async function signIn(app: Booted["app"], email: string) {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const devLink = requested.json().data.devLink as string;
  const raw = decodeURIComponent(devLink.split("token=")[1]!);
  const data = (await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}` })).json().data;
  return { token: data.accessToken as string, refreshToken: data.refreshToken as string, accountId: data.accountId as string };
}
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const change = (entityId: string, v: number, payload: string) => ({
  entityType: "subscription" as const, entityId, operation: "update" as const, encryptedPayload: payload, vectorClock: { deviceA: v }
});
async function rows() {
  return db.query<{ namespace: string; key: string; value: unknown }>("SELECT namespace, key, value FROM kv_store ORDER BY namespace, key");
}
/** Fire-and-forget writes land asynchronously; wait for the DB to show them. */
async function until(check: () => Promise<boolean>, what: string, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`timed out waiting for: ${what}`);
}

describe(`real Postgres (${process.env.TEST_DATABASE_URL ? "server" : "PGlite"})`, () => {
  it("in CI this suite runs against a real Postgres SERVER, not the embedded PGlite (so a green CI run proves it)", async () => {
    const [row] = await db.query<{ version: string }>("SELECT version()");
    const version = row?.version ?? "";
    if (process.env.CI) {
      expect(db.kind).toBe("server");
      expect(version).toMatch(/^PostgreSQL \d+/);
      expect(version).not.toContain("PGlite");
    } else {
      expect(version).toMatch(/^PostgreSQL \d+/);
    }
  });

  it("creates the schema from an EMPTY database, and a second boot is idempotent", async () => {
    const tables = async () => db.query<{ n: string }>("SELECT count(*)::text AS n FROM information_schema.tables WHERE table_name = 'kv_store'");
    expect((await tables())[0]!.n).toBe("0");
    const first = await boot();
    expect((await tables())[0]!.n).toBe("1");
    const columns = await db.query<{ column_name: string; data_type: string; is_nullable: string }>(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'kv_store' ORDER BY ordinal_position"
    );
    expect(columns).toEqual([
      { column_name: "namespace", data_type: "text", is_nullable: "NO" },
      { column_name: "key", data_type: "text", is_nullable: "NO" },
      { column_name: "value", data_type: "jsonb", is_nullable: "NO" },
      { column_name: "updated_at", data_type: "timestamp with time zone", is_nullable: "NO" }
    ]);
    const pk = await db.query<{ column_name: string }>(
      `SELECT a.attname AS column_name FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = 'kv_store'::regclass AND i.indisprimary ORDER BY a.attname`
    );
    expect(pk.map((r) => r.column_name)).toEqual(["key", "namespace"]);
    await shutdown(first);
    await boot(); // CREATE TABLE IF NOT EXISTS on an existing table
    expect((await tables())[0]!.n).toBe("1");
  });

  it("the (namespace, key) primary key upserts: concurrent writes of one key leave ONE row with the last value", async () => {
    const { pg } = await boot();
    await Promise.all([1, 2, 3, 4, 5].map((n) => pg.kvPersistAwait("t", "same-key", { n })));
    const all = (await rows()).filter((r) => r.namespace === "t");
    expect(all).toHaveLength(1);
    await expect(db.query("INSERT INTO kv_store (namespace, key, value) VALUES ('t', 'same-key', '{}'::jsonb)")).rejects.toThrow(/duplicate key|unique/i);
  });

  it("a restart rebuilds every store from the database alone: session, household, sync, entitlement, sealed bank token", async () => {
    const first = await boot();
    const me = await signIn(first.app, "restart@zeno.test");
    const household = (await first.app.inject({ method: "POST", url: "/api/v1/family/create", headers: auth(me.token), payload: { ownerName: "Me", monthlySpendMinor: 4200, currency: "EUR" } })).json().data.household;
    const pushed = await first.app.inject({ method: "POST", url: "/api/v1/sync/push", headers: auth(me.token), payload: { encryptedChanges: [change("sub_1", 3, "cipher-v3")] } });
    expect(pushed.json().data.accepted).toBe(1);
    await first.app.inject({ method: "POST", url: "/api/v1/billing/webhook", headers: { authorization: "Bearer hook-secret" }, payload: { event: { app_user_id: me.accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } } });
    first.plaid.storePlaidItem(me.accountId, { accessToken: "access-bank-credential", itemId: "item-1" });
    await until(async () => (await rows()).some((r) => r.namespace === "plaid") && (await rows()).some((r) => r.namespace === "billing") && (await rows()).some((r) => r.namespace === "family"), "fire-and-forget writes");

    // The bank credential is only ever stored sealed.
    const plaidRow = (await rows()).find((r) => r.namespace === "plaid")!;
    expect(JSON.stringify(plaidRow.value)).not.toContain("access-bank-credential");
    expect(plaidRow.value).toEqual({ enc: expect.any(String), kid: expect.any(String) });
    await shutdown(first);

    const second = await boot();
    const refreshed = await second.app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken: me.refreshToken } });
    expect(refreshed.statusCode).toBe(200);
    const token = refreshed.json().data.accessToken as string;
    const restoredHousehold = await second.app.inject({ method: "GET", url: `/api/v1/family/${household.id}`, headers: auth(token) });
    expect(restoredHousehold.json().data.household).toMatchObject({ id: household.id, shareCode: household.shareCode, ownerId: me.accountId });
    const pulled = await second.app.inject({ method: "GET", url: "/api/v1/sync/pull", headers: auth(token) });
    expect(pulled.json().data.encryptedChanges.map((c: { entityId: string; encryptedPayload: string }) => [c.entityId, c.encryptedPayload])).toEqual([["sub_1", "cipher-v3"]]);
    const entitlement = await second.app.inject({ method: "GET", url: "/api/v1/billing/entitlement", headers: auth(token) });
    expect(entitlement.json().data).toMatchObject({ plan: "pro", active: true });
    expect(second.plaid.getStoredPlaidItem(me.accountId)).toEqual({ accessToken: "access-bank-credential", itemId: "item-1" });
  });

  it("F81: a sign-in record that expired while the process was down is DELETED at boot, not just skipped; a live one loads", async () => {
    await shutdown(await boot()); // creates the schema
    const past = Date.now() - 1000;
    const future = Date.now() + 60 * 60 * 1000;
    const insert = (namespace: string, key: string, value: unknown) =>
      db.query("INSERT INTO kv_store (namespace, key, value) VALUES ($1, $2, $3::jsonb)", [namespace, key, JSON.stringify(value)]);
    const staleBudget = "f".repeat(64);
    await insert("auth_refresh", "stale-refresh", { accountId: "acct_s", email: "gone@zeno.test", provider: "magic_link", expiresAt: past, rotatedAt: null });
    await insert("auth_refresh", "live-refresh", { accountId: "acct_l", email: "here@zeno.test", provider: "magic_link", expiresAt: future, rotatedAt: null });
    await insert("auth_magic", "stale-link", { accountId: "acct_s", email: "gone@zeno.test", tokenHash: "stale-link", code: "123456", expiresAt: past });
    await insert("auth_legacy", "gone@zeno.test", { accountId: "acct_s", email: "gone@zeno.test", tokenHash: "stale-link", code: "123456", expiresAt: past });
    await insert("auth_code_fail", staleBudget, { accountId: "acct_s", count: 10, reset: past });
    await boot();
    await until(async () => !(await rows()).some((r) => r.key.startsWith("stale") || r.key === "gone@zeno.test" || r.key === staleBudget), "the expired rows deleted");
    expect((await rows()).map((r) => `${r.namespace}:${r.key}`)).toEqual(["auth_refresh:live-refresh"]);
  });

  it("DELETE /account: once it answers, NO row of that user remains in the database, and other users are untouched", async () => {
    const { app, plaid } = await boot();
    const alice = await signIn(app, "alice@zeno.test");
    const bob = await signIn(app, "bob@zeno.test");
    // Alice: a pending magic link + code (and one wrong guess at it, which opens
    // her wrong-guess budget, F80), two sessions, an owned household Bob joined,
    // a solo household, sync rows, an entitlement, a sealed bank token.
    const pending = (await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email: "alice@zeno.test" } })).json().data as { devCode: string };
    await app.inject({ method: "POST", url: "/api/v1/auth/magic-link/verify", payload: { email: "alice@zeno.test", code: pending.devCode === "000000" ? "000001" : "000000" } });
    const shared = (await app.inject({ method: "POST", url: "/api/v1/family/create", headers: auth(alice.token), payload: { ownerName: "Alice" } })).json().data.household;
    await app.inject({ method: "POST", url: "/api/v1/family/join", headers: auth(bob.token), payload: { shareCode: shared.shareCode, memberName: "Bob" } });
    await app.inject({ method: "POST", url: "/api/v1/family/create", headers: auth(alice.token), payload: { ownerName: "Alice solo" } });
    await app.inject({ method: "POST", url: "/api/v1/sync/push", headers: auth(alice.token), payload: { encryptedChanges: [change("a1", 1, "alice-cipher"), change("a2", 1, "alice-cipher-2")] } });
    await app.inject({ method: "POST", url: "/api/v1/sync/push", headers: auth(bob.token), payload: { encryptedChanges: [change("b1", 1, "bob-cipher")] } });
    await app.inject({ method: "POST", url: "/api/v1/billing/webhook", headers: { authorization: "Bearer hook-secret" }, payload: { event: { app_user_id: alice.accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } } });
    plaid.storePlaidItem(alice.accountId, { accessToken: "alice-bank", itemId: "item-a" });
    await until(async () => (await rows()).some((r) => r.namespace === "plaid") && (await rows()).filter((r) => r.namespace === "family").length === 2 && (await rows()).some((r) => r.namespace === "billing") && (await rows()).some((r) => r.namespace === "auth_code_fail"), "Alice's data in every namespace");
    const aliceRow = (r: { key: string; value: unknown }) => `${r.key} ${JSON.stringify(r.value)}`.includes(alice.accountId) || `${r.key} ${JSON.stringify(r.value)}`.includes("alice@zeno.test");
    expect(new Set((await rows()).filter(aliceRow).map((r) => r.namespace))).toEqual(new Set(["auth_code_fail", "auth_legacy", "auth_magic", "auth_refresh", "billing", "family", "plaid", "sync"]));

    const deleted = await app.inject({ method: "DELETE", url: "/api/v1/account", headers: auth(alice.token) });
    expect(deleted.json().data).toEqual({ deleted: true });
    // Checked IMMEDIATELY: the user was just told their data is gone.
    const left = (await rows()).filter(aliceRow);
    expect(left.map((r) => r.namespace)).toEqual([]);

    // F76: Alice's old token is dead, and stays dead across a restart; the
    // durable cut-off record holds no account id.
    expect((await app.inject({ method: "GET", url: "/api/v1/sync/pull", headers: auth(alice.token) })).statusCode).toBe(401);
    const tombstones = (await rows()).filter((r) => r.namespace === "auth_revoked");
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]!.key).toMatch(/^[0-9a-f]{64}$/);
    expect(tombstones[0]!.value).toEqual({ revokedAtSeconds: expect.any(Number) });

    // Bob keeps his session, his sync row, and the shared household (now his).
    const bobRows = (await rows()).filter((r) => `${r.key} ${JSON.stringify(r.value)}`.includes(bob.accountId));
    expect(new Set(bobRows.map((r) => r.namespace))).toEqual(new Set(["auth_refresh", "family", "sync"]));
    const familyRow = (await rows()).find((r) => r.namespace === "family")!;
    expect(familyRow.value).toMatchObject({ ownerId: bob.accountId });
  });

  it("F75: DELETE /account answers only once every deletion is DURABLE, even when the database is slow", async () => {
    const { app, plaid } = await boot();
    const alice = await signIn(app, "slow-alice@zeno.test");
    const bob = await signIn(app, "slow-bob@zeno.test");
    const shared = (await app.inject({ method: "POST", url: "/api/v1/family/create", headers: auth(alice.token), payload: { ownerName: "Alice" } })).json().data.household;
    await app.inject({ method: "POST", url: "/api/v1/family/join", headers: auth(bob.token), payload: { shareCode: shared.shareCode, memberName: "Bob" } });
    await app.inject({ method: "POST", url: "/api/v1/sync/push", headers: auth(alice.token), payload: { encryptedChanges: [change("a1", 1, "alice-cipher")] } });
    await app.inject({ method: "POST", url: "/api/v1/billing/webhook", headers: { authorization: "Bearer hook-secret" }, payload: { event: { app_user_id: alice.accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } } });
    plaid.storePlaidItem(alice.accountId, { accessToken: "alice-bank", itemId: "item-a" });
    await until(async () => ["plaid", "billing", "family", "sync"].every((ns) => rows().then((all) => all.some((r) => r.namespace === ns))), "Alice's data persisted");

    // A slow, uneven database, as on a real server where each pooled
    // connection finishes in its own time: writes outside the auth namespaces
    // take 500 ms to land, auth writes are instant. (A uniform delay would hide
    // the bug: the unawaited deletes start first and would finish first.) The
    // API's pool and this test's pool share the pg module; only writes are
    // delayed, and this test itself only reads.
    const pgModule = await import("pg");
    const Pool = pgModule.default.Pool;
    const original = Pool.prototype.query;
    Pool.prototype.query = function (this: unknown, ...args: unknown[]) {
      const text = typeof args[0] === "string" ? args[0] : "";
      const namespace = Array.isArray(args[1]) ? String(args[1][0]) : "";
      if (/^\s*(DELETE|INSERT)/i.test(text) && !namespace.startsWith("auth_")) {
        return new Promise((resolve) => setTimeout(resolve, 500)).then(() => (original as (...a: unknown[]) => unknown).apply(this, args));
      }
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    } as typeof original;
    try {
      const deleted = await app.inject({ method: "DELETE", url: "/api/v1/account", headers: auth(alice.token) });
      expect(deleted.json().data).toEqual({ deleted: true });
      const aliceRow = (r: { key: string; value: unknown }) => `${r.key} ${JSON.stringify(r.value)}`.includes(alice.accountId);
      // The moment the API says "deleted", nothing of Alice's may still be in
      // the database: a crash now would otherwise resurrect it on the next boot.
      expect((await rows()).filter(aliceRow).map((r) => r.namespace)).toEqual([]);
    } finally {
      Pool.prototype.query = original;
    }
  });

  it("F75: a REFUSED deletion answers 503 (so the app keeps its data), and a retry finds and deletes whatever is left", async () => {
    const { app, plaid } = await boot();
    const alice = await signIn(app, "retry-alice@zeno.test");
    await app.inject({ method: "POST", url: "/api/v1/sync/push", headers: auth(alice.token), payload: { encryptedChanges: [change("r1", 1, "c1"), change("r2", 1, "c2")] } });
    await app.inject({ method: "POST", url: "/api/v1/family/create", headers: auth(alice.token), payload: { ownerName: "Alice" } });
    await app.inject({ method: "POST", url: "/api/v1/billing/webhook", headers: { authorization: "Bearer hook-secret" }, payload: { event: { app_user_id: alice.accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } } });
    plaid.storePlaidItem(alice.accountId, { accessToken: "a-bank", itemId: "i" });
    await until(async () => ["plaid", "billing", "family", "sync"].every((ns) => rows().then((all) => all.some((r) => r.namespace === ns))), "Alice's data persisted");
    const aliceRows = async () => (await rows()).filter((r) => `${r.key} ${JSON.stringify(r.value)}`.includes(alice.accountId));

    // The database refuses every delete of the sync namespace, once each.
    const pgModule = await import("pg");
    const Pool = pgModule.default.Pool;
    const original = Pool.prototype.query;
    let refuse = true;
    Pool.prototype.query = function (this: unknown, ...args: unknown[]) {
      const text = typeof args[0] === "string" ? args[0] : "";
      const namespace = Array.isArray(args[1]) ? String(args[1][0]) : "";
      if (refuse && text.startsWith("DELETE") && namespace === "sync") {
        return Promise.reject(new Error("simulated: database refused the delete"));
      }
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    } as typeof original;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const first = await app.inject({ method: "DELETE", url: "/api/v1/account", headers: auth(alice.token) });
      expect(first.statusCode).toBe(503);
      expect(first.json().error).toEqual({ code: "SERVICE_UNAVAILABLE", message: "Account deletion could not be completed. Please try again." });
      expect((await aliceRows()).map((r) => r.namespace)).toEqual(["sync", "sync"]);
      // The failure is logged by namespace and field only: never the account id.
      expect(JSON.stringify(consoleError.mock.calls)).toContain("delete-by-field failed");
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(alice.accountId);
    } finally {
      refuse = false;
      Pool.prototype.query = original;
    }
    // Memory has already forgotten Alice's sync rows; the retry still removes them.
    const retry = await app.inject({ method: "DELETE", url: "/api/v1/account", headers: auth(alice.token) });
    expect(retry.json().data).toEqual({ deleted: true });
    expect(await aliceRows()).toEqual([]);
  });

  it("F75: a refused HOUSEHOLD rewrite also answers 503, and the retry removes the user from it (memory was put back)", async () => {
    const { app } = await boot();
    const alice = await signIn(app, "hh-alice@zeno.test");
    const bob = await signIn(app, "hh-bob@zeno.test");
    const shared = (await app.inject({ method: "POST", url: "/api/v1/family/create", headers: auth(alice.token), payload: { ownerName: "Alice" } })).json().data.household;
    await app.inject({ method: "POST", url: "/api/v1/family/join", headers: auth(bob.token), payload: { shareCode: shared.shareCode, memberName: "Bob" } });
    await until(async () => (await rows()).some((r) => r.namespace === "family" && JSON.stringify(r.value).includes(bob.accountId)), "the joined household persisted");

    const pgModule = await import("pg");
    const Pool = pgModule.default.Pool;
    const original = Pool.prototype.query;
    let refuse = true;
    Pool.prototype.query = function (this: unknown, ...args: unknown[]) {
      const text = typeof args[0] === "string" ? args[0] : "";
      const namespace = Array.isArray(args[1]) ? String(args[1][0]) : "";
      if (refuse && text.startsWith("INSERT") && namespace === "family") {
        return Promise.reject(new Error("simulated: database refused the write"));
      }
      return (original as (...a: unknown[]) => unknown).apply(this, args);
    } as typeof original;
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const first = await app.inject({ method: "DELETE", url: "/api/v1/account", headers: auth(alice.token) });
      expect(first.statusCode).toBe(503);
      const familyRow = (await rows()).find((r) => r.namespace === "family")!;
      expect(JSON.stringify(familyRow.value)).toContain(alice.accountId); // not yet removed in the DB...
      const asBob = await app.inject({ method: "GET", url: `/api/v1/family/${shared.id}`, headers: auth(bob.token) });
      expect(asBob.json().data.household.members.map((m: { id: string }) => m.id)).toContain(alice.accountId); // ...and memory agrees
    } finally {
      refuse = false;
      Pool.prototype.query = original;
    }
    const retry = await app.inject({ method: "DELETE", url: "/api/v1/account", headers: auth(alice.token) });
    expect(retry.json().data).toEqual({ deleted: true });
    const familyRow = (await rows()).find((r) => r.namespace === "family")!;
    expect(JSON.stringify(familyRow.value)).not.toContain(alice.accountId);
    expect(familyRow.value).toMatchObject({ ownerId: bob.accountId });
  });

  it("F76: after a restart, a deleted account's old access token is still rejected (the cut-off is durable)", async () => {
    const first = await boot();
    const me = await signIn(first.app, "tombstone@zeno.test");
    expect((await first.app.inject({ method: "DELETE", url: "/api/v1/account", headers: auth(me.token) })).json().data).toEqual({ deleted: true });
    await shutdown(first);
    const second = await boot();
    const write = await second.app.inject({ method: "POST", url: "/api/v1/sync/push", headers: auth(me.token), payload: { encryptedChanges: [change("ghost", 1, "x")] } });
    expect(write.statusCode).toBe(401);
    expect((await rows()).filter((r) => r.namespace === "sync")).toEqual([]);
  });

  it("refresh-token rotation race: two concurrent refreshes of one token, exactly one wins, and the loss is durable across a restart", async () => {
    const first = await boot();
    const me = await signIn(first.app, "race@zeno.test");
    const results = await Promise.all([1, 2].map(() => first.app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken: me.refreshToken } })));
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 401]);
    const winner = results.find((r) => r.statusCode === 200)!.json().data.refreshToken as string;
    await shutdown(first);

    const second = await boot();
    const replay = await second.app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken: me.refreshToken } });
    expect(replay.statusCode).toBe(401);
    const next = await second.app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken: winner } });
    expect(next.statusCode).toBe(200);
  });

  it("sync/push is idempotent under concurrent replays: one entity, one row, one version, before and after a restart", async () => {
    const first = await boot();
    const me = await signIn(first.app, "replay@zeno.test");
    const push = () => first.app.inject({ method: "POST", url: "/api/v1/sync/push", headers: auth(me.token), payload: { encryptedChanges: [change("sub_r", 7, "cipher-7")] } });
    const replies = await Promise.all([push(), push(), push(), push(), push()]);
    expect(replies.every((r) => r.statusCode === 200)).toBe(true);
    const syncRows = (await rows()).filter((r) => r.namespace === "sync");
    expect(syncRows).toHaveLength(1);
    expect(syncRows[0]!.value).toMatchObject({ entityId: "sub_r", encryptedPayload: "cipher-7", version: 7 });
    const pullOnce = async (b: Booted, token: string) => (await b.app.inject({ method: "GET", url: "/api/v1/sync/pull", headers: auth(token) })).json().data.encryptedChanges;
    expect(await pullOnce(first, me.token)).toHaveLength(1);
    await shutdown(first);

    const second = await boot();
    const refreshed = (await second.app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken: me.refreshToken } })).json().data.accessToken;
    const after = await pullOnce(second, refreshed);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ entityId: "sub_r", encryptedPayload: "cipher-7" });
  });
});

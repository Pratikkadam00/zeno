// Optional Postgres persistence for the API's per-process stores.
//
// The stores (sync, billing, family, auth sessions) keep their working set in
// memory for fast synchronous access. When DATABASE_URL is set (e.g. Render
// Postgres), this module mirrors every write into a single kv_store table and
// replays all rows back into those in-memory maps on boot — so a deploy or
// restart no longer drops cloud-sync blobs, entitlements, households, or
// logged-in sessions.
//
// Without DATABASE_URL every function here is a no-op, so local dev and the test
// suite run exactly as before: pure in-memory, no external dependency.
//
// Single-instance model: reads stay in memory (node-local), so this buys
// durability across restarts, not cross-replica consistency. Render's free tier
// runs one instance; horizontal scale-out would need async reads (see
// SECURITY.md). Writes are fire-and-forget — a persistence failure logs and is
// swallowed so it can never break a request whose in-memory write already
// succeeded.

import { Pool } from "pg";

export type StoredEntry = { key: string; value: unknown };
type Hydrator = (entries: StoredEntry[]) => void;

const hydrators = new Map<string, Hydrator>();

/** A store module calls this at import time to register how it rebuilds its
 *  in-memory state from the rows persisted under its namespace. */
export function registerHydrator(namespace: string, hydrate: Hydrator): void {
  hydrators.set(namespace, hydrate);
}

export function pgEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!pgEnabled()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Render (and most hosted Postgres) require TLS; their managed certs aren't
      // in Node's trust store, so relax verification rather than ship a CA bundle.
      // Set DATABASE_SSL=disable for a local Postgres without TLS.
      ssl: process.env.DATABASE_SSL === "disable" ? undefined : { rejectUnauthorized: false },
      max: 5
    });
    pool.on("error", (err) => console.error("[pg] idle client error:", err.message));
  }
  return pool;
}

/** Mirror a single key's latest value (upsert). Fire-and-forget. */
export function kvPersist(namespace: string, key: string, value: unknown): void {
  const p = getPool();
  if (!p) return;
  p.query(
    `INSERT INTO kv_store (namespace, key, value, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [namespace, key, JSON.stringify(value)]
  ).catch((err) => console.error(`[pg] persist ${namespace}/${key} failed:`, err.message));
}

/** Remove a single key. Fire-and-forget. */
export function kvDelete(namespace: string, key: string): void {
  const p = getPool();
  if (!p) return;
  p.query("DELETE FROM kv_store WHERE namespace = $1 AND key = $2", [namespace, key])
    .catch((err) => console.error(`[pg] delete ${namespace}/${key} failed:`, err.message));
}

/** Drop an entire namespace (used by the test/maintenance clear* helpers). */
export async function kvClear(namespace: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query("DELETE FROM kv_store WHERE namespace = $1", [namespace]);
  } catch (err) {
    console.error(`[pg] clear ${namespace} failed:`, (err as Error).message);
  }
}

let initialized = false;

/** Ensure the table exists and replay every persisted row into the registered
 *  in-memory stores. Call once at boot. No-op without DATABASE_URL; if the
 *  database is unreachable it logs and continues in-memory-only so the server
 *  still starts. */
export async function initStorage(): Promise<void> {
  const p = getPool();
  if (!p || initialized) return;
  initialized = true;
  try {
    await p.query(`CREATE TABLE IF NOT EXISTS kv_store (
      namespace text NOT NULL,
      key text NOT NULL,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (namespace, key)
    )`);
    const { rows } = await p.query<{ namespace: string; key: string; value: unknown }>(
      "SELECT namespace, key, value FROM kv_store"
    );
    const byNamespace = new Map<string, StoredEntry[]>();
    for (const row of rows) {
      const list = byNamespace.get(row.namespace) ?? [];
      list.push({ key: row.key, value: row.value });
      byNamespace.set(row.namespace, list);
    }
    let restored = 0;
    for (const [namespace, hydrate] of hydrators) {
      const entries = byNamespace.get(namespace) ?? [];
      if (entries.length) {
        hydrate(entries);
        restored += entries.length;
      }
    }
    console.log(`[pg] storage ready — rehydrated ${restored} record(s) from Postgres`);
  } catch (err) {
    console.error("[pg] initStorage failed; continuing in-memory only:", (err as Error).message);
  }
}

/** Close the pool (graceful shutdown / test teardown). */
export async function closeStorage(): Promise<void> {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
    initialized = false;
  }
}

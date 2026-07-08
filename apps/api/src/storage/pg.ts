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

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
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
      max: 5,
      // Fail fast on a degraded DB instead of hanging: give up connecting after
      // 5s, reap idle clients after 30s, and cap any single statement at 10s.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 10_000
    });
    pool.on("error", (err) => console.error("[pg] idle client error:", err.message));
  }
  return pool;
}

/** Mirror a single key's latest value (upsert), awaiting until the row has
 *  landed (or the attempt failed — errors are logged, never thrown, so a DB blip
 *  degrades to in-memory rather than failing the request). Use this for writes
 *  whose durability must be confirmed before the request is acked (auth
 *  sessions, sync). No-op without a configured DB. */
export async function kvPersistAwait(namespace: string, key: string, value: unknown): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO kv_store (namespace, key, value, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [namespace, key, JSON.stringify(value)]
    );
  } catch (err) {
    console.error(`[pg] persist ${namespace}/${key} failed:`, (err as Error).message);
  }
}

/** Mirror a single key's latest value (upsert). Fire-and-forget — the in-memory
 *  write already succeeded, so a persistence failure must never break the
 *  request. Use kvPersistAwait where durability must be confirmed before acking. */
export function kvPersist(namespace: string, key: string, value: unknown): void {
  void kvPersistAwait(namespace, key, value);
}

/** Remove a single key, awaiting until the row is gone (or the attempt failed —
 *  errors are logged, never thrown). Use this wherever revocation must be
 *  durable before the caller acks success (refresh-token logout/deletion) —
 *  otherwise a crash between the in-memory delete and this write landing could
 *  let a "revoked" token get replayed back into memory on the next restart. */
export async function kvDeleteAwait(namespace: string, key: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query("DELETE FROM kv_store WHERE namespace = $1 AND key = $2", [namespace, key]);
  } catch (err) {
    console.error(`[pg] delete ${namespace}/${key} failed:`, (err as Error).message);
  }
}

/** Remove a single key. Fire-and-forget — use kvDeleteAwait where the caller
 *  must not ack success before the delete is durable. */
export function kvDelete(namespace: string, key: string): void {
  void kvDeleteAwait(namespace, key);
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

// ── Encryption at rest (for secrets like Plaid bank-access tokens) ──────────
// AES-256-GCM with a random 96-bit IV per value; the sealed envelope is
// iv(12) || tag(16) || ciphertext, base64-encoded inside a { enc, kid } object
// so it stays valid jsonb. `kid` is a short, non-secret fingerprint of the key
// that sealed it, so rotation is NON-destructive: set STORAGE_ENCRYPTION_KEY to
// the new key and STORAGE_ENCRYPTION_KEYS_PREVIOUS (comma-separated) to the old
// one(s). New data is sealed with the primary key; old data still opens with a
// previous key until it ages out. Keys are 32 bytes as 64 hex chars or base64.
// Without a valid primary key, encryption is "not configured" and callers that
// require it (Plaid) keep their data in-memory only.

function parseKey(raw: string): Buffer | null {
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

// A stable, non-secret 8-hex-char fingerprint identifying which key sealed a value.
function keyFingerprint(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 8);
}

// The primary (current) key first, then any previous keys — the decryption ring.
function encryptionKeyring(): Buffer[] {
  const keys: Buffer[] = [];
  const primary = process.env.STORAGE_ENCRYPTION_KEY;
  if (primary) {
    const k = parseKey(primary);
    if (k) keys.push(k);
  }
  const previous = process.env.STORAGE_ENCRYPTION_KEYS_PREVIOUS;
  if (previous) {
    for (const raw of previous.split(",").map((s) => s.trim()).filter(Boolean)) {
      const k = parseKey(raw);
      if (k) keys.push(k);
    }
  }
  return keys;
}

export function encryptionConfigured(): boolean {
  return encryptionKeyring().length > 0;
}

// Boot-time diagnostic for STORAGE_ENCRYPTION_KEY: distinguishes "unset" from
// "set but malformed" so config validation can warn/fail on a typo'd key that
// would otherwise be silently ignored (falling back to in-memory Plaid tokens).
export function encryptionKeyStatus(): "valid" | "malformed" | "unset" {
  const primary = process.env.STORAGE_ENCRYPTION_KEY;
  if (!primary) return "unset";
  return parseKey(primary) ? "valid" : "malformed";
}

/** Seal an object into an encrypted envelope with the primary key. Throws if no
 *  key is configured — callers must gate on encryptionConfigured() first. */
export function sealValue(value: unknown): { enc: string; kid: string } {
  const key = encryptionKeyring()[0];
  if (!key) throw new Error("sealValue requires STORAGE_ENCRYPTION_KEY");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(value), "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { enc: Buffer.concat([iv, tag, ciphertext]).toString("base64"), kid: keyFingerprint(key) };
}

function tryDecrypt(enc: string, key: Buffer): unknown | null {
  try {
    const buf = Buffer.from(enc, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const plaintext = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8"));
  } catch {
    return null;
  }
}

/** Open a sealed envelope, trying the key named by `kid` first and then every
 *  key in the ring (so a rotated key or a legacy kid-less row still opens).
 *  Returns null if no key decrypts it (missing/rotated key or tamper) — never throws. */
export function openValue(stored: unknown): unknown | null {
  const envelope = stored as { enc?: unknown; kid?: unknown };
  const enc = envelope?.enc;
  if (typeof enc !== "string") return null;
  const keyring = encryptionKeyring();
  if (keyring.length === 0) return null;
  const kid = typeof envelope.kid === "string" ? envelope.kid : null;
  const ordered = kid
    ? [...keyring].sort((a, b) => Number(keyFingerprint(b) === kid) - Number(keyFingerprint(a) === kid))
    : keyring;
  for (const key of ordered) {
    const result = tryDecrypt(enc, key);
    if (result !== null) return result;
  }
  return null;
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

/** Readiness check: "skipped" when no DB is configured (in-memory mode is a
 *  valid ready state), "ok" when a trivial query succeeds, "error" when the DB
 *  is configured but unreachable. Used by the /health/ready probe. */
export async function pingStorage(): Promise<"ok" | "skipped" | "error"> {
  const p = getPool();
  if (!p) return "skipped";
  try {
    await p.query("SELECT 1");
    return "ok";
  } catch {
    return "error";
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

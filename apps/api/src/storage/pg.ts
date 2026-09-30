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

// TLS to Postgres — three explicit modes, chosen with DATABASE_SSL:
//
//  - "require" (default): encrypt, but do NOT verify the server certificate.
//    This is what Render's INTERNAL connection string needs (render.yaml wires
//    `fromDatabase.connectionString`). Render's docs, verbatim: "Because these
//    certificates are self-signed, internal connections do not support
//    sslmode=verify-ca or sslmode=verify-full." Traffic stays on Render's
//    private network. Accepted risk, recorded in docs/HARDENING_LOG.md (P0.3).
//  - "verify": encrypt AND verify the certificate against Node's CA store, or
//    against DATABASE_CA_CERT (PEM) when set. Use it for ANY database reached
//    over a public network (Render's external URL, another host).
//  - "disable": no TLS. Local development only (config.ts warns in production).
//
// Anything else is a typo, and a typo must never WEAKEN the connection: an
// unknown value resolves to "verify" (the strictest), and config.ts reports it
// (fatal in production).
export type PgSslMode = "require" | "verify" | "disable";

export function pgSslMode(env: NodeJS.ProcessEnv = process.env): { mode: PgSslMode; valid: boolean } {
  const raw = env.DATABASE_SSL?.trim().toLowerCase();
  if (raw === undefined || raw === "" || raw === "require") return { mode: "require", valid: true };
  if (raw === "verify" || raw === "disable") return { mode: raw, valid: true };
  return { mode: "verify", valid: false };
}

export function pgSslConfig(env: NodeJS.ProcessEnv = process.env): undefined | { rejectUnauthorized: boolean; ca?: string } {
  const { mode } = pgSslMode(env);
  if (mode === "disable") return undefined;
  if (mode === "verify") {
    const ca = env.DATABASE_CA_CERT?.trim();
    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  }
  // nosemgrep: problem-based-packs.insecure-transport.js-node.bypass-tls-verification.bypass-tls-verification -- Render internal Postgres uses self-signed certs and does not support verification (see the block comment above); "verify" mode exists for every other host.
  return { rejectUnauthorized: false };
}

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!pgEnabled()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: pgSslConfig(),
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

// A storage failure is logged WITHOUT the key. Keys carry user data: raw email
// addresses (auth_legacy), client-chosen sync record ids, RevenueCat user ids
// from webhook payloads. Logging them leaked PII into production logs and let a
// client forge log lines (CR/LF) or garble them (printf-style %s/%o in the
// FIRST console argument). CodeQL: js/log-injection, js/tainted-format-string.
// The format string is constant; the key is replaced by a short, non-reversible
// reference that still lets two log lines about the same key be correlated.
export function storageKeyRef(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

function logStorageFailure(op: "persist" | "delete", namespace: string, key: string, err: unknown): void {
  const error = err instanceof Error ? err.message : String(err);
  console.error("[pg] storage write failed", { op, namespace, keyRef: storageKeyRef(key), error });
}

/** Mirror a single key's latest value (upsert), awaiting until the row has
 *  landed (or the attempt failed — errors are logged, never thrown, so a DB blip
 *  degrades to in-memory rather than failing the request). Use this for writes
 *  whose durability must be confirmed before the request is acked (auth
 *  sessions, sync). Resolves false only when a configured DB rejected the
 *  write, so a caller that acks durability (sync) can refuse to; true when the
 *  row landed or there is no DB to write to. */
export async function kvPersistAwait(namespace: string, key: string, value: unknown): Promise<boolean> {
  const p = getPool();
  if (!p) return true;
  try {
    await p.query(
      `INSERT INTO kv_store (namespace, key, value, updated_at)
       VALUES ($1, $2, $3::jsonb, now())
       ON CONFLICT (namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [namespace, key, JSON.stringify(value)]
    );
    return true;
  } catch (err) {
    logStorageFailure("persist", namespace, key, err);
    return false;
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
 *  let a "revoked" token get replayed back into memory on the next restart.
 *  Resolves false only when a configured DB rejected the delete. */
export async function kvDeleteAwait(namespace: string, key: string): Promise<boolean> {
  const p = getPool();
  if (!p) return true;
  try {
    await p.query("DELETE FROM kv_store WHERE namespace = $1 AND key = $2", [namespace, key]);
    return true;
  } catch (err) {
    logStorageFailure("delete", namespace, key, err);
    return false;
  }
}

/** Remove EVERY row of a namespace whose JSON value has `field` equal to
 *  `value` (e.g. all of one account's sessions), straight from the database.
 *  Account deletion uses this instead of deleting key by key from the
 *  in-memory index: a delete that failed once must still be found by a retry,
 *  even though the in-memory copy is already gone (finding F75). Parameterised
 *  throughout; resolves false only when a configured DB rejected it. */
export async function kvDeleteByValueField(namespace: string, field: string, value: string): Promise<boolean> {
  const p = getPool();
  if (!p) return true;
  try {
    await p.query("DELETE FROM kv_store WHERE namespace = $1 AND value->>$2 = $3", [namespace, field, value]);
    return true;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[pg] storage delete-by-field failed", { namespace, field, error });
    return false;
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
    console.error("[pg] storage clear failed", { namespace, error: err instanceof Error ? err.message : String(err) });
  }
}

// ── Encryption at rest (for secrets like Plaid bank-access tokens) ──────────
// AES-256-GCM with a random 96-bit IV per value; the sealed envelope is
// iv(12) || tag(16) || ciphertext, base64-encoded inside a { enc, kid } object.
// The tag length is PINNED to 16 bytes on both sides: Node otherwise accepts a
// truncated GCM tag (as short as 4 bytes), which would cut forgery work from
// 2^128 to as little as 2^32 for anyone able to write rows.
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

// The only key that may seal NEW data. A previous key is for opening old rows,
// never for sealing: with the primary missing or malformed, keyring()[0] would
// otherwise be a retired key (possibly retired because it leaked).
function primaryKey(): Buffer | null {
  const primary = process.env.STORAGE_ENCRYPTION_KEY;
  return primary ? parseKey(primary) : null;
}

// The primary (current) key first, then any previous keys — the decryption ring.
function encryptionKeyring(): Buffer[] {
  const keys: Buffer[] = [];
  const primary = primaryKey();
  if (primary) keys.push(primary);
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
  return primaryKey() !== null;
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
  const key = primaryKey();
  if (!key) throw new Error("sealValue requires STORAGE_ENCRYPTION_KEY");
  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: GCM_TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(value), "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { enc: Buffer.concat([iv, tag, ciphertext]).toString("base64"), kid: keyFingerprint(key) };
}

const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

function tryDecrypt(enc: string, key: Buffer): unknown | null {
  try {
    const buf = Buffer.from(enc, "base64");
    // iv + full tag + at least one ciphertext byte; anything shorter is not an
    // envelope we produced (sealValue always encrypts non-empty JSON).
    if (buf.length <= GCM_IV_BYTES + GCM_TAG_BYTES) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, buf.subarray(0, GCM_IV_BYTES), { authTagLength: GCM_TAG_BYTES });
    decipher.setAuthTag(buf.subarray(GCM_IV_BYTES, GCM_IV_BYTES + GCM_TAG_BYTES));
    const plaintext = Buffer.concat([decipher.update(buf.subarray(GCM_IV_BYTES + GCM_TAG_BYTES)), decipher.final()]);
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
      if (!entries.length) continue;
      // Isolated per namespace: one malformed row must not leave every later
      // namespace (sessions, households, …) un-hydrated. Logged by namespace
      // only — keys and values carry user data.
      try {
        hydrate(entries);
        restored += entries.length;
      } catch (err) {
        console.error("[pg] rehydrate failed for one namespace; its rows stay in Postgres but were not loaded", {
          namespace,
          error: err instanceof Error ? err.message : String(err)
        });
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

import * as SQLite from "expo-sqlite";
import { getOrCreateDatabaseKey } from "../security/secure-store";

export type ZenoDatabase = SQLite.SQLiteDatabase;

export async function openZenoDatabase(): Promise<ZenoDatabase> {
  const db = await SQLite.openDatabaseAsync("zeno.db");
  const key = await getOrCreateDatabaseKey();
  await db.execAsync(`PRAGMA key = '${key.replace(/'/g, "''")}';`);
  await runMigrations(db);
  return db;
}

export async function readAppMeta(db: ZenoDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key = ?", key);
  return row?.value ?? null;
}

export async function writeAppMeta(db: ZenoDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value
  );
}

export async function runMigrations(db: ZenoDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT,
      email_hash TEXT,
      theme_preference TEXT NOT NULL,
      plan TEXT NOT NULL,
      biometric_required INTEGER NOT NULL,
      pin_enabled INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      service_slug TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      next_renewal_date TEXT,
      last_charged_date TEXT,
      status TEXT NOT NULL,
      owner_profile_id TEXT NOT NULL,
      value_rating TEXT,
      notes TEXT,
      muted_until TEXT,
      cancellation_requested_at TEXT,
      cancellation_verify_by TEXT,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      device_id TEXT,
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS renewal_events (
      id TEXT PRIMARY KEY NOT NULL,
      subscription_id TEXT NOT NULL,
      due_at TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      notification_types_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL,
      digest_only INTEGER NOT NULL,
      quiet_hours_start TEXT,
      quiet_hours_end TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      detected_count INTEGER NOT NULL,
      confirmed_count INTEGER NOT NULL,
      raw_source_retained INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      encrypted_payload TEXT,
      vector_clock_json TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL
    );
  `);

  // Idempotent column additions for databases created before the cancellation
  // verification lifecycle (CHANGE 4). CREATE TABLE IF NOT EXISTS won't add
  // columns to an existing table, so add them here if missing.
  const subscriptionColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(subscriptions)");
  const columnNames = new Set(subscriptionColumns.map((column) => column.name));
  // try/catch so two concurrent DB opens (subscription + budget stores) racing the
  // same migration don't crash on a "duplicate column" error.
  if (!columnNames.has("cancellation_requested_at")) {
    try { await db.execAsync("ALTER TABLE subscriptions ADD COLUMN cancellation_requested_at TEXT"); } catch { /* added concurrently */ }
  }
  if (!columnNames.has("cancellation_verify_by")) {
    try { await db.execAsync("ALTER TABLE subscriptions ADD COLUMN cancellation_verify_by TEXT"); } catch { /* added concurrently */ }
  }
}

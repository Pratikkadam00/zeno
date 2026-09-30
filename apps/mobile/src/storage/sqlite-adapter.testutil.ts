// Test-only: a REAL SQLite database (Node's built-in node:sqlite) behind the
// four expo-sqlite methods the app uses, so migrations and repository SQL run
// against an actual engine instead of a mock that would accept any string.
//
// Differences from the device, stated plainly:
//  - no SQLCipher: `PRAGMA key` is an unknown pragma here and SQLite ignores it,
//    so tests assert the key statement is ISSUED correctly, not that it encrypts
//    (on-device proof is finding F16, P3);
//  - synchronous under the hood; the async wrappers only mirror the API shape.
import { DatabaseSync } from "node:sqlite";

export type ExecLog = string[];

export function openRealSqlite(path = ":memory:", log?: ExecLog) {
  const db = new DatabaseSync(path);
  const params = (values: unknown[]) => values.map((v) => (v === undefined ? null : v)) as (string | number | null)[];
  const api = {
    async execAsync(sql: string): Promise<void> {
      log?.push(sql);
      db.exec(sql);
    },
    async getFirstAsync<T>(sql: string, ...values: unknown[]): Promise<T | null> {
      return (db.prepare(sql).get(...params(values)) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...values: unknown[]): Promise<T[]> {
      return db.prepare(sql).all(...params(values)) as T[];
    },
    async runAsync(sql: string, ...values: unknown[]): Promise<unknown> {
      return db.prepare(sql).run(...params(values));
    },
    raw: db
  };
  return api;
}

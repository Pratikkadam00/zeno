// Encrypted cloud sync + backup. The client encrypts every change locally and
// pushes opaque ciphertext blobs — the server stores them per user and replays
// them on pull, so losing/replacing a device doesn't lose data. The server
// never sees plaintext financial data (only encryptedPayload it can't read).
//
// Conflict resolution is last-write-wins by the change's vector-clock total.
// The in-memory map is the working set; when DATABASE_URL is set every accepted
// change is also mirrored to Postgres (the payload is already client-encrypted
// ciphertext the server can't read) and replayed on boot. See storage/pg.ts.

import { kvClear, kvPersistAwait, registerHydrator, type StoredEntry } from "./storage/pg";

export type EncryptedChange = {
  entityType: "subscription" | "preference" | "profile";
  entityId: string;
  operation: "create" | "update" | "delete";
  encryptedPayload: string;
  vectorClock: Record<string, number>;
};

type StoredRecord = EncryptedChange & { version: number; seq: number };

const store = new Map<string, Map<string, StoredRecord>>();
let globalSeq = 0;

// Bound per-user storage so a client can't grow the in-memory store without limit
// by pushing endless distinct entities (each capped at 8 KB by the schema).
const MAX_ENTITIES_PER_USER = 1000;

function keyOf(change: { entityType: string; entityId: string }): string {
  return `${change.entityType}:${change.entityId}`;
}

function versionOf(vectorClock: Record<string, number>): number {
  let total = 0;
  for (const value of Object.values(vectorClock)) total += value;
  return total;
}

function userStore(userId: string): Map<string, StoredRecord> {
  let s = store.get(userId);
  if (!s) {
    s = new Map();
    store.set(userId, s);
  }
  return s;
}

export async function pushChanges(userId: string, changes: EncryptedChange[]): Promise<{ accepted: number; rejected: number; cursor: string }> {
  const records = userStore(userId);
  let accepted = 0;
  let rejected = 0;
  for (const change of changes) {
    const key = keyOf(change);
    const existing = records.get(key);
    const incomingVersion = versionOf(change.vectorClock);
    // Reject a brand-new entity once the per-user cap is reached (updates to
    // existing entities still apply, LWW).
    if (!existing && records.size >= MAX_ENTITIES_PER_USER) {
      rejected += 1;
      continue;
    }
    // Accept new entities and any change at or beyond the stored version (LWW).
    if (!existing || incomingVersion >= existing.version) {
      globalSeq += 1;
      const record: StoredRecord = { ...change, version: incomingVersion, seq: globalSeq };
      records.set(key, record);
      // Await durability: we ack this change (accepted + cursor) to the client,
      // so the row must land before we return or a restart would lose an
      // "accepted" change the client believes is safely backed up.
      await kvPersistAwait("sync", `${userId}|${key}`, { userId, ...record });
      accepted += 1;
    } else {
      rejected += 1;
    }
  }
  return { accepted, rejected, cursor: String(globalSeq) };
}

export function pullChanges(userId: string, cursor: string | undefined, limit: number): {
  changes: EncryptedChange[];
  cursor: string;
  hasMore: boolean;
} {
  const records = store.get(userId);
  const since = cursor ? Number(cursor) || 0 : 0;
  const fresh = records
    ? [...records.values()].filter((record) => record.seq > since).sort((a, b) => a.seq - b.seq)
    : [];
  const page = fresh.slice(0, limit);
  const nextCursor = page.length ? String(page[page.length - 1]!.seq) : String(since);
  return {
    changes: page.map(({ version, seq, ...change }) => change),
    cursor: nextCursor,
    hasMore: fresh.length > page.length
  };
}

export function clearSyncStore(): void {
  store.clear();
  globalSeq = 0;
  void kvClear("sync");
}

// Rebuild the per-user maps from persisted rows, restoring the global sequence
// so pull cursors stay monotonic across a restart.
registerHydrator("sync", (entries: StoredEntry[]) => {
  for (const { value } of entries) {
    const { userId, ...stored } = value as StoredRecord & { userId: string };
    userStore(userId).set(keyOf(stored), stored);
    if (stored.seq > globalSeq) globalSeq = stored.seq;
  }
});

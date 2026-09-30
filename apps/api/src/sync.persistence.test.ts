import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * sync.ts against its storage boundary. `./storage/pg` is replaced by a fake
 * table that stores a JSON SNAPSHOT of each written value (exactly what the
 * real jsonb column holds), so these tests can check what is persisted, that
 * a push is acked only once its row is durable, and a full restart round trip
 * (persist → wipe memory → hydrate from the rows).
 */
type Entry = { key: string; value: unknown };
const kv = vi.hoisted(() => ({
  rows: new Map<string, Map<string, unknown>>(),
  hydrators: new Map<string, (entries: { key: string; value: unknown }[]) => void>(),
  // Scripted outcomes for the next kvPersistAwait calls (default: land, succeed).
  persistPlan: [] as { gate?: Promise<void>; ok: boolean }[],
  persistCalls: [] as { namespace: string; key: string; value: unknown }[],
  deleted: [] as string[],
  cleared: [] as string[]
}));

vi.mock("./storage/pg", () => {
  const table = (namespace: string) => {
    let t = kv.rows.get(namespace);
    if (!t) {
      t = new Map();
      kv.rows.set(namespace, t);
    }
    return t;
  };
  return {
    registerHydrator: (namespace: string, hydrate: (entries: { key: string; value: unknown }[]) => void) => {
      kv.hydrators.set(namespace, hydrate);
    },
    kvPersistAwait: async (namespace: string, key: string, value: unknown) => {
      const snapshot: unknown = JSON.parse(JSON.stringify(value));
      kv.persistCalls.push({ namespace, key, value: snapshot });
      const step = kv.persistPlan.shift() ?? { ok: true };
      if (step.gate) await step.gate;
      if (step.ok) table(namespace).set(key, snapshot);
      return step.ok;
    },
    // Mirrors `DELETE ... WHERE namespace = $1 AND value->>$2 = $3`.
    kvDeleteByValueField: async (namespace: string, field: string, value: string) => {
      kv.deleted.push(`${namespace}/${field}=${value}`);
      for (const [key, row] of table(namespace)) {
        if ((row as Record<string, unknown>)[field] === value) table(namespace).delete(key);
      }
      return true;
    },
    kvClear: async (namespace: string) => {
      kv.cleared.push(namespace);
      table(namespace).clear();
    }
  };
});

const { clearSyncStore, deleteUserSyncData, pullChanges, pushChanges } = await import("./sync");
type Change = Parameters<typeof pushChanges>[1][number];

function change(entityId: string, version: number, payload = `cipher-${entityId}-${version}`): Change {
  return { entityType: "subscription", entityId, operation: "update", encryptedPayload: payload, vectorClock: { phone: version } };
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = () => {};
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function rowsOf(namespace: string): Entry[] {
  return [...(kv.rows.get(namespace) ?? new Map<string, unknown>()).entries()].map(([key, value]) => ({ key, value }));
}

/** Simulate a process restart: snapshot the table, wipe every in-memory map
 *  (which clears the fake table too), put the rows back as a real database
 *  would still hold them, then replay them through the registered hydrator. */
function restart(order: (entries: Entry[]) => Entry[] = (e) => e): void {
  const persisted = rowsOf("sync");
  clearSyncStore();
  for (const { key, value } of persisted) kv.rows.get("sync")!.set(key, value);
  kv.hydrators.get("sync")!(order(persisted));
}

beforeEach(() => {
  clearSyncStore();
  kv.rows.clear();
  kv.persistPlan.length = 0;
  kv.persistCalls.length = 0;
  kv.deleted.length = 0;
  kv.cleared.length = 0;
});

afterEach(() => {
  kv.persistPlan.length = 0;
});

describe("what a push persists", () => {
  it("each accepted change is stored under `${userId}|${entityType}:${entityId}` with its owner, version and sequence", async () => {
    await pushChanges("acct_a", [change("netflix", 2)]);
    expect(rowsOf("sync")).toEqual([
      {
        key: "acct_a|subscription:netflix",
        value: {
          userId: "acct_a",
          entityType: "subscription",
          entityId: "netflix",
          operation: "update",
          encryptedPayload: "cipher-netflix-2",
          vectorClock: { phone: 2 },
          version: 2,
          seq: 1
        }
      }
    ]);
  });

  it("a rejected (stale) change is never written", async () => {
    await pushChanges("acct_a", [change("e", 5)]);
    kv.persistCalls.length = 0;
    await pushChanges("acct_a", [change("e", 1)]);
    expect(kv.persistCalls).toEqual([]);
  });

  it("the push does not resolve (no ack) until the row has landed", async () => {
    const gate = deferred();
    kv.persistPlan.push({ gate: gate.promise, ok: true });
    let settled = false;
    const pending = pushChanges("acct_a", [change("e", 1)]).then((result) => {
      settled = true;
      return result;
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(false);
    gate.resolve();
    expect(await pending).toMatchObject({ accepted: 1, rejected: 0 });
  });
});

describe("a failed durable write is never acked as accepted", () => {
  it("a new entity whose row did not land is reported rejected and is not served on pull", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    kv.persistPlan.push({ ok: false });
    const result = await pushChanges("acct_a", [change("e", 1)]);
    expect(result).toMatchObject({ accepted: 0, rejected: 1 });
    expect(pullChanges("acct_a", undefined, 10).changes).toEqual([]);
    error.mockRestore();
  });

  it("an update whose row did not land leaves the previous (durable) version in place", async () => {
    await pushChanges("acct_a", [change("e", 1, "durable-v1")]);
    kv.persistPlan.push({ ok: false });
    const result = await pushChanges("acct_a", [change("e", 2, "lost-v2")]);
    expect(result).toMatchObject({ accepted: 0, rejected: 1 });
    expect(pullChanges("acct_a", undefined, 10).changes.map((c) => c.encryptedPayload)).toEqual(["durable-v1"]);
    // A retry once the database is back is accepted normally.
    expect(await pushChanges("acct_a", [change("e", 2, "lost-v2")])).toMatchObject({ accepted: 1, rejected: 0 });
    expect(pullChanges("acct_a", undefined, 10).changes.map((c) => c.encryptedPayload)).toEqual(["lost-v2"]);
  });

  it("a slow failing write never rolls back a newer change that landed meanwhile", async () => {
    const gate = deferred();
    kv.persistPlan.push({ gate: gate.promise, ok: false }, { ok: true });
    const slow = pushChanges("acct_a", [change("e", 1, "slow-v1")]);
    await new Promise((r) => setTimeout(r, 0));
    expect(await pushChanges("acct_a", [change("e", 2, "fast-v2")])).toMatchObject({ accepted: 1 });
    gate.resolve();
    expect(await slow).toMatchObject({ accepted: 0, rejected: 1 });
    expect(pullChanges("acct_a", undefined, 10).changes.map((c) => c.encryptedPayload)).toEqual(["fast-v2"]);
  });
});

describe("restart round trip (hydration)", () => {
  it("restores every user's changes from the persisted rows, keeping users separate", async () => {
    await pushChanges("acct_a", [change("a1", 1), change("a2", 1)]);
    await pushChanges("acct_b", [change("b1", 3)]);
    const before = { a: pullChanges("acct_a", undefined, 10), b: pullChanges("acct_b", undefined, 10) };

    restart();

    expect(pullChanges("acct_a", undefined, 10)).toEqual(before.a);
    expect(pullChanges("acct_b", undefined, 10)).toEqual(before.b);
  });

  it("restores the global sequence to the highest persisted seq even when rows come back out of order, so cursors stay monotonic", async () => {
    await pushChanges("acct_a", [change("a1", 1), change("a2", 1), change("a3", 1)]); // seq 1..3
    const cursorBeforeRestart = pullChanges("acct_a", undefined, 10).cursor;
    expect(cursorBeforeRestart).toBe("3");

    restart((entries) => [...entries].reverse()); // seq 3 first, then 2, 1

    const next = await pushChanges("acct_a", [change("a4", 1)]);
    expect(next.cursor).toBe("4");
    // A client that had pulled up to seq 3 before the restart sees exactly the new change.
    expect(pullChanges("acct_a", cursorBeforeRestart, 10).changes.map((c) => c.entityId)).toEqual(["a4"]);
  });

  it("LWW keeps working against hydrated state: a stale change after a restart is still rejected", async () => {
    await pushChanges("acct_a", [change("e", 5, "v5")]);
    restart();
    expect(await pushChanges("acct_a", [change("e", 4, "v4")])).toMatchObject({ accepted: 0, rejected: 1 });
    expect(pullChanges("acct_a", undefined, 10).changes.map((c) => c.encryptedPayload)).toEqual(["v5"]);
  });
});

describe("deletion", () => {
  it("deleteUserSyncData removes exactly that user's persisted rows, by the owner field the database holds (F75)", async () => {
    await pushChanges("acct_a", [change("a1", 1), change("a2", 1)]);
    await pushChanges("acct_b", [change("b1", 1)]);
    expect(await deleteUserSyncData("acct_a")).toBe(true);
    expect(kv.deleted).toEqual(["sync/userId=acct_a"]);
    expect(rowsOf("sync").map((r) => r.key)).toEqual(["acct_b|subscription:b1"]);
    expect(pullChanges("acct_a", undefined, 100).changes).toEqual([]);
  });

  it("a retry still deletes rows that memory no longer lists (a previous attempt already forgot them)", async () => {
    await pushChanges("acct_a", [change("a1", 1)]);
    kv.rows.get("sync")!.set("acct_a|subscription:orphan", { userId: "acct_a", entityId: "orphan" });
    await deleteUserSyncData("acct_a");
    expect(rowsOf("sync").map((r) => r.key)).toEqual([]);
  });

  it("clearSyncStore drops the whole sync namespace", () => {
    kv.cleared.length = 0;
    clearSyncStore();
    expect(kv.cleared).toEqual(["sync"]);
  });
});

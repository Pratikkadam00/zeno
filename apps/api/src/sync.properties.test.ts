import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { clearSyncStore, pullChanges, pushChanges, type EncryptedChange } from "./sync";

// P6.4: sync against a model. For ANY sequence of pushes (a few entities, random
// vector clocks, random payloads), what the server keeps and hands back must be
// what the simple rule says: per entity, the change with the highest version
// (the sum of its vector clock) wins, and an equal version from a later push
// replaces it. No database here: the in-memory store is the whole state.

const entity = fc.constantFrom("a", "b", "c");
const change: fc.Arbitrary<EncryptedChange> = fc.record({
  entityType: fc.constantFrom("subscription", "preference") as fc.Arbitrary<EncryptedChange["entityType"]>,
  entityId: entity,
  operation: fc.constantFrom("create", "update", "delete") as fc.Arbitrary<EncryptedChange["operation"]>,
  encryptedPayload: fc.string({ minLength: 1, maxLength: 12 }),
  vectorClock: fc.dictionary(fc.constantFrom("phone", "tablet", "web"), fc.integer({ min: 0, max: 5 }), { maxKeys: 3 })
});
const batches = fc.array(fc.array(change, { minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 6 });
const version = (c: EncryptedChange) => Object.values(c.vectorClock).reduce((a, b) => a + b, 0);

/** The rule, written plainly: per entity, the highest version; ties go to the later push. */
function model(all: EncryptedChange[]): Map<string, EncryptedChange> {
  const kept = new Map<string, EncryptedChange>();
  for (const c of all) {
    const key = `${c.entityType}:${c.entityId}`;
    const current = kept.get(key);
    if (!current || version(c) >= version(current)) kept.set(key, c);
  }
  return kept;
}

/** Everything a fresh device would pull, page by page. */
function pullAll(userId: string, limit: number): EncryptedChange[] {
  const out: EncryptedChange[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 100; guard++) {
    const page = pullChanges(userId, cursor, limit);
    out.push(...page.changes);
    expect(Number(page.cursor)).toBeGreaterThanOrEqual(Number(cursor ?? 0));
    cursor = page.cursor;
    if (!page.hasMore) return out;
  }
  throw new Error("pull never finished");
}
const byKey = (list: EncryptedChange[]) => new Map(list.map((c) => [`${c.entityType}:${c.entityId}`, c]));

describe("sync, against its rule", () => {
  it("keeps, per entity, exactly the change the rule picks, and a full pull returns each once", async () => {
    await fc.assert(fc.asyncProperty(batches, fc.integer({ min: 1, max: 4 }), async (pushes, limit) => {
      clearSyncStore();
      for (const batch of pushes) await pushChanges("u", batch);
      const pulled = pullAll("u", limit);
      const expected = model(pushes.flat());
      expect(pulled).toHaveLength(expected.size);
      expect(byKey(pulled)).toEqual(expected);
    }));
  });

  it("pushing the same batch again changes nothing a device would pull", async () => {
    await fc.assert(fc.asyncProperty(batches, async (pushes) => {
      clearSyncStore();
      for (const batch of pushes) await pushChanges("u", batch);
      const once = byKey(pullAll("u", 50));
      await pushChanges("u", pushes[pushes.length - 1]!);
      expect(byKey(pullAll("u", 50))).toEqual(once);
    }));
  });

  it("an older version never replaces a newer one, and says so", async () => {
    await fc.assert(fc.asyncProperty(change, fc.integer({ min: 1, max: 5 }), async (newer, drop) => {
      fc.pre(version(newer) >= drop);
      clearSyncStore();
      await pushChanges("u", [newer]);
      const older = { ...newer, encryptedPayload: `${newer.encryptedPayload}-old`, vectorClock: { phone: version(newer) - drop } };
      expect(await pushChanges("u", [older])).toMatchObject({ accepted: 0, rejected: 1 });
      expect(pullAll("u", 50)).toEqual([newer]);
    }));
  });

  it("one user's changes never reach another user", async () => {
    await fc.assert(fc.asyncProperty(batches, async (pushes) => {
      clearSyncStore();
      for (const batch of pushes) await pushChanges("alice", batch);
      expect(pullAll("bob", 10)).toEqual([]);
    }));
  });
});

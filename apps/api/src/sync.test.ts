import { afterEach, describe, expect, it } from "vitest";
import { clearSyncStore, type EncryptedChange, pullChanges, pushChanges } from "./sync";

afterEach(() => clearSyncStore());

function change(entityId: string, version = 1): EncryptedChange {
  return {
    entityType: "subscription",
    entityId,
    operation: "create",
    encryptedPayload: `cipher-${entityId}`,
    vectorClock: { device: version }
  };
}

describe("pullChanges pagination", () => {
  it("pages through more changes than the limit with no gaps or repeats, hasMore true then false", () => {
    pushChanges("user-a", ["e1", "e2", "e3", "e4", "e5"].map((id) => change(id)));

    const page1 = pullChanges("user-a", undefined, 2);
    expect(page1.changes.map((c) => c.entityId)).toEqual(["e1", "e2"]);
    expect(page1.hasMore).toBe(true);

    const page2 = pullChanges("user-a", page1.cursor, 2);
    expect(page2.changes.map((c) => c.entityId)).toEqual(["e3", "e4"]);
    expect(page2.hasMore).toBe(true);

    const page3 = pullChanges("user-a", page2.cursor, 2);
    expect(page3.changes.map((c) => c.entityId)).toEqual(["e5"]);
    expect(page3.hasMore).toBe(false);

    // A further pull at the final cursor returns nothing new.
    const page4 = pullChanges("user-a", page3.cursor, 2);
    expect(page4.changes).toEqual([]);
    expect(page4.hasMore).toBe(false);
  });

  it("returns everything in one page when limit >= the number of changes", () => {
    pushChanges("user-b", ["a", "b", "c"].map((id) => change(id)));
    const page = pullChanges("user-b", undefined, 100);
    expect(page.changes.map((c) => c.entityId)).toEqual(["a", "b", "c"]);
    expect(page.hasMore).toBe(false);
  });

  it("treats a garbage cursor as the beginning rather than throwing", () => {
    pushChanges("user-c", [change("only")]);
    const page = pullChanges("user-c", "not-a-number", 10);
    expect(page.changes.map((c) => c.entityId)).toEqual(["only"]);
  });

  it("returns no changes and hasMore=false for a user with nothing pushed", () => {
    const page = pullChanges("user-never-pushed", undefined, 10);
    expect(page.changes).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it("keeps each user's changes isolated from every other user's", () => {
    pushChanges("user-d", [change("d1")]);
    pushChanges("user-e", [change("e1")]);
    expect(pullChanges("user-d", undefined, 10).changes.map((c) => c.entityId)).toEqual(["d1"]);
    expect(pullChanges("user-e", undefined, 10).changes.map((c) => c.entityId)).toEqual(["e1"]);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { clearSyncStore, deleteUserSyncData, type EncryptedChange, pullChanges, pushChanges } from "./sync";

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
  it("pages through more changes than the limit with no gaps or repeats, hasMore true then false", async () => {
    await pushChanges("user-a", ["e1", "e2", "e3", "e4", "e5"].map((id) => change(id)));

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

  it("returns everything in one page when limit >= the number of changes", async () => {
    await pushChanges("user-b", ["a", "b", "c"].map((id) => change(id)));
    const page = pullChanges("user-b", undefined, 100);
    expect(page.changes.map((c) => c.entityId)).toEqual(["a", "b", "c"]);
    expect(page.hasMore).toBe(false);
  });

  it("treats a garbage cursor as the beginning rather than throwing", async () => {
    await pushChanges("user-c", [change("only")]);
    const page = pullChanges("user-c", "not-a-number", 10);
    expect(page.changes.map((c) => c.entityId)).toEqual(["only"]);
  });

  it("returns no changes and hasMore=false for a user with nothing pushed", () => {
    const page = pullChanges("user-never-pushed", undefined, 10);
    expect(page.changes).toEqual([]);
    expect(page.hasMore).toBe(false);
  });

  it("keeps each user's changes isolated from every other user's", async () => {
    await pushChanges("user-d", [change("d1")]);
    await pushChanges("user-e", [change("e1")]);
    expect(pullChanges("user-d", undefined, 10).changes.map((c) => c.entityId)).toEqual(["d1"]);
    expect(pullChanges("user-e", undefined, 10).changes.map((c) => c.entityId)).toEqual(["e1"]);
  });

  it("returns exactly the pushed change — the server's version/seq bookkeeping never leaks into a pull", async () => {
    const pushed: EncryptedChange = {
      entityType: "preference",
      entityId: "theme",
      operation: "update",
      encryptedPayload: "opaque-ciphertext",
      vectorClock: { phone: 2, tablet: 1 }
    };
    await pushChanges("user-f", [pushed]);
    expect(pullChanges("user-f", undefined, 10).changes).toEqual([pushed]);
  });
});

function clocked(entityId: string, vectorClock: Record<string, number>, payload: string): EncryptedChange {
  return { entityType: "subscription", entityId, operation: "update", encryptedPayload: payload, vectorClock };
}

// Pulls everything (the function itself has no page cap; the route caps at 100).
function payloadOf(userId: string, entityId: string): string | undefined {
  return pullChanges(userId, undefined, 5000).changes.find((c) => c.entityId === entityId)?.encryptedPayload;
}

describe("pushChanges last-writer-wins by vector clock", () => {
  it("a causally NEWER change (clock dominates the stored one) replaces it", async () => {
    await pushChanges("lww-1", [clocked("e", { phone: 1 }, "v1")]);
    const result = await pushChanges("lww-1", [clocked("e", { phone: 1, tablet: 1 }, "v2")]);
    expect(result).toMatchObject({ accepted: 1, rejected: 0 });
    expect(payloadOf("lww-1", "e")).toBe("v2");
  });

  it("a causally OLDER change (clock dominated by the stored one) is rejected and changes nothing", async () => {
    await pushChanges("lww-2", [clocked("e", { phone: 3, tablet: 2 }, "current")]);
    const result = await pushChanges("lww-2", [clocked("e", { phone: 1, tablet: 2 }, "stale")]);
    expect(result).toMatchObject({ accepted: 0, rejected: 1 });
    expect(payloadOf("lww-2", "e")).toBe("current");
  });

  it("replaying the identical change is accepted idempotently (safe client retry)", async () => {
    const same = clocked("e", { phone: 2 }, "v2");
    await pushChanges("lww-3", [same]);
    const replay = await pushChanges("lww-3", [same]);
    expect(replay).toMatchObject({ accepted: 1, rejected: 0 });
    expect(pullChanges("lww-3", undefined, 10).changes).toEqual([same]);
  });

  it("CONCURRENT clocks are resolved by their component SUM (the documented scalar rule; see the report's §10 note)", async () => {
    // Neither clock dominates the other. The implementation compares the
    // totals, so the edit with the larger total wins regardless of causality.
    await pushChanges("lww-4", [clocked("e", { phone: 3 }, "phone-edit")]);
    const lower = await pushChanges("lww-4", [clocked("e", { tablet: 2 }, "tablet-edit")]);
    expect(lower).toMatchObject({ accepted: 0, rejected: 1 });
    const higher = await pushChanges("lww-4", [clocked("e", { tablet: 4 }, "tablet-edit-2")]);
    expect(higher).toMatchObject({ accepted: 1, rejected: 0 });
    expect(payloadOf("lww-4", "e")).toBe("tablet-edit-2");
  });

  it("counts accepted and rejected per change within one batch, and the cursor is the latest sequence", async () => {
    await pushChanges("lww-5", [clocked("a", { d: 5 }, "a5")]);
    const result = await pushChanges("lww-5", [
      clocked("a", { d: 1 }, "a1-stale"),
      clocked("b", { d: 1 }, "b1-new"),
      clocked("a", { d: 6 }, "a6")
    ]);
    expect(result.accepted).toBe(2);
    expect(result.rejected).toBe(1);
    expect(pullChanges("lww-5", undefined, 10).cursor).toBe(result.cursor);
    expect(payloadOf("lww-5", "a")).toBe("a6");
  });
});

describe("per-user isolation", () => {
  it("the same entity id under two users never collides: one user's newer clock cannot reject the other's write", async () => {
    await pushChanges("iso-a", [clocked("shared-id", { d: 50 }, "a-high")]);
    const b = await pushChanges("iso-b", [clocked("shared-id", { d: 1 }, "b-low")]);
    expect(b).toMatchObject({ accepted: 1, rejected: 0 });
    expect(payloadOf("iso-a", "shared-id")).toBe("a-high");
    expect(payloadOf("iso-b", "shared-id")).toBe("b-low");
  });

  it("deleting one user's sync data leaves every other user's intact; deleting a user with none is a no-op", async () => {
    await pushChanges("iso-c", [change("c1"), change("c2")]);
    await pushChanges("iso-d", [change("d1")]);
    deleteUserSyncData("iso-c");
    expect(pullChanges("iso-c", undefined, 10).changes).toEqual([]);
    expect(pullChanges("iso-d", undefined, 10).changes.map((c) => c.entityId)).toEqual(["d1"]);
    expect(() => deleteUserSyncData("iso-never-synced")).not.toThrow();
    expect(pullChanges("iso-d", undefined, 10).changes.map((c) => c.entityId)).toEqual(["d1"]);
  });
});

describe("per-user entity cap (1000)", () => {
  it("rejects a brand-new entity once the user holds 1000, still applies updates to existing ones, and never limits another user", async () => {
    const thousand = Array.from({ length: 1000 }, (_, i) => change(`cap-${i}`));
    expect(await pushChanges("cap-user", thousand)).toMatchObject({ accepted: 1000, rejected: 0 });

    const overflow = await pushChanges("cap-user", [change("cap-new")]);
    expect(overflow).toMatchObject({ accepted: 0, rejected: 1 });
    expect(payloadOf("cap-user", "cap-new")).toBeUndefined();

    const update = await pushChanges("cap-user", [clocked("cap-0", { device: 2 }, "cap-0-updated")]);
    expect(update).toMatchObject({ accepted: 1, rejected: 0 });
    expect(payloadOf("cap-user", "cap-0")).toBe("cap-0-updated");

    expect(await pushChanges("other-user", [change("fresh")])).toMatchObject({ accepted: 1, rejected: 0 });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * family.ts against its storage boundary. `./storage/pg` is replaced by a fake
 * table holding a JSON SNAPSHOT of each written value (what the jsonb column
 * really stores — later in-memory mutation must not leak into it), so these
 * tests check what is persisted and a restart round trip through the
 * registered hydrator.
 */
type Entry = { key: string; value: unknown };
const kv = vi.hoisted(() => ({
  rows: new Map<string, unknown>(),
  hydrators: new Map<string, (entries: { key: string; value: unknown }[]) => void>(),
  deleted: [] as string[],
  cleared: [] as string[]
}));

vi.mock("./storage/pg", () => ({
  registerHydrator: (namespace: string, hydrate: (entries: { key: string; value: unknown }[]) => void) => {
    kv.hydrators.set(namespace, hydrate);
  },
  kvPersist: (namespace: string, key: string, value: unknown) => {
    if (namespace === "family") kv.rows.set(key, JSON.parse(JSON.stringify(value)));
  },
  kvDelete: (namespace: string, key: string) => {
    kv.deleted.push(`${namespace}/${key}`);
    if (namespace === "family") kv.rows.delete(key);
  },
  kvClear: async (namespace: string) => {
    kv.cleared.push(namespace);
    if (namespace === "family") kv.rows.clear();
  }
}));

// Share codes come from randomBytes(16) calls; ids from randomBytes(8). Tests
// may script the next 16-byte draws; everything else stays really random.
const random = vi.hoisted(() => ({ codeBytes: [] as Buffer[] }));
vi.mock("node:crypto", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:crypto")>();
  return {
    ...real,
    randomBytes: (size: number) => (size === 16 && random.codeBytes.length ? random.codeBytes.shift()! : real.randomBytes(size))
  };
});

const { clearFamilyStore, createHousehold, getHousehold, joinHousehold, removeMember, setMemberSpend } = await import("./family");

function persisted(): Entry[] {
  return [...kv.rows.entries()].map(([key, value]) => ({ key, value }));
}

/** Simulate a restart: snapshot the table, wipe memory (which clears the fake
 *  table too), put the rows back as a real database would still hold them,
 *  then replay them through the registered hydrator. */
function restart(entries: Entry[] = persisted()): void {
  clearFamilyStore();
  for (const { key, value } of entries) kv.rows.set(key, value);
  kv.hydrators.get("family")!(entries);
}

beforeEach(() => {
  clearFamilyStore();
  kv.rows.clear();
  kv.deleted.length = 0;
  kv.cleared.length = 0;
  random.codeBytes.length = 0;
});

describe("share-code generation (scripted randomBytes)", () => {
  it("maps each accepted byte onto the 31-symbol alphabet (byte % 31)", () => {
    const bytes = Buffer.from([0, 1, 2, 22, 23, 30, 31, 61, 0, 0, 0, 0, 0, 0, 0, 0]);
    random.codeBytes.push(bytes);
    // 0→A 1→B 2→C 22→Z 23→2 30→9 31→A (wraps) 61→9
    expect(createHousehold("alpha", "Owner")!.shareCode).toBe("ABCZ29A9");
  });

  it("rejects bytes at or above 248 (no modulo bias) and draws again when a batch runs short", () => {
    // 12 rejected bytes leave only 4 usable ones in the first draw.
    random.codeBytes.push(Buffer.from([248, 255, 250, 249, 251, 252, 253, 254, 248, 255, 250, 249, 2, 2, 2, 2]), Buffer.alloc(16, 3));
    expect(createHousehold("bias", "Owner")!.shareCode).toBe("CCCCDDDD");
  });

  it("a proposed code that is already in use is discarded for a fresh one", () => {
    random.codeBytes.push(Buffer.alloc(16, 4));
    expect(createHousehold("first", "Owner")!.shareCode).toBe("EEEEEEEE");
    random.codeBytes.push(Buffer.alloc(16, 4), Buffer.alloc(16, 5));
    expect(createHousehold("second", "Owner")!.shareCode).toBe("FFFFFFFF");
  });
});

describe("what is persisted", () => {
  it("every mutation writes the whole household under its id (create, join, spend, leave)", () => {
    const household = createHousehold("owner", "Owner", 1000, "EUR")!;
    expect(kv.rows.get(household.id)).toEqual(JSON.parse(JSON.stringify(household)));

    joinHousehold(household.shareCode, "member", "Member", 2000, "GBP");
    expect((kv.rows.get(household.id) as { members: unknown[] }).members).toHaveLength(2);

    setMemberSpend(household.id, "member", 2500);
    expect(kv.rows.get(household.id)).toMatchObject({ members: [{ id: "owner" }, { id: "member", monthlySpendMinor: 2500, currency: "GBP" }] });

    removeMember(household.id, "owner");
    expect(kv.rows.get(household.id)).toMatchObject({ ownerId: "member", members: [{ id: "member" }] });
  });

  it("disbanding deletes the row (no empty, un-joinable shell is left in the database)", () => {
    const household = createHousehold("solo", "Solo")!;
    removeMember(household.id, "solo");
    expect(kv.deleted).toEqual([`family/${household.id}`]);
    expect(kv.rows.has(household.id)).toBe(false);
  });

  it("clearFamilyStore drops the whole family namespace", () => {
    kv.cleared.length = 0;
    clearFamilyStore();
    expect(kv.cleared).toEqual(["family"]);
  });
});

describe("restart round trip (hydration)", () => {
  it("restores households by id, and their share codes still work for joining", () => {
    const household = createHousehold("owner", "Owner", 1000)!;
    joinHousehold(household.shareCode, "member", "Member", 500);
    const before = JSON.parse(JSON.stringify(household)) as unknown;

    restart();

    expect(JSON.parse(JSON.stringify(getHousehold(household.id)))).toEqual(before);
    const joined = joinHousehold(household.shareCode.toLowerCase(), "late", "Late");
    expect(joined?.id).toBe(household.id);
    expect(joined?.members.map((m) => m.id)).toEqual(["owner", "member", "late"]);
  });

  it("backfills USD for members persisted before `currency` existed, and keeps a stored currency", () => {
    restart([
      {
        key: "hh_legacy",
        value: {
          id: "hh_legacy",
          shareCode: "ABCDEFGH",
          ownerId: "old-owner",
          createdAt: "2026-01-01T00:00:00.000Z",
          members: [
            { id: "old-owner", name: "Old", monthlySpendMinor: 100 },
            { id: "new-member", name: "New", monthlySpendMinor: 200, currency: "INR" }
          ]
        }
      }
    ]);
    expect(getHousehold("hh_legacy")!.members.map((m) => m.currency)).toEqual(["USD", "INR"]);
    expect(joinHousehold("abcdefgh", "joiner", "Joiner")?.id).toBe("hh_legacy");
  });

  it("the per-owner cap counts hydrated households, so a restart cannot be used to exceed it", () => {
    for (let i = 0; i < 5; i += 1) expect(createHousehold("capped", "Owner")).not.toBeNull();
    restart();
    expect(createHousehold("capped", "Owner")).toBeNull();
  });

  it("a new household never reuses a hydrated household's share code (the collision check sees hydrated codes)", () => {
    // Script the code generator: the first household gets AAAAAAAA; after the
    // restart the generator proposes AAAAAAAA again, then BBBBBBBB.
    random.codeBytes.push(Buffer.alloc(16, 0));
    const first = createHousehold("o1", "Owner")!;
    expect(first.shareCode).toBe("AAAAAAAA");
    restart();
    random.codeBytes.push(Buffer.alloc(16, 0), Buffer.alloc(16, 1));
    expect(createHousehold("o2", "Owner")!.shareCode).toBe("BBBBBBBB");
    expect(joinHousehold("AAAAAAAA", "m", "M")?.id).toBe(first.id);
  });

  it("defensive: a share code whose household no longer exists is treated as unknown, never a crash", () => {
    // The only way to strand a code-index entry: the same household id is
    // hydrated with a different code than the one it was indexed under, then
    // disbanded (which frees only its current code).
    const household = createHousehold("owner", "Owner")!;
    const staleCode = household.shareCode;
    kv.hydrators.get("family")!([{ key: household.id, value: { ...JSON.parse(JSON.stringify(household)), shareCode: "ZZZZ2345" } }]);
    removeMember(household.id, "owner");
    expect(joinHousehold(staleCode, "someone", "Someone")).toBeNull();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { clearFamilyStore, createHousehold, joinHousehold, removeMember, setMemberSpend } from "./family";

// Unit-level coverage for family.ts's own primitives, independent of the HTTP
// route layer (app.test.ts covers the routes; this covers genCode's
// rejection-sampling/alphabet, and the exact per-owner cap boundary).

afterEach(() => clearFamilyStore());

describe("genCode (via createHousehold's shareCode)", () => {
  it("always generates an 8-character code using only the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i += 1) {
      const household = createHousehold(`owner-${i}`, "Owner");
      expect(household).not.toBeNull();
      expect(household!.shareCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("never generates a duplicate code across many households", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 300; i += 1) {
      const household = createHousehold(`uniq-owner-${i}`, "Owner");
      expect(codes.has(household!.shareCode)).toBe(false);
      codes.add(household!.shareCode);
    }
  });
});

describe("createHousehold per-owner cap", () => {
  it("allows exactly MAX_HOUSEHOLDS_PER_OWNER (5) households, then returns null on the 6th", () => {
    const ownerId = "cap-owner";
    for (let i = 0; i < 5; i += 1) {
      expect(createHousehold(ownerId, "Owner")).not.toBeNull();
    }
    expect(createHousehold(ownerId, "Owner")).toBeNull();
  });

  it("tracks the cap per-owner, not globally", () => {
    for (let i = 0; i < 5; i += 1) expect(createHousehold("owner-a", "A")).not.toBeNull();
    // A different owner is unaffected by owner-a's cap.
    expect(createHousehold("owner-b", "B")).not.toBeNull();
  });
});

describe("joinHousehold", () => {
  it("adds a new member, and re-joining updates that same member's name/spend rather than duplicating", () => {
    const household = createHousehold("join-owner", "Owner", 1000)!;
    const joined = joinHousehold(household.shareCode, "member-1", "Member", 2000)!;
    expect(joined.members).toHaveLength(2);

    const rejoined = joinHousehold(household.shareCode, "member-1", "Member Renamed", 3000)!;
    expect(rejoined.members).toHaveLength(2); // still 2, not 3
    const member = rejoined.members.find((m) => m.id === "member-1");
    expect(member).toMatchObject({ name: "Member Renamed", monthlySpendMinor: 3000 });
  });

  it("returns null for an unknown share code", () => {
    expect(joinHousehold("ZZZZZZZZ", "someone", "Name")).toBeNull();
  });

  it("is case-insensitive and trims whitespace on the share code", () => {
    const household = createHousehold("case-owner", "Owner")!;
    const joined = joinHousehold(`  ${household.shareCode.toLowerCase()}  `, "member-2", "Member");
    expect(joined).not.toBeNull();
    expect(joined!.id).toBe(household.id);
  });
});

describe("joinHousehold member cap", () => {
  it("allows exactly MAX_MEMBERS_PER_HOUSEHOLD (5) members (owner + 4 joiners), then rejects a 6th", () => {
    const household = createHousehold("member-cap-owner", "Owner")!;
    for (let i = 0; i < 4; i += 1) {
      expect(joinHousehold(household.shareCode, `member-${i}`, `Member ${i}`)).not.toBeNull();
    }
    // Owner (1) + 4 joiners = 5, the cap. A 5th joiner is rejected.
    expect(joinHousehold(household.shareCode, "member-overflow", "Overflow")).toBeNull();
  });

  it("re-joining an existing member never counts against the cap", () => {
    const household = createHousehold("member-cap-rejoin-owner", "Owner")!;
    for (let i = 0; i < 4; i += 1) {
      joinHousehold(household.shareCode, `member-${i}`, `Member ${i}`);
    }
    // The household is now full (5/5) — an EXISTING member re-joining
    // (e.g. re-syncing their name/spend) must still succeed.
    const rejoined = joinHousehold(household.shareCode, "member-0", "Member Zero Renamed", 5000);
    expect(rejoined).not.toBeNull();
    expect(rejoined!.members).toHaveLength(5);
  });
});

describe("removeMember", () => {
  it("removes just that member, leaving the household and its other members intact", () => {
    const household = createHousehold("leave-owner", "Owner")!;
    joinHousehold(household.shareCode, "member-x", "Member X");
    const result = removeMember(household.id, "member-x");
    expect(result?.members.map((m) => m.id)).toEqual(["leave-owner"]);
  });

  it("disbands the household (returns null) when the last member leaves, and frees the share code", () => {
    const household = createHousehold("solo-owner", "Owner")!;
    const shareCode = household.shareCode;
    expect(removeMember(household.id, "solo-owner")).toBeNull();

    // The household is gone...
    expect(joinHousehold(shareCode, "late-joiner", "Late")).toBeNull();
    // ...and a fresh household can be created without a code collision, since
    // the count-per-owner is scoped to whoever creates, not the freed code.
    const recreated = createHousehold("solo-owner", "Owner");
    expect(recreated).not.toBeNull();
  });

  it("returns null for a household id that does not exist", () => {
    expect(removeMember("hh_does_not_exist", "someone")).toBeNull();
  });
});

describe("setMemberSpend", () => {
  it("updates only the named member's spend", () => {
    const household = createHousehold("spend-owner", "Owner", 1000)!;
    joinHousehold(household.shareCode, "member-y", "Member Y", 2000);
    const updated = setMemberSpend(household.id, "member-y", 5000)!;
    expect(updated.members.find((m) => m.id === "member-y")?.monthlySpendMinor).toBe(5000);
    expect(updated.members.find((m) => m.id === "spend-owner")?.monthlySpendMinor).toBe(1000);
  });

  it("optionally updates currency, and leaves it untouched when omitted", () => {
    const household = createHousehold("spend-owner-2", "Owner", 1000, "EUR")!;
    const withCurrency = setMemberSpend(household.id, "spend-owner-2", 1500, "GBP")!;
    expect(withCurrency.members[0]).toMatchObject({ monthlySpendMinor: 1500, currency: "GBP" });

    const withoutCurrency = setMemberSpend(household.id, "spend-owner-2", 2000)!;
    expect(withoutCurrency.members[0]).toMatchObject({ monthlySpendMinor: 2000, currency: "GBP" });
  });
});

// Phase 5.2 gap fix: FamilyMember previously carried no currency at all, so two
// members reporting spend in different currencies were silently summed
// server-side as if same-currency, with no way to detect it.
describe("FamilyMember currency (Phase 5.2 gap fix)", () => {
  it("createHousehold defaults the owner's currency to USD when not passed, and stores the passed value when given", () => {
    const defaulted = createHousehold("owner-default", "Owner")!;
    expect(defaulted.members[0]?.currency).toBe("USD");

    const explicit = createHousehold("owner-eur", "Owner", 1000, "EUR")!;
    expect(explicit.members[0]?.currency).toBe("EUR");
  });

  it("joinHousehold stores the joining member's own currency, independent of the owner's — the core regression test for this fix", () => {
    const household = createHousehold("currency-owner", "Owner", 1000, "USD")!;
    const joined = joinHousehold(household.shareCode, "currency-member", "Member", 83000, "INR")!;

    expect(joined.members).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "currency-owner", currency: "USD" }),
      expect.objectContaining({ id: "currency-member", currency: "INR" })
    ]));
  });

  it("re-joining updates the member's currency too, same as name/spend", () => {
    const household = createHousehold("rejoin-owner", "Owner")!;
    joinHousehold(household.shareCode, "rejoin-member", "Member", 1000, "USD");
    const rejoined = joinHousehold(household.shareCode, "rejoin-member", "Member Renamed", 3000, "CAD")!;
    const member = rejoined.members.find((m) => m.id === "rejoin-member");
    expect(member).toMatchObject({ name: "Member Renamed", monthlySpendMinor: 3000, currency: "CAD" });
  });
});

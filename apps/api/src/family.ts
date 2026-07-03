// Family / household sharing via a share-code. The owner creates a household and
// gets a short code to share; members join with the code. Each member publishes
// their monthly-spend total (a number they choose to share) so the household
// sees a combined view — no raw subscription data is shared here.
//
// In-memory working set; mirrored to Postgres when DATABASE_URL is set so a
// restart doesn't drop households / share-codes (see storage/pg.ts).
import { randomBytes } from "node:crypto";
import { kvClear, kvDelete, kvPersist, registerHydrator, type StoredEntry } from "./storage/pg";

export type FamilyMember = { id: string; name: string; monthlySpendMinor: number };
export type Household = {
  id: string;
  shareCode: string;
  ownerId: string;
  members: FamilyMember[];
  createdAt: string;
};

const households = new Map<string, Household>();
const codeIndex = new Map<string, string>();

// Unambiguous alphabet (no 0/O/1/I/L) for a friendly share code. 8 chars over a
// 30-symbol alphabet ≈ 6.5e11 combinations — far beyond brute-force at the join
// route's rate limit.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
// Largest multiple of the alphabet length that fits in a byte; bytes at/above it
// are rejected so `% length` introduces no modulo bias.
const CODE_BYTE_CEILING = 256 - (256 % CODE_ALPHABET.length);

// Cap households per owner so an authenticated client can't grow the store
// without bound by spamming create.
const MAX_HOUSEHOLDS_PER_OWNER = 5;

function genId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function genCode(): string {
  let code = "";
  while (code.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH * 2)) {
      if (byte < CODE_BYTE_CEILING) {
        code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
        if (code.length === CODE_LENGTH) break;
      }
    }
  }
  return code;
}

export function createHousehold(ownerId: string, ownerName: string, monthlySpendMinor = 0): Household | null {
  let owned = 0;
  for (const household of households.values()) {
    if (household.ownerId === ownerId) owned += 1;
  }
  if (owned >= MAX_HOUSEHOLDS_PER_OWNER) return null;

  let shareCode = genCode();
  while (codeIndex.has(shareCode)) shareCode = genCode();
  const household: Household = {
    id: genId("hh"),
    shareCode,
    ownerId,
    members: [{ id: ownerId, name: ownerName, monthlySpendMinor }],
    createdAt: new Date().toISOString()
  };
  households.set(household.id, household);
  codeIndex.set(shareCode, household.id);
  kvPersist("family", household.id, household);
  return household;
}

export function joinHousehold(shareCode: string, memberId: string, memberName: string, monthlySpendMinor = 0): Household | null {
  const householdId = codeIndex.get(shareCode.trim().toUpperCase());
  if (!householdId) return null;
  const household = households.get(householdId);
  if (!household) return null;

  const existing = household.members.find((member) => member.id === memberId);
  if (existing) {
    existing.name = memberName;
    existing.monthlySpendMinor = monthlySpendMinor;
  } else {
    household.members.push({ id: memberId, name: memberName, monthlySpendMinor });
  }
  kvPersist("family", household.id, household);
  return household;
}

export function getHousehold(householdId: string): Household | null {
  return households.get(householdId) ?? null;
}

export function setMemberSpend(householdId: string, memberId: string, monthlySpendMinor: number): Household | null {
  const household = households.get(householdId);
  if (!household) return null;
  const member = household.members.find((candidate) => candidate.id === memberId);
  if (member) member.monthlySpendMinor = monthlySpendMinor;
  kvPersist("family", household.id, household);
  return household;
}

// Remove a member from a household (server-side "leave"). Returns the updated
// household, or null if that was the last member — the household is disbanded
// (deleted, share code freed) rather than left as an empty, un-joinable shell.
// Note: if the owner leaves a household that still has other members, the
// household is not deleted and ownerId is left pointing at the departed
// member — no new owner is assigned. This only affects the cosmetic "owner"
// label; membership, spend totals, and join-by-code all keep working.
export function removeMember(householdId: string, memberId: string): Household | null {
  const household = households.get(householdId);
  if (!household) return null;

  household.members = household.members.filter((member) => member.id !== memberId);
  if (household.members.length === 0) {
    households.delete(householdId);
    codeIndex.delete(household.shareCode);
    kvDelete("family", householdId);
    return null;
  }

  kvPersist("family", household.id, household);
  return household;
}

export function clearFamilyStore(): void {
  households.clear();
  codeIndex.clear();
  void kvClear("family");
}

registerHydrator("family", (entries: StoredEntry[]) => {
  for (const { value } of entries) {
    const household = value as Household;
    households.set(household.id, household);
    codeIndex.set(household.shareCode, household.id);
  }
});

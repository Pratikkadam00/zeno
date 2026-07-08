// Family / household sharing via a share-code. The owner creates a household and
// gets a short code to share; members join with the code. Each member publishes
// their monthly-spend total (a number they choose to share) so the household
// sees a combined view — no raw subscription data is shared here.
//
// In-memory working set; mirrored to Postgres when DATABASE_URL is set so a
// restart doesn't drop households / share-codes (see storage/pg.ts).
import type { CurrencyCode } from "@zeno/shared";
import { randomBytes } from "node:crypto";
import { kvClear, kvDelete, kvPersist, registerHydrator, type StoredEntry } from "./storage/pg";

export type FamilyMember = { id: string; name: string; monthlySpendMinor: number; currency: CurrencyCode };
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

// Matches the product's advertised "Family — up to 5 members" limit
// (apps/mobile/app/paywall.tsx, apps/web pricing copy) — the server never
// enforced this, so anyone who knew a household's share code could join
// unboundedly many accounts to it, growing the persisted row without limit.
const MAX_MEMBERS_PER_HOUSEHOLD = 5;

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

export function createHousehold(ownerId: string, ownerName: string, monthlySpendMinor = 0, currency: CurrencyCode = "USD"): Household | null {
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
    members: [{ id: ownerId, name: ownerName, monthlySpendMinor, currency }],
    createdAt: new Date().toISOString()
  };
  households.set(household.id, household);
  codeIndex.set(shareCode, household.id);
  kvPersist("family", household.id, household);
  return household;
}

export function joinHousehold(shareCode: string, memberId: string, memberName: string, monthlySpendMinor = 0, currency: CurrencyCode = "USD"): Household | null {
  const householdId = codeIndex.get(shareCode.trim().toUpperCase());
  if (!householdId) return null;
  const household = households.get(householdId);
  if (!household) return null;

  const existing = household.members.find((member) => member.id === memberId);
  if (existing) {
    existing.name = memberName;
    existing.monthlySpendMinor = monthlySpendMinor;
    existing.currency = currency;
  } else {
    if (household.members.length >= MAX_MEMBERS_PER_HOUSEHOLD) return null;
    household.members.push({ id: memberId, name: memberName, monthlySpendMinor, currency });
  }
  kvPersist("family", household.id, household);
  return household;
}

export function getHousehold(householdId: string): Household | null {
  return households.get(householdId) ?? null;
}

export function setMemberSpend(householdId: string, memberId: string, monthlySpendMinor: number, currency?: CurrencyCode): Household | null {
  const household = households.get(householdId);
  if (!household) return null;
  const member = household.members.find((candidate) => candidate.id === memberId);
  if (member) {
    member.monthlySpendMinor = monthlySpendMinor;
    if (currency) member.currency = currency;
  }
  kvPersist("family", household.id, household);
  return household;
}

// Remove a member from a household (server-side "leave"). Returns the updated
// household, or null if that was the last member — the household is disbanded
// (deleted, share code freed) rather than left as an empty, un-joinable shell.
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

  // If the owner just left, reassign ownership to a remaining member.
  // isHouseholdMember() (app.ts) treats ownerId === userId as sufficient
  // authorization on its own — leaving ownerId pointing at someone no longer
  // in `members` would let a departed owner keep indefinite read/write access
  // to a household they explicitly left.
  if (household.ownerId === memberId) {
    household.ownerId = household.members[0]!.id;
  }

  kvPersist("family", household.id, household);
  return household;
}

// Account deletion: remove this user from every household they belong to
// (owner or member — there's no cap on memberships, only on owner-created
// households, so a user can be in several). Reuses removeMember's existing
// disband-on-last-member logic rather than duplicating it.
export function removeUserFromAllHouseholds(userId: string): void {
  for (const household of [...households.values()]) {
    if (household.members.some((member) => member.id === userId)) {
      removeMember(household.id, userId);
    }
  }
}

export function clearFamilyStore(): void {
  households.clear();
  codeIndex.clear();
  void kvClear("family");
}

registerHydrator("family", (entries: StoredEntry[]) => {
  for (const { value } of entries) {
    const household = value as Household;
    // Backfill members persisted before `currency` existed on FamilyMember —
    // the jsonb cast above performs no runtime validation, so a pre-migration
    // row would otherwise carry `currency: undefined` despite the type's promise.
    for (const member of household.members) {
      member.currency ??= "USD";
    }
    households.set(household.id, household);
    codeIndex.set(household.shareCode, household.id);
  }
});

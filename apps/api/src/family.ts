// Family / household sharing via a share-code. The owner creates a household and
// gets a short code to share; members join with the code. Each member publishes
// their monthly-spend total (a number they choose to share) so the household
// sees a combined view — no raw subscription data is shared here.
//
// In-memory store (single node, dev/demo + tests); back with a database in prod.
import { randomBytes } from "node:crypto";

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

// Unambiguous alphabet (no 0/O/1/I/L) for a friendly 6-char code.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function genId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function genCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return code;
}

export function createHousehold(ownerId: string, ownerName: string, monthlySpendMinor = 0): Household {
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
  return household;
}

export function clearFamilyStore(): void {
  households.clear();
  codeIndex.clear();
}

import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { Buffer, pbkdf2Sync, timingSafeEqual } from "react-native-quick-crypto";
import {
  clearLockStateValue,
  loadLockStateValue,
  loadPinHash,
  saveLockStateValue,
  savePinHash
} from "./secure-store";

export type LockState = {
  locked: boolean;
  failedAttempts: number;
  lockedUntil?: string;
};

export const maxPinAttempts = 10;
export const lockoutDurationMs = 15 * 60 * 1000;

// v3: real PBKDF2-HMAC-SHA256 (react-native-quick-crypto, native — expo-crypto
// has no PBKDF2/HMAC primitive, only plain digests). 600,000 iterations matches
// OWASP's current PBKDF2-HMAC-SHA256 recommendation. v2 (1000 rounds of
// chained SHA-256) is fast and not memory-hard — an attacker with a raw copy
// of the salted hash (e.g. from a compromised/rooted device) could brute-force
// a 4-8 digit PIN's small keyspace quickly, since 1000 rounds adds negligible
// cost. v2 verification is kept below purely to upgrade existing installs.
const pinHashVersion = "v3";
const pinHashIterations = 600_000;
const pinKeyLengthBytes = 32;

export async function canUseBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function unlockWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Zeno",
    fallbackLabel: "Use PIN",
    disableDeviceFallback: false
  });
  return result.success;
}

export async function setPin(pin: string): Promise<void> {
  const salt = bytesToHex(Crypto.getRandomBytes(16));
  const hash = derivePinHash(pin, salt, pinHashIterations);
  await savePinHash(`${pinHashVersion}$${pinHashIterations}$${salt}$${hash}`);
}

// The app lock is "on" exactly when a PIN has been set — so biometric unlock
// always has a working fallback and never fails open.
export async function hasPin(): Promise<boolean> {
  return (await loadPinHash()) !== null;
}

// Parses the common "$"-delimited "<iterations>$<salt>$<hash>" tail shared by
// both the v2 and v3 stored formats. Returns null on any malformed field
// rather than throwing.
function parseSaltedHash(parts: string[]): { iterations: number; salt: string; expected: string } | null {
  const iterations = Number.parseInt(parts[1] ?? "", 10);
  const salt = parts[2] ?? "";
  const expected = parts[3] ?? "";
  if (!Number.isInteger(iterations) || iterations < 1 || !salt || !expected) {
    return null;
  }
  return { iterations, salt, expected };
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await loadPinHash();
  if (!stored) {
    return false;
  }

  const parts = stored.split("$");

  if (parts.length === 4 && parts[0] === pinHashVersion) {
    const parsed = parseSaltedHash(parts);
    if (!parsed) return false;
    return constantTimeHexEqual(derivePinHash(pin, parsed.salt, parsed.iterations), parsed.expected);
  }

  if (parts.length === 4 && parts[0] === "v2") {
    // Legacy v2 (iterated SHA-256, pre-PBKDF2): verify against the old
    // derivation, then transparently upgrade straight to the current version.
    const parsed = parseSaltedHash(parts);
    if (!parsed) return false;
    const matches = constantTimeHexEqual(await deriveLegacyV2Hash(pin, parsed.salt, parsed.iterations), parsed.expected);
    if (matches) {
      await setPin(pin);
    }
    return matches;
  }

  // Legacy v1 (unsalted): verify, then transparently upgrade straight to the
  // current version.
  const matchesLegacy = constantTimeHexEqual(stored, await legacyHashPin(pin));
  if (matchesLegacy) {
    await setPin(pin);
  }
  return matchesLegacy;
}

export function nextLockStateAfterFailure(current: LockState): LockState {
  const failedAttempts = current.failedAttempts + 1;
  if (failedAttempts >= maxPinAttempts) {
    const lockedUntil = new Date(Date.now() + lockoutDurationMs).toISOString();
    return { locked: true, failedAttempts, lockedUntil };
  }
  return { ...current, failedAttempts };
}

// Lockout state is persisted so force-closing the app cannot reset the
// 15-minute penalty after too many failed PIN attempts.
export async function recordFailedAttempt(current: LockState): Promise<LockState> {
  const next = nextLockStateAfterFailure(current);
  await saveLockStateValue(JSON.stringify(next));
  return next;
}

export async function resetLockState(): Promise<void> {
  await clearLockStateValue();
}

export async function loadLockState(): Promise<LockState> {
  const raw = await loadLockStateValue();
  if (!raw) {
    return { locked: false, failedAttempts: 0 };
  }

  try {
    const parsed = JSON.parse(raw) as LockState;
    if (parsed.locked && parsed.lockedUntil && Date.parse(parsed.lockedUntil) <= Date.now()) {
      // Lockout window has elapsed; allow attempts again but keep the counter
      // until a successful unlock calls resetLockState().
      return { locked: false, failedAttempts: parsed.failedAttempts };
    }
    return parsed;
  } catch {
    return { locked: false, failedAttempts: 0 };
  }
}

function derivePinHash(pin: string, salt: string, iterations: number): string {
  return pbkdf2Sync(pin, salt, iterations, pinKeyLengthBytes, "sha256").toString("hex");
}

// Pre-v3 derivation (1000 rounds of chained SHA-256, expo-crypto only) — kept
// so a PIN set before the PBKDF2 migration still verifies; setPin() never
// creates a new hash in this format.
async function deriveLegacyV2Hash(pin: string, salt: string, iterations: number): Promise<string> {
  let digest = `zeno.pin.v2.${salt}.${pin}`;
  for (let round = 0; round < iterations; round += 1) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${digest}.${salt}.${round}`);
  }
  return digest;
}

async function legacyHashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `zeno.pin.v1.${pin}`
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Plain `===` on two hash hex strings short-circuits on the first mismatching
// character, leaking timing information — of limited practical value here
// (the caller already needs the hash off the device to exploit it, and the
// PBKDF2 upgrade already made brute-forcing the underlying PIN itself
// expensive), but comparing MACs/hashes with `===` is exactly the pattern
// this codebase avoids everywhere else (see auth.ts's constantTimeEqual).
function constantTimeHexEqual(actualHex: string, expectedHex: string): boolean {
  const actual = Buffer.from(actualHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

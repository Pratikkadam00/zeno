import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
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

const pinHashVersion = "v2";
const pinHashIterations = 1000;

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
  const hash = await derivePinHash(pin, salt, pinHashIterations);
  await savePinHash(`${pinHashVersion}$${pinHashIterations}$${salt}$${hash}`);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await loadPinHash();
  if (!stored) {
    return false;
  }

  const parts = stored.split("$");
  if (parts.length === 4 && parts[0] === pinHashVersion) {
    const iterations = Number.parseInt(parts[1] ?? "", 10);
    const salt = parts[2] ?? "";
    const expected = parts[3] ?? "";
    if (!Number.isInteger(iterations) || iterations < 1 || !salt || !expected) {
      return false;
    }
    return await derivePinHash(pin, salt, iterations) === expected;
  }

  // Legacy unsalted hash: verify, then transparently upgrade to the salted format.
  const matchesLegacy = stored === await legacyHashPin(pin);
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

async function derivePinHash(pin: string, salt: string, iterations: number): Promise<string> {
  let digest = `subradar.pin.${pinHashVersion}.${salt}.${pin}`;
  for (let round = 0; round < iterations; round += 1) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${digest}.${salt}.${round}`);
  }
  return digest;
}

async function legacyHashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `subradar.pin.v1.${pin}`
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

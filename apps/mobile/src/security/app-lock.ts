import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import { loadPinHash, savePinHash } from "./secure-store";

export type LockState = {
  locked: boolean;
  failedAttempts: number;
  lockedUntil?: string;
};

export const maxPinAttempts = 10;

export async function canUseBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function unlockWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock SubRadar",
    fallbackLabel: "Use PIN",
    disableDeviceFallback: false
  });
  return result.success;
}

export async function setPin(pin: string): Promise<void> {
  await savePinHash(await hashPin(pin));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await loadPinHash();
  if (!stored) {
    return false;
  }
  return stored === await hashPin(pin);
}

export function nextLockStateAfterFailure(current: LockState): LockState {
  const failedAttempts = current.failedAttempts + 1;
  if (failedAttempts >= maxPinAttempts) {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    return { locked: true, failedAttempts, lockedUntil };
  }
  return { ...current, failedAttempts };
}

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `subradar.pin.v1.${pin}`
  );
}

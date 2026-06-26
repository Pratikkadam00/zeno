import { create } from "zustand";
import {
  canUseBiometrics,
  hasPin as hasPinStored,
  loadLockState,
  maxPinAttempts,
  recordFailedAttempt,
  resetLockState,
  setPin as persistPin,
  unlockWithBiometrics,
  verifyPin
} from "./app-lock";
import { clearPinHash } from "./secure-store";

// App-lock runtime state. The lock is "enabled" exactly when a PIN is set, which
// guarantees biometric unlock always has a working fallback (the prior gap was a
// biometric-only gate that failed open on devices with no enrolled biometric).
type LockStore = {
  ready: boolean;
  enabled: boolean;
  locked: boolean;
  biometricAvailable: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  hydrate: () => Promise<void>;
  lockNow: () => void;
  enableWithPin: (pin: string) => Promise<void>;
  disable: () => Promise<void>;
  tryPin: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  tryBiometric: () => Promise<boolean>;
};

function lockoutActive(lockedUntil: number | null): boolean {
  return lockedUntil !== null && Date.now() < lockedUntil;
}

export const useLockStore = create<LockStore>((set, get) => ({
  ready: false,
  enabled: false,
  locked: false,
  biometricAvailable: false,
  failedAttempts: 0,
  lockedUntil: null,

  hydrate: async () => {
    const [enabled, biometricAvailable, lockState] = await Promise.all([
      hasPinStored(),
      canUseBiometrics(),
      loadLockState()
    ]);
    set({
      ready: true,
      enabled,
      biometricAvailable,
      // Lock on launch whenever a PIN exists; the overlay clears it on unlock.
      locked: enabled,
      failedAttempts: lockState.failedAttempts,
      lockedUntil: lockState.lockedUntil ? Date.parse(lockState.lockedUntil) : null
    });
  },

  lockNow: () => {
    if (get().enabled) set({ locked: true });
  },

  enableWithPin: async (pin: string) => {
    await persistPin(pin);
    await resetLockState();
    set({ enabled: true, locked: false, failedAttempts: 0, lockedUntil: null, biometricAvailable: await canUseBiometrics() });
  },

  disable: async () => {
    await clearPinHash();
    await resetLockState();
    set({ enabled: false, locked: false, failedAttempts: 0, lockedUntil: null });
  },

  tryPin: async (pin: string) => {
    if (lockoutActive(get().lockedUntil)) {
      return { ok: false, error: "Too many attempts. Try again later." };
    }
    if (await verifyPin(pin)) {
      await resetLockState();
      set({ locked: false, failedAttempts: 0, lockedUntil: null });
      return { ok: true };
    }
    const lockedUntilIso = get().lockedUntil ? new Date(get().lockedUntil!).toISOString() : undefined;
    const next = await recordFailedAttempt({ locked: false, failedAttempts: get().failedAttempts, lockedUntil: lockedUntilIso });
    const nextLockedUntil = next.lockedUntil ? Date.parse(next.lockedUntil) : null;
    set({ failedAttempts: next.failedAttempts, lockedUntil: nextLockedUntil });
    if (lockoutActive(nextLockedUntil)) {
      return { ok: false, error: "Too many attempts. Try again in 15 minutes." };
    }
    const remaining = Math.max(0, maxPinAttempts - next.failedAttempts);
    return { ok: false, error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` };
  },

  tryBiometric: async () => {
    if (lockoutActive(get().lockedUntil)) return false;
    const ok = await unlockWithBiometrics();
    if (ok) {
      await resetLockState();
      set({ locked: false, failedAttempts: 0, lockedUntil: null });
    }
    return ok;
  }
}));

import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

// A tiny deterministic in-memory fake for the SecureStore-backed persistence
// app-lock.ts depends on, so the real hashing/lockout LOGIC in app-lock.ts is
// under test, not expo-secure-store's native plumbing.
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: { pinHash: null as string | null, lockState: null as string | null }
}));

vi.mock("./secure-store", () => ({
  savePinHash: async (value: string) => { fakeStore.pinHash = value; },
  loadPinHash: async () => fakeStore.pinHash,
  clearPinHash: async () => { fakeStore.pinHash = null; },
  saveLockStateValue: async (value: string) => { fakeStore.lockState = value; },
  loadLockStateValue: async () => fakeStore.lockState,
  clearLockStateValue: async () => { fakeStore.lockState = null; }
}));

// expo-crypto is native and can't run under Vitest, but Node's built-in
// node:crypto can — use a REAL SHA-256 so the "doesn't leak the raw PIN"
// property is genuinely exercised (a naive identity-preserving mock would
// pass that assertion vacuously, and would also blow up in length over 1000
// hashing rounds instead of staying at a fixed digest size like a real hash).
vi.mock("expo-crypto", () => ({
  getRandomBytes: (size: number) => new Uint8Array(randomBytes(size)),
  digestStringAsync: async (_algo: unknown, input: string) => createHash("sha256").update(input).digest("hex"),
  CryptoDigestAlgorithm: { SHA256: "SHA256" }
}));

const biometricMocks = vi.hoisted(() => ({
  hasHardwareAsync: vi.fn().mockResolvedValue(true),
  isEnrolledAsync: vi.fn().mockResolvedValue(true),
  authenticateAsync: vi.fn().mockResolvedValue({ success: true })
}));
vi.mock("expo-local-authentication", () => biometricMocks);

const {
  canUseBiometrics,
  hasPin,
  loadLockState,
  maxPinAttempts,
  nextLockStateAfterFailure,
  recordFailedAttempt,
  resetLockState,
  setPin,
  unlockWithBiometrics,
  verifyPin
} = await import("./app-lock");

function resetFakeStore() {
  fakeStore.pinHash = null;
  fakeStore.lockState = null;
}

describe("nextLockStateAfterFailure", () => {
  it("increments failedAttempts without locking below the max", () => {
    const next = nextLockStateAfterFailure({ locked: false, failedAttempts: 0 });
    expect(next).toEqual({ locked: false, failedAttempts: 1 });
  });

  it("does not lock at one attempt below the max", () => {
    const next = nextLockStateAfterFailure({ locked: false, failedAttempts: maxPinAttempts - 2 });
    expect(next.locked).toBe(false);
    expect(next.failedAttempts).toBe(maxPinAttempts - 1);
  });

  it("locks exactly at the max-attempts boundary, with a ~15 minute lockedUntil", () => {
    const before = Date.now();
    const next = nextLockStateAfterFailure({ locked: false, failedAttempts: maxPinAttempts - 1 });
    expect(next.locked).toBe(true);
    expect(next.failedAttempts).toBe(maxPinAttempts);
    expect(next.lockedUntil).toBeDefined();
    const lockedUntilMs = Date.parse(next.lockedUntil!);
    expect(lockedUntilMs).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(lockedUntilMs).toBeLessThan(before + 16 * 60 * 1000);
  });
});

describe("setPin / verifyPin / hasPin", () => {
  it("hasPin is false until a PIN is set, true after", async () => {
    resetFakeStore();
    expect(await hasPin()).toBe(false);
    await setPin("1234");
    expect(await hasPin()).toBe(true);
  });

  it("verifies the correct PIN and rejects an incorrect one", async () => {
    resetFakeStore();
    await setPin("4242");
    expect(await verifyPin("4242")).toBe(true);
    expect(await verifyPin("0000")).toBe(false);
  });

  it("returns false when no PIN has ever been set", async () => {
    resetFakeStore();
    expect(await verifyPin("1234")).toBe(false);
  });

  it("stores a versioned, salted hash — not the raw PIN", async () => {
    resetFakeStore();
    await setPin("9999");
    expect(fakeStore.pinHash).not.toContain("9999");
    expect(fakeStore.pinHash?.startsWith("v2$")).toBe(true);
  });

  it("verifies a legacy (unsalted, unversioned) hash and transparently upgrades it", async () => {
    resetFakeStore();
    // Simulate a pre-existing v1 hash for PIN "1111", computed the same way
    // app-lock.ts's internal legacyHashPin does (single unsalted SHA-256).
    fakeStore.pinHash = createHash("sha256").update("zeno.pin.v1.1111").digest("hex");
    expect(await verifyPin("1111")).toBe(true);
    // The successful legacy match should have transparently re-saved as v2.
    expect(fakeStore.pinHash?.startsWith("v2$")).toBe(true);
    expect(await verifyPin("1111")).toBe(true); // still verifies after the upgrade
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    resetFakeStore();
    fakeStore.pinHash = "v2$not-a-number$salt$hash";
    expect(await verifyPin("1234")).toBe(false);
  });
});

describe("loadLockState", () => {
  it("defaults to unlocked with zero attempts when nothing is stored", async () => {
    resetFakeStore();
    expect(await loadLockState()).toEqual({ locked: false, failedAttempts: 0 });
  });

  it("falls back to the default on corrupt JSON instead of throwing", async () => {
    resetFakeStore();
    fakeStore.lockState = "{not valid json";
    expect(await loadLockState()).toEqual({ locked: false, failedAttempts: 0 });
  });

  it("returns an active (not yet expired) lockout as-is", async () => {
    resetFakeStore();
    const future = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    fakeStore.lockState = JSON.stringify({ locked: true, failedAttempts: maxPinAttempts, lockedUntil: future });
    expect(await loadLockState()).toEqual({ locked: true, failedAttempts: maxPinAttempts, lockedUntil: future });
  });

  it("clears the lock once lockedUntil has elapsed, but keeps the failed-attempt count", async () => {
    resetFakeStore();
    const past = new Date(Date.now() - 1000).toISOString();
    fakeStore.lockState = JSON.stringify({ locked: true, failedAttempts: maxPinAttempts, lockedUntil: past });
    expect(await loadLockState()).toEqual({ locked: false, failedAttempts: maxPinAttempts });
  });
});

describe("recordFailedAttempt / resetLockState", () => {
  it("persists the incremented state so it survives a reload", async () => {
    resetFakeStore();
    const first = await recordFailedAttempt({ locked: false, failedAttempts: 0 });
    expect(first).toEqual({ locked: false, failedAttempts: 1 });
    expect(await loadLockState()).toEqual({ locked: false, failedAttempts: 1 });
  });

  it("resetLockState clears persisted state back to the default", async () => {
    resetFakeStore();
    await recordFailedAttempt({ locked: false, failedAttempts: 0 });
    await resetLockState();
    expect(await loadLockState()).toEqual({ locked: false, failedAttempts: 0 });
  });
});

describe("biometrics", () => {
  it("canUseBiometrics is true only when hardware exists AND is enrolled", async () => {
    biometricMocks.hasHardwareAsync.mockResolvedValueOnce(true);
    biometricMocks.isEnrolledAsync.mockResolvedValueOnce(false);
    expect(await canUseBiometrics()).toBe(false);

    biometricMocks.hasHardwareAsync.mockResolvedValueOnce(true);
    biometricMocks.isEnrolledAsync.mockResolvedValueOnce(true);
    expect(await canUseBiometrics()).toBe(true);
  });

  it("unlockWithBiometrics reflects the native prompt's success flag", async () => {
    biometricMocks.authenticateAsync.mockResolvedValueOnce({ success: true });
    expect(await unlockWithBiometrics()).toBe(true);
    biometricMocks.authenticateAsync.mockResolvedValueOnce({ success: false });
    expect(await unlockWithBiometrics()).toBe(false);
  });
});

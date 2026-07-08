import { randomBytes, createHash, pbkdf2Sync } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Same fake-SecureStore approach as app-lock.test.ts: real hashing logic under
// test, native persistence swapped for an in-memory fake.
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

vi.mock("expo-crypto", () => ({
  getRandomBytes: (size: number) => new Uint8Array(randomBytes(size)),
  digestStringAsync: async (_algo: unknown, input: string) => createHash("sha256").update(input).digest("hex"),
  CryptoDigestAlgorithm: { SHA256: "SHA256" }
}));

// react-native-quick-crypto is a native module and can't run under Vitest —
// same real-equivalent stand-in as app-lock.test.ts.
vi.mock("react-native-quick-crypto", () => ({
  pbkdf2Sync: (password: string, salt: string, iterations: number, keylen: number, digest: string) =>
    pbkdf2Sync(password, salt, iterations, keylen, digest)
}));

const biometricMocks = vi.hoisted(() => ({
  hasHardwareAsync: vi.fn().mockResolvedValue(false),
  isEnrolledAsync: vi.fn().mockResolvedValue(false),
  authenticateAsync: vi.fn().mockResolvedValue({ success: true })
}));
vi.mock("expo-local-authentication", () => biometricMocks);

const { useLockStore } = await import("./lock-store");
const { setPin } = await import("./app-lock");

function resetFakeStore() {
  fakeStore.pinHash = null;
  fakeStore.lockState = null;
}

// This directly exercises the exact state transition the mobile-security audit
// flagged as a "critical PIN bypass": LockOverlay's "Sign out instead" button
// calls authStore.logout(), which never touches the PIN (it lives under a
// separate secure-store key, zeno.pin.hash.v1 — see secure-store.ts). The app
// then routes to onboarding, where "Continue without an account" flips
// canUseApp back to true, and RootLayout's effect re-runs useLockStore's
// hydrate(). If hydrate() doesn't re-derive `locked` from whether a PIN is
// still configured, sign-out-then-continue-local-only would land in the app
// with the lock disengaged despite a PIN being set. This test proves it does.
describe("useLockStore.hydrate — re-lock after a sign-out/continue-local-only round trip", () => {
  beforeEach(() => {
    resetFakeStore();
    useLockStore.setState({ ready: false, enabled: false, locked: false, biometricAvailable: false, failedAttempts: 0, lockedUntil: null });
  });

  it("re-engages the lock on re-hydrate even though nothing touched auth session state", async () => {
    await setPin("4242");
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().locked).toBe(true);

    // Simulate a real unlock (tryPin success) — this is the ONLY way `locked`
    // is meant to become false.
    const result = await useLockStore.getState().tryPin("4242");
    expect(result.ok).toBe(true);
    expect(useLockStore.getState().locked).toBe(false);

    // Simulate "Sign out instead" -> authStore.logout(): it clears auth-session
    // secure-store keys and the local-only flag, but per secure-store.ts's key
    // list, has no path to zeno.pin.hash.v1 — so the PIN hash set above must
    // still be present here, unaffected.
    expect(fakeStore.pinHash).not.toBeNull();

    // Simulate RootLayout's effect re-running hydrateLock() when
    // "Continue without an account" flips canUseApp back to true.
    await useLockStore.getState().hydrate();

    // The lock must re-engage — a PIN is still configured, so entering
    // local-only mode again must not grant access without re-entering it.
    expect(useLockStore.getState().locked).toBe(true);
    expect(useLockStore.getState().enabled).toBe(true);
  });

  it("stays unlocked on re-hydrate only if the PIN was actually removed (disable())", async () => {
    await setPin("1234");
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().locked).toBe(true);
    await useLockStore.getState().tryPin("1234");
    expect(useLockStore.getState().locked).toBe(false);

    await useLockStore.getState().disable();
    expect(useLockStore.getState().enabled).toBe(false);

    // Now even after another hydrate (e.g. app relaunch), no PIN means no lock.
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState().locked).toBe(false);
  });
});

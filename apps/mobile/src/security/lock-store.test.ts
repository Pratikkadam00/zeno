import { randomBytes, createHash, pbkdf2Sync, timingSafeEqual } from "node:crypto";
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
    pbkdf2Sync(password, salt, iterations, keylen, digest),
  timingSafeEqual: (a: Uint8Array, b: Uint8Array) => timingSafeEqual(a, b),
  Buffer
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

describe("useLockStore — attempts, lockout, biometrics, enable/lockNow", () => {
  const initial = { ready: false, enabled: false, locked: false, biometricAvailable: false, failedAttempts: 0, lockedUntil: null };
  beforeEach(() => {
    resetFakeStore();
    useLockStore.setState(initial);
    biometricMocks.hasHardwareAsync.mockResolvedValue(false);
    biometricMocks.isEnrolledAsync.mockResolvedValue(false);
    biometricMocks.authenticateAsync.mockReset().mockResolvedValue({ success: true });
  });

  it("lockNow locks only when the lock is enabled", () => {
    useLockStore.getState().lockNow();
    expect(useLockStore.getState().locked).toBe(false);
    useLockStore.setState({ enabled: true });
    useLockStore.getState().lockNow();
    expect(useLockStore.getState().locked).toBe(true);
  });

  it("enableWithPin stores a hash, clears prior lockout state, unlocks, and reads biometric availability", async () => {
    fakeStore.lockState = JSON.stringify({ locked: true, failedAttempts: 7 });
    useLockStore.setState({ failedAttempts: 7, lockedUntil: Date.now() + 60_000 });
    biometricMocks.hasHardwareAsync.mockResolvedValue(true);
    biometricMocks.isEnrolledAsync.mockResolvedValue(true);
    await useLockStore.getState().enableWithPin("2468");
    const s = useLockStore.getState();
    expect(s).toMatchObject({ enabled: true, locked: false, failedAttempts: 0, lockedUntil: null, biometricAvailable: true });
    expect(fakeStore.pinHash?.startsWith("v3$")).toBe(true);
    expect(fakeStore.lockState).toBeNull();
  });

  it("a wrong PIN counts the attempt, persists it, and says how many are left", async () => {
    await setPin("1357");
    await useLockStore.getState().hydrate();
    const r = await useLockStore.getState().tryPin("0000");
    expect(r).toEqual({ ok: false, error: "Incorrect PIN. 9 attempts left." });
    expect(useLockStore.getState().failedAttempts).toBe(1);
    expect(JSON.parse(fakeStore.lockState!)).toMatchObject({ failedAttempts: 1 });
    expect(useLockStore.getState().locked).toBe(true);
  });

  it("uses the singular when exactly one attempt remains", async () => {
    await setPin("1357");
    await useLockStore.getState().hydrate();
    useLockStore.setState({ failedAttempts: 8 });
    expect(await useLockStore.getState().tryPin("0000")).toEqual({ ok: false, error: "Incorrect PIN. 1 attempt left." });
  });

  it("the 10th wrong PIN starts a persisted 15-minute lockout", async () => {
    await setPin("1357");
    await useLockStore.getState().hydrate();
    useLockStore.setState({ failedAttempts: 9 });
    const before = Date.now();
    const r = await useLockStore.getState().tryPin("0000");
    expect(r).toEqual({ ok: false, error: "Too many attempts. Try again in 15 minutes." });
    const until = useLockStore.getState().lockedUntil!;
    expect(until - before).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
    expect(until - before).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
    expect(JSON.parse(fakeStore.lockState!)).toMatchObject({ locked: true, failedAttempts: 10 });
  });

  it("during a lockout even the CORRECT PIN is refused, without checking it", async () => {
    await setPin("1357");
    await useLockStore.getState().hydrate();
    useLockStore.setState({ failedAttempts: 10, lockedUntil: Date.now() + 60_000 });
    const hashBefore = fakeStore.pinHash;
    expect(await useLockStore.getState().tryPin("1357")).toEqual({ ok: false, error: "Too many attempts. Try again later." });
    expect(useLockStore.getState().locked).toBe(true);
    expect(fakeStore.pinHash).toBe(hashBefore);
  });

  it("after the lockout has elapsed, a wrong PIN re-locks at once (the counter was kept)", async () => {
    await setPin("1357");
    await useLockStore.getState().hydrate();
    useLockStore.setState({ failedAttempts: 10, lockedUntil: Date.now() - 1000 });
    const r = await useLockStore.getState().tryPin("0000");
    expect(r.error).toBe("Too many attempts. Try again in 15 minutes.");
    expect(useLockStore.getState().failedAttempts).toBe(11);
  });

  it("after the lockout has elapsed, the correct PIN unlocks and clears everything", async () => {
    await setPin("1357");
    await useLockStore.getState().hydrate();
    fakeStore.lockState = JSON.stringify({ locked: true, failedAttempts: 10 });
    useLockStore.setState({ failedAttempts: 10, lockedUntil: Date.now() - 1000 });
    expect(await useLockStore.getState().tryPin("1357")).toEqual({ ok: true });
    expect(useLockStore.getState()).toMatchObject({ locked: false, failedAttempts: 0, lockedUntil: null });
    expect(fakeStore.lockState).toBeNull();
  });

  it("hydrate restores a persisted lockout and the biometric capability", async () => {
    await setPin("1357");
    const until = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    fakeStore.lockState = JSON.stringify({ locked: true, failedAttempts: 10, lockedUntil: until });
    biometricMocks.hasHardwareAsync.mockResolvedValue(true);
    biometricMocks.isEnrolledAsync.mockResolvedValue(true);
    await useLockStore.getState().hydrate();
    expect(useLockStore.getState()).toMatchObject({ ready: true, enabled: true, locked: true, failedAttempts: 10, lockedUntil: Date.parse(until), biometricAvailable: true });
  });

  it("biometrics: refused during a lockout without prompting; success unlocks; failure keeps the lock", async () => {
    await setPin("1357");
    await useLockStore.getState().hydrate();

    useLockStore.setState({ lockedUntil: Date.now() + 60_000 });
    expect(await useLockStore.getState().tryBiometric()).toBe(false);
    expect(biometricMocks.authenticateAsync).not.toHaveBeenCalled();

    useLockStore.setState({ lockedUntil: null });
    biometricMocks.authenticateAsync.mockResolvedValueOnce({ success: false });
    expect(await useLockStore.getState().tryBiometric()).toBe(false);
    expect(useLockStore.getState().locked).toBe(true);

    fakeStore.lockState = JSON.stringify({ locked: false, failedAttempts: 3 });
    useLockStore.setState({ failedAttempts: 3 });
    biometricMocks.authenticateAsync.mockResolvedValueOnce({ success: true });
    expect(await useLockStore.getState().tryBiometric()).toBe(true);
    expect(useLockStore.getState()).toMatchObject({ locked: false, failedAttempts: 0, lockedUntil: null });
    expect(fakeStore.lockState).toBeNull();
  });
});

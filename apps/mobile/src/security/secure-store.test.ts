import { beforeEach, describe, expect, it, vi } from "vitest";

// This suite targets exactly the gap the mobile-security audit flagged: on the
// web platform there is no native Keychain/Keystore, so secure-store.ts splits
// storage by sensitivity — `sensitive: true` items (PIN hash, DB encryption
// key, lock state, Gmail OAuth tokens) go to an in-memory-only Map that never
// survives a reload (deliberately, so an XSS bug can't read a persisted
// secret), while non-sensitive items (theme preference) go to
// window.localStorage. That branch had zero test coverage before this file.
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "00000000-0000-0000-0000-000000000000" }));
vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn()
}));

function makeFakeLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: () => null,
    get length() { return store.size; },
    // Expose the backing map for direct assertions in tests.
    __store: store
  } as unknown as Storage & { __store: Map<string, string> };
}

async function freshSecureStore() {
  vi.resetModules();
  const fakeStorage = makeFakeLocalStorage();
  vi.stubGlobal("window", { localStorage: fakeStorage });
  const mod = await import("./secure-store");
  return { ...mod, fakeStorage: fakeStorage as Storage & { __store: Map<string, string> } };
}

describe("secure-store — web platform sensitive/non-sensitive split", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("never writes the database encryption key to localStorage", async () => {
    const { getOrCreateDatabaseKey, fakeStorage } = await freshSecureStore();
    const key = await getOrCreateDatabaseKey();
    expect(key.length).toBeGreaterThan(0);
    expect(fakeStorage.__store.size).toBe(0);
  });

  it("returns the SAME database key on repeated calls without ever touching localStorage", async () => {
    const { getOrCreateDatabaseKey, fakeStorage } = await freshSecureStore();
    const first = await getOrCreateDatabaseKey();
    const second = await getOrCreateDatabaseKey();
    expect(second).toBe(first);
    expect(fakeStorage.__store.size).toBe(0);
  });

  it("never writes the PIN hash to localStorage, but round-trips it via in-memory storage", async () => {
    const { savePinHash, loadPinHash, fakeStorage } = await freshSecureStore();
    await savePinHash("v2$1000$somesalt$somehash");
    expect(await loadPinHash()).toBe("v2$1000$somesalt$somehash");
    expect(fakeStorage.__store.size).toBe(0);
  });

  it("clearPinHash removes it from in-memory storage, never touching localStorage", async () => {
    const { savePinHash, loadPinHash, clearPinHash, fakeStorage } = await freshSecureStore();
    await savePinHash("v2$1000$salt$hash");
    await clearPinHash();
    expect(await loadPinHash()).toBeNull();
    expect(fakeStorage.__store.size).toBe(0);
  });

  it("never writes lock state (failed-attempt/lockout tracking) to localStorage", async () => {
    const { saveLockStateValue, loadLockStateValue, fakeStorage } = await freshSecureStore();
    await saveLockStateValue(JSON.stringify({ locked: true, failedAttempts: 10 }));
    expect(await loadLockStateValue()).toBe(JSON.stringify({ locked: true, failedAttempts: 10 }));
    expect(fakeStorage.__store.size).toBe(0);
  });

  it("never writes a connected Gmail account's OAuth token to localStorage", async () => {
    const { saveGmailAccount, getGmailAccountToken, listGmailAddresses, fakeStorage } = await freshSecureStore();
    await saveGmailAccount("user@gmail.com", "ya29.fake-oauth-token");
    expect(await getGmailAccountToken("user@gmail.com")).toBe("ya29.fake-oauth-token");
    expect(await listGmailAddresses()).toEqual(["user@gmail.com"]);
    // Neither the token nor the address index should ever land in localStorage.
    for (const value of fakeStorage.__store.values()) {
      expect(value).not.toContain("ya29.fake-oauth-token");
    }
    expect(fakeStorage.__store.size).toBe(0);
  });

  it("DOES persist the non-sensitive theme preference to localStorage", async () => {
    const { saveThemePreference, loadThemePreference, fakeStorage } = await freshSecureStore();
    await saveThemePreference("genx");
    expect(fakeStorage.__store.size).toBe(1);
    expect(await loadThemePreference()).toBe("genx");
  });

  it("a full sensitive-data sequence never leaks into localStorage while theme preference does", async () => {
    const { savePinHash, saveLockStateValue, saveGmailAccount, saveThemePreference, fakeStorage } = await freshSecureStore();
    await savePinHash("v2$1000$salt$hash");
    await saveLockStateValue(JSON.stringify({ locked: false, failedAttempts: 3 }));
    await saveGmailAccount("victim@gmail.com", "ya29.leaked-if-broken");
    await saveThemePreference("millennial");

    // Exactly one entry made it to localStorage: the non-sensitive theme pref.
    expect(fakeStorage.__store.size).toBe(1);
    const [[, storedValue]] = [...fakeStorage.__store.entries()];
    expect(storedValue).toBe("millennial");
    for (const value of fakeStorage.__store.values()) {
      expect(value).not.toMatch(/hash|leaked|locked/i);
    }
  });
});

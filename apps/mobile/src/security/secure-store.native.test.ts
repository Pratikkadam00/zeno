import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * secure-store.ts on the NATIVE path (iOS / Android) — the path every real
 * phone takes and that no test exercised before (the older suite mocks
 * Platform.OS as "web"). The fake SecureStore below enforces the real
 * library's key rule, copied from expo-secure-store 56.0.4
 * (build/SecureStore.js):
 *
 *   function isValidKey(key) { return typeof key === 'string' && /^[\w.-]+$/.test(key); }
 *   // ensureValidKey(key) throws "Invalid key provided to SecureStore…"
 *   // and is called by getItemAsync, setItemAsync and deleteItemAsync.
 *
 * With a lenient fake, "Gmail connect throws on every device" (F13) was
 * invisible. With a faithful one it is a failing test.
 */
const platform = vi.hoisted(() => ({ OS: "ios" as string }));
vi.mock("react-native", () => ({ Platform: platform }));

const secure = vi.hoisted(() => {
  const store = new Map<string, string>();
  const calls: { op: string; key: string; options?: Record<string, unknown> }[] = [];
  const isValidKey = (key: unknown) => typeof key === "string" && /^[\w.-]+$/.test(key);
  const ensureValidKey = (key: unknown) => {
    if (!isValidKey(key)) {
      throw new Error('Invalid key provided to SecureStore. Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".');
    }
  };
  return { store, calls, isValidKey, ensureValidKey };
});

vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  getItemAsync: async (key: string) => {
    secure.ensureValidKey(key);
    secure.calls.push({ op: "get", key });
    return secure.store.get(key) ?? null;
  },
  setItemAsync: async (key: string, value: string, options?: Record<string, unknown>) => {
    secure.ensureValidKey(key);
    secure.calls.push({ op: "set", key, options });
    secure.store.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    secure.ensureValidKey(key);
    secure.calls.push({ op: "delete", key });
    secure.store.delete(key);
  }
}));

let uuid = 0;
vi.mock("expo-crypto", () => ({ randomUUID: () => `uuid-${(uuid += 1)}` }));

const mod = await import("./secure-store");

beforeEach(() => {
  secure.store.clear();
  secure.calls.length = 0;
  platform.OS = "ios";
});

describe("the fake is faithful to expo-secure-store's key rule", () => {
  it("rejects exactly what the real library rejects", async () => {
    const SecureStore = await import("expo-secure-store");
    await expect(SecureStore.setItemAsync("zeno.oauth.gmail.acct.user@gmail.com", "t")).rejects.toThrow(/Invalid key/);
    await expect(SecureStore.getItemAsync("a b")).rejects.toThrow(/Invalid key/);
    await expect(SecureStore.deleteItemAsync("")).rejects.toThrow(/Invalid key/);
    await expect(SecureStore.setItemAsync("zeno.ok_key-1", "t")).resolves.toBeUndefined();
  });
});

describe("secureStoreKeySegment", () => {
  it("passes [A-Za-z0-9.-] through unchanged", () => {
    expect(mod.secureStoreKeySegment("Abc.def-123")).toBe("Abc.def-123");
  });

  it("escapes @, +, _, space, unicode and surrogate halves as _ + 4 hex", () => {
    expect(mod.secureStoreKeySegment("user@gmail.com")).toBe("user_0040gmail.com");
    expect(mod.secureStoreKeySegment("a+b")).toBe("a_002bb");
    expect(mod.secureStoreKeySegment("a_b")).toBe("a_005fb");
    expect(mod.secureStoreKeySegment("a b")).toBe("a_0020b");
    expect(mod.secureStoreKeySegment("é")).toBe("_00e9");
    expect(mod.secureStoreKeySegment("\u{1F600}")).toBe("_d83d_de00");
    expect(mod.secureStoreKeySegment("")).toBe("");
  });

  it("always yields a valid SecureStore key and never maps two inputs to one key", () => {
    const alphabet = "abcAZ09.-_@+ !#$%&'*/=?^`{|}~é\u{1F600}";
    const chars = [...alphabet];
    const seen = new Map<string, string>();
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let n = 0; n < 2000; n += 1) {
      let input = "";
      const len = 1 + Math.floor(rand() * 12);
      for (let i = 0; i < len; i += 1) input += chars[Math.floor(rand() * chars.length)];
      const key = `zeno.oauth.gmail.acct.${mod.secureStoreKeySegment(input)}`;
      expect(secure.isValidKey(key), JSON.stringify(input)).toBe(true);
      const prior = seen.get(key);
      if (prior !== undefined) expect(prior, `collision: ${JSON.stringify(prior)} vs ${JSON.stringify(input)}`).toBe(input);
      seen.set(key, input);
    }
    // Hand-picked near-collisions an ad-hoc encoding would merge.
    const tricky = ["a_b@x.com", "a@b_x.com", "a_0040b", "a@b", "a.b@x", "a-b@x"];
    expect(new Set(tricky.map(mod.secureStoreKeySegment)).size).toBe(tricky.length);
  });
});

describe("Gmail accounts on a real device (F13 regression)", () => {
  it("connects, lists, reads and removes an account whose address contains @ and +", async () => {
    await mod.saveGmailAccount("  Person+Receipts@Gmail.com ", "ya29.token-A");
    expect(await mod.listGmailAddresses()).toEqual(["person+receipts@gmail.com"]);
    expect(await mod.getGmailAccountToken("person+receipts@gmail.com")).toBe("ya29.token-A");
    expect(await mod.getGmailAccountToken(" PERSON+RECEIPTS@GMAIL.COM")).toBe("ya29.token-A");
    for (const c of secure.calls) expect(secure.isValidKey(c.key), c.key).toBe(true);

    await mod.removeGmailAccount("person+receipts@gmail.com");
    expect(await mod.getGmailAccountToken("person+receipts@gmail.com")).toBeNull();
    expect(await mod.listGmailAddresses()).toEqual([]);
  });

  it("keeps several inboxes apart and does not duplicate the index on re-save", async () => {
    await mod.saveGmailAccount("a@x.com", "t1");
    await mod.saveGmailAccount("b@x.com", "t2");
    await mod.saveGmailAccount("a@x.com", "t1-rotated");
    expect(await mod.listGmailAddresses()).toEqual(["a@x.com", "b@x.com"]);
    expect(await mod.getGmailAccountToken("a@x.com")).toBe("t1-rotated");
    expect(await mod.getGmailAccountToken("b@x.com")).toBe("t2");
  });

  it("stores tokens and the index device-only, never behind a biometric prompt", async () => {
    await mod.saveGmailAccount("a@x.com", "t1");
    const sets = secure.calls.filter((c) => c.op === "set");
    expect(sets).toHaveLength(2);
    for (const s of sets) expect(s.options?.keychainAccessible).toBe("WHEN_UNLOCKED_THIS_DEVICE_ONLY");
    expect(sets[0]?.options?.requireAuthentication).toBe(false);
    for (const s of sets) expect(s.options).not.toHaveProperty("sensitive");
  });

  it("an index that is corrupt, not an array, or holds non-strings degrades safely", async () => {
    secure.store.set("zeno.oauth.gmail.index.v1", "{not json");
    expect(await mod.listGmailAddresses()).toEqual([]);
    secure.store.set("zeno.oauth.gmail.index.v1", JSON.stringify({ a: 1 }));
    expect(await mod.listGmailAddresses()).toEqual([]);
    secure.store.set("zeno.oauth.gmail.index.v1", JSON.stringify(["ok@x.com", 7, null, "b@x.com"]));
    expect(await mod.listGmailAddresses()).toEqual(["ok@x.com", "b@x.com"]);
  });

  it("works identically on Android", async () => {
    platform.OS = "android";
    await mod.saveGmailAccount("droid@x.com", "t");
    expect(await mod.getGmailAccountToken("droid@x.com")).toBe("t");
  });
});

describe("other secrets on the native path", () => {
  it("creates the database key once, device-only, and returns the same key after", async () => {
    const first = await mod.getOrCreateDatabaseKey();
    const second = await mod.getOrCreateDatabaseKey();
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(10);
    const set = secure.calls.find((c) => c.op === "set" && c.key === "zeno.database.key.v1");
    expect(set?.options?.keychainAccessible).toBe("WHEN_UNLOCKED_THIS_DEVICE_ONLY");
  });

  it("PIN hash and lock state round-trip and clear, device-only", async () => {
    await mod.savePinHash("v3$600000$salt$hash");
    expect(await mod.loadPinHash()).toBe("v3$600000$salt$hash");
    await mod.clearPinHash();
    expect(await mod.loadPinHash()).toBeNull();

    await mod.saveLockStateValue('{"locked":true,"failedAttempts":10}');
    expect(await mod.loadLockStateValue()).toBe('{"locked":true,"failedAttempts":10}');
    await mod.clearLockStateValue();
    expect(await mod.loadLockStateValue()).toBeNull();

    for (const s of secure.calls.filter((c) => c.op === "set")) {
      expect(s.options?.keychainAccessible).toBe("WHEN_UNLOCKED_THIS_DEVICE_ONLY");
    }
  });

  it("theme preference goes to SecureStore on native and maps legacy values", async () => {
    await mod.saveThemePreference("genx");
    expect(secure.store.get("zeno.theme.preference.v1")).toBe("genx");
    expect(await mod.loadThemePreference()).toBe("genx");
    for (const [legacy, current] of [["pulse", "genz"], ["clarity", "millennial"], ["command", "genx"], ["genz", "genz"], ["millennial", "millennial"]] as const) {
      secure.store.set("zeno.theme.preference.v1", legacy);
      expect(await mod.loadThemePreference(), legacy).toBe(current);
    }
    secure.store.set("zeno.theme.preference.v1", "neon");
    expect(await mod.loadThemePreference()).toBeNull();
    secure.store.delete("zeno.theme.preference.v1");
    expect(await mod.loadThemePreference()).toBeNull();
  });

  it("clearThemePreference removes the legacy v1 theme key (F27 erase)", async () => {
    await mod.saveThemePreference("genz");
    await mod.clearThemePreference();
    expect(secure.store.has("zeno.theme.preference.v1")).toBe(false);
    expect(secure.calls.at(-1)).toEqual({ op: "delete", key: "zeno.theme.preference.v1" });
  });
});

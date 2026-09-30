import type { ThemePreference } from "@zeno/shared";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const keys = {
  databaseKey: "zeno.database.key.v1",
  themePreference: "zeno.theme.preference.v1",
  pinHash: "zeno.pin.hash.v1",
  lockState: "zeno.lock.state.v1"
};

// On web there is no secure storage. Secrets are kept in memory only so an
// XSS bug can never read persisted tokens; users re-authenticate per session.
const webMemoryStore = new Map<string, string>();

export async function getOrCreateDatabaseKey(): Promise<string> {
  const existing = await readItem(keys.databaseKey, { sensitive: true });
  if (existing) {
    return existing;
  }

  const generated = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  await writeItem(keys.databaseKey, generated, {
    sensitive: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  return generated;
}

export async function saveThemePreference(theme: ThemePreference): Promise<void> {
  await writeItem(keys.themePreference, theme, { sensitive: false });
}

// The v1 theme key predates the AsyncStorage-backed theme provider; a device
// that ran an older build may still hold it, so an erase removes it too.
export async function clearThemePreference(): Promise<void> {
  await deleteItem(keys.themePreference);
}

export async function loadThemePreference(): Promise<ThemePreference | null> {
  const value = await readItem(keys.themePreference, { sensitive: false });
  if (value === "genz" || value === "millennial" || value === "genx") {
    return value;
  }
  if (value === "pulse") {
    return "genz";
  }
  if (value === "clarity") {
    return "millennial";
  }
  if (value === "command") {
    return "genx";
  }
  return null;
}

export async function savePinHash(pinHash: string): Promise<void> {
  await writeItem(keys.pinHash, pinHash, {
    sensitive: true,
    requireAuthentication: false,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

export async function loadPinHash(): Promise<string | null> {
  return readItem(keys.pinHash, { sensitive: true });
}

export async function clearPinHash(): Promise<void> {
  await deleteItem(keys.pinHash);
}

export async function saveLockStateValue(serialized: string): Promise<void> {
  await writeItem(keys.lockState, serialized, {
    sensitive: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

export async function loadLockStateValue(): Promise<string | null> {
  return readItem(keys.lockState, { sensitive: true });
}

export async function clearLockStateValue(): Promise<void> {
  await deleteItem(keys.lockState);
}

// ── Multi-account Gmail registry ───────────────────────────────────────────
// Each connected inbox stores its token under a per-address key, with an index
// of addresses so the user can connect several inboxes (personal + work).

const gmailIndexKey = "zeno.oauth.gmail.index.v1";
const gmailAccountPrefix = "zeno.oauth.gmail.acct.";

// expo-secure-store accepts only keys matching /^[\w.-]+$/ and THROWS on any
// other key in get/set/delete (build/SecureStore.js, ensureValidKey, 56.0.4).
// An email address contains "@" (often "+" too), so using it raw in the key
// made every Gmail connect throw on a real device (finding F13) — the old tests
// passed only because they ran on the web branch with a lenient fake.
//
// Injective encoding: [A-Za-z0-9.-] pass through unchanged; every other UTF-16
// code unit — including "_", the escape character itself — becomes "_" + four
// hex digits. Distinct inputs can never share a key, and every output is valid.
export function secureStoreKeySegment(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]!;
    out += /[A-Za-z0-9.-]/.test(ch) ? ch : `_${value.charCodeAt(i).toString(16).padStart(4, "0")}`;
  }
  return out;
}

function gmailAccountKey(address: string): string {
  return `${gmailAccountPrefix}${secureStoreKeySegment(address.trim().toLowerCase())}`;
}

export async function saveGmailAccount(address: string, token: string): Promise<void> {
  const normalized = address.trim().toLowerCase();
  await writeItem(gmailAccountKey(normalized), token, {
    sensitive: true,
    requireAuthentication: false,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  const addresses = await listGmailAddresses();
  if (!addresses.includes(normalized)) {
    await writeItem(gmailIndexKey, JSON.stringify([...addresses, normalized]), {
      sensitive: true,
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
  }
}

export async function listGmailAddresses(): Promise<string[]> {
  const raw = await readItem(gmailIndexKey, { sensitive: true });
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export async function getGmailAccountToken(address: string): Promise<string | null> {
  return readItem(gmailAccountKey(address), { sensitive: true });
}

export async function removeGmailAccount(address: string): Promise<void> {
  const normalized = address.trim().toLowerCase();
  await deleteItem(gmailAccountKey(normalized));
  const addresses = (await listGmailAddresses()).filter((value) => value !== normalized);
  await writeItem(gmailIndexKey, JSON.stringify(addresses), {
    sensitive: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

type ItemOptions = SecureStore.SecureStoreOptions & { sensitive: boolean };

async function readItem(key: string, options: ItemOptions): Promise<string | null> {
  if (Platform.OS === "web") {
    if (options.sensitive) {
      return webMemoryStore.get(key) ?? null;
    }
    return getWebStorage()?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function writeItem(key: string, value: string, options: ItemOptions): Promise<void> {
  if (Platform.OS === "web") {
    if (options.sensitive) {
      webMemoryStore.set(key, value);
    } else {
      getWebStorage()?.setItem(key, value);
    }
    return;
  }
  const { sensitive: _sensitive, ...secureStoreOptions } = options;
  await SecureStore.setItemAsync(key, value, secureStoreOptions);
}

// Deleting needs no sensitivity flag: on web the key is removed from BOTH the
// in-memory store and localStorage, which is correct whichever one held it (the
// old per-flag branch for non-sensitive deletes had no caller at all).
async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    webMemoryStore.delete(key);
    getWebStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function getWebStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

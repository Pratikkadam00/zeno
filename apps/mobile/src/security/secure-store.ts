import type { ThemePreference } from "@subradar/shared";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const keys = {
  databaseKey: "subradar.database.key.v1",
  themePreference: "subradar.theme.preference.v1",
  pinHash: "subradar.pin.hash.v1",
  oauthTokenPrefix: "subradar.oauth."
};

export async function getOrCreateDatabaseKey(): Promise<string> {
  const existing = await readItem(keys.databaseKey);
  if (existing) {
    return existing;
  }

  const generated = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  await writeItem(keys.databaseKey, generated, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  return generated;
}

export async function saveThemePreference(theme: ThemePreference): Promise<void> {
  await writeItem(keys.themePreference, theme);
}

export async function loadThemePreference(): Promise<ThemePreference | null> {
  const value = await readItem(keys.themePreference);
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
    requireAuthentication: false,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

export async function loadPinHash(): Promise<string | null> {
  return readItem(keys.pinHash);
}

export async function saveOAuthToken(provider: string, token: string): Promise<void> {
  await writeItem(`${keys.oauthTokenPrefix}${provider}`, token, {
    requireAuthentication: true,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

export async function deleteOAuthToken(provider: string): Promise<void> {
  await deleteItem(`${keys.oauthTokenPrefix}${provider}`);
}

async function readItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return getWebStorage()?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function writeItem(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, options);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
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

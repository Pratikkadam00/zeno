import type { ApiEnvelope } from "@zeno/shared";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import { ResponseType } from "expo-auth-session";
import { discovery as googleDiscovery } from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { create } from "zustand";
import { getApiBaseUrl } from "../api/client";
import { timedFetch } from "../api/http";
import type { BillingPlan } from "../billing/revenueCat";

WebBrowser.maybeCompleteAuthSession();

const refreshIntervalMs = 14 * 60 * 1000;

const tokenKeys = {
  accessToken: "zeno.auth.accessToken.v1",
  refreshToken: "zeno.auth.refreshToken.v1",
  accountId: "zeno.auth.accountId.v1",
  accessTokenExpiresAt: "zeno.auth.accessTokenExpiresAt.v1"
};

type AuthStatus = "loading" | "anonymous" | "pending" | "authenticated";

type AuthSessionResponse = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  refreshExpiresInSeconds: number;
  tokenType: "Bearer";
};

type MagicLinkResponse = {
  delivered: true;
  channel: "resend" | "dev_log";
  expiresInSeconds: number;
};

type StoredSession = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
};

type RuntimeAuthSession = StoredSession | null;

type GoogleConfig = {
  expoClientId?: string;
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
};

type AuthStoreState = {
  status: AuthStatus;
  isAuthenticated: boolean;
  accountId: string | null;
  plan: BillingPlan;
  accessTokenExpiresAt: number | null;
  lastMagicLinkEmail: string | null;
  error: string | null;
  hydrate: () => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  loginWithDemoAccount: (email: string, password: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  getValidAccessToken: () => Promise<string | null>;
  setPlan: (plan: BillingPlan) => void;
};

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let memorySession: RuntimeAuthSession = null;

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  status: "loading",
  isAuthenticated: false,
  accountId: null,
  plan: "free",
  accessTokenExpiresAt: null,
  lastMagicLinkEmail: null,
  error: null,

  async hydrate() {
    set({ status: "loading", error: null });
    const session = await readStoredSession();
    if (!session?.refreshToken) {
      stopRefreshTimer();
      setAnonymous(set);
      return;
    }

    if (session.accessTokenExpiresAt <= Date.now() + 30_000) {
      set({
        status: "authenticated",
        isAuthenticated: true,
        accountId: session.accountId,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        error: null
      });
      await get().refreshToken();
      return;
    }

    startRefreshTimer(get);
    setAuthenticated(set, session);
  },

  async loginWithMagicLink(email: string) {
    set({ status: "pending", error: null, lastMagicLinkEmail: email.trim() });
    try {
      await apiPost<MagicLinkResponse>("/auth/magic-link", { email: email.trim() });
      set({ status: "anonymous", isAuthenticated: false, error: null });
    } catch (error) {
      set({ status: "anonymous", isAuthenticated: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  async loginWithDemoAccount(email: string, password: string) {
    set({ status: "loading", error: null });
    try {
      const session = await apiPost<AuthSessionResponse>("/auth/demo-login", {
        email: email.trim(),
        password
      });
      await persistSession(session);
      startRefreshTimer(get);
      setAuthenticated(set, toStoredSession(session));
    } catch (error) {
      await clearStoredSession();
      stopRefreshTimer();
      set({ status: "anonymous", isAuthenticated: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  async verifyMagicLink(token: string) {
    set({ status: "loading", error: null });
    try {
      const session = await apiGet<AuthSessionResponse>(`/auth/verify?token=${encodeURIComponent(token)}`);
      await persistSession(session);
      startRefreshTimer(get);
      setAuthenticated(set, toStoredSession(session));
    } catch (error) {
      await clearStoredSession();
      stopRefreshTimer();
      set({ status: "anonymous", isAuthenticated: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  async loginWithApple() {
    set({ status: "loading", error: null });
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error("Sign in with Apple is only available on supported Apple devices.");
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ]
      });

      if (!credential.identityToken) {
        throw new Error("Apple did not return an identity token.");
      }

      const session = await apiPost<AuthSessionResponse>("/auth/apple", {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode ?? undefined,
        email: credential.email ?? undefined,
        fullName: credential.fullName ? AppleAuthentication.formatFullName(credential.fullName) : undefined
      });

      await persistSession(session);
      startRefreshTimer(get);
      setAuthenticated(set, toStoredSession(session));
    } catch (error) {
      set({ status: "anonymous", isAuthenticated: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  async loginWithGoogle() {
    set({ status: "loading", error: null });
    try {
      const config = readGoogleConfig();
      const clientId = selectGoogleClientId(config);
      if (!clientId) {
        throw new Error("Google OAuth client ID is not configured.");
      }

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "zeno",
        path: "auth/google"
      });
      const request = await AuthSession.loadAsync({
        clientId,
        responseType: ResponseType.IdToken,
        redirectUri,
        scopes: ["openid", "profile", "email"],
        extraParams: { nonce: createNonce() }
      }, googleDiscovery);
      const result = await request.promptAsync(googleDiscovery);

      if (result.type !== "success") {
        throw new Error("Google sign-in was cancelled.");
      }

      const session = await apiPost<AuthSessionResponse>("/auth/google", {
        idToken: result.params.id_token,
        accessToken: result.params.access_token,
        serverAuthCode: result.params.code
      });

      await persistSession(session);
      startRefreshTimer(get);
      setAuthenticated(set, toStoredSession(session));
    } catch (error) {
      set({ status: "anonymous", isAuthenticated: false, error: getErrorMessage(error) });
      throw error;
    }
  },

  async refreshToken() {
    const session = await readStoredSession();
    if (!session?.refreshToken) {
      stopRefreshTimer();
      await clearStoredSession();
      setAnonymous(set);
      return;
    }

    try {
      const refreshed = await apiPost<AuthSessionResponse>("/auth/refresh", {
        refreshToken: session.refreshToken
      });
      await persistSession(refreshed);
      startRefreshTimer(get);
      setAuthenticated(set, toStoredSession(refreshed));
    } catch (error) {
      stopRefreshTimer();
      await clearStoredSession();
      set({ status: "anonymous", isAuthenticated: false, accountId: null, accessTokenExpiresAt: null, error: getErrorMessage(error) });
    }
  },

  async logout() {
    const session = await readStoredSession();
    try {
      if (session?.refreshToken) {
        await apiPost("/auth/logout", { refreshToken: session.refreshToken });
      }
    } finally {
      stopRefreshTimer();
      await clearStoredSession();
      setAnonymous(set);
    }
  },

  async getAccessToken() {
    const session = await readStoredSession();
    return session?.accessToken ?? null;
  },

  // Returns a non-expired access token for attaching to API requests, refreshing
  // first if it's at/near expiry. Returns null if the user isn't signed in.
  async getValidAccessToken() {
    const session = await readStoredSession();
    if (!session?.accessToken) {
      return null;
    }
    if (session.accessTokenExpiresAt && session.accessTokenExpiresAt - 30_000 <= Date.now()) {
      await get().refreshToken();
      return (await readStoredSession())?.accessToken ?? null;
    }
    return session.accessToken;
  },

  setPlan(plan: BillingPlan) {
    set({ plan });
  }
}));

function startRefreshTimer(get: () => AuthStoreState): void {
  stopRefreshTimer();
  refreshTimer = setInterval(() => {
    void get().refreshToken();
  }, refreshIntervalMs);
}

function stopRefreshTimer(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function setAuthenticated(set: (partial: Partial<AuthStoreState>) => void, session: StoredSession): void {
  set({
    status: "authenticated",
    isAuthenticated: true,
    accountId: session.accountId,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    error: null
  });
}

function setAnonymous(set: (partial: Partial<AuthStoreState>) => void): void {
  set({
    status: "anonymous",
    isAuthenticated: false,
    accountId: null,
    plan: "free",
    accessTokenExpiresAt: null,
    error: null
  });
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await timedFetch(`${getApiBaseUrl()}${path}`, {}, { retries: 1 });
  return readEnvelope<T>(response);
}

async function apiPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await timedFetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return readEnvelope<T>(response);
}

async function readEnvelope<T>(response: Response): Promise<T> {
  // A non-JSON error page (502/503 from a proxy) would make response.json()
  // throw a confusing parse error; surface the HTTP status instead.
  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = await response.json() as ApiEnvelope<T>;
  } catch {
    throw new Error(`Auth request failed with HTTP ${response.status}.`);
  }
  if (!response.ok || envelope.error) {
    throw new Error(envelope.error?.message ?? `Auth request failed with HTTP ${response.status}`);
  }
  if (envelope.data === null) {
    throw new Error("Auth response did not include data.");
  }
  return envelope.data;
}

async function persistSession(session: AuthSessionResponse): Promise<void> {
  const stored = toStoredSession(session);
  if (Platform.OS === "web") {
    memorySession = stored;
    return;
  }

  const options: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  };
  await SecureStore.setItemAsync(tokenKeys.accessToken, stored.accessToken, options);
  await SecureStore.setItemAsync(tokenKeys.refreshToken, stored.refreshToken, options);
  await SecureStore.setItemAsync(tokenKeys.accountId, stored.accountId, options);
  await SecureStore.setItemAsync(tokenKeys.accessTokenExpiresAt, String(stored.accessTokenExpiresAt), options);
}

async function readStoredSession(): Promise<StoredSession | null> {
  if (Platform.OS === "web") {
    return memorySession;
  }

  const [accessToken, refreshToken, accountId, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(tokenKeys.accessToken),
    SecureStore.getItemAsync(tokenKeys.refreshToken),
    SecureStore.getItemAsync(tokenKeys.accountId),
    SecureStore.getItemAsync(tokenKeys.accessTokenExpiresAt)
  ]);

  if (!accessToken || !refreshToken || !accountId || !expiresAt) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    accountId,
    accessTokenExpiresAt: Number(expiresAt)
  };
}

async function clearStoredSession(): Promise<void> {
  if (Platform.OS === "web") {
    memorySession = null;
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(tokenKeys.accessToken),
    SecureStore.deleteItemAsync(tokenKeys.refreshToken),
    SecureStore.deleteItemAsync(tokenKeys.accountId),
    SecureStore.deleteItemAsync(tokenKeys.accessTokenExpiresAt)
  ]);
}

function toStoredSession(session: AuthSessionResponse): StoredSession {
  return {
    accountId: session.accountId,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpiresAt: Date.now() + session.expiresInSeconds * 1000
  };
}

function readGoogleConfig(): GoogleConfig {
  const extra = Constants.expoConfig?.extra as (GoogleConfig & { google?: GoogleConfig }) | undefined;
  return extra?.google ?? extra ?? {};
}

function selectGoogleClientId(config: GoogleConfig): string | null {
  if (Platform.OS === "ios") {
    return config.iosClientId ?? config.expoClientId ?? config.webClientId ?? null;
  }
  if (Platform.OS === "android") {
    return config.androidClientId ?? config.expoClientId ?? config.webClientId ?? null;
  }
  return config.webClientId ?? config.expoClientId ?? null;
}

function createNonce(): string {
  return Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Authentication failed.";
}

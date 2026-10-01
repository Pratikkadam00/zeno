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
import { getApiBaseUrl } from "../api/config";
import { timedFetch } from "../api/http";
import type { BillingPlan } from "../billing/revenueCat";
import { emailClaim } from "./jwt-claims";

WebBrowser.maybeCompleteAuthSession();

const refreshIntervalMs = 14 * 60 * 1000;

const tokenKeys = {
  accessToken: "zeno.auth.accessToken.v1",
  refreshToken: "zeno.auth.refreshToken.v1",
  accountId: "zeno.auth.accountId.v1",
  accessTokenExpiresAt: "zeno.auth.accessTokenExpiresAt.v1"
};

// A device-local flag (not a session — there is no account) recording that the
// user explicitly chose "Continue without an account" on onboarding. Checked
// only when there's no stored session, so it never overrides a real login.
const localOnlyKey = "zeno.auth.localOnly.v1";

// P3.5 (F100): a sign-in link is honoured only if THIS device asked for one, for
// this email, and that request has not expired (the server's own
// expiresInSeconds). Without it, anyone could send "zeno://auth/verify?token=
// <a token for THEIR account>" and one tap signed the phone into their account;
// a junk token signed a signed-in user out.
const pendingMagicLinkKey = "zeno.auth.pendingMagicLink.v1";
export const LINK_NOT_REQUESTED = "This sign-in link wasn't requested on this phone, or it has expired. Request a new one.";
export const LINK_WRONG_ACCOUNT = "That sign-in link is for a different email than the one you entered here.";

type AuthStatus = "loading" | "anonymous" | "pending" | "authenticated" | "local_only";

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
  /** F125: the signed-in email, from the session's access token (every token
   *  the API issues carries it). Null when signed out, local-only, or a token
   *  without one: the UI then says so instead of showing the account id. */
  email: string | null;
  plan: BillingPlan;
  accessTokenExpiresAt: number | null;
  lastMagicLinkEmail: string | null;
  error: string | null;
  hydrate: () => Promise<void>;
  continueLocalOnly: () => Promise<void>;
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
// De-dupes concurrent refreshToken() calls onto a single in-flight request.
// Several screens call getValidAccessToken() in parallel (e.g. on app resume:
// notifications, widgets, billing, family/sync all fire together) — without
// this, each one independently reads the same not-yet-rotated refresh token
// and POSTs it to /auth/refresh, which is single-use server-side: only the
// first request wins, and every other one's catch block would clear the
// session and force-log-out the user even though the winner's refresh just
// succeeded moments earlier.
let refreshInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  status: "loading",
  isAuthenticated: false,
  accountId: null,
  email: null,
  plan: "free",
  accessTokenExpiresAt: null,
  lastMagicLinkEmail: null,
  error: null,

  async hydrate() {
    // F154: launch reads the keychain while a sign-in can complete (a sign-in
    // link opens the app and is verified alongside this). A read that started
    // before that sign-in saved its session returns "none" and used to sign the
    // user straight back out. Any sign-in or local-only choice made meanwhile
    // wins: this stands down.
    const decisionsAtStart = authDecisions;
    set({ status: "loading", error: null });
    const session = await readStoredSession();
    if (authDecisions !== decisionsAtStart) return;
    if (!session?.refreshToken) {
      stopRefreshTimer();
      // No session — but the user may have previously chosen "Continue without
      // an account". That choice persists across restarts so they land straight
      // back in the app instead of seeing onboarding again every launch.
      const localOnly = await readLocalOnlyFlag();
      if (authDecisions !== decisionsAtStart) return;
      if (localOnly) {
        set({ status: "local_only", isAuthenticated: false, accountId: null, email: null, error: null });
        return;
      }
      setAnonymous(set);
      return;
    }

    if (session.accessTokenExpiresAt <= Date.now() + 30_000) {
      set({
        status: "authenticated",
        isAuthenticated: true,
        accountId: session.accountId,
        email: emailClaim(session.accessToken),
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        error: null
      });
      await get().refreshToken();
      return;
    }

    startRefreshTimer(get);
    setAuthenticated(set, session);
  },

  // "Continue without an account" from onboarding. No server session exists —
  // this only unlocks local screens; anything server-side (cloud sync, AI
  // coach, Family Vault) stays gated on a real login, unchanged.
  async continueLocalOnly() {
    await persistLocalOnlyFlag();
    authDecisions += 1;
    set({ status: "local_only", isAuthenticated: false, accountId: null, email: null, error: null });
  },

  async loginWithMagicLink(email: string) {
    set({ status: "pending", error: null, lastMagicLinkEmail: email.trim() });
    try {
      const sent = await apiPost<MagicLinkResponse>("/auth/magic-link", { email: email.trim() });
      await savePendingMagicLink({ email: email.trim().toLowerCase(), expiresAt: Date.now() + sent.expiresInSeconds * 1000 });
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
    // Refused BEFORE any server call, so a foreign link neither spends a token
    // nor touches the session already on this device.
    const pending = get().isAuthenticated ? null : await readPendingMagicLink();
    if (!pending) {
      set({ error: LINK_NOT_REQUESTED });
      throw new Error(LINK_NOT_REQUESTED);
    }
    set({ status: "loading", error: null });
    let session: AuthSessionResponse;
    try {
      session = await apiGet<AuthSessionResponse>(`/auth/verify?token=${encodeURIComponent(token)}`);
    } catch (error) {
      set({ status: "anonymous", isAuthenticated: false, error: getErrorMessage(error) });
      throw error;
    }
    // A valid link, but for another account: discard the session it issued.
    if (emailClaim(session.accessToken)?.trim().toLowerCase() !== pending.email) {
      set({ status: "anonymous", isAuthenticated: false, error: LINK_WRONG_ACCOUNT });
      throw new Error(LINK_WRONG_ACCOUNT);
    }
    try {
      await clearPendingMagicLink();
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

      // OIDC nonce (F10): Apple gets only SHA-256(raw); the raw value goes to our
      // API, which requires the token's nonce claim to equal that hash.
      const nonce = await createNoncePair();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ],
        nonce: nonce.hashed
      });

      if (!credential.identityToken) {
        throw new Error("Apple did not return an identity token.");
      }

      // No email: the server takes it from the verified identity token only (F23).
      const session = await apiPost<AuthSessionResponse>("/auth/apple", {
        identityToken: credential.identityToken,
        nonce: nonce.raw,
        authorizationCode: credential.authorizationCode ?? undefined,
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
      // OIDC nonce (F10): Google gets SHA-256(raw); our API gets the raw value.
      // The nonce used to be generated here and never sent to the server, so it
      // bound nothing.
      const nonce = await createNoncePair();
      const request = await AuthSession.loadAsync({
        clientId,
        responseType: ResponseType.IdToken,
        redirectUri,
        scopes: ["openid", "profile", "email"],
        extraParams: { nonce: nonce.hashed }
      }, googleDiscovery);
      const result = await request.promptAsync(googleDiscovery);

      if (result.type !== "success") {
        throw new Error("Google sign-in was cancelled.");
      }

      // Only the ID token and the raw nonce. The Google ACCESS token (and any
      // server code) is not sent: our API never needs to call Google as the user.
      const session = await apiPost<AuthSessionResponse>("/auth/google", {
        idToken: result.params.id_token,
        nonce: nonce.raw
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
    if (refreshInFlight) {
      return refreshInFlight;
    }
    refreshInFlight = (async () => {
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
        if (!isDefinitiveRejection(error)) {
          // Offline, a timeout, a 429 or a 5xx (Render's free tier returns 502/503
          // while it wakes up) says nothing about the refresh token. Signing out
          // here deleted a valid 30-day session every time the app opened
          // offline with an expired access token (finding F43). Keep the
          // session; the timer, or the next getValidAccessToken(), retries.
          startRefreshTimer(get);
          set({ error: getErrorMessage(error) });
          return;
        }
        stopRefreshTimer();
        await clearStoredSession();
        set({ status: "anonymous", isAuthenticated: false, accountId: null, email: null, accessTokenExpiresAt: null, error: getErrorMessage(error) });
      }
    })();
    try {
      await refreshInFlight;
    } finally {
      refreshInFlight = null;
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
      // A full sign-out always clears the local-only choice too, so "logout"
      // is a complete reset back to onboarding — not a silent fall-through into
      // local-only mode on the next launch.
      await clearLocalOnlyFlag();
      // An unused sign-in request holds an email address: a sign-out forgets it.
      await clearPendingMagicLink();
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
      // A refresh that failed transiently keeps the (expired) session: that is
      // not a token to send. Only a still-valid one is returned (F43).
      const after = await readStoredSession();
      return after && after.accessTokenExpiresAt > Date.now() ? after.accessToken : null;
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

// F154: counts sign-ins and local-only choices, so a launch read that began
// before one of them knows its answer is stale.
let authDecisions = 0;

function setAuthenticated(set: (partial: Partial<AuthStoreState>) => void, session: StoredSession): void {
  authDecisions += 1;
  // A real login always supersedes a prior "local-only" choice — clear it so a
  // later sign-out doesn't fall back into local-only mode with a stale flag.
  void clearLocalOnlyFlag();
  set({
    status: "authenticated",
    isAuthenticated: true,
    accountId: session.accountId,
    email: emailClaim(session.accessToken),
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    error: null
  });
}

function setAnonymous(set: (partial: Partial<AuthStoreState>) => void): void {
  set({
    status: "anonymous",
    isAuthenticated: false,
    accountId: null,
    email: null,
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

// An auth request the SERVER answered with an error status. A network failure
// or timeout is a plain Error from timedFetch instead: it carries no status.
class AuthHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AuthHttpError";
  }
}

// Only the server saying the refresh token itself is bad ends the session:
// 401 (invalid, expired, already rotated) or 400 (the stored value is not even
// a well-formed token). Everything else is transient (F43).
function isDefinitiveRejection(error: unknown): boolean {
  return error instanceof AuthHttpError && (error.status === 401 || error.status === 400);
}

async function readEnvelope<T>(response: Response): Promise<T> {
  // A non-JSON error page (502/503 from a proxy) would make response.json()
  // throw a confusing parse error; surface the HTTP status instead.
  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = await response.json() as ApiEnvelope<T>;
  } catch {
    throw new AuthHttpError(`Auth request failed with HTTP ${response.status}.`, response.status);
  }
  if (!response.ok || envelope.error) {
    throw new AuthHttpError(envelope.error?.message ?? `Auth request failed with HTTP ${response.status}`, response.status);
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

let memoryLocalOnly = false;

type PendingMagicLink = { email: string; expiresAt: number };
let memoryPendingMagicLink: string | null = null;

async function savePendingMagicLink(pending: PendingMagicLink): Promise<void> {
  const value = JSON.stringify(pending);
  if (Platform.OS === "web") {
    memoryPendingMagicLink = value;
    return;
  }
  await SecureStore.setItemAsync(pendingMagicLinkKey, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

/** The unexpired pending request, or null (none, expired, or unreadable). */
async function readPendingMagicLink(): Promise<PendingMagicLink | null> {
  const raw = Platform.OS === "web" ? memoryPendingMagicLink : await SecureStore.getItemAsync(pendingMagicLinkKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingMagicLink> | null;
    if (typeof parsed?.email !== "string" || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) return null;
    return { email: parsed.email, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

async function clearPendingMagicLink(): Promise<void> {
  if (Platform.OS === "web") {
    memoryPendingMagicLink = null;
    return;
  }
  await SecureStore.deleteItemAsync(pendingMagicLinkKey);
}

async function persistLocalOnlyFlag(): Promise<void> {
  if (Platform.OS === "web") {
    memoryLocalOnly = true;
    return;
  }
  await SecureStore.setItemAsync(localOnlyKey, "1", {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

async function readLocalOnlyFlag(): Promise<boolean> {
  if (Platform.OS === "web") {
    return memoryLocalOnly;
  }
  return (await SecureStore.getItemAsync(localOnlyKey)) === "1";
}

async function clearLocalOnlyFlag(): Promise<void> {
  if (Platform.OS === "web") {
    memoryLocalOnly = false;
    return;
  }
  await SecureStore.deleteItemAsync(localOnlyKey);
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

// A fresh random raw nonce (16 bytes → 32 hex chars) and its lowercase-hex
// SHA-256, the form the API compares against (routes/auth.ts nonceHash).
// Lowercased explicitly so no platform's hex casing can cause a mismatch.
export async function createNoncePair(): Promise<{ raw: string; hashed: string }> {
  const raw = Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const hashed = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw, { encoding: Crypto.CryptoEncoding.HEX })).toLowerCase();
  return { raw, hashed };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Authentication failed.";
}

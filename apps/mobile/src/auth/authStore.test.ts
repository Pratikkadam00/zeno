import { beforeEach, describe, expect, it, vi } from "vitest";

// authStore.ts pulls in several native/RN modules purely for the OAuth flows
// this suite doesn't exercise. Stub them just enough for the module to load —
// mirrors the established pattern in revenueCat.test.ts / app-lock.test.ts.
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-apple-authentication", () => ({
  isAvailableAsync: vi.fn(),
  signInAsync: vi.fn(),
  AppleAuthenticationScope: { FULL_NAME: "fullName", EMAIL: "email" },
  formatFullName: vi.fn()
}));
vi.mock("expo-auth-session", () => ({
  ResponseType: { IdToken: "id_token" },
  makeRedirectUri: vi.fn(),
  loadAsync: vi.fn()
}));
vi.mock("expo-auth-session/providers/google", () => ({ discovery: {} }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} }, easConfig: {} } }));
vi.mock("expo-crypto", () => ({ getRandomBytes: (size: number) => new Uint8Array(size) }));
vi.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: vi.fn() }));
vi.mock("../api/client", () => ({ getApiBaseUrl: () => "http://test.invalid/api/v1" }));

const timedFetchMock = vi.fn();
vi.mock("../api/http", () => ({ timedFetch: (...args: unknown[]) => timedFetchMock(...args) }));

// A tiny deterministic in-memory fake for expo-secure-store, so the real
// local-only persistence LOGIC in authStore.ts is under test, not the native
// keychain plumbing.
const { fakeStore } = vi.hoisted(() => ({ fakeStore: new Map<string, string>() }));
vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "whenUnlockedThisDeviceOnly",
  setItemAsync: async (key: string, value: string) => { fakeStore.set(key, value); },
  getItemAsync: async (key: string) => fakeStore.get(key) ?? null,
  deleteItemAsync: async (key: string) => { fakeStore.delete(key); }
}));

const { useAuthStore } = await import("./authStore");

function authSessionEnvelope() {
  return new Response(
    JSON.stringify({
      data: {
        accountId: "acct_1",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresInSeconds: 900,
        refreshExpiresInSeconds: 2_592_000,
        tokenType: "Bearer"
      },
      error: null
    }),
    { status: 200 }
  );
}

beforeEach(() => {
  fakeStore.clear();
  timedFetchMock.mockReset();
  useAuthStore.setState({
    status: "loading",
    isAuthenticated: false,
    accountId: null,
    plan: "free",
    accessTokenExpiresAt: null,
    lastMagicLinkEmail: null,
    error: null
  });
});

describe("local-only mode", () => {
  it("continueLocalOnly sets local_only status with no account, not authenticated", async () => {
    await useAuthStore.getState().continueLocalOnly();
    const state = useAuthStore.getState();
    expect(state.status).toBe("local_only");
    expect(state.isAuthenticated).toBe(false);
    expect(state.accountId).toBeNull();
  });

  it("hydrate restores local_only across a simulated app restart (no session, flag persisted)", async () => {
    await useAuthStore.getState().continueLocalOnly();
    // Simulate a fresh boot: in-memory status resets, persisted flag survives.
    useAuthStore.setState({ status: "loading" });
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe("local_only");
  });

  it("hydrate falls back to anonymous (login required) when neither a session nor the local-only flag exists", async () => {
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe("anonymous");
  });

  it("logout clears the local-only flag, so a later hydrate returns to anonymous rather than local_only", async () => {
    await useAuthStore.getState().continueLocalOnly();
    await useAuthStore.getState().logout();
    useAuthStore.setState({ status: "loading" });
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe("anonymous");
  });

  it("a real login after local-only mode supersedes it, and signing out again never resurrects local-only", async () => {
    await useAuthStore.getState().continueLocalOnly();

    // A fresh Response per call — verifyMagicLink and the later logout() each
    // read the body once, and a shared Response instance can only be read once.
    timedFetchMock.mockImplementation(async () => authSessionEnvelope());
    await useAuthStore.getState().verifyMagicLink("some-magic-token");
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().accountId).toBe("acct_1");

    await useAuthStore.getState().logout();
    useAuthStore.setState({ status: "loading" });
    await useAuthStore.getState().hydrate();
    // Not local_only: the real login cleared the stale local-only flag, so a
    // sign-out is a full reset back to the login screen, not a silent
    // fall-through into a mode this user never chose after creating an account.
    expect(useAuthStore.getState().status).toBe("anonymous");
  });
});

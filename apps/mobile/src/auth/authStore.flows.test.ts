import { createHash, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The mobile auth store, every flow: hydrate (none / local-only / near expiry /
 * valid + timer), local-only mode, magic link, demo login, Apple and Google
 * (incl. the F10 nonce split and the F23 "no email to the server" rule),
 * refresh (incl. de-duplicated concurrent refreshes), logout, token access,
 * API envelope errors, the web in-memory path, and Google client-id selection.
 */
const platform = vi.hoisted(() => ({ OS: "ios" as string }));
vi.mock("react-native", () => ({ Platform: platform }));

const apple = vi.hoisted(() => ({
  isAvailableAsync: vi.fn(),
  signInAsync: vi.fn(),
  AppleAuthenticationScope: { FULL_NAME: "fullName", EMAIL: "email" },
  formatFullName: vi.fn((n: { givenName?: string; familyName?: string }) => [n.givenName, n.familyName].filter(Boolean).join(" "))
}));
vi.mock("expo-apple-authentication", () => apple);

const authSession = vi.hoisted(() => ({
  ResponseType: { IdToken: "id_token" },
  makeRedirectUri: vi.fn(() => "zeno://auth/google"),
  loadAsync: vi.fn()
}));
vi.mock("expo-auth-session", () => authSession);
vi.mock("expo-auth-session/providers/google", () => ({ discovery: { authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth" } }));

const constants = vi.hoisted(() => ({ extra: {} as Record<string, unknown> }));
vi.mock("expo-constants", () => ({ default: { get expoConfig() { return { extra: constants.extra }; } } }));

vi.mock("expo-crypto", () => ({
  getRandomBytes: (n: number) => new Uint8Array(randomBytes(n)),
  // Uppercase on purpose: the store must lowercase before comparing to the API.
  digestStringAsync: async (_alg: string, data: string) => createHash("sha256").update(data).digest("hex").toUpperCase(),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  CryptoEncoding: { HEX: "hex" }
}));
vi.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: vi.fn() }));
vi.mock("../api/config", () => ({ getApiBaseUrl: () => "https://api.test/api/v1" }));

const http = vi.hoisted(() => ({ timedFetch: vi.fn() }));
vi.mock("../api/http", () => http);

// `hold`, when set, delays the answer to a read of `holdKey`. The value is taken
// when the read starts, as the device keychain does, so a test can order a slow
// launch read against other auth work.
const vault = vi.hoisted(() => ({ store: new Map<string, string>(), hold: null as Promise<void> | null, holdKey: "", reached: () => {} }));
vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "whenUnlockedThisDeviceOnly",
  setItemAsync: async (k: string, v: string) => { vault.store.set(k, v); },
  getItemAsync: async (k: string) => {
    const value = vault.store.get(k) ?? null;
    if (vault.hold && k === vault.holdKey) {
      vault.reached();
      await vault.hold;
    }
    return value;
  },
  deleteItemAsync: async (k: string) => { vault.store.delete(k); }
}));

const { useAuthStore, createNoncePair, LINK_NOT_REQUESTED, LINK_WRONG_ACCOUNT } = await import("./authStore");

// ── helpers ─────────────────────────────────────────────────────────────────
// P3.5: sign-in links need a request from this device for the same email, and
// the issued access token carries that email (a JWT-shaped token).
const EMAIL = "me@x.com";
const jwtPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const accessFor = (email: string, n = 1) => `${jwtPart({ alg: "RS256" })}.${jwtPart({ sub: `acct_${n}`, email })}.sig${n}`;
const linkSession = (email = EMAIL, n = 1) => ({ ...sessionData(n), accessToken: accessFor(email, n) });
const PENDING_KEY = "zeno.auth.pendingMagicLink.v1";
function linkRequested(email = EMAIL, expiresAt = Date.now() + 600_000) {
  vault.store.set(PENDING_KEY, JSON.stringify({ email, expiresAt }));
}
const sessionData = (n = 1) => ({ accountId: `acct_${n}`, accessToken: `access-${n}`, refreshToken: `refresh-${n}`, expiresInSeconds: 900, refreshExpiresInSeconds: 2_592_000, tokenType: "Bearer" });
const envelope = (data: unknown, status = 200) => new Response(JSON.stringify({ data, error: null }), { status });
const errorEnvelope = (message: string, status = 401) => new Response(JSON.stringify({ data: null, error: { code: "E", message } }), { status });
const calls = () => http.timedFetch.mock.calls.map(([url, init]) => ({ url: url as string, method: (init as RequestInit | undefined)?.method ?? "GET", body: (init as RequestInit | undefined)?.body ? JSON.parse(String((init as RequestInit).body)) : undefined }));
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function storeSession(n = 1, expiresAt = Date.now() + 10 * 60_000) {
  vault.store.set("zeno.auth.accessToken.v1", `access-${n}`);
  vault.store.set("zeno.auth.refreshToken.v1", `refresh-${n}`);
  vault.store.set("zeno.auth.accountId.v1", `acct_${n}`);
  vault.store.set("zeno.auth.accessTokenExpiresAt.v1", String(expiresAt));
}

beforeEach(() => {
  platform.OS = "ios";
  vault.store.clear();
  http.timedFetch.mockReset();
  apple.isAvailableAsync.mockReset().mockResolvedValue(true);
  apple.signInAsync.mockReset();
  authSession.loadAsync.mockReset();
  constants.extra = {};
  useAuthStore.setState({ status: "loading", isAuthenticated: false, accountId: null, plan: "free", accessTokenExpiresAt: null, lastMagicLinkEmail: null, error: null });
});
afterEach(async () => {
  vi.useRealTimers();
  // Stop any refresh timer and clear in-memory (web) state between tests.
  http.timedFetch.mockResolvedValue(envelope({}));
  await useAuthStore.getState().logout().catch(() => {});
});

describe("createNoncePair (F10)", () => {
  it("raw is 32 hex chars; hashed is its lowercase SHA-256", async () => {
    const { raw, hashed } = await createNoncePair();
    expect(raw).toMatch(/^[0-9a-f]{32}$/);
    expect(hashed).toBe(sha256(raw));
    expect(hashed).toBe(hashed.toLowerCase());
    expect((await createNoncePair()).raw).not.toBe(raw);
  });
});

describe("hydrate", () => {
  it("no session, no local-only choice → anonymous", async () => {
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", isAuthenticated: false });
  });

  it("no session but 'continue without an account' was chosen → local_only", async () => {
    vault.store.set("zeno.auth.localOnly.v1", "1");
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe("local_only");
  });

  it("a session within 30 s of expiry is refreshed immediately", async () => {
    storeSession(1, Date.now() + 10_000);
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData(2)));
    await useAuthStore.getState().hydrate();
    expect(calls()[0]).toMatchObject({ url: "https://api.test/api/v1/auth/refresh", method: "POST", body: { refreshToken: "refresh-1" } });
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", accountId: "acct_2" });
    expect(vault.store.get("zeno.auth.accessToken.v1")).toBe("access-2");
  });

  it("a valid session authenticates without a network call and refreshes every 14 minutes", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    storeSession(1);
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", accountId: "acct_1" });
    expect(http.timedFetch).not.toHaveBeenCalled();
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData(3)));
    await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    expect(calls()[0]?.url).toBe("https://api.test/api/v1/auth/refresh");
  });
});

describe("launch races (F154)", () => {
  // The launch read of the keychain is held until released; meanwhile the user
  // signs in or chooses local-only. That later decision must stand.
  // Returns [a promise that resolves once the held read has started, release].
  function holdLaunchRead(key = "zeno.auth.accessToken.v1"): [Promise<void>, () => void] {
    let release: () => void = () => {};
    const reached = new Promise<void>((r) => { vault.reached = r; });
    vault.holdKey = key;
    vault.hold = new Promise<void>((r) => { release = r; });
    return [reached, () => { vault.hold = null; release(); }];
  }

  it("a sign-in link verified while the launch read is pending stays signed in", async () => {
    const [reached, release] = holdLaunchRead();
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession()));
    const launching = useAuthStore.getState().hydrate();
    await reached;
    await useAuthStore.getState().verifyMagicLink("t".repeat(40));
    release();
    await launching;
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", isAuthenticated: true, accountId: "acct_1" });
  });

  it("an older account's session read at launch doesn't replace a sign-in made meanwhile", async () => {
    storeSession(1);
    const [reached, release] = holdLaunchRead();
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession(EMAIL, 2)));
    const launching = useAuthStore.getState().hydrate();
    await reached;
    await useAuthStore.getState().verifyMagicLink("t".repeat(40));
    release();
    await launching;
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", accountId: "acct_2" });
  });

  it("'continue without an account' chosen while the launch read of that choice is pending stays chosen", async () => {
    const [reached, release] = holdLaunchRead("zeno.auth.localOnly.v1");
    const launching = useAuthStore.getState().hydrate();
    await reached;
    await useAuthStore.getState().continueLocalOnly();
    release();
    await launching;
    expect(useAuthStore.getState().status).toBe("local_only");
  });

  it("a sign-in made while the local-only flag is being read also stands", async () => {
    const [reached, release] = holdLaunchRead("zeno.auth.localOnly.v1");
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession()));
    const launching = useAuthStore.getState().hydrate();
    await reached;
    await useAuthStore.getState().verifyMagicLink("t".repeat(40));
    release();
    await launching;
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", accountId: "acct_1" });
  });

  it("with no decision meanwhile, launch still reads 'signed out' as before", async () => {
    const [reached, release] = holdLaunchRead();
    const launching = useAuthStore.getState().hydrate();
    await reached;
    release();
    await launching;
    expect(useAuthStore.getState().status).toBe("anonymous");
  });
});

describe("the signed-in email (F125)", () => {
  it("comes from the session's own token at sign-in, and goes at sign-out", async () => {
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession()));
    await useAuthStore.getState().verifyMagicLink("t".repeat(40));
    expect(useAuthStore.getState()).toMatchObject({ accountId: "acct_1", email: EMAIL });
    http.timedFetch.mockResolvedValueOnce(envelope({}));
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().email).toBeNull();
  });

  it("is read from a stored session at launch, even when the refresh is offline", async () => {
    storeSession(1, Date.now() + 10_000);
    vault.store.set("zeno.auth.accessToken.v1", accessFor(EMAIL));
    http.timedFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", email: EMAIL });
  });

  it("a token without one gives null, never a guess", async () => {
    storeSession(1);
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", accountId: "acct_1", email: null });
  });

  it("local-only and a rejected refresh clear it", async () => {
    useAuthStore.setState({ email: EMAIL });
    await useAuthStore.getState().continueLocalOnly();
    expect(useAuthStore.getState().email).toBeNull();
    useAuthStore.setState({ email: EMAIL });
    vault.store.set("zeno.auth.localOnly.v1", "1");
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ status: "local_only", email: null });
    storeSession();
    useAuthStore.setState({ email: EMAIL });
    http.timedFetch.mockResolvedValueOnce(errorEnvelope("Refresh token reused."));
    await useAuthStore.getState().refreshToken();
    expect(useAuthStore.getState().email).toBeNull();
  });
});

describe("local-only mode", () => {
  it("persists the choice; a real login clears it; logout clears it too", async () => {
    await useAuthStore.getState().continueLocalOnly();
    expect(useAuthStore.getState().status).toBe("local_only");
    expect(vault.store.get("zeno.auth.localOnly.v1")).toBe("1");
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession()));
    await useAuthStore.getState().verifyMagicLink("t".repeat(40));
    await vi.waitFor(() => expect(vault.store.has("zeno.auth.localOnly.v1")).toBe(false));
  });
});

describe("magic link", () => {
  it("requests a link with the trimmed email and returns to anonymous", async () => {
    http.timedFetch.mockResolvedValueOnce(envelope({ delivered: true, channel: "resend", expiresInSeconds: 900 }));
    await useAuthStore.getState().loginWithMagicLink("  me@x.com ");
    expect(calls()[0]).toMatchObject({ method: "POST", url: "https://api.test/api/v1/auth/magic-link", body: { email: "me@x.com" } });
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", lastMagicLinkEmail: "me@x.com", error: null });
  });

  it("a failed request surfaces the server's message and rethrows", async () => {
    http.timedFetch.mockResolvedValueOnce(errorEnvelope("Too many requests.", 429));
    await expect(useAuthStore.getState().loginWithMagicLink("me@x.com")).rejects.toThrow("Too many requests.");
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", error: "Too many requests." });
  });

  it("requesting a link remembers it (email lowercased) until the server's own expiry", async () => {
    const before = Date.now();
    http.timedFetch.mockResolvedValueOnce(envelope({ delivered: true, channel: "resend", expiresInSeconds: 600 }));
    await useAuthStore.getState().loginWithMagicLink("  Me@X.com ");
    const pending = JSON.parse(vault.store.get(PENDING_KEY)!) as { email: string; expiresAt: number };
    expect(pending.email).toBe("me@x.com");
    expect(pending.expiresAt).toBeGreaterThanOrEqual(before + 600_000);
    expect(pending.expiresAt).toBeLessThanOrEqual(Date.now() + 600_000);
  });

  it("verification URL-encodes the token, stores the session device-only, and forgets the request", async () => {
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession()));
    await useAuthStore.getState().verifyMagicLink("a+b/c=");
    expect(calls()[0]?.url).toBe("https://api.test/api/v1/auth/verify?token=a%2Bb%2Fc%3D");
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", accountId: "acct_1" });
    expect(vault.store.has(PENDING_KEY)).toBe(false);
  });

  it("a failed verification (in the sign-in flow) reports the error and keeps the request for the real link", async () => {
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(errorEnvelope("Link expired."));
    await expect(useAuthStore.getState().verifyMagicLink("t".repeat(40))).rejects.toThrow("Link expired.");
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", error: "Link expired." });
    expect(vault.store.has(PENDING_KEY)).toBe(true);
  });

  it("a failure while saving the session leaves nothing half-stored", async () => {
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession()));
    const original = vault.store.set.bind(vault.store);
    vault.store.set = (k: string, v: string) => {
      if (k === "zeno.auth.refreshToken.v1") throw new Error("keychain full");
      return original(k, v);
    };
    try {
      await expect(useAuthStore.getState().verifyMagicLink("t".repeat(40))).rejects.toThrow("keychain full");
    } finally {
      vault.store.set = original;
    }
    expect(vault.store.has("zeno.auth.accessToken.v1")).toBe(false);
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", isAuthenticated: false, error: "keychain full" });
  });
});

describe("P3.5 (F100): a sign-in link someone else sent does nothing", () => {
  it("with no request from this device it is refused WITHOUT a server call, and the session on the phone survives", async () => {
    storeSession();
    await useAuthStore.getState().hydrate();
    await expect(useAuthStore.getState().verifyMagicLink("t".repeat(40))).rejects.toThrow(LINK_NOT_REQUESTED);
    expect(http.timedFetch).not.toHaveBeenCalled();
    expect(vault.store.get("zeno.auth.refreshToken.v1")).toBe("refresh-1");
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", accountId: "acct_1", error: LINK_NOT_REQUESTED });
  });

  it("signed out and no request at all: refused WITHOUT a server call", async () => {
    await expect(useAuthStore.getState().verifyMagicLink("t".repeat(40))).rejects.toThrow(LINK_NOT_REQUESTED);
    expect(http.timedFetch).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, error: LINK_NOT_REQUESTED });
  });

  it("a signed-in user is never switched, even while a request is pending", async () => {
    storeSession();
    await useAuthStore.getState().hydrate();
    linkRequested();
    await expect(useAuthStore.getState().verifyMagicLink("t".repeat(40))).rejects.toThrow(LINK_NOT_REQUESTED);
    expect(http.timedFetch).not.toHaveBeenCalled();
    expect(useAuthStore.getState().accountId).toBe("acct_1");
  });

  it("an expired, unreadable or malformed request counts as none", async () => {
    for (const raw of [
      JSON.stringify({ email: EMAIL, expiresAt: Date.now() - 1 }),
      "{not json",
      "null",
      JSON.stringify({ email: 42, expiresAt: Date.now() + 600_000 }),
      JSON.stringify({ email: EMAIL, expiresAt: "soon" })
    ]) {
      vault.store.set(PENDING_KEY, raw);
      await expect(useAuthStore.getState().verifyMagicLink("t".repeat(40)), raw).rejects.toThrow(LINK_NOT_REQUESTED);
    }
    expect(http.timedFetch).not.toHaveBeenCalled();
  });

  it("a valid link for ANOTHER account is discarded: nothing stored, not signed in", async () => {
    linkRequested("me@x.com");
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession("attacker@evil.example")));
    await expect(useAuthStore.getState().verifyMagicLink("t".repeat(40))).rejects.toThrow(LINK_WRONG_ACCOUNT);
    expect(vault.store.has("zeno.auth.accessToken.v1")).toBe(false);
    expect(vault.store.has("zeno.auth.refreshToken.v1")).toBe(false);
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", isAuthenticated: false, error: LINK_WRONG_ACCOUNT });
  });

  it("a token with no readable email claim is discarded the same way", async () => {
    linkRequested();
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData()));
    await expect(useAuthStore.getState().verifyMagicLink("t".repeat(40))).rejects.toThrow(LINK_WRONG_ACCOUNT);
    expect(vault.store.has("zeno.auth.accessToken.v1")).toBe(false);
  });

  it("the email comparison ignores case and surrounding spaces", async () => {
    linkRequested("me@x.com");
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession(" ME@X.com ")));
    await useAuthStore.getState().verifyMagicLink("t".repeat(40));
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("signing out forgets an unused request (it holds an email address)", async () => {
    linkRequested();
    http.timedFetch.mockResolvedValue(envelope({}));
    await useAuthStore.getState().logout();
    expect(vault.store.has(PENDING_KEY)).toBe(false);
  });
});

describe("demo login", () => {
  it("signs in with trimmed email + password", async () => {
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData()));
    await useAuthStore.getState().loginWithDemoAccount(" demo@zeno.local ", "pw-123456");
    expect(calls()[0]).toMatchObject({ url: "https://api.test/api/v1/auth/demo-login", body: { email: "demo@zeno.local", password: "pw-123456" } });
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("a failure leaves no session", async () => {
    http.timedFetch.mockResolvedValueOnce(errorEnvelope("Invalid demo account credentials."));
    await expect(useAuthStore.getState().loginWithDemoAccount("d@x.com", "wrong-pass")).rejects.toThrow();
    expect(vault.store.size).toBe(0);
    expect(useAuthStore.getState().status).toBe("anonymous");
  });
});

describe("Sign in with Apple", () => {
  it("F10/F23: Apple gets SHA-256(raw); the API gets the raw nonce and NO email", async () => {
    apple.signInAsync.mockResolvedValue({ identityToken: "apple.id.token", authorizationCode: "code-1", email: "leaked@x.com", fullName: { givenName: "Ada", familyName: "L" } });
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData()));
    await useAuthStore.getState().loginWithApple();
    const sentToApple = apple.signInAsync.mock.calls[0]![0] as { nonce: string; requestedScopes: string[] };
    const body = calls()[0]!.body as Record<string, unknown>;
    expect(sentToApple.requestedScopes).toEqual(["fullName", "email"]);
    expect(body).toEqual({ identityToken: "apple.id.token", nonce: body.nonce, authorizationCode: "code-1", fullName: "Ada L" });
    expect(sha256(body.nonce as string)).toBe(sentToApple.nonce);
    expect(body).not.toHaveProperty("email");
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("omits a missing authorization code and name", async () => {
    apple.signInAsync.mockResolvedValue({ identityToken: "apple.id.token", authorizationCode: null, fullName: null });
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData()));
    await useAuthStore.getState().loginWithApple();
    const body = calls()[0]!.body as Record<string, unknown>;
    expect(body.authorizationCode).toBeUndefined();
    expect(body.fullName).toBeUndefined();
  });

  it("unavailable device or no identity token → a clear error, no request", async () => {
    apple.isAvailableAsync.mockResolvedValueOnce(false);
    await expect(useAuthStore.getState().loginWithApple()).rejects.toThrow("Sign in with Apple is only available on supported Apple devices.");
    apple.signInAsync.mockResolvedValueOnce({ identityToken: null });
    await expect(useAuthStore.getState().loginWithApple()).rejects.toThrow("Apple did not return an identity token.");
    expect(http.timedFetch).not.toHaveBeenCalled();
    expect(useAuthStore.getState().error).toBe("Apple did not return an identity token.");
  });
});

describe("Google sign-in", () => {
  const googleResult = (over: Record<string, unknown> = {}) => ({ type: "success", params: { id_token: "google.id.token", access_token: "ya29.ACCESS", code: "server-code" }, ...over });

  it("F10: Google gets SHA-256(raw); the API gets ONLY the id token and the raw nonce (no access token)", async () => {
    constants.extra = { google: { iosClientId: "ios-client" } };
    const promptAsync = vi.fn().mockResolvedValue(googleResult());
    authSession.loadAsync.mockResolvedValue({ promptAsync });
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData()));
    await useAuthStore.getState().loginWithGoogle();
    const config = authSession.loadAsync.mock.calls[0]![0] as { clientId: string; extraParams: { nonce: string }; responseType: string; scopes: string[] };
    const body = calls()[0]!.body as Record<string, unknown>;
    expect(config).toMatchObject({ clientId: "ios-client", responseType: "id_token", scopes: ["openid", "profile", "email"] });
    expect(Object.keys(body).sort()).toEqual(["idToken", "nonce"]);
    expect(body.idToken).toBe("google.id.token");
    expect(sha256(body.nonce as string)).toBe(config.extraParams.nonce);
  });

  it("picks the platform's client id, falling back to expo then web ids", async () => {
    const pick = async (os: string, extra: Record<string, unknown>) => {
      platform.OS = os;
      constants.extra = extra;
      authSession.loadAsync.mockResolvedValueOnce({ promptAsync: vi.fn().mockResolvedValue({ type: "cancel" }) });
      await useAuthStore.getState().loginWithGoogle().catch(() => {});
      return (authSession.loadAsync.mock.calls.at(-1)![0] as { clientId: string }).clientId;
    };
    expect(await pick("ios", { iosClientId: "i", expoClientId: "e", webClientId: "w" })).toBe("i");
    expect(await pick("ios", { expoClientId: "e", webClientId: "w" })).toBe("e");
    expect(await pick("android", { androidClientId: "a", webClientId: "w" })).toBe("a");
    expect(await pick("android", { webClientId: "w" })).toBe("w");
    expect(await pick("web", { webClientId: "w", expoClientId: "e" })).toBe("w");
    expect(await pick("web", { expoClientId: "e" })).toBe("e");
  });

  it("no client id configured, or the user cancels → a clear error, no API call", async () => {
    await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow("Google OAuth client ID is not configured.");
    platform.OS = "web";
    constants.extra = {};
    await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow("Google OAuth client ID is not configured.");
    platform.OS = "ios";
    constants.extra = { iosClientId: "i" };
    authSession.loadAsync.mockResolvedValueOnce({ promptAsync: vi.fn().mockResolvedValue({ type: "dismiss" }) });
    await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow("Google sign-in was cancelled.");
    expect(http.timedFetch).not.toHaveBeenCalled();
  });
});

describe("refresh", () => {
  it("with nothing stored: clears and goes anonymous without calling the API", async () => {
    await useAuthStore.getState().refreshToken();
    expect(http.timedFetch).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("anonymous");
  });

  it("a rejected refresh logs the user out locally and keeps the reason", async () => {
    storeSession();
    http.timedFetch.mockResolvedValueOnce(errorEnvelope("Refresh token reused."));
    await useAuthStore.getState().refreshToken();
    expect(vault.store.has("zeno.auth.refreshToken.v1")).toBe(false);
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", accountId: null, error: "Refresh token reused." });
  });

  it("concurrent refreshes share ONE request (a second POST would burn the single-use token)", async () => {
    storeSession();
    let release!: (r: Response) => void;
    http.timedFetch.mockReturnValueOnce(new Promise<Response>((r) => { release = r; }));
    const all = Promise.all([useAuthStore.getState().refreshToken(), useAuthStore.getState().refreshToken(), useAuthStore.getState().refreshToken()]);
    release(envelope(sessionData(9)));
    await all;
    expect(http.timedFetch).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accountId).toBe("acct_9");
  });
});

describe("F43: only a definitive rejection ends the session", () => {
  const nonJson = (status: number) => new Response("<html>Service Unavailable</html>", { status });
  const transient: [string, () => Promise<Response>][] = [
    ["offline (the request throws)", () => Promise.reject(new TypeError("Network request failed"))],
    ["a timeout", () => Promise.reject(new DOMException("The operation was aborted.", "AbortError"))],
    ["a 503 HTML page while the server wakes up", () => Promise.resolve(nonJson(503))],
    ["a 502 error envelope", () => Promise.resolve(errorEnvelope("Bad gateway", 502))],
    ["a 429", () => Promise.resolve(errorEnvelope("Rate limit exceeded", 429))],
    ["a 500", () => Promise.resolve(errorEnvelope("Unexpected server error.", 500))]
  ];

  it.each(transient)("%s keeps the stored session and the signed-in state", async (_label, reply) => {
    storeSession(1, Date.now() + 10_000); // near expiry: hydrate refreshes at once
    http.timedFetch.mockImplementationOnce(reply);
    await useAuthStore.getState().hydrate();
    expect(vault.store.get("zeno.auth.refreshToken.v1")).toBe("refresh-1");
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", isAuthenticated: true, accountId: "acct_1" });
    expect(useAuthStore.getState().error).toBeTruthy();
  });

  it("a 400 (the stored value is not a usable token) still ends the session", async () => {
    storeSession();
    http.timedFetch.mockResolvedValueOnce(errorEnvelope("Request validation failed.", 400));
    await useAuthStore.getState().refreshToken();
    expect(vault.store.has("zeno.auth.refreshToken.v1")).toBe(false);
    expect(useAuthStore.getState().status).toBe("anonymous");
  });

  it("offline: getValidAccessToken returns no token (never the expired one), then recovers once online", async () => {
    storeSession(1, Date.now() - 60_000); // already expired
    http.timedFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
    expect(await useAuthStore.getState().getValidAccessToken()).toBeNull();
    expect(vault.store.get("zeno.auth.refreshToken.v1")).toBe("refresh-1");
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData(2)));
    expect(await useAuthStore.getState().getValidAccessToken()).toBe("access-2");
    expect(calls().map((c) => c.body?.refreshToken)).toEqual(["refresh-1", "refresh-1"]);
  });

  it("after a transient failure the refresh timer keeps retrying on its own", async () => {
    vi.useFakeTimers();
    storeSession(1, Date.now() + 5_000);
    http.timedFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
    await useAuthStore.getState().refreshToken();
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData(3)));
    await vi.advanceTimersByTimeAsync(14 * 60_000);
    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", accountId: "acct_3", error: null });
    expect(vault.store.get("zeno.auth.refreshToken.v1")).toBe("refresh-3");
  });
});

describe("logout and token access", () => {
  it("revokes the refresh token server-side, then clears everything", async () => {
    storeSession();
    vault.store.set("zeno.auth.localOnly.v1", "1");
    http.timedFetch.mockResolvedValueOnce(envelope({}));
    await useAuthStore.getState().logout();
    expect(calls()[0]).toMatchObject({ url: "https://api.test/api/v1/auth/logout", body: { refreshToken: "refresh-1" } });
    expect(vault.store.size).toBe(0);
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", plan: "free" });
  });

  it("clears locally even when the revoke call fails (and reports the failure)", async () => {
    storeSession();
    http.timedFetch.mockRejectedValueOnce(new Error("offline"));
    await expect(useAuthStore.getState().logout()).rejects.toThrow("offline");
    expect(vault.store.size).toBe(0);
  });

  it("getAccessToken / getValidAccessToken", async () => {
    expect(await useAuthStore.getState().getAccessToken()).toBeNull();
    expect(await useAuthStore.getState().getValidAccessToken()).toBeNull();
    storeSession(1);
    expect(await useAuthStore.getState().getAccessToken()).toBe("access-1");
    expect(await useAuthStore.getState().getValidAccessToken()).toBe("access-1");
    storeSession(1, Date.now() + 5_000);
    http.timedFetch.mockResolvedValueOnce(envelope(sessionData(4)));
    expect(await useAuthStore.getState().getValidAccessToken()).toBe("access-4");
  });

  it("setPlan", () => {
    useAuthStore.getState().setPlan("pro");
    expect(useAuthStore.getState().plan).toBe("pro");
  });
});

describe("API envelope errors", () => {
  it("a non-JSON proxy error page reports the HTTP status", async () => {
    http.timedFetch.mockResolvedValueOnce(new Response("<html>502</html>", { status: 502 }));
    await expect(useAuthStore.getState().loginWithMagicLink("a@b.co")).rejects.toThrow("Auth request failed with HTTP 502.");
  });

  it("an error status without a message reports the status", async () => {
    http.timedFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: null, error: null }), { status: 500 }));
    await expect(useAuthStore.getState().loginWithMagicLink("a@b.co")).rejects.toThrow("Auth request failed with HTTP 500");
  });

  it("a success envelope with no data is an error", async () => {
    http.timedFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: null, error: null }), { status: 200 }));
    await expect(useAuthStore.getState().loginWithMagicLink("a@b.co")).rejects.toThrow("Auth response did not include data.");
  });

  it("a non-Error rejection gets a generic message", async () => {
    http.timedFetch.mockRejectedValueOnce("boom");
    await expect(useAuthStore.getState().loginWithMagicLink("a@b.co")).rejects.toBe("boom");
    expect(useAuthStore.getState().error).toBe("Authentication failed.");
  });
});

describe("web platform: sessions and the local-only flag live in memory only", () => {
  it("never touches SecureStore", async () => {
    platform.OS = "web";
    http.timedFetch.mockResolvedValueOnce(envelope({ delivered: true, channel: "dev_log", expiresInSeconds: 600 }));
    await useAuthStore.getState().loginWithMagicLink(EMAIL);
    http.timedFetch.mockResolvedValueOnce(envelope(linkSession()));
    await useAuthStore.getState().verifyMagicLink("t".repeat(40));
    expect(await useAuthStore.getState().getAccessToken()).toBe(accessFor(EMAIL));
    await useAuthStore.getState().continueLocalOnly();
    expect(vault.store.size).toBe(0);
    http.timedFetch.mockResolvedValueOnce(envelope({}));
    await useAuthStore.getState().logout();
    expect(await useAuthStore.getState().getAccessToken()).toBeNull();
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().status).toBe("anonymous");
  });
});

describe("remaining edge paths", () => {
  it("getValidAccessToken returns null when the forced refresh fails", async () => {
    storeSession(1, Date.now() + 5_000);
    http.timedFetch.mockResolvedValueOnce(errorEnvelope("expired"));
    expect(await useAuthStore.getState().getValidAccessToken()).toBeNull();
  });

  it("an app config with no `extra` at all means no Google client id", async () => {
    constants.extra = undefined as unknown as Record<string, unknown>;
    await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow("Google OAuth client ID is not configured.");
  });

  it("Android falls back to the expo client id, and fails clearly with none", async () => {
    platform.OS = "android";
    constants.extra = { expoClientId: "e", webClientId: "w" };
    authSession.loadAsync.mockResolvedValueOnce({ promptAsync: vi.fn().mockResolvedValue({ type: "cancel" }) });
    await useAuthStore.getState().loginWithGoogle().catch(() => {});
    expect((authSession.loadAsync.mock.calls.at(-1)![0] as { clientId: string }).clientId).toBe("e");
    constants.extra = {};
    await expect(useAuthStore.getState().loginWithGoogle()).rejects.toThrow("Google OAuth client ID is not configured.");
  });
});

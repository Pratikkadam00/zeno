import { beforeEach, describe, expect, it, vi } from "vitest";

// expo-constants needs React Native globals, so it is replaced at the module
// boundary with a getter over a mutable config each test sets.
type Extra = { apiBaseUrl?: string };
const constants = vi.hoisted(() => ({ expoConfig: { extra: {} } as { extra?: Extra } | null }));
vi.mock("expo-constants", () => ({ default: { get expoConfig() { return constants.expoConfig; } } }));

const { getApiBaseUrl } = await import("./config");

const DEV_FALLBACK = "http://127.0.0.1:8787/api/v1";

beforeEach(() => {
  constants.expoConfig = { extra: {} };
});

describe("getApiBaseUrl", () => {
  it("returns the configured base URL", () => {
    constants.expoConfig = { extra: { apiBaseUrl: "https://api.example.test/api/v1" } };
    expect(getApiBaseUrl()).toBe("https://api.example.test/api/v1");
  });

  it("falls back to the local dev API when nothing is configured", () => {
    expect(getApiBaseUrl()).toBe(DEV_FALLBACK);
    constants.expoConfig = { extra: undefined };
    expect(getApiBaseUrl()).toBe(DEV_FALLBACK);
    constants.expoConfig = null;
    expect(getApiBaseUrl()).toBe(DEV_FALLBACK);
  });

  it("reads the config on every call, not once at import", () => {
    constants.expoConfig = { extra: { apiBaseUrl: "https://one.example.test/v1" } };
    expect(getApiBaseUrl()).toBe("https://one.example.test/v1");
    constants.expoConfig = { extra: { apiBaseUrl: "https://two.example.test/v1" } };
    expect(getApiBaseUrl()).toBe("https://two.example.test/v1");
  });

  // Regression: an env var that is set but empty reaches `extra` as "" (the
  // same case config/site.ts already handles). `?? fallback` let it through,
  // so every request went to a relative "/path" URL.
  it("treats an empty or blank configured value as absent", () => {
    constants.expoConfig = { extra: { apiBaseUrl: "" } };
    expect(getApiBaseUrl()).toBe(DEV_FALLBACK);
    constants.expoConfig = { extra: { apiBaseUrl: "   " } };
    expect(getApiBaseUrl()).toBe(DEV_FALLBACK);
  });

  // Regression: every caller appends a path that starts with "/", so a
  // trailing slash in the configured value produced ".../v1//billing/...".
  it("strips trailing slashes and surrounding whitespace so callers can append '/path'", () => {
    constants.expoConfig = { extra: { apiBaseUrl: " https://api.example.test/api/v1/ " } };
    expect(getApiBaseUrl()).toBe("https://api.example.test/api/v1");
    constants.expoConfig = { extra: { apiBaseUrl: "https://api.example.test/api/v1//" } };
    expect(`${getApiBaseUrl()}/billing/entitlement`).toBe("https://api.example.test/api/v1/billing/entitlement");
  });
});

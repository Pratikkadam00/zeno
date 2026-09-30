import { beforeEach, describe, expect, it, vi } from "vitest";

// Mirrors the expo-constants mock used by authStore.test.ts / revenueCat.test.ts;
// `extra` is mutated per case so each test exercises a different config.
const { extra } = vi.hoisted(() => ({ extra: {} as { siteUrl?: string } }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra } } }));

const { getSiteUrl, getSiteHost, siteUrl, getLegalUrls, getFeedbackMailto } = await import("./site");

beforeEach(() => {
  delete extra.siteUrl;
});

describe("mobile site origin (config/site)", () => {
  it("defaults to the current domain when extra.siteUrl is absent", () => {
    expect(getSiteUrl()).toBe("https://zeno.app");
    expect(getSiteHost()).toBe("zeno.app");
  });

  it("treats an EMPTY extra.siteUrl as absent (an unset env var forwards as undefined or '')", () => {
    extra.siteUrl = "";
    expect(getSiteUrl()).toBe("https://zeno.app");
    extra.siteUrl = "   ";
    expect(getSiteUrl()).toBe("https://zeno.app");
  });

  it("uses extra.siteUrl when set, stripping a trailing slash", () => {
    extra.siteUrl = "https://example.com/";
    expect(getSiteUrl()).toBe("https://example.com");
    expect(getSiteHost()).toBe("example.com");
  });

  it("derives the host without new URL(): scheme stripped, port and subdomain kept", () => {
    extra.siteUrl = "https://staging.example.com:8443";
    expect(getSiteHost()).toBe("staging.example.com:8443");
    extra.siteUrl = "http://localhost:3011";
    expect(getSiteHost()).toBe("localhost:3011");
  });

  it("siteUrl() joins a path exactly once", () => {
    extra.siteUrl = "https://example.com";
    expect(siteUrl("/legal/terms")).toBe("https://example.com/legal/terms");
    expect(siteUrl("legal/terms")).toBe("https://example.com/legal/terms");
  });

  it("legal links and the feedback address follow the configured origin", () => {
    extra.siteUrl = "https://example.com";
    expect(getLegalUrls()).toEqual({ terms: "https://example.com/legal/terms", privacy: "https://example.com/legal/privacy" });
    expect(getFeedbackMailto()).toBe("mailto:feedback@example.com");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P3.5: the only way a URL leaves the app. Allowed: https to an allowlisted
 * host (our site, the App Store, Google search, the catalog's own hosts),
 * mailto to one address with no headers, tel with digits only. Everything
 * else is refused and nothing is opened. A small stand-in catalog here (one
 * entry carries a NON-https link, which must add no host); the real catalog
 * is checked in external-link.catalog.test.ts.
 */
const openURL = vi.hoisted(() => vi.fn());
vi.mock("react-native", () => ({ Linking: { openURL } }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: { siteUrl: "https://zeno.example" } } } }));
vi.mock("@zeno/service-catalog", () => ({
  services: [
    { cancelUrl: "https://www.netflix.com/cancelplan", website: "https://www.netflix.com" },
    { cancelUrl: "http://plain.example/cancel", website: "https://Spotify.com/account" }
  ]
}));

beforeEach(() => {
  vi.resetModules();
  openURL.mockReset().mockResolvedValue(undefined);
});
const load = () => import("./external-link");

describe("isAllowedExternalUrl", () => {
  it.each([
    "https://zeno.example/legal/terms",
    "https://zeno.example",
    "https://apps.apple.com/",
    "https://www.google.com/search?q=how%20to%20cancel%20Netflix",
    "https://www.netflix.com/cancelplan",
    "https://spotify.com/account?x=1#y",
    "https://ZENO.example:443/legal/privacy",
    "mailto:feedback@zeno.example",
    "tel:+1 (800) 555-0100"
  ])("allows %s", async (url) => {
    expect((await load()).isAllowedExternalUrl(url)).toBe(true);
  });

  it.each([
    ["plain http", "http://zeno.example/legal/terms"],
    ["javascript:", "javascript:alert(1)"],
    ["an Android intent", "intent://scan/#Intent;scheme=zxing;end"],
    ["a file", "file:///data/data/com.zeno.app/databases/zeno.db"],
    ["our own scheme", "zeno://auth/verify?token=x"],
    ["another app's scheme", "venmo://paycharge?amount=100"],
    ["a host not on the list", "https://evil.example/phish"],
    ["a lookalike host", "https://www.netflix.com.evil.example/cancelplan"],
    ["a subdomain not on the list", "https://login.zeno.example/"],
    ["userinfo before an allowed host", "https://zeno.example@evil.example/"],
    ["a backslash trick", "https://zeno.example\\@evil.example"],
    ["the catalog's NON-https link", "http://plain.example/cancel"],
    ["that link's host over https", "https://plain.example/cancel"],
    ["a mailto with headers", "mailto:feedback@zeno.example?bcc=everyone@evil.example"],
    ["a mailto to two addresses", "mailto:a@zeno.example,b@evil.example"],
    ["a mailto with no address", "mailto:"],
    ["a tel with letters", "tel:1-800-FLOWERS"],
    ["a tel with a USSD code", "tel:*#06#"],
    ["an empty string", ""],
    ["a relative path", "/legal/terms"]
  ])("refuses %s", async (_name, url) => {
    expect((await load()).isAllowedExternalUrl(url)).toBe(false);
  });
});

describe("openExternalUrl", () => {
  it("opens an allowed URL and says so", async () => {
    expect(await (await load()).openExternalUrl("https://zeno.example/legal/privacy")).toBe(true);
    expect(openURL).toHaveBeenCalledWith("https://zeno.example/legal/privacy");
  });

  it("refuses without opening anything", async () => {
    expect(await (await load()).openExternalUrl("https://evil.example/")).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it("passes on a failure to open (the caller shows its own message)", async () => {
    openURL.mockRejectedValue(new Error("No activity found"));
    await expect((await load()).openExternalUrl("tel:+18005550100")).rejects.toThrow("No activity found");
  });
});

describe("httpsHost", () => {
  it("is the lowercase host of an https URL, else null", async () => {
    const { httpsHost } = await load();
    expect(httpsHost("https://WWW.Example.com:8443/path")).toBe("www.example.com");
    expect(httpsHost("https://a.example?q")).toBe("a.example");
    expect(httpsHost("http://a.example")).toBeNull();
    expect(httpsHost("https://user@a.example")).toBeNull();
  });
});

import { services } from "@zeno/service-catalog";
import { describe, expect, it, vi } from "vitest";

/**
 * The REAL bundled catalog and site config through the P3.5 allowlist: every
 * cancel link and website the app can open is allowed, and so is every fixed
 * link in Settings, the paywall and login (the default site host).
 */
vi.mock("react-native", () => ({ Linking: { openURL: vi.fn() } }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} } } }));

const { isAllowedExternalUrl } = await import("./external-link");
const { getFeedbackMailto, getLegalUrls } = await import("../config/site");

describe("the real catalog and fixed links pass the allowlist", () => {
  it("all of the catalog's cancel links and websites", () => {
    const links = services.flatMap((service) => [service.cancelUrl, service.website]);
    expect(links.length).toBe(services.length * 2);
    expect(links.filter((url) => !isAllowedExternalUrl(url))).toEqual([]);
  });

  it("the legal pages, the feedback address, the App Store and the cancel guide's search fallback", () => {
    const { terms, privacy } = getLegalUrls();
    for (const url of [terms, privacy, getFeedbackMailto(), "https://apps.apple.com/", `https://www.google.com/search?q=${encodeURIComponent("how to cancel Netflix")}`]) {
      expect(isAllowedExternalUrl(url), url).toBe(true);
    }
  });
});

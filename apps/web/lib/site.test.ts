import { afterEach, describe, expect, it, vi } from "vitest";

// site.ts reads the env at module load, so each case resets the module
// registry and re-imports under a stubbed NEXT_PUBLIC_SITE_URL.
async function load(value: string | undefined) {
  vi.resetModules();
  if (value === undefined) vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  else vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
  return import("./site");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("web site origin (lib/site)", () => {
  it("defaults to the current domain when the env var is unset", async () => {
    const m = await load(undefined);
    expect(m.SITE_URL).toBe("https://zeno.app");
    expect(m.SITE_HOST).toBe("zeno.app");
  });

  it("uses NEXT_PUBLIC_SITE_URL when set, and strips a trailing slash", async () => {
    const m = await load("https://example.com/");
    expect(m.SITE_URL).toBe("https://example.com");
    expect(m.SITE_HOST).toBe("example.com");
  });

  it("siteUrl() joins a path exactly once, with or without a leading slash", async () => {
    const m = await load("https://example.com");
    expect(m.siteUrl("/cancel/netflix")).toBe("https://example.com/cancel/netflix");
    expect(m.siteUrl("cancel/netflix")).toBe("https://example.com/cancel/netflix");
    expect(m.siteUrl()).toBe("https://example.com/");
  });

  it("contact addresses follow the host", async () => {
    const m = await load("https://example.com");
    expect(m.CONTACT_EMAIL.privacy).toBe("privacy@example.com");
    expect(m.CONTACT_EMAIL.legal).toBe("legal@example.com");
    expect(m.CONTACT_EMAIL.security).toBe("security@example.com");
  });

  it("keeps a port and a subdomain intact (staging origins)", async () => {
    const m = await load("https://staging.example.com:8443");
    expect(m.SITE_URL).toBe("https://staging.example.com:8443");
    expect(m.SITE_HOST).toBe("staging.example.com:8443");
  });

  it("FAILS THE BUILD on a value that is not a URL", async () => {
    await expect(load("not a url")).rejects.toThrow();
  });

  it("FAILS THE BUILD on an origin that carries a path (canonicals would double it)", async () => {
    await expect(load("https://example.com/site")).rejects.toThrow(/bare origin/);
  });

  it("FAILS THE BUILD on a non-http scheme", async () => {
    await expect(load("ftp://example.com")).rejects.toThrow(/http\(s\)/);
  });
});

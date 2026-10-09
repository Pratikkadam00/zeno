import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * next.config.ts: the security headers every response carries, the full
 * Content-Security-Policy, and the www -> apex redirect. The CSP is computed
 * from NODE_ENV at module load, so each case re-imports the config under a
 * stubbed environment.
 */
async function load(env: { NODE_ENV: string; NEXT_PUBLIC_SITE_URL?: string }) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env.NODE_ENV);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL ?? "");
  return (await import("./next.config")).default;
}

async function headersFor(nodeEnv: string) {
  const config = await load({ NODE_ENV: nodeEnv });
  const rules = await config.headers!();
  expect(rules).toHaveLength(2);
  const [rule] = rules;
  return { source: rule!.source, headers: new Map(rule!.headers.map((h) => [h.key, h.value])) };
}

/** "a b; c d" -> { a: ["b"], c: ["d"] } */
function parseCsp(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...sources] = d.split(/\s+/);
      return [name!, sources];
    })
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("security headers", () => {
  it("apply to every path", async () => {
    const { source } = await headersFor("production");
    expect(source).toBe("/:path*");
  });

  it("set HSTS, nosniff, deny-framing, a strict referrer policy, no DNS prefetch and a cross-origin opener policy", async () => {
    const { headers } = await headersFor("production");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains; preload");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-DNS-Prefetch-Control")).toBe("off");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("X-Permitted-Cross-Domain-Policies")).toBe("none");
    expect([...headers.keys()].sort()).toEqual([
      "Content-Security-Policy",
      "Cross-Origin-Opener-Policy",
      "Permissions-Policy",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-DNS-Prefetch-Control",
      "X-Frame-Options",
      "X-Permitted-Cross-Domain-Policies"
    ]);
  });

  it("Permissions-Policy switches off every powerful feature the site doesn't use", async () => {
    const { headers } = await headersFor("production");
    const entries = headers.get("Permissions-Policy")!.split(", ");
    // Every entry denies the feature outright.
    for (const entry of entries) expect(entry, entry).toMatch(/^[a-z-]+=\(\)$/);
    const denied = entries.map((e) => e.replace("=()", ""));
    expect(new Set(denied).size).toBe(denied.length);
    for (const feature of ["camera", "microphone", "geolocation", "browsing-topics", "payment", "usb", "clipboard-read", "display-capture", "publickey-credentials-get"]) {
      expect(denied, feature).toContain(feature);
    }
  });

  it("don't announce the framework (no X-Powered-By)", async () => {
    const config = await load({ NODE_ENV: "production" });
    expect(config.poweredByHeader).toBe(false);
  });
});

describe("Content-Security-Policy in production", () => {
  it("polices every resource type with same-origin-only sources and no eval", async () => {
    const { headers } = await headersFor("production");
    expect(parseCsp(headers.get("Content-Security-Policy")!)).toEqual({
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "blob:"],
      "font-src": ["'self'"],
      "connect-src": ["'self'"],
      "frame-src": ["'none'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": []
    });
  });

  it("allows no wildcard, cleartext or third-party origin anywhere", async () => {
    const { headers } = await headersFor("production");
    const sources = Object.values(parseCsp(headers.get("Content-Security-Policy")!)).flat();
    for (const source of sources) {
      expect(source, source).toMatch(/^('self'|'none'|'unsafe-inline'|data:|blob:)$/);
    }
  });
});

describe("dev-only relaxation", () => {
  it("the dev server (NODE_ENV=development) adds 'unsafe-eval' to script-src, and changes nothing else", async () => {
    const prod = parseCsp((await headersFor("production")).headers.get("Content-Security-Policy")!);
    const dev = parseCsp((await headersFor("development")).headers.get("Content-Security-Policy")!);
    expect(dev["script-src"]).toEqual(["'self'", "'unsafe-inline'", "'unsafe-eval'"]);
    expect({ ...dev, "script-src": prod["script-src"] }).toEqual(prod);
  });

  // `next build` / `next start` only default NODE_ENV to production when it is
  // unset: a pre-set "test" is kept silently, anything else with a warning
  // (next/dist/bin/next, 16.3). Such a server is still serving real users.
  it.each(["test", "staging"])(
    "a server started under NODE_ENV=%j (kept by next start) never gets 'unsafe-eval'",
    async (nodeEnv) => {
      const { headers } = await headersFor(nodeEnv);
      expect(headers.get("Content-Security-Policy")).not.toContain("unsafe-eval");
    }
  );
});

describe("the sample analytics page (F184)", () => {
  it("while its flag is off, /analytics is rewritten to a path no page matches, so the site's own 404 answers", async () => {
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "");
    const config = await load({ NODE_ENV: "production" });
    expect(await config.rewrites!()).toEqual({ beforeFiles: [{ source: "/analytics", destination: "/analytics-is-off" }], afterFiles: [], fallback: [] });
  });

  it("with the flag on (or on the dev server), nothing is rewritten", async () => {
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "1");
    expect(await (await load({ NODE_ENV: "production" })).rewrites!()).toEqual([]);
    vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "");
    expect(await (await load({ NODE_ENV: "development" })).rewrites!()).toEqual([]);
  });
});

describe("www -> apex redirect", () => {
  it("permanently redirects the www host to the canonical origin, keeping the path", async () => {
    const config = await load({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://example.com" });
    const [www, ...folded] = await config.redirects!();
    expect(www).toEqual({
      source: "/:path*",
      has: [{ type: "host", value: "www.example.com" }],
      destination: "https://example.com/:path*",
      permanent: true
    });
    // D20 (2026-10-08): the five planned-feature pages folded into /roadmap; each old address redirects for good.
    expect(folded).toEqual(
      ["/features/widgets-watch", "/features/open-banking", "/features/business", "/developers", "/partners"].map((source) => ({ source, destination: "/roadmap", permanent: true }))
    );
  });

  it("defaults to the production domain when no site URL is configured", async () => {
    const config = await load({ NODE_ENV: "production" });
    const [rule] = await config.redirects!();
    expect(rule).toMatchObject({ has: [{ type: "host", value: "www.zenoapp.in" }], destination: "https://zenoapp.in/:path*" });
  });
});

it("builds the shared workspace packages from source", async () => {
  const config = await load({ NODE_ENV: "production" });
  expect(config.transpilePackages).toEqual(["@zeno/shared", "@zeno/service-catalog"]);
});

describe("caching of the pictures and share cards (W6.7)", () => {
  it("public/art and public/og are cached for a day and served stale for a week while revalidating; everything else keeps the host's default", async () => {
    const config = await load({ NODE_ENV: "production" });
    const rules = await config.headers!();
    const cache = rules.find((r) => r.source === "/(art|og)/:path*")!;
    expect(cache.headers).toEqual([{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }]);
    expect(rules.filter((r) => r.headers.some((h) => h.key === "Cache-Control"))).toHaveLength(1);
  });
});

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
  expect(rules).toHaveLength(1);
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

  it("set HSTS, nosniff, deny-framing, a strict referrer policy and a locked-down Permissions-Policy", async () => {
    const { headers } = await headersFor("production");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains; preload");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=(), browsing-topics=()");
    expect(headers.get("X-DNS-Prefetch-Control")).toBe("on");
    expect([...headers.keys()].sort()).toEqual([
      "Content-Security-Policy",
      "Permissions-Policy",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-DNS-Prefetch-Control",
      "X-Frame-Options"
    ]);
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

describe("www -> apex redirect", () => {
  it("permanently redirects the www host to the canonical origin, keeping the path", async () => {
    const config = await load({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://example.com" });
    expect(await config.redirects!()).toEqual([
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.example.com" }],
        destination: "https://example.com/:path*",
        permanent: true
      }
    ]);
  });

  it("defaults to the production domain when no site URL is configured", async () => {
    const config = await load({ NODE_ENV: "production" });
    const [rule] = await config.redirects!();
    expect(rule).toMatchObject({ has: [{ type: "host", value: "www.zeno.app" }], destination: "https://zeno.app/:path*" });
  });
});

it("builds the shared workspace packages from source", async () => {
  const config = await load({ NODE_ENV: "production" });
  expect(config.transpilePackages).toEqual(["@zeno/shared", "@zeno/service-catalog"]);
});

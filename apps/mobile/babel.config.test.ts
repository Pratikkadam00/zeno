import { describe, expect, it, vi } from "vitest";

/**
 * P3.2: release bundles drop console.log/info/debug/trace (the app's own code
 * has none; bundled libraries, RevenueCat's SDK log among them, had 32), and
 * keep warn/error. Development and tests keep everything.
 * Measured on `expo export --platform android --no-bytecode`: before, 18 log,
 * 4 info, 9 debug, 1 trace; after, 0 of each; warn 221 and error 107 unchanged.
 */
async function pluginsFor(env: Record<string, string | undefined>) {
  for (const name of ["BABEL_ENV", "NODE_ENV"]) vi.stubEnv(name, env[name]);
  vi.resetModules();
  const babelConfig = (await import("./babel.config.js")).default as (api: unknown) => { plugins: unknown[] };
  const using = vi.fn();
  const config = babelConfig({ cache: { using } });
  vi.unstubAllEnvs();
  return { plugins: config.plugins, cacheKey: using.mock.calls[0]![0]() as string };
}

describe("babel.config.js (P3.2 console stripping)", () => {
  it("production strips console.log/info/debug/trace and keeps error and warn", async () => {
    const { plugins } = await pluginsFor({ NODE_ENV: "production" });
    expect(plugins).toContainEqual(["transform-remove-console", { exclude: ["error", "warn"] }]);
  });

  it("development and test keep every console call", async () => {
    for (const env of [{ NODE_ENV: "development" }, { NODE_ENV: "test" }, {}]) {
      const { plugins } = await pluginsFor(env);
      expect(JSON.stringify(plugins), JSON.stringify(env)).not.toContain("transform-remove-console");
    }
  });

  it("BABEL_ENV wins over NODE_ENV, the cache is keyed by the environment, and reanimated's plugin stays last", async () => {
    const { plugins, cacheKey } = await pluginsFor({ BABEL_ENV: "production", NODE_ENV: "development" });
    expect(cacheKey).toBe("production");
    expect(plugins.at(-1)).toBe("react-native-reanimated/plugin");
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * app.config.ts: the Expo config. Everything in it (the whole manifest, not
 * just `extra`) ships inside the app and is readable via Constants.expoConfig,
 * so it may only carry publishable values (docs/ENGINEERING_STANDARDS.md §5).
 * It reads the env at module load; each case re-imports it under stubbed env.
 */
const READ_BY_CONFIG = [
  "PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_SITE_URL",
  "GOOGLE_EXPO_CLIENT_ID",
  "GOOGLE_WEB_CLIENT_ID",
  "GOOGLE_IOS_CLIENT_ID",
  "GOOGLE_ANDROID_CLIENT_ID",
  "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
  "EXPO_PUBLIC_SENTRY_DSN"
] as const;

async function load(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  // Start from a clean slate so a developer's shell cannot leak into a case.
  for (const name of READ_BY_CONFIG) vi.stubEnv(name, undefined);
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return (await import("./app.config")).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("apiBaseUrl", () => {
  it("uses PUBLIC_API_BASE_URL when the build sets it", async () => {
    const config = await load({ PUBLIC_API_BASE_URL: "https://api.example.test/api/v1" });
    expect(config.extra?.apiBaseUrl).toBe("https://api.example.test/api/v1");
  });

  it("falls back to the local dev API when it is unset", async () => {
    const config = await load();
    expect(config.extra?.apiBaseUrl).toBe("http://127.0.0.1:8787/api/v1");
  });

  it("every store-bound EAS profile sets an https API, so no release build gets the cleartext fallback", () => {
    const eas = JSON.parse(readFileSync(join(__dirname, "eas.json"), "utf8")) as {
      build: Record<string, { env?: Record<string, string>; developmentClient?: boolean }>;
    };
    const releaseProfiles = Object.entries(eas.build).filter(([, profile]) => !profile.developmentClient);
    expect(releaseProfiles.map(([name]) => name).sort()).toEqual(["preview", "production"]);
    for (const [name, profile] of releaseProfiles) {
      expect(profile.env?.PUBLIC_API_BASE_URL, name).toMatch(/^https:\/\//);
    }
  });
});

describe("public values forwarded into extra", () => {
  it("passes each publishable key through unchanged", async () => {
    const env = Object.fromEntries(READ_BY_CONFIG.map((name) => [name, `value-of-${name}`]));
    const config = await load(env);
    expect(config.extra).toEqual({
      eas: { projectId: "5de3240d-3fbf-4aa7-ae0b-492bfa5db627" },
      apiBaseUrl: "value-of-PUBLIC_API_BASE_URL",
      siteUrl: "value-of-EXPO_PUBLIC_SITE_URL",
      google: {
        expoClientId: "value-of-GOOGLE_EXPO_CLIENT_ID",
        webClientId: "value-of-GOOGLE_WEB_CLIENT_ID",
        iosClientId: "value-of-GOOGLE_IOS_CLIENT_ID",
        androidClientId: "value-of-GOOGLE_ANDROID_CLIENT_ID"
      },
      revenueCat: {
        iosKey: "value-of-EXPO_PUBLIC_REVENUECAT_IOS_KEY",
        androidKey: "value-of-EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"
      },
      sentryDsn: "value-of-EXPO_PUBLIC_SENTRY_DSN"
    });
  });

  it("leaves an unset optional key undefined (the app then applies its own default)", async () => {
    const config = await load();
    expect(config.extra?.siteUrl).toBeUndefined();
    expect(config.extra?.sentryDsn).toBeUndefined();
    expect(config.extra?.revenueCat).toEqual({ iosKey: undefined, androidKey: undefined });
  });
});

describe("no server secret reaches the client config", () => {
  /** Every env var name the API server reads, scanned from its source. */
  function apiEnvNames(): string[] {
    const root = join(__dirname, "..", "api", "src");
    const names = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith(".ts") && !entry.name.includes(".test.")) {
          for (const m of readFileSync(path, "utf8").matchAll(/\benv\.([A-Z][A-Z0-9_]+)/g)) names.add(m[1]!);
        }
      }
    };
    walk(root);
    return [...names].sort();
  }

  // Public OAuth client IDs: the API uses them only as token audiences, and
  // the app needs them to start the Google sign-in flow. Publishable by design.
  const PUBLIC_BY_DESIGN = new Set(["GOOGLE_EXPO_CLIENT_ID", "GOOGLE_WEB_CLIENT_ID", "GOOGLE_IOS_CLIENT_ID", "GOOGLE_ANDROID_CLIENT_ID"]);

  it("the scan finds the API's real secrets (so the check below is not vacuous)", () => {
    expect(apiEnvNames()).toEqual(expect.arrayContaining(["JWT_PRIVATE_KEY", "RESEND_API_KEY", "PLAID_SECRET", "REVENUECAT_SECRET_KEY", "STORAGE_ENCRYPTION_KEY", "DEMO_LOGIN_PASSWORD"]));
  });

  it("with every API env var set, none of their values appears anywhere in the Expo config", async () => {
    // NODE_ENV is not a secret and steers the test runner itself; leave it alone.
    // Plus the build-side secrets: the Sentry source-map upload token and the EAS token.
    const serverOnly = [...apiEnvNames().filter((name) => !PUBLIC_BY_DESIGN.has(name) && name !== "NODE_ENV"), "SENTRY_AUTH_TOKEN", "EXPO_TOKEN"];
    const env = Object.fromEntries(serverOnly.map((name) => [name, `server-only<${name}>`]));
    const config = await load(env);
    const shipped = JSON.stringify(config);
    const leaked = serverOnly.filter((name) => shipped.includes(`server-only<${name}>`));
    expect(leaked).toEqual([]);
  });

  it("extra carries only the reviewed publishable keys", async () => {
    const config = await load();
    expect(Object.keys(config.extra ?? {}).sort()).toEqual(["apiBaseUrl", "eas", "google", "revenueCat", "sentryDsn", "siteUrl"]);
  });
});

describe("P3.6: a RevenueCat SECRET key can never ship", () => {
  it.each(["EXPO_PUBLIC_REVENUECAT_IOS_KEY", "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"])("%s holding an sk_ key fails the build, naming the variable but not the value", async (name) => {
    const err = await load({ [name]: "  sk_live_DO_NOT_SHIP_1234" }).then(() => null, (e: Error) => e);
    expect(err?.message).toContain(name);
    expect(err?.message).toContain("SECRET");
    expect(err?.message).not.toContain("DO_NOT_SHIP");
  });

  it("a public SDK key builds", async () => {
    const config = await load({ EXPO_PUBLIC_REVENUECAT_IOS_KEY: "appl_public", EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_public" });
    expect(config.extra?.revenueCat).toEqual({ iosKey: "appl_public", androidKey: "goog_public" });
  });
});

describe("P3.7 (F104): expo-screen-capture's permissions", () => {
  it("DETECT_SCREEN_CAPTURE is never blocked: without it the app crashed at launch on Android 14+ (seen on the emulator)", async () => {
    const config = await load();
    expect(config.android?.blockedPermissions ?? []).not.toContain("android.permission.DETECT_SCREEN_CAPTURE");
  });

  it("the module still declares exactly the three permissions reviewed in F104 (re-review on any upgrade that changes them)", () => {
    const manifest = readFileSync(join(__dirname, "..", "..", "node_modules", "expo-screen-capture", "android", "src", "main", "AndroidManifest.xml"), "utf8");
    const declared = [...manifest.matchAll(/android:name="([^"]+)"/g)].map((m) => m[1]).sort();
    expect(declared).toEqual(["android.permission.DETECT_SCREEN_CAPTURE", "android.permission.READ_EXTERNAL_STORAGE", "android.permission.READ_MEDIA_IMAGES"]);
  });
});

describe("P3.1 release hardening (F92, F93)", () => {
  it("Android Auto Backup is off, R8 minify and resource shrinking are on, and release traffic is TLS only", async () => {
    const config = await load();
    expect(config.android?.allowBackup).toBe(false);
    const buildProperties = config.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties") as [string, { android?: Record<string, unknown> }] | undefined;
    expect(buildProperties, "expo-build-properties is configured").toBeDefined();
    expect(buildProperties![1].android).toMatchObject({
      enableMinifyInReleaseBuilds: true,
      enableShrinkResourcesInReleaseBuilds: true,
      usesCleartextTraffic: false
    });
  });
});

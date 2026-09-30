import { afterEach, describe, expect, it, vi } from "vitest";
import { assertConfigOrExit, validateConfig } from "./config";

// Snapshot + restore every env var the validator reads so tests don't leak.
const KEYS = [
  "NODE_ENV",
  "STORAGE_ENCRYPTION_KEY",
  "DATABASE_URL",
  "JWT_PRIVATE_KEY",
  "JWT_PUBLIC_KEY",
  "RESEND_API_KEY",
  "CORS_ALLOWED_ORIGINS",
  "DATABASE_SSL",
  "MAGIC_LINK_REDIRECT_URL",
  "DEMO_LOGIN_PASSWORD",
  "ALLOW_UNVERIFIED_OAUTH_TOKENS",
  "MONITORING_WEBHOOK_URL",
  "COACH_BASE_URL"
] as const;

const original: Record<string, string | undefined> = {};
for (const key of KEYS) original[key] = process.env[key];

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  vi.restoreAllMocks();
});

function clear(): void {
  for (const key of KEYS) delete process.env[key];
}

describe("validateConfig", () => {
  it("reports no fatal errors in development with nothing configured", () => {
    clear();
    process.env.NODE_ENV = "development";
    const report = validateConfig();
    expect(report.fatal).toEqual([]);
  });

  it("flags a malformed encryption key as a warning in development", () => {
    clear();
    process.env.NODE_ENV = "development";
    process.env.STORAGE_ENCRYPTION_KEY = "not-a-valid-key";
    const report = validateConfig();
    expect(report.fatal).toEqual([]);
    expect(report.warnings.some((w) => w.includes("STORAGE_ENCRYPTION_KEY is set but malformed"))).toBe(true);
  });

  it("escalates a malformed encryption key to fatal in production", () => {
    clear();
    process.env.NODE_ENV = "production";
    process.env.STORAGE_ENCRYPTION_KEY = "too-short";
    // Provide JWT keys so we isolate the encryption-key failure.
    process.env.JWT_PRIVATE_KEY = "x";
    process.env.JWT_PUBLIC_KEY = "y";
    const report = validateConfig();
    expect(report.fatal.some((f) => f.includes("STORAGE_ENCRYPTION_KEY is set but malformed"))).toBe(true);
  });

  it("makes missing JWT keys fatal in production", () => {
    clear();
    process.env.NODE_ENV = "production";
    const report = validateConfig();
    expect(report.fatal.some((f) => f.includes("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required"))).toBe(true);
  });

  it("warns about in-memory-only mode and CORS in production", () => {
    clear();
    process.env.NODE_ENV = "production";
    process.env.JWT_PRIVATE_KEY = "x";
    process.env.JWT_PUBLIC_KEY = "y";
    const report = validateConfig();
    expect(report.warnings.some((w) => w.includes("DATABASE_URL is not set"))).toBe(true);
    expect(report.warnings.some((w) => w.includes("CORS_ALLOWED_ORIGINS is not set"))).toBe(true);
  });

  it("a typo'd DATABASE_SSL is a warning in development and FATAL in production", () => {
    clear();
    process.env.NODE_ENV = "development";
    process.env.DATABASE_SSL = "verfiy";
    expect(validateConfig().warnings.some((w) => w.includes('DATABASE_SSL="verfiy" is not one of'))).toBe(true);

    process.env.NODE_ENV = "production";
    process.env.JWT_PRIVATE_KEY = "x";
    process.env.JWT_PUBLIC_KEY = "y";
    const report = validateConfig();
    expect(report.fatal.some((f) => f.includes('DATABASE_SSL="verfiy"') && f.includes("strictest"))).toBe(true);
  });

  it("caps an absurd DATABASE_SSL value in the message (no log flooding)", () => {
    clear();
    process.env.NODE_ENV = "development";
    process.env.DATABASE_SSL = "x".repeat(5000);
    const w = validateConfig().warnings.find((m) => m.includes("DATABASE_SSL="));
    expect(w).toBeDefined();
    expect(w!.length).toBeLessThan(200);
  });

  it("the valid DATABASE_SSL values produce no warning; disable with a DB in production warns", () => {
    for (const value of ["require", "verify", "disable", "REQUIRE", " verify "]) {
      clear();
      process.env.NODE_ENV = "development";
      process.env.DATABASE_SSL = value;
      expect(validateConfig().warnings.filter((w) => w.includes("DATABASE_SSL")), value).toEqual([]);
    }
    clear();
    process.env.NODE_ENV = "production";
    process.env.JWT_PRIVATE_KEY = "x";
    process.env.JWT_PUBLIC_KEY = "y";
    process.env.DATABASE_URL = "postgres://example";
    process.env.DATABASE_SSL = "disable";
    expect(validateConfig().warnings.some((w) => w.includes("NOT encrypted"))).toBe(true);
  });

  it("is clean in production when everything required is present and valid", () => {
    clear();
    process.env.NODE_ENV = "production";
    process.env.JWT_PRIVATE_KEY = "x";
    process.env.JWT_PUBLIC_KEY = "y";
    process.env.DATABASE_URL = "postgres://example";
    process.env.STORAGE_ENCRYPTION_KEY = "a".repeat(64); // 64 hex chars = 32 bytes
    process.env.RESEND_API_KEY = "re_test";
    process.env.CORS_ALLOWED_ORIGINS = "https://app.example.com";
    const report = validateConfig();
    expect(report.fatal).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
});

describe("P2.6 production refusals and warnings", () => {
  const prodBase = () => {
    clear();
    process.env.NODE_ENV = "production";
    process.env.JWT_PRIVATE_KEY = "k";
    process.env.JWT_PUBLIC_KEY = "k";
  };

  it("an http:// magic-link redirect is FATAL in production; https://, the zeno:// scheme and unset are not", () => {
    prodBase();
    process.env.MAGIC_LINK_REDIRECT_URL = "http://zeno.app/verify";
    expect(validateConfig().fatal).toContain("MAGIC_LINK_REDIRECT_URL uses http:// in production — magic-link login tokens would travel in cleartext.");
    process.env.MAGIC_LINK_REDIRECT_URL = " HTTP://ZENO.APP/verify ";
    expect(validateConfig().fatal.some((f) => f.startsWith("MAGIC_LINK_REDIRECT_URL"))).toBe(true);
    for (const safe of ["https://zeno.app/verify", "zeno://auth/verify", ""]) {
      process.env.MAGIC_LINK_REDIRECT_URL = safe;
      expect(validateConfig().fatal.some((f) => f.startsWith("MAGIC_LINK_REDIRECT_URL")), safe).toBe(false);
    }
  });

  it("warns in production about a stray demo password, the unverified-OAuth flag, a wildcard or cleartext CORS origin, and a cleartext alert webhook", () => {
    prodBase();
    process.env.DEMO_LOGIN_PASSWORD = "anything";
    process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS = "true";
    process.env.CORS_ALLOWED_ORIGINS = "https://zeno.app, *, http://legacy.example";
    process.env.MONITORING_WEBHOOK_URL = "http://alerts.example/hook";
    const { warnings, fatal } = validateConfig();
    expect(warnings).toEqual(expect.arrayContaining([
      "DEMO_LOGIN_PASSWORD is set in production — demo login stays disabled here; remove the variable.",
      "ALLOW_UNVERIFIED_OAUTH_TOKENS=true in production — it is ignored (tokens are always verified); remove the variable.",
      'CORS_ALLOWED_ORIGINS contains "*" — the API matches exact origins only, so it allows nothing; list real origins.',
      "CORS_ALLOWED_ORIGINS allows a cleartext origin (http://legacy.example) in production.",
      "MONITORING_WEBHOOK_URL uses http:// — error alerts would travel in cleartext."
    ]));
    expect(warnings.some((w) => w.includes("https://zeno.app"))).toBe(false);
    // None of these may take production down: they are already enforced at request time.
    expect(fatal).toEqual([]);
  });

  it("none of these is flagged outside production, and an unflagged value (flag=false, https webhook) is silent", () => {
    clear();
    process.env.DEMO_LOGIN_PASSWORD = "anything";
    process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS = "true";
    process.env.MAGIC_LINK_REDIRECT_URL = "http://localhost/verify";
    expect(validateConfig()).toEqual({ fatal: [], warnings: [] });
    prodBase();
    process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS = "false";
    process.env.MONITORING_WEBHOOK_URL = "https://alerts.example/hook";
    process.env.CORS_ALLOWED_ORIGINS = "https://zeno.app";
    expect(validateConfig().warnings.filter((w) => /ALLOW_UNVERIFIED|MONITORING|CORS/.test(w))).toEqual([]);
  });
});

describe("P2.7 an outbound URL set by the operator", () => {
  it("warns in production when COACH_BASE_URL is http:// (the provider's API key is sent to it); https://, unset, and non-production are silent", () => {
    clear();
    process.env.COACH_BASE_URL = "http://llm.example/v1";
    expect(validateConfig().warnings.filter((w) => w.startsWith("COACH_BASE_URL"))).toEqual([]);
    process.env.NODE_ENV = "production";
    process.env.JWT_PRIVATE_KEY = "k";
    process.env.JWT_PUBLIC_KEY = "k";
    expect(validateConfig().warnings).toContain("COACH_BASE_URL uses http:// — the AI provider's API key would travel in cleartext.");
    expect(validateConfig().fatal).toEqual([]);
    for (const quiet of [" HTTPS://llm.example/v1", ""]) {
      process.env.COACH_BASE_URL = quiet;
      expect(validateConfig().warnings.filter((w) => w.startsWith("COACH_BASE_URL")), quiet).toEqual([]);
    }
    process.env.COACH_BASE_URL = " HTTP://llm.example/v1 ";
    expect(validateConfig().warnings.some((w) => w.startsWith("COACH_BASE_URL"))).toBe(true);
  });
});

describe("assertConfigOrExit (boot gate)", () => {
  function spies() {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // process.exit is replaced so the test runner survives; the gate is judged
    // by whether (and how) it asked to exit.
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    return { warn, error, exit };
  }

  it("a clean production config logs nothing and never exits", () => {
    clear();
    process.env.NODE_ENV = "production";
    process.env.JWT_PRIVATE_KEY = "x";
    process.env.JWT_PUBLIC_KEY = "y";
    process.env.DATABASE_URL = "postgres://example";
    process.env.STORAGE_ENCRYPTION_KEY = "a".repeat(64);
    process.env.RESEND_API_KEY = "re_test";
    process.env.CORS_ALLOWED_ORIGINS = "https://app.example.com";
    const { warn, error, exit } = spies();
    assertConfigOrExit();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("warnings only: each is logged once with the WARN prefix, and the server is allowed to start", () => {
    clear();
    process.env.NODE_ENV = "development";
    process.env.STORAGE_ENCRYPTION_KEY = "not-a-valid-key";
    process.env.DATABASE_SSL = "verfiy";
    const expected = validateConfig().warnings;
    expect(expected).toHaveLength(2);
    const { warn, error, exit } = spies();
    assertConfigOrExit();
    expect(warn.mock.calls).toEqual(expected.map((w) => [`[zeno][config] WARN: ${w}`]));
    expect(error).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("any fatal item: logs every FATAL line plus a refusal summary, then exits with code 1", () => {
    clear();
    process.env.NODE_ENV = "production";
    process.env.STORAGE_ENCRYPTION_KEY = "too-short"; // fatal in production
    // JWT keys missing too: a second fatal item, so both must be reported.
    const report = validateConfig();
    expect(report.fatal).toHaveLength(2);
    const { warn, error, exit } = spies();
    assertConfigOrExit();
    expect(error.mock.calls).toEqual([
      ...report.fatal.map((f) => [`[zeno][config] FATAL: ${f}`]),
      ["[zeno][config] refusing to start with fatal configuration errors."]
    ]);
    // Warnings are still printed before the exit so the operator sees everything.
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(warn.mock.calls).toEqual(report.warnings.map((w) => [`[zeno][config] WARN: ${w}`]));
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});

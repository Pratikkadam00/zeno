import { afterEach, describe, expect, it } from "vitest";
import { validateConfig } from "./config";

// Snapshot + restore every env var the validator reads so tests don't leak.
const KEYS = [
  "NODE_ENV",
  "STORAGE_ENCRYPTION_KEY",
  "DATABASE_URL",
  "JWT_PRIVATE_KEY",
  "JWT_PUBLIC_KEY",
  "RESEND_API_KEY",
  "CORS_ALLOWED_ORIGINS"
] as const;

const original: Record<string, string | undefined> = {};
for (const key of KEYS) original[key] = process.env[key];

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
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

import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sentryMock = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn()
}));
vi.mock("@sentry/react-native", () => sentryMock);
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} } } }));

const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

beforeEach(() => {
  vi.resetModules();
  sentryMock.init.mockClear();
  sentryMock.captureException.mockClear();
  if (originalDsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  else process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
});

describe("monitoring/report — inert without a DSN", () => {
  it("does not call Sentry.init when no DSN is configured", async () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    const { initErrorReporting } = await import("./report");
    initErrorReporting();
    expect(sentryMock.init).not.toHaveBeenCalled();
  });

  it("captureError still logs to console without a DSN (existing seam behavior preserved)", async () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    const { captureError } = await import("./report");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    captureError(new Error("no dsn configured"));
    expect(consoleSpy).toHaveBeenCalled();
    expect(sentryMock.captureException).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("monitoring/report — real reporting once a DSN is configured", () => {
  it("calls Sentry.init exactly once: error capture only, no default PII, no screenshot, every event and breadcrumb scrubbed", async () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://fake@o0.ingest.sentry.io/1";
    const { initErrorReporting } = await import("./report");
    // Same module registry as report's own import (vi.resetModules runs per test).
    const { scrubBreadcrumb, scrubEvent } = await import("./sentry-scrub");
    initErrorReporting();
    initErrorReporting(); // idempotent — must not re-init
    expect(sentryMock.init).toHaveBeenCalledTimes(1);
    expect(sentryMock.init).toHaveBeenCalledWith({
      dsn: "https://fake@o0.ingest.sentry.io/1",
      tracesSampleRate: 0,
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      beforeBreadcrumb: scrubBreadcrumb,
      beforeSend: scrubEvent
    });
  });

  it("captureError forwards to Sentry.captureException with context as `extra`, once initialized", async () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://fake@o0.ingest.sentry.io/1";
    const { initErrorReporting, captureError } = await import("./report");
    initErrorReporting();

    const error = new Error("boom");
    captureError(error, { screen: "dashboard" });
    expect(sentryMock.captureException).toHaveBeenCalledWith(error, { extra: { screen: "dashboard" } });
  });

  it("captureError without context passes no hint to Sentry", async () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://fake@o0.ingest.sentry.io/1";
    const { initErrorReporting, captureError } = await import("./report");
    initErrorReporting();

    const error = new Error("boom, no context");
    captureError(error);
    expect(sentryMock.captureException).toHaveBeenCalledWith(error, undefined);
  });
});

describe("P3.2: captureError never carries a token or an email", () => {
  // Generated, not a literal: the shape of our refresh/magic tokens (43-char base64url).
  const TOKEN = randomBytes(32).toString("base64url");
  const EMAIL = "jane@example.com";

  it("neither the release log nor Sentry receives them, from the error's message, its stack, or the context", async () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://fake@o0.ingest.sentry.io/1";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { initErrorReporting, captureError } = await import("./report");
    initErrorReporting();

    const error = new Error(`verify?token=${TOKEN} failed for ${EMAIL}`);
    error.stack = `Error: verify?token=${TOKEN}\n    at verify (authStore.ts:180)`;
    captureError(error, { componentStack: `in Login (for ${EMAIL})`, request: { header: `Bearer ${TOKEN}` } });

    const logged = consoleError.mock.calls.flat();
    const sent = sentryMock.captureException.mock.calls.flat();
    for (const [where, args] of [["console.error", logged], ["Sentry", sent]] as const) {
      const flat = JSON.stringify(args) + args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : "")).join("");
      expect(flat, where).not.toContain(TOKEN);
      expect(flat, where).not.toContain(EMAIL);
    }
    // Still useful: the error type, the place it was thrown, the component.
    expect(sent[0]).toBeInstanceOf(Error);
    expect((sent[0] as Error).stack).toContain("at verify (authStore.ts:180)");
    expect(JSON.stringify(sent[1])).toContain("in Login");
    consoleError.mockRestore();
  });
});

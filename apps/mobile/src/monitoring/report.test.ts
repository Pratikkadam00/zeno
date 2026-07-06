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
  it("calls Sentry.init exactly once with the configured DSN, error capture only (no trace sampling)", async () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://fake@o0.ingest.sentry.io/1";
    const { initErrorReporting } = await import("./report");
    initErrorReporting();
    initErrorReporting(); // idempotent — must not re-init
    expect(sentryMock.init).toHaveBeenCalledTimes(1);
    expect(sentryMock.init).toHaveBeenCalledWith({ dsn: "https://fake@o0.ingest.sentry.io/1", tracesSampleRate: 0 });
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

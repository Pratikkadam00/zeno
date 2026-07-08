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
    const { initErrorReporting, scrubBreadcrumb } = await import("./report");
    initErrorReporting();
    initErrorReporting(); // idempotent — must not re-init
    expect(sentryMock.init).toHaveBeenCalledTimes(1);
    expect(sentryMock.init).toHaveBeenCalledWith({
      dsn: "https://fake@o0.ingest.sentry.io/1",
      tracesSampleRate: 0,
      beforeBreadcrumb: scrubBreadcrumb
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

// authStore.ts's magic-link verify and emailScanner.ts's Gmail OAuth revoke
// both call fetch() with a one-time token in the URL query string. Sentry's
// default fetch/xhr breadcrumb instrumentation records the full request URL
// regardless of tracesSampleRate, so without this guard those tokens would
// ride along into every crash report's breadcrumb trail once a DSN is set.
describe("scrubBreadcrumb — strips tokens from fetch/xhr breadcrumb URLs", () => {
  it("strips the query string from a fetch breadcrumb's URL", async () => {
    const { scrubBreadcrumb } = await import("./report");
    const result = scrubBreadcrumb({
      category: "fetch",
      data: { url: "https://api.zeno.app/auth/verify?token=super-secret-one-time-token", method: "GET" }
    });
    expect(result?.data?.url).toBe("https://api.zeno.app/auth/verify");
    // Everything else on the breadcrumb is left intact.
    expect(result?.data?.method).toBe("GET");
    expect(result?.category).toBe("fetch");
  });

  it("strips the query string from an xhr breadcrumb's URL", async () => {
    const { scrubBreadcrumb } = await import("./report");
    const result = scrubBreadcrumb({
      category: "xhr",
      data: { url: "https://accounts.google.com/o/oauth2/revoke?token=gmail-oauth-token" }
    });
    expect(result?.data?.url).toBe("https://accounts.google.com/o/oauth2/revoke");
  });

  it("leaves a fetch/xhr breadcrumb with no query string unchanged", async () => {
    const { scrubBreadcrumb } = await import("./report");
    const breadcrumb = { category: "fetch", data: { url: "https://api.zeno.app/api/v1/health", method: "GET" } };
    expect(scrubBreadcrumb(breadcrumb)).toEqual(breadcrumb);
  });

  it("leaves non-http breadcrumb categories untouched, even with a query-like string", async () => {
    const { scrubBreadcrumb } = await import("./report");
    const breadcrumb = { category: "navigation", data: { url: "not-actually-a-url?token=irrelevant-here" } };
    expect(scrubBreadcrumb(breadcrumb)).toEqual(breadcrumb);
  });

  it("passes through a breadcrumb with no data.url at all", async () => {
    const { scrubBreadcrumb } = await import("./report");
    const breadcrumb = { category: "fetch", message: "no url on this one" };
    expect(scrubBreadcrumb(breadcrumb)).toEqual(breadcrumb);
  });
});

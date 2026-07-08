// Central crash/error reporting seam. Real Sentry wiring (Phase 5.1), but
// completely inert without EXPO_PUBLIC_SENTRY_DSN — Sentry.init() is only
// called when a DSN is actually configured, exactly mirroring how
// src/billing/revenueCat.ts's initRevenueCat() no-ops without an API key. No
// DSN exists yet (no Sentry project has been created), so today this still
// only logs — but the SDK is real, not a placeholder, and starts capturing
// the moment a DSN is set and the app is rebuilt (native module — a JS-only
// reload is not enough).
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

let initialized = false;

function getSentryDsn(): string | null {
  const extra = Constants.expoConfig?.extra as { sentryDsn?: string } | undefined;
  return process.env.EXPO_PUBLIC_SENTRY_DSN ?? extra?.sentryDsn ?? null;
}

// Magic-link verification (authStore.ts) and Gmail OAuth revocation
// (emailScanner.ts) both call fetch() with a one-time token in the URL's
// query string. Sentry's default fetch/xhr breadcrumb instrumentation records
// the full request URL independent of tracesSampleRate (that setting only
// gates performance-tracing spans, not breadcrumbs) — without this, the token
// would ride along into every error report's breadcrumb trail the instant a
// DSN is configured. Strip the query string from fetch/xhr breadcrumbs only;
// everything else (method, status, timing) is left intact.
export function scrubBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  const url = breadcrumb.data?.url;
  const isHttpBreadcrumb = breadcrumb.category === "fetch" || breadcrumb.category === "xhr";
  if (isHttpBreadcrumb && typeof url === "string" && url.includes("?")) {
    return { ...breadcrumb, data: { ...breadcrumb.data, url: url.split("?")[0] } };
  }
  return breadcrumb;
}

// Call once at app startup (see app/_layout.tsx). Safe to call multiple times.
export function initErrorReporting(): void {
  if (initialized) {
    return;
  }
  const dsn = getSentryDsn();
  if (!dsn) {
    return;
  }
  // tracesSampleRate: 0 — error capture only, no performance tracing. Adding
  // trace sampling is a separate, deliberate decision (more data collected),
  // not something to default on silently.
  Sentry.init({ dsn, tracesSampleRate: 0, beforeBreadcrumb: scrubBreadcrumb });
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error("[zeno] captured error:", error, context ?? {});
  if (initialized) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
}
